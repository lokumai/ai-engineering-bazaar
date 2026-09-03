import { CATEGORIES } from './curriculum-file'
import type { CategoryLabel } from '@/lib/route-labels'

/**
 * The subsystem labels the shell needs, measured from `curriculum.yaml`.
 *
 * §12.2's boundary, in one function. `route-labels.ts` is a leaf that imports
 * nothing, because two client islands call it; the titles and positions it
 * needs live in the yaml, which only `node:fs` can read. So the server parents
 * of those islands call this and hand the result down as serialised props, the
 * same arrangement `curriculumFacts()` has with the record.
 *
 * It is a projection and not the whole `Category`: the blurb, the status and
 * the module list have no business in a breadcrumb, and a page is not a good
 * place to decide what to leave out.
 */
export function categoryLabels(): readonly CategoryLabel[] {
  return CATEGORIES.map((category) => ({
    slug: category.slug,
    title: category.title,
    order: category.order,
  }))
}
