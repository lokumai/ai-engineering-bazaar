/**
 * §12.1.2 / §12.1.3 — the record's shape, its two storage keys, and the frozen
 * empty form the server renders.
 *
 * **The rule is that nothing in `lib/record/` imports from `lib/content/`** —
 * not that nothing here imports at all. This file takes two type vocabularies
 * from fs-free leaves (`MarkId` from `lib/identity/mark.ts`, `RoleId` from
 * `lib/path/roles.ts`), which cross no boundary. The earlier wording said
 * "imports nothing", which was already untrue when the first of those landed and
 * would have read as licence to drop the rule that matters. That rule is not
 * tidiness: `lib/content/derive.ts`, `loader.ts`,
 * `revision.ts` and `paths.ts` reach `node:fs`, a client leaf imports the
 * record store, and a single value carried across that line pulls `node:fs`
 * into the browser bundle and stops the build. `lib/content/rows.ts` is the
 * same shape for the same reason.
 *
 * Modules are keyed by **slug** (`fundamentals/llms`), never by module number.
 * The set has been renumbered before; a number is a label, a slug is an
 * identity (§12.1.3).
 */

/**
 * §12.3.5 — the drafter's mark.
 *
 * The vocabulary is owned by `lib/identity/mark.ts`, which is the module that
 * knows what each id can actually be drawn as. It is re-exported here so the
 * record's consumers can take the type from the record, and so that this file
 * cannot grow a second copy that drifts out of the geometry's reach — which is
 * exactly what happened once already: two unions named `MarkId`, six uppercase
 * values against seven lowercase, compiling cleanly because no file yet
 * imported both.
 *
 * Both leaves are fs-free, so the import crosses no boundary (§12.2).
 */
import { type MarkId, STORABLE_MARK_IDS } from '../identity/mark'

export type { MarkId }
export const MARK_IDS: readonly MarkId[] = STORABLE_MARK_IDS

/**
 * §13.3 — the reader's role.
 *
 * Same arrangement as `MarkId` above, for the same reason: `lib/path/roles.ts`
 * is the module that knows what a role is offered as, so the union lives there
 * and is re-exported here rather than restated. The `MarkId` docblock records
 * what a second copy costs — two unions of the same name, differing values,
 * compiling cleanly because nothing imported both — and one such incident is
 * the whole budget.
 *
 * `roles.ts` imports nothing, so this crosses no boundary (§12.2).
 */
import { type RoleId, ROLE_IDS as PATH_ROLE_IDS } from '../path/roles'

export type { RoleId }
export const ROLE_IDS: readonly RoleId[] = PATH_ROLE_IDS

/** §12.6 — self-report, unscored. `null` is `unknown`, a first-class value. */
export interface QuizRecord {
  answer: string
  assessed: 'matched' | 'missed' | null
  at: string
}

/** §12.9 — the thing the reader hands in against a sheet. */
export interface Submittal {
  owner: string
  repo: string
  /** RECONSTRUCTED `https://github.com/{owner}/{repo}`, never the raw input. */
  url: string
  /** Reader-supplied, `/^[0-9a-f]{7,40}$/`, never fetched (§12.9.3). */
  commit: string | null
  note: string
  at: string
}

export interface SheetRecord {
  /** ISO instant of sign-off; null = not signed off. The reader asserts it. */
  signedOff: string | null
  /** The sheet's REV short hash AT sign-off, for the §12.4.3 drift line. */
  signedRevision: string | null
  /** Observed. Printed as evidence; gates nothing (§12.4.4). */
  reachedEnd: boolean
  /** Observed, accumulated, capped at DWELL_CAP_SECONDS per sheet. */
  dwellSeconds: number
  quiz: QuizRecord | null
  /** Keyed by stable index within the sheet (§12.7). Only ticks are stored. */
  checklist: { [index: string]: boolean }
  /** DISTINCT external URLs opened from this sheet (§12.8). Evidence, not XP. */
  sources: string[]
  submittals: Submittal[]
}

export interface RecordData {
  identity: {
    /** Exactly as typed, NFC-normalised, sanitised per §12.3.4. */
    name: string | null
    /** 8 lowercase hex, minted ONCE, never derived from the name (§12.3.5). */
    markSeed: string | null
    /** The reader's override; null means "use markSeed". */
    mark: MarkId | null
    /**
     * §13.3 — one of the nine frozen ids, or `null` for "has not said". Never
     * inferred: not from the name, not from which sheets have been signed off.
     */
    role: RoleId | null
  }
  sheets: { [slug: string]: SheetRecord }
  /** ISO dates (YYYY-MM-DD) on which anything was written. */
  days: string[]
  /** §12.16 — character-key shortcuts, default true for this audience. */
  prefs: { charKeys: boolean }
  meta: { lastExport: string | null; persisted: boolean | null }
}

