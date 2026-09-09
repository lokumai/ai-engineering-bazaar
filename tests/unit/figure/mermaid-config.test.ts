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

  it('sets type from the language’s one family and the spec size', () => {
    // M16: the language declares a single sans family, so there is no separate
    // display face for a diagram to reach for.
    expect(config.themeVariables).toMatchObject({
      fontFamily: 'var(--font-sans)',
      fontSize: '13px',
    })
  })

  it('never lets mermaid paint its own error graphic over the module', () => {
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
      expect(value.trim()).toMatch(/^(var\(--color-[a-z0-9-]+\)|none)$/)
    }
  })

  it('holds the radius at zero (T7)', () => {
    expect(MERMAID_THEME_CSS).toMatch(/rx:\s*0;/)
    expect(MERMAID_THEME_CSS).toMatch(/ry:\s*0;/)
  })

  /**
   * Every line is a hairline except a semantic node's own edge, which is 2px.
   * That is not decoration: a hue may never be the only carrier of meaning, and
   * a weight is the one second signal available inside a shape mermaid draws
   * (BRAINSTORM D33). The rule is that there are exactly two weights and the
   * heavier one belongs to the semantics, so a third would fail here.
   */
  it('draws a hairline everywhere, and one heavier weight for the semantics', () => {
    const widths = [...MERMAID_THEME_CSS.matchAll(/stroke-width:\s*([^;]+);/g)]
      .map(([, value]) => value.trim())
    expect(widths.length).toBeGreaterThan(0)
    expect([...new Set(widths)].sort()).toEqual(['1px', '2px'])
  })

  /**
   * M16 changed what a semantic binds to. The retired palette gave each one a
   * base, an ink and a pale wash, so the old rule was "its own token pair" —
   * a wash for the fill and a base for the stroke. This language has no tint
   * scale, so the semantic rides the EDGE and the fill stays the node's own
   * (BRAINSTORM D33). What still has to hold is that all four are bound, each
   * to a stroke of its own, and that none of them paints a fill.
   */
  it('binds each of the four semantic classes to an edge, and to no fill', () => {
    for (const name of MERMAID_CLASSES) {
      expect(MERMAID_THEME_CSS).toContain(`.node.${name} rect`)

      const block = new RegExp(`\\.node\\.${name} rect[^{]*\\{([^}]*)\\}`, 'g')
      const declarations = [...MERMAID_THEME_CSS.matchAll(block)].map(([, body]) => body)
      expect(declarations.length, `${name} has no rule block`).toBeGreaterThan(0)

      const all = declarations.join('\n')
      expect(all, `${name} does not stroke`).toMatch(/stroke:\s*var\(--color-[a-z0-9-]+\)/)
      expect(all, `${name} paints a fill, which D33 refuses`).not.toMatch(/fill:/)
    }

    // Each one distinct: two semantics sharing a hue would say the same thing
    // twice and leave one of the four unsayable.
    const strokes = MERMAID_CLASSES.map((name) => {
      const block = new RegExp(`\\.node\\.${name} rect[^{]*\\{[^}]*stroke:\\s*(var\\([^)]*\\))`)
      return block.exec(MERMAID_THEME_CSS)?.[1] ?? name
    })
    expect(new Set(strokes).size).toBe(MERMAID_CLASSES.length)
  })

  it('gives labels an ink that both themes can read (§10.1)', () => {
    expect(MERMAID_THEME_CSS).toMatch(/\.nodeLabel[^{]*\{[^}]*var\(--color-on-surface\)/)
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
