import { describe, expect, it } from 'vitest'
import { contrastRatio, relativeLuminance } from '@/lib/color/contrast'
import {
  CODE_TOKEN_ROLES,
  DEFAULT_TOKEN,
  readDesignToken,
} from '@/lib/content/code-theme'

/**
 * Requirement B9 — the CI contrast check, §10.1.
 *
 * The tables below are §10.1 transcribed, and every ratio is recomputed here
 * from the *live* token values in `globals.css`. Two things therefore fail the
 * build: a token edited so that a pair drops under its floor, and a token
 * edited at all in a way the spec has not been updated to match. That second
 * one is deliberate. §10.1 is a published claim about this palette; a spec
 * whose numbers quietly stop describing the shipped colours is worth less than
 * no spec, so the number has to move in both places or not at all.
 */

type Theme = 'light' | 'dark'

interface Pair {
  /** Token names without the `--color-` prefix, exactly as §10.1 writes them. */
  foreground: string
  background: string
  /** The ratio §10.1 publishes. */
  ratio: number
  /** The floor this pair must clear, or `null` for a decorative-only pair. */
  floor: number | null
}

/**
 * §10.1's ratios are quoted to two decimals; this check derives them through
 * the same OKLCh → 8-bit sRGB pipeline the Shiki theme uses (B8), so agreement
 * is to within a rounding step, not to the digit.
 */
const TOLERANCE = 0.08

const LIGHT: readonly Pair[] = [
  { foreground: 'ink', background: 'paper', ratio: 16.14, floor: 4.5 },
  { foreground: 'ink', background: 'cleared', ratio: 17.05, floor: 4.5 },
  { foreground: 'ink', background: 'sunken', ratio: 14.73, floor: 4.5 },
  { foreground: 'ink-muted', background: 'paper', ratio: 5.13, floor: 4.5 },
  { foreground: 'ink-muted', background: 'cleared', ratio: 5.42, floor: 4.5 },
  { foreground: 'ink-muted', background: 'sunken', ratio: 4.68, floor: 4.5 },
  { foreground: 'accent-ink', background: 'paper', ratio: 6.16, floor: 4.5 },
  { foreground: 'accent-ink', background: 'cleared', ratio: 6.51, floor: 4.5 },
  // Non-text UI only — 4.30 is under the 4.5 text floor, which is precisely
  // why T2 exists and why `accent-ink` is a separate token.
  { foreground: 'accent', background: 'paper', ratio: 4.30, floor: 3.0 },
  { foreground: 'line-strong', background: 'paper', ratio: 3.14, floor: 3.0 },
  { foreground: 'line-strong', background: 'cleared', ratio: 3.31, floor: 3.0 },
  { foreground: 'line-cut', background: 'paper', ratio: 7.89, floor: 3.0 },
  { foreground: 'caution-ink', background: 'paper', ratio: 5.27, floor: 4.5 },
  { foreground: 'verify-ink', background: 'paper', ratio: 5.82, floor: 4.5 },
  { foreground: 'fault-ink', background: 'paper', ratio: 7.96, floor: 4.5 },
  { foreground: 'info-ink', background: 'paper', ratio: 6.32, floor: 4.5 },
  { foreground: 'verify', background: 'paper', ratio: 3.52, floor: 3.0 },
  // Fill only, never a stroke that carries meaning alone.
  { foreground: 'caution', background: 'paper', ratio: 2.36, floor: null },
  // Decorative only (T4 / T5): no floor, but the published number still holds.
  { foreground: 'line', background: 'paper', ratio: 1.43, floor: null },
  { foreground: 'ink-faint', background: 'paper', ratio: 2.69, floor: null },
]

const DARK: readonly Pair[] = [
  { foreground: 'ink', background: 'paper', ratio: 15.17, floor: 4.5 },
  { foreground: 'ink', background: 'cleared', ratio: 13.92, floor: 4.5 },
  { foreground: 'ink', background: 'sunken', ratio: 16.01, floor: 4.5 },
  { foreground: 'ink-muted', background: 'paper', ratio: 6.00, floor: 4.5 },
  { foreground: 'ink-muted', background: 'cleared', ratio: 5.50, floor: 4.5 },
  { foreground: 'ink-muted', background: 'sunken', ratio: 6.36, floor: 4.5 },
  { foreground: 'accent-ink', background: 'paper', ratio: 8.14, floor: 4.5 },
  { foreground: 'accent', background: 'paper', ratio: 6.63, floor: 3.0 },
  { foreground: 'line-strong', background: 'paper', ratio: 3.39, floor: 3.0 },
  { foreground: 'line-strong', background: 'cleared', ratio: 3.11, floor: 3.0 },
  { foreground: 'line-cut', background: 'paper', ratio: 5.12, floor: 3.0 },
  { foreground: 'caution-ink', background: 'paper', ratio: 10.55, floor: 4.5 },
  { foreground: 'verify-ink', background: 'paper', ratio: 9.72, floor: 4.5 },
  { foreground: 'fault-ink', background: 'paper', ratio: 6.47, floor: 4.5 },
  { foreground: 'info-ink', background: 'paper', ratio: 8.77, floor: 4.5 },
  { foreground: 'line', background: 'paper', ratio: 1.42, floor: null },
  { foreground: 'ink-faint', background: 'paper', ratio: 2.40, floor: null },
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

describe.each<[Theme, readonly Pair[]]>([
  ['light', LIGHT],
  ['dark', DARK],
])('§10.1 contrast floor — %s theme', (theme, pairs) => {
  it.each(pairs.map((pair) => [`${pair.foreground} / ${pair.background}`, pair] as const))(
    '%s reproduces the ratio §10.1 publishes',
    (_label, pair) => {
      expect(Math.abs(tokenRatio(pair, theme) - pair.ratio)).toBeLessThanOrEqual(TOLERANCE)
    },
  )

  it.each(
    pairs
      .filter((pair) => pair.floor !== null)
      .map((pair) => [`${pair.foreground} / ${pair.background}`, pair] as const),
  )('%s clears its floor', (_label, pair) => {
    expect(tokenRatio(pair, theme)).toBeGreaterThanOrEqual(pair.floor as number)
  })
})

describe('the two failure modes §10.1 names', () => {
  it('keeps --color-accent under the 4.5 text floor in light, so T2 stays true', () => {
    // If this ever passes 4.5 the palette has changed enough that T2's
    // justification — "accent fails 4.5:1 in light mode" — needs rewriting.
    const ratio = contrastRatio(
      readDesignToken('--color-accent').light,
      readDesignToken('--color-paper').light,
    )
    expect(ratio).toBeLessThan(4.5)
  })

  it('keeps --color-line far below the 3.0 structural floor, so T4 stays true', () => {
    for (const theme of ['light', 'dark'] as const) {
      const ratio = contrastRatio(
        readDesignToken('--color-line')[theme],
        readDesignToken('--color-paper')[theme],
      )
      expect(ratio).toBeLessThan(3.0)
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
