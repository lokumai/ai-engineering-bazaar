import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The discipline a SURFACE stylesheet is held to, as opposed to the language.
 *
 * `src/design/bazaar.css` is the design language: it is a transcription of
 * `playground/01-theme-T4-ground-G3-powder.html`, so literal hex values,
 * literal radii and the two shadows the language allows all belong in it, and
 * `tests/unit/design/transcription.test.ts` is what holds it to the mockup.
 *
 * A surface stylesheet is a different kind of file. Each M16 stage authors one
 * for the surface it rebuilds, and its whole job is to arrange primitives the
 * language already defines. So it may spend tokens and it may not invent
 * values — a hand-typed `6px` is how a radius scale becomes twelve values, and
 * it is invisible in review.
 *
 * ## Where these rules came from
 *
 * They were `describe('module.css holds the line')` in
 * `tests/unit/components/sheet.test.tsx`, pointed at `src/app/sheet.css`, one
 * of the eleven stylesheets M16 deleted. Moving them here does two things: it
 * puts a rule about stylesheets in a file about stylesheets, and it makes the
 * set of files **discovered** rather than named, so a sheet a later stage adds
 * is held to all of this the moment it lands and nobody has to remember to add
 * it. At the end of stage 0 there are no surface stylesheets yet, which is why
 * these report as skipped rather than as passing.
 *
 * Two of the original rules did not survive the design and are recorded rather
 * than quietly dropped. **The ISO 128 dashed-line rule** (every
 * `repeating-linear-gradient` dashed exactly `0 3px, transparent 3px 5px`) was
 * the drawing-set vocabulary; the T4 language has one dashed rule, ochre, under
 * a section heading, and it lives in the language. **The annotation-pen rule**
 * named `--color-accent`, a token the language does not have. What replaced the
 * second is the Don't that DESIGN.md actually states: a category hue binds to a
 * group, and it may not be spent on a link, a button or a focus ring.
 */

const APP_DIR = join(import.meta.dirname, '../../../src/app')

/** The entry point and the generated per-module sheet are not surfaces. */
const NOT_A_SURFACE = new Set(['globals.css', 'lokum-modules.css'])

interface Surface {
  readonly name: string
  readonly css: string
}

function surfaces(): Surface[] {
  return readdirSync(APP_DIR)
    .filter((name) => name.endsWith('.css') && !NOT_A_SURFACE.has(name))
    .sort()
    .map((name) => ({ name, css: readFileSync(join(APP_DIR, name), 'utf8') }))
}

const SURFACES = surfaces()
const none = SURFACES.length === 0

describe('a surface stylesheet arranges the language, it does not extend it', () => {
  /**
   * Always runs, and it is the guard on the discovery above rather than on any
   * stylesheet: if the entry point or the generated sheet ever stopped being
   * excluded, every rule below would start failing for the wrong reason and the
   * failure would read as a defect in a surface.
   */
  it('excludes the entry point and the generated sheet from what it checks', () => {
    const app = readdirSync(APP_DIR).filter((name) => name.endsWith('.css'))
    expect(app, 'the entry point is still where it was').toContain('globals.css')
    expect(SURFACES.map((s) => s.name)).not.toContain('globals.css')
    expect(SURFACES.map((s) => s.name)).not.toContain('lokum-modules.css')
  })

  it.skipIf(none)('takes every radius from a token, never from a literal', () => {
    for (const { name, css } of SURFACES) {
      const declared = [...css.matchAll(/border-radius:\s*([^;]+);/g)].map((m) => m[1].trim())
      for (const value of declared) {
        expect(value, `${name}: ${value} is a literal radius`).toMatch(
          /^(0|0px|var\(--radius-[a-z0-9-]+\)|var\(--shape-[a-z]+\))$/,
        )
      }
    }
  })

  /**
   * The language has exactly two shadows — under a menu that opened over
   * content, and under the rail's restore tab, which overlaps the page from
   * outside it. Both belong to a primitive. A surface asking for a third is
   * asking for an elevation scale the language deliberately does not have.
   */
  it.skipIf(none)('declares no shadow of its own', () => {
    for (const { name, css } of SURFACES) {
      expect(css, `${name} declares a box-shadow`).not.toMatch(/box-shadow/)
    }
  })

  it.skipIf(none)('has no backdrop blur', () => {
    for (const { name, css } of SURFACES) {
      expect(css, `${name} blurs something`).not.toMatch(/blur\(|backdrop-filter/)
    }
  })

  it.skipIf(none)('hardcodes no colour — every ink is a token', () => {
    for (const { name, css } of SURFACES) {
      expect(css, `${name} carries a hex literal`).not.toMatch(/#[0-9a-f]{3,8}\b/i)
      expect(css, `${name} carries a colour function`).not.toMatch(/\b(rgb|hsl|oklch)\(/)
    }
  })

  it.skipIf(none)('never transitions a transform, a shadow or an opacity', () => {
    for (const { name, css } of SURFACES) {
      for (const rule of css.match(/transition:[^;]+;/g) ?? []) {
        expect(rule, `${name}: ${rule}`).not.toMatch(/transform|shadow|opacity|all\b/)
      }
    }
  })

  /**
   * DESIGN.md, Do's and Don'ts: "Do bind one `category-*` hue per group and
   * reuse it for that group's key, edge and active item. Don't invent a sixth
   * hue, re-order the series, or use a category hue for a link, a button or a
   * focus ring."
   */
  it.skipIf(none)('never spends a category hue on a link, a button or a focus ring', () => {
    for (const { name, css } of SURFACES) {
      for (const [, selector, block] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (!/--color-category-/.test(block)) continue
        expect(
          selector.trim(),
          `${name}: ${selector.trim()} spends a category hue, which binds to a group`,
        ).not.toMatch(/\ba\b|link|btn|button|focus/i)
      }
    }
  })
})
