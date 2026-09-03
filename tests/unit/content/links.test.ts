import { afterEach, describe, expect, it } from 'vitest'
import { courseLinkFor, isCourseLink, sheetSource } from '@/lib/content/links'
import { loadAllModules } from '@/lib/content/loader'

/**
 * The corpus' own cross-references, as routes.
 *
 * The resolver is checked against the real corpus rather than a fixture, because
 * the corpus is what it validates against: a module route exists exactly when
 * the loader loaded the file. Every href below is one the corpus actually
 * writes, except the two invented dead ones — which is the point of them.
 */

const HARNESS = '2_intermediate/harness_engineering.md'

describe('courseLinkFor', () => {
  const original = process.env.NEXT_PUBLIC_SITE_BASE_PATH
  afterEach(() => { process.env.NEXT_PUBLIC_SITE_BASE_PATH = original })

  it('resolves a link inside the same category directory', () => {
    process.env.NEXT_PUBLIC_SITE_BASE_PATH = ''
    expect(courseLinkFor('security.md', HARNESS))
      .toBe('/courses/intermediate/security/')
  })

  it('resolves a link into another category directory', () => {
    process.env.NEXT_PUBLIC_SITE_BASE_PATH = ''
    expect(courseLinkFor('../3_expert/advanced_architectures.md', HARNESS))
      .toBe('/courses/expert/advanced-architectures/')
  })

  it('refuses a target that still carries a number, because no such file exists', () => {
    // The prefixes are gone from the corpus, and so is the tolerance for one:
    // a link that keeps the old spelling names a file nobody ships, and saying
    // so is more use than quietly resolving it.
    expect(() => courseLinkFor('11_harness_engineering.md', HARNESS))
      .toThrow(/11_harness_engineering\.md/)
  })

  it('turns a name into its hyphenated route', () => {
    process.env.NEXT_PUBLIC_SITE_BASE_PATH = ''
    expect(courseLinkFor('harness_engineering.md', HARNESS))
      .toBe('/courses/intermediate/harness-engineering/')
  })

  /**
   * A Turkish target lands on the English sheet, deliberately. The app builds no
   * Turkish route — `loader.ts` skips every `_tr.md` file — and the sheet's title
   * block is where a reader reads whether a translation exists.
   */
  it('resolves a _tr target to its English sibling', () => {
    process.env.NEXT_PUBLIC_SITE_BASE_PATH = ''
    expect(courseLinkFor('security_tr.md', HARNESS))
      .toBe(courseLinkFor('security.md', HARNESS))
    expect(courseLinkFor('../1_fundamentals/multi_agent_tr.md', HARNESS))
      .toBe('/courses/fundamentals/multi-agent/')
  })

  it('ends every route with a slash, so the canonical form costs no redirect', () => {
    process.env.NEXT_PUBLIC_SITE_BASE_PATH = ''
    for (const target of ['security.md', '../3_expert/advanced_ui.md']) {
      expect(courseLinkFor(target, HARNESS), target).toMatch(/\/$/)
    }
  })

  it('applies the deploy base path, exactly once', () => {
    process.env.NEXT_PUBLIC_SITE_BASE_PATH = '/ai-engineering-bazaar'
    const route = courseLinkFor('security.md', HARNESS)
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
    expect(() => courseLinkFor('bu_dosya_yok.md', HARNESS))
      .toThrow(/2_intermediate\/harness_engineering\.md/)
    expect(() => courseLinkFor('bu_dosya_yok.md', HARNESS))
      .toThrow(/bu_dosya_yok\.md/)
  })

  it('throws on a directory that is not a category', () => {
    expect(() => courseLinkFor('../7_imaginary/llms.md', HARNESS))
      .toThrow(/7_imaginary/)
  })

  /**
   * Not one of the corpus' links carries an anchor, so there is no
   * heading-to-slug mapping to get wrong. A fragment is carried through
   * unchanged rather than dropped: `rehype-slug` derives ids from the heading
   * text on both sides, so an authored anchor has a fair chance of landing.
   */
  it('carries a fragment through unchanged', () => {
    process.env.NEXT_PUBLIC_SITE_BASE_PATH = ''
    expect(courseLinkFor('security.md#threat-model', HARNESS))
      .toBe('/courses/intermediate/security/#threat-model')
  })
})

describe('sheetSource', () => {
  it('names the file a numbered sheet was loaded from', () => {
    // The path is derived from the sheet, not transcribed: renumbering the
    // corpus must not fail this.
    for (const module of loadAllModules()) {
      expect(sheetSource(module.frontmatter.module), module.slug)
        .toBe(`${module.category.dir}/${module.name}.md`)
    }
  })

  it('returns null for a number no sheet carries', () => {
    expect(sheetSource(999)).toBeNull()
  })
})
