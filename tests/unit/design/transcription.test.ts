import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * M15 — the language is a TRANSCRIPTION, and this is what holds it to that.
 *
 * `playground/01-theme-T4-ground-G3-powder.html` is the specification;
 * `src/design/bazaar.css` is that specification as CSS. The last interface was
 * rejected because a design document was allowed to drift from the mockup it
 * came from — a substituted type family, a re-hued category series and a light
 * top bar all shipped from that drift, and 2,149 unit tests plus 467 browser
 * tests certified it four times over, because not one of them compared
 * anything to the mockup (`logs/BRAINSTORM.md` D26).
 *
 * ## Why this is not the pinned table `tests/README.md` forbids
 *
 * The rule is that a test may check a rule that holds for any content but may
 * never write down a fact about the content. A transcribed table of
 * `--color-surface === '#fdfbf7'` would be exactly that: it restates the
 * mockup instead of comparing to it, so it goes stale silently and it proves
 * only that someone typed the same thing twice.
 *
 * So nothing here names a value. The colour check compares the two files' SETS
 * of colours, which is name-agnostic: rename every token and it still passes;
 * substitute or invent one colour anywhere and it fails, naming it. That is the
 * property that actually matters, and it is the one that was missing.
 */

const ROOT = path.resolve(import.meta.dirname, '../../..')
/**
 * The specification is TWO files now. The light mockup is the design; the dark
 * one is its approved derivation (`logs/BRAINSTORM.md` D27), and it is a mockup
 * rather than a note precisely so it can be checked the same way. Colours are
 * compared against the union: a value in the dark theme is legitimate if the
 * dark mockup contains it, and invented otherwise.
 *
 * The light mockup remains the reference for STRUCTURE — the dark one differs
 * from it only in its token block, provably — so the primitive comparison below
 * resolves against it alone.
 */
const MOCKUP = path.join(ROOT, 'playground/01-theme-T4-ground-G3-powder.html')
const MOCKUP_DARK = path.join(ROOT, 'playground/01-theme-T4-G3-DARK.html')
const LANGUAGE = path.join(ROOT, 'src/design/bazaar.css')

/** The mockup's own annotation chrome. It describes the variant to a reader of
 *  the playground and is not part of the design, so its rules are excluded
 *  from the rule-level comparison. Its COLOURS are still in scope: the ink for
 *  type on a gold fill only appears there, and it is a real part of the
 *  language (`on-caution`). */
const ANNOTATION = /^\.(pg|mx|sw)\b/

function read(file: string): string {
  return readFileSync(file, 'utf8')
}

/** Comments carry prose about values and would otherwise be scanned as CSS. */
function withoutComments(css: string): string {
  return css.replaceAll(/\/\*[\s\S]*?\*\//g, ' ')
}

function styleBlock(file: string): string {
  const html = read(file)
  const open = html.indexOf('<style>')
  const close = html.lastIndexOf('</style>')
  expect(open, `${path.basename(file)} has no <style> block`).toBeGreaterThan(-1)
  return withoutComments(html.slice(open + '<style>'.length, close))
}

function mockupCss(): string {
  return styleBlock(MOCKUP)
}

/** Both mockups, for the checks whose subject is the whole specification. */
function specificationCss(): string {
  return `${styleBlock(MOCKUP)}\n${styleBlock(MOCKUP_DARK)}`
}

function languageCss(): string {
  return withoutComments(read(LANGUAGE))
}

// ---------------------------------------------------------------------------
// Colour, parsed rather than compared as text
// ---------------------------------------------------------------------------

/**
 * The two files write the same colours in different notations, and that is
 * legitimate: the mockup has `#28286400` and `rgba(255,255,255,.10)`, the
 * language has the same values with an explicit leading zero. Comparing
 * strings would report drift where there is none, so every colour is parsed to
 * a normalised `r,g,b,a` tuple first.
 */
function parseColour(raw: string): string | null {
  const value = raw.trim().toLowerCase()

  const hex = /^#([0-9a-f]{3,8})$/.exec(value)
  if (hex) {
    const digits = hex[1]
    const expand = (pair: string) => Number.parseInt(pair, 16)
    if (digits.length === 3 || digits.length === 4) {
      const [r, g, b, a] = [...digits].map((d) => expand(d + d))
      return `${r},${g},${b},${digits.length === 4 ? (a / 255).toFixed(3) : '1.000'}`
    }
    if (digits.length === 6 || digits.length === 8) {
      const byte = (at: number) => expand(digits.slice(at, at + 2))
      const alpha = digits.length === 8 ? byte(6) / 255 : 1
      return `${byte(0)},${byte(2)},${byte(4)},${alpha.toFixed(3)}`
    }
    return null
  }

  const fn = /^rgba?\(([^)]+)\)$/.exec(value)
  if (fn) {
    const parts = fn[1].split(/[\s,/]+/).filter(Boolean).map(Number)
    if (parts.length < 3 || parts.some(Number.isNaN)) return null
    const alpha = parts.length > 3 ? parts[3] : 1
    return `${parts[0]},${parts[1]},${parts[2]},${alpha.toFixed(3)}`
  }

  return null
}

