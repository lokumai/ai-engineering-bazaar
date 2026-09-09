import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrastRatio } from '@/lib/color/contrast'
import { hexToOklch } from '@/lib/color/oklch'
import { CATEGORIES } from '@/lib/content/curriculum-file'
import { readDesignToken } from '@/lib/content/code-theme'
import { CATEGORY_HUES } from '@/lib/record/report'

/**
 * The five-hue `category-*` series, checked against what it promises.
 *
 * DESIGN.md: "The five-hue `category-*` series exists to tell groups apart at a
 * glance. Each hue is bound to one group and then reused for that group's
 * marker, its current-state edge and its active item — but always alongside a
 * second signal." Two things have to be true for that to work: a viewer must be
 * able to see each hue against every surface it is painted on, and must be able
 * to tell any two of them apart. Both are computed here from the shipped
 * tokens, so a hue edited without re-deriving fails rather than being audited.
 *
 * ## What this file replaced, and what did not survive (M16)
 *
 * It was `tests/unit/color/lokum.test.ts`, 102 tests over `--cat-<slug>` and
 * `--cat-<slug>-half` in `src/app/lokum.css` — a file M16 deleted. Four of its
 * rules were about the retired palette specifically, and each is recorded here
 * rather than dropped in silence, because three of them were **measured false**
 * against the mockup that is now the specification:
 *
 * - **"Every hue at one lightness, so no category outranks another."** MEASURED:
 *   the mockup's five span L 0.315 to 0.657 in Oklch. Cobalt is the darkest by a
 *   long way. The T4 series is not lightness-uniform and DESIGN.md claims no
 *   such thing, so enforcing it would fail against the specification itself.
 * - **"Halves the chroma exactly."** There is no half-chroma sibling. The
 *   language has no tint scale at all, which is what BRAINSTORM D33 settled: a
 *   semantic or category hue rides an edge, it never becomes a pale fill.
 * - **"Keeps 20° clear of the accent pen."** MEASURED: the primary *is*
 *   `category-2`, `#282864` — the cobalt is simultaneously the bar, the band
 *   ground, the link colour and level two's hue. That is the mockup's own
 *   choice, and 0° of separation is therefore correct rather than a defect.
 * - **"Inside sRGB at both chromas."** A hex literal is in gamut by
 *   construction. The rule became vacuous the moment the token layer stopped
 *   being `oklch()`, and a vacuous rule reads as coverage.
 *
 * The rule that mattered most did survive, and it is the last case below: the
 * exported RECORD OF WORK inlines its own copy of the five hues, because it is
 * opened from `file://` with no stylesheet to import, and a copy is a thing that
 * drifts.
 */

const LANGUAGE = join(import.meta.dirname, '../../../src/design/bazaar.css')
const css = readFileSync(LANGUAGE, 'utf8')

/** The `@theme` block only: the light palette, before any `.dark` override. */
const themeBlock = css.slice(css.indexOf('@theme {'), css.indexOf('\n@layer base'))

/** The series is closed at five. `1` through `5`, and nothing else. */
const ORDINALS = [1, 2, 3, 4, 5] as const

type Theme = 'light' | 'dark'
const THEMES: readonly Theme[] = ['light', 'dark']

function hue(ordinal: number, theme: Theme): string {
  return readDesignToken(`--color-category-${ordinal}`)[theme]
}

const pairs = ORDINALS.flatMap((a, i) => ORDINALS.slice(i + 1).map((b) => ({ a, b })))

describe('the series is closed at five, and declared once', () => {
  it('declares exactly the five, each once, in the light theme', () => {
    const declared = [...themeBlock.matchAll(/(--color-category-\d+)\s*:/g)].map((m) => m[1])
    expect(declared).toEqual(ORDINALS.map((n) => `--color-category-${n}`))
  })

  /**
   * DESIGN.md, Do's and Don'ts: "Don't invent a sixth hue, re-order the series,
   * or use a category hue for a link, a button or a focus ring." A sixth is the
   * one of those three that a stylesheet can introduce on its own.
   */
  it('has no sixth hue anywhere in the language', () => {
    expect(css).not.toMatch(/--color-category-(?:[6-9]|\d\d)/)
  })

  it('binds one hue per group the curriculum actually has', () => {
    // Not a count written down: the series is as long as the course is wide,
    // and if a level were added the language would owe it a hue.
    expect(ORDINALS).toHaveLength(CATEGORIES.length)
  })
})

