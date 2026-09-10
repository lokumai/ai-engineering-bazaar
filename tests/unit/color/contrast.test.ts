import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrastRatio, relativeLuminance } from '@/lib/color/contrast'
import { surfaces } from '../design/surfaces'
import {
  CODE_TOKEN_ROLES,
  DEFAULT_TOKEN,
  readDesignToken,
} from '@/lib/content/code-theme'

/**
 * The CI contrast check.
 *
 * Every ratio below is recomputed from the *live* token values in
 * `src/design/bazaar.css`, so a token edited under its floor fails the build
 * rather than the audit. No published ratio is written down anywhere in this
 * file: `tests/README.md` forbids it, because a table of pinned numbers turns
 * an ordinary token edit into twenty red tests and teaches nobody anything.
 *
 * Each pair declares the JOB its foreground does, and the job carries the
 * threshold:
 *
 *  - `text` — 4.5:1. Anything that can carry a sentence.
 *  - `graphic` — 3.0:1. A fill, a stroke or a state marker (SC 1.4.11).
 *  - `decorative` — a CEILING, not a floor. A token meant to be ignorable must
 *    stay BELOW the structural threshold, because the moment one of them clears
 *    it somebody will reach for it to carry meaning, and a rule enforced by
 *    "please do not" is not enforced.
 *
 * ## M16 re-pointed this at the new token layer, and two things moved
 *
 * The names all changed — `paper` → `surface`, `ink` → `on-surface`, `accent` →
 * `primary` — and three old members of the table have no successor. `line-cut`
 * and `line-control` do not exist: the language separates a hairline from an
 * interactive edge by colour, `line` against `line-strong`, and that is the
 * whole ladder. The four `*-ink` status tokens do not exist either, because
 * BRAINSTORM **D33** settled that a semantic hue rides an edge and never
 * becomes a pale fill with its own ink.
 *
 * **Two measured shortfalls in the mockup are recorded here rather than
 * hidden, and neither is papered over with a lowered floor.**
 *
 * 1. `line-strong` measures **2.00:1** on the ground, 2.07 raised, 1.50 sunken
 *    (light; 1.80 / 1.59 / 1.90 dark). It is the edge the language gives an
 *    interactive or hovered control, and SC 1.4.11 wants 3:1 for anything
 *    required to identify a component. A control whose only boundary is that
 *    hairline does not clear it. What is enforced below instead is the promise
 *    DESIGN.md actually makes — `line-strong` is strictly stronger than `line`
 *    on every ground, in both themes — and the 3:1 question belongs to the
 *    stage that builds the controls, with the author, because answering it
 *    means changing a value in the specification.
 * 2. `on-surface-muted` measures **4.21:1** on `surface-sunken` in light,
 *    against 5.62 and 5.81 on the two resting grounds. DESIGN.md says the
 *    sunken fill "is the hover and the pressed state, not a resting surface for
 *    text", so the text floors below are asserted on the resting grounds and
 *    the sunken fill is checked as the transient state it is.
 *
 *    **That premise was false for three rules, and a review found them rather
 *    than this file.** `.bz-table thead th`, `.bz-tablefig thead th` and the
 *    planned catalog card all rested that exact pair on that exact fill — every
 *    column label in the product and in the corpus, at 12.5px/600, which is
 *    not large text. The exemption was not stale in the way the harness checks
 *    for; it was **wrong**, and being wrong is what made it silent. All three
 *    now take full ink, and the last block in this file turns the premise into
 *    a check: no rule may rest an ink on that fill without clearing the floor.
 *    An exemption stated as prose is a promise; the same exemption with a guard
 *    under it is a fact.
 *
 * `on-surface-faint` carries no contrast job at all now, and that is a change.
 * The old palette held its faint ink under a 3:1 ceiling; this one measures
 * 3.19 and 3.30 in light, over it. DESIGN.md governs it by usage instead —
 * "Don't let a faint status word be the only thing that says what state
 * something is in" — which is a rule about what a token may carry, not about
 * how much contrast it has.
 */

type Theme = 'light' | 'dark'
const THEMES: readonly Theme[] = ['light', 'dark']

