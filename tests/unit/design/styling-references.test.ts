import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Every styling reference in the markup resolves against the language.
 *
 * ## The failure this exists because of, measured
 *
 * Tailwind v4 generates utilities from the `@theme` block. Rename a token and
 * every utility named after the old one **emits nothing**: no error, no
 * warning, no build failure, no failing test. The element simply inherits, and
 * a page that has lost its colours looks like a page somebody styled that way.
 *
 * M16 stage 0 replaced the token layer, and the morning after it landed the
 * shipped CSS contained **zero** rules for `text-ink`, `text-ink-muted`,
 * `text-ink-faint`, `font-display`, `bg-paper` and `bg-cleared` — **365
 * utility usages across 39 files, plus 36 arbitrary values pointing at three
 * custom properties nothing declares.** Nothing in the suite noticed, and
 * nothing could have: no test reads what the markup asks for and compares it to
 * what the language offers. This is that test.
 *
 * ## What it checks, and why in two halves
 *
 * **`var(--…)` inside a `className` or a `style`** is unambiguous: the property
 * is either declared or it is not, and an undeclared one resolves to nothing at
 * all. No allowlist, no judgement.
 *
 * **A utility** needs one piece of care, because Tailwind ships vocabulary of
 * its own that has nothing to do with this project: `text-sm` is a built-in
 * size, `text-center` is an alignment, `text-meta` is one of ours. So a
 * candidate is skipped when it is a word from `TAILWIND_KEYWORDS` — a closed
 * list of Tailwind's own scale and keyword names, which is stable vocabulary
 * rather than a fact about this repository — and otherwise it must resolve
 * against a token the language declares.
 *
 * The rule is content-agnostic and it holds for any palette. Nothing here
 * writes down a colour, a size, or how many of either there are.
 */

const ROOT = join(import.meta.dirname, '../../..')
const LANGUAGE = join(ROOT, 'src/design/bazaar.css')
const SOURCE = join(ROOT, 'src')

/* -------------------------------------------------------------------------- */
/* What the language declares                                                 */
/* -------------------------------------------------------------------------- */

const language = readFileSync(LANGUAGE, 'utf8')

