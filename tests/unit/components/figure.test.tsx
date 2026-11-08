import { readFileSync } from 'node:fs'
import { join } from 'node:path'
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
    // M11 — the third class is the dark slab, which is a local theme override
    // rather than a set of diagram colours: `rail.css` says why.
    expect(html).toContain('<figure class="bz-fig bz-diagram"')
  })

  it('looks for the EXPAND control the caption strip actually carries', async () => {
    const { html } = await renderMarkdown(FENCE, { sheet: 13 })

    expect(FIGURE_SELECTORS.EXPAND).toBe('[data-hl-prose] [data-hl-expand]')
    expect(html).toContain('data-hl-expand')
    expect(html).toContain(
      '<figcaption class="bz-caption"><span class="bz-caption-label">FIG. 13.1',
    )
  })

  it('hands the island a source with no colour literal left in it (B2/B3)', async () => {
    const { html } = await renderMarkdown(FENCE, { sheet: 13 })
    const source = /data-mermaid="([^"]*)"/.exec(html)?.[1] ?? ''

    expect(source).toContain('classDef fault')
    expect(source).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/)
  })

  it('gives every diagram the code blocks\' copy control, in its tool strip beside EXPAND', async () => {
    const { html } = await renderMarkdown(`${FENCE}\n\n\`\`\`python\nprint(1)\n\`\`\``, { sheet: 13 })
    const strip = /<div class="bz-figure-tools"[^>]*>([\s\S]*?)<figcaption/.exec(html)?.[1] ?? ''
    const controls = (markup: string) =>
      /<button type="button" class="bz-tool bz-copy" data-hl-copy="" aria-label="Copy code" title="Copy code">[\s\S]*?<\/button>/.exec(markup)?.[0]

    const onDiagram = controls(strip)
    const onCode = controls(html.slice(html.indexOf('class="bz-slab"')))
    expect(onDiagram, 'no copy control in the diagram strip').toBeDefined()
    // One component: the diagram's is byte for byte the code block's.
    expect(onDiagram).toBe(onCode)
    expect(strip.indexOf('data-hl-copy')).toBeLessThan(strip.indexOf('data-hl-expand'))
    expect(strip.indexOf('data-hl-copy')).toBeGreaterThan(strip.indexOf('data-hl-options="figures"'))
  })

  it('has the copy control read the Mermaid source the island draws from, and nothing else', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/shell/Affordances.tsx'), 'utf8')
    expect(source).toContain(".mermaid-source[data-mermaid]")
    expect(source).toContain('dataset.mermaid')
    // The drawing is never the text: the SVG is not read.
    expect(source).not.toMatch(/outerHTML|innerHTML|querySelector\(['"]svg/)
  })
})
