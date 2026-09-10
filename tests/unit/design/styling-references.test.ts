import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
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
  const push = (value: string): void => {
    for (const word of value.split(/[\s'"`]+/)) {
      const bare = word.replace(/^[a-z-]+:/g, '').replace(/^[!-]/, '')
      // The left half of a template interpolation: the real name is only known
      // at render time, so there is nothing here to resolve. Skipped rather
      // than reported, which is the same call `customPropertiesIn` makes.
      if (bare.length === 0 || bare.endsWith('-') || /[${}]/.test(bare)) continue
      found.push(bare)
    }
  }

  for (const attribute of source.matchAll(/className\s*=\s*"([^"]*)"/g)) push(attribute[1])
  for (const expression of bracedClassNames(source)) {
    // Every string literal inside the expression, whatever shape the
    // expression is: a ternary, a `clsx(…)` call, an array join, a variable
    // plus a literal. What a literal cannot be found in — a name assembled
    // from variables only — has nothing for this sweep to check anyway.
    for (const literal of expression.matchAll(/'([^']*)'|"([^"]*)"|`([^`]*)`/g)) {
      push(literal[1] ?? literal[2] ?? literal[3] ?? '')
    }
  }
  return found
}

/**
 * The text inside every `className={ … }`, found by BALANCING BRACES rather
 * than by a pattern.
 *
 * This was the file's largest blind spot and it was invisible in the way this
 * whole file exists to prevent. The old pattern accepted exactly three shapes —
 * `className="…"`, a bare template and a bare single-quoted string — so every
 * `className={expression}` was skipped: sixteen sites, two of them carrying a
 * real colour utility in a ternary (`SheetLabel.tsx` and `PersonDetail.tsx`,
 * `text-on-surface` and `text-on-surface-muted`). Rename either token and those
 * two go inert with this suite green, which is the precise failure the file was
 * written for.
 *
 * A regex cannot do this: an expression contains `{`…`}` of its own (an object,
 * a nested JSX expression, a template's `${…}`), so a non-greedy match ends at
 * the first inner brace and a greedy one runs to the end of the file.
 */
