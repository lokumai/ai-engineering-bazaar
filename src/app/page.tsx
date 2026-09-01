import { SignOffMarks } from '@/components/record/SignOffMarks'
import { CategoryBlock } from '@/components/sheet/CategoryBlock'
import { SheetFilters } from '@/components/sheet/SheetFilters'
import { PageShell } from '@/components/shell/PageShell'
import { ticksFrom } from '@/components/sheet/TickGauge'
import { curriculumFacts } from '@/lib/content/facts'
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
 * the words `NOT DRAWN` beside a dashed tick.
 *
 * Exactly one column is a claim about the reader — the ninth, `SIGN-OFF`
 * (§12.18) — and the build does not make it. Every square is drawn unsigned,
 * because that is the only thing a page prerendered once for everybody can
 * truthfully say about a reader it has never met; `SignOffMarks` fills them
 * from this browser's record after mount (§12.2 channel B). What the page still
 * refuses is unchanged: no percentage (§11.35), no fourth progress surface
 * (§11.38), and no number that was not measured from the corpus (§11.25).
 *
 * The 56px `text-index` step is used here, once, on the h1 — and nowhere else
 * on the site (§3.2).
 */
export default function IndexSheet() {
  const rows = sheetRows()

  return (
    <PageShell>
      <h1 className="hl-index-title">{SITE_NAME}</h1>

      <div className="hl-statement">
        {indexStatement().map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <hr className="hl-rule-struct" aria-hidden="true" />

      <SheetFilters rows={rows} label="The drawing set, every sheet" />

      {/* §12.2 — one island per document, mounted from the page rather than
          from the row, so that thirty-two rows stay hook-free and the
          server-only listing pages keep rendering the identical components. */}
      <SignOffMarks facts={curriculumFacts()} />

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
    </PageShell>
  )
}
