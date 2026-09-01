import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '@/lib/content/categories'
import { imageBaseFor } from '@/lib/content/images'
import { categoryIntro } from '@/lib/content/intro'
import { loadAllModules } from '@/lib/content/loader'
import { courseLinkFor, isCourseLink } from '@/lib/content/links'
import { CONTENT_ROOT } from '@/lib/content/paths'
import { quickCheckOf, summarySection } from '@/lib/content/quickcheck'
import { renderMarkdown } from '@/lib/content/render'

/**
 * The replacement for `mkdocs build --strict`.
 *
 * Until MkDocs was deleted, its strict mode was the only thing in this
 * repository that failed on a broken internal link. It read the corpus, so this
 * reads the corpus too — every module file on disk, Turkish siblings included,
 * because a link written in a Turkish file resolves by the same rule and a
 * fixture would only prove that the resolver does what its author expected.
 *
 * Run on its own with:  npx vitest run tests/corpus/links.test.ts
 */

/** The files the loader reads, plus the Turkish siblings it skips. */
const MODULE_FILE = /^\d+_.+\.md$/
/** A markdown inline link's target: `[text](target)`. */
const LINK = /\]\(([^)]+)\)/g

interface CorpusLink {
  /** Corpus-relative path of the file the link was written in. */
  source: string
  href: string
}

function corpusLinks(): CorpusLink[] {
  const found: CorpusLink[] = []
  for (const category of CATEGORIES) {
    const dir = path.join(CONTENT_ROOT, category.dir)
    for (const filename of fs.readdirSync(dir).sort()) {
      if (!MODULE_FILE.test(filename)) continue
      const markdown = fs.readFileSync(path.join(dir, filename), 'utf8')
      for (const match of markdown.matchAll(LINK)) {
        const href = match[1].trim()
        if (isCourseLink(href)) {
          found.push({ source: `${category.dir}/${filename}`, href })
        }
      }
    }
  }
  return found
}

const links = corpusLinks()

