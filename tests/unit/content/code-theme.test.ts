import { describe, expect, it } from 'vitest'
import { oklchToHex } from '@/lib/color/oklch'
import {
  CODE_TOKEN_ROLES,
  DEFAULT_TOKEN,
  codeThemes,
  readDesignToken,
} from '@/lib/content/code-theme'

describe('readDesignToken', () => {
  /**
   * The function under test is the READER, not the palette. Pinning
   * `--color-ink`'s value here made a palette change (M9) a failure in a file
   * about parsing, so what is asserted is the shape: a value for each theme,
   * both real oklch triples, and the dark one lighter than the light one —
   * which is the one thing that would be wrong if the two were swapped.
   */
  it('reads a token out of globals.css in both themes', () => {
    const ink = readDesignToken('--color-ink')
    expect(Object.keys(ink).sort()).toEqual(['dark', 'light'])
    for (const value of [ink.light, ink.dark]) {
      expect(value).toMatch(/^oklch\(\s*[\d.]+\s+[\d.]+\s+[\d.]+\s*\)$/)
    }
    const lightnessOf = (css: string) => Number(/^oklch\(\s*([\d.]+)/.exec(css)?.[1])
    expect(lightnessOf(ink.dark)).toBeGreaterThan(lightnessOf(ink.light))
  })

  it('fails loudly rather than inventing a value for an unknown token', () => {
    expect(() => readDesignToken('--color-not-a-token')).toThrow(/--color-not-a-token/)
  })
})

describe('codeThemes', () => {
  const { light, dark } = codeThemes()

  /**
   * M11 moved the code ground onto the slab, and the budget with it: five
   * hues, closed, all of them `--color-slab-*`. The rule this asserts is not
   * the number — it is that the theme carries EXACTLY the roles the table
   * declares and gives each one its own colour, so a sixth added without a
   * DESIGN.md entry, or two roles sharing a hue, fails here.
   */
  it('carries one distinct colour per declared role, and no more', () => {
    expect(light.settings).toHaveLength(CODE_TOKEN_ROLES.length)
    expect(dark.settings).toHaveLength(CODE_TOKEN_ROLES.length)
    expect(new Set(light.settings.map((s) => s.settings.foreground)).size)
      .toBe(CODE_TOKEN_ROLES.length)
  })

  it('derives every colour from a design token, never a literal', () => {
    const expected = (name: string, theme: 'light' | 'dark') =>
      oklchToHex(readDesignToken(name)[theme])

    expect(light.fg).toBe(expected(DEFAULT_TOKEN, 'light'))
    expect(dark.fg).toBe(expected(DEFAULT_TOKEN, 'dark'))
    for (const role of CODE_TOKEN_ROLES) {
      const found = light.settings.find((s) => s.scope[0] === role.scope[0])
      expect(found?.settings.foreground).toBe(expected(role.token, 'light'))
    }
  })

  /**
   * §6.7 emphasised keywords by WEIGHT and gave them the default foreground,
   * because a fifth hue in the page's own palette was a hue too many. On the
   * slab the hue is the slab's, and both signals are spent: the weight is kept
   * — it is what made the four-colour theme readable — and the keyword takes
   * `slab-keyword`. What must still hold is that the weight is there, because
   * a hue alone is the thing DESIGN.md refuses.
   */
  it('emphasises keywords by weight as well as by the slab hue', () => {
    const keyword = light.settings.find((s) => s.scope.includes('keyword'))
    expect(keyword?.settings.fontStyle).toBe('bold')
    expect(keyword?.settings.foreground)
      .toBe(oklchToHex(readDesignToken('--color-slab-keyword').light))
  })

  /** The slab does not flip, so neither does the theme built from it. */
  it('builds the same colours in both variants, because the slab is fixed', () => {
    expect(light.settings.map((s) => s.settings.foreground))
      .toEqual(dark.settings.map((s) => s.settings.foreground))
    expect(light.fg).toBe(dark.fg)
  })

  it('never sets a token italic — mono italic is forbidden (§3.4)', () => {
    for (const theme of [light, dark]) {
      for (const rule of theme.settings) {
        expect(rule.settings.fontStyle ?? '').not.toContain('italic')
      }
    }
  })

  it('paints no background, so the slab ground shows through', () => {
    expect(light.bg).toBe('#00000000')
    expect(dark.bg).toBe('#00000000')
  })

  it('names the two variants distinctly so the dual theme can switch', () => {
    expect(light.name).not.toBe(dark.name)
  })
})
