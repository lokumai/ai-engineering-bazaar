import type { CategorySlug } from './categories'

const FILENAME = /^(\d+)_(.+)\.md$/

/**
 * `11_harness_engineering.md` -> `harness-engineering`.
 * The number is dropped on purpose: modules have been renumbered twice already
 * (once when a landscape sheet was split out of the coding-agents module, again
 * when it was dropped), so a number is not a stable identifier. The name is.
 */
export function moduleSlugFromFilename(filename: string): string {
  const match = FILENAME.exec(filename)
  if (!match) {
    throw new Error(`Module filename must have a numeric prefix: ${filename}`)
  }
  return match[2].replaceAll('_', '-')
}

export function fullSlug(category: CategorySlug, moduleSlug: string): string {
  return `${category}/${moduleSlug}`
}
