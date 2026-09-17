import type { Metadata } from 'next'
import { MovedTo } from '@/components/shell/MovedTo'
import { PageShell } from '@/components/shell/PageShell'

export const metadata: Metadata = {
  title: 'Your progress',
  description:
    'The dashboard is part of Your progress now. This page forwards there.',
  // A redirect a search engine indexes is a search result that spends a
  // reader's click on a page with no content.
  robots: { index: false, follow: true },
}

/**
 * M14 — `/dashboard/` folded into `/profile/`, and this is the forward.
 *
 * Everything that was here is on that page: the attention list is the panel
 * above completion control C, the readout strip and the face legend are the
 * `readout` row, the meters are control C itself, the streak and the stamps
 * have a row each, and the single-line curriculum diagram — with the `TRACES`
 * cell only this surface could ever fill — is the `diagram` row.
 *
 * Two things that were on this page are NOT on the new one, and both are
 * deletions rather than moves. The XP ceiling line (`2,440 attainable today`)
 * went with O2: nobody could name the question XP answered, so no surface
 * prints it any more (`lib/record/derive.ts`, D22). And `ContinueLine` is on
 * the home page, where a reader who wants the next module is already looking.
 *
 * `MovedTo` carries how a redirect ships in a static export.
 */
export default function DashboardMoved() {
  return (
    <PageShell>
      <MovedTo to="/profile/" name="Your progress" what="The dashboard" />
    </PageShell>
  )
}
