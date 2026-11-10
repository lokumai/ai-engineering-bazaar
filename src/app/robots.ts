import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/site'

/** `/robots.txt`: everything is open, and the sitemap says where the pages are. */
export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: absoluteUrl('/sitemap.xml'),
  }
}
