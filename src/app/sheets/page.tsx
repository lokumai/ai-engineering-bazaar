import type { Metadata } from 'next'
import { Catalog } from '@/components/catalog/Catalog'
import { SignOffMarks } from '@/components/record/SignOffMarks'
import { PageShell } from '@/components/shell/PageShell'
import { curriculumFacts } from '@/lib/content/facts'
import { sheetRows } from '@/lib/content/manifest'

export const metadata: Metadata = {
  title: 'Catalog',
  description:
    'Every module in the course, in three views over one list: the levels in '
    + 'order, a card for each module, or every column at once. Filter by level, '
    + 'by state or by language.',
}

/**
 * M12 / D13 — the catalog. One route, three views, filters at the top.
 *
 * ## What this page is, after M12
 *
 * It was the "index sheet": one flat table in module order with the filter
 * chips *below* it, and a second block of level links under that. The author
 * asked for all three of the catalog alternatives behind a toggle rather than
 * one of them, so the page is now a thin server shell around one client island:
 * this file measures the corpus and hands `Catalog` the rows, and `Catalog`
 * renders the filters, the toggle and all three views over that one array.
 *
 * **The level blocks that used to sit under the table are gone, and nothing was
 * lost.** They were a second, shorter rendering of the same grouping the
 * Overview view now IS. Two renderings of one grouping on one page is the drift
 * D13 spends its whole cost paragraph bounding.
 *
 * ## Why the shell is this thin
 *
 * §12.2's import rule: `lib/content/*` reaches `node:fs`, so a client island
 * may never import it and every build-time fact has to cross the boundary as
 * serialised props. `sheetRows()` is that measurement, taken once here, and it
 * is the ONE data source D13 requires — the three views are three renderings of
 * the array this page hands down, so a curriculum change reaches all three or
 * none, and no view can carry a fact the others do not have.
 *
 * `SignOffMarks` stays, and stays at document level: the table view's ninth
 * column draws its squares unsigned, because that is the only thing a page
 * prerendered once for everybody can truthfully say about a reader it has never
 * met, and one island per document fills them from this browser's record after
 * mount (§12.2 channel B). It is mounted from the page rather than from a row
 * so that every row stays hook-free.
 *
 * What the page still refuses is unchanged: no percentage (§11.35), no fourth
 * progress surface (§11.38), and no number that was not measured from the
 * corpus (§11.25). The eyebrow of counts that used to sit above the title went
 * with the ALL-CAPS meta strip `kia-context/specs/DESIGN.md` names as a tell;
 * every count it carried is in the Overview view's own bands, beside the
 * modules it counts.
 */
export default function CatalogPage() {
  const rows = sheetRows()

  return (
    <PageShell column={false}>
      <h1 className="bz-display">Catalog</h1>

      {/* NO OPENING PARAGRAPH. It explained the three views, the two filters
          and the fact that a choice is remembered — to a reader looking
          straight at the toggle, the chips, and the view they were last in.
          The controls say all three by being controls. */}

      <Catalog rows={rows} label="The catalog" />

      {/* §12.2 — one island per document, mounted from the page rather than
          from the row, so that every row stays hook-free and the server-only
          listing pages keep rendering the identical components. */}
      <SignOffMarks facts={curriculumFacts()} />
    </PageShell>
  )
}
