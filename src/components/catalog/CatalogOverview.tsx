import Link from 'next/link'
import { levelsOf, type SheetRow } from '@/lib/content/rows'
import { plural } from '@/lib/text'

/**
 * M12 / D13 — the OVERVIEW view: the shape of the course, level by level.
 *
 * D13's reason for keeping all three views is that they answer three different
 * questions, and this one answers *what is in this course and in what order*.
 * So it is the only view that groups: one band per level, in curriculum order,
 * each band naming its level, counting its modules and listing every one of
 * them as a link. Nothing here is a fact about the reader.
 *
 * **It renders the rows it is handed and groups nothing else.** The bands come
 * from `levelsOf(rows)`, so a filter that removes every Expert module removes
 * the Expert band with it rather than leaving an empty header — and the three
 * views cannot disagree about which modules exist, because there is one array
 * and each view is a rendering of it (D13's bound on the cost of three views).
 *
 * **A level is told apart four ways, and the hue is only one of them.** Its
 * name, its number, its count, and `data-cat` — which `lokum.css` resolves to
 * the level's own colour on the band's leading rule. Under
 * `forced-colors: active` every hue goes and the other three carry the whole
 * distinction (SC 1.4.1, §13.1.4).
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

  return (
    <div className="hl-ov">
      {levels.map((level) => {
        const own = rows.filter((row) => row.subsystem.slug === level.slug)
        const ready = own.filter((row) => row.drawn).length

        return (
          <section
            key={level.slug}
            className="hl-ov-band"
            data-cat={level.slug}
            aria-labelledby={`hl-ov-${level.slug}`}
          >
            <div className="hl-ov-head">
              <h3 id={`hl-ov-${level.slug}`} className="hl-ov-title">
                <Link href={level.path} className="hl-ov-link">
                  <span className="hl-ov-order">
                    {String(level.order).padStart(2, '0')}
                  </span>
                  {level.title}
                </Link>
              </h3>
              {/* Both counts, always: the denominator is the level and the
                  numerator is what somebody has written. `plural` chooses the
                  word from the number nobody typed (§11.25). */}
              <p className="hl-ov-count">
                {plural(own.length, 'module')} · {ready} ready
              </p>
            </div>

            <ol className="hl-ov-list">
              {own.map((row) => (
                <li key={row.slug} className="hl-ov-item" data-drawn={row.drawn ? 'true' : 'false'}>
                  <span className="hl-ov-num">{row.number}</span>
                  <Link href={row.path} className="hl-ov-mod">
                    {row.title}
                  </Link>
                  {/* One spelling of this status, everywhere (§12.14.1): the
                      table, the card, the overview, the path step and the
                      diagram all say `Planned`. */}
                  {!row.drawn && <span className="hl-ov-planned">Planned</span>}
                </li>
              ))}
            </ol>
          </section>
        )
      })}
    </div>
  )
}
