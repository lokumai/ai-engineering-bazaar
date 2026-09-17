import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * One browser fact, guarded generally.
 *
 * **MEASURED (Chrome 151):** `border-*-width` and `outline-width` are floored
 * to a whole CSS pixel, at DPR 1 and DPR 2 alike. `border-top: 1.5px solid`
 * computes to `1px`; `border-bottom: 2px solid` computes to `2px`. A
 * fractional border width therefore never paints what it says, and the author's
 * intent is lost silently — no warning, no error, just a hairline.
 *
 * ## What this test used to be, and why it changed (M16)
 *
 * The retired design had a three-weight line system, `--stroke-hair` 1px,
 * `--stroke-struct` 1.5px and `--stroke-cut` 2px, quantised after ISO 128, and
 * this file existed because the middle weight was the one the flooring deleted:
 * a full `getComputedStyle` sweep of a module sheet once found exactly one
 * non-zero border width across 256 painted borders, `1px`. The rule was that
 * the struct weight had to be *painted* — a height, a gradient, a
 * pseudo-element — and could appear in a `border` declaration only alongside
 * `transparent`, where it holds layout space and paints nothing.
 *
 * **The T4 language has no three-weight system.** It separates a hairline from
 * a strong edge by *colour*, `line` against `line-strong`, and every line it
 * draws is one whole pixel (`kia-context/specs/DESIGN.md`, Elevation & Depth).
 * So the token names that rule was written against no longer exist, and pinning
 * them here would have been a test asserting a fact about a deleted design.
 *
 * What survives is the browser fact, which is not about any palette: **no
 * border and no outline may declare a fractional pixel width.** That catches
 * the same defect the old rule caught, catches it in a system with no stroke
 * scale at all, and would catch a 1.5px border reintroduced tomorrow.
 * `logs/BRAINSTORM.md` D32 records the retirement.
 */

const APP_DIR = join(import.meta.dirname, '../../src/app')
const LANGUAGE = join(import.meta.dirname, '../../src/design/bazaar.css')

/** One `property: value` pair, with the line it sits on for the failure text. */
interface Declaration {
  file: string
  line: number
  property: string
  value: string
}

/** Strip `/* … *\/` so a comment that names the anti-pattern is not a hit. */
function withoutComments(css: string): string {
  // Replaced with spaces, not removed, so line numbers survive.
  return css.replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))
}

function declarationsIn(path: string, label: string): Declaration[] {
  const css = withoutComments(readFileSync(path, 'utf8'))
  const found: Declaration[] = []

  let line = 1
  for (const chunk of css.split(';')) {
    const colon = chunk.indexOf(':')
    if (colon !== -1) {
      const property = chunk.slice(0, colon).trim().split(/\s/).pop() ?? ''
      // A declaration only: `{`/`}` in the chunk means a selector came with it.
      const value = chunk.slice(colon + 1)
      if (!value.includes('{') && !value.includes('}')) {
        found.push({ file: label, line, property, value: value.trim() })
      }
    }
    line += (chunk.match(/\n/g) ?? []).length
  }

  return found
}

/**
 * Every stylesheet that ships: the language, plus whatever surface stylesheets
 * exist. Discovered rather than listed, so a sheet added by a later M16 stage
 * is checked the moment it lands and nobody has to remember to add it here.
 */
function shippedStylesheets(): Declaration[] {
  const app = readdirSync(APP_DIR)
    .filter((name) => name.endsWith('.css'))
    .sort()
    .flatMap((name) => declarationsIn(join(APP_DIR, name), name))
  return [...declarationsIn(LANGUAGE, 'bazaar.css'), ...app]
}

/** A width that is not a whole number of pixels. `1px` no, `1.5px` yes. */
const FRACTIONAL_PX = /(?:^|[\s(,])\d*\.\d+px/

describe('a line is a whole pixel, because a border cannot be anything else', () => {
  const declarations = shippedStylesheets()

  it('is actually reading the stylesheets it claims to check', () => {
    // The rule below is satisfied by reading nothing at all, which is how a
    // sweep stops sweeping. Two floors: the language is found, and borders
    // are found in it.
    expect(declarations.map((d) => d.file)).toContain('bazaar.css')
    expect(declarations.filter((d) => /^border/.test(d.property)).length)
      .toBeGreaterThan(20)
  })

  it('never asks a border or an outline for a fractional pixel', () => {
    const offenders = declarations
      .filter((d) => /^(border|outline)/.test(d.property))
      .filter((d) => FRACTIONAL_PX.test(d.value))
      .map((d) => `${d.file}:${d.line} — ${d.property}: ${d.value}`)

    expect(
      offenders,
      'Chrome floors a border and an outline width to a whole CSS pixel, so '
      + 'each of these paints something other than what it says. Paint the '
      + 'rule instead (a height, a gradient, a pseudo-element) and leave the '
      + 'border transparent if it is only holding layout space.',
    ).toEqual([])
  })
})
