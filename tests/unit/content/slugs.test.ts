import { describe, expect, it } from 'vitest'
import { CATEGORY_SLUGS } from '@/lib/content/categories'
import { CATEGORIES, categoryByDir, categoryBySlug } from '@/lib/content/curriculum-file'
import { fullSlug, moduleSlugFromName } from '@/lib/content/slugs'

describe('moduleSlugFromName', () => {
  it('converts underscores to hyphens', () => {
    expect(moduleSlugFromName('multi_agent')).toBe('multi-agent')
  })

  it('leaves a single-word name alone', () => {
    expect(moduleSlugFromName('llms')).toBe('llms')
  })

  it('converts every underscore, not only the first', () => {
    expect(moduleSlugFromName('advanced_context_engineering'))
      .toBe('advanced-context-engineering')
  })

  it('rejects an empty name', () => {
    expect(() => moduleSlugFromName('')).toThrow(/cannot be empty/)
  })
})

describe('fullSlug', () => {
  it('joins category and module with a slash', () => {
    expect(fullSlug('fundamentals', 'llms')).toBe('fundamentals/llms')
  })
})

describe('CATEGORIES', () => {
  it('covers every slug the app has a type for', () => {
    expect(CATEGORIES.map((c) => c.slug)).toEqual([...CATEGORY_SLUGS])
  })

  it('numbers the categories from one, in file order', () => {
    expect(CATEGORIES.map((c) => c.order)).toEqual(CATEGORIES.map((_, i) => i + 1))
  })

  it('maps a directory name to its category, and back', () => {
    for (const category of CATEGORIES) {
      expect(categoryByDir(category.dir)?.slug).toBe(category.slug)
      expect(categoryBySlug(category.slug)?.dir).toBe(category.dir)
    }
  })

  it('returns undefined for an unknown directory', () => {
    expect(categoryByDir('9_nonexistent')).toBeUndefined()
  })
})
