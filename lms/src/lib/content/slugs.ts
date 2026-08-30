import type { CategorySlug } from './categories'

const FILENAME = /^(\d+)_(.+)\.md$/

/**
 * `10_coding_agents_landscape.md` -> `coding-agents-landscape`.
 * The number is dropped on purpose: modules have been renumbered before
 * (module 10 was split out of the old coding-agents module), so a number is
 * not a stable identifier. The name is.
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
