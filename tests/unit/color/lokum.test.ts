import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrastRatio } from '@/lib/color/contrast'
import { oklchToHex } from '@/lib/color/oklch'
import { readDesignToken } from '@/lib/content/code-theme'
import { CATEGORY_HUES } from '@/lib/record/report'

/**
 * §13.1 — the lokum palette, recomputed from the tokens that actually ship.
 *
 * §13.1.1 publishes six oklch triples and twelve contrast ratios. A published
 * claim nothing checks is a comment, and this palette's claims are unusually
 * easy to break by hand: nudging one lightness to make a swatch look nicer can
 * drop a hue under SC 1.4.11, and lowering a chroma can make a category's
 * *complete* state indistinguishable from its dormant one — which is the §1
 * failure the first draft of the spec actually shipped, and which measurement
 * caught. So everything §13.1 states is derived here, from `lokum.css`.
 *
 * Five properties, and each one is a rule that was arrived at by measuring
 * rather than by taste:
 *
 * 1. **Contrast** ≥ 3.10:1 against all three grounds, in both themes, at full
 *    chroma AND at half. SC 1.4.11's floor is 3:1; the extra 0.10 is the margin
 *    that stops a rounding argument.
 * 2. **One lightness, one definition.** Every hue sits at the same `L`, and
 *    each token is declared exactly once — never redefined under `.dark`. A
 *    token with one definition cannot have its two themes drift apart, and
 *    equal lightness is what stops any category looking weightier than another.
 * 3. **State is visible.** `complete` must be distinguishable from `started`,
 *    and both from the structural line that draws the dormant state. This is
 *    the property that killed KAYMAK at 0.032 chroma.
 * 4. **The six are mutually distinguishable**, so a hue identifies a subsystem.
 * 5. **No hue sits in the accent pen's hue family.** T1 is unamended: the one
 *    loud colour still means exactly "signed off", so a category hue keeps its
 *    distance whether or not the two happen to be tellable apart in practice.
 *
 * Distances are ΔEok — Euclidean in Oklab, which is what oklch is polar
 * coordinates over. 0.04 is the threshold at which two colours read as
 * different; the floors below sit above it with headroom, so a small edit
 * fails here rather than in front of a reader.
 */

const CSS_DIR = join(import.meta.dirname, '../../../src/app')
const LOKUM_CSS = join(CSS_DIR, 'lokum.css')

/** §13.1.1's order, frozen. The flavour names are §13.9's. */
const FLAVOURS = [
  { slug: 'fundamentals', flavour: 'GÜL' },
  { slug: 'intermediate', flavour: 'FISTIK' },
  { slug: 'expert', flavour: 'LAVANTA' },
  { slug: 'ecosystem', flavour: 'NANE' },
  { slug: 'protocols', flavour: 'KAHVE' },
  { slug: 'optional', flavour: 'KAYMAK' },
] as const

/** SC 1.4.11's 3:1, with the margin §13.1.1 states. Unrounded. */
const CONTRAST_FLOOR = 3.1

/** Two colours read as different at ΔEok 0.04. These floors sit above it. */
const STATE_STEP_FLOOR = 0.04
const OFF_LINE_FLOOR = 0.04
const MUTUAL_FLOOR = 0.06
/** Degrees. KAHVE is the nearest at 22°. */
const ACCENT_HUE_CLEARANCE = 20

interface Oklch {
  L: number
  C: number
  h: number
}

/**
 * `oklch(0.605 0.150 350)` → its three components.
 *
 * Deliberately strict: no `%`, no `deg`, no `/ alpha`, no `none`. Every token
 * in this palette is written one way, and a test that quietly accepted a second
 * spelling would stop noticing when one appeared.
 */
function parseOklch(css: string): Oklch {
  const match = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/.exec(css.trim())
  if (match === null) {
    throw new Error(`lokum: ${css} is not a plain three-component oklch() value`)
  }
  return { L: Number(match[1]), C: Number(match[2]), h: Number(match[3]) }
}

function oklab({ L, C, h }: Oklch): [number, number, number] {
  const radians = (h * Math.PI) / 180
  return [L, C * Math.cos(radians), C * Math.sin(radians)]
}

/** Euclidean distance in Oklab. */
function deltaEok(a: Oklch, b: Oklch): number {
  const [al, aa, ab] = oklab(a)
  const [bl, ba, bb] = oklab(b)
  return Math.hypot(al - bl, aa - ba, ab - bb)
}

function css(value: Oklch): string {
  return `oklch(${value.L} ${value.C} ${value.h})`
}

/** Signed shortest distance between two hue angles, in degrees. */
function hueGap(a: number, b: number): number {
  const raw = Math.abs(((a - b) % 360 + 360) % 360)
  return Math.min(raw, 360 - raw)
}

