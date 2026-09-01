/**
 * OKLCh → sRGB hex, for requirement B8.
 *
 * A Shiki theme is a TextMate theme: its colours must be hex. The design
 * tokens (§2.2) are `oklch()`. Rather than hand-maintain a second copy of four
 * colours in a second colour space — the exact drift §11.25 exists to prevent —
 * the build converts the tokens themselves.
 *
 * The transform is the CSS Color 4 one: OKLCh → OKLab → LMS → linear sRGB →
 * gamma-encoded sRGB, with out-of-gamut colours resolved by chroma reduction
 * rather than per-channel clipping, because clipping a channel rotates the hue
 * and a vermilion literal that arrives orange is a token that stopped meaning
 * what §2.1 says it means.
 */

const OKLCH = /^oklch\(\s*([^\s/]+)\s+([^\s/]+)\s+([^\s/]+)\s*\)$/i

/** Anything this far outside [0, 1] is float noise, not an out-of-gamut colour. */
const GAMUT_EPSILON = 1e-3
/** Chroma resolution of the gamut search: finer than one 8-bit step. */
const CHROMA_EPSILON = 1e-5

function parseNumber(raw: string, label: string, source: string): number {
  const percentage = raw.endsWith('%')
  const value = Number.parseFloat(percentage ? raw.slice(0, -1) : raw)
  if (!Number.isFinite(value)) {
    throw new Error(`oklch: ${label} "${raw}" is not a number, in "${source}"`)
  }
  return percentage ? value / 100 : value
}

/** OKLab → linear sRGB (Björn Ottosson's matrices). */
function oklabToLinearSrgb(L: number, a: number, b: number): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3

  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ]
}

function linearSrgbFor(L: number, chroma: number, hueRadians: number) {
  return oklabToLinearSrgb(L, chroma * Math.cos(hueRadians), chroma * Math.sin(hueRadians))
}

function inGamut(channels: [number, number, number]): boolean {
  return channels.every((c) => c >= -GAMUT_EPSILON && c <= 1 + GAMUT_EPSILON)
}

/** Linear → sRGB transfer function, then 8-bit quantisation. */
function encode(channel: number): string {
  const clamped = Math.min(1, Math.max(0, channel))
  const gamma = clamped <= 0.0031308
    ? 12.92 * clamped
    : 1.055 * clamped ** (1 / 2.4) - 0.055
  return Math.round(gamma * 255).toString(16).toUpperCase().padStart(2, '0')
}

/**
 * `oklch(0.22 0.012 250)` → `#31353D`. Lightness may be a percentage; alpha is
 * rejected, because a syntax-theme colour has nothing to composite against.
 */
export function oklchToHex(css: string): string {
  const source = css.trim()
  if (/\/\s*[\d.]/.test(source)) {
    throw new Error(`oklch: alpha is not representable in a hex colour, in "${source}"`)
  }

  const match = OKLCH.exec(source)
  if (!match) throw new Error(`oklch: "${source}" is not an oklch(L C H) triple`)

  const L = parseNumber(match[1], 'lightness', source)
  const chroma = Math.max(0, parseNumber(match[2], 'chroma', source))
  const hueRadians = (parseNumber(match[3], 'hue', source) * Math.PI) / 180

  let channels = linearSrgbFor(L, chroma, hueRadians)

  if (!inGamut(channels)) {
    // Binary-search the largest chroma sRGB can still show at this lightness
    // and hue. Lightness and hue are preserved exactly; only saturation gives.
    let low = 0
    let high = chroma
    while (high - low > CHROMA_EPSILON) {
      const mid = (low + high) / 2
      if (inGamut(linearSrgbFor(L, mid, hueRadians))) low = mid
      else high = mid
    }
    channels = linearSrgbFor(L, low, hueRadians)
  }

  return `#${channels.map(encode).join('')}`
}
