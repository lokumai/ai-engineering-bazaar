import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * §2.2 — the three quantised weights, and the one browser fact that silently
 * deletes the middle one.
 *
 * **MEASURED (Chrome 151):** `border-*-width` and `outline-width` are floored
 * to a whole CSS pixel, at DPR 1 and DPR 2 alike. `border-top: 1.5px solid`
 * computes to `1px`; `border-bottom: 2px solid` computes to `2px`. So
 * `--stroke-struct` spent as a border paints a hairline, `--stroke-hair` and
 * `--stroke-struct` become indistinguishable everywhere they meet, and §1's
 * first self-check — *does every line weight on this screen mean something?* —
 * is answered "no" by the system's own stylesheet. Before this test, a full
 * `getComputedStyle` sweep of a module sheet found exactly one non-zero border
 * width across 256 painted borders: `1px`.
 *
 * `height`, `width` and `background-size` are not floored, so a structural
 * rule is painted rather than bordered. This test is the guard: the struct
 * weight may appear in a `border`/`outline` declaration only alongside
 * `transparent`, where the border is holding layout space and paints nothing.
 *
 * `--stroke-hair` (1px) and `--stroke-cut` (2px) are whole pixels and are not
 * constrained here — a border is the right carrier for both.
 */

const CSS_DIR = join(import.meta.dirname, '../../src/app')

/** One `property: value` pair, with the line it sits on for the failure text. */
interface Declaration {
  file: string
  line: number
  property: string
  value: string
}

/** Strip `/* … *\/` so a comment that names the anti-pattern is not a hit. */
function withoutComments(css: string): string {
  // Replaced with newlines, not removed, so line numbers survive.
  return css.replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))
}

function declarationsIn(file: string): Declaration[] {
  const css = withoutComments(readFileSync(join(CSS_DIR, file), 'utf8'))
  const found: Declaration[] = []

  let line = 1
  for (const chunk of css.split(';')) {
    const colon = chunk.indexOf(':')
    if (colon !== -1) {
      const property = chunk.slice(0, colon).trim().split(/\s/).pop() ?? ''
      // A declaration only: `{`/`}` in the chunk means a selector came with it.
      const value = chunk.slice(colon + 1)
      if (!value.includes('{') && !value.includes('}')) {
        found.push({ file, line, property, value: value.trim() })
      }
    }
    line += (chunk.match(/\n/g) ?? []).length
  }

  return found
}

const CSS_FILES = readdirSync(CSS_DIR).filter((name) => name.endsWith('.css')).sort()

describe('§2.2 — the struct weight is painted, never bordered', () => {
  it('finds the stylesheets it is meant to be checking', () => {
    expect(CSS_FILES).toContain('globals.css')
    expect(CSS_FILES.length).toBeGreaterThanOrEqual(5)
  })

  it('declares the three weights as 1px / 1.5px / 2px', () => {
    const globals = readFileSync(join(CSS_DIR, 'globals.css'), 'utf8')
    expect(globals).toMatch(/--stroke-hair:\s+1px;/)
    expect(globals).toMatch(/--stroke-struct:\s+1\.5px;/)
    expect(globals).toMatch(/--stroke-cut:\s+2px;/)
  })

  it('never asks a border or an outline to paint --stroke-struct', () => {
    const offenders = CSS_FILES.flatMap(declarationsIn)
      .filter((d) => /^(border|outline)/.test(d.property))
      .filter((d) => d.value.includes('--stroke-struct'))
      .filter((d) => !d.value.includes('transparent'))
      .map((d) => `${d.file}:${d.line} — ${d.property}: ${d.value}`)

    expect(
      offenders,
      'Chrome floors a border width to a whole CSS pixel, so each of these '
      + 'paints a 1px hairline and spends the struct weight for nothing. Paint '
      + 'the rule (a gradient, a height, a pseudo-element) and leave the border '
      + 'transparent if it is holding layout space.',
    ).toEqual([])
  })

  it('still spends the struct weight somewhere it can be seen', () => {
    // The rule above is satisfied by deleting every struct rule on the site,
    // which would pass it and lose the weight just as completely.
    const painted = CSS_FILES.flatMap(declarationsIn)
      .filter((d) => /^(height|width|background|background-size)$/.test(d.property))
      .filter((d) => d.value.includes('--stroke-struct'))

    expect(painted.length).toBeGreaterThanOrEqual(8)
  })
})
