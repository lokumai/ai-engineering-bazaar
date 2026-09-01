import type { CategorySlug } from '@/lib/content/categories'
import { FACES, FLAVOURS } from './geometry'

/**
 * §13.2 — the face legend. What makes the drawing accessible.
 *
 * The mark is `aria-hidden` in every state and at every size (§12.2, §12.18):
 * an accessible name that flips between the prerender and the hydrated render
 * is itself a mismatch, and a static export prerenders one page for every
 * reader. So the drawing carries nothing to assistive technology, and at 96px
 * and above §13.2 requires this beside it — six rows of real text, one per
 * face, each naming the flavour, the subsystem it reports and the count. It is
 * the readout for the cube, not a caption about it.
 *
 * **The rows are the faces, in the faces' own order** (`FACES`, which is
 * category order). A legend row and the face it explains are the same fact
 * printed twice, so the order is taken from the geometry rather than restated
 * here, and all six are always present — including the three the projection
 * hides, which is exactly why the legend is needed to read them.
 *
 * **The colour is channel A, the count is not.** The swatch is
 * `.hl-legend-swatch .hl-cat-tint` with `data-cat`, so `lokum.css` resolves it
 * to the structural line, half chroma or full chroma from the classes the boot
 * script stamped on `<html>` — correct in frame one, no React. A count is a
 * computed number and §12.2 allows a number on exactly one other channel: it
 * arrives here as a prop, either measured from the corpus at build time or
 * handed down by a client island after mount. Nothing is computed in this file
 * and nothing is imported from `lib/content/` (§12.2, R3): those modules reach
 * `node:fs`, and one value imported across that line would pull it into the
 * browser bundle of whichever island renders this.
 *
 * **§13.1.4 — the hue is never alone.** Every row prints its flavour name, its
 * subsystem title and its count as text, so the swatch is redundant
 * reinforcement; under `forced-colors: active` `lokum.css` drops the swatch to
 * `Canvas` on a `CanvasText` border and the legend still reports everything.
 *
 * It has no voice (§8.5, §13.8): the legend states counts and never comments
 * on them.
 */

/** One row's numbers, and its English title. Never computed here (§11.25). */
export interface FaceLegendRow {
  /** The English category title, beside the Turkish flavour name (§13.9). */
  title: string
  /**
   * Sheets in this category that a reader could sign off — measured from the
   * corpus at build time and passed down as plain data, never typed (§11.25).
   */
  total: number
  /**
   * Sheets in this category this reader has signed off, or `null` for "no
   * reading". `null` is not zero: a server render and a client island before
   * its store has answered both know nothing, and printing `0` there would
   * claim a state that is not true of this reader (§1). It prints `--`, and
   * `CategoryTally` replaces it once the record has been read.
   */
  signed: number | null
}

/** All six, so the type checker refuses a legend with a face missing. */
export type FaceLegendRows = Readonly<Record<CategorySlug, FaceLegendRow>>

export interface FaceLegendProps {
  rows: FaceLegendRows
  className?: string
}

/**
 * §11.25 — a dash where there is no number, never a zero and never a guess.
 * The denominator survives when the numerator does not, because the corpus is
 * known at build time even when the reader's record is not.
 *
 * **Two dashes, two meanings, and the first version used the wrong one.** `—`
 * (em dash) is §11.25's "this cannot be derived", and it is right for a
 * subsystem holding no sheets: there is no fraction to print. `--` is the
 * instrument convention the `Readout` and `CategoryMeter` use for "no reading
 * has been taken yet", and it is what belongs in the numerator of a server
 * render — the count is perfectly derivable, just not by a page prerendered
 * before this reader existed. Printing `—/7` told a reader whose record holds
 * four sign-offs that the number was unobtainable, while the identical meter on
 * `/courses/` printed `4/7`.
 *
 * The numerator is therefore `--` and carries `data-hl-cat-tally`, the same
 * contract `CategoryMeter` writes, so the one `CategoryTally` island per
 * document fills this cell alongside every other (§12.2 channel B).
 */
function count(row: FaceLegendRow): string {
  // Not an em dash. A subsystem whose sheets are all drafts has no fraction to
  // print, and `—` left a reader to guess between "no sheets" and "cannot be
  // worked out" — while the truth is neither: there are sheets, and none of
  // them is drawn, so none can be signed off. `NOT DRAWN` is the register's own
  // word for that state (§12.14.1), used by the manifest, the module row, the
  // diagram and the report, and it answers the SIGNED OFF column's question
  // exactly.
  if (row.total <= 0) return 'NOT DRAWN'
  return `${row.signed === null ? NO_READING : row.signed}/${row.total}`
}

/** The instrument convention for "no reading yet", shared with `Readout`. */
const NO_READING = '--'

/**
 * `CategoryTally`'s contract, written here as a literal and owned by that
 * island — exactly as `CategoryMeter` writes it. The island is a client
 * component and this one is not, so the attribute name travels as a string
 * rather than as an import (§12.2's import direction).
 */
const TALLY_ATTR = 'data-hl-cat-tally'

/** The type §3.2 and §5.3 fix for a table of machine-derived values. */
const TABLE = 'w-full border-collapse text-left font-mono text-mark tabular-nums'

export function FaceLegend({ rows, className }: FaceLegendProps) {
  return (
    <table className={className ? `${TABLE} ${className}` : TABLE}>
      <caption className="hl-mark mb-2 text-left text-ink-muted">
        The six faces of the mark, the subsystem each one reports, and the
        sheets signed off in it
      </caption>
      <thead>
        <tr className="border-b border-line-strong text-ink-muted uppercase">
          <th scope="col" className="py-1 pr-3 font-medium">Flavour</th>
          <th scope="col" className="py-1 pr-3 font-medium">Subsystem</th>
          <th scope="col" className="py-1 font-medium">Signed off</th>
        </tr>
      </thead>
      <tbody>
        {FACES.map((face) => {
          const row = rows[face.category]
          return (
            <tr key={face.id} className="border-b border-line">
              {/* The flavour name is the row's own header: it is what the
                  swatch beside it is named by, and it is the one string §13.9
                  prints in Turkish. Stored uppercase in `FLAVOURS`, never cased
                  at render time, because Turkish `i` uppercases to `İ`. */}
              <th scope="row" className="py-1 pr-3 font-normal whitespace-nowrap text-ink">
                <span
                  aria-hidden="true"
                  className="hl-legend-swatch hl-cat-tint me-2 align-middle"
                  data-cat={face.category}
                />
                {FLAVOURS[face.category]}
              </th>
              <td className="py-1 pr-3 whitespace-nowrap text-ink-muted">{row.title}</td>
              <td className="py-1 whitespace-nowrap text-ink-muted">
                {/* `row.total <= 0` prints a bare em dash and must NOT be
                    filled: there is no fraction for the island to write. */}
                {row.total <= 0 ? (
                  count(row)
                ) : (
                  <span {...{ [TALLY_ATTR]: face.category }}>{count(row)}</span>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
