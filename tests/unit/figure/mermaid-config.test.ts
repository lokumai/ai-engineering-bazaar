import { describe, expect, it } from 'vitest'
import { MERMAID_CLASSES } from '@/lib/content/mermaid'
import {
  MERMAID_THEME_CSS,
  expandRenderId,
  figureRenderId,
  mermaidConfig,
} from '@/lib/figure/mermaid-config'

const config = mermaidConfig()

describe('mermaidConfig — §6.10 B4, verbatim', () => {
  it('never starts itself: the island decides what renders and when', () => {
    expect(config.startOnLoad).toBe(false)
  })

  it('uses the base theme, which is the only one themeCSS can fully override', () => {
    expect(config.theme).toBe('base')
    expect(config.securityLevel).toBe('strict')
  })

  it('draws straight edges at the spec spacing', () => {
    expect(config.flowchart).toMatchObject({
      curve: 'linear',
      htmlLabels: false,
      padding: 12,
      nodeSpacing: 40,
      rankSpacing: 48,
    })
  })

  it('sets type from the display family and the spec size', () => {
    expect(config.themeVariables).toMatchObject({
      fontFamily: 'var(--font-display)',
      fontSize: '13px',
    })
  })

  it('never lets mermaid paint its own error graphic over the sheet', () => {
    expect(config.suppressErrorRendering).toBe(true)
  })

  it('carries the theme CSS', () => {
    expect(config.themeCSS).toBe(MERMAID_THEME_CSS)
  })
})

describe('MERMAID_THEME_CSS — the 0ms theme switch (§9.2)', () => {
  it('emits no colour literal at all, so the SVG can only inherit', () => {
    expect(MERMAID_THEME_CSS).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/)
    expect(MERMAID_THEME_CSS).not.toMatch(/\b(oklch|rgb|rgba|hsl|hsla)\(/)
    expect(MERMAID_THEME_CSS).not.toMatch(
      /:\s*(white|black|red|green|blue|yellow|orange|pink|grey|gray)\b/,
    )
  })

  it('paints every colour from a design token', () => {
    const values = [...MERMAID_THEME_CSS.matchAll(/(?:fill|stroke|color):\s*([^;]+);/g)]
    expect(values.length).toBeGreaterThan(0)
    for (const [, value] of values) {
      expect(value.trim()).toMatch(/^(var\(--color-[a-z-]+\)|none)$/)
    }
  })

  it('holds the radius at zero (T7)', () => {
    expect(MERMAID_THEME_CSS).toMatch(/rx:\s*0;/)
    expect(MERMAID_THEME_CSS).toMatch(/ry:\s*0;/)
  })

  it('draws every line as a 1px hairline', () => {
    const widths = [...MERMAID_THEME_CSS.matchAll(/stroke-width:\s*([^;]+);/g)]
    expect(widths.length).toBeGreaterThan(0)
    for (const [, value] of widths) expect(value.trim()).toBe('1px')
  })

  it('binds each of B2’s four semantic classes to its own token pair', () => {
    for (const name of MERMAID_CLASSES) {
      expect(MERMAID_THEME_CSS).toContain(`.node.${name} rect`)
      expect(MERMAID_THEME_CSS).toContain(`var(--color-${name}-wash)`)
      expect(MERMAID_THEME_CSS).toContain(`var(--color-${name})`)
    }
  })

  it('gives labels an ink that both themes can read (§10.1)', () => {
    expect(MERMAID_THEME_CSS).toMatch(/\.nodeLabel[^{]*\{[^}]*var\(--color-ink\)/)
  })
})

describe('render ids', () => {
  it('are unique per figure, so two diagrams cannot share marker ids', () => {
    expect(figureRenderId(0)).not.toBe(figureRenderId(1))
  })

  it('give the expanded copy its own id rather than duplicating the page’s', () => {
    expect(expandRenderId(0)).not.toBe(figureRenderId(0))
  })

  it('are valid CSS identifiers, because mermaid puts them in url(#id)', () => {
    for (const id of [figureRenderId(3), expandRenderId(3)]) {
      expect(id).toMatch(/^[A-Za-z][A-Za-z0-9-]*$/)
    }
  })
})
