import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '@/lib/content/render'

describe('renderMarkdown', () => {
  it('renders headings with stable ids', async () => {
    const { html } = await renderMarkdown('## Why We Need RAG')
    expect(html).toContain('id="why-we-need-rag"')
  })

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

  it('renders GitHub-flavoured tables', async () => {
    const { html } = await renderMarkdown('| a | b |\n| - | - |\n| 1 | 2 |')
    expect(html).toContain('<table>')
  })

  it('highlights code at build time', async () => {
    const { html } = await renderMarkdown('```python\nx = 1\n```')
    expect(html).toContain('<pre')
    expect(html).toContain('data-language="python"')
  })

  it('hands mermaid blocks to the client island instead of highlighting them', async () => {
    const { html } = await renderMarkdown('```mermaid\ngraph TD;\nA-->B;\n```')
    expect(html).toContain('class="mermaid-source"')
    expect(html).not.toContain('data-language="mermaid"')
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

  it('does not emit the top-level h1, which the page renders itself', async () => {
    const { html } = await renderMarkdown('# Module 1: LLM Fundamentals\n\nBody.')
    expect(html).not.toContain('<h1')
    expect(html).toContain('Body.')
  })
})

describe('renderMarkdown — B6.2, the italic dek', () => {
  it('strips the redundant category dek line under the h1', async () => {
    const { html } = await renderMarkdown(
      '# Module 13: Security\n\n*Category: Intermediate — Module 13 (6 of 8 in this category)*\n\nReal body.',
    )
    expect(html).not.toContain('6 of 8 in this category')
    expect(html).toContain('Real body.')
  })

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

  it('marks the opening paragraph as the lead (§6.2)', async () => {
    const { html } = await renderMarkdown('# Module 1\n\nOpening.\n\nSecond.')
    expect(html).toMatch(/<p class="hl-lead">Opening\.<\/p>/)
    expect(html).toContain('<p>Second.</p>')
  })
})

describe('renderMarkdown — B6.3, Roman section marks', () => {
  it('splits the numeral off the heading into data-mark', async () => {
    const { html } = await renderMarkdown('## VII. Guardrails, honestly rated')
    expect(html).toContain('data-mark="VII"')
    expect(html).toContain('>Guardrails, honestly rated')
    expect(html).not.toContain('VII. Guardrails')
  })

  it('derives the id from the text alone, not the numeral', async () => {
    const { html } = await renderMarkdown('## VII. Guardrails, honestly rated')
    expect(html).toContain('id="guardrails-honestly-rated"')
  })

  it('stores the numeral beside the text in the table of contents (§5.6)', async () => {
    const { toc } = await renderMarkdown('## I. What changed\n\n## References')
    expect(toc).toEqual([
      { id: 'what-changed', text: 'What changed', depth: 2, mark: 'I' },
      { id: 'references', text: 'References', depth: 2 },
    ])
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
  it('gives every h2 and h3 a focusable section link', async () => {
    const { html } = await renderMarkdown('## A section\n\n### A sub-section')
    expect(html.match(/class="hl-anchor"/g)).toHaveLength(2)
    expect(html).toContain('href="#a-section"')
    expect(html).toContain('aria-hidden="true">§</span>')
  })

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

  it('wraps a table in a captioned figure with its own scroll container', async () => {
    const { html } = await renderMarkdown(table(3), { sheet: 13 })
    expect(html).toContain('<figure class="hl-figure hl-table"')
    expect(html).toContain('<figcaption')
    expect(html).toContain('<div class="table-scroll"')
    expect(html).toContain('<table>')
  })

  it('numbers tables per sheet, in document order', async () => {
    const { html } = await renderMarkdown(`${table(2)}\n\ntext\n\n${table(2)}`, { sheet: 13 })
    expect(html).toContain('TBL. 13.1')
    expect(html).toContain('TBL. 13.2')
  })

  it('titles the table from the section it sits in', async () => {
    const { html } = await renderMarkdown(
      `## VII. Guardrails, honestly rated\n\n${table(3)}`,
      { sheet: 13 },
    )
    expect(html).toContain('TBL. 13.1 — Guardrails, honestly rated')
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

  it('takes the inert checkbox out of the accessibility tree', async () => {
    const { html } = await renderMarkdown(list)
    expect(html.match(/<input type="checkbox" disabled aria-hidden="true">/g)).toHaveLength(2)
  })

  it('leaves the item text, which is the actual content, untouched', async () => {
    const { html } = await renderMarkdown(list)
    expect(html).toContain('No secrets in the system prompt')
    expect(html).toContain('class="task-list-item"')
  })
})

describe('renderMarkdown — §6.9 images', () => {
  it('wraps an image in a captioned figure', async () => {
    const { html } = await renderMarkdown('![Naive RAG](./images/rag.png)', { sheet: 3 })
    expect(html).toContain('<figure class="hl-figure hl-image"')
    expect(html).toContain('FIG. 3.1 — Naive RAG')
    expect(html).not.toContain('<p><img')
  })

  // §6.5 fixes the strip at 28px carrying a short label, and an `<em>` under
  // an image is arbitrary-length descriptive prose — 335 characters in module
  // 5. So the two go to different places: the alt names the plate, the
  // sentence is set below it in the meta voice.
  it('labels the strip with the alt and sets the italic line below it', async () => {
    const { html } = await renderMarkdown(
      '![Agent Analogy](./images/a.png)  \n*LLM as brain, agent as body!*',
      { sheet: 6 },
    )
    expect(html).toContain('<span class="hl-cap-label">FIG. 6.1 — Agent Analogy</span>')
    expect(html).toContain('<p class="hl-cap-note">LLM as brain, agent as body!</p>')
    expect(html).toContain('alt="Agent Analogy"')
  })

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
  it('wraps the client-island marker in a captioned figure', async () => {
    const { html } = await renderMarkdown(
      '## Mermaid Diagram: where each defense actually sits\n\n```mermaid\ngraph LR\n  A --> B\n```',
      { sheet: 13 },
    )
    expect(html).toContain('<figure class="hl-figure hl-diagram"')
    expect(html).toContain('class="mermaid-source"')
    expect(html).toContain('FIG. 13.1 — where each defense actually sits')
    expect(html).toContain('data-hl-expand')
  })

  it('reserves the space with a drawn placeholder, not a shimmer', async () => {
    const { html } = await renderMarkdown('```mermaid\ngraph LR\n  A --> B\n```', { sheet: 13 })
    expect(html).toContain('Rendering FIG. 13.1')
  })

  it('remaps the semantic fills to token-styled classes (B2)', async () => {
    const { html } = await renderMarkdown(
      '```mermaid\ngraph LR\n  A --> B\n  style A fill:#FFD9D9\n```',
    )
    expect(html).toContain('classDef fault')
    expect(html).not.toContain('#FFD9D9')
  })

  it('fails the build on a colour literal it does not know (B3)', async () => {
    await expect(
      renderMarkdown('```mermaid\ngraph LR\n  A --> B\n  style A fill:#010203\n```'),
    ).rejects.toThrow(/#010203/)
  })
})

describe('renderMarkdown — §6.7 code blocks', () => {
  it('gives a code block a language tag and a copy control', async () => {
    const { html } = await renderMarkdown('```python\nx = 1\n```')
    expect(html).toContain('<div class="hl-code" data-language="python">')
    expect(html).toContain('class="hl-code-lang">python<')
    expect(html).toContain('data-hl-copy')
  })

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

describe('renderMarkdown — §6.8 blockquotes', () => {
  it('lifts a bold lead-in ending in a colon into a label', async () => {
    const { html } = await renderMarkdown(
      '> **Boundary, not guardrail:** hash the tool list at approval time.',
    )
    expect(html).toContain('data-hl-labelled')
    expect(html).toContain('<p class="hl-quote-label">Boundary, not guardrail</p>')
    expect(html).toContain('hash the tool list at approval time.')
    expect(html).not.toContain('<strong>Boundary')
  })

  it('leaves a quote with no label as a plain pull-rule', async () => {
    const { html } = await renderMarkdown('> **A dated warning.** Google retired it.')
    expect(html).toContain('<blockquote class="hl-quote">')
    expect(html).not.toContain('hl-quote-label')
  })
})

describe('renderMarkdown — §6.3 links', () => {
  it('marks an external link without colouring its text', async () => {
    const { html } = await renderMarkdown('[OWASP](https://owasp.org/x)')
    expect(html).toContain('data-hl-external')
    expect(html).toContain('aria-hidden="true">↗</span>')
  })

  it('leaves an in-repo link unmarked', async () => {
    const { html } = await renderMarkdown('[Module 12](12_harness_engineering.md)')
    expect(html).not.toContain('data-hl-external')
  })
})