export interface Envelope {
  schema: number
  savedAt: string
  data: RecordData
}

/**
 * §12.1.1 — one key, one owning module. The `hl-` prefix is mandatory and is
 * the only isolation available: the origin is `lokumai.github.io`, shared with
 * every other project site the owner publishes, because an origin is a
 * scheme/host/port tuple and excludes the path. `basePath` isolates nothing.
 */
export const RECORD_STORAGE_KEY = 'hl-record'

/**
 * §12.1.2 — where a payload this code cannot read is copied verbatim. Never a
 * discard: GitHub Pages serves cached bundles, so an older bundle can load
 * after a newer one has written, and this is the only copy of the record that
 * exists anywhere.
 */
export const RECORD_QUARANTINE_KEY = 'hl-record-quarantine'

/** §12.1.2 — inside the envelope, never in the key. Increments by one. */
export const SCHEMA_VERSION = 1

/** §12.4.4 — dwell is capped per sheet, so a left-open tab cannot dominate. */
export const DWELL_CAP_SECONDS = 3600

/** §12.9.1 — up to three per sheet. */
export const MAX_SUBMITTALS = 3

/**
 * The only two hazards a map key in this record presents. A slug is NOT
 * shape-checked: if the corpus renames a category the record must survive it,
 * and a key no sheet answers to costs nothing, because every selector in
 * `derive.ts` iterates the curriculum rather than the record. What is refused
 * is the three prototype names, which plain assignment would turn into a
 * prototype write, and a length no identifier has.
 */
export function isSafeKey(key: string): boolean {
  return (
    key.length > 0 &&
    key.length <= 200 &&
    key !== '__proto__' &&
    key !== 'constructor' &&
    key !== 'prototype'
  )
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const inner of Object.values(value)) deepFreeze(inner)
    Object.freeze(value)
  }
  return value
}

/**
 * §12.2 Channel B — the constant `getServerSnapshot` returns. It must be a
 * singleton (identity-equal across calls) or `useSyncExternalStore` re-renders
 * for ever, and it must be frozen so a reducer handed it cannot mutate the
 * value the server also rendered from.
 *
 * "Nothing signed off, every sheet dashed, readouts at `--`" is the only
 * non-lying thing build-time HTML can claim about a reader it has never met.
 */
export const EMPTY_RECORD: RecordData = deepFreeze<RecordData>({
  identity: { name: null, markSeed: null, mark: null, role: null },
  sheets: {},
  days: [],
  prefs: { charKeys: true },
  meta: { lastExport: null, persisted: null },
})

/**
 * True when a sheet record carries nothing at all. §11.25's absent-not-empty
 * rule needs this in two places: the validator drops such a record on read, and
 * the §12.15 erase dialog must not enumerate a sheet state that holds nothing.
 */
/**
 * Does this record carry nothing the reader made?
 *
 * Used by the cross-tab path to decide whether a record is worth sending to an
 * account, and the rule it serves is narrow: **a tab never pushes an empty
 * record.** An empty envelope cannot inform an account of anything, and there
 * are exactly two ways one arrives — the reader erased, or storage was cleared
 * under this tab. In the first case the erasing tab performs the account-side
 * delete itself; in the second the account copy is the thing that is supposed to
 * survive.
 *
 * Without the rule an erase could be undone by a tab that had nothing to do with
 * it: `DataPanel` writes the empty record, flushes it, and only then removes the
 * key, so every other open tab sees a VALID EMPTY ENVELOPE, adopts it, and
 * pushes — a push that races the delete and can land after it, recreating a row
 * that then looks like a record rather than a leftover.
 *
 * `prefs` is deliberately not consulted. A reader who toggled a keyboard
 * preference has made no record, and treating that as content would send an
 * otherwise-empty envelope for the sake of one boolean.
 */
export function carriesNothing(data: RecordData): boolean {
  if (data.days.length > 0) return false
  if (data.meta.lastExport !== null) return false
  const identity = data.identity
  if (identity.name !== null || identity.markSeed !== null) return false
  if (identity.mark !== null || identity.role !== null) return false
  return Object.values(data.sheets).every(isEmptySheetRecord)
}

export function isEmptySheetRecord(sheet: SheetRecord): boolean {
  return (
    sheet.signedOff === null &&
    sheet.signedRevision === null &&
    !sheet.reachedEnd &&
    sheet.dwellSeconds === 0 &&
    sheet.quiz === null &&
    Object.keys(sheet.checklist).length === 0 &&
    sheet.sources.length === 0 &&
    sheet.submittals.length === 0
  )
}

/** A fresh, mutable sheet record: nothing observed, nothing asserted. */
export function emptySheetRecord(): SheetRecord {
  return {
    signedOff: null,
    signedRevision: null,
    reachedEnd: false,
    dwellSeconds: 0,
    quiz: null,
    checklist: {},
    sources: [],
    submittals: [],
  }
}
