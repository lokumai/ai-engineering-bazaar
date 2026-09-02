import { describe, expect, it } from 'vitest'
import { imageBaseFor } from '@/lib/content/images'
import { loadAllModules } from '@/lib/content/loader'
import { renderMarkdown } from '@/lib/content/render'

/**
 * The render pipeline, run over the real corpus.
 *
 * This file replaced four that asserted what the corpus *says* — its headings,
 * its counts, its titles, its prerequisites, its word extents. The content is
 * live: it is rewritten, renumbered and reordered constantly, and a suite that
 * pinned those facts turned every edit into a test failure that taught nobody
 * anything.
 *
 * What is worth checking against real content is only this: it renders, and the
 * links it renders are usable. Everything else about the pipeline is covered by
 * fixtures in `tests/unit/content/`, where an assertion can state a rule
 * instead of a snapshot.
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
})