describe('a viewer can see each hue on every surface it is painted on', () => {
  const RESTING = ['surface', 'surface-raised'] as const

  const resting = THEMES.flatMap((theme) =>
    RESTING.flatMap((ground) =>
      ORDINALS.map((ordinal) => ({
        label: `category-${ordinal} on ${ground}, ${theme}`,
        ordinal,
        ground,
        theme,
      })),
    ),
  )

  /**
   * 3:1 is the WCAG floor for a graphical object, which is what each of these
   * is: a marker, a leading edge, a filled active item. None of them carries
   * text — a hue that had to would take 4.5:1, and the language never asks one
   * to.
   */
  it.each(resting)('$label clears 3:1', ({ ordinal, ground, theme }) => {
    const against = readDesignToken(`--color-${ground}`)[theme]
    expect(contrastRatio(hue(ordinal, theme), against)).toBeGreaterThanOrEqual(3)
  })

  /**
   * `surface-sunken` is the hover and pressed fill, not a resting surface
   * (DESIGN.md, Colors), and two of the five do not clear 3:1 against it.
   * MEASURED, light theme: `category-1` reaches 2.92 and `category-4` 2.32,
   * against 3.90 and 3.09 on the page ground.
   *
   * That is not a defect, and the reason is what WCAG actually requires: a
   * graphical object needs 3:1 against an **adjacent** colour, not against
   * every colour in the interface. Where the language paints a hue on a sunken
   * row it paints it as that row's leading edge, so the edge's outer side sits
   * on the page ground and its inner side on the sunken fill — one boundary is
   * enough, and the ground is the one that clears.
   *
   * So the rule is the adjacency rule, and it still bites: a hue that fell
   * below 3:1 on the sunken fill **and** on the ground would have no boundary
   * left to be seen at, and this fails.
   */
  it.each(THEMES)('is visible at a boundary on the hover fill too, in %s', (theme) => {
    const sunken = readDesignToken('--color-surface-sunken')[theme]
    const ground = readDesignToken('--color-surface')[theme]
    const invisible: string[] = []
    for (const ordinal of ORDINALS) {
      const value = hue(ordinal, theme)
      const best = Math.max(contrastRatio(value, sunken), contrastRatio(value, ground))
      if (best < 3) invisible.push(`category-${ordinal}: ${best.toFixed(2)}`)
    }
    expect(invisible).toEqual([])
  })
})

describe('a viewer can tell any two of them apart', () => {
  /**
   * 20° of Oklch hue is the floor, not the measurement. MEASURED on the
   * shipped series: the closest pair sits 40.4° apart, so there is real headroom
   * — and a sixth hue squeezed into the wheel, or one nudged toward its
   * neighbour, would eat it before this failed.
   *
   * Hue alone is checked rather than a full perceptual distance because hue is
   * the axis the series uses to mean anything. Two hues at the same angle and
   * different lightnesses would read as one group in two states, which is
   * exactly the confusion the series exists to avoid.
   */
  it.each(THEMES)('separates all ten pairs by at least 20° in %s', (theme) => {
    const tooClose: string[] = []
    for (const { a, b } of pairs) {
      const first = hexToOklch(hue(a, theme))
      const second = hexToOklch(hue(b, theme))
      const apart = Math.abs(first.h - second.h)
      const separation = Math.min(apart, 360 - apart)
      if (separation < 20) {
        tooClose.push(`category-${a} and category-${b}: ${separation.toFixed(1)}°`)
      }
    }
    expect(tooClose).toEqual([])
  })

  it.each(THEMES)('gives every hue real chroma in %s, so its angle means something', (theme) => {
    for (const ordinal of ORDINALS) {
      // A near-neutral has no hue to be separated by, so the rule above would
      // pass on a grey that had quietly lost its colour.
      expect(hexToOklch(hue(ordinal, theme)).C, `category-${ordinal}`)
        .toBeGreaterThan(0.02)
    }
  })
})

describe('the exported record carries the same five, and no others', () => {
  /**
   * The one copy of this palette that cannot read the token layer: a RECORD OF
   * WORK is opened from `file://` with an opaque origin and no stylesheet to
   * import, so `src/lib/record/report.ts` inlines the hues. A wrong value there
   * is invisible — the document would just be a slightly different colour from
   * the site, in a file nobody can reissue.
   */
  it('matches the language, in curriculum order', () => {
    const expected = Object.fromEntries(
      CATEGORIES.map((category, index) => [
        category.slug,
        hue(index + 1, 'light').toUpperCase(),
      ]),
    )
    const actual = Object.fromEntries(
      Object.entries(CATEGORY_HUES).map(([slug, value]) => [slug, value.toUpperCase()]),
    )
    expect(actual).toEqual(expected)
  })

  it('names every category the curriculum has, and nothing else', () => {
    expect(Object.keys(CATEGORY_HUES).sort())
      .toEqual(CATEGORIES.map((category) => category.slug).sort())
  })
})
