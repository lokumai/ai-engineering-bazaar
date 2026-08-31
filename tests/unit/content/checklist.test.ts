import { describe, expect, it } from 'vitest'
import { checklistOf } from '@/lib/content/checklist'
import { imageBaseFor } from '@/lib/content/images'
import { loadAllModules } from '@/lib/content/loader'
import { renderMarkdown } from '@/lib/content/render'

/**
 * §12.7 — the checklist derive, and the cross-check that keeps it honest.
 *
 * §12.7 names two possible hooks and requires the chosen one to be tested
 * against the other. The raw-line route is what ships, because it is
 * synchronous and works on all 32 sheets; the hast route inside
 * `rehypeTaskListMarkers` is authoritative but only exists behind an `await`
 * and only for the drawn sheets. Both give 8 today, and the last test in this
 * file is what makes "today" checkable rather than remembered.
 */

const modules = loadAllModules()
const byNumber = new Map(modules.map((m) => [m.frontmatter.module, m]))
const security = byNumber.get(13)!

describe('checklistOf', () => {
  it('reads a GFM task item', () => {
    expect(checklistOf('- [ ] Review the egress allowlist\n'))
      .toEqual([{ index: 0, text: 'Review the egress allowlist' }])
  })

  it('numbers items from zero, in document order', () => {
    expect(checklistOf('- [ ] one\n- [ ] two\n- [ ] three\n').map((i) => i.index))
      .toEqual([0, 1, 2])
  })

  it('reads a ticked item as an item — the tick is the reader\'s to make', () => {
    // §12.7 keys the reader's state by index in the record, never in the file.
    // An authored `- [x]` is still item n, and the record still owns the tick.
    expect(checklistOf('- [x] done\n- [X] also done\n')).toEqual([
      { index: 0, text: 'done' },
      { index: 1, text: 'also done' },
    ])
  })

  it('accepts all three bullet markers', () => {
    expect(checklistOf('- [ ] a\n* [ ] b\n+ [ ] c\n')).toHaveLength(3)
  })

  it('keeps the inline markdown the item is written in', () => {
    // Item 8 of sheet 13 opens `**The adaptive round:**`; the emphasis is the
    // author's structure, not decoration.
    expect(checklistOf('- [ ] **The adaptive round:** hand them the spec.\n'))
      .toEqual([{ index: 0, text: '**The adaptive round:** hand them the spec.' }])
  })

  it('is not a task item without the space GFM requires after the bracket', () => {
    expect(checklistOf('- [ ]no space\n')).toEqual([])
  })

  it('is not a task item where the brackets hold anything else', () => {
    expect(checklistOf('- [a] not a checkbox\n- [] empty\n')).toEqual([])
  })

  it('ignores a plain list item', () => {
    expect(checklistOf('- an ordinary bullet\n')).toEqual([])
  })

  it('ignores a `- [ ]` inside a fenced code block', () => {
    // The corpus has 44 tagged code blocks, several of them markdown, so this
    // is the reason §12.7 sends the raw route through `unfenced()`.
    expect(checklistOf('```markdown\n- [ ] a sample item\n```\n')).toEqual([])
  })

  it('ignores a `- [ ]` in an indented code block', () => {
    // GFM makes no task item there either, so the two hooks agree.
    expect(checklistOf('Some prose.\n\n    - [ ] four spaces in\n')).toEqual([])
  })

  it('takes a nested item at up to three spaces of indent', () => {
    expect(checklistOf('   - [ ] three spaces\n')).toHaveLength(1)
  })

  it('returns an empty list, never null, for a sheet with no checklist', () => {
    expect(checklistOf('## I. Prose only\n\nNothing to tick.\n')).toEqual([])
  })

  it('finds 8 items in sheet 13 and none on the other 31 sheets', () => {
    // §12.5.1's `CHECKLIST` row: eligible today, 1 sheet.
    const withItems = modules.filter((m) => checklistOf(m.body).length > 0)
    expect(withItems.map((m) => m.frontmatter.module)).toEqual([13])
    expect(checklistOf(security.body)).toHaveLength(8)
    const total = modules.reduce((sum, m) => sum + checklistOf(m.body).length, 0)
    expect(total).toBe(8)
  })

  it('numbers sheet 13\'s items 0-7 across both of its groups', () => {
    // Four white-box items, a paragraph of prose, then four black-box items.
    // One index space, not two lists: §12.7 keys the record by index within
    // the sheet.
    const items = checklistOf(security.body)
    expect(items.map((i) => i.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(items[0].text.startsWith('System prompt and instruction files')).toBe(true)
    expect(items[3].text)
      .toBe('Skills, hooks, plugins and MCP configs reviewed by a second human.')
    expect(items[4].text.startsWith('One benign injection canary')).toBe(true)
    expect(items[7].text.startsWith('**The adaptive round:**')).toBe(true)
  })

  it('leaves every item text non-empty and free of its own marker', () => {
    for (const item of checklistOf(security.body)) {
      expect(item.text.length).toBeGreaterThan(20)
      expect(item.text).not.toContain('[ ]')
    }
  })

  it('gives the same answer on the raw file as on the stripped body', () => {
    for (const m of modules) {
      const raw = `${m.body}\n**Next Module:** [y](14_loop_engineering.md)\n`
      expect(checklistOf(raw).length, m.slug).toBe(checklistOf(m.body).length)
    }
  })
})

/**
 * §12.7's required cross-check. `rehypeTaskListMarkers` marks exactly the
 * inputs GFM made into task items, so counting its output across the whole
 * corpus is the second hook's own answer. If a sheet ever grows an item the
 * raw route cannot see — or the raw route ever claims one GFM does not make —
 * this is the test that says so, and 2,380 XP stops being derivable from a
 * number nobody re-measured.
 */
describe('the two hooks §12.7 names cannot drift apart', () => {
  const MARKED = /<input type="checkbox"[^>]*>/g

  it('counts the same 8 items through the rendered hast tree', async () => {
    let hast = 0
    let raw = 0
    for (const m of modules) {
      const { html } = await renderMarkdown(m.body, {
        imageBase: imageBaseFor(m.category.slug),
        sheet: m.frontmatter.module,
      })
      const inputs = html.match(MARKED)?.length ?? 0
      expect(inputs, `${m.slug} — hast`).toBe(checklistOf(m.body).length)
      hast += inputs
      raw += checklistOf(m.body).length
    }
    expect({ hast, raw }).toEqual({ hast: 8, raw: 8 })
  }, 60_000)
})
