/**
 * §12.1.2 / §12.1.3 — the record's shape, its two storage keys, and the frozen
 * empty form the server renders.
 *
 * **The rule is that nothing in `lib/record/` imports from `lib/content/`.**
 * `lib/content/derive.ts`, `loader.ts` and `revision.ts` reach `node:fs`, a
 * client leaf imports the record store, and a single value carried across that
 * line pulls `node:fs` into the browser bundle and stops the build. The two
 * vocabularies imported below come from fs-free leaves and cross no boundary.
 *
 * Modules are keyed by **slug** (`fundamentals/llms`), never by module number.
 * The set has been renumbered before; a number is a label, a slug is an
 * identity (§12.1.3).
 *
 * ## What the record no longer holds (2026-11-05, M40)
 *
 * The reader's name, mark, mark seed and role, and each module's self-check
 * answer, opened sources and linked repositories. The features that wrote and
 * showed them were removed on the author's word. A stored record that still
 * carries them parses unchanged: `validate.ts` reads only the fields below and
 * ignores the rest, so the old fields drop out on the next write and the
 * schema version did not have to move.
 */

/**
 * M12 / D13 — which catalog view the reader chose. `lib/catalog/views.ts` owns
 * the union and the boot script embeds the same `VIEW_IDS` array.
 */
import { type CatalogViewId, VIEW_IDS as CATALOG_VIEW_IDS } from '../catalog/views'

export type { CatalogViewId }
export const CATALOG_VIEWS: readonly CatalogViewId[] = CATALOG_VIEW_IDS

/**
 * The palettes a reader can put the diagrams and the code in
 * (`lib/reading/palettes.ts`). The boot script embeds this array to match a
 * stored id before it reaches an attribute.
 */
import { type PaletteId, PALETTE_IDS as READING_PALETTE_IDS } from '../reading/palettes'

export type { PaletteId }
export const PALETTE_IDS: readonly PaletteId[] = READING_PALETTE_IDS

export interface SheetRecord {
  /** ISO instant of completion; null = not completed. The reader asserts it. */
  signedOff: string | null
  /** The module's REV short hash AT completion, for the §12.4.3 drift line. */
  signedRevision: string | null
  /** Observed. Gates nothing (§12.4.4). */
  reachedEnd: boolean
  /** Observed, accumulated, capped at DWELL_CAP_SECONDS per module. */
  dwellSeconds: number
  /** Keyed by stable index within the module (§12.7). Only ticks are stored. */
  checklist: { [index: string]: boolean }
}

export interface RecordData {
  sheets: { [slug: string]: SheetRecord }
  /** ISO dates (YYYY-MM-DD) on which anything was written. */
  days: string[]
  prefs: {
    /** §12.16 — character-key shortcuts, default true for this audience. */
    charKeys: boolean
    /**
     * M10 — whether the curriculum rail on a module page is folded away. A
     * fact about this browser, not the reader, so it lives in `prefs`, which
     * `carriesNothing` ignores. The record store is the only writer of learner
     * state (`kia-context/specs/ARCHITECTURE.md` §5), so it is not a second
     * `localStorage` key. Default false: the rail is open.
     */
    railFolded: boolean
    /**
     * M12 / D13 — which of the catalog's views the reader last chose, or `null`
     * for "has not chosen". `null` and not `'overview'`, so a later change of
     * default moves only the readers who never chose.
     */
    catalogView: CatalogViewId | null
    /** 2026-10-11 — the palette for the diagrams, or `null` for "has not chosen". */
    figurePalette: PaletteId | null
    /** The same, for the code blocks. A separate choice on purpose. */
    codePalette: PaletteId | null
  }
  meta: {
    lastExport: string | null
    persisted: boolean | null
  }
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

/** §12.4.4 — dwell is capped per module, so a left-open tab cannot dominate. */
export const DWELL_CAP_SECONDS = 3600

/**
 * The only two hazards a map key in this record presents. A slug is NOT
 * shape-checked: if the corpus renames a category the record must survive it,
 * and a key no module answers to costs nothing, because every selector in
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
 */
export const EMPTY_RECORD: RecordData = deepFreeze<RecordData>({
  sheets: {},
  days: [],
  prefs: {
    charKeys: true,
    railFolded: false,
    catalogView: null,
    figurePalette: null,
    codePalette: null,
  },
  meta: { lastExport: null, persisted: null },
})

/**
 * Does this record carry nothing the reader made? `prefs` is deliberately not
 * consulted: a reader who toggled a preference has made no record.
 */
export function carriesNothing(data: RecordData): boolean {
  if (data.days.length > 0) return false
  if (data.meta.lastExport !== null) return false
  return Object.values(data.sheets).every(isEmptySheetRecord)
}

/**
 * True when a module record carries nothing at all. The validator drops such a
 * record on read, and the erase dialog does not list a module that holds nothing.
 */
export function isEmptySheetRecord(sheet: SheetRecord): boolean {
  return (
    sheet.signedOff === null &&
    sheet.signedRevision === null &&
    !sheet.reachedEnd &&
    sheet.dwellSeconds === 0 &&
    Object.keys(sheet.checklist).length === 0
  )
}

/** A fresh, mutable module record: nothing observed, nothing asserted. */
export function emptySheetRecord(): SheetRecord {
  return {
    signedOff: null,
    signedRevision: null,
    reachedEnd: false,
    dwellSeconds: 0,
    checklist: {},
  }
}
