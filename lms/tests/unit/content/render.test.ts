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
