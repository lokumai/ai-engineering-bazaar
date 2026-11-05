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
 * Since M40 the record holds no reader-typed text and no URL at all: the
 * name, the opened sources and the linked repositories went with the features
 * that wrote them, and a stored record that still carries them parses with
 * those keys dropped, like any other unknown key.
 */

import { isViewId } from '../catalog/views'
import { isPaletteId } from '../reading/palettes'
import { migrate } from './migrate'
import {
  DWELL_CAP_SECONDS,
  EMPTY_RECORD,
  SCHEMA_VERSION,
  isEmptySheetRecord,
  isSafeKey,
  type RecordData,
  type SheetRecord,
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

/**
 * A git short hash as `revision.ts` actually emits it — git chooses the length,
 * so the floor is 4.
 */
const SHORT_HASH = /^[0-9a-f]{4,40}$/
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const ISO_TIME = /^\d{4}-\d{2}-\d{2}(?:[T ][\d:.+\-Z]{1,20})?$/
const INDEX_KEY = /^\d{1,4}$/

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

function coerceSheet(value: unknown): SheetRecord {
  const input = isRecordObject(value) ? value : {}
  return {
    signedOff: asInstant(input.signedOff),
    signedRevision: asPattern(input.signedRevision, SHORT_HASH),
    reachedEnd: asBoolean(input.reachedEnd, false),
    dwellSeconds: asDwell(input.dwellSeconds),
    checklist: coerceChecklist(input.checklist),
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
 * Total: every input, including a symbol, a function or `undefined`, produces a
 * record. The result is always a fresh mutable object — never the frozen
 * EMPTY_RECORD singleton, which a reducer would then be unable to build on.
 */
export function coerceRecordData(input: unknown): RecordData {
  const data = isRecordObject(input) ? input : {}
  const prefs = isRecordObject(data.prefs) ? data.prefs : {}
  const meta = isRecordObject(data.meta) ? data.meta : {}
  return {
    sheets: coerceSheets(data.sheets),
    everyoneSheets: coerceSheets(data.everyoneSheets),
    days: coerceDays(data.days),
    prefs: {
      charKeys: asBoolean(prefs.charKeys, EMPTY_RECORD.prefs.charKeys),
      /**
       * M10. A record written before this field existed reads back false — the
       * rail open — which needs no rung on the migration ladder, because the
       * default IS the honest answer for a reader who never expressed a
       * preference. Only a real boolean folds it, for the same reason only a
       * real boolean turns `charKeys` off: a truthy string out of a
       * hand-edited record must not decide the layout.
       */
      railFolded: asBoolean(prefs.railFolded, EMPTY_RECORD.prefs.railFolded),
      /**
       * M12. One of the three ids or null, matched against `CATALOG_VIEWS`
       * rather than trusted, for the reason §12.1.3 gives about every value
       * read back out of storage: the id reaches a class name and an attribute
       * selector, so a hand-edited record must not be able to choose its own.
       * Null is "has not chosen", which is what a record written before this
       * field existed says and needs no rung on the migration ladder.
       */
      catalogView: isViewId(prefs.catalogView) ? prefs.catalogView : null,
      /**
       * The two palettes, on `catalogView`'s terms: matched against the list,
       * because the id reaches an attribute selector, and null for anything
       * else — including every record written before these fields existed,
       * which needs no rung on the migration ladder.
       */
      figurePalette: isPaletteId(prefs.figurePalette) ? prefs.figurePalette : null,
      codePalette: isPaletteId(prefs.codePalette) ? prefs.codePalette : null,
    },
    meta: {
      lastExport: asInstant(meta.lastExport),
      persisted: asTriState(meta.persisted),
    },
  }
}

/** The importer reads the exported `.json` only; anything else carries no record. */
export function envelopeTextFrom(input: string): string | null {
  const text = input.trim()
  return text.startsWith('{') ? text : null
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
