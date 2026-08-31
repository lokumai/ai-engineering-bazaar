import { describe, expect, it } from 'vitest'
import { checklistOf } from '@/lib/content/checklist'
import { loadAllModules } from '@/lib/content/loader'
import { quickCheckOf } from '@/lib/content/quickcheck'
import { renderMarkdown } from '@/lib/content/render'

/**
 * §12.6 / §12.7 — the two things the render pipeline had to learn for the
 * record, checked against the corpus rather than against a fixture.
 *
 * The self-check removal is the trap §12.6 names first: the question is already
 * rendered inside `<Prose>`, so lifting it into a component without taking it
 * out of the tree prints it **twice on all 15 drawn sheets**. A fixture cannot
 * catch that — the labels, the colon and the paragraph boundaries are all
 * authored by hand across fifteen files — so this file renders every one of
 * them and then checks that the question is still recoverable, because a
 * removal that also broke the extractor would silently take the Quick Check off
 * the site altogether.
 */

const modules = loadAllModules()
const drawn = modules.filter((module) => module.frontmatter.status === 'ready')
const rendered = new Map(
  await Promise.all(
    modules.map(
      async (module) => [module.slug, await renderMarkdown(module.body)] as const,
    ),
  ),
)

/** The label as it reaches the tree: a bold inline run, not a heading. */
const LABEL = /<strong>(?:Quick Check|Quiz Yourself)<\/strong>/

/**
 * The longest run of the question that carries no markdown and no character the
 * serialiser escapes, so it survives rendering byte for byte and can be
 * searched for in the HTML.
 *
 * The LONGEST run, not the leading one: sheet 9 emphasises *unrelated* and
 * sheet 12 opens `Your \`PreToolUse\` hook script…`, where the leading run is
 * four characters and would prove nothing.
 */
function literalRun(question: string): string {
  return question
    .split(/[*_`[\]<>&"]/)
    .map((part) => part.trim())
    .reduce((longest, part) => (part.length > longest.length ? part : longest), '')
}

describe('§12.6 — the self-check paragraph is removed from the prose', () => {
  it('finds one on every drawn sheet and none on a draft', () => {
    expect(drawn).toHaveLength(15)
    expect(drawn.filter((module) => quickCheckOf(module.body) !== null)).toHaveLength(15)
    expect(
      modules.filter(
        (module) => module.frontmatter.status === 'draft' && quickCheckOf(module.body) !== null,
      ),
    ).toHaveLength(0)
  })

  it('leaves no self-check label in the rendered html of any sheet', () => {
    for (const module of modules) {
      expect(rendered.get(module.slug)!.html, module.slug).not.toMatch(LABEL)
    }
  })

  it('leaves the question itself out of the prose on all 15 drawn sheets', () => {
    for (const module of drawn) {
      const question = quickCheckOf(module.body)!.question
      const run = literalRun(question)
      // Every question in the corpus opens with a long literal run; a short one
      // would mean this check had quietly stopped proving anything.
      expect(run.length, `${module.slug}: "${question}"`).toBeGreaterThan(20)
      expect(rendered.get(module.slug)!.html, module.slug).not.toContain(run)
    }
  })

  it('keeps the question recoverable from the extractor, which is what the page uses', () => {
    for (const module of drawn) {
      expect(quickCheckOf(module.body)?.question, module.slug).toMatch(/\S/)
    }
  })

  it('removes the paragraph, not the section around it', async () => {
    const { html } = await renderMarkdown(
      '## Summary\n\nThe four channels are named above.\n\n' +
        '**Quick Check**: Which would you close first?\n\nReferences follow.\n',
    )
    expect(html).toContain('The four channels are named above.')
    expect(html).toContain('References follow.')
    expect(html).not.toContain('Quick Check')
    expect(html).not.toContain('Which would you close first?')
  })

  it('accepts sheet 1&rsquo;s label as well, which is the only one that differs', async () => {
    const { html } = await renderMarkdown('**Quiz Yourself**: What is a token?\n\nBody.\n')
    expect(html).not.toContain('Quiz Yourself')
    expect(html).toContain('Body.')
  })

  it('spends the lead class on the paragraph that survives, not the one that goes', async () => {
    const { html } = await renderMarkdown('**Quick Check**: Anything?\n\nThe real lead.\n')
    expect(html).toContain('<p class="hl-lead">The real lead.</p>')
  })

  it('leaves a bold run that is not a self-check alone', async () => {
    const { html } = await renderMarkdown('**Quick Check** is a heading style, not a question.\n')
    expect(html).toContain('Quick Check')
  })

  it('leaves a quoted self-check alone: the extractor does not read one either', async () => {
    const { html } = await renderMarkdown('> **Quick Check**: this is prose about a question.\n')
    expect(html).toContain('Quick Check')
  })

  it('removes only the first, because no sheet asks two', async () => {
    const { html } = await renderMarkdown(
      '**Quick Check**: First one.\n\n**Quick Check**: Second one.\n',
    )
    expect(html).not.toContain('First one.')
    expect(html).toContain('Second one.')
  })
})

describe('§12.7 — the checklist items come out through the sink', () => {
  it('agrees with the raw-line derive on every sheet, per §12.7', () => {
    for (const module of modules) {
      expect(rendered.get(module.slug)!.checklist.length, module.slug).toBe(
        checklistOf(module.body).length,
      )
    }
  })

  it('finds the corpus total: 8 items, all on one sheet', () => {
    const counts = modules
      .map((module) => [module.slug, rendered.get(module.slug)!.checklist.length] as const)
      .filter(([, count]) => count > 0)
    expect(counts).toHaveLength(1)
    expect(counts[0][1]).toBe(8)
    expect(counts[0][0]).toBe('intermediate/security')
  })

  it('numbers one index space per sheet, straight through both authored groups', () => {
    const items = rendered.get('intermediate/security')!.checklist
    expect(items.map((item) => item.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    for (const item of items) expect(item.text).toMatch(/\S/)
  })

  it('reads the item text, which the inert checkbox never carried a name for', async () => {
    const { checklist } = await renderMarkdown(
      '- [ ] No secrets in the system prompt\n- [ ] Tools are allow-listed\n',
    )
    expect(checklist).toEqual([
      { index: 0, text: 'No secrets in the system prompt' },
      { index: 1, text: 'Tools are allow-listed' },
    ])
  })

  it('is blind to a `- [ ]` inside a fence, the same as the raw-line derive', async () => {
    const { checklist } = await renderMarkdown('```markdown\n- [ ] not an item\n```\n')
    expect(checklist).toEqual([])
  })

  it('does not carry the external-link mark into the item text', async () => {
    const { checklist, html } = await renderMarkdown(
      '- [ ] Read [the spec](https://example.com/spec)\n',
    )
    expect(checklist[0].text).toBe('Read the spec')
    // The mark itself is still on the anchor in the prose.
    expect(html).toContain('hl-ext-mark')
  })

  it('leaves the inert list in the prose: exposing the items is not replacing them', () => {
    const { html } = rendered.get('intermediate/security')!
    expect(html).toContain('class="task-list-item"')
    expect(html).toContain('<input type="checkbox" disabled aria-hidden="true">')
  })
})
