/**
 * §12.1.3 — the hand-written, total validator.
 *
 * Not zod. zod stays a build-time dependency for frontmatter; shipping it to
 * the browser for one closed shape is weight the client bundle does not need,
 * and a hand-written validator gives the migration ladder better diagnostics.
 *
 * Two different strictnesses, on purpose, and the line between them is the
 * whole design of this file:
 *
 *   - **The envelope is strict.** Anything that is not `{schema: <positive
 *     int>, data: <object>}` quarantines. If the outer shape is wrong we do not
 *     understand the file, and §12.1.2 forbids discarding a record we do not
 *     understand — quarantine preserves it byte for byte.
 *   - **The data inside is permissive.** Every field defaulted, every unknown
 *     key dropped, every wrong type coerced to its default rather than thrown
 *     on. Data read back out of Web Storage is untrusted input; an imported
 *     file doubly so.
 *
 * Two rules here are security controls rather than tidiness, and both are
 * tested: a `sources` entry must be http(s), so no `javascript:` URL can reach
 * an `href` in the exported record; and a submittal's `url` is **rebuilt** from
 * its owner and repo, so the stored string never reaches a link (§12.9.2).
 *
 * What this file deliberately does NOT do: sanitise or truncate reader text.
 * §12.3.4 sanitises the name where it is typed, and §12.3.4 forbids truncating
 * the stored value. Hostile text is handled at the point it is printed, by the
 * two escapers of §12.12.7 — removing the sink, not fencing the input.
 */

import type { ClaimIdentitySource, ClaimReceipt, ClaimSummary } from './claim'
import { migrate } from './migrate'
import {
  DWELL_CAP_SECONDS,
  EMPTY_RECORD,
  MARK_IDS,
  MAX_SUBMITTALS,
  ROLE_IDS,
  SCHEMA_VERSION,
  isEmptySheetRecord,
  isSafeKey,
  type MarkId,
  type QuizRecord,
  type RecordData,
  type RoleId,
  type SheetRecord,
  type Submittal,
} from './schema'

export type ParseResult =
  | { kind: 'empty' }
  /**
   * `schema` is the version the payload was FOUND at, not the version it now
   * holds — the profile sheet can say where a record came from.
   * `savedAt` is what the envelope carried, so §12.11 can print it without a
   * second module naming the storage key.
   */
  | { kind: 'ok'; data: RecordData; schema: number; savedAt: string | null }
  | { kind: 'quarantine'; reason: 'newer' | 'malformed'; raw: string }

/** §12.9.2 — GitHub's own documented rule for an owner or a repo segment. */
const GH_SEGMENT = /^[A-Za-z0-9._-]{1,100}$/
/** §12.9.3 — a reader-supplied commit hash, never fetched. */
const COMMIT = /^[0-9a-f]{7,40}$/
/** §12.3.5 — the minted seed. Lowercase only: it is generated, never typed. */
const MARK_SEED = /^[0-9a-f]{8}$/
/**
 * A git short hash as `revision.ts` actually emits it — git chooses the length,
 * so the floor is 4, not §12.9.3's 7. A different rule from COMMIT because it
 * is a different fact from a different source.
 */
