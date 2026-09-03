import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '@/lib/content/render'

describe('renderMarkdown', () => {
  it('collects a table of contents from h2 and h3 only', async () => {
    const { toc } = await renderMarkdown(
      '# Title\n\n## First\n\n### Nested\n\n#### Ignored\n\n## Second',
    )
    expect(toc).toEqual([
      { id: 'first', text: 'First', depth: 2 },
      { id: 'nested', text: 'Nested', depth: 3 },
      { id: 'second', text: 'Second', depth: 2 },
    ])
  })

  it('rewrites relative image sources onto the given base', async () => {
    const { html } = await renderMarkdown(
      '![Context](./images/context-window.png)',
      { imageBase: '/course-images/fundamentals' },
    )
    expect(html).toContain('src="/course-images/fundamentals/context-window.png"')
  })

  it('leaves absolute image sources alone', async () => {
    const { html } = await renderMarkdown(
      '![Logo](https://example.com/a.png)',
      { imageBase: '/course-images/fundamentals' },
    )
    expect(html).toContain('src="https://example.com/a.png"')
  })

})

describe('renderMarkdown — B6.2, the italic dek', () => {
  it('strips the Turkish dek too', async () => {
    const { html } = await renderMarkdown(
      '# Module 16\n\n*Kategori: Expert — Modül 16 (bu kategoride 1/9)*\n\nGövde.',
    )
    expect(html).not.toContain('Kategori:')
  })

  it('leaves an ordinary opening paragraph alone', async () => {
    const { html } = await renderMarkdown('# Module 1\n\n*An emphasised opening.*\n\nMore.')
    expect(html).toContain('An emphasised opening.')
  })

})

describe('renderMarkdown — B6.3, Roman section marks', () => {
  it('derives the id from the text alone, not the numeral', async () => {
    const { html } = await renderMarkdown('## VII. Guardrails, honestly rated')
    expect(html).toContain('id="guardrails-honestly-rated"')
  })

  it('gives a non-Roman h2 no numeral and no tick', async () => {
    const { html } = await renderMarkdown('## Quick Check')
    expect(html).not.toContain('data-mark')
  })

  it('does not mistake a word for a numeral', async () => {
    const { html } = await renderMarkdown('## MIX. Something')
    expect(html).not.toContain('data-mark')
  })

  it('leaves h3 alone — only h2 carries a section mark', async () => {
    const { html } = await renderMarkdown('### II. A sub-part')
    expect(html).not.toContain('data-mark')
    expect(html).toContain('II. A sub-part')
  })
})

describe('renderMarkdown — §6.1 heading anchors', () => {
  it('keeps the anchor out of the table of contents text', async () => {
    const { toc } = await renderMarkdown('## A section')
    expect(toc[0].text).toBe('A section')
  })

  /**
   * The anchor is a child of the heading, so without `aria-labelledby` the
   * heading's name-from-contents swallows the anchor's label and every h2 and
   * h3 announces itself twice: "A section Link to “A section”". ~20 headings a
   * sheet across 15 drawn sheets, on the one control a screen-reader user
   * navigates an 18,400px page with.
   */
  it('names a heading from its own title, not from its permalink', async () => {
    const { html } = await renderMarkdown('## Why We Need RAG')
    expect(html).toContain('<h2 id="why-we-need-rag" aria-labelledby="why-we-need-rag-title">')
    expect(html).toContain('<span id="why-we-need-rag-title">Why We Need RAG</span>')
    // The anchor keeps its own name; §6.1 and §10.3 require it to stay a
    // labelled tab stop, so `aria-hidden` is not the fix.
    expect(html).toContain('aria-label="Link to “Why We Need RAG”"')
    expect(html).not.toContain('aria-hidden="true" class="hl-anchor"')
  })

  it('names an h3 the same way', async () => {
    const { html } = await renderMarkdown('### A sub-section')
    expect(html).toContain('<h3 id="a-sub-section" aria-labelledby="a-sub-section-title">')
  })

  it('never reuses an id a heading in the document already claimed', async () => {
    // `## Slug` slugs to `slug`, and a sibling `## Slug title` slugs to
    // `slug-title` — which is exactly the id the first heading's title span
    // would otherwise take.
    const { html } = await renderMarkdown('## Slug\n\n## Slug title')
    const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1])
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('slug-title')
    expect(ids).toContain('slug-title-2')
  })
})

