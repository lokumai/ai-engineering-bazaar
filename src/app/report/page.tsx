import type { Metadata } from 'next'
import { MovedTo } from '@/components/shell/MovedTo'
import { PageShell } from '@/components/shell/PageShell'

export const metadata: Metadata = {
  title: 'Your progress',
  description:
    'The record of work is part of Your progress now. This page forwards there.',
  robots: { index: false, follow: true },
}

/**
 * M14 — `/report/` folded into `/profile/`, and this is the forward.
 *
 * The builder itself is unchanged and is the `report` row of that page's
 * register: one self-contained HTML file, built in this browser out of what
 * this browser has recorded, saved to the reader's own disk, and stating in its
 * second block that nobody assessed it and no authority issued it (§12.12.4).
 * What was lost is the route, not the document.
 *
 * `MovedTo` carries how a redirect ships in a static export.
 */
export default function ReportMoved() {
  return (
    <PageShell>
      <MovedTo to="/profile/" name="Your progress" what="The record of work" />
    </PageShell>
  )
}
