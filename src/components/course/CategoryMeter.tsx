import type { CategorySlug } from '@/lib/content/categories'

/**
 * §13.1.3 (2) / §13.5 — the segmented meter that reports one category's
 * standing, and the printed count beside it.
 *
 * **A server component, and it must stay one.** Every segment is filled by
 * channel A: `lib/record/boot.ts` stamps `hl-signed-<n>` on `<html>` before
 * first paint and `lokum.css` fills `.hl-seg[data-module="<n>"]` from it, so
 * the meter is correct in frame one with zero React and zero hydration
 * (§12.2). Nothing here reads the record, this component takes no record, and
 * making it an island would move a mark that is right in frame one onto the
 * channel that cannot be (§12.2, "never put a frame-one-visible mark into
 * channel B").
 *
 * `lokum.css` explains why it is segments and not a bar: a bar's length is a
 * computed number and a computed number cannot reach CSS on channel A. One
 * segment per sheet needs no arithmetic and says more — which sheets, not just
 * how many.
 *
 * **The count is text, so the count is channel B.** `n/m` is a tally, and a
 * tally is exactly what channel A may not carry, so this component prints the
 * `--` no-reading form the instruments elsewhere use (`Readout`) and
 * `CategoryTally` fills it in after mount. The split is the same one
 * `ModuleRow` and `SignOffMarks` already make: the server writes the honest
 * empty form and a contract into the markup, and one island per document
 * paints all of them. `data-hl-cat-tally` is that contract, and it is written
 * here as a literal and owned by the island, the way `data-hl-slot` is — the
 * server component is never imported by the client one. The `--` is not a
 * placeholder for a number the build is withholding; it is the true statement
 * that no record has been read yet.
 *
 * The count is what keeps the hue redundant (SC 1.4.1, §13.1.4): the meter
 * never appears without it, and under `forced-colors: active` the segments
 * keep their borders and the count keeps saying the same thing.
 *
 * It does not duplicate `TickGauge`, which sits beside it on `/courses/`.
 * `TickGauge` reports the *drawing set* — which sheets are drawn, true for
 * everybody, in every frame. This reports the *reader*. Two strips, two
 * subjects; §11.38 forbids a second surface for one subject, not one surface
 * each for two.
 */

/** `--` is the instrument convention for "no reading", and it is true. */
const NO_READING = '--'

/**
 * The two facts a segment needs, both of them facts about the drawing set. A
 * page that may reach `node:fs` measures them and passes them down; this
 * component imports nothing that could (§12.2's import direction).
 */
export interface MeterSheet {
  module: number
  drawn: boolean
}

export function CategoryMeter({
  category,
  sheets,
  className,
}: {
  category: CategorySlug
  /** Every sheet in the category, drawn or not — the denominator, undiminished. */
  sheets: readonly MeterSheet[]
  className?: string
}) {
  if (sheets.length === 0) return null

  // Module order is the contract, so it is enforced here rather than assumed of
  // the caller: a meter whose segments ran in a different order than the sheet
  // numbers beside them would report the wrong sheet as done.
  const ordered = [...sheets].sort((a, b) => a.module - b.module)

  return (
    <div className={className}>
      {/* Decoration, deliberately: the count below states the same reading in
          text, which is the only condition under which a gauge may be silent
          (§10.4). */}
      <div className="hl-meter w-44" aria-hidden="true">
        {ordered.map((sheet) => (
          <span
            key={sheet.module}
            className="hl-seg"
            data-module={sheet.module}
            data-cat={category}
            // §11.25 / §13.4.2 — a sheet nobody has drawn carries no sign-off
            // control at all, so its segment is drawn as hidden geometry and
            // can never fill. Seventeen of the thirty-two are in that state.
            data-drawn={sheet.drawn ? 'true' : 'false'}
          />
        ))}
      </div>

      <p className="hl-mark m-0 mt-1 text-ink-muted">
        <span data-hl-cat-tally={category}>
          {NO_READING}/{ordered.length}
        </span>{' '}
        signed off
      </p>
    </div>
  )
}
