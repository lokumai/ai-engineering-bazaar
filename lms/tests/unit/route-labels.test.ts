import { describe, expect, it } from 'vitest'
import { breadcrumbFor, markTokens, sheetLabelFor } from '@/lib/route-labels'

describe('breadcrumbFor', () => {
  it('shows the index as the current page at the root', () => {
    expect(breadcrumbFor('/')).toEqual([{ label: 'Index', href: null }])
  })

  it('tolerates a pathname with no trailing slash', () => {
    expect(breadcrumbFor('')).toEqual([{ label: 'Index', href: null }])
  })

  it('names a category from the category map, not from the slug', () => {
    expect(breadcrumbFor('/protocols/')).toEqual([
      { label: 'Index', href: '/' },
      { label: 'Protocols & Specs', href: null },
    ])
  })

  it('links back through the category on a module page', () => {
    expect(breadcrumbFor('/intermediate/ai-security/')).toEqual([
      { label: 'Index', href: '/' },
      { label: 'Intermediate', href: '/intermediate/' },
      { label: 'ai security', href: null },
    ])
  })

  it('labels a non-category page from its own segment', () => {
    expect(breadcrumbFor('/dashboard/')).toEqual([
      { label: 'Index', href: '/' },
      { label: 'dashboard', href: null },
    ])
  })
})

describe('sheetLabelFor', () => {
  it('names the index sheet', () => {
    expect(sheetLabelFor('/')).toBe('INDEX SHEET')
  })

  it('numbers a category by its position in the drawing set', () => {
    expect(sheetLabelFor('/fundamentals/')).toBe('SUBSYSTEM 01')
    expect(sheetLabelFor('/expert/')).toBe('SUBSYSTEM 03')
  })

  it('names other top-level pages after themselves', () => {
    expect(sheetLabelFor('/dashboard/')).toBe('DASHBOARD')
  })

  it('returns nothing for a module page, whose sheet number comes from content', () => {
    expect(sheetLabelFor('/intermediate/ai-security/')).toBeNull()
  })
})

describe('markTokens', () => {
  it('separates the machine-derived values from the label words', () => {
    expect(markTokens('SHEET 13 OF 32')).toEqual([
      { text: 'SHEET ', value: false },
      { text: '13', value: true },
      { text: ' OF ', value: false },
      { text: '32', value: true },
    ])
  })

  it('keeps a value that carries punctuation in one piece', () => {
    expect(markTokens('SHEETS 11/32')).toEqual([
      { text: 'SHEETS ', value: false },
      { text: '11/32', value: true },
    ])
  })

  it('returns a label with no values as a single word token', () => {
    expect(markTokens('INDEX SHEET')).toEqual([{ text: 'INDEX SHEET', value: false }])
  })

  it('returns nothing for an empty label', () => {
    expect(markTokens('')).toEqual([])
  })
})
