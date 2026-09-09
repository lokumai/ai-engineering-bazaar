import Link from 'next/link'
import { NOT_MEASURED } from '@/lib/text'
import type { SheetRow } from '@/lib/content/rows'

/**
 * M12 / D13 — the CARDS view: one card per module, for browsing.
 *
 * The question this view answers is *what is here that I might want*, which is
 * the one a reader has when they do not yet know what they are looking for. So
 * a card leads with the module's title at reading size, names its level, and
 * prints the three facts that decide whether to open it: how long it is, how
 * many sources it cites, and which languages it exists in.
 *
 * **The row model is the whole input** (D13): the same array the overview and
 * the table are handed. Nothing is measured here and nothing is looked up — a
 * cell that reads `—` reads it because `manifest.ts` put a dash there, which is
 * the house spelling for "nobody counted" and never a zero somebody invented
 * (§11.25).
 *
 * **A planned module gets a card, a link, and `Planned` where its length would
 * be.** It is part of the catalog — the course is 33 modules and saying so is
 * the honest shape of it — and it has a page of its own: the A4 anatomy, which
 * prints the schedule of parts. Withholding the link here while the table view
 * carries it would be two views with different reach, which is the drift D13's
 * "no view-specific data" rule exists to stop. The dashed leading edge and the
 * word are what say the module is not written yet.
 *
 * **The level is a colour AND a word AND a number.** `data-cat` resolves the
 * hue on the card's leading edge and on its 7px square; the level's name and
 * number are printed beside it. Under `forced-colors: active` the hue goes and
 * the words stay (SC 1.4.1).
 */
export function CatalogCards({ rows }: { rows: readonly SheetRow[] }) {
  return (
    <ul className="hl-cards">
      {rows.map((row) => (
        <li
          key={row.slug}
          className="hl-card"
          data-cat={row.subsystem.slug}
          data-drawn={row.drawn ? 'true' : 'false'}
        >
          <p className="hl-card-level">
            <span aria-hidden="true" className="hl-card-chip" />
            {row.subsystem.title}
            <span className="hl-card-num">{row.number}</span>
          </p>

          <h3 className="hl-card-title">
            <Link href={row.path} className="hl-card-link">
              {row.title}
            </Link>
          </h3>

          {/* Each fact labelled, because a bare `23` beside a bare `EN · TR`
              is the kind of meta strip DESIGN.md names as a tell. A dash is
              printed with its label rather than dropped: the reader learns
              that the module declares no length, which is what a draft is. */}
          <dl className="hl-card-facts">
            <div>
              <dt>Length</dt>
              <dd>{row.drawn ? row.extent : 'Planned'}</dd>
            </div>
            <div>
              <dt>Sources</dt>
              <dd>{row.sources}</dd>
            </div>
            <div>
              <dt>Languages</dt>
              <dd>{row.lang}</dd>
            </div>
            <div>
              <dt>Requires</dt>
              <dd>{row.requires === NOT_MEASURED ? 'Nothing' : row.requires}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  )
}