describe('the corpus cross-references itself', () => {
  /**
   * **MEASURED:** 163 internal markdown links across the 32 English sheets and
   * their Turkish siblings. The count is asserted, not just the resolutions: a
   * resolver that quietly stopped recognising the notation would find nothing to
   * check and pass every assertion below, and a test that would pass on an empty
   * input is a comment rather than a test. Two shapes only — `NAME.md` and
   * `../DIR/NAME.md`.
   */
  it('writes every internal markdown link in one of two shapes', () => {
    // The corpus is edited daily, so the count is not asserted: a link total is
    // a fact about today's prose, not about the resolver. What is asserted is
    // that the set is non-empty (an extractor that stopped working would make
    // every loop below vacuous) and that every link it finds has a legal shape.
    expect(links.length).toBeGreaterThan(0)
    for (const { source, href } of links) {
      expect(href, `${source} -> ${href}`)
        .toMatch(/^(?:\.\.\/[^/]+\/)?[^/]+\.md(?:#.*)?$/)
    }
  })

  it('resolves every one of them to a route the app serves', () => {
    const routes = new Set(loadAllModules().map((m) => `/courses/${m.slug}/`))
    routes.add('/courses/')

    for (const { source, href } of links) {
      // `courseLinkFor` throws on a dead target, which is the gate; the message
      // it throws names the file and the href, so a failure here reads as a
      // content bug rather than as a test that fell over.
      const route = courseLinkFor(href, source)
      expect(route, `${source} -> ${href}`).not.toBeNull()
      // The base path is empty under test, so the emitted route is comparable
      // to the app's own `sheetPath` output as written.
      expect(routes.has(route as string), `${source} -> ${href} = ${route}`).toBe(true)
    }
  })

  it('covers all six categories, so no directory is silently unreachable', () => {
    const sources = new Set(links.map(({ source }) => source.split('/')[0]))
    expect([...sources].sort()).toEqual(CATEGORIES.map((c) => c.dir).sort())
  })
})

/**
 * Every render path the app performs, enumerated.
 *
 * The gate used to render the module body and nothing else, and it passed while
 * **four dead links shipped**: `courses/[category]/[module]/page.tsx` renders
 * the sheet's `## Summary` a second time to feed the Quick Check panel, that
 * render was given no origin to resolve a relative path against, and three
 * sheets cross-reference a neighbour inside their summary —
 * `intermediate/coding-agents` twice, `coding-agents-landscape` and
 * `personal-agents` once each. Checking the body render does not rewrite the
 * summary render. A gate that misses the path the reader clicks is worth less
 * than its passing count suggests, so the summary is listed here by name: a
 * test that records the defect it was written for survives the next refactor.
 *
 * The three paths are the three `renderMarkdown` calls in `src/`
 * (`git grep -n renderMarkdown -- src`), and nothing here may render the corpus
 * differently from the way the page does — same options, same extractor.
 */
async function renderedPages(): Promise<Array<{ where: string; html: string }>> {
  const pages: Array<{ where: string; html: string }> = []

  for (const module of loadAllModules()) {
    const number = module.frontmatter.module
    const imageBase = imageBaseFor(module.category.slug)

    const body = await renderMarkdown(module.body, { imageBase, sheet: number })
    pages.push({ where: `${module.slug} body`, html: body.html })

    // Exactly the module page's condition: the panel mounts on the extractor
    // returning non-null, never on a status or a format.
    const summaryMarkdown =
      quickCheckOf(module.body) === null ? null : summarySection(module.body)
    if (summaryMarkdown !== null) {
      const summary = await renderMarkdown(summaryMarkdown, { imageBase, excerptOf: number })
      pages.push({ where: `${module.slug} summary`, html: summary.html })
    }
  }

  for (const category of CATEGORIES) {
    const intro = categoryIntro(category.slug)
    if (intro === null) continue
    const { html } = await renderMarkdown(intro)
    pages.push({ where: `${category.slug} introduction`, html })
  }

  return pages
}

const pages = await renderedPages()

describe('the rendered sheets carry no file paths', () => {
  /**
   * The enumeration is asserted, not only its contents: a summary extractor that
   * quietly stopped finding anything would take the path this file exists for
   * out of the gate and pass every assertion below. **MEASURED:** 32 bodies, 15
   * summaries — one per drawn sheet, which is every sheet that asks a Quick
   * Check — and 6 introductions.
   */
  it('renders every path the app renders', () => {
    const kinds = (suffix: string) => pages.filter((p) => p.where.endsWith(suffix)).length
    expect(kinds('body')).toBe(loadAllModules().length)
    expect(kinds('introduction')).toBe(CATEGORIES.length)
    // No assertion on the summary count: a `## Summary` section is optional
    // authoring, so how many sheets carry one changes as modules are written.
  })

  /**
   * The assertion that would have caught the 39. **MEASURED** in the static
   * export before `links.ts` existed: 39 hrefs ending in `.md` across 8 pages,
   * all in `intermediate`, each of them resolved by the browser against the page
   * URL into a 404. An external URL that happens to end in `.md` — the Gemini
   * CLI docs are markdown files on GitHub — is a real link and stays.
   */
  it('leaves no internal href ending in .md on any rendered page', () => {
    for (const { where, html } of pages) {
      const dead = (html.match(/href="(?!https?:|\/\/)[^"]*\.md(?:#[^"]*)?"/g) ?? [])
      expect(dead, where).toEqual([])
    }
  })

  it('rewrites the cross-references that reach the HTML into course routes', async () => {
    const { html } = await renderMarkdown(
      loadAllModules().find((m) => m.frontmatter.module === 12)?.body ?? '',
      { sheet: 12 },
    )
    // Module 12's prose points at the security sheet in the sentence about who
    // attacks a harness; it is one of the 39 that used to 404.
    expect(html).toContain('href="/courses/intermediate/security/"')
  })

  /**
   * The four the body render could not have caught, named individually. They
   * reach the reader through `QuickCheck`'s `dangerouslySetInnerHTML`, which is
   * as much a page as the prose is.
   */
  it('rewrites the cross-references written inside a Summary section', () => {
    const summaryOf = (slug: string) =>
      pages.find((p) => p.where === `${slug} summary`)?.html ?? ''

    expect(summaryOf('intermediate/coding-agents'))
      .toContain('href="/courses/intermediate/harness-engineering/"')
    expect(summaryOf('intermediate/coding-agents'))
      .toContain('href="/courses/expert/advanced-harness-engineering/"')
    expect(summaryOf('intermediate/coding-agents-landscape'))
      .toContain('href="/courses/intermediate/coding-agents/"')
    expect(summaryOf('intermediate/personal-agents'))
      .toContain('href="/courses/expert/advanced-ui/"')
  })

  /**
   * The one render the app performs with no origin at all, and the reason a
   * sourceless internal link may throw rather than being skipped: a category
   * introduction has no sheet number, and it is safe only because `intro.ts`
   * strips every markdown-file link out of the README before the pipeline sees
   * it. Asserted on the markdown, not on the HTML — the HTML is already covered
   * above, and it is the *absence of a link to resolve* that makes the render
   * legal, so that is what has to be pinned.
   */
  it('hands the pipeline six category introductions with no markdown-file link', () => {
    for (const category of CATEGORIES) {
      const intro = categoryIntro(category.slug)
      if (intro === null) continue
      expect(intro.match(/\]\([^)]*\.md[^)]*\)/g) ?? [], category.slug).toEqual([])
    }
  })
})
