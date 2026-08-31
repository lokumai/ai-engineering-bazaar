/**
 * Requirement B5 — how wide a figure is allowed to be.
 *
 * §6.5 and §6.10 give one rule with two inputs: a table is classed by its
 * column count at build time, a diagram by its measured natural SVG width in
 * the browser. Both land on the same three tracks from §2.2 — the 656px
 * measure, the 920px wide track, the 1152px content box — and in every case
 * the figure scrolls inside its own container rather than widening the page
 * (§11.10).
 *
 * This module holds no DOM and no markdown, because the client island and the
 * render pipeline both need it and the island must not pull unified, shiki and
 * the whole build pipeline into the browser bundle to ask one question.
 */

export type FigureWidth = 'prose' | 'wide' | 'full'

/** §2.2's layout tracks, the only two boundaries in the system. */
const PROSE_TRACK = 656
const WIDE_TRACK = 920

/**
 * §6.5 — the width class of a table, decided by column count at build time.
 *
 * **MEASURED:** the widest table in the corpus is 6 columns (module 11) and
 * the longest is 58 pipe-rows (module 10). Six columns of prose-heavy verdict
 * cells inside a 656px measure is unreadable; six columns allowed to size
 * themselves would blow the page's horizontal scroll.
 */
export function widthForColumns(columns: number): FigureWidth {
  if (columns >= 6) return 'full'
  if (columns === 5) return 'wide'
  return 'prose'
}

/**
 * §6.10 B5 — the width class of a diagram, decided by the natural width the
 * renderer produced. **MEASURED:** 38 of the 53 English diagrams are
 * `graph LR` and will be wider than the measure.
 *
 * An unmeasurable diagram — zero, `NaN`, a detached node — stays at the
 * measure: a figure that cannot prove it needs the extra room does not get it.
 */
export function widthForNaturalWidth(pixels: number): FigureWidth {
  if (!Number.isFinite(pixels) || pixels <= PROSE_TRACK) return 'prose'
  return pixels <= WIDE_TRACK ? 'wide' : 'full'
}
