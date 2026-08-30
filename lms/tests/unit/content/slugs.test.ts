import { describe, expect, it } from 'vitest'
import { CATEGORIES, categoryByDir, categoryBySlug } from '@/lib/content/categories'
import { fullSlug, moduleSlugFromFilename } from '@/lib/content/slugs'

describe('moduleSlugFromFilename', () => {
  it('strips the numeric prefix and the extension', () => {
    expect(moduleSlugFromFilename('1_llms.md')).toBe('llms')
  })

  it('converts underscores to hyphens', () => {
    expect(moduleSlugFromFilename('7_multi_agent.md')).toBe('multi-agent')
  })

  it('handles two-digit module numbers', () => {
    expect(moduleSlugFromFilename('22_advanced_context_engineering.md'))
      .toBe('advanced-context-engineering')
  })

  it('rejects a filename without a numeric prefix', () => {
    expect(() => moduleSlugFromFilename('README.md')).toThrow(/numeric prefix/)
  })
})

describe('fullSlug', () => {
  it('joins category and module with a slash', () => {
    expect(fullSlug('fundamentals', 'llms')).toBe('fundamentals/llms')
  })
})

describe('CATEGORIES', () => {
  it('covers all six content directories', () => {
    expect(CATEGORIES).toHaveLength(6)
  })

  it('is ordered by the curriculum sequence', () => {
    expect(CATEGORIES.map((c) => c.slug)).toEqual([
      'fundamentals', 'intermediate', 'expert', 'ecosystem', 'protocols', 'optional',
    ])
  })

  it('maps a directory name to its category', () => {
    expect(categoryByDir('5_protocols_specs')?.slug).toBe('protocols')
  })

  it('maps a slug back to its category', () => {
    expect(categoryBySlug('protocols')?.dir).toBe('5_protocols_specs')
  })

  it('returns undefined for an unknown directory', () => {
    expect(categoryByDir('9_nonexistent')).toBeUndefined()
  })
})
