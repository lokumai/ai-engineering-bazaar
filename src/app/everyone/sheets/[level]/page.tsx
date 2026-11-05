import type { Metadata } from 'next'
import { LevelCatalog } from '@/components/catalog/LevelCatalog'
import { CATEGORIES, categoryBySlug } from '@/lib/content/curriculum-file'

interface RouteParams {
  level: string
}

/** D91 — one level of the For Everyone catalog, for every level. */
export function generateStaticParams(): RouteParams[] {
  return CATEGORIES.map((category) => ({ level: category.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>
}): Promise<Metadata> {
  const category = categoryBySlug((await params).level)
  if (!category) return {}
  return { title: `${category.title}, For Everyone`, description: category.blurb }
}

export default async function EveryoneLevelPage({
  params,
}: {
  params: Promise<RouteParams>
}) {
  return <LevelCatalog level={(await params).level} track="everyone" />
}