const SHORT_HASH = /^[0-9a-f]{4,40}$/
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const ISO_TIME = /^\d{4}-\d{2}-\d{2}(?:[T ][\d:.+\-Z]{1,20})?$/
const INDEX_KEY = /^\d{1,4}$/
const EXTERNAL_URL = /^https?:\/\//i

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** `isSafeKey` is the shared rule; see its doc for what it refuses and why. */
function safeKeys(value: Record<string, unknown>): string[] {
  return Object.keys(value).filter(isSafeKey)
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/** Tri-state: a queried false is information, an unqueried value is not. */
function asTriState(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function asPattern(value: unknown, pattern: RegExp): string | null {
  const text = asString(value)
  return text !== null && pattern.test(text) ? text : null
}

/**
 * A calendar day that exists. MEASURED: `Date.parse('2026-02-31')` is finite in
 * V8 — it rolls the day over into March — so `Date.parse` alone is not a range
 * check. The round trip through `toISOString` is: a rolled-over date no longer
 * serialises to the string it came from.
 */
function isRealDay(day: string): boolean {
  const parsed = new Date(`${day}T00:00:00.000Z`)
  return (
    Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day
  )
}

/**
 * An instant, or a date on its own — a hand-edited export legitimately carries
 * either. The date part is range-checked the same way `days` is, so an
 * impossible calendar date cannot be printed as a sign-off date.
 */
function asInstant(value: unknown): string | null {
  const text = asPattern(value, ISO_TIME)
  if (text === null) return null
  if (!isRealDay(text.slice(0, 10))) return null
  return Number.isFinite(Date.parse(text)) ? text : null
}

function asDay(value: unknown): string | null {
  const text = asPattern(value, ISO_DAY)
  if (text === null) return null
  return isRealDay(text) ? text : null
}

/**
 * §12.4.4 — clamped into 0..3600. NaN and Infinity coerce to the default
 * rather than to the ceiling: neither is a duration, and JSON cannot express
 * either, so both only arrive by way of an import or a migration step.
 */
function asDwell(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.min(DWELL_CAP_SECONDS, Math.max(0, Math.round(value)))
}

function coerceMark(value: unknown): MarkId | null {
  return MARK_IDS.includes(value as MarkId) ? (value as MarkId) : null
}

/**
 * §13.3 — one of the nine frozen ids, or nothing.
 *
 * An unknown id is ABSENT, never repaired into a neighbouring value. A record
 * read back out of Web Storage is untrusted input (§12.1.3), and the two ways a
 * stranger reaches this function are a hand-edited import and a role id this
 * build has retired — in both cases the honest reading is that the reader has
 * not said, which draws the §13.4.3 picker. Guessing `analyst` for a stored
 * `business-analyst` would print a job title the reader never chose, and the id
 * is also what keys `PATHS`, so a near miss would draw somebody else's path.
 */
function coerceRole(value: unknown): RoleId | null {
  return ROLE_IDS.includes(value as RoleId) ? (value as RoleId) : null
}

function coerceQuiz(value: unknown): QuizRecord | null {
  if (!isRecordObject(value)) return null
  const answer = typeof value.answer === 'string' ? value.answer : ''
  const assessed =
    value.assessed === 'matched' || value.assessed === 'missed' ? value.assessed : null
  // Holds neither a retrieval attempt nor a self-assessment: absent, not empty.
  if (answer.trim() === '' && assessed === null) return null
  return { answer, assessed, at: asInstant(value.at) ?? '' }
}

function coerceChecklist(value: unknown): { [index: string]: boolean } {
  const out: { [index: string]: boolean } = {}
  if (!isRecordObject(value)) return out
  for (const key of safeKeys(value)) {
    // Only ticks are stored: an unticked box is the default, so a stored
    // `false` carries no information and would inflate every count of it.
    if (INDEX_KEY.test(key) && value[key] === true) out[key] = true
  }
  return out
}

function coerceSources(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const entry of value) {
    const url = asString(entry)
    if (url === null || !EXTERNAL_URL.test(url) || seen.has(url)) continue
    seen.add(url)
    out.push(url)
  }
  return out
}

function coerceSubmittals(value: unknown): Submittal[] {
  if (!Array.isArray(value)) return []
  const out: Submittal[] = []
  const seen = new Set<string>()
  for (const entry of value) {
    if (out.length >= MAX_SUBMITTALS) break
    if (!isRecordObject(entry)) continue
    const owner = asPattern(entry.owner, GH_SEGMENT)
    const repo = asPattern(entry.repo, GH_SEGMENT)
    if (owner === null || repo === null) continue
    const key = `${owner.toLowerCase()}/${repo.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      owner,
      repo,
      // §12.9.2 — reconstructed, so an attacker-controlled query string,
      // userinfo or homograph host can never reach an href.
      url: `https://github.com/${owner}/${repo}`,
      commit: asPattern(entry.commit, COMMIT),
      note: typeof entry.note === 'string' ? entry.note : '',
      at: asInstant(entry.at) ?? '',
    })
  }
  return out
}

function coerceSheet(value: unknown): SheetRecord {
  const input = isRecordObject(value) ? value : {}
  return {
    signedOff: asInstant(input.signedOff),
    signedRevision: asPattern(input.signedRevision, SHORT_HASH),
    reachedEnd: asBoolean(input.reachedEnd, false),
    dwellSeconds: asDwell(input.dwellSeconds),
    quiz: coerceQuiz(input.quiz),
    checklist: coerceChecklist(input.checklist),
    sources: coerceSources(input.sources),
    submittals: coerceSubmittals(input.submittals),
  }
}