/** The language itself, for the one check that has to read a BINDING rather
 *  than a token value. */
const LANGUAGE = join(import.meta.dirname, '../../../src/design/bazaar.css')

type Job = 'text' | 'graphic' | 'decorative'

const FLOOR: Record<Job, number> = { text: 4.5, graphic: 3.0, decorative: 3.0 }

interface Pair {
  /** Token names without the `--color-` prefix. */
  foreground: string
  background: string
  job: Job
}

/** The two grounds a reader reads on. `surface-sunken` is a state, not a rest. */
const RESTING = ['surface', 'surface-raised'] as const

const readable = (foreground: string): Pair[] =>
  RESTING.map((background) => ({ foreground, background, job: 'text' as const }))

const graphical = (foreground: string): Pair[] =>
  RESTING.map((background) => ({ foreground, background, job: 'graphic' as const }))

/**
 * The palette by role, both themes, because a token that can hold a sentence
 * in light has to hold one in dark.
 */
const PAIRS: readonly Pair[] = [
  ...readable('on-surface'),
  ...readable('on-surface-title'),
  ...readable('on-surface-muted'),
  ...readable('primary'),

  /* A chromatic fill and the type that sits on it. The language has exactly
     three, and `on-caution` is the one place type on a chromatic fill is not
     white, which is the only reason the token exists. */
  { foreground: 'on-primary', background: 'primary', job: 'text' },
  { foreground: 'on-caution', background: 'caution', job: 'text' },

  /* The bar is a solid cobalt slab with its own sub-palette and never sits on
     the page ground, so every one of these is measured against `bar` rather
     than against a surface. `on-bar-dim` is a label a reader still has to
     read, so it takes the text floor too. */
  { foreground: 'on-bar', background: 'bar', job: 'text' },
  { foreground: 'on-bar-dim', background: 'bar', job: 'text' },
  { foreground: 'on-bar-chip', background: 'bar-chip', job: 'text' },
  /* The current-destination chip is the strongest statement the language
     makes, and it has to be seen as a shape on the bar before it is read. */
  { foreground: 'bar-chip', background: 'bar', job: 'graphic' },

  /* The slab is its own small palette on its own ground, and it does not flip
     with the theme — a code block and a figure are dark in both. */
  { foreground: 'slab-on-surface', background: 'slab-surface', job: 'text' },
  { foreground: 'slab-on-surface-muted', background: 'slab-surface', job: 'text' },
  { foreground: 'slab-on-raised', background: 'slab-surface-raised', job: 'text' },
  { foreground: 'slab-arrow', background: 'slab-surface', job: 'graphic' },

  /*
     THE FOCUS RING, ON EVERY GROUND IT APPEARS ON — which is four, not two.

     This was `graphical('focus')` and nothing else, and `graphical` walks only
     the two RESTING grounds. So the ring was measured on `surface` and
     `surface-raised`, where the clay reads 5.48:1 and 5.66:1, and never on the
     cobalt bar or the dark slab, where controls also sit. MEASURED once it was
     asked: clay on `bar` is **2.35:1** in light, against SC 1.4.11's 3:1 — and
     the bar holds the first controls in the tab order on every route, so that
     was the ring a keyboard reader met first, everywhere.

     The pairs below are the ring as the language now binds it: clay on the page
     grounds, `on-bar` on the bar, `slab-on-surface` on the slab. Each token is
     the ground's own ink, which is what a sub-palette is for. **The lesson is
     the shape of the bug rather than the numbers**: a floor checked on one
     ground is not checked, and a helper that defaults to "the two grounds a
     reader reads on" will silently skip every ground that is not one of them.
  */
  ...graphical('focus'),
  ...graphical('success'),
  /* GRAPHIC and not text, and the measurement is the reason rather than a
     preference: 5.48:1 on `surface` in light, 3.02:1 on `surface-raised` in
     dark. It clears 3:1 in both themes and 4.5:1 in only one, so it is an
     edge, a rule or a mark, and a destructive control's label stays
     `on-surface`. Its declaration in the language says the same. */
  ...graphical('fault'),
  { foreground: 'caution', background: 'surface', job: 'graphic' },

  /* The ceiling. `line` groups a set of things and must never be reachable as
     a way of saying something, on any ground. */
  { foreground: 'line', background: 'surface', job: 'decorative' },
  { foreground: 'line', background: 'surface-raised', job: 'decorative' },
  { foreground: 'line', background: 'surface-sunken', job: 'decorative' },
  { foreground: 'slab-line', background: 'slab-surface', job: 'decorative' },
]

