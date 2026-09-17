import type { Metadata } from 'next'
import { MovedTo } from '@/components/shell/MovedTo'
import { PageShell } from '@/components/shell/PageShell'
import { INDEX_ROUTE, INDEX_TITLE } from '@/lib/route-labels'

export const metadata: Metadata = {
  title: 'Curriculum',
  description: 'The curriculum is the catalog now. This page forwards there.',
  // A redirect a search engine indexes is a search result that spends a
  // reader's click on a page with no content.
  robots: { index: false, follow: true },
}

/**
 * M17 — `/courses/` folded into the catalog, and this is the forward.
 *
 * Everything that was here is on `/sheets/`, and more of it. This page was the
 * thirty-three modules under six band headers with a topics column; the catalog
 * is the same thirty-three rows with the same topics column, plus two other
 * renderings of them and two filters. The one thing the catalog could not do
 * was print the topics, and M17's deliverable 4 is that it now does — which is
 * what makes this a fold rather than a deletion.
 *
 * **The module route did not move.** A module is still
 * `/courses/<level>/<module>/`, so this segment still has a page tree under it;
 * only the two index pages in it were retired. Nobody's bookmark to a module
 * broke, and that was a condition of the milestone rather than a happy result.
 *
 * The set eyebrow this page carried — `33 modules · 19 ready · ~14 h` — has no
 * home on the catalog, because the catalog deliberately dropped its own eyebrow
 * in M12 and every count it held is in the Overview view's bands, beside the
 * modules being counted. The one figure not in those bands is the whole set's
 * declared reading time; the six level pages each state their own.
 *
 * `MovedTo` carries how a redirect ships in a static export.
 */
export default function CurriculumMoved() {
  return (
    <PageShell>
      <MovedTo to={INDEX_ROUTE} name={INDEX_TITLE} what="The curriculum" />
    </PageShell>
  )
}
