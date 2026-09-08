import { describe, expect, it } from 'vitest'
import { contrastRatio, relativeLuminance } from '@/lib/color/contrast'
import {
  CODE_TOKEN_ROLES,
  DEFAULT_TOKEN,
  readDesignToken,
} from '@/lib/content/code-theme'

/**
 * Requirement B9 — the CI contrast check.
 *
 * Every ratio below is recomputed from the *live* token values in
 * `globals.css`, so a token edited under its floor fails the build.
 *
 * ## What changed here in M9, and why it is less rather than more
 *
 * This file used to carry §10.1's published ratio for every pair and assert
 * the shipped palette reproduced it to within 0.08. That was a reasonable
 * instrument while §10.1 was the authority. It is not one now: the palette was
 * replaced wholesale (`kia-context/logs/BRAINSTORM.md` D12), and a table of
 * twenty pinned numbers is precisely what `tests/README.md` forbids — a fact
 * written down, which turns an ordinary token edit into twenty red tests and
 * teaches nobody anything. The floors are the rule; the exact ratio is a
 * consequence.
 *
 * So each pair now declares the JOB its foreground does, and the job carries
 * the threshold:
 *
 *  - `text` — 4.5:1. Anything that can carry a sentence.
 *  - `graphic` — 3.0:1. A fill, a stroke or a state marker (SC 1.4.11).
 *  - `decorative` — a CEILING, not a floor. `line` and `ink-faint` must stay
 *    BELOW the structural threshold, because the moment one of them clears it
 *    somebody will reach for it to carry meaning, and a rule enforced by
 *    "please do not" is not enforced. This direction is the one the old table
 *    only commented on.
 */

type Theme = 'light' | 'dark'

type Job = 'text' | 'graphic' | 'decorative'

const FLOOR: Record<Job, number> = { text: 4.5, graphic: 3.0, decorative: 3.0 }

interface Pair {
  /** Token names without the `--color-` prefix. */
  foreground: string
  background: string
  job: Job
}

/**
 * The Bazaar palette, by role. Both themes carry the same pairs, because a
 * token that can hold a sentence in light has to hold one in dark.
 */
const PAIRS: readonly Pair[] = [
  { foreground: 'ink', background: 'paper', job: 'text' },
  { foreground: 'ink', background: 'cleared', job: 'text' },
  { foreground: 'ink', background: 'sunken', job: 'text' },
  { foreground: 'ink-muted', background: 'paper', job: 'text' },
  { foreground: 'ink-muted', background: 'cleared', job: 'text' },
  { foreground: 'ink-muted', background: 'sunken', job: 'text' },
  { foreground: 'accent', background: 'paper', job: 'text' },
  { foreground: 'accent', background: 'cleared', job: 'text' },
  { foreground: 'accent-ink', background: 'paper', job: 'text' },
  { foreground: 'accent-ink', background: 'cleared', job: 'text' },
  { foreground: 'caution-ink', background: 'paper', job: 'text' },
  { foreground: 'verify-ink', background: 'paper', job: 'text' },
  { foreground: 'fault-ink', background: 'paper', job: 'text' },
  { foreground: 'info-ink', background: 'paper', job: 'text' },
  { foreground: 'line-strong', background: 'paper', job: 'graphic' },
  { foreground: 'line-strong', background: 'cleared', job: 'graphic' },
  { foreground: 'line-cut', background: 'paper', job: 'graphic' },
  { foreground: 'caution', background: 'paper', job: 'graphic' },
  { foreground: 'verify', background: 'paper', job: 'graphic' },
  { foreground: 'fault', background: 'paper', job: 'graphic' },
  { foreground: 'focus', background: 'paper', job: 'graphic' },
  /**
   * `sunken` is the tightest ground on the site — it is the sand, the darkest
   * of the three in light mode — and it is where an input, a card's header
   * strip and the current level's fill live. The first version of this table
   * paired it with `ink` and `ink-muted` only, which left the two things that
   * actually sit on it untested: **an interactive border**, which has to reach
   * 3:1 there or the control is unperceivable, and **a status ink**, which has
   * to reach 4.5:1 there or a state that is only stated in words cannot be
   * read. Found in review, not by the suite.
   */
  { foreground: 'line-control', background: 'paper', job: 'graphic' },
  { foreground: 'line-control', background: 'cleared', job: 'graphic' },
  { foreground: 'line-control', background: 'sunken', job: 'graphic' },
  { foreground: 'line-cut', background: 'sunken', job: 'graphic' },
  { foreground: 'focus', background: 'sunken', job: 'graphic' },
  { foreground: 'accent', background: 'sunken', job: 'text' },
  { foreground: 'caution-ink', background: 'sunken', job: 'text' },
  { foreground: 'verify-ink', background: 'sunken', job: 'text' },
  { foreground: 'fault-ink', background: 'sunken', job: 'text' },
  { foreground: 'info-ink', background: 'sunken', job: 'text' },
  /**
   * The ceiling holds on every ground, not only on `paper`. A decorative token
   * that creeps over 3:1 against the raised or the sunken surface is just as
   * usable as a meaningful mark there, and the whole point of the ceiling is
   * that nobody can reach for one.
   */
  { foreground: 'line', background: 'paper', job: 'decorative' },
  { foreground: 'line', background: 'cleared', job: 'decorative' },
  { foreground: 'line', background: 'sunken', job: 'decorative' },
  { foreground: 'ink-faint', background: 'paper', job: 'decorative' },
  { foreground: 'ink-faint', background: 'cleared', job: 'decorative' },
  { foreground: 'ink-faint', background: 'sunken', job: 'decorative' },
]

