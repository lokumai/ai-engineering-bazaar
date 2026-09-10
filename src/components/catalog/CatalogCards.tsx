import Link from 'next/link'
import { levelsOf, type SheetRow } from '@/lib/content/rows'
import { NOT_MEASURED, plural } from '@/lib/text'

/**
 * M12 / D13 — the CARDS view: one card per module, for browsing.
 *
 * The question this view answers is *what is here that I might want*, which is
 * the one a reader has when they do not yet know what they are looking for. So
 * a card leads with the module's title at reading size, names its level, and
 * prints the facts that decide whether to open it.
 *
 * ## M16 stage 4 grouped it, because the mockup does
 *
 * `playground/03-catalog.html`'s variant A is titled *"Cards, grouped under a
 * level heading"* and draws exactly that: a `.lvlhead` per level — a hue
 * swatch carrying the level's number, its name, its counts, and a rule filling
 * the remaining width — with that level's cards in a grid beneath it. This
 * component was a flat list of every module with the level printed on each
 * card, which is a different component that happens to contain the same facts.
 * The mockup is the specification, so it groups now.
 *
 * The grouping is `levelsOf(rows)` and nothing else, which is what keeps the
 * three views honest: a filter that removes every Expert module removes the
 * Expert heading with it rather than leaving an empty one, because the heading
 * is derived from the rows rather than from the curriculum.
 *
 * **The row model is the whole input** (D13): the same array the board and the
 * table are handed. Nothing is measured here and nothing is looked up — a cell
 * that reads `—` reads it because `manifest.ts` put a dash there, which is the
 * house spelling for "nobody counted" and never a zero somebody invented.
 *
 * **A planned module gets a card, a link, and `Planned` where its length would
 * be.** It is part of the catalog — the course is 33 modules and saying so is
 * the honest shape of it — and it has a page of its own: the A4 anatomy, which
 * prints the schedule of parts. Withholding the link here while the table view
 * carries it would be two views with different reach, which is the drift D13's
 * "no view-specific data" rule exists to stop.
 *
 * **The level is a colour AND a word AND a number.** `data-cat` resolves the
 * hue on the card's top edge and on the heading's swatch; the level's name and
 * number are printed beside it. Under `forced-colors: active` the hue goes and
 * the words stay (SC 1.4.1).
 *
 * `03` also prints a one-line summary under each card's title. The corpus has
 * no such field and `mini-courses/` is read-only, so the four labelled facts
 * stay where the mockup puts its summary. That is a difference in content, not
 * in design, and inventing a summary is not this milestone's business.
 */
export function CatalogCards({ rows }: { rows: readonly SheetRow[] }) {
  const levels = levelsOf(rows)

  return (
    <>
      {levels.map((level) => {
        const own = rows.filter((row) => row.subsystem.slug === level.slug)
        const ready = own.filter((row) => row.drawn).length

        return (
          <section key={level.slug} data-cat={level.slug} aria-labelledby={`bz-cards-${level.slug}`}>
            <div className="bz-levelhead">
              {/* The swatch is the hue as a shape, and the number inside it is
                  what a reader in forced colours reads instead. */}
              <span className="bz-levelhead-key" aria-hidden="true">
                {level.order}
              </span>
              <h3 id={`bz-cards-${level.slug}`} className="bz-levelhead-title">
                {level.title}
              </h3>
              {/* Both numbers, and `ready` rather than `done`: this is a fact
                  about what has been written, which is the same in frame one
                  for every reader. `03` prints "3 done" here, which is a fact
                  about the reader and could only arrive after first paint. */}
              <span className="bz-levelhead-count">
                {plural(own.length, 'module')} · {ready} ready
              </span>
              <span className="bz-levelhead-rule" aria-hidden="true" />
            </div>

            <ul className="bz-cards">
              {own.map((row) => (
                <li
                  key={row.slug}
                  className="bz-catcard"
                  data-cat={row.subsystem.slug}
                  data-drawn={row.drawn ? 'true' : 'false'}
                >
                  <p className="bz-catcard-level">
                    <span aria-hidden="true" className="bz-catcard-key" />
                    {row.subsystem.title}
                    <span className="bz-catcard-num">{row.number}</span>
                  </p>

                  <h4 className="bz-catcard-title">
                    <Link href={row.path} className="bz-catcard-link">
                      {row.title}
                    </Link>
                  </h4>

                  {/* Each fact labelled, because a bare `23` beside a bare
                      `EN · TR` is the kind of meta strip DESIGN.md names as a
                      tell. A dash is printed with its label rather than
                      dropped: the reader learns that the module declares no
                      length, which is what a draft is. */}
                  <dl className="bz-catcard-facts">
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
          </section>
        )
      })}
    </>
  )
}
