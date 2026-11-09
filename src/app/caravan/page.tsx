import type { Metadata } from 'next'
import Link from 'next/link'
import { PageShell } from '@/components/shell/PageShell'
import { INDEX_ROUTE, INDEX_TITLE } from '@/lib/route-labels'

export const metadata: Metadata = {
  title: 'Caravan',
  description: 'Caravan is under maintenance.',
}

/**
 * Caravan: the trends timeline (M62), a page of its own and not a level.
 *
 * The author, 2026-11-09: in the bar beside Progress, reachable and linkable,
 * with its content under maintenance until the timeline is designed. So the
 * address is real and stable now, and the page says only that it is not ready.
 * Rejected: hiding the entry until the page is built, which would make the
 * address appear later and leave nothing to link to in the meantime.
 */
export default function CaravanPage() {
  return (
    <PageShell sheet={null}>
      <h1 className="bz-display">Caravan</h1>

      <p className="bz-lead">Under maintenance.</p>

      <hr className="bz-rule" aria-hidden="true" />

      <p className="text-mark">
        <Link className="bz-link" href={INDEX_ROUTE}>
          {INDEX_TITLE}
        </Link>
      </p>
    </PageShell>
  )
}