describe('renderMarkdown — B5 table width classes (§6.5)', () => {
  const table = (columns: number) => {
    const row = (cell: string) => `| ${Array.from({ length: columns }, () => cell).join(' | ')} |`
    return `${row('h')}\n${row('-')}\n${row('v')}`
  }

  it('numbers tables per sheet, in document order', async () => {
    const { html } = await renderMarkdown(`${table(2)}\n\ntext\n\n${table(2)}`, { sheet: 13 })
    expect(html).toContain('TBL. 13.1')
    expect(html).toContain('TBL. 13.2')
  })

  it('keeps four columns or fewer inside the measure', async () => {
    for (const columns of [1, 2, 3, 4]) {
      const { html } = await renderMarkdown(table(columns))
      expect(html).toContain('data-hl-width="prose"')
    }
  })

  it('breaks five columns out to the wide class', async () => {
    const { html } = await renderMarkdown(table(5))
    expect(html).toContain('data-hl-width="wide"')
  })

  it('gives six columns or more the full content box', async () => {
    for (const columns of [6, 7]) {
      const { html } = await renderMarkdown(table(columns))
      expect(html).toContain('data-hl-width="full"')
    }
  })

  it('makes the scroll container reachable from the keyboard (§10.3)', async () => {
    const { html } = await renderMarkdown(table(6), { sheet: 11 })
    expect(html).toContain('role="region"')
    expect(html).toContain('tabindex="0"')
    expect(html).toContain('aria-label="Table 11.1"')
  })
})

/**
 * A markdown pipe table ships one header row and no row headers, so a cell in
 * TBL. 13.4's VERDICT column announces its column and nothing that says which
 * defence it is the verdict on. `SheetIndex` already emits both scopes; this
 * is the prose half catching up.
 */
describe('renderMarkdown — §10.2 table headers', () => {
  const table = (columns: number) => {
    const row = (head: string, rest: string) =>
      `| ${[head, ...Array.from({ length: columns - 1 }, () => rest)].join(' | ')} |`
    return `${row('h', 'h')}\n${row('-', '-')}\n${row('label', 'v')}`
  }

  it('scopes every column header, at any width', async () => {
    for (const columns of [2, 3, 6]) {
      const { html } = await renderMarkdown(table(columns))
      expect(html.match(/<th scope="col"/g)).toHaveLength(columns)
    }
  })

  it('promotes the first body cell of a three-column table to a row header', async () => {
    const { html } = await renderMarkdown(table(3))
    expect(html).toContain('<th scope="row">label</th>')
  })

  it('promotes every body row, not just the first', async () => {
    const { html } = await renderMarkdown(
      '| a | b | c |\n| - | - | - |\n| 1 | x | y |\n| 2 | x | y |\n| 3 | x | y |',
    )
    expect(html.match(/<th scope="row"/g)).toHaveLength(3)
  })

  it('promotes a transposed table whose first header cell is empty', async () => {
    const { html } = await renderMarkdown('|  | a | b |\n| - | - | - |\n| rows | 1 | 2 |')
    expect(html).toContain('<th scope="row">rows</th>')
  })

  /**
   * A row header is repeated before every cell in its row. **MEASURED:** the
   * corpus's 2-column tables include one in module 2 whose first column is a
   * 180-character article excerpt; announcing that before each cell would be
   * worse than announcing nothing.
   */
  it('leaves a two-column table alone — its first column is not a label', async () => {
    const { html } = await renderMarkdown(table(2))
    expect(html).not.toContain('scope="row"')
    expect(html).toContain('<td>label</td>')
  })
})

/**
 * §6.4 / §7.7 — the site tracks no per-item state, so a GFM checkbox is inert
 * decoration that was announcing itself as eight nameless, unchecked
 * checkboxes down module 13's list. The item text is a sibling of the input,
 * never a label, so there is no name to give it either.
 */
describe('renderMarkdown — §6.4 task lists', () => {
  const list = '- [ ] No secrets in the system prompt\n- [ ] Tools are allow-listed'

  it('leaves the item text, which is the actual content, untouched', async () => {
    const { html } = await renderMarkdown(list)
    expect(html).toContain('No secrets in the system prompt')
    expect(html).toContain('class="task-list-item"')
  })
})

