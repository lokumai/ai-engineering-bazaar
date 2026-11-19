import type { Metadata } from 'next'
import { canonicalOf } from '@/lib/content/seo'
import { TransferIsland } from '@/components/transfer/TransferIsland'
import { PageShell } from '@/components/shell/PageShell'

export const metadata: Metadata = {
  title: 'Add progress from a link',
  description: 'Adds progress carried in a link from the Bazaar app to the progress in this browser.',
  alternates: canonicalOf('/transfer/'),
  // D120, D144: the page is empty without a link, and the link is the reader's own progress.
  robots: { index: false, follow: true },
}

/**
 * D144 — where a progress link opens: `/transfer/#t=<payload>`. The prerendered page holds the
 * heading and an island; everything it says about the link is read from the fragment after
 * mount (`TransferIsland`). Not in the bar and not in the sitemap: a reader arrives from a link.
 */
export default function TransferPage() {
  return (
    <PageShell>
      <h1 className="bz-display">Add progress from a link</h1>
      <TransferIsland />
    </PageShell>
  )
}
