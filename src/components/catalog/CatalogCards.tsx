import Link from 'next/link'
import { levelsOf, type SheetRow } from '@/lib/content/rows'
import { NOT_MEASURED } from '@/lib/text'
import { Description } from '@/components/sheet/Description'

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
 * **The level is a colour AND a word**, and M20 took the number out of the
 * heading's swatch. `data-cat` resolves the hue on the card's top edge and on
 * the swatch; the level's name is printed beside it, and the card's own level
 * line names it again. Under `forced-colors: active` the hue goes and the words
 * stay (SC 1.4.1) — two of them per card, which is what the number was the
 * third of.
 *
 * `03` prints a one-line summary under each card's title, and **M20 finally put
 * a summary in it.**
 *
 * M17 filled the slot with the module's topics on the stated grounds that "the
 * corpus has no summary field". **It does, and it is required:** `schema.ts`
 * fails the build for a `ready` module without a `summary`, and 19 of the 33
 * modules carry one — which is every written module. Nothing had to be invented
 * and nothing in `mini-courses/` had to be touched; the sentence was there the
 * whole time. See `Description`.
 *
 * ## M17 also took the count off the level heading
 *
 * `03`'s `.lvlhead` carries `8 modules · 7 ready`, and the author's standing
 * instruction outranks the mockup (`DESIGN.md`'s order of authority). The cards
 * under the heading are the count, one each.
 */
export function CatalogCards({ rows }: { rows: readonly SheetRow[] }) {
  const levels = levelsOf(rows)

  return (
    <>
      {levels.map((level) => {
        const own = rows.filter((row) => row.subsystem.slug === level.slug)

        return (
          <section key={level.slug} data-cat={level.slug} aria-labelledby={`bz-cards-${level.slug}`}>
            <div className="bz-levelhead">
              {/* M20 — THE SWATCH IS EMPTY NOW, and the comment that stood here
                  had to go with the number rather than outlive it. It read:
                  "the number inside it is what a reader in forced colours reads
                  instead". That was true and it is no longer the arrangement —
                  the author does not name a level by number anywhere, so the
                  heading beside this swatch is the carrier, in words, and words
                  survive `forced-colors: active` untouched. Leaving the comment
                  would have had the next reader restore a carrier that is
                  already carried. */}
              <span className="bz-levelhead-key" aria-hidden="true" />
              <h3 id={`bz-cards-${level.slug}`} className="bz-levelhead-title">
                {level.title}
              </h3>
              {/* NO COUNT. It read `8 modules · 7 ready` over eight cards, seven
                  of which print a length and one of which prints `Planned` —
                  the heading counted what the reader was about to count for
                  themselves. The author, naming this line: *"Never we care
                  about it."* MANIFESTO rule 16, and D61's method: the fact had
                  a carrier already, so only the sentence went. */}
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

                  {/* M17 filled `03`'s summary slot with the module's topics,
                      because the corpus had no summary field to print. **It
                      did** — `summary` is required frontmatter on every written
                      module — so M20 prints the author's own sentence here and
                      puts it behind the same disclosure the table uses.

                      It sits under the title and above the facts because it is
                      what the module is ABOUT, and the facts are what it costs.
                      `Description` renders nothing at all for a module with
                      neither a summary nor a schedule of parts, so the card
                      closes up rather than printing an empty line. */}
                  <Description row={row} />

                  {/* Each fact labelled, because a bare `23` beside a bare
                      `5,008 W · 30 MIN` is the kind of meta strip DESIGN.md
                      names as a tell. A dash is printed with its label rather
                      than dropped: the reader learns that the module declares
                      no length, which is what a draft is. */}
                  <dl className="bz-catcard-facts">
                    <div>
                      <dt>Length</dt>
                      <dd>{row.drawn ? row.extent : 'Planned'}</dd>
                    </div>
                    <div>
                      <dt>Sources</dt>
                      <dd>{row.sources}</dd>
                    </div>
                    {/* `Languages` — `EN · TR` — was the third fact and M20
                        removed it with the table's `Lang` column. The site
                        renders none of the 33 `_tr.md` files, so the card was
                        stating a translation nothing can serve; M19 is what
                        makes the claim true, and it makes it a URL. */}
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
