import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readDesignToken } from '@/lib/content/code-theme'

/**
 * Who owns a theme, and the one palette that refuses to flip.
 *
 * ## What this file was, and what M16 kept
 *
 * It read every `.css` in `src/app/` and held two rules. The first named
 * eleven control selectors by hand and required each to border with
 * `--color-line-control`; the second required every *local* dark-palette
 * override — `rail.css` had one for the figure, `figure.css` one for the EXPAND
 * overlay — to equal the `.dark` block in `globals.css`, value for value.
 *
 * Both rules were about a system with the palette in eleven places. The
 * language has it in one, `src/design/bazaar.css`, with both themes in the same
 * file, so the second rule becomes something stronger and simpler: **a surface
 * stylesheet may not theme anything.** No local override to keep in step,
 * because no local override may exist. That is enforceable today and it closes
 * the drift the old rule could only detect.
 *
 * The first rule is not restored yet, and deliberately. `--color-line-control`
 * has no successor: the language separates a hairline from an interactive edge
 * by colour, `line` against `line-strong`, and `line-strong` measures 2.00:1 on
 * the ground — under SC 1.4.11's 3:1 for anything required to identify a
 * component. That question is stage 1's, answered with the shell's real
 * buttons, fields and toggles in front of us rather than invented now
 * (`logs/PROGRESS.md`, M16). What stands in the meantime is the existence-guarded
 * rule at the bottom of this file, and the ordering rule in
 * `tests/unit/color/contrast.test.ts`.
 */

const LANGUAGE = join(import.meta.dirname, '../../../src/design/bazaar.css')
const APP_DIR = join(import.meta.dirname, '../../../src/app')
const NOT_A_SURFACE = new Set(['globals.css', 'lokum-modules.css'])

const language = readFileSync(LANGUAGE, 'utf8')

interface Surface {
  readonly name: string
  readonly css: string
}

const SURFACES: Surface[] = readdirSync(APP_DIR)
  .filter((name) => name.endsWith('.css') && !NOT_A_SURFACE.has(name))
  .sort()
  .map((name) => ({ name, css: readFileSync(join(APP_DIR, name), 'utf8') }))

/** Every `--color-slab-*` the language declares, from the light block. */
const themeBlock = language.slice(
  language.indexOf('@theme {'),
  language.indexOf('\n@layer base'),
)
const SLAB_TOKENS = [
  ...new Set([...themeBlock.matchAll(/(--color-slab-[a-z-]+)\s*:/g)].map((m) => m[1])),
]

describe('the slab is one ground in both themes', () => {
  it('is reading the tokens it claims to check', () => {
    // A comparison over an empty list passes. The slab has a whole
    // sub-palette — ground, raised, two inks, two lines, an arrow and five
    // syntax roles — so a handful means the extractor broke.
    expect(SLAB_TOKENS.length).toBeGreaterThan(10)
  })

  /**
   * `src/lib/content/code-theme.ts` reads six of these positionally — before
   * the `.dark` index is the light value, after it is the dark one — and throws
   * if either is missing. So a slab token declared in only one theme is a build
   * failure rather than a test failure, and this is the check that catches it
   * first and says which token.
   */
  it.each(SLAB_TOKENS)('%s is declared in both themes', (token) => {
    expect(() => readDesignToken(token)).not.toThrow()
  })

  /**
   * A code block and a figure are dark in both themes on purpose: it is the one
   * place the page goes dark, because it separates what the machine says from
   * what the author says (DESIGN.md, Overview). A slab token that differed
   * between themes would show as a code block changing colour with the page.
   */
  it.each(SLAB_TOKENS)('%s holds the same value in both themes', (token) => {
    const { light, dark } = readDesignToken(token)
    expect(dark).toBe(light)
  })
})

describe('the language owns theming, and nothing else does', () => {
  /**
   * One palette, one file, both themes. The old system had the dark values in
   * three places and a test whose whole job was to keep the copies equal; this
   * refuses the copies instead. A surface that needs a colour to change with
   * the theme asks for a token that already does.
   */
  it('declares the dark theme exactly once, in the language', () => {
    expect(language).toMatch(/^\.dark\s*\{/m)
    const opened = [...language.matchAll(/^\.dark\s*\{/gm)]
    expect(opened, 'more than one .dark block in the language').toHaveLength(1)
  })

  it('lets no surface stylesheet theme anything', () => {
    const offenders = SURFACES
      .filter(({ css }) => /(^|[\s,>~+])\.dark\b/m.test(css.replace(/\/\*[\s\S]*?\*\//g, ' ')))
      .map(({ name }) => name)
    expect(
      offenders,
      'a surface stylesheet carrying its own .dark rules. The language holds '
      + 'both themes; a surface that needs a colour to change with the theme '
      + 'spends a token that already does.',
    ).toEqual([])
  })

  it('lets no surface stylesheet redeclare a palette token', () => {
    const offenders: string[] = []
    for (const { name, css } of SURFACES) {
      const bare = css.replace(/\/\*[\s\S]*?\*\//g, ' ')
      for (const match of bare.matchAll(/(--color-[a-z0-9-]+)\s*:/g)) {
        offenders.push(`${name}: ${match[1]}`)
      }
    }
    expect(
      offenders,
      'a surface stylesheet declaring a --color-* token. Every colour in the '
      + 'system is declared once, in src/design/bazaar.css.',
    ).toEqual([])
  })
})

describe('an interactive edge, once a surface draws one', () => {
  const bordered = /border[a-z-]*:\s*[^;]*var\(--color-line(?:-strong)?\)/

  /**
   * The narrow version of the retired rule, and the part of it that does not
   * depend on the open 3:1 question: an interactive or hovered edge takes
   * `line-strong`, and a grouping edge takes `line`. Getting them the wrong way
   * round makes a static group look pressable and a control look like a divider,
   * which is a defect regardless of what either ratio measures.
   */
  it.skipIf(SURFACES.length === 0)('never borders a control with the grouping line', () => {
    const offenders: string[] = []
    for (const { name, css } of SURFACES) {
      const bare = css.replace(/\/\*[\s\S]*?\*\//g, ' ')
      for (const [, selector, block] of bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const target = selector.trim()
        const interactive = /(?:^|[\s,.#\[])(?:button|input|textarea|select|a)\b|btn|toggle|field|chip|fold/i
          .test(target)
        if (!interactive) continue
        if (!bordered.test(block)) continue
        if (/var\(--color-line\)/.test(block)) {
          offenders.push(`${name}: ${target}`)
        }
      }
    }
    expect(
      offenders,
      'these border an interactive element with --color-line, the grouping '
      + 'weight. An interactive or hovered edge takes --color-line-strong.',
    ).toEqual([])
  })
})
