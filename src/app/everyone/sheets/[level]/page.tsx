import type { Metadata } from 'next'
import { canonicalOf } from '@/lib/content/seo'
import { LevelCatalog } from '@/components/catalog/LevelCatalog'
import { CATEGORIES, categoryBySlug } from '@/lib/content/curriculum-file'
import { MOVED_LEVELS } from '@/lib/content/moved'
import { MovedPage, movedMetadata } from '@/components/shell/Moved'
import { catalogRoute } from '@/lib/tracks'

interface RouteParams {
  level: string
}

/** D91 — one level of the For Everyone catalog, for every level. */
export function generateStaticParams(): RouteParams[] {
  // D94 — and every level the curriculum renamed, at its old slug, as a forward.
  return [...CATEGORIES.map((category) => ({ level: category.slug })), ...Object.keys(MOVED_LEVELS).map((level) => ({ level }))]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>
}): Promise<Metadata> {
  const asked = (await params).level
  if (MOVED_LEVELS[asked]) return movedMetadata(categoryBySlug(MOVED_LEVELS[asked])?.title ?? asked, catalogRoute('everyone', MOVED_LEVELS[asked]))
  const category = categoryBySlug(asked)
  if (!category) return {}
  return {
    title: `${category.title}, For Everyone`,
    description: category.blurb,
    alternates: canonicalOf(catalogRoute('everyone', asked)),
  }
}

export default async function EveryoneLevelPage({
  params,
}: {
  params: Promise<RouteParams>
}) {
  const asked = (await params).level
  const to = MOVED_LEVELS[asked]
  if (to) {
    const title = categoryBySlug(to)?.title ?? to
    return <MovedPage to={catalogRoute('everyone', to)} name={`${title}, For Everyone`} what={`The ${title} level`} />
  }
  return <LevelCatalog level={asked} track="everyone" />
}
