import { readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  WITHOUT_A_PAGE,
  NOT_FOUND_SEGMENT,
  NOT_FOUND_TITLE,
  breadcrumbFor,
} from '@/lib/route-labels'

/**
 * The subsystem labels, as a page hands them in. Written out here rather than
 * read from the curriculum on purpose: this file tests that a label comes from
 * the map it is given and not from the URL segment, and reading the real map
 * would make the two indistinguishable.
 */
const CATEGORIES = [
  { slug: 'fundamentals', title: 'Fundamentals', order: 1, total: 1 },
  { slug: 'intermediate', title: 'Intermediate', order: 2, total: 1 },
  { slug: 'expert', title: 'Expert', order: 3, total: 1 },
  { slug: 'ecosystem', title: 'Ecosystem', order: 4, total: 1 },
  { slug: 'protocols', title: 'Protocols & Specs', order: 5, total: 1 },
  { slug: 'optional', title: 'Optional', order: 6, total: 1 },
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

  it('names the curriculum, which is a page and not a bare URL segment', () => {
    expect(breadcrumbFor('/courses/', CATEGORIES)).toEqual([
      { label: 'Home', href: '/' },
      { label: 'Curriculum', href: null },
    ])
  })

  /**
   * M17 — both parents are still trailed and **neither is at the address the
   * URL says**. `/courses/` and `/courses/<level>/` are forwarding stubs, so a
   * trail that used the module's own path for its ancestors would spend a
   * redirect on every crumb, on every module page, with nothing failing: the
   * link gate follows an href to a document and both documents exist.
   *
   * The label moves with the href. A crumb reading `Curriculum` and opening
   * the catalog is the defect `INDEX_ROUTE`'s docblock records.
   */
  it('trails the real module route through both of its parents', () => {
    expect(breadcrumbFor('/courses/intermediate/security/', CATEGORIES)).toEqual([
      { label: 'Home', href: '/' },
      { label: 'Catalog', href: '/sheets/' },
      { label: 'Intermediate', href: '/sheets/intermediate/' },
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
        { label: 'Curriculum', href: null },
      ])
    }
  })
})

describe('an ancestor segment with no page of its own (§15.1)', () => {

  /* M17 — the ancestor does still have a page and it is a FORWARD, so the
     crumb opens what that forward opens. A trail whose every ancestor costs a
     redirect is the defect `retargetCourseAncestors` exists for, and this is
     the level stub's half of it. */
  it('still links an ancestor that does have a page', () => {
    const crumbs = breadcrumbFor('/courses/fundamentals/', CATEGORIES)
    expect(crumbs[1]).toEqual({ label: 'Catalog', href: '/sheets/' })
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
    expect(exported.has('/profile/')).toBe(true)

    for (const claimed of WITHOUT_A_PAGE) {
      expect(exported.has(claimed), `${claimed} has a page, so the crumb should link`).toBe(false)
    }
  })
})
