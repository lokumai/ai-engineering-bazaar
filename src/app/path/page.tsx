import type { Metadata } from 'next'
import { MovedTo } from '@/components/shell/MovedTo'
import { PageShell } from '@/components/shell/PageShell'

export const metadata: Metadata = {
  title: 'Your progress',
  description:
    'The learning paths are part of Your progress now. This page forwards there.',
  robots: { index: false, follow: true },
}

/**
 * M14 — `/path/` folded into `/profile/`, and this is the forward.
 *
 * All nine ordered paths are in the `role` row of that page's register, with
 * the role picker under them, and channel A still shows exactly one:
 * `lokum.css` resolves `.hl-path-body[data-role="<id>"]` against the
 * `hl-role-<id>` class the boot script stamps before first paint. The steps,
 * their reasons and the denominator that counts only the ready ones moved
 * verbatim (§13.4.2).
 *
 * It is one row rather than one of its own, because the row that states the
 * reader's role and the list of that role's steps are one subject, and §16.4
 * gives one subject one row.
 *
 * `MovedTo` carries how a redirect ships in a static export.
 */
export default function PathMoved() {
  return (
    <PageShell>
      <MovedTo to="/profile/" name="Your progress" what="The learning path" />
    </PageShell>
  )
}
