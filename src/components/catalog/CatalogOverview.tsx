import Link from 'next/link'
import { levelsOf, type SheetRow } from '@/lib/content/rows'
import { plural } from '@/lib/text'

/**
 * M12 / D13 — the OVERVIEW view: the shape of the course, level by level.
 *
 * D13's reason for keeping all three views is that they answer three different
 * questions, and this one answers *what is in this course and in what order*.
 * So it is the only view that groups, and the only one a reader can take in
 * without scrolling.
 *
 * ## M16 stage 4 turned it into a board, because that is what the mockup is
 *
 * `playground/03-catalog.html`'s variant C is *"Five columns, one per level"* —
 * a `.board` grid of `.col`s, each headed in its own hue with a progress track
 * under the header and its modules listed inside. This component was a stack
 * of full-width bands, which reads as an outline rather than as a shape. The
 * mockup's own note is the argument for the change: *"the whole shape of the
 * course in one view"*, which a vertical stack cannot be.
 *
 * The board falls to two columns below the language's upper breakpoint and to
 * one below its lower one. `03` breaks at 1080 and 620; those are two widths
 * the product does not otherwise have, and DESIGN.md declares exactly two, so
 * the mockup's intent (five, then two, then one) is mapped onto the widths
 * that already exist rather than adding a third pair.
 *
 * ## The counts are build-time facts, and that is a channel decision
 *
 * A column says how many modules its level has and how many are **written**.
 * It does not say how many the reader has completed, and the progress track is
 * filled from the same written count. `03` prints "3 of 8 done", which is a
 * fact about the reader — and a fact about the reader cannot be drawn here: it
 * lives in Web Storage, so it would arrive after first paint and the track
 * would visibly fill from zero on every load. **D37** records the same finding
 * for the curriculum rail, which states a level's total for the same reason.
 *
 * **It renders the rows it is handed and groups nothing else.** The columns
 * come from `levelsOf(rows)`, so a filter that removes every Expert module
 * removes the Expert column with it rather than leaving an empty one — and the
 * three views cannot disagree about which modules exist, because there is one
 * array and each view is a rendering of it (D13's bound on the cost of three).
 *
 * **A level is told apart four ways, and the hue is only one of them**: its
 * name, its position in the row, its counts, and `data-cat`, which
 * `category.css` resolves to the level's own colour. Under
 * `forced-colors: active` every hue goes and the other three carry the whole
 * distinction (SC 1.4.1).
 *
 * **Every module is a link, including a planned one, and that is deliberate
 * rather than lazy.** A planned module HAS a page — the A4 anatomy, which
 * prints its schedule of parts and what it will require — so refusing the link
 * would hide a document the table view links happily, and two views with
 * different reach is the drift D13's "no view-specific data" rule exists to
 * stop. `PathSteps` makes the opposite call for a good reason of its own: a
 * path is an instruction to read something next, and a step that cannot be read
 * is not one. A catalog is an inventory, and the planned modules are part of
 * the inventory. The word `Planned` is what says so.
 */
export function CatalogOverview({ rows }: { rows: readonly SheetRow[] }) {
  const levels = levelsOf(rows)

  /* M18 — the board draws as many columns as it HAS, computed here and handed
     to the stylesheet, which is the `--bz-table-min` pattern stage 4
     established for exactly this kind of number.

     `03`'s board is `repeat(5, minmax(0, 1fr))` because `03` draws five levels,
     and the rule went in literally. A filter that leaves one level then drew one
     column a fifth of the page wide with four fifths empty — which is the shape
     the author had already objected to on the home page, in capitals, and it
     was one level chip away on the catalog before M17 made it a landing page. */
  return (
    <div
      className="bz-board"
      style={{ '--bz-board-cols': levels.length } as React.CSSProperties}
    >
      {levels.map((level) => {
        const own = rows.filter((row) => row.subsystem.slug === level.slug)
        const ready = own.filter((row) => row.drawn).length
        /* Computed from the rows on screen, never a typed percentage. `03`
           hardcodes `width:37%` beside a "3 of 8" that would round to 37.5. */
        const filled = Math.round((ready / own.length) * 100)

        return (
          <section
            key={level.slug}
            className="bz-boardcol"
            data-cat={level.slug}
            aria-labelledby={`bz-board-${level.slug}`}
          >
            <header className="bz-boardcol-head">
              <h3 id={`bz-board-${level.slug}`} className="bz-boardcol-title">
                <Link href={level.path} className="bz-boardcol-link">
                  {level.title}
                </Link>
              </h3>
            </header>

            {/* THE RAIL CARRIES THE COUNT NOW, and that is why it stopped being
                `aria-hidden`. It used to restate a sentence printed above it —
                `8 modules · 8 ready` — so hiding it from assistive software was
                right: the same fact twice is worse than once. With the sentence
                gone the rail is the only thing that states how much of the
                level is written, so it takes a role and a name, and the fact
                reaches a screen reader without reaching the screen. */}
            <div
              className="bz-track"
              role="img"
              aria-label={`${ready} of ${own.length} written`}
            >
              <i style={{ width: `${filled}%` }} />
            </div>

            <ol className="bz-boardcol-list">
              {own.map((row) => (
                <li
                  key={row.slug}
                  className="bz-boardcol-item"
                  data-drawn={row.drawn ? 'true' : 'false'}
                >
                  <Link href={row.path} className="bz-boardcol-mod">
                    <span className="bz-boardcol-num">{row.number}</span>
                    {/* The title in an element of its own. `03` leaves it a
                        bare text node beside `.num`, which costs nothing to
                        draw and everything to read: the link's text then reads
                        "19Advanced UIPlanned", and the three views stop being
                        comparable to each other by name. A span changes no
                        geometry and gives the module's name one home. */}
                    <span className="bz-boardcol-name">{row.title}</span>
                    {/* One spelling of this status, everywhere: the table, the
                        card, the board, the path step and the diagram all say
                        `Planned`. */}
                    {!row.drawn && <span className="bz-boardcol-planned">Planned</span>}
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )
      })}
    </div>
  )
}
