import { afterEach, describe, expect, it } from 'vitest'
import { imageBaseFor } from '@/lib/content/images'
import { href } from '@/lib/url'

describe('imageBaseFor', () => {
  const original = process.env.NEXT_PUBLIC_SITE_BASE_PATH
  afterEach(() => { process.env.NEXT_PUBLIC_SITE_BASE_PATH = original })

  it('builds a root-relative path in local development', () => {
    process.env.NEXT_PUBLIC_SITE_BASE_PATH = ''
    expect(imageBaseFor('fundamentals')).toBe('/course-images/fundamentals')
  })

  it('includes the deploy base path so sub-path hosting works', () => {
    process.env.NEXT_PUBLIC_SITE_BASE_PATH = '/ai-engineering-bazaar'
    expect(imageBaseFor('fundamentals'))
      .toBe('/ai-engineering-bazaar/course-images/fundamentals')
  })

  /**
   * An `<img src>` is not a `<Link href>`: the router prefixes the second and
   * not the first, which is the distinction `lib/url.ts` is written down for.
   * This is the site's only non-router URL, so it is the only place that rule
   * can be got wrong — and it was building the prefix inline, which meant the
   * nine tests around `href()` were guarding a function nothing called.
   */
  it('resolves through href(), so the base-path rule lives in one place', () => {
    for (const basePath of ['', '/ai-engineering-bazaar']) {
      process.env.NEXT_PUBLIC_SITE_BASE_PATH = basePath
      expect(imageBaseFor('intermediate'), basePath)
        .toBe(href('/course-images/intermediate'))
    }
  })

  it('prefixes the base path exactly once', () => {
    process.env.NEXT_PUBLIC_SITE_BASE_PATH = '/ai-engineering-bazaar'
    expect(imageBaseFor('expert').match(/\/ai-engineering-bazaar\//g))
      .toHaveLength(1)
  })
})
