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

import { describe, expect, it } from 'vitest'
import { CHECKLIST_SELECTORS } from '@/components/record/ChecklistIsland'
import { checklistOf } from '@/lib/content/checklist'
import { loadAllModules } from '@/lib/content/loader'
import { imageBaseFor } from '@/lib/content/images'
import { renderMarkdown } from '@/lib/content/render'

const modules = loadAllModules()
const withItems = modules.filter((m) => checklistOf(m.body).length > 0)

describe('the selector contract', () => {
  it('names the attribute the build emits', () => {
    expect(CHECKLIST_SELECTORS.item).toBe('[data-hl-check]')
    expect(CHECKLIST_SELECTORS.box).toBe('input[type="checkbox"]')
    expect(CHECKLIST_SELECTORS.ticked).toBe('data-ticked')
  })
})

describe('render.ts emits what the island reads', () => {
  it('has exactly one sheet with items, carrying eight of them', () => {
    expect(withItems).toHaveLength(1)
    expect(checklistOf(withItems[0].body)).toHaveLength(8)
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
    // SHEET, not per list: sheet 13 has two authored groups either side of a
    // paragraph and they number straight through.
    expect(stamped).toEqual(rendered.checklist.map((item) => item.index))
    expect(stamped).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
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
    // No box arrives pre-ticked. Matched on the attribute, because the word
    // itself is all over sheet 13's prose about who checks the work.
    for (const [tag] of rendered.html.matchAll(/<input[^>]*>/g)) {
      expect(tag).not.toMatch(/\bchecked\b/)
    }
    expect(rendered.html).not.toContain('data-ticked')
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
