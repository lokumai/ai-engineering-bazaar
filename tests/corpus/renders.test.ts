import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { imageBaseFor } from '@/lib/content/images'
import { loadAllModules } from '@/lib/content/loader'
import { CONTENT_ROOT } from '@/lib/content/paths'
import { renderMarkdown } from '@/lib/content/render'

/**
 * The whole corpus, checked against rules rather than against facts.
 *
 * This file replaced four that asserted what the corpus *says* — its headings,
 * its counts, its titles, its prerequisites, its word extents. The content is
 * live: it gets rewritten, renumbered and reordered constantly, and a suite
 * that pinned those facts turned every edit into a failure that taught nobody
 * anything.
 *
 * Every check below holds for ANY content, so editing a module can never make
 * one of them red. Between them they cover the two defects this project has
 * actually shipped: eight figures that silently vanished from the published
 * pages, and cross-references left pointing at nothing after a renumber. See
 * `tests/README.md` for the rule this file exists to follow.
 */

const modules = loadAllModules()

const renderAll = () =>
  Promise.all(
    modules.map(async (module) => ({
      slug: module.slug,
      html: (
        await renderMarkdown(module.body, {
          imageBase: imageBaseFor(module.category.slug),
          sheet: module.frontmatter.module,
        })
      ).html,
    })),
  )

describe('every sheet in the set', () => {
  it('renders without throwing', async () => {
    const pages = await renderAll()
    expect(pages).toHaveLength(modules.length)
    for (const page of pages) {
      expect(page.html.length, page.slug).toBeGreaterThan(0)
    }
  })

  it('leaves no unrewritten .md link for a reader to click', async () => {
    // Relative only. An external URL is allowed to end in `.md`, and several
    // sheets cite a repository file that does.
    for (const page of await renderAll()) {
      expect(page.html, page.slug).not.toMatch(/href="(?!https?:)[^"]*\.md"/)
    }
  })

  it('leaves no colour literal in a rendered diagram', async () => {
    for (const page of await renderAll()) {
      const diagrams = page.html.match(/data-mermaid="[^"]*"/g) ?? []
      for (const diagram of diagrams) {
        expect(diagram, page.slug).not.toMatch(/fill:\s*#[0-9a-fA-F]/)
      }
    }
  })

  it('names an image file that exists on disk', () => {
    // The published page loads these by URL, so a typo here is a broken
    // picture on a live page and nothing else notices. `module-images.spec.ts`
    // checks the other half: that they actually load in a browser.
    for (const module of modules) {
      const dir = join(CONTENT_ROOT, module.category.dir)
      for (const [, src] of module.body.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) {
        if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) continue
        expect(existsSync(join(dir, src)), `${module.slug} -> ${src}`).toBe(true)
      }
    }
  })

  it('authors every picture as markdown, never as an HTML tag', () => {
    // The exact defect this project shipped: nineteen figures were written as
    // `<img>`, the pipeline strips raw HTML outright, and the pages went out
    // with no pictures on them while the tests and the build stayed green. A
    // "do the images load" check cannot catch it, because there is no image
    // element left to be broken.
    for (const module of modules) {
      expect(module.body, `${module.slug} writes an image as HTML`).not.toMatch(/<img[\s>]/i)
    }
  })

  it('has a Turkish sibling beside it', () => {
    // Whether the translation is finished is a separate question the site
    // answers with its own badge. What must not happen is the file missing.
    //
    // `curriculum-file.ts`'s rule 7 checks the same thing off the yaml, before
    // the loader runs. This checks it off a loaded module's own name, which is
    // the half that would survive the yaml being wrong.
    for (const module of modules) {
      const tr = join(CONTENT_ROOT, module.category.dir, `${module.name}_tr.md`)
      expect(existsSync(tr), `${module.slug} has no _tr.md beside it`).toBe(true)
    }
  })

  it('declares only prerequisites that exist, and come earlier', () => {
    // The check that catches a renumber gone wrong: a sheet pointing at a
    // number nothing has, or at one a reader has not reached yet.
    const numbers = new Set(modules.map((module) => module.frontmatter.module))
    for (const module of modules) {
      for (const required of module.frontmatter.prerequisites) {
        expect(numbers.has(required), `${module.slug} requires ${required}`).toBe(true)
        expect(required, `${module.slug} requires ${required}`)
          .toBeLessThan(module.frontmatter.module)
      }
    }
  })

  it('numbers the set from one, with no gaps and no duplicates', () => {
    const numbers = modules.map((module) => module.frontmatter.module).sort((a, b) => a - b)
    expect(numbers).toEqual(numbers.map((_, index) => index + 1))
  })

  it('carries no number in its filename, and none in its frontmatter', () => {
    // What this replaced: "states a filename whose number matches the number
    // inside it", which was the best a corpus with the number in two places
    // could do. There is one place now, `curriculum.yaml`, and a number in a
    // filename or a frontmatter block is a second copy coming back.
    for (const module of modules) {
      const dir = join(CONTENT_ROOT, module.category.dir)
      expect(existsSync(join(dir, `${module.name}.md`)), module.slug).toBe(true)
      expect(readFileSync(join(dir, `${module.name}.md`), 'utf8'), module.slug)
        .not.toMatch(/^module:\s*\d+$/m)
    }
  })

  it('names no module file with a numeric prefix, in either language', () => {
    // The other direction: a file still called `13_security.md` would be a file
    // nobody lists, which rule 6 refuses, so this cannot go red on its own. It
    // is here because the two rules together are what make the rename final.
    for (const module of modules) {
      const dir = join(CONTENT_ROOT, module.category.dir)
      for (const stale of readdirSync(dir)) {
        expect(stale, `${module.category.dir} still holds a numbered file`)
          .not.toMatch(/^\d+_.*\.md$/)
      }
    }
  })

  it('names another module by title and never by number, in either language', () => {
    // The number is a position in `curriculum.yaml`, so prose holding one is a
    // second copy of it. All 89 that this replaced were correct on the day they
    // were written and every one of them would have gone silently wrong on the
    // next reorder, which is exactly the failure the config was meant to end.
    // Fenced code is skipped: a sample is free to say whatever it says.
    const withoutFences = (raw: string) => raw.replace(/```[\s\S]*?```/g, '')
    const byNumber = /\b[Mm]od[u\u00fc]l\p{L}*\s+\d/u
    for (const module of modules) {
      const dir = join(CONTENT_ROOT, module.category.dir)
      for (const name of [`${module.name}.md`, `${module.name}_tr.md`]) {
        expect(withoutFences(readFileSync(join(dir, name), 'utf8')), name)
          .not.toMatch(byNumber)
      }
    }
  })

  it('leaves no prev/next footer and no category dek for the app to strip', () => {
    // Both were GitHub-only duplications of what the app derives, both were
    // already wrong (the Intermediate chain ran 8, 9, 10, 11, 13, 12, 14), and
    // the corpus pass deleted all of them. `strip.ts` still removes them, so
    // one coming back is invisible on the site: this is what notices.
    for (const module of modules) {
      const raw = readFileSync(module.filePath, 'utf8')
      expect(raw, module.slug).not.toMatch(/^\*\*(?:Previous|Next) (?:Module|Category):/m)
      expect(raw, module.slug).not.toMatch(/^\*(?:Category|Kategori):/m)
    }
  })
})
