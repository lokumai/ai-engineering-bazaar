/**
 * WCAG 2.2 contrast, for requirement B9 (§10.1).
 *
 * The ratios in §10.1 are a published claim about this palette, and a claim
 * nothing checks is a comment. This computes them from the token values that
 * actually ship — `globals.css`, read by `readDesignToken` — so a token edited
 * without re-deriving the table fails the build rather than the audit.
 *
 * Colours arrive as `oklch()` because that is what §2.2 declares. They are
 * taken to sRGB through `oklchToHex`, the same pipeline the Shiki theme uses
 * (B8): one conversion, one gamut policy, no second implementation to drift.
 * The 8-bit quantisation that pipeline applies costs at most ~0.07 against a
 * full-precision ratio, which is inside the rounding of §10.1's own two
 * decimals and nowhere near any floor.
 */

import { oklchToHex } from './oklch'

const HEX = /^#([0-9a-f]{6})$/i

/** sRGB gamma transfer, WCAG 2.x's formulation. */
function linearise(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

function channels(color: string): [number, number, number] {
  const source = color.trim()
  const hex = HEX.test(source) ? source : oklchToHex(source)
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
}

/**
 * WCAG relative luminance of an `oklch(…)` token or a `#RRGGBB` literal.
 * Alpha is not accepted: a translucent colour has no luminance until it is
 * composited, and every pair in §10.1 is opaque on purpose.
 */
export function relativeLuminance(color: string): number {
  const [r, g, b] = channels(color).map((c) => linearise(c / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** The (L1 + 0.05) / (L2 + 0.05) ratio, in [1, 21]. Order does not matter. */
export function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a)
  const second = relativeLuminance(b)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}
