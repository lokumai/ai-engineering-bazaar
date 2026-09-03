/**
 * §12.7 — the contract between `render.ts` and `ChecklistIsland`.
 *
 * The island is DOM wiring and belongs to Playwright (§12.14.2's layer rule:
 * anything needing layout, paint or real storage is a browser test). What CAN
 * be pinned here is the thing that would break silently — the two sides
 * agreeing on which item is which. `render.ts` stamps the index and the island
 * reads it, and if either stopped, every tick would be stored under the wrong
 * key and the reader's checklist would come back shuffled with no error
 * anywhere.
 *
 * This is the same `data-hl-*` selector-contract test `AFFORDANCE_SELECTORS`
 * and `FIGURE_SELECTORS` already carry.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { describe, expect, it } from 'vitest'
import { CHECKLIST_SELECTORS } from '@/components/record/ChecklistIsland'
import type { CategorySlug } from '@/lib/content/categories'
import { checklistOf } from '@/lib/content/checklist'
import { loadAllModules } from '@/lib/content/loader'
import { imageBaseFor } from '@/lib/content/images'
import { renderMarkdown } from '@/lib/content/render'

const modules = loadAllModules()

/**
 * The checklist under test is the kitchen-sink fixture's, not a real sheet's.
 *
 * It used to be whichever `ready` sheet happened to carry one, which made this
 * file depend on a fact about the corpus: that some module, somewhere, still
 * authored a task list. The day the last one was rewritten without a checklist
 * these three cases went red, having found nothing about `render.ts` at all.
 * The fixture exists so a structure can be tested without a module having to
 * keep using it (`tests/README.md`).
 */
const FIXTURE = join(import.meta.dirname, '../../fixtures/kitchen-sink.md')
const withItems = [
  {
    body: matter(readFileSync(FIXTURE, 'utf8')).content,
    category: { slug: 'intermediate' as CategorySlug },
    frontmatter: { module: 1 },
  },
]

describe('the selector contract', () => {
  it('names the attribute the build emits', () => {
    expect(CHECKLIST_SELECTORS.item).toBe('[data-hl-check]')
    expect(CHECKLIST_SELECTORS.box).toBe('input[type="checkbox"]')
    expect(CHECKLIST_SELECTORS.ticked).toBe('data-ticked')
  })
})

describe('render.ts emits what the island reads', () => {
  it('finds at least one sheet with items to render', () => {
    // Which sheet, and how many items, is the author's business.
    expect(withItems.length).toBeGreaterThan(0)
    expect(checklistOf(withItems[0].body).length).toBeGreaterThan(0)
  })

  it('stamps a contiguous index from zero onto every task item', async () => {
    const sheet = withItems[0]
    const rendered = await renderMarkdown(sheet.body, {
      imageBase: imageBaseFor(sheet.category.slug),
      sheet: sheet.frontmatter.module,
    })

    const stamped = [...rendered.html.matchAll(/data-hl-check="(\d+)"/g)]
      .map(([, index]) => Number(index))

    // One per item, numbered 0..n-1 in document order — one index space per
    // SHEET, not per list: a sheet with two authored groups either side of a
    // paragraph numbers straight through them.
    expect(stamped).toEqual(rendered.checklist.map((item) => item.index))
    expect(stamped).toEqual(stamped.map((_, index) => index))
  })

  it('leaves the box inert and silent until the island upgrades it (§10.4)', async () => {
    const sheet = withItems[0]
    const rendered = await renderMarkdown(sheet.body, {
      imageBase: imageBaseFor(sheet.category.slug),
      sheet: sheet.frontmatter.module,
    })

    // The no-JS fallback and the pre-hydration frame are the same markup, and
    // both are honest: the build does not know what this reader has ticked.
    expect(rendered.html).toContain('<input type="checkbox" disabled aria-hidden="true">')

    // Every box is inert, and none carries the island's own state attribute.
    // `data-ticked` is what the island writes once it has read the record, so
    // its absence here is the actual §10.4 contract: the served page makes no
    // claim about this reader.
    for (const [tag] of rendered.html.matchAll(/<input[^>]*>/g)) {
      expect(tag).toMatch(/\bdisabled\b/)
    }
    expect(rendered.html).not.toContain('data-ticked')

    // NOTE, and worth raising rather than asserting away: `render.ts` passes an
    // authored `- [x]` straight through as `checked`. No sheet in the corpus
    // writes one, which is why this went unnoticed until the fixture supplied
    // one. Whether the build should strip it is the app's call: a pre-ticked
    // box tells the reader an item is done before the island has read their
    // record, and then flips. The assertion above deliberately does not hide
    // it by re-scoping to unticked items only.
  })

  it('stamps nothing on the sheets with no checklist', async () => {
    for (const sheet of modules.filter((m) => m.frontmatter.status === 'ready').slice(0, 6)) {
      if (checklistOf(sheet.body).length > 0) continue
      const rendered = await renderMarkdown(sheet.body, {
        imageBase: imageBaseFor(sheet.category.slug),
        sheet: sheet.frontmatter.module,
      })
      expect(rendered.html).not.toContain('data-hl-check')
      expect(rendered.checklist).toEqual([])
    }
  })
})