function bracedClassNames(source: string): string[] {
  const found: string[] = []
  for (const start of source.matchAll(/className\s*=\s*\{/g)) {
    let depth = 1
    let at = (start.index ?? 0) + start[0].length
    const from = at
    while (at < source.length && depth > 0) {
      const character = source[at]
      if (character === '{') depth += 1
      else if (character === '}') depth -= 1
      at += 1
    }
    if (depth === 0) found.push(source.slice(from, at - 1))
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

/**
 * Custom properties whose NAME is composed at run time, so no stylesheet can
 * declare them and this sweep would report every one as silent.
 *
 * There is exactly one family, and it is the one reading channel A carries as
 * a number rather than as a class: `--bz-done-<slug>`, set on `<html>` by the
 * boot script before first paint and by `stamp.ts` after mount. A level's slug
 * is the course's business and not the language's — `DESIGN.md` names
 * `category-3` and never `expert` — so declaring five of these in the language
 * would put the curriculum inside the design system.
 *
 * The exemption is safe for a reason this file can state precisely: **every
 * reference to one supplies a fallback**, and the whole hazard here is a
 * `var()` that resolves to nothing at all, silently. A `var(--x, 0%)` cannot
 * be silent. The case below enforces that rather than trusting it.
 */
const COMPOSED_AT_RUNTIME = /^--bz-done-[a-z-]+$/

function surfaceReferences(): Reference[] {
  return readdirSync(SURFACE_DIR)
    .filter((name) => name.endsWith('.css') && !NOT_A_SURFACE.has(name))
    .flatMap((name) => {
      const css = withoutComments(readFileSync(join(SURFACE_DIR, name), 'utf8'))
      const own = declaresItself(css)
      return [...css.matchAll(/var\(\s*(--[a-z0-9-]+)/g)]
        .map((match) => match[1])
        .filter(
          (property) =>
            !property.endsWith('-') &&
            !own.has(property) &&
            !COMPOSED_AT_RUNTIME.test(property),
        )
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

  /**
   * The half that makes `COMPOSED_AT_RUNTIME` safe. Its entries are exempt from
   * the sweep above precisely because they cannot be silent, and that is only
   * true while every reference to one supplies a fallback — so it is checked
   * here rather than asserted in a comment. Take the `, 0%` off and this fails
   * while nothing else in the suite would notice.
   */
  it('gives every runtime-composed property a fallback', () => {
    const naked: string[] = []
    for (const name of readdirSync(SURFACE_DIR)) {
      if (!name.endsWith('.css') || NOT_A_SURFACE.has(name)) continue
      const css = withoutComments(readFileSync(join(SURFACE_DIR, name), 'utf8'))
      for (const use of css.matchAll(/var\(\s*(--[a-z0-9-]+)\s*([,)])/g)) {
        if (COMPOSED_AT_RUNTIME.test(use[1]) && use[2] === ')') {
          naked.push(`src/app/${name} — var(${use[1]}) has no fallback`)
        }
      }
    }
    expect([...new Set(naked)].sort()).toEqual([])
  })

  /**
   * The retired treatment, refused in MARKUP as well as in a stylesheet.
   *
   * `surface-stylesheets.test.ts` closed the stylesheet half — no surface
   * re-cases its text, none pairs mono with the tracked label size — and that
   * left a hole this file is the right place to close, because this is the
   * sweep that already reads every utility out of every `className`.
   *
   * The hole was not hypothetical. Three components had re-created the small
   * uppercase mono label out of `font-mono uppercase tracking-[0.06em]` while
   * the class it replaced was being deleted, which is M9-to-M14's whole failure
   * in miniature: the thing survives because an edit preserves what it edits.
   */
  it('re-creates no uppercase label out of utilities', () => {
    const offenders: string[] = []
    for (const file of FILES) {
      const source = readFileSync(file, 'utf8')
      for (const attribute of source.matchAll(
        /className\s*=\s*(?:"([^"]*)"|\{`([^`]*)`\}|\{'([^']*)'\})/g,
      )) {
        const value = attribute[1] ?? attribute[2] ?? attribute[3] ?? ''
        const words = value.split(/\s+/)
        // `uppercase` at all, and mono paired with a label-sized step. A
        // lowercase or capitalize utility is not this idiom.
        if (words.includes('uppercase')) {
          offenders.push(`${relative(ROOT, file)} — uppercase`)
        }
        // Mono at the TRACKED label step, which is the retired idiom. Mono at
        // `mark` is a machine's word — a hash, a key, an ordinal — and the
        // language does it itself in `.bz-aside-mark`, transcribed from `01`.
        // `surface-stylesheets.test.ts` draws the line in the same place.
        if (words.includes('font-mono') && words.includes('text-label')) {
          offenders.push(`${relative(ROOT, file)} — mono at the tracked label size`)
        }
      }
    }
    expect([...new Set(offenders)].sort(), 'the uppercase mono label, in markup').toEqual([])
  })

  it('exempts a family that is actually referenced', () => {
    // A pattern matching nothing is an exemption doing nothing, and it would
    // hide the day one of these stops being set at run time.
    const referenced = readdirSync(SURFACE_DIR)
      .filter((name) => name.endsWith('.css') && !NOT_A_SURFACE.has(name))
      .flatMap((name) => [
        ...withoutComments(readFileSync(join(SURFACE_DIR, name), 'utf8'))
          .matchAll(/var\(\s*(--[a-z0-9-]+)/g),
      ])
      .filter((use) => COMPOSED_AT_RUNTIME.test(use[1]))
    expect(referenced.length, 'nothing references the exempted family').toBeGreaterThan(0)
  })
})

/**
 * The other direction: every `bz-` class the markup carries has a RULE.
 *
 * `styling-references.test.ts` above catches a Tailwind utility named after a
 * token the language does not declare, because such a utility emits nothing at
 * all. `category-css.test.ts` catches the reverse for the generated sheet — a
 * selector naming a class no component emits. This is the third corner: a class
 * a component emits that no stylesheet answers to.
 *
 * It is the failure M16 spent ten stages undoing. Stage 0 deleted eleven
 * stylesheets and left every class name in the markup, so for one commit the
 * entire interface was unstyled semantic HTML and nothing in the suite said so:
 * no typecheck, no build error, no red test. A class nobody styles is not an
 * error to any tool in this project except this one.
 *
 * Two things are deliberately not failures here. A class that exists only to be
 * queried — by a test, an island or a keyboard handler — carries no design and
 * needs no rule, so `MECHANISM` lists those with a reason. And a Tailwind
 * utility is not a `bz-` class, so it is out of scope by construction.
 */
describe('every bz- class in the markup has a rule somewhere', () => {
  /** Classes that exist to be queried rather than to be drawn, and by what. */
  const MECHANISM: Readonly<Record<string, string>> = {
    'bz-row-title':
      'The row\'s heading cell. Its type is set by `.bz-table tbody th` rather '
      + 'than by this class, deliberately: a rule qualified by `tbody th` beats '
      + 'a bare class and the two fought when both existed. What the class is '
      + 'for is being asked about — by four specs and by the sign-off island.',
  }

  const languageAndSurfaces = (() => {
    let css = readFileSync(join(ROOT, 'src/design/bazaar.css'), 'utf8')
    for (const name of readdirSync(SURFACE_DIR)) {
      if (name.endsWith('.css')) css += readFileSync(join(SURFACE_DIR, name), 'utf8')
    }
    return withoutComments(css)
  })()

  /** Every class name any rule in the language or a surface mentions. */
  const styled = new Set(
    [...languageAndSurfaces.matchAll(/\.(bz-[a-z0-9-]+)/g)].map((match) => match[1]),
  )

  /** Every `bz-` class any component puts in a `className`. */
  const emitted = (() => {
    const found = new Map<string, string>()
    for (const file of FILES) {
      const source = readFileSync(file, 'utf8')
      for (const attribute of source.matchAll(
        /className\s*=\s*(?:"([^"]*)"|\{([^}]*)\})/g,
      )) {
        const value = attribute[1] ?? attribute[2] ?? ''
        for (const token of value.matchAll(/\b(bz-[a-z0-9-]+)/g)) {
          if (!found.has(token[1])) found.set(token[1], relative(ROOT, file))
        }
      }
    }
    return found
  })()

  it('reads both sides at all', () => {
    // Two empty sets agree about everything.
    expect(styled.size, 'no bz- selectors found').toBeGreaterThan(150)
    expect(emitted.size, 'no bz- classes found in markup').toBeGreaterThan(120)
  })

  it('leaves no class in the markup that nothing draws', () => {
    const unstyled = [...emitted]
      .filter(([name]) => !styled.has(name) && !(name in MECHANISM))
      .map(([name, file]) => `${name} (${file})`)
      .sort()
    expect(unstyled, 'these classes are in the markup and no rule answers to them').toEqual([])
  })

  it('carries no stale mechanism exemption', () => {
    const stale = Object.keys(MECHANISM).filter((name) => styled.has(name))
    expect(stale, 'exempted as mechanism, but a rule draws it now').toEqual([])
  })

  it('exempts nothing the markup does not carry', () => {
    const unknown = Object.keys(MECHANISM).filter((name) => !emitted.has(name))
    expect(unknown, 'exempted, but no component emits it').toEqual([])
  })

  it('gives every mechanism exemption a reason', () => {
    for (const [name, why] of Object.entries(MECHANISM)) {
      expect(why.length, `${name} is exempted with no reason`).toBeGreaterThan(40)
    }
  })
})

/**
 * M16's FIRST CLOSING CONDITION, and it had no test.
 *
 * `logs/PROGRESS.md` says the milestone is done when "no `hl-` class [is] in
 * any `className`", and nothing under `tests/` asserted it. The meter everyone
 * quoted did not measure it either: `grep -rho '\bhl-[a-z0-9-]*'` counted 1,045
 * in markup, of which 158 were `data-hl-*` attribute names and the rest
 * included the `<html>` stamps — all mechanism, all permanent, so that number
 * could never reach zero and reaching for it would mean renaming the pre-paint
 * script's stamps and breaking channel A silently.
 *
 * **What is in scope is a CLASS.** `hl-` survives on purpose in three places
 * and each is checked below rather than merely excluded: the twenty-six
 * `data-hl-*` attributes that islands and specs query, the three `<html>`
 * stamps whose pattern `stamp.ts` owns, and the storage keys, whose prefix
 * `tests/e2e/record.ts` calls "the only isolation available on a shared
 * `github.io` origin". Renaming any of those buys a reader nothing and costs
 * either a keyboard shortcut, a mark that is right in frame one, or every
 * existing reader's record.
 *
 * The extraction is the same one the sweeps above use, and it reads the `{…}`
 * expression form as well as the three quoted ones — so `className={cond ?
 * 'a' : 'b'}` and `className={clsx(…)}` are covered, which the token sweep's
 * own regex is not and which would have made a naive port of this under-count
 * and pass early.
 */
describe('M16 closing condition: the retired vocabulary is out of the markup', () => {
  const classes = (() => {
    const found = new Map<string, string[]>()
    for (const file of FILES) {
      const source = readFileSync(file, 'utf8')
      for (const attribute of source.matchAll(
        /className\s*=\s*(?:"([^"]*)"|\{([^}]*)\})/g,
      )) {
        const value = attribute[1] ?? attribute[2] ?? ''
        for (const token of value.matchAll(/\bhl-[a-z0-9-]+/g)) {
          const where = found.get(token[0]) ?? []
          where.push(relative(ROOT, file))
          found.set(token[0], where)
        }
      }
    }
    return found
  })()

  it('reads the markup at all', () => {
    // The condition is "zero", and zero is what an extraction that reads
    // nothing also reports. So this states what it did read.
    expect(FILES.length, 'no source files walked').toBeGreaterThan(50)
    const anyClass = FILES.some((file) => /className\s*=/.test(readFileSync(file, 'utf8')))
    expect(anyClass, 'no className attribute found anywhere').toBe(true)
  })

  it('has no hl- class left in any className', () => {
    const remaining = [...classes]
      .map(([name, files]) => `${name} (${[...new Set(files)].join(', ')})`)
      .sort()
    expect(remaining, 'the retired vocabulary is still in the markup').toEqual([])
  })

  it('keeps the mechanism vocabulary, which is not in scope and must not move', () => {
    const source = FILES.map((file) => readFileSync(file, 'utf8')).join('\n')

    // The attributes islands, handlers and specs query.
    const attributes = new Set(
      [...source.matchAll(/data-(hl-[a-z-]+)/g)].map((match) => match[1]),
    )
    expect(attributes.size, 'the data-hl-* vocabulary has gone missing').toBeGreaterThan(20)

    // The three stamped families, whose pattern `stamp.ts` owns. Read from
    // there rather than restated, so this cannot drift from the writer.
    const owned = readFileSync(join(ROOT, 'src/lib/record/stamp.ts'), 'utf8')
    expect(owned).toContain('hl-(?:signed-\\d+|cat-[a-z0-9-]+-(?:started|complete)|role-[a-z-]+)')

    // And the storage keys, which are the reader's own data.
    const schema = readFileSync(join(ROOT, 'src/lib/record/schema.ts'), 'utf8')
    expect(schema).toContain("'hl-record'")
  })
})
