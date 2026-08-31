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

  it('names the drawing set, which is a page and not a bare URL segment', () => {
    expect(breadcrumbFor('/courses/')).toEqual([
      { label: 'Index', href: '/' },
      { label: 'Drawing set', href: null },
    ])
  })

  it('trails the real module route through both of its parents', () => {
    expect(breadcrumbFor('/courses/intermediate/security/')).toEqual([
      { label: 'Index', href: '/' },
      { label: 'Drawing set', href: '/courses/' },
      { label: 'Intermediate', href: '/courses/intermediate/' },
      { label: 'security', href: null },
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

  it('names the drawing set', () => {
    expect(sheetLabelFor('/courses/')).toBe('DRAWING SET')
  })

  it('numbers a subsystem at the route the site actually serves it from', () => {
    expect(sheetLabelFor('/courses/fundamentals/')).toBe('SUBSYSTEM 01')
    expect(sheetLabelFor('/courses/protocols/')).toBe('SUBSYSTEM 05')
  })

  it('still returns nothing for a module page under that route', () => {
    expect(sheetLabelFor('/courses/intermediate/security/')).toBeNull()
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