/** Every custom property the language declares, anywhere in it. */
const DECLARED: ReadonlySet<string> = new Set(
  [...language.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((match) => match[1]),
)

/**
 * The token families a utility can name, and the prefix each maps to.
 *
 * Tailwind's own mapping: a colour utility resolves `--color-<name>`, a
 * font-size utility `--text-<name>`, a font-family utility `--font-<name>`, and
 * so on. Reading the prefixes off the utility rather than guessing is what lets
 * this test say *which* token a dead utility was reaching for.
 */
const FAMILIES: ReadonlyArray<readonly [RegExp, readonly string[]]> = [
  // Colour, in every position Tailwind gives one. `text-` is deliberately NOT
  // here: it is overloaded, and its own entry below offers both families.
  [/^(?:bg|border-[trblxyse]|border|fill|stroke|ring|divide|outline|decoration|accent|caret|from|via|to|shadow)-(.+)$/, ['--color-']],
  // A font utility is either a family or a weight; both live under `--font-`.
  [/^font-(.+)$/, ['--font-', '--font-weight-']],
  // `text-` is overloaded — `text-on-surface` is a colour, `text-meta` a size —
  // so it offers both families and resolves if either declares the name.
  [/^text-(.+)$/, ['--text-', '--color-']],
  [/^rounded(?:-[trblse]{1,2})?-(.+)$/, ['--radius-', '--shape-']],
  [/^(?:tracking)-(.+)$/, ['--tracking-']],
  [/^(?:leading)-(.+)$/, ['--leading-']],
  [/^(?:duration)-(.+)$/, ['--duration-']],
  [/^(?:ease)-(.+)$/, ['--ease-']],
]

/**
 * Tailwind's own vocabulary, which is not this project's business.
 *
 * Everything here is a name Tailwind resolves without any `@theme` entry: its
 * numeric and t-shirt scales, its keyword values, and the default colour
 * palette it still ships when `@theme` only adds to it. A candidate matching
 * one of these is skipped rather than validated, because validating it would
 * mean this test asserting facts about Tailwind instead of about the language.
 */
const TAILWIND_KEYWORDS: ReadonlySet<string> = new Set([
  // sizes and scales
  'xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl',
  '7xl', '8xl', '9xl', 'none', 'full', 'auto', 'px', 'DEFAULT',
  // font weights
  'thin', 'extralight', 'light', 'normal', 'medium', 'semibold', 'bold',
  'extrabold', 'black',
  // font families Tailwind ships
  'sans', 'serif', 'mono',
  // text alignment, wrapping and decoration keywords
  'left', 'center', 'right', 'justify', 'start', 'end', 'wrap', 'nowrap',
  'balance', 'pretty', 'ellipsis', 'clip', 'inherit', 'current', 'transparent',
  'solid', 'dashed', 'dotted', 'double', 'wavy',
  // border sides and table borders: `border-b` is a WIDTH, not a colour
  'b', 't', 'l', 'r', 'x', 'y', 's', 'e', 'collapse', 'separate', 'spacing',
  // line height
  'tight', 'snug', 'relaxed', 'loose',
  // easing and duration keywords
  'linear', 'in', 'out', 'in-out', 'initial',
  // the default palette, still generated when @theme only extends
  'black', 'white', 'slate', 'gray', 'grey', 'zinc', 'neutral', 'stone', 'red',
  'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan',
  'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
])

/** A numeric step (`p-4`, `gap-2`, `text-red-500`) is Tailwind's own scale. */
const NUMERIC = /^\d/

/* -------------------------------------------------------------------------- */
/* What the markup asks for                                                   */
/* -------------------------------------------------------------------------- */

interface Reference {
  readonly file: string
  readonly raw: string
  /** The token names it could be reaching for; empty means it is a `var()`. */
  readonly candidates: readonly string[]
}

function tsxFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) return tsxFiles(path)
    return path.endsWith('.tsx') || path.endsWith('.ts') ? [path] : []
  })
}

const FILES = tsxFiles(SOURCE)

/**
 * A utility name, from a `className` string. Variants are stripped — the
 * `md:` in `md:flex` and the `hover:` in `hover:text-ink` say when a rule
 * applies, never which token it spends.
 */
