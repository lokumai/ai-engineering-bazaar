import { CategoryBlock } from '@/components/sheet/CategoryBlock'
import { SheetFilters } from '@/components/sheet/SheetFilters'
import { ticksFrom } from '@/components/sheet/TickGauge'
import { categoryRows, indexStatement, sheetRows, subsystems } from '@/lib/content/manifest'
import { SITE_NAME } from '@/lib/site'

/**
 * §4.8 — the index sheet.
 *
 * No hero. No gradient. No "Get started" button (§11.3). The page opens with
 * its title, four lines of fact, a structural rule, and then the manifest —
 * all thirty-two sheets, immediately, with no filters above the fold.
 *
 * Everything the page says about the set is measured from the set: the counts
 * in the statement are spelled out from `setSummary()`, not typed; each row's
 * extent, sources and language coverage come off the file; the seventeen
 * sheets that are not drawn carry an ISO 128 hidden line down the `#` cell and
 * the words `NOT DRAWN` beside a dashed tick. Nothing on this page is a claim
 * about the reader, because there is no reader state to claim: no percentage,
 * no "continue where you left off", no completion tick, and no `SIGN-OFF`
 * column of squares that can never fill (§1, §5.9).
 *
 * The 56px `text-index` step is used here, once, on the h1 — and nowhere else
 * on the site (§3.2).
 */
export default function IndexSheet() {
  const rows = sheetRows()

  return (
    <>
      <h1 className="hl-index-title">{SITE_NAME}</h1>

      <div className="hl-statement">
        {indexStatement().map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <hr className="hl-rule-struct" aria-hidden="true" />

      <SheetFilters rows={rows} label="The drawing set, every sheet" />

      {/* §5.4 calls this block "the category link on the index", and this is
          where it lives: below the manifest, because a set's index is its
          sheets and the subsystems are how they group. Each block states its
          own coverage in ticks — one per sheet, dashed where the geometry is
          not yet drawn. */}
      <section className="hl-subsystems" aria-labelledby="subsystems">
        <h2 id="subsystems" className="hl-mark hl-subsystems-head">
          Subsystems
        </h2>
        <ul className="hl-subsystem-list">
          {subsystems().map(({ category, path }) => (
            <li key={category.slug}>
              <CategoryBlock
                order={category.order}
                title={category.title}
                path={path}
                ticks={ticksFrom(categoryRows(category))}
              />
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
