/**
 * The manifest's row model, and the four chips that filter it (§4.8).
 *
 * This module is deliberately a leaf: it imports nothing, because the filter
 * chips are a client island and everything else in `lib/content/` reads the
 * file system. A single value imported across that line pulls `node:fs` into
 * the browser bundle and the build stops.
 */

export interface SubsystemRef {
  order: number
  title: string
  path: string
}

export interface SheetRow {
  /** The sheet number, for ordering and for the prerequisite lists. */
  module: number
  /** That number as the `#` column prints it: zero-padded, like `DRAWING`. */
  number: string
  title: string
  path: string
  /** `status: ready` — the geometry is on the sheet. */
  drawn: boolean
  /** §4.8 `STATUS` — `READY` / `NOT DRAWN`. */
  status: string
  subsystem: SubsystemRef
  /** §4.8 `EXTENT` — `5,008 W · 30 MIN`, or `—` on a sheet not yet drawn. */
  extent: string
  /** §4.8 `SOURCES` — the count of distinct external links, or `—`. */
  sources: string
  /** §4.8 `LANG` — `EN` or `EN · TR`, computed per §7.6. */
  lang: string
  bilingual: boolean
  /** The declared `prerequisites`, or `—`. Derived (B7), never typed. */
  requires: string
  /** §4.9 `TOPICS` — at most three, read out of the sheet itself. */
  topics: string[]
}

// ---------------------------------------------------------------------------
// §4.8 item 5 — the filter chips
// ---------------------------------------------------------------------------

export interface SheetFilter {
  id: string
  label: string
  keep: (row: SheetRow) => boolean
}

/**
 * The four §4.8 names, in its order. Every one of them selects on a property
 * of the drawing. There is no `UNREAD` chip and there cannot be one: the site
 * has no reader state, and a filter is a claim about what it filters on.
 */
export const FILTERS: readonly SheetFilter[] = [
  { id: 'all', label: 'ALL', keep: () => true },
  { id: 'ready', label: 'READY', keep: (row) => row.drawn },
  { id: 'not-drawn', label: 'NOT DRAWN', keep: (row) => !row.drawn },
  { id: 'bilingual', label: 'EN · TR', keep: (row) => row.bilingual },
]

/**
 * Filtering never re-sorts. §9.1 forbids animating a list reorder, and the
 * simplest way to keep that promise is for the order never to change: the set
 * is numbered, and a numbered set has exactly one order.
 */
export function applyFilter(rows: readonly SheetRow[], id: string): SheetRow[] {
  const filter = FILTERS.find((candidate) => candidate.id === id)
  return filter ? rows.filter(filter.keep) : [...rows]
}
