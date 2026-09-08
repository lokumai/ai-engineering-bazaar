import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * M10/M11 — two rules that are about WHICH token a surface reaches for, which
 * no contrast test can answer.
 *
 * `contrast.test.ts` proves the palette clears its floors. It cannot prove that
 * a control ended up bordered with the token that carries the interactive
 * floor, or that the slab's local override of the palette matches the dark
 * theme it duplicates. Both of those are properties of the stylesheets, so both
 * are read out of the stylesheets.
 *
 * ## Rule 1 — a control's boundary is `--color-line-control` and nothing else
 *
 * `kia-context/logs/BRAINSTORM.md` D19: a border that IDENTIFIES a control
 * needs 3:1 to be perceivable, a border that GROUPS does not, and on this
 * ground no line colour reaches 3:1 — `line-strong` measures 2.68:1 on the sand
 * an input actually sits on. So the interactive border is a third token. M9
 * declared it and applied it to nothing; M10 and M11 moved the components onto
 * it, and this is the guard that keeps them there.
 *
 * Asserted in both directions, which is the half that matters: a control put
 * back on `line` or `line-strong` fails here rather than in front of a reader.
 * Mutation-tested by putting `.hl-btn` back on `--color-line-strong`.
 *
 * ## Rule 2 — the slab's override equals the dark theme it duplicates
 *
 * The slab is dark in BOTH themes, so `rail.css` redeclares the semantic
 * palette on `.hl-slab` using the dark theme's literal values. It cannot share
 * them through a `var()` indirection: `code-theme.ts` reads the `.dark` block's
 * declarations as TEXT at build time and hands them to a hex converter, so an
 * indirection there stops the build. Two copies of a value is two values, and
 * this is what stops them drifting.
 */

const CSS_DIR = join(import.meta.dirname, '../../../src/app')

/** Comments stripped, so prose naming a token is never counted as a use. */
function withoutComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, ' ')
}

function read(name: string): string {
  return withoutComments(readFileSync(join(CSS_DIR, name), 'utf8'))
}

const FILES = readdirSync(CSS_DIR).filter((name) => name.endsWith('.css')).sort()

/** Every stylesheet, as one string, in import order-independent form. */
const ALL = FILES.map((name) => read(name)).join('\n')

// ---------------------------------------------------------------------------
// Rule 1 — the interactive border
// ---------------------------------------------------------------------------

/**
 * The controls, by the selector each one is styled under.
 *
 * Typed out rather than discovered, and deliberately: "which of these
 * selectors is a control" is a design decision, not something a regex can
 * infer, and a new control that nobody adds here is a new control nobody
 * checked. That is the same argument `tests/e2e/sheets.ts` makes about
 * exemplars.
 */
const CONTROLS: readonly string[] = [
  '.hl-btn',                          // every record control
  '.hl-button',                       // the quiet button
  '.hl-field input',                  // the name field
  '.hl-quiz textarea',                // the self-check answer
  '.hl-check input[type="checkbox"]', // a checklist box
  '.prose input[type="checkbox"]',    // a task-list box in the prose
  '.hl-rail-fold',                    // M10 — the fold
  '.hl-rail-restore',                 // M10 — the restore tab
]

/** The declaration block a selector opens, up to its closing brace. */
function blockFor(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const opener = new RegExp(`(^|[,}\\s])${escaped}\\s*\\{`, 'm')
  for (const name of FILES) {
    const css = read(name)
    const match = opener.exec(css)
    if (!match) continue
    const start = css.indexOf('{', match.index) + 1
    const end = css.indexOf('}', start)
    return css.slice(start, end)
  }
  throw new Error(`no rule block for ${selector} in ${FILES.join(', ')}`)
}