function tokenRatio(pair: Pair, theme: Theme): number {
  return contrastRatio(
    readDesignToken(`--color-${pair.foreground}`)[theme],
    readDesignToken(`--color-${pair.background}`)[theme],
  )
}

describe('relativeLuminance', () => {
  it('anchors on the two colours WCAG defines exactly', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 10)
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 10)
  })

  it('reads an oklch() token as readily as a hex literal', () => {
    // oklch(1 0 0) is white; the pipeline must not lose that to gamut mapping.
    expect(relativeLuminance('oklch(1 0 0)')).toBeCloseTo(1, 6)
  })
})

describe('contrastRatio', () => {
  it('reproduces the WCAG extremes', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 6)
    expect(contrastRatio('#767676', '#767676')).toBeCloseTo(1, 6)
  })

  it('is symmetric — a pair has one ratio, not an order', () => {
    expect(contrastRatio('#FFFFFF', '#767676')).toBeCloseTo(
      contrastRatio('#767676', '#FFFFFF'),
      10,
    )
  })
})

describe('the palette, recomputed from the tokens that ship', () => {
  const cases = THEMES.flatMap((theme) =>
    PAIRS.map((pair) => ({
      label: `${pair.foreground} on ${pair.background} (${pair.job}, ${theme})`,
      pair,
      theme,
    })),
  )

  it.each(cases)('$label', ({ pair, theme }) => {
    const ratio = tokenRatio(pair, theme)
    if (pair.job === 'decorative') {
      expect(ratio, `${pair.foreground} has become usable as a mark`)
        .toBeLessThan(FLOOR.decorative)
    } else {
      expect(ratio).toBeGreaterThanOrEqual(FLOOR[pair.job])
    }
  })

  /**
   * The transient state. Text does not rest on the hover fill, so it is not
   * held to the resting floor — but a hovered row is still readable, and a
   * token that fell to the graphic floor there would mean a reader loses the
   * line they are pointing at. MEASURED: `on-surface-muted` is the tightest at
   * 4.21 in light.
   */
  it.each(THEMES)('keeps text legible on the hover fill in %s', (theme) => {
    const sunken = readDesignToken('--color-surface-sunken')[theme]
    for (const name of ['on-surface', 'on-surface-title', 'on-surface-muted']) {
      const ratio = contrastRatio(readDesignToken(`--color-${name}`)[theme], sunken)
      expect(ratio, `${name} on the hover fill, ${theme}`).toBeGreaterThan(FLOOR.graphic)
    }
  })
})

describe('what the language promises about its two line weights', () => {
  /**
   * DESIGN.md, Colors: "the two line tokens sit on the same ladder: `line` for
   * grouping a set of things, `line-strong` for the edge of something
   * interactive or hovered. They are close together on the ladder."
   *
   * Close together is the point — neither is loud — so what has to hold is the
   * ORDER, on every ground and in both themes. If the two ever met, the
   * language would have one line weight while claiming two, and every
   * interactive edge would silently become a grouping edge.
   *
   * The 3:1 question this raises is recorded in the docblock at the top of this
   * file; it is not settled here, and it is not settled by lowering a floor.
   */
  it.each(THEMES)('makes an interactive edge stronger than a grouping edge in %s', (theme) => {
    for (const ground of ['surface', 'surface-raised', 'surface-sunken'] as const) {
      const against = readDesignToken(`--color-${ground}`)[theme]
      const grouping = contrastRatio(readDesignToken('--color-line')[theme], against)
      const interactive = contrastRatio(readDesignToken('--color-line-strong')[theme], against)
      expect(interactive, `line-strong vs line on ${ground}, ${theme}`)
        .toBeGreaterThan(grouping)
    }
  })

  /**
   * A raised surface is defined by its border on this ground, not by its fill.
   * Asserted in both directions: lighter, because a card is never darker than
   * its page, and barely, because a card that separated on fill alone would
   * mean the hairline could go — and DESIGN.md's first Don't is that it cannot.
   */
  it.each(THEMES)('raises a surface by a hairline and not by a fill in %s', (theme) => {
    const surface = relativeLuminance(readDesignToken('--color-surface')[theme])
    const raised = relativeLuminance(readDesignToken('--color-surface-raised')[theme])
    const ratio = contrastRatio(
      readDesignToken('--color-surface-raised')[theme],
      readDesignToken('--color-surface')[theme],
    )
    if (theme === 'light') {
      expect(raised, 'a card is never darker than its page').toBeGreaterThan(surface)
    }
    expect(ratio, 'a fill alone must not separate a card from its page').toBeLessThan(1.6)
  })
})

