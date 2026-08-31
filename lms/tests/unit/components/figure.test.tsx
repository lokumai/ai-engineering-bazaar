import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FIGURE_SELECTORS, MermaidFigure } from '@/components/figure/MermaidFigure'
import { Prose } from '@/components/course/Prose'
import { renderMarkdown } from '@/lib/content/render'

const FENCE = '```mermaid\ngraph LR\n    A[Untrusted] --> B[Policy]\n    style A fill:#FFD9D9\n```'

describe('MermaidFigure', () => {
  it('adds nothing to the served HTML: the figure is already in the prose', () => {
    expect(renderToStaticMarkup(<MermaidFigure />)).toBe('')
  })

  it('is mounted by the prose column, so any page with a figure gets it', () => {
    const markup = renderToStaticMarkup(<Prose html="" />)
    // The island itself renders nothing; what must be true is that Prose
    // renders without it throwing, and the column is marked for it to find.
    expect(markup).toContain('data-hl-prose')
  })
})

describe('the contract with render.ts', () => {
  it('looks for the markers the pipeline actually emits', async () => {
    const { html } = await renderMarkdown(FENCE, { sheet: 13 })

    expect(FIGURE_SELECTORS.SOURCES).toBe('[data-hl-prose] .mermaid-source[data-mermaid]')
    expect(html).toContain('<div class="mermaid-source" data-mermaid=')
    expect(html).toContain('<figure class="hl-figure hl-diagram"')
  })

  it('looks for the EXPAND control the caption strip actually carries', async () => {
    const { html } = await renderMarkdown(FENCE, { sheet: 13 })

    expect(FIGURE_SELECTORS.EXPAND).toBe('[data-hl-prose] [data-hl-expand]')
    expect(html).toContain('data-hl-expand')
    expect(html).toContain(
      '<figcaption class="hl-cap"><span class="hl-cap-label">FIG. 13.1',
    )
  })

  it('hands the island a source with no colour literal left in it (B2/B3)', async () => {
    const { html } = await renderMarkdown(FENCE, { sheet: 13 })
    const source = /data-mermaid="([^"]*)"/.exec(html)?.[1] ?? ''

    expect(source).toContain('classDef fault')
    expect(source).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/)
  })
})