const COLOUR_PATTERN = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g

function coloursIn(css: string): Set<string> {
  const found = new Set<string>()
  for (const match of css.matchAll(COLOUR_PATTERN)) {
    const parsed = parseColour(match[0])
    if (parsed) found.add(parsed)
  }
  return found
}

// ---------------------------------------------------------------------------
// Declarations, and resolving one file's variables against its own tokens
// ---------------------------------------------------------------------------

/** Every `--name: value;` in a chunk of CSS, last declaration winning. */
function tokensIn(css: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const match of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;{}]+);/gi)) {
    map.set(match[1], match[2].trim())
  }
  return map
}

/**
 * The declaration block a selector opens. Brace-counted rather than regexed,
 * because a block can contain a `linear-gradient(...)` full of commas.
 *
 * It returns the block with the MOST declarations, not the first one found,
 * and that is a fix rather than a nicety: a selector is usually defined once
 * and then overridden in a one-line `@media` or `prefers-reduced-motion` rule,
 * and in this mockup those overrides come FIRST in source order. Taking the
 * first match read `.toc { display: none }` and `.side { display: none }` as
 * the definitions of the aside and the rail.
 */
function blockFor(css: string, selector: string): string | null {
  const escaped = selector.replaceAll(/[.[\]*>+~]/g, '\\$&')
  const opener = new RegExp(`(^|[{},])\\s*${escaped}\\s*\\{`, 'g')
  let best: string | null = null
  let bestCount = -1

  for (const match of css.matchAll(opener)) {
    const open = css.indexOf('{', match.index + match[0].length - 1)
    let depth = 0
    for (let i = open; i < css.length; i += 1) {
      if (css[i] === '{') depth += 1
      else if (css[i] === '}') {
        depth -= 1
        if (depth === 0) {
          const block = css.slice(open + 1, i)
          const count = declarationsIn(block).size
          if (count > bestCount) {
            best = block
            bestCount = count
          }
          break
        }
      }
    }
  }

  return best
}

/** `property: value` pairs of one block, ignoring nested at-rules. */
function declarationsIn(block: string): Map<string, string> {
  const flat = block.replaceAll(/@[a-z-]+[^{]*\{[\s\S]*?\}/gi, ' ')
  const map = new Map<string, string>()
  for (const match of flat.matchAll(/([a-z-]+)\s*:\s*([^;{}]+)(;|$)/gi)) {
    const property = match[1].trim().toLowerCase()
    if (property.startsWith('--')) continue
    map.set(property, match[2].trim())
  }
  return map
}

/** Substitute `var(--x)` until nothing is left to substitute. Each file
 *  resolves against its OWN tokens, which is the point: the two use different
 *  token names and the comparison is of the values they arrive at. */
function resolve(value: string, tokens: Map<string, string>): string {
  let out = value
  for (let pass = 0; pass < 8 && out.includes('var('); pass += 1) {
    out = out.replaceAll(/var\(\s*(--[a-z0-9-]+)\s*(?:,([^()]*))?\)/gi, (whole, name, fallback) => {
      const found = tokens.get(name)
      if (found !== undefined) return found
      return fallback === undefined ? whole : fallback.trim()
    })
  }
  return out
}

/** Notation differences that are not drift: `.5` vs `0.5`, spacing inside
 *  functions and between list items, and case. */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/(^|[\s,(:-])\.(\d)/g, '$10.$2')
    .replaceAll(/\s*,\s*/g, ',')
    .replaceAll(/\s+/g, ' ')
    .trim()
}

/** A resolved declaration, with colours normalised so notation cannot matter. */
function resolved(
  css: string,
  tokens: Map<string, string>,
  selector: string,
  property: string,
): string | null {
  const block = blockFor(css, selector)
  if (block === null) return null
  const raw = declarationsIn(block).get(property)
  if (raw === undefined) return null
  const value = normalise(resolve(raw, tokens))
  return value.replaceAll(COLOUR_PATTERN, (colour) => parseColour(colour) ?? colour)
}

// ---------------------------------------------------------------------------

