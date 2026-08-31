import { describe, expect, it } from 'vitest'
import { curriculum, neighbours, positionOf, sheetCount } from '@/lib/content/curriculum'

describe('curriculum', () => {
  const tracks = curriculum()

  it('returns all six categories in spec order', () => {
    expect(tracks.map((t) => t.category.slug)).toEqual([
      'fundamentals', 'intermediate', 'expert', 'ecosystem', 'protocols', 'optional',
    ])
  })

  it('files every module under exactly one category', () => {
    expect(tracks.reduce((sum, t) => sum + t.modules.length, 0)).toBe(32)
  })

  it('matches Appendix A category sizes', () => {
    expect(tracks.map((t) => t.modules.length)).toEqual([7, 8, 9, 5, 1, 2])
  })

  it('orders modules within a category by module number', () => {
    expect(tracks[1].modules.map((m) => m.frontmatter.module))
      .toEqual([8, 9, 10, 11, 12, 13, 14, 15])
  })
})

describe('sheetCount', () => {
  it('counts the set rather than asserting 32', () => {
    expect(sheetCount()).toBe(32)
  })
})

describe('positionOf', () => {
  it('gives the sheet its place inside its own category', () => {
    expect(positionOf('intermediate/security')).toEqual({ index: 6, of: 8 })
  })

  it('numbers the first sheet of a category 1', () => {
    expect(positionOf('expert/advanced-ui')).toEqual({ index: 1, of: 9 })
  })

  it('returns null for an unknown slug', () => {
    expect(positionOf('nope/nope')).toBeNull()
  })
})

describe('neighbours', () => {
  it('gives no previous for the first sheet of the set', () => {
    expect(neighbours('fundamentals/llms').previous).toBeNull()
  })

  it('walks forward within a category', () => {
    expect(neighbours('fundamentals/rag').next?.frontmatter.module).toBe(4)
  })

  it('links across a category boundary', () => {
    expect(neighbours('fundamentals/multi-agent').next?.frontmatter.module).toBe(8)
  })

  it('links backwards across a category boundary', () => {
    expect(neighbours('expert/advanced-ui').previous?.frontmatter.module).toBe(15)
  })

  it('gives no next for the last sheet of the set', () => {
    expect(neighbours('optional/runtime').next).toBeNull()
  })

  it('returns nulls for an unknown slug', () => {
    expect(neighbours('nope/nope')).toEqual({ previous: null, next: null })
  })

  it('chains all 32 sheets in curriculum order with no gap', () => {
    const seen: number[] = []
    let current = curriculum()[0].modules[0]
    for (;;) {
      seen.push(current.frontmatter.module)
      const next = neighbours(current.slug).next
      if (!next) break
      expect(neighbours(next.slug).previous?.slug).toBe(current.slug)
      current = next
    }
    expect(seen).toEqual(Array.from({ length: 32 }, (_, i) => i + 1))
  })
})