/**
 * Strip `/* … *\/` before scanning, replacing each comment with spaces so line
 * numbers survive. `stroke-weights.test.ts` needs this for the same reason and
 * for the same kind of hit: `lokum.css`'s header explains at length that there
 * is deliberately no `--cat-dormant` token, and a raw scan reads that sentence
 * as the token it exists to forbid. A test that a file's own documentation can
 * fail is a test that punishes explaining yourself.
 */
function withoutComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))
}

/** Every stylesheet, comments stripped, keyed by file name. */
function stylesheets(): Array<[string, string]> {
  return readdirSync(CSS_DIR)
    .filter((name) => name.endsWith('.css'))
    .map((name) => [name, withoutComments(readFileSync(join(CSS_DIR, name), 'utf8'))])
}

const lokumCss = withoutComments(readFileSync(LOKUM_CSS, 'utf8'))

/**
 * Every `--cat-…: …;` declaration in `lokum.css`, with a count, so a token
 * declared twice is a failure rather than a silently-shadowed value.
 */
function declarations(): Map<string, string[]> {
  const found = new Map<string, string[]>()
  for (const match of lokumCss.matchAll(/(--cat-[a-z-]+)\s*:\s*([^;]+);/g)) {
    const name = match[1]
    const list = found.get(name) ?? []
    list.push(match[2].trim())
    found.set(name, list)
  }
  return found
}

const declared = declarations()

function token(name: string): Oklch {
  const values = declared.get(name)
  if (values === undefined) {
    throw new Error(`lokum: ${name} is not declared in lokum.css`)
  }
  return parseOklch(values[0])
}

const GROUNDS = ['paper', 'cleared', 'sunken'] as const
type Theme = 'light' | 'dark'

function ground(name: (typeof GROUNDS)[number], theme: Theme): string {
  return readDesignToken(`--color-${name}`)[theme]
}

