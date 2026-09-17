import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MovedTo } from '@/components/shell/MovedTo'
import { PageShell } from '@/components/shell/PageShell'
import { CATEGORIES, categoryBySlug } from '@/lib/content/curriculum-file'
import { levelRoute } from '@/lib/route-labels'

interface RouteParams {
  category: string
}

export function generateStaticParams(): RouteParams[] {
  return CATEGORIES.map((category) => ({ category: category.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>
}): Promise<Metadata> {
  const category = categoryBySlug((await params).category)
  if (!category) return {}

  return {
    title: category.title,
    description: `${category.title} is part of the catalog now. This page forwards there.`,
    // A redirect a search engine indexes is a search result that spends a
    // reader's click on a page with no content.
    robots: { index: false, follow: true },
  }
}

/**
 * M17 — `/courses/<level>/` folded into `/sheets/<level>/`, and this is the
 * forward.
 *
 * Everything that was here is there: the header band, the level's blurb, the
 * meter, the index table with its topics column, and the level's own README
 * under `General notes`. What is there in addition is the rest of the catalog —
 * the other two views, the state filter, and five chips to the other levels.
 *
 * **Six stubs and not one.** A level is a real address a reader may have
 * bookmarked, and `generateStaticParams` is what makes each of the six forward
 * to its own destination rather than dumping all six on the catalog's front
 * page. A fold that loses which level you asked for is a fold that costs the
 * reader the click it was supposed to save.
 *
 * The module route below this one does not move: a module is still
 * `/courses/<level>/<module>/`.
 */
export default async function CategoryMoved({
  params,
}: {
  params: Promise<RouteParams>
}) {
  const category = categoryBySlug((await params).category)
  if (!category) notFound()

  return (
    <PageShell>
      <MovedTo
        to={levelRoute(category.slug)}
        name={category.title}
        what={`The ${category.title} level`}
      />
    </PageShell>
  )
}