describe('D19 — a control identifies itself with the interactive border', () => {
  it.each(CONTROLS)('%s borders with --color-line-control', (selector) => {
    const block = blockFor(selector)
    expect(block, `${selector} declares no border colour at all`)
      .toMatch(/border[^:]*:[^;]*var\(--color-line-control\)/)
  })

  it.each(CONTROLS)('%s does not border with a grouping token', (selector) => {
    const block = blockFor(selector)
    // The rest state only. A hover may darken to `line-cut`, which is a
    // different claim and a heavier line, not a lighter one.
    expect(block, `${selector} is bordered with a grouping token`)
      .not.toMatch(/border[^:]*:[^;]*var\(--color-line(-strong)?\)/)
  })

  it('applies the token somewhere at all, so it is not a dead declaration', () => {
    // M9 declared `--color-line-control` and left it unused, which the
    // milestone report recorded as work left for M10/M11. This is what says it
    // has actually been done.
    const uses = [...ALL.matchAll(/var\(--color-line-control\)/g)].length
    expect(uses).toBeGreaterThanOrEqual(CONTROLS.length)
  })
})

// ---------------------------------------------------------------------------
// Rule 2 — the slab's palette
// ---------------------------------------------------------------------------

/** The `.dark` block of `globals.css`, where the night palette is declared. */
function darkBlock(): string {
  const css = read('globals.css')
  const start = css.search(/\.dark\s*\{/)
  expect(start, 'globals.css has no .dark block').toBeGreaterThan(-1)
  const open = css.indexOf('{', start) + 1
  return css.slice(open, css.indexOf('}', open))
}

/** The `.hl-slab` block of `rail.css`, where the slab overrides the palette. */
function slabBlock(): string {
  const css = read('rail.css')
  const start = css.search(/\.hl-slab\s*\{/)
  expect(start, 'rail.css has no .hl-slab block').toBeGreaterThan(-1)
  const open = css.indexOf('{', start) + 1
  return css.slice(open, css.indexOf('}', open))
}

function declarationsIn(block: string): Map<string, string> {
  const found = new Map<string, string>()
  for (const match of block.matchAll(/(--color-[a-z-]+)\s*:\s*([^;]+);/g)) {
    found.set(match[1], match[2].trim())
  }
  return found
}

describe('M11 — the slab duplicates the dark palette, exactly', () => {
  const dark = declarationsIn(darkBlock())
  const slab = declarationsIn(slabBlock())

  /** The overrides that are literal values rather than slab-token aliases. */
  const literals = [...slab.entries()].filter(([, value]) => !value.startsWith('var('))

  it('overrides something with a literal, so this test has a subject', () => {
    expect(literals.length).toBeGreaterThan(8)
  })

  it.each(literals)('%s matches the .dark declaration it copies', (token, value) => {
    const night = dark.get(token)
    expect(night, `${token} is not declared in .dark, so nothing pins this copy`)
      .toBeDefined()
    expect(value, `${token} on the slab has drifted from the dark theme`).toBe(night)
  })

  it('takes the slab grounds and inks from the slab tokens, not from literals', () => {
    // The overrides that are NOT semantic hues must be aliases of a
    // `--color-slab-*` token, so the slab's own palette has exactly one
    // definition and `code-theme.ts` reads the same values the page paints.
    for (const key of ['--color-paper', '--color-cleared', '--color-ink', '--color-line'] as const) {
      expect(slab.get(key), `${key} is not declared on the slab`).toMatch(
        /^var\(--color-slab[a-z-]*\)$/,
      )
    }
  })

  it('declares every slab token in both themes, which code-theme.ts requires', () => {
    const globals = read('globals.css')
    const names = new Set(
      [...globals.matchAll(/(--color-slab[a-z-]*)\s*:/g)].map((match) => match[1]),
    )
    expect(names.size).toBeGreaterThan(5)
    const darkNames = declarationsIn(darkBlock())
    for (const name of names) {
      expect(darkNames.has(name), `${name} is missing from the .dark block`).toBe(true)
    }
  })
})
