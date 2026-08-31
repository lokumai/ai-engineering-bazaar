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

describe('renderMarkdown — §6.9 images', () => {
  it('wraps an image in a captioned figure', async () => {
    const { html } = await renderMarkdown('![Naive RAG](./images/rag.png)', { sheet: 3 })
    expect(html).toContain('<figure class="hl-figure hl-image"')
    expect(html).toContain('FIG. 3.1 — Naive RAG')
    expect(html).not.toContain('<p><img')
  })

  it('prefers the author\'s italic caption line to the alt text', async () => {
    const { html } = await renderMarkdown(
      '![Agent Analogy](./images/a.png)  \n*LLM as brain, agent as body!*',
      { sheet: 6 },
    )
    expect(html).toContain('FIG. 6.1 — LLM as brain, agent as body!')
    expect(html).toContain('alt="Agent Analogy"')
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