function utilitiesIn(source: string): string[] {
  const found: string[] = []
  for (const attribute of source.matchAll(/className\s*=\s*(?:"([^"]*)"|\{`([^`]*)`\}|\{'([^']*)'\})/g)) {
    const value = attribute[1] ?? attribute[2] ?? attribute[3] ?? ''
    for (const word of value.split(/[\s'"`]+/)) {
      const bare = word.replace(/^[a-z-]+:/g, '').replace(/^[!-]/, '')
      if (bare.length > 0) found.push(bare)
    }
  }
  return found
}

/**
 * Every `var(--x)` a `.tsx`/`.ts` file hands to CSS, wherever it appears.
 *
 * A name ending in `-` is the left half of a template interpolation —
 * `` `var(--color-category-${order})` `` — so the real token is only known at
 * render time and there is nothing here to check. Skipped rather than guessed
 * at, and it is the one blind spot in this file.
 */
function customPropertiesIn(source: string): string[] {
  return [...source.matchAll(/var\(\s*(--[a-z0-9-]+)/g)]
    .map((match) => match[1])
    .filter((name) => !name.endsWith('-'))
}

/**
 * A file that ships its own self-contained stylesheet declares its own
 * palette, and those tokens are correctly not the language's.
 *
 * The exported RECORD OF WORK is the case that matters: it is opened from
 * `file://` with an opaque origin and no stylesheet to import, so
 * `src/lib/record/report.ts` inlines a whole print palette of its own — warm
 * paper, a serif face, its own accent — which was never the site's. Resolving a
 * `var()` against the file's own declarations as well as the language's is what
 * keeps that honest without exempting the file wholesale: a token it uses and
 * does NOT declare still fails.
 */
function declaresItself(source: string): ReadonlySet<string> {
  return new Set([...source.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((match) => match[1]))
}

/**
 * Comments out, and this is not a nicety.
 *
 * A docblock is where a retired token gets explained — "`bleed` opted out of a
 * `max-w-[var(--width-shell)]` box, and there is no such box any more" is the
 * sentence that tells the next reader why a prop went. Scanning it would fail
 * the file for describing its own history, which is the opposite of what this
 * test is for. Replaced with spaces rather than removed, so nothing shifts.
 */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (match, lead) => lead + ' '.repeat(match.length - lead.length))
}

function referencesIn(path: string): Reference[] {
  const source = withoutComments(readFileSync(path, 'utf8'))
  const file = path.slice(ROOT.length + 1)
  const own = declaresItself(source)
  const found: Reference[] = []

  for (const utility of utilitiesIn(source)) {
    // An arbitrary value carries its own answer and is covered by the var()
    // sweep below; a numeric step and a Tailwind keyword are not ours.
    if (utility.includes('[')) continue

    for (const [pattern, prefixes] of FAMILIES) {
      const match = pattern.exec(utility)
      if (match === null) continue
      const name = match[1]
      if (NUMERIC.test(name) || TAILWIND_KEYWORDS.has(name)) break
      // A default-palette shade: `red-500`, `gray-200`.
      if (TAILWIND_KEYWORDS.has(name.split('-')[0]) && NUMERIC.test(name.split('-').pop() ?? '')) break
      found.push({ file, raw: utility, candidates: prefixes.map((prefix) => `${prefix}${name}`) })
      break
    }
  }

  for (const property of customPropertiesIn(source)) {
    if (own.has(property)) continue
    found.push({ file, raw: `var(${property})`, candidates: [property] })
  }

  return found
}

/**
 * The surface stylesheets, held to the same rule as the markup.
 *
 * This half was added after the first: a `var(--tracking-label)` typed into a
 * surface sheet is as silent as `text-ink-muted` in a `className`, and the
 * markup sweep could not see it. Same treatment — comments out, a file's own
 * declarations allowed, everything else must resolve against the language.
 */
const SURFACE_DIR = join(ROOT, 'src/app')
const NOT_A_SURFACE = new Set(['lokum-modules.css'])

function surfaceReferences(): Reference[] {
  return readdirSync(SURFACE_DIR)
    .filter((name) => name.endsWith('.css') && !NOT_A_SURFACE.has(name))
    .flatMap((name) => {
      const css = withoutComments(readFileSync(join(SURFACE_DIR, name), 'utf8'))
      const own = declaresItself(css)
      return [...css.matchAll(/var\(\s*(--[a-z0-9-]+)/g)]
        .map((match) => match[1])
        .filter((property) => !property.endsWith('-') && !own.has(property))
        .map((property) => ({
          file: `src/app/${name}`,
          raw: `var(${property})`,
          candidates: [property],
        }))
    })
}

const REFERENCES = [...FILES.flatMap(referencesIn), ...surfaceReferences()]

/* -------------------------------------------------------------------------- */

describe('every styling reference in the markup resolves against the language', () => {
  it('is reading both the language and the markup it claims to check', () => {
    // Either half reading nothing makes every assertion below pass while
    // checking nothing, which is the failure mode this whole file is about.
    expect(DECLARED.size, 'no tokens found in the language').toBeGreaterThan(40)
    expect(FILES.length, 'no source files found').toBeGreaterThan(50)
    expect(REFERENCES.length, 'no styling references found').toBeGreaterThan(100)
  })

  it('names no token the language does not declare', () => {
    const unresolved = REFERENCES
      .filter((reference) => !reference.candidates.some((name) => DECLARED.has(name)))
      .map((reference) => `${reference.file} — ${reference.raw} (wanted ${reference.candidates.join(' or ')})`)

    // Deduplicated for a readable failure: one line per distinct reference per
    // file, rather than one per occurrence.
    expect(
      [...new Set(unresolved)].sort(),
      'These reach for a token src/design/bazaar.css does not declare. A '
      + 'Tailwind utility whose token is missing emits NOTHING — no error, no '
      + 'warning — so each of these is silently doing nothing at all.',
    ).toEqual([])
  })
})
