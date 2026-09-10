/**
 * The manifest's row model, and the six chips that filter it (§4.8, §12.18).
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
  /**
   * M12 — the level's own slug, which is also its identity.
   *
   * Added for the catalog's three views: every level colour in the palette is
   * addressed as `[data-cat="<slug>"]` (`category.css`), so a view that groups by
   * level needs the slug and not only the title. It was derivable from `path`
   * by string surgery, which is exactly the kind of derivation that breaks the
   * day a route changes; the loader knows it, so it is carried.
   */
  slug: string
}

export interface SheetRow {
  /** The sheet number, for ordering and for the prerequisite lists. */
  module: number
  /** That number as the `#` column prints it: zero-padded, like `DRAWING`. */
  number: string
  /**
   * §12.1.3 — the sheet's identity, `fundamentals/llms`. The record is keyed by
   * it and nothing else: the set has been renumbered before, so a number is a
   * label and the slug is the identity. It is the row's only link to the
   * reader's record, and the ninth column is the only cell that uses it.
   */
  slug: string
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
  /**
   * §4.8 column 9 / §7.4 — the sign-off slots THIS sheet supplies, in
   * `sheetStamps`' order, as `Stamp.id` spells them: `SIGN-OFF`, and then
   * `QUIZ`, `CHECKLIST` and `SOURCES` where the sheet can supply each. Empty on
   * a sheet nobody has drawn, which supplies none of them.
   *
   * This is a fact about the drawing, not about the reader: it says which
   * squares the column draws, never which ones are filled. `string[]` because
   * the record's own `Stamp.id` is a string, and a second union declared here
   * would be a second vocabulary to drift out of step with it.
   */
  slots: readonly string[]
}

// ---------------------------------------------------------------------------
// §4.8 item 5 — the filter chips
// ---------------------------------------------------------------------------

/**
 * What a chip selects on, and therefore where it can be applied (§12.2).
 *
 * A `drawing` predicate reads a property of the sheet, is settled at build
 * time, and the prerendered HTML can honour it. A `record` predicate needs the
 * reader's record, which no prerendered page has ever seen; it can only be
 * applied in the browser, after the store has been read.
 *
 * The distinction is in the type rather than in a comment because of what it
 * prevents. A reader-state filter active on load would make the first client
 * render emit a different number of `<tr>` than the prerender — the worst class
 * of hydration mismatch — so `FILTERS[0]` is `ALL` and stays `ALL`, and a chip
 * that filters on the record has to say so where a reader of this file cannot
 * miss it.
 */
export type FilterBasis = 'drawing' | 'record'

export interface SheetFilter {
  id: string
  label: string
  basis: FilterBasis
  /**
   * @param signed the slugs the record says are signed off. Empty on the
   *   server and in the first client render, which is why no `record` chip may
   *   be the active one at that point.
   */
  keep: (row: SheetRow, signed: ReadonlySet<string>) => boolean
}

/** What the server and the first client render know about the reader: nothing. */
const NONE_SIGNED: ReadonlySet<string> = new Set<string>()

/** §12.4.1 — the reader asserts a sign-off; a draft can never carry one. */
function isSignedOff(row: SheetRow, signed: ReadonlySet<string>): boolean {
  return row.drawn && signed.has(row.slug)
}

/**
 * §4.8's four names in its order, then §12.18's two.
 *
 * The first four select on a property of the drawing. The last two select on
 * the record, which is a claim about the reader, so they are marked `record`
 * and the chip row is honest about which is which. `NOT COMPLETED` counts a module
 * nobody has drawn — it is not signed off, and §12.5.2's `TO GO` counts it the
 * same way, out of the whole set rather than out of the drawn ones.
 */
export const FILTERS: readonly SheetFilter[] = [
  { id: 'all', label: 'All', basis: 'drawing', keep: () => true },
  { id: 'ready', label: 'Ready', basis: 'drawing', keep: (row) => row.drawn },
  { id: 'not-drawn', label: 'Planned', basis: 'drawing', keep: (row) => !row.drawn },
  { id: 'bilingual', label: 'Both languages', basis: 'drawing', keep: (row) => row.bilingual },
  {
    id: 'signed',
    label: 'Completed',
    basis: 'record',
    keep: (row, signed) => isSignedOff(row, signed),
  },
  {
    id: 'unsigned',
    label: 'Not completed',
    basis: 'record',
    keep: (row, signed) => !isSignedOff(row, signed),
  },
]

/**
 * M12 — the id the level filter takes when it is selecting nothing.
 *
 * The level filter is a second axis rather than six more chips on the first
 * one, because the two questions are independent: "the Expert modules" and
 * "the ones I have not completed" compose, and a single row of eleven chips
 * cannot express the pair. It is `'all'` on load for the same §12.2 reason
 * `DEFAULT_FILTER_ID` is: the prerendered HTML has met no reader, so the first
 * client render has to emit the same rows the server did.
 */
export const ALL_LEVELS = 'all'

/** The levels the rows themselves contain, in curriculum order. */
export function levelsOf(rows: readonly SheetRow[]): SubsystemRef[] {
  const seen = new Map<string, SubsystemRef>()
  for (const row of rows) if (!seen.has(row.subsystem.slug)) seen.set(row.subsystem.slug, row.subsystem)
  return [...seen.values()].sort((a, b) => a.order - b.order)
}

/** The rows of one level, or every row for `ALL_LEVELS`. Never re-sorted. */
export function applyLevel(rows: readonly SheetRow[], level: string): SheetRow[] {
  return level === ALL_LEVELS ? [...rows] : rows.filter((row) => row.subsystem.slug === level)
}

/** The chip that is active on load, and the only one that may be (§12.2). */
export const DEFAULT_FILTER_ID: string = FILTERS[0].id

/**
 * Filtering never re-sorts. §9.1 forbids animating a list reorder, and the
 * simplest way to keep that promise is for the order never to change: the set
 * is numbered, and a numbered set has exactly one order.
 */
export function applyFilter(
  rows: readonly SheetRow[],
  id: string,
  signed: ReadonlySet<string> = NONE_SIGNED,
): SheetRow[] {
  const filter = FILTERS.find((candidate) => candidate.id === id)
  return filter ? rows.filter((row) => filter.keep(row, signed)) : [...rows]
}

/**
 * §12.13 class 3 — the one empty state a filter can produce, as the sentence
 * the live region announces.
 *
 * The denominator is the set the chips were handed, so a level's table says
 * `0 of 8` and the catalog says `0 of 33`; SC 4.1.3's own examples are "5
 * results returned" / "No results returned", so the count is announced rather
 * than implied.
 *
 * **M12 rewrote it and the rewrite is the deliverable, not the casing.** It
 * read `NO MODULES MATCH FILTER — 0 of 33`, which is a status and not an
 * instruction: M12 asks an empty result to say what to do next. The cause is
 * named as the filter rather than the reader, the sentence points at the
 * control that undoes it, and `NO_MATCH_CUE` beside it is the paragraph that
 * says which control.
 */
export function noMatchReadout(total: number): string {
  return `No module matches both filters · 0 of ${total}`
}

/**
 * The line under it: what to do, in one sentence, naming the control.
 *
 * Separate from the readout above because only the readout belongs in the live
 * region — a status message is announced on change and this is standing prose,
 * so a screen reader would hear the whole paragraph again on every keystroke of
 * a filter it was not describing.
 */
export const NO_MATCH_CUE =
  'The two filters select different modules. Widen either one, or clear both to '
  + 'see the whole catalog again.'