describe('M15 — the language is a transcription of the mockup', () => {
  const mockup = mockupCss()
  const specification = specificationCss()
  const language = languageCss()

  it('the mockup and the language stylesheet are both readable', () => {
    expect(mockup.length).toBeGreaterThan(2_000)
    expect(language.length).toBeGreaterThan(2_000)
  })

  // -- 1. colour, both directions, name-agnostic ---------------------------

  describe('every colour, in both directions', () => {
    const inMockup = coloursIn(specification)
    const inLanguage = coloursIn(language)

    it('is a real comparison and not a vacuous one', () => {
      // A set comparison of two empty sets passes. The mockup's palette is the
      // whole point of the file, so if the extractor finds almost nothing the
      // pattern has broken and every assertion below is worthless.
      expect(inMockup.size).toBeGreaterThan(35)
      expect(inLanguage.size).toBeGreaterThan(25)
    })

    it('the language invents no colour the mockup does not contain', () => {
      const invented = [...inLanguage].filter((colour) => !inMockup.has(colour)).sort()
      expect(invented, 'colours in the language that are not in the mockup').toEqual([])
    })

    it('the language drops no colour the mockup contains', () => {
      const dropped = [...inMockup].filter((colour) => !inLanguage.has(colour)).sort()
      expect(dropped, 'colours in the mockup that the language never declares').toEqual([])
    })
  })

  // -- 2. dimensions, one direction ----------------------------------------

  describe('every dimension the language declares', () => {
    /**
     * One direction only, and deliberately. The reverse — every length in the
     * mockup must be a token — is noise: the mockup is full of incidental
     * paddings that are properties of a primitive rather than of the language.
     * What matters is that no token the language DECLARES was made up.
     */
    const declared = [...tokensIn(blockFor(language, '@theme') ?? '')].filter(
      ([name]) =>
        // `--font-` is in this list because leaving it out was a real hole,
        // found by mutation: swapping the stack to Manrope — the exact
        // substitution that got the previous interface rejected — passed every
        // assertion in this file. A type stack is a declared value like any
        // other and the mockup is the only place it may come from.
        name.startsWith('--font-') ||
        name.startsWith('--layout-') ||
        name.startsWith('--radius-') ||
        name.startsWith('--shape-') ||
        name.startsWith('--text-') ||
        name.startsWith('--tracking-') ||
        name.startsWith('--duration-') ||
        name.startsWith('--ease-') ||
        name.startsWith('--shadow-'),
    )

    it('reads a token block that is actually there', () => {
      expect(declared.length).toBeGreaterThan(32)
    })

    it.each(declared)('%s appears in the mockup', (_name, value) => {
      const needle = normalise(value).replaceAll(COLOUR_PATTERN, (c) => parseColour(c) ?? c)
      const haystack = normalise(specification).replaceAll(COLOUR_PATTERN, (c) => parseColour(c) ?? c)
      expect(haystack).toContain(needle)
    })
  })

  // -- 2b. the dark theme is the approved derivation, not a second design ---

  describe('the dark theme', () => {
    const darkBlock = blockFor(language, '.dark') ?? ''
    const declared = tokensIn(darkBlock)
    const inDarkMockup = coloursIn(styleBlock(MOCKUP_DARK))

    it('is actually there', () => {
      expect(declared.size).toBeGreaterThan(30)
    })

    it('declares no colour the approved dark mockup does not contain', () => {
      const invented = [...declared]
        .map(([name, value]) => [name, parseColour(value)] as const)
        .filter(([, colour]) => colour !== null && !inDarkMockup.has(colour))
        .map(([name]) => name)
        .sort()
      expect(invented, 'dark tokens that are not in the dark mockup').toEqual([])
    })

    it('holds the bar, the band and the completion mark identical to the light theme', () => {
      // What keeps the two themes siblings rather than two designs. Asserted
      // because it is a promise the derivation makes and the easiest to lose.
      const light = tokensIn(blockFor(language, '@theme') ?? '')
      const anchors = [
        '--color-bar',
        '--color-on-bar',
        '--color-on-bar-dim',
        '--color-bar-chip',
        '--color-on-bar-chip',
        '--color-band-ground',
        '--color-success',
      ]
      for (const token of anchors) {
        expect(parseColour(declared.get(token) ?? ''), token).toBe(
          parseColour(light.get(token) ?? ''),
        )
      }
    })
  })

  // -- 3. the primitives resolve to the mockup's own values -----------------

  describe('each primitive resolves to what the mockup paints', () => {
    /**
     * The correspondence between the two files IS the thing under test, so the
     * pairs below are the test's subject rather than a fact about content.
     * Values are never written down: both sides are resolved through their own
     * token map and compared to each other, so the mockup stays the only
     * source of the number.
     *
     * The properties are the design-carrying ones — the fill that makes the bar
     * a bar, the shape that makes a group an arch, the size that makes the
     * completion mark a disc. Not every declaration, because the two files
     * legitimately differ in shorthand and ordering.
     */
    const PAIRS: ReadonlyArray<readonly [string, string, readonly string[]]> = [
      ['.top', '.hl-bar', ['background', 'z-index', 'position']],
      ['.top-in', '.hl-bar-inner', ['height', 'padding', 'gap']],
      ['.brand', '.hl-brand', ['gap', 'color']],
      ['.mainnav', '.hl-bar-nav', ['gap', 'margin-left']],
      ['.dd', '.hl-menu', ['min-width', 'padding', 'border-radius', 'background', 'box-shadow', 'top']],
      ['.band', '.hl-band', ['height', 'background-color', 'background-size', 'background-position', 'border-bottom']],
      ['.shell', '.hl-shell', ['grid-template-columns', 'align-items']],
      ['.side', '.hl-rail', ['top', 'height', 'overflow', 'border-right', 'background']],
      ['.side-in', '.hl-rail-inner', ['width', 'padding']],
      ['.foldbar', '.hl-rail-head', ['gap', 'padding']],
      ['.fold', '.hl-rail-fold', ['width', 'height', 'border', 'border-radius', 'background', 'color']],
      ['.unfold', '.hl-rail-restore', ['width', 'height', 'border-radius', 'background', 'box-shadow', 'left', 'top']],
      ['.arch > summary', '.hl-group > summary', ['padding', 'border', 'border-radius', 'background', 'margin-top', 'gap']],
      ['.arch .key', '.hl-group-key', ['width', 'height', 'border-radius']],
      ['.arch .n', '.hl-group-count', ['margin-left', 'color']],
      ['.arch ul', '.hl-group-list', ['margin', 'padding', 'border-left']],
      ['.arch li a', '.hl-item', ['padding', 'border-radius', 'color', 'gap']],
      ['.tick', '.hl-tick', ['width', 'height', 'border-radius', 'background']],
      ['main', '.hl-main', ['padding']],
      ['.col', '.hl-col', ['max-width', 'margin-inline']],
      ['.crumb', '.hl-crumb', ['color', 'margin-bottom', 'gap']],
      ['.tag', '.hl-tag', ['padding', 'border-radius', 'background', 'border', 'gap']],
      ['.goals', '.hl-card', ['padding', 'border-radius', 'background', 'border', 'margin']],
      ['.slab', '.hl-slab', ['margin', 'border', 'border-radius', 'background', 'overflow']],
      ['.slab pre', '.hl-slab-code', ['margin', 'padding', 'overflow-x', 'color']],
      ['.diagram', '.hl-figure', ['border', 'border-radius', 'background']],
      ['.diagram .in', '.hl-figure-body', ['padding', 'overflow-x', 'overscroll-behavior-x', 'min-width']],
      ['.node', '.hl-node', ['padding', 'border-radius', 'border', 'background', 'color']],
      ['.arr', '.hl-arrow', ['padding', 'color', 'font-weight']],
      ['.act', '.hl-actions', ['gap', 'margin-top', 'padding-top', 'border-top']],
      ['.btn', '.hl-btn', ['padding', 'border-radius', 'background', 'border', 'color', 'gap']],
      ['.pn', '.hl-pager', ['grid-template-columns', 'gap', 'margin-top']],
      ['.toc', '.hl-aside', ['top', 'padding']],
    ]

    // The mockup: every custom property in the file, not only `:root`'s, because
    // it scopes the slab's three values on `.slab` itself and a `:root`-only map
    // left `var(--sl-ink)` unresolved and reported drift that was not there.
    const mockupTokens = tokensIn(mockup)
    // The language: the LIGHT block only. Reading the whole file picked up the
    // `.dark` values, which win on last-declaration, and every light primitive
    // then resolved against the dark palette — a menu came back as the dark
    // raised surface and the comparison failed on a file that was correct.
    const languageTokens = tokensIn(blockFor(language, '@theme') ?? '')

    it('resolves the two token maps', () => {
      expect(mockupTokens.size).toBeGreaterThan(30)
      expect(languageTokens.size).toBeGreaterThan(50)
    })

    it('excludes the mockup’s own annotation chrome', () => {
      for (const [mockupSelector] of PAIRS) {
        expect(ANNOTATION.test(mockupSelector), `${mockupSelector} is annotation`).toBe(false)
      }
    })

    it.each(PAIRS)('%s → %s', (mockupSelector, languageSelector, properties) => {
      for (const property of properties) {
        const theirs = resolved(mockup, mockupTokens, mockupSelector, property)
        const ours = resolved(language, languageTokens, languageSelector, property)
        expect(theirs, `${mockupSelector} declares no ${property}`).not.toBeNull()
        expect(ours, `${languageSelector} declares no ${property}`).not.toBeNull()
        expect(ours, `${languageSelector} { ${property} }`).toBe(theirs)
      }
    })
  })
})