describe('renderMarkdown — §6.9 images', () => {
  // Two images under one h2 is module 6's shape; the section heading would
  // have printed the same label on both.
  it('falls back to the section heading only where there is no alt', async () => {
    const { html } = await renderMarkdown(
      '## I. Defining the Agent\n\n![](./images/a.png)\n*A sentence.*',
      { sheet: 6 },
    )
    expect(html).toContain(
      '<span class="hl-cap-label">FIG. 6.1 — Defining the Agent</span>',
    )
  })

  it('shares one figure counter with the diagrams, in document order', async () => {
    const { html } = await renderMarkdown(
      '```mermaid\ngraph LR\n  A --> B\n```\n\n![Second](./images/b.png)',
      { sheet: 6 },
    )
    expect(html).toContain('FIG. 6.1<')
    expect(html).toContain('FIG. 6.2 — Second')
  })

  it('leaves an image that sits inside real prose inline', async () => {
    const { html } = await renderMarkdown('Some text ![icon](./i.png) more text.')
    expect(html).not.toContain('hl-image')
  })
})

describe('renderMarkdown — §6.10 diagram containers', () => {
  it('reserves the space with a drawn placeholder, not a shimmer', async () => {
    const { html } = await renderMarkdown('```mermaid\ngraph LR\n  A --> B\n```', { sheet: 13 })
    expect(html).toContain('Rendering FIG. 13.1')
  })

  it('fails the build on a colour literal it does not know (B3)', async () => {
    await expect(
      renderMarkdown('```mermaid\ngraph LR\n  A --> B\n  style A fill:#010203\n```'),
    ).rejects.toThrow(/#010203/)
  })
})

describe('renderMarkdown — §6.7 code blocks', () => {
  it('renders an untagged fence as program output, not as code', async () => {
    const { html } = await renderMarkdown('```\nsome output\n```')
    expect(html).toContain('data-language="output"')
    expect(html).toContain('class="hl-code-lang">output<')
    expect(html).not.toContain('--shiki-light')
  })

  it('emphasises keywords at weight 500, never 700 (§6.7)', async () => {
    const { html } = await renderMarkdown('```python\nreturn 1\n```')
    expect(html).toContain('--shiki-light-font-weight:500')
    expect(html).toContain('--shiki-dark-font-weight:500')
    expect(html).not.toContain('font-weight:bold')
  })

  it('emits both theme variants so .dark re-themes with no re-highlight (B8)', async () => {
    const { html } = await renderMarkdown('```python\n# note\n```')
    expect(html).toContain('--shiki-light:')
    expect(html).toContain('--shiki-dark:')
  })

  it('lets a keyboard user scroll a long line (§10.3)', async () => {
    const { html } = await renderMarkdown('```bash\necho hi\n```')
    expect(html).toMatch(/<pre[^>]*tabindex="0"/)
    expect(html).toMatch(/<pre[^>]*role="region"/)
  })
})

describe('renderMarkdown — §6.3 links', () => {
  /**
   * A sourceless render carrying an internal markdown link is a caller bug, and
   * it fails here rather than shipping the href as written.
   *
   * This assertion used to read the other way round — it rendered the same link
   * with no options and checked only that no external mark appeared — and a
   * silent skip is exactly how **four dead links** survived a change that
   * measured itself at zero: the module page renders `## Summary` a second time
   * for the Quick Check panel, gave that render no origin, and three sheets
   * cross-reference a neighbour inside their summary. The corpus gate rendered
   * the body only, so nothing failed. The message has to name the href and say
   * which option to pass, because an error that does not say what to do costs
   * the next reader an afternoon.
   */
  it('throws on an in-repo link it has no origin to resolve against', async () => {
    await expect(renderMarkdown('[Harness Engineering](harness_engineering.md)'))
      .rejects.toThrow(/harness_engineering\.md/)
    await expect(renderMarkdown('[Harness Engineering](harness_engineering.md)'))
      .rejects.toThrow(/`sheet`.*`excerptOf`/s)
  })

  it('resolves an in-repo link from an excerpt of a sheet', async () => {
    const { html } = await renderMarkdown('[Security](security.md)', { excerptOf: 12 })
    expect(html).toContain('href="/courses/intermediate/security/"')
    expect(html).not.toContain('data-hl-external')
  })
})
