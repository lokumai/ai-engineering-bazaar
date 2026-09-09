import { describe, expect, it } from 'vitest'
import { contrastRatio, relativeLuminance } from '@/lib/color/contrast'
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
 * `on-surface-faint` carries no contrast job at all now, and that is a change.
 * The old palette held its faint ink under a 3:1 ceiling; this one measures
 * 3.19 and 3.30 in light, over it. DESIGN.md governs it by usage instead —
 * "Don't let a faint status word be the only thing that says what state
 * something is in" — which is a rule about what a token may carry, not about
 * how much contrast it has.
 */

type Theme = 'light' | 'dark'
const THEMES: readonly Theme[] = ['light', 'dark']

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

  ...graphical('focus'),
  ...graphical('success'),
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