/**
 * The syntax tokens, against the ground they sit on.
 *
 * **The code ground is the SLAB and it does not flip with the theme.** A code
 * block and a figure are dark in both themes on purpose
 * (`kia-context/specs/DESIGN.md`, Overview), so every syntax token is a
 * `--color-slab-*` token measured against `--color-slab-surface` — and both
 * theme passes must give the same answer, which is itself worth asserting,
 * because a slab token declared in only one theme makes `readDesignToken`
 * throw rather than pass quietly.
 *
 * A comment in a teaching corpus is CONTENT — `# Add the embeddings here` is
 * the line that explains the three below it — so it takes the 4.5:1 text floor
 * rather than a decorative one.
 */
describe('the syntax tokens on the slab', () => {
  const ground = (theme: Theme) => readDesignToken('--color-slab-surface')[theme]
  const tokens = [DEFAULT_TOKEN, ...CODE_TOKEN_ROLES.map((role) => role.token)]

  it.each(THEMES.flatMap((theme) => tokens.map((token) => ({ token, theme }))))(
    '$token clears the text floor in $theme',
    ({ token, theme }) => {
      expect(contrastRatio(readDesignToken(token)[theme], ground(theme)))
        .toBeGreaterThanOrEqual(FLOOR.text)
    },
  )

  it('never paints a comment in a decorative ink, on either ground', () => {
    for (const theme of THEMES) {
      expect(
        contrastRatio(readDesignToken('--color-slab-comment')[theme], ground(theme)),
        `a comment is content, not decoration (${theme})`,
      ).toBeGreaterThanOrEqual(FLOOR.text)
    }
  })

  /**
   * The slab is one ground in both themes, so every token on it resolves to
   * one value in both. A token that had drifted apart would show as a code
   * block changing colour with the page, which is the thing the fixed slab
   * exists to prevent.
   */
  it('resolves every slab token identically in both themes', () => {
    for (const token of tokens) {
      const { light, dark } = readDesignToken(token)
      expect(dark, token).toBe(light)
    }
  })
})

/**
 * The focus ring, measured on every ground it is actually bound on — by
 * reading the BINDINGS rather than by listing pairs.
 *
 * ## Why this is not three more rows in `PAIRS`
 *
 * The obvious fix for the bug below was three pairs: `on-bar` against `bar`,
 * `slab-on-surface` against the two slab surfaces. Those pass — and they would
 * pass just as well if the ring were bound to clay on every ground, because
 * they assert something about two tokens and nothing about the ring. That is
 * the "count a proxy for the property" mistake, and writing it while fixing an
 * accessibility bug is how a guard ends up protecting nothing.
 *
 * So this resolves the `--bz-ring` declarations out of the language, maps each
 * to the ground its selector applies to, and measures **what the ring will
 * actually be** there. Rebind one back to clay and this fails.
 *
 * ## The bug it exists for
 *
 * `:focus-visible` was `outline: 2px solid var(--color-focus)` with the comment
 * "never restyled per surface", and DESIGN.md said the clay was chosen so the
 * ring works "on cobalt chrome, on white cards and on the dark slab without
 * being restyled". MEASURED: clay on `bar` is 2.35:1 in light and 2.77:1 in
 * dark; on the slab's surfaces 2.56:1 and 2.90:1. SC 1.4.11 wants 3:1. It
 * cleared the floor only on the two page grounds — which are the only two
 * `graphical()` walks, which is why nothing caught it. **The bar holds the
 * first controls in the tab order on every route.**
 */
