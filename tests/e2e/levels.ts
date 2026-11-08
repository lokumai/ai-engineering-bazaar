import { CATEGORIES } from '@/lib/content/curriculum-file'

/**
 * What a level is called on the page, read from the curriculum and never typed out.
 *
 * Two specs matched a level's URL slug against the breadcrumb (`fundamentals`, `trends`),
 * which only held while a level's title was its slug with a capital. It stopped holding the
 * day the fifth level's title became shorter than its address, and a title is a thing the
 * author changes without touching a URL.
 */
export function levelTitleOf(slug: string): string {
  const level = CATEGORIES.find((category) => category.slug === slug)
  if (!level) throw new Error(`no level with the slug "${slug}" in curriculum.yaml`)
  return level.title
}

/** A pattern for the level's title, tolerant of a hyphen for a space and of case. */
export function levelTitlePattern(slug: string): RegExp {
  return new RegExp(levelTitleOf(slug).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[ -]'), 'i')
}
