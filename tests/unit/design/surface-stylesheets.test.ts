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
 * it. They reported as skipped until stage 1 wrote the first one; the guard is
 * still there so the file is honest if a stage ever deletes the last surface.
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

/**
 * Comments out, and every rule below needs it.
 *
 * A comment is where a surface explains itself — why a value is what it is,
 * which mockup it came from, what the retired design did instead — so prose
 * naming `box-shadow` or a hex would fail the file for describing itself. The
 * selector rules need it more: without stripping, `([^{}]+)\{` captures the
 * whole comment ahead of a rule AS the selector, and any comment containing the
 * word "a" then reads as a link. That is exactly how this file first failed.
 *
 * Replaced with spaces rather than removed, so nothing shifts.
 */
function withoutComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))
}

function surfaces(): Surface[] {
  return readdirSync(APP_DIR)
    .filter((name) => name.endsWith('.css') && !NOT_A_SURFACE.has(name))
    .sort()
    .map((name) => ({ name, css: withoutComments(readFileSync(join(APP_DIR, name), 'utf8')) }))
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
        /*
          `50%` is a CIRCLE and not a step on the radius scale, which is why it
          is allowed and why allowing it does not weaken this. The scale exists
          so a 2px corner on a 9px swatch and a 7px corner on a slab are the
          same visual softness at different sizes — a disc has no corner to
          soften, and the language draws its own that way: `.bz-tick`, the
          completion mark, and the dial. Any other literal is still refused.
        */
        expect(value, `${name}: ${value} is a literal radius`).toMatch(
          /^(0|0px|50%|var\(--radius-[a-z0-9-]+\)|var\(--shape-[a-z]+\))$/,
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

  /**
   * DESIGN.md, Typography: "There is no serif in this language and no monospace
   * label — a small uppercase mono label is a different design idiom altogether
   * and it fights the glaze." And the don't-list: "Don't substitute a different
   * family, add a serif, or introduce small uppercase mono labels."
   *
   * THE MOCKUP IS STRONGER THAN THE DOCUMENT HERE, which is why this is a test
   * and not a note. `playground/01-theme-T4-ground-G3-powder.html:136-137`
   * writes `text-transform: none` on its fold-bar caption EXPLICITLY — an
   * author turning the retired idiom off on the one element that would
   * otherwise have carried it — and `05`, `07` and `08` declare no
   * `text-transform` at all. The only mockup that uppercases is `09-sidebar`,
   * which is on the older palette and whose glyph idiom the language has
   * already rejected on measured grounds.
   *
   * It exists because the retired design spent this treatment 205 times, in 52
   * files, under one class — and dissolving those sites is worthless if the
   * same rule can be re-authored under a `bz-` name. M9 to M14 failed by
   * preserving the thing they were asked to replace, one convenient rule at a
   * time.
   *
   * `src/lib/record/report.ts` is out of scope by construction rather than by
   * exemption: the exported RECORD OF WORK carries its own inline print
   * stylesheet with its own print palette, and it is not a surface stylesheet.
   */
  it.skipIf(none)('introduces no uppercase label, and no mono one', () => {
    for (const { name, css } of SURFACES) {
      for (const [, selector, block] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const where = `${name}: ${selector.trim()}`

        // `uppercase`, `capitalize` and `full-width` all re-case a reader's own
        // text; `none` and `lowercase` do not, and a name a reader typed must
        // never be re-cased at all — CSS casing is locale-sensitive off the
        // element's `lang`, and `"ilker".toUpperCase()` yields a dotless I.
        const cased = block.match(/text-transform:\s*([a-z-]+)/)
        if (cased !== null) {
          expect(cased[1], `${where} re-cases its text`).toMatch(/^(none|lowercase)$/)
        }

        /*
          The other half of the same idiom: mono at the LABEL size, which is the
          tracked one DESIGN.md reserves for "the caption above a group of
          controls" — i.e. a label, by definition. That pairing is the retired
          treatment.

          Mono is not banned outright, and the distinction is the whole point of
          the two steps: `mark` is "for a count or a tag", and `03` and `08` both
          set a module ordinal in mono, so `.bz-row-number` and `.bz-aside-mark`
          are faithful. What the language forbids is a mono *label*, not a mono
          numeral. Judging by size alone would have caught all three, which is
          how two ordinals came to be snapped to the 12px step because 11.5px
          was nearer to it than 12.5px — a type ROLE is not chosen by half a
          pixel.
        */
        if (/--font-mono/.test(block) && block.includes('--text-label')) {
          expect(where, `${where} sets a mono label at the tracked size`).toBe('')
        }
      }
    }
  })
})
