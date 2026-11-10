import type { Metadata } from 'next'
import { MovedTo } from '@/components/shell/MovedTo'
import { canonicalOf } from '@/lib/content/seo'
import { PageShell } from '@/components/shell/PageShell'

/**
 * D94 — the page an address the curriculum retired still serves: a forward to
 * where its level or module answers now (`src/lib/content/moved.ts`). A search
 * engine indexes the destination, not the forward.
 */
export function movedMetadata(name: string, to: string): Metadata {
  return {
    title: name,
    description: `${name} has moved. This page forwards there.`,
    robots: { index: false, follow: true },
    // The forward names its destination as the page that counts, so what a crawler
    // already knows of the old address moves there (D119).
    alternates: canonicalOf(to),
  }
}

export function MovedPage({ to, name, what }: { to: string; name: string; what: string }) {
  return (
    <PageShell>
      <MovedTo to={to} name={name} what={what} />
    </PageShell>
  )
}
