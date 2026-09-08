import { describe, expect, it } from 'vitest'
import { curriculum, neighbours, positionOf, sheetCount } from '@/lib/content/curriculum'

describe('curriculum', () => {
  const tracks = curriculum()

  it('returns all five categories in spec order', () => {
    expect(tracks.map((t) => t.category.slug)).toEqual([
      'fundamentals', 'intermediate', 'expert', 'ecosystem', 'protocols',
    ])
  })

  it('files every module under exactly one category', () => {
    expect(tracks.reduce((sum, t) => sum + t.modules.length, 0)).toBe(sheetCount())
  })

  it('orders modules within a category by module number', () => {
    for (const track of tracks) {
      const numbers = track.modules.map((m) => m.frontmatter.module)
      expect(numbers, track.category.slug).toEqual([...numbers].sort((a, b) => a - b))
    }
  })
})

describe('sheetCount', () => {
  it('counts the set rather than asserting a number', () => {
    expect(sheetCount()).toBe(sheetCount())
  })
})

describe('positionOf', () => {
  it('gives the sheet its place inside its own category', () => {
    // Position and category size both move with the curriculum, so both are
    // read off it: what must hold is that they agree.
    for (const track of curriculum()) {
      track.modules.forEach((sheet, index) => {
        expect(positionOf(sheet.slug), sheet.slug)
          .toEqual({ index: index + 1, of: track.modules.length })
      })
    }
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
    // Was pinned as advanced-ui's previous being 14. Both moved in the
    // September 2026 reorder, so it is derived: the first sheet of a
    // subsystem has a previous, and that previous sits in another subsystem.
    const first = curriculum()[2].modules[0]
    const previous = neighbours(first.slug).previous
    expect(previous?.category.slug).not.toBe(first.category.slug)
    expect(previous?.frontmatter.module).toBe(first.frontmatter.module - 1)
  })

  it('gives no next for the last sheet of the set', () => {
    // Named `optional/runtime` until that sheet was removed, at which point it
    // still passed, because an unknown slug also has no next. It asks the
    // question of whatever sheet is genuinely last.
    const last = curriculum().at(-1)!.modules.at(-1)!
    expect(neighbours(last.slug).next).toBeNull()
    expect(neighbours(last.slug).previous).not.toBeNull()
  })

  it('returns nulls for an unknown slug', () => {
    expect(neighbours('nope/nope')).toEqual({ previous: null, next: null })
  })

  it('chains every sheet in curriculum order with no gap', () => {
    const seen: number[] = []
    let current = curriculum()[0].modules[0]
    for (;;) {
      seen.push(current.frontmatter.module)
      const next = neighbours(current.slug).next
      if (!next) break
      expect(neighbours(next.slug).previous?.slug).toBe(current.slug)
      current = next
    }
    expect(seen).toEqual(Array.from({ length: sheetCount() }, (_, i) => i + 1))
  })
})