function coerceSheets(value: unknown): { [slug: string]: SheetRecord } {
  const out: { [slug: string]: SheetRecord } = {}
  // A slug-keyed map is never an array. An array's "0"/"1" keys would file
  // real sheet records under indices no sheet answers to.
  if (!isRecordObject(value)) return out
  for (const key of safeKeys(value)) {
    const entry = value[key]
    if (!isRecordObject(entry)) continue
    const sheet = coerceSheet(entry)
    if (!isEmptySheetRecord(sheet)) out[key] = sheet
  }
  return out
}

function coerceDays(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const days = new Set<string>()
  for (const entry of value) {
    const day = asDay(entry)
    if (day !== null) days.add(day)
  }
  return [...days].sort()
}

/**
 * §17.3 — the stored receipt, read the way §12.12 reads everything: a bad field
 * loses the field and never the record.
 *
 * Structural rather than schema-versioned, because the receipt is a projection of
 * a type this module cannot import a validator for. Every count is checked, so a
 * hand-edited file cannot put a string where the register prints a number.
 */
function asClaimReceipt(value: unknown): ClaimReceipt | null {
  if (!isRecordObject(value)) return null
  const at = asInstant(value.at)
  if (at === null) return null
  if (!isRecordObject(value.summary)) return null

  const summary = value.summary
  if (summary.outcome !== 'merged' && summary.outcome !== 'adopted') return null

  const counts = (input: unknown): ClaimSummary['signed'] | null => {
    if (!isRecordObject(input)) return null
    const keys = ['here', 'account', 'shared', 'merged'] as const
    // A count, not merely a number. `Number.isFinite` admitted `-5` and `1.5`,
    // and a hand-edited file could then make the register print
    // `1.5 MERGED · 0 LOST` — a reading about the reader's own work that is not
    // a possible reading of it.
    if (!keys.every((key) => Number.isInteger(input[key]) && (input[key] as number) >= 0)) {
      return null
    }
    return {
      here: input.here as number,
      account: input.account as number,
      shared: input.shared as number,
      merged: input.merged as number,
    }
  }
  const signed = counts(summary.signed)
  const submittals = counts(summary.submittals)
  if (signed === null || submittals === null) return null

  const slugs = (input: unknown): string[] | null =>
    Array.isArray(input) && input.every((item) => typeof item === 'string')
      ? [...(input as string[])]
      : null
  const droppedSignatures = slugs(summary.droppedSignatures)
  const droppedSubmittals = slugs(summary.droppedSubmittals)
  if (droppedSignatures === null || droppedSubmittals === null) return null

  if (!isRecordObject(summary.identity)) return null
  const identity = summary.identity
  const source = (input: unknown): ClaimIdentitySource | null =>
    input === 'account' || input === 'local' || input === 'absent' ? input : null
  // Defaulted rather than fatal, which is this module's own promise: a bad
  // field loses the field and never the record. These three are provenances,
  // and after §17.2 nothing reads them — `claimSummaryLines` prints the
  // `*Changed` booleans and `claimIsNews` tests them, so an off-vocabulary
  // string here costs the reader nothing, while discarding the receipt over it
  // would cost them the whole account of a merge. `absent` is the honest
  // default: it means "neither side is known to have supplied this".
  //
  // `outcome` keeps whole-receipt rejection because it IS printed
  // (`NO RECORD IN ACCOUNT` / `TWO RECORDS`) and has no third value to fall
  // back to, and so do `at` and the count blocks, which the register prints as
  // numbers and a date.
  const name = source(identity.name) ?? 'absent'
  const markSeed = source(identity.markSeed) ?? 'absent'
  const role = source(identity.role) ?? 'absent'

  return {
    at,
    summary: {
      outcome: summary.outcome,
      signed,
      submittals,
      droppedSignatures,
      droppedSubmittals,
      identity: {
        name,
        markSeed,
        role,
        markChanged: asBoolean(identity.markChanged, false),
        nameChanged: asBoolean(identity.nameChanged, false),
        roleChanged: asBoolean(identity.roleChanged, false),
      },
    },
  }
}

