import { href } from '@/lib/url'
import type { CategorySlug } from './categories'

/**
 * Where a module's images are served from.
 *
 * This is the site's only URL the Next router never touches — `rehypeRewriteImages`
 * writes it into an `<img src>` in the rendered HTML — so it is the one caller
 * `lib/url.ts` exists for. It concatenated `NEXT_PUBLIC_SITE_BASE_PATH` itself
 * for a while, which produced the same string but skipped `href()`'s
 * leading-slash normalisation and its already-prefixed guard, and left the nine
 * tests around `href()` guarding a function nothing on the site called.
 */
export function imageBaseFor(category: CategorySlug): string {
  return href(`/course-images/${category}`)
}