const LIGHT = PAIRS
const DARK = PAIRS

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

describe.each<[Theme, readonly Pair[]]>([
  ['light', LIGHT],
  ['dark', DARK],
])('the contrast floor — %s theme', (theme, pairs) => {
  it.each(
    pairs
      .filter((pair) => pair.job !== 'decorative')
      .map((pair) => [`${pair.foreground} / ${pair.background} (${pair.job})`, pair] as const),
  )('%s clears the floor its job carries', (_label, pair) => {
    expect(tokenRatio(pair, theme)).toBeGreaterThanOrEqual(FLOOR[pair.job])
  })

  /**
   * The other direction, and the one that actually protects the design system:
   * a decorative token has to stay UNDER the structural threshold. If `line`
   * ever clears 3:1 it becomes usable as a meaningful boundary, and the two
   * line jobs — grouping and identifying — collapse into one. On this ground
   * that split is the whole reason `line-strong` exists (BRAINSTORM.md O4).
   */
  it.each(
    pairs
      .filter((pair) => pair.job === 'decorative')
      .map((pair) => [`${pair.foreground} / ${pair.background}`, pair] as const),
  )('%s stays below the structural threshold, so it cannot carry meaning', (_label, pair) => {
    expect(tokenRatio(pair, theme)).toBeLessThan(FLOOR.decorative)
  })
})

describe('what the palette change settled, and what it did not', () => {
  /**
   * T2 is retired, and this is where that is recorded.
   *
   * The retired palette's accent was an orange at 4.30:1 on paper — under the
   * text floor — so T2 forbade painting text with `--color-accent` and gave
   * every label a second token, `--color-accent-ink`. Bazaar's accent is
   * cobalt at 12.88:1. The rule has nothing left to protect against, the two
   * tokens now hold the same value, and both are kept only so that no
   * stylesheet has to be renamed.
   *
   * Asserted rather than deleted: if somebody lightens the accent back under
   * the floor, this test says which rule they have just re-created.
   */
  it('has an accent that can carry text, in both themes, so T2 no longer applies', () => {
    for (const theme of ['light', 'dark'] as const) {
      const ratio = contrastRatio(
        readDesignToken('--color-accent')[theme],
        readDesignToken('--color-paper')[theme],
      )
      expect(ratio, theme).toBeGreaterThanOrEqual(4.5)
    }
  })

  /**
   * A raised surface is defined by its border on this ground, not by its fill.
   * The gap is 1.035 in luminance — three and a half per cent — which is why
   * `specs/DESIGN.md` bans dropping a card's hairline. Asserted as "barely
   * lighter" in both directions: lighter, because a card is never darker than
   * its page, and barely, because a card that separates on fill alone would
   * mean the border could go.
   */
  it('raises a surface by a hairline and not by a fill', () => {
    for (const theme of ['light', 'dark'] as const) {
      const paper = relativeLuminance(readDesignToken('--color-paper')[theme])
      const cleared = relativeLuminance(readDesignToken('--color-cleared')[theme])
      expect(cleared, theme).toBeGreaterThan(paper)
      expect(contrastRatio(
        readDesignToken('--color-cleared')[theme],
        readDesignToken('--color-paper')[theme],
      ), theme).toBeLessThan(1.6)
    }
  })
})

/**
 * §6.7's four tokens, against the ground §6.7 puts them on.
 *
 * The tables above pair a token with `paper` and `cleared`; a code block is
 * `--color-sunken`, which is the darkest ground in light mode and therefore
 * the tightest pairing on the site. §6.7 originally gave the comment token
 * `--color-ink-faint`, which is 2.45:1 there — under half the floor, on real
 * teaching prose (`# Add some code snippets with embeddings`). T5 forbids
 * exactly that, and §1 gives the floor the last word over a component.
 *
 * The light pass has ~0.2 of headroom, so this check is not optional
 * decoration: nudge `--color-ink-muted` a shade lighter and comments drop
 * under 4.5 with nothing else on the site changing.
 */
describe('§6.7 syntax tokens on the code ground', () => {
  const ground = (theme: Theme) => readDesignToken('--color-sunken')[theme]

  it.each(
    (['light', 'dark'] as const).flatMap((theme) =>
      [...CODE_TOKEN_ROLES.map((role) => role.token), DEFAULT_TOKEN].map(
        (token) => [theme, token] as const,
      ),
    ),
  )('%s: %s clears 4.5:1 on --color-sunken', (theme, token) => {
    expect(contrastRatio(readDesignToken(token)[theme], ground(theme))).toBeGreaterThanOrEqual(4.5)
  })

  it('never paints a comment in the decorative ink T5 refuses', () => {
    const comment = CODE_TOKEN_ROLES.find((role) => role.scope.includes('comment'))
    expect(comment?.token).not.toBe('--color-ink-faint')
  })
})
