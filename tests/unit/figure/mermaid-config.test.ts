import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MERMAID_CLASSES } from '@/lib/content/mermaid'
import {
  MERMAID_THEME_CSS,
  expandRenderId,
  figureRenderId,
  mermaidConfig,
} from '@/lib/figure/mermaid-config'
import {
  DEFAULT_DIAGRAM_THEME,
  DIAGRAM_THEMES,
  DIAGRAM_THEME_IDS,
} from '@/lib/reading/diagram-themes'

describe('mermaidConfig', () => {
  it('never starts itself: the island decides what renders and when', () => {
    expect(mermaidConfig().startOnLoad).toBe(false)
  })

  it('draws in Mermaid’s own default theme for a reader who has not chosen', () => {
    expect(DEFAULT_DIAGRAM_THEME).toBe('default')
    expect(mermaidConfig().theme).toBe('default')
  })

  it('falls back to the default for anything that is not a theme it offers', () => {
    // The stamp on `<html>` is untrusted: it can be missing, stale, or hand-edited, and it
    // is read by `MermaidFigure` as it stands. `base` and `null` are Mermaid's, and not on
    // offer: `base` is the theme the retired repaint was built on.
    for (const value of [undefined, null, '', 'base', 'null', 'night', 'paper', 'blueprint', 'FOREST', 7, {}]) {
      expect(mermaidConfig(value).theme, JSON.stringify(value)).toBe('default')
    }
  })

  it('passes every offered theme through under its own name, with its look and its dark mode', () => {
    for (const theme of DIAGRAM_THEMES) {
      const config = mermaidConfig(theme.id)
      expect(config.theme, theme.id).toBe(theme.id)
      expect(config.look, theme.id).toBe(theme.look)
      expect((config.themeVariables as { darkMode?: boolean }).darkMode, theme.id).toBe(theme.darkMode)
    }
    // A look is only ever the neo one, and a dark mode only ever on a dark tone: a theme
    // given either by accident would draw wrongly on its frame.
    for (const theme of DIAGRAM_THEMES) {
      if (theme.look) expect(theme.look).toBe('neo')
      expect(theme.darkMode === true, theme.id).toBe(theme.tone === 'dark')
    }
  })

  it('offers every theme Mermaid ships, except the two that are not for a reader', () => {
    // Read from the installed package, so a Mermaid upgrade that adds a theme fails here
    // until the menu has it (and one that renames a theme fails the type check).
    const types = readInstalled('mermaid/dist/config.type.d.ts')
    const union = /theme\?:\s*([^;]+);/.exec(types)?.[1] ?? ''
    const shipped = [...union.matchAll(/'([a-z-]+)'/g)].map(([, id]) => id)
    expect(shipped.length).toBeGreaterThan(5)
    expect([...DIAGRAM_THEME_IDS].sort()).toEqual(shipped.filter((id) => id !== 'base' && id !== 'null').sort())
  })

  it('lists the default first, once, with a name and a tone for each', () => {
    expect(DIAGRAM_THEME_IDS[0]).toBe(DEFAULT_DIAGRAM_THEME)
    expect(new Set(DIAGRAM_THEME_IDS).size).toBe(DIAGRAM_THEME_IDS.length)
    expect(DIAGRAM_THEMES.map((theme) => theme.id)).toEqual([...DIAGRAM_THEME_IDS])
    for (const theme of DIAGRAM_THEMES) {
      expect(theme.name, theme.id).not.toBe('')
      expect(['light', 'dark'], theme.id).toContain(theme.tone)
    }
  })

  it('keeps the draw safe and the page whole', () => {
    const config = mermaidConfig()
    expect(config.securityLevel).toBe('strict')
    // Never let mermaid paint its own error graphic over the module.
    expect(config.suppressErrorRendering).toBe(true)
  })

  it('sets one family and size of type for every theme', () => {
    for (const theme of DIAGRAM_THEMES) {
      expect(mermaidConfig(theme.id).themeVariables, theme.id).toMatchObject({
        fontFamily: 'var(--font-sans)',
        fontSize: '13px',
      })
    }
  })

  it('does not fight a theme over its geometry', () => {
    // The retired repaint forced straight edges and square corners on every diagram, which
    // is what made a chosen theme look like the site instead of itself.
    const flowchart = mermaidConfig().flowchart as Record<string, unknown>
    expect(flowchart.curve).toBeUndefined()
    expect(MERMAID_THEME_CSS).not.toMatch(/\brx\s*:|\bry\s*:/)
  })

  it('carries the semantic CSS', () => {
    expect(mermaidConfig().themeCSS).toBe(MERMAID_THEME_CSS)
  })
})

describe('MERMAID_THEME_CSS: the four semantic edges, and nothing else', () => {
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
      expect(value.trim()).toMatch(/^var\(--color-[a-z0-9-]+\)$/)
    }
  })

  it('paints no fill, no label and no arrowhead: those are the chosen theme’s', () => {
    expect(MERMAID_THEME_CSS).not.toMatch(/\bfill\s*:/)
    expect(MERMAID_THEME_CSS).not.toMatch(/(^|[\s;{])color\s*:/)
    expect(MERMAID_THEME_CSS).not.toMatch(/marker|nodeLabel|edgeLabel|\btext\b/)
  })

  /**
   * One weight, and it belongs to the semantics: a hue may never be the only carrier of
   * meaning, and a weight is the one second signal available inside a shape mermaid draws
   * (BRAINSTORM D33). A theme draws every other line at its own weight.
   */
  it('gives a semantic node one heavier edge', () => {
    const widths = [...MERMAID_THEME_CSS.matchAll(/stroke-width:\s*([^;]+);/g)].map(([, value]) => value.trim())
    expect(widths).toEqual(['2px'])
  })

  /**
   * M16 changed what a semantic binds to: the EDGE, with the fill left to the node
   * (BRAINSTORM D33), and it still does with Mermaid's theme under it. All four are bound,
   * each to a stroke of its own, and none paints a fill.
   */
  it('binds each of the four semantic classes to a stroke of its own, for nodes and for clusters', () => {
    for (const name of MERMAID_CLASSES) {
      expect(MERMAID_THEME_CSS).toContain(`.node.${name} rect`)
      expect(MERMAID_THEME_CSS, `${name} has no cluster rule`).toContain(`.cluster.${name} rect`)
    }
    const strokes = MERMAID_CLASSES.map((name) => {
      const block = new RegExp(`\\.node\\.${name} rect[^{]*\\{[^}]*stroke:\\s*(var\\([^)]*\\))`)
      return block.exec(MERMAID_THEME_CSS)?.[1] ?? name
    })
    expect(new Set(strokes).size).toBe(MERMAID_CLASSES.length)
    for (const stroke of strokes) expect(stroke).toMatch(/^var\(--color-/)
  })
})

describe('render ids', () => {
  it('gives the page copy and the overlay copy ids of their own', () => {
    expect(figureRenderId(3)).not.toBe(expandRenderId(3))
    expect(figureRenderId(3)).not.toBe(figureRenderId(4))
  })
})

function readInstalled(path: string): string {
  return readFileSync(join(process.cwd(), 'node_modules', path), 'utf8')
}