/**
 * Total: every input, including a symbol, a function or `undefined`, produces a
 * record. The result is always a fresh mutable object — never the frozen
 * EMPTY_RECORD singleton, which a reducer would then be unable to build on.
 */
export function coerceRecordData(input: unknown): RecordData {
  const data = isRecordObject(input) ? input : {}
  const identity = isRecordObject(data.identity) ? data.identity : {}
  const prefs = isRecordObject(data.prefs) ? data.prefs : {}
  const meta = isRecordObject(data.meta) ? data.meta : {}
  return {
    identity: {
      // Kept exactly as typed and never truncated (§12.3.4).
      name: typeof identity.name === 'string' ? identity.name : null,
      markSeed: asPattern(identity.markSeed, MARK_SEED),
      mark: coerceMark(identity.mark),
      role: coerceRole(identity.role),
    },
    sheets: coerceSheets(data.sheets),
    days: coerceDays(data.days),
    prefs: {
      charKeys: asBoolean(prefs.charKeys, EMPTY_RECORD.prefs.charKeys),
      /**
       * §16.3. A string stays, everything else — a number, a boolean, an
       * object, an absent key, the empty string — becomes null, which is the
       * value that means "no account has named this record" and so is the only
       * safe default: a wrong-typed flag coerced to a truthy id would suppress
       * an offer for an account that never made one. `asString` refuses `''`
       * for the same reason it does everywhere else here — an empty id compares
       * unequal to every real account id, so storing one would leave the seam
       * re-offering for ever.
       *
       * A record written before this field existed reads back with null and
       * needs no rung on the migration ladder; see `migrate.ts` on widening.
       */
      aliasNamedFor: asString(prefs.aliasNamedFor),
    },
    meta: {
      lastExport: asInstant(meta.lastExport),
      persisted: asTriState(meta.persisted),
      lastClaim: asClaimReceipt(meta.lastClaim),
    },
  }
}

/**
 * §12.12.6 — the importer accepts either the raw `.json` or the report
 * `.html`, because the failure mode this removes is a learner who keeps the
 * pretty document and loses the record. The payload lives in a
 * `<script type="application/json" id="hl-record">` data block, which is never
 * evaluated as code; lifting its text is a substring operation, not parsing.
 */
export function envelopeTextFrom(input: string): string | null {
  const text = input.trim()
  if (text === '') return null
  if (text.startsWith('{')) return text
  const opening = /<script[^>]*id=["']hl-record["'][^>]*>/i.exec(text)
  if (!opening) return null
  const start = opening.index + opening[0].length
  const end = text.indexOf('</script', start)
  const payload = text.slice(start, end === -1 ? undefined : end).trim()
  return payload === '' ? null : payload
}

/**
 * The one entry point. `raw` is whatever came out of Web Storage or a file:
 * a string, or null for an absent key.
 */
export function parseEnvelope(raw: string | null): ParseResult {
  if (raw === null || raw.trim() === '') return { kind: 'empty' }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { kind: 'quarantine', reason: 'malformed', raw }
  }

  if (!isRecordObject(parsed)) return { kind: 'quarantine', reason: 'malformed', raw }

  const schema = parsed.schema
  if (typeof schema !== 'number' || !Number.isInteger(schema) || schema < 1) {
    return { kind: 'quarantine', reason: 'malformed', raw }
  }

  // §12.1.2 — never migrated, never discarded. This is not theoretical: GitHub
  // Pages serves cached bundles, so an older bundle can load after a newer one
  // has written, and a silent discard would destroy the only copy in existence.
  if (schema > SCHEMA_VERSION) return { kind: 'quarantine', reason: 'newer', raw }

  if (!isRecordObject(parsed.data)) return { kind: 'quarantine', reason: 'malformed', raw }

  return {
    kind: 'ok',
    // The ladder runs on the raw payload, BEFORE coercion: a step from an
    // older shape has to see the fields the older shape had, which the current
    // coercer would already have dropped.
    data: migrate(parsed.data, schema),
    schema,
    // An instant or nothing: §12.11 prints this, and a string the site cannot
    // vouch for is not a date.
    savedAt: asInstant(parsed.savedAt),
  }
}