describe('§13.1.1 — the six hues are declared once and only once', () => {
  it('declares two tokens per category and nothing else', () => {
    const expected = FLAVOURS.flatMap(({ slug }) => [`--cat-${slug}`, `--cat-${slug}-half`])
    expect([...declared.keys()].sort()).toEqual([...expected].sort())
  })

  it.each(FLAVOURS.flatMap(({ slug }) => [`--cat-${slug}`, `--cat-${slug}-half`]))(
    '%s is declared exactly once',
    (name) => {
      expect(declared.get(name)).toHaveLength(1)
    },
  )

  /**
   * §13.10 — there is no dark override, and that is the claim being checked.
   * The palette is theme-independent by measurement, so a `--cat-*` appearing
   * inside a `.dark` block in ANY stylesheet would reintroduce the drift the
   * single definition exists to prevent.
   */
  it('never redefines a category hue under .dark, in any stylesheet', () => {
    const offenders: string[] = []
    for (const [file, source] of stylesheets()) {
      const darkAt = source.search(/\.dark\b/)
      if (darkAt === -1) continue
      for (const match of source.matchAll(/(--cat-[a-z-]+)\s*:/g)) {
        if (match.index > darkAt) offenders.push(`${file}: ${match[1]}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('holds every hue at one lightness, so no category outranks another', () => {
    const lightnesses = new Set(
      FLAVOURS.flatMap(({ slug }) => [
        token(`--cat-${slug}`).L,
        token(`--cat-${slug}-half`).L,
      ]),
    )
    expect([...lightnesses]).toEqual([0.605])
  })

  it('halves the chroma exactly, and moves nothing else', () => {
    for (const { slug, flavour } of FLAVOURS) {
      const full = token(`--cat-${slug}`)
      const half = token(`--cat-${slug}-half`)
      expect(half.h, `${flavour} hue`).toBe(full.h)
      expect(half.L, `${flavour} lightness`).toBe(full.L)
      // Written to three decimals in the stylesheet, so compare at that scale.
      expect(half.C, `${flavour} chroma`).toBeCloseTo(full.C / 2, 3)
    }
  })
})

describe('§13.1.1 — contrast, computed against the shipped grounds', () => {
  const cases = FLAVOURS.flatMap(({ slug, flavour }) =>
    (['light', 'dark'] as const).flatMap((theme) =>
      (['', '-half'] as const).flatMap((state) =>
        GROUNDS.map((against) => ({
          flavour,
          name: `--cat-${slug}${state}`,
          label: `${flavour}${state === '' ? '' : ' at half chroma'} on ${against} (${theme})`,
          theme,
          against,
        })),
      ),
    ),
  )

  it.each(cases)('$label clears 3.10:1', ({ name, theme, against }) => {
    const ratio = contrastRatio(css(token(name)), ground(against, theme))
    expect(ratio).toBeGreaterThanOrEqual(CONTRAST_FLOOR)
  })

  /**
   * A triple outside sRGB is silently clipped by the browser, and a clipped
   * colour is not the colour the spec published — so the ratio above would be
   * measured on a value nobody sees. `oklchToHex` throws on a triple it cannot
   * encode in gamut, which is what makes this a real check.
   */
  it.each(FLAVOURS)('$flavour stays inside sRGB at both chromas', ({ slug }) => {
    expect(() => oklchToHex(css(token(`--cat-${slug}`)))).not.toThrow()
    expect(() => oklchToHex(css(token(`--cat-${slug}-half`)))).not.toThrow()
  })
})

describe('§13.1.2 — progress is visible, which is what dormant-as-a-hue broke', () => {
  /**
   * The dormant state is `--color-line-strong` and not a category hue at all
   * (§13.1.2). Both live states must therefore stand off from it, or a reader
   * who has signed something sees a category drawn like one they have not
   * touched — a page claiming a state that is not true of them (§1).
   */
  it.each(FLAVOURS)('$flavour: started and complete both stand off the structural line', ({ slug, flavour }) => {
    const line = parseOklch(readDesignToken('--color-line-strong').light)
    for (const state of ['', '-half'] as const) {
      const distance = deltaEok(token(`--cat-${slug}${state}`), line)
      expect(distance, `${flavour}${state} vs line-strong`).toBeGreaterThanOrEqual(OFF_LINE_FLOOR)
    }
  })

  it.each(FLAVOURS)('$flavour: complete is tellable from started', ({ slug }) => {
    const step = deltaEok(token(`--cat-${slug}`), token(`--cat-${slug}-half`))
    expect(step).toBeGreaterThanOrEqual(STATE_STEP_FLOOR)
  })
})

describe('§13.1.1 — a hue identifies a subsystem', () => {
  it('separates all fifteen pairs', () => {
    const tooClose: string[] = []
    for (let i = 0; i < FLAVOURS.length; i += 1) {
      for (let j = i + 1; j < FLAVOURS.length; j += 1) {
        const distance = deltaEok(
          token(`--cat-${FLAVOURS[i].slug}`),
          token(`--cat-${FLAVOURS[j].slug}`),
        )
        if (distance < MUTUAL_FLOOR) {
          tooClose.push(
            `${FLAVOURS[i].flavour}~${FLAVOURS[j].flavour} ΔEok ${distance.toFixed(3)}`,
          )
        }
      }
    }
    expect(tooClose).toEqual([])
  })

  /**
   * T1 is unamended, and this is the test that keeps it that way. The accent
   * pen means exactly "signed off"; a category hue in its hue family would put
   * a second meaning on the one loud colour, however distinguishable the two
   * turned out to be when measured.
   */
  it.each(FLAVOURS)('$flavour keeps 20° clear of the accent pen', ({ slug, flavour }) => {
    const accent = parseOklch(readDesignToken('--color-accent').light)
    const gap = hueGap(token(`--cat-${slug}`).h, accent.h)
    expect(gap, `${flavour} vs accent hue`).toBeGreaterThanOrEqual(ACCENT_HUE_CLEARANCE)
  })
})

describe('§13.1.2 — there is no dormant token to find', () => {
  it('declares no --cat-dormant, in any stylesheet', () => {
    for (const [file, source] of stylesheets()) {
      expect(source, file).not.toMatch(/--cat-dormant/)
    }
  })
})

describe('§13.7 — the RECORD OF WORK carries the same six hues', () => {
  /**
   * The exported document is opened from `file://` with an opaque origin and no
   * stylesheet to import, so it inlines the palette. That inline copy is the
   * only one it has, and a drifted value would be invisible: the file would
   * simply be a slightly different colour from the site, in an artefact nobody
   * can reissue. This is the guard, and it is the reason `CATEGORY_HUES` is
   * exported at all.
   */
  it.each(FLAVOURS)('$flavour matches lokum.css at both chromas', ({ slug, flavour }) => {
    const inReport = CATEGORY_HUES[slug]
    expect(inReport, `${flavour} is missing from the report`).toBeDefined()
    expect(parseOklch(inReport.full), `${flavour} full`).toEqual(token(`--cat-${slug}`))
    expect(parseOklch(inReport.half), `${flavour} half`).toEqual(token(`--cat-${slug}-half`))
  })

  it('names the six categories and no others', () => {
    expect(Object.keys(CATEGORY_HUES).sort()).toEqual(FLAVOURS.map((f) => f.slug).sort())
  })
})
