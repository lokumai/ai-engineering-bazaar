import type { CategorySlug } from './categories'

/**
 * `harness_engineering` -> `harness-engineering`.
 *
 * The URL slug comes from the module's NAME, which is what `curriculum.yaml`
 * lists and what the file is called. It never came from the number: modules
 * have been renumbered twice already (once when a landscape sheet was split out
 * of the coding-agents module, again when it was dropped), so a number is a
 * position and the name is the identity. This used to take a filename and strip
 * the numeric prefix off it, which was the same rule reached by parsing.
 */
export function moduleSlugFromName(name: string): string {
  if (name === '') throw new Error('A module name cannot be empty')
  return name.replaceAll('_', '-')
}

export function fullSlug(category: CategorySlug, moduleSlug: string): string {
  return `${category}/${moduleSlug}`
}
