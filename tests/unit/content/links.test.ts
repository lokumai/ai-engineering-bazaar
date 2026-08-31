import { afterEach, describe, expect, it } from 'vitest'
import { courseLinkFor, isCourseLink, sheetSource } from '@/lib/content/links'

/**
 * The corpus' own cross-references, as routes.
 *
 * The resolver is checked against the real corpus rather than a fixture, because
 * the corpus is what it validates against: a module route exists exactly when
 * the loader loaded the file. Every href below is one the corpus actually
 * writes, except the two invented dead ones — which is the point of them.
 */

const HARNESS = '2_intermediate/12_harness_engineering.md'

describe('courseLinkFor', () => {
  const original = process.env.NEXT_PUBLIC_SITE_BASE_PATH
  afterEach(() => { process.env.NEXT_PUBLIC_SITE_BASE_PATH = original })

  it('resolves a link inside the same category directory', () => {
    process.env.NEXT_PUBLIC_SITE_BASE_PATH = ''
    expect(courseLinkFor('13_security.md', HARNESS))
      .toBe('/courses/intermediate/security/')
  })

  it('resolves a link into another category directory', () => {
    process.env.NEXT_PUBLIC_SITE_BASE_PATH = ''
    expect(courseLinkFor('../3_expert/17_advanced_architectures.md', HARNESS))
      .toBe('/courses/expert/advanced-architectures/')
  })

  it('drops the numeric prefix, because the number is not the identifier', () => {
    // `slugs.ts` owns this rule: module 10 was split out of the old coding-agents
    // module, so the corpus has been renumbered before and will be again.
    process.env.NEXT_PUBLIC_SITE_BASE_PATH = ''
    expect(courseLinkFor('10_coding_agents_landscape.md', HARNESS))
      .toBe('/courses/intermediate/coding-agents-landscape/')
  })

  /**
   * A Turkish target lands on the English sheet, deliberately. The app builds no
   * Turkish route — `loader.ts` skips every `_tr.md` file — and the sheet's title
   * block is where a reader reads whether a translation exists.
   */
  it('resolves a _tr target to its English sibling', () => {
    process.env.NEXT_PUBLIC_SITE_BASE_PATH = ''
    expect(courseLinkFor('13_security_tr.md', HARNESS))
      .toBe(courseLinkFor('13_security.md', HARNESS))
    expect(courseLinkFor('../1_fundamentals/7_multi_agent_tr.md', HARNESS))
      .toBe('/courses/fundamentals/multi-agent/')
  })

  it('ends every route with a slash, so the canonical form costs no redirect', () => {
    process.env.NEXT_PUBLIC_SITE_BASE_PATH = ''
    for (const target of ['13_security.md', '../3_expert/16_advanced_ui.md']) {
      expect(courseLinkFor(target, HARNESS), target).toMatch(/\/$/)
    }
  })

  it('applies the deploy base path, exactly once', () => {
    process.env.NEXT_PUBLIC_SITE_BASE_PATH = '/ai-engineering-bazaar'
    const route = courseLinkFor('13_security.md', HARNESS)
    expect(route).toBe('/ai-engineering-bazaar/courses/intermediate/security/')
    expect(route?.match(/\/ai-engineering-bazaar\//g)).toHaveLength(1)
  })

  /**
   * The corpus root file is the corpus' own table of contents, and the page that
   * does that job here is the course index.
   */
  it('sends the corpus index to the course index', () => {
    process.env.NEXT_PUBLIC_SITE_BASE_PATH = ''
    expect(courseLinkFor('../index.md', '1_fundamentals/README.md'))
      .toBe('/courses/')
  })

  it('leaves anything that is not an internal markdown link alone', () => {
    for (const target of [
      'https://code.claude.com/docs/en/hooks',
      'http://example.test/a.md',
      '//example.test/a.md',
      'mailto:someone@example.test',
      '#why-we-need-rag',
      './images/rag.png',
      '/courses/intermediate/security/',
    ]) {
      expect(courseLinkFor(target, HARNESS), target).toBeNull()
      expect(isCourseLink(target), target).toBe(false)
    }
  })

  /**
   * The gate this module exists for. `mkdocs build --strict` used to be the only
   * thing in the repository that failed on a dead internal link, and MkDocs is
   * gone — so the message has to do the job its warning did, which means naming
   * the file and the href. An error that does not say where it came from wastes
   * the afternoon of whoever reads it.
   */
  it('throws on a target the corpus does not have, naming file and href', () => {
    expect(() => courseLinkFor('9_bu_dosya_yok.md', HARNESS))
      .toThrow(/2_intermediate\/12_harness_engineering\.md/)
    expect(() => courseLinkFor('9_bu_dosya_yok.md', HARNESS))
      .toThrow(/9_bu_dosya_yok\.md/)
  })

  it('throws on a directory that is not a category', () => {
    expect(() => courseLinkFor('../7_imaginary/1_llms.md', HARNESS))
      .toThrow(/7_imaginary/)
  })

  /**
   * Not one of the 163 links in the corpus carries an anchor, so there is no
   * heading-to-slug mapping to get wrong. A fragment is carried through
   * unchanged rather than dropped: `rehype-slug` derives ids from the heading
   * text on both sides, so an authored anchor has a fair chance of landing.
   */
  it('carries a fragment through unchanged', () => {
    process.env.NEXT_PUBLIC_SITE_BASE_PATH = ''
    expect(courseLinkFor('13_security.md#threat-model', HARNESS))
      .toBe('/courses/intermediate/security/#threat-model')
  })
})

describe('sheetSource', () => {
  it('names the file a numbered sheet was loaded from', () => {
    expect(sheetSource(13)).toBe('2_intermediate/13_security.md')
    expect(sheetSource(1)).toBe('1_fundamentals/1_llms.md')
  })

  it('returns null for a number no sheet carries', () => {
    expect(sheetSource(999)).toBeNull()
  })
})
