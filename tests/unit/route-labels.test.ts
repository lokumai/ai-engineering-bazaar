import { readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  WITHOUT_A_PAGE,
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
    expect(breadcrumbFor('/', CATEGORIES)).toEqual([{ label: 'Home', href: null }])
  })

  it('tolerates a pathname with no trailing slash', () => {
    expect(breadcrumbFor('', CATEGORIES)).toEqual([{ label: 'Home', href: null }])
  })

  it('names a category from the category map, not from the slug', () => {
    expect(breadcrumbFor('/protocols/', CATEGORIES)).toEqual([
      { label: 'Home', href: '/' },
      { label: 'Protocols & Specs', href: null },
    ])
  })

  it('links back through the category on a module page', () => {
    expect(breadcrumbFor('/intermediate/ai-security/', CATEGORIES)).toEqual([
      { label: 'Home', href: '/' },
      { label: 'Intermediate', href: '/intermediate/' },
      { label: 'ai security', href: null },
    ])
  })

  it('labels a non-category page from its own segment', () => {
    expect(breadcrumbFor('/dashboard/', CATEGORIES)).toEqual([
      { label: 'Home', href: '/' },
      { label: 'dashboard', href: null },
    ])
  })

  it('names the drawing set, which is a page and not a bare URL segment', () => {
    expect(breadcrumbFor('/courses/', CATEGORIES)).toEqual([
      { label: 'Home', href: '/' },
      { label: 'Drawing set', href: null },
    ])
  })

  it('trails the real module route through both of its parents', () => {
    expect(breadcrumbFor('/courses/intermediate/security/', CATEGORIES)).toEqual([
      { label: 'Home', href: '/' },
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
      { label: 'Home', href: '/' },
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
        { label: 'Home', href: '/' },
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
    expect(sheetLabelFor('/', CATEGORIES)).toBe('HOME')
    // §15.1 — the register moved, and its label went with it.
    expect(sheetLabelFor('/sheets/', CATEGORIES)).toBe('SHEET INDEX')
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

describe('an ancestor segment with no page of its own (§15.1)', () => {
  /**
   * MEASURED by `scripts/check-links-out.mjs` on its first run: exactly one
   * internal link in the export resolved to nothing — `/auth/`, the crumb above
   * a reader mid-sign-in. `/auth/` is a directory holding `callback/` and was
   * never exported as a page, and the trail linked every ancestor.
   *
   * The cases below assert the trail. They are not a guard on the set: they
   * expect `href: null`, which is what a stale entry also produces, so they
   * stay green in exactly the direction that hurts a reader — a page added at
   * `/auth/` and this set not updated. `WITHOUT_A_PAGE` is guarded by the
   * router-tree case that follows them, which reads the filesystem instead.
   */
  it('names the segment but does not link it', () => {
    expect(breadcrumbFor('/auth/callback/', CATEGORIES)).toEqual([
      { label: 'Home', href: '/' },
      { label: 'auth', href: null },
      { label: 'callback', href: null },
    ])
  })

  it('still links an ancestor that does have a page', () => {
    const crumbs = breadcrumbFor('/courses/fundamentals/', CATEGORIES)
    expect(crumbs[1]).toEqual({ label: 'Drawing set', href: '/courses/' })
  })

  /**
   * The guard the docblock on `WITHOUT_A_PAGE` names, and the reason the set is
   * exported. Every entry is a claim about the router tree — "no document is
   * exported here" — and neither the link gate nor a `breadcrumbFor` assertion
   * can check it: an un-linked crumb emits no href, so the export carries no
   * evidence either way, and a trail assertion agrees with whatever the set
   * happens to say. So this reads `src/app` directly.
   *
   * Route groups are stripped, because `(group)` is a directory that adds no
   * URL segment: a page at `src/app/(shell)/auth/page.tsx` serves `/auth/` and
   * would otherwise slip past.
   */
  it('holds no path that the router actually exports a page for', () => {
    const APP = path.resolve(process.cwd(), 'src/app')

    const routes = (dir: string, url: string): string[] => {
      const out: string[] = []
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          // A route group contributes no URL segment; `_private` contributes no route.
          if (entry.name.startsWith('_')) continue
          const grouped = entry.name.startsWith('(') && entry.name.endsWith(')')
          out.push(...routes(path.join(dir, entry.name), grouped ? url : `${url}${entry.name}/`))
        } else if (/^page\.tsx?$/.test(entry.name)) {
          out.push(url)
        }
      }
      return out
    }

    const exported = new Set(routes(APP, '/'))
    // The walk has to be finding something, or the assertion below is vacuous.
    expect(exported.has('/')).toBe(true)
    expect(exported.has('/auth/callback/')).toBe(true)

    for (const claimed of WITHOUT_A_PAGE) {
      expect(exported.has(claimed), `${claimed} has a page, so the crumb should link`).toBe(false)
    }
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
    // A label the site actually prints. `INDEX SHEET` stood here until §15.1
    // moved the register: `sheetLabelFor` returns `HOME` and `SHEET INDEX`
    // today and nothing anywhere renders the old string, so the case was
    // tokenising a fixture rather than a label.
    expect(sheetLabelFor('/sheets/', CATEGORIES)).toBe('SHEET INDEX')
    expect(markTokens('SHEET INDEX')).toEqual([{ text: 'SHEET INDEX', value: false }])
  })

  it('returns nothing for an empty label', () => {
    expect(markTokens('')).toEqual([])
  })
})
