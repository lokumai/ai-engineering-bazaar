import type { MetadataRoute } from 'next'
import { indexablePages, sitemapEntry } from '@/lib/content/seo'

/**
 * `/sitemap.xml`, built from the content (`lib/content/seo.ts`): every indexable
 * page once per language it is written in, each with the full set of its language
 * versions as `xhtml:link` alternates. `force-static` because the export has no
 * server to answer it.
 */
export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  return indexablePages().map(sitemapEntry)
}