describe('the focus ring clears 3:1 on every ground it is bound on', () => {
  /** Which ground each `--bz-ring` selector puts the ring on. */
  const GROUND: Readonly<Record<string, readonly string[]>> = {
    ':root': ['surface', 'surface-raised'],
    '.bz-bar': ['bar'],
    '.bz-slab': ['slab-surface'],
    '.bz-figure': ['slab-surface', 'slab-surface-raised'],
  }

  /**
   * `selector -> the token the ring resolves to`, read out of the language.
   *
   * Comments are stripped FIRST and the selector is found by walking back from
   * the declaration to the nearest `{` — not by a rule-shaped regex. Two
   * reasons, both of which bit on the first attempt: a `/* … *\/` block before
   * a rule is captured as part of its selector, and `:root` sits inside
   * `@layer base { … }`, so a pattern that assumes one level of braces reads
   * the wrong text on the one binding that matters most.
   */
  const BINDINGS = (() => {
    const css = readFileSync(LANGUAGE, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const found: Array<{ selector: string; token: string }> = []
    for (const declaration of css.matchAll(/--bz-ring:\s*var\((--color-[a-z0-9-]+)\)/g)) {
      const before = css.slice(0, declaration.index)
      const open = before.lastIndexOf('{')
      if (open === -1) continue
      const head = before.slice(0, open)
      // The selector is whatever follows the previous `{`, `}` or `;`.
      const start = Math.max(head.lastIndexOf('{'), head.lastIndexOf('}'), head.lastIndexOf(';'))
      for (const selector of head.slice(start + 1).split(',').map((one) => one.trim())) {
        if (selector !== '') found.push({ selector, token: declaration[1] })
      }
    }
    return found
  })()

  it('reads a binding for every ground, and a ground for every binding', () => {
    // Two empty sets agree about everything, and a selector this test does not
    // know the ground of is a ring nobody is measuring.
    expect(BINDINGS.length, 'no --bz-ring bindings found in the language').toBeGreaterThan(2)
    for (const { selector } of BINDINGS) {
      expect(
        Object.keys(GROUND),
        `${selector} binds the ring and GROUND does not say what it sits on`,
      ).toContain(selector)
    }
    for (const selector of Object.keys(GROUND)) {
      expect(
        BINDINGS.map((one) => one.selector),
        `${selector} is expected to bind the ring and does not`,
      ).toContain(selector)
    }
  })

  it.each(THEMES)('clears the floor in the %s theme', (theme) => {
    for (const { selector, token } of BINDINGS) {
      for (const ground of GROUND[selector]) {
        const ring = readDesignToken(token)[theme]
        const behind = readDesignToken(`--color-${ground}`)[theme]
        const ratio = contrastRatio(ring, behind)
        expect(
          Number(ratio.toFixed(2)),
          `${selector}: ${token} on ${ground} is ${ratio.toFixed(2)}:1, under SC 1.4.11's 3:1`,
        ).toBeGreaterThanOrEqual(3)
      }
    }
  })
})

/**
 * THE SUNKEN FILL IS EXEMPTED FROM THE TEXT FLOOR, SO WHAT RESTS ON IT IS
 * CHECKED HERE INSTEAD.
 *
 * The exemption at the top of this file is real: `surface-sunken` is the hover
 * and the pressed state, and measuring every ink against a fill that appears
 * for 150ms under a cursor would fail the palette for a state nobody reads on.
 * But an exemption is only as good as its premise, and this one's premise is a
 * claim about the STYLESHEETS — that nothing rests text there. Three rules
 * falsified it and the suite could not tell, because a pairs table knows about
 * tokens and nothing about which rule paints which pair.
 *
 * So this reads the rules. For every rule in the language or a surface that
 * declares the sunken fill, any `color` in the SAME BLOCK must clear the text
 * floor on it. That is the exact shape of the three defects and it is now
 * mechanical.
 *
 * **What it cannot see, stated rather than implied:** ink that arrives by
 * INHERITANCE. `.bz-catcard[data-drawn="false"]` set only the fill, and its
 * three muted descendants were declared 60 lines away — no static reading of
 * one block could pair them. A general answer needs the cascade, which means a
 * browser, which is `colour-not-alone.spec.ts`'s layer and not this one. The
 * one known case is asserted by name below, and the honest boundary is written
 * here so the next reader does not mistake this for whole coverage.
 */
describe('nothing rests text on the sunken fill without clearing the floor', () => {
  const SUNKEN = 'surface-sunken'

  /** Every `color` declared in the same block as the sunken fill. */
  const RESTED: Array<{ where: string; selector: string; token: string }> = (() => {
    const found: Array<{ where: string; selector: string; token: string }> = []
    const files: Array<{ name: string; css: string }> = [
      { name: 'bazaar.css', css: readFileSync(LANGUAGE, 'utf8') },
      ...surfaces(),
    ]
    for (const { name, css: raw } of files) {
      const css = raw.replace(/\/\*[\s\S]*?\*\//g, ' ')
      for (const fill of css.matchAll(/background:\s*var\(--color-surface-sunken\)/g)) {
        const before = css.slice(0, fill.index)
        const open = before.lastIndexOf('{')
        if (open === -1) continue
        const head = before.slice(0, open)
        const from = Math.max(head.lastIndexOf('{'), head.lastIndexOf('}'), head.lastIndexOf(';'))
        const selector = head.slice(from + 1).trim().replace(/\s+/g, ' ')
        let depth = 1
        let at = open + 1
        while (at < css.length && depth > 0) {
          if (css[at] === '{') depth += 1
          else if (css[at] === '}') depth -= 1
          at += 1
        }
        for (const ink of css.slice(open + 1, at - 1).matchAll(/(?:^|[;\s])color:\s*var\((--color-[a-z0-9-]+)\)/g)) {
          found.push({ where: name, selector, token: ink[1] })
        }
      }
    }
    return found
  })()

  it('finds the fill at all, so the cases below are not an empty set', () => {
    // The whole block is worthless if the pattern stops matching: zero rules
    // with the fill would pass every case under it. Measured at 20 when this
    // was written, and a floor well under that is what makes it a real check
    // rather than a pinned count.
    const withFill = new Set(RESTED.map((one) => one.selector))
    expect(withFill.size, 'no rule found declaring the sunken fill').toBeGreaterThan(3)
  })

  it.each(THEMES)('holds in the %s theme', (theme) => {
    for (const { where, selector, token } of RESTED) {
      const ink = readDesignToken(token)[theme]
      const behind = readDesignToken(`--color-${SUNKEN}`)[theme]
      const ratio = contrastRatio(ink, behind)
      expect(
        Number(ratio.toFixed(2)),
        `${where} ${selector}: ${token} on ${SUNKEN} is ${ratio.toFixed(2)}:1, under the 4.5:1 text floor`,
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each(THEMES)('covers the one inherited case by name in the %s theme', (theme) => {
    // `.bz-catcard[data-drawn="false"]` declares the fill and nothing else; the
    // ink it inherits is declared elsewhere in the same file. Named here
    // because the reading above structurally cannot pair them.
    const catalog = surfaces().find((one) => one.name === 'catalog.css')
    expect(catalog, 'catalog.css').toBeDefined()
    const css = (catalog?.css ?? '').replace(/\/\*[\s\S]*?\*\//g, ' ')
    const override = /\.bz-catcard\[data-drawn="false"\][^{]*\{[^}]*color:\s*var\((--color-[a-z0-9-]+)\)/.exec(css)
    expect(
      override,
      'the planned card must state the ink that goes with its fill, not inherit a muted one',
    ).not.toBeNull()
    const ink = readDesignToken(override?.[1] ?? '--color-on-surface')[theme]
    const behind = readDesignToken(`--color-${SUNKEN}`)[theme]
    const ratio = contrastRatio(ink, behind)
    expect(
      Number(ratio.toFixed(2)),
      `the planned card's ink is ${ratio.toFixed(2)}:1 on its own fill`,
    ).toBeGreaterThanOrEqual(4.5)
  })
})
