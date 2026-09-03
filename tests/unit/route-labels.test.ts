import { describe, expect, it } from 'vitest'
import {
  NOT_FOUND_SEGMENT,
  NOT_FOUND_SHEET_LABEL,
  NOT_FOUND_TITLE,
  breadcrumbFor,
  markTokens,
  sheetLabelFor,
} from '@/lib/route-labels'

/**
 * The subsystem labels, as a page hands them in. Written out here rather than
 * read from the curriculum on purpose: this file tests that a label comes from
 * the map it is given and not from the URL segment, and reading the real map
 * would make the two indistinguishable.
 */
const CATEGORIES = [
  { slug: 'fundamentals', title: 'Fundamentals', order: 1 },
  { slug: 'intermediate', title: 'Intermediate', order: 2 },
  { slug: 'expert', title: 'Expert', order: 3 },
  { slug: 'ecosystem', title: 'Ecosystem', order: 4 },
  { slug: 'protocols', title: 'Protocols & Specs', order: 5 },
  { slug: 'optional', title: 'Optional', order: 6 },
]

describe('breadcrumbFor', () => {
  it('shows the index as the current page at the root', () => {
    expect(breadcrumbFor('/', CATEGORIES)).toEqual([{ label: 'Index', href: null }])
  })

  it('tolerates a pathname with no trailing slash', () => {
    expect(breadcrumbFor('', CATEGORIES)).toEqual([{ label: 'Index', href: null }])
  })

  it('names a category from the category map, not from the slug', () => {
    expect(breadcrumbFor('/protocols/', CATEGORIES)).toEqual([
      { label: 'Index', href: '/' },
      { label: 'Protocols & Specs', href: null },
    ])
  })

  it('links back through the category on a module page', () => {
    expect(breadcrumbFor('/intermediate/ai-security/', CATEGORIES)).toEqual([
      { label: 'Index', href: '/' },
      { label: 'Intermediate', href: '/intermediate/' },
      { label: 'ai security', href: null },
    ])
  })

  it('labels a non-category page from its own segment', () => {
    expect(breadcrumbFor('/dashboard/', CATEGORIES)).toEqual([
      { label: 'Index', href: '/' },
      { label: 'dashboard', href: null },
    ])
  })

  it('names the drawing set, which is a page and not a bare URL segment', () => {
    expect(breadcrumbFor('/courses/', CATEGORIES)).toEqual([
      { label: 'Index', href: '/' },
      { label: 'Drawing set', href: null },
    ])
  })

  it('trails the real module route through both of its parents', () => {
    expect(breadcrumbFor('/courses/intermediate/security/', CATEGORIES)).toEqual([
      { label: 'Index', href: '/' },
      { label: 'Drawing set', href: '/courses/' },
      { label: 'Intermediate', href: '/courses/intermediate/' },
      { label: 'security', href: null },
    ])
  })
})

describe('breadcrumbFor on the not-found route', () => {
  /**
   * The regression this exists for: `404.html` is prerendered once at
   * `/_not-found` and a static host serves it at every address that is not a
   * sheet, so the trail has to come out the same whatever the URL says. It did
   * not — the export read `_NOT FOUND` and the browser `404` — and React
   * answers a text mismatch by re-rendering the document, which threw away
   * §2.5's theme class and left a dark-theme reader on a white 404.
   */
  const urls = ['/_not-found/', '/404/', '/typo/', '/courses/fundamentals/bogus/', '/']

  it('reads the same on every address the document can be served at', () => {
    const trails = urls.map((url) => breadcrumbFor(url, CATEGORIES, NOT_FOUND_SEGMENT))
    for (const trail of trails) expect(trail).toEqual(trails[0])
  })

  it('names the page rather than the URL that was asked for', () => {
    expect(breadcrumbFor('/404/', CATEGORIES, NOT_FOUND_SEGMENT)).toEqual([
      { label: 'Index', href: '/' },
      { label: NOT_FOUND_TITLE, href: null },
    ])
  })

  it('leaks no part of the address into the trail', () => {
    const labels = breadcrumbFor('/courses/fundamentals/bogus/', CATEGORIES, NOT_FOUND_SEGMENT)
      .map((crumb) => crumb.label)
      .join(' ')
    expect(labels).not.toMatch(/bogus|not.?found|404/i)
  })

  it('still links home, which is the one route it can promise exists', () => {
    expect(breadcrumbFor('/404/', CATEGORIES, NOT_FOUND_SEGMENT)[0].href).toBe('/')
  })

  it('leaves every other route to the pathname', () => {
    for (const segment of [null, 'courses', '__PAGE__']) {
      expect(breadcrumbFor('/courses/', CATEGORIES, segment)).toEqual([
        { label: 'Index', href: '/' },
        { label: 'Drawing set', href: null },
      ])
    }
  })
})

describe('NOT_FOUND_SHEET_LABEL', () => {
  it('is the page\'s own name, in the case §3.4 writes chrome labels in', () => {
    expect(NOT_FOUND_SHEET_LABEL).toBe(NOT_FOUND_TITLE.toUpperCase())
  })

  it('carries no machine-derived value, because nothing was counted', () => {
    expect(markTokens(NOT_FOUND_SHEET_LABEL).some((token) => token.value)).toBe(false)
  })
})

describe('sheetLabelFor', () => {
  it('names the index sheet', () => {
    expect(sheetLabelFor('/', CATEGORIES)).toBe('INDEX SHEET')
  })

  it('numbers a category by its position in the drawing set', () => {
    expect(sheetLabelFor('/fundamentals/', CATEGORIES)).toBe('SUBSYSTEM 01')
    expect(sheetLabelFor('/expert/', CATEGORIES)).toBe('SUBSYSTEM 03')
  })

  it('names other top-level pages after themselves', () => {
    expect(sheetLabelFor('/dashboard/', CATEGORIES)).toBe('DASHBOARD')
  })

  it('returns nothing for a module page, whose sheet number comes from content', () => {
    expect(sheetLabelFor('/intermediate/ai-security/', CATEGORIES)).toBeNull()
  })

  it('names the drawing set', () => {
    expect(sheetLabelFor('/courses/', CATEGORIES)).toBe('DRAWING SET')
  })

  it('numbers a subsystem at the route the site actually serves it from', () => {
    expect(sheetLabelFor('/courses/fundamentals/', CATEGORIES)).toBe('SUBSYSTEM 01')
    expect(sheetLabelFor('/courses/protocols/', CATEGORIES)).toBe('SUBSYSTEM 05')
  })

  it('still returns nothing for a module page under that route', () => {
    expect(sheetLabelFor('/courses/intermediate/security/', CATEGORIES)).toBeNull()
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
