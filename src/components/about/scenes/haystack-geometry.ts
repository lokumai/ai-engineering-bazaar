/**
 * Stall 2, "Needle in the haystack" (2A): the stack's geometry, shared by the still picture the server
 * draws as SVG and the canvas the island animates, so the two are the same haystack.
 *
 * Ported from `playground/2026-11-round-5/R2-stall-haystack.html` (`haystack()`), with its seed, so
 * every load draws the same four thousand straws. Pure: no DOM, no clock. The art's units are a
 * 1000 x 1000 square.
 */

export const HAY = {
  straw: '#dcb66a',
  ground: '#0f0e23',
  rose: '#e3a3b6',
  crimson: '#b3343f',
  steel: '#d6dce8',
  gold: '#c8a078',
  sand: '#e6dac6',
} as const

/** The same generator the playground seeds, so the stack is identical. */
export function rng(seed: number): () => number {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
export const smooth = (a: number, b: number, v: number) => {
  const x = clamp((v - a) / (b - a))
  return x * x * (3 - 2 * x)
}
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export function mix(a: string, b: string, t: number): string {
  const A = rgb(a)
  const B = rgb(b)
  return `#${A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join('')}`
}
export function rgba(hex: string, a: number): string {
  const [r, g, b] = rgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

/** The five tones of straw, from the shadow side to the lit one. */
export const RAMP = [
  mix(HAY.ground, HAY.straw, 0.3),
  mix(HAY.ground, HAY.straw, 0.5),
  mix(HAY.ground, HAY.straw, 0.72),
  HAY.straw,
  mix(HAY.straw, '#fff4da', 0.45),
] as const
/** Three straw widths: fine, middling, and the thick core. */
export const WIDTHS = [1.3, 2.1, 4.2] as const

/** The needle runs from its eye at A to its point at B. */
export const NEEDLE_A = { x: 318, y: 640 }
export const NEEDLE_B = { x: 694, y: 622 }
export const NEEDLE_L = Math.hypot(NEEDLE_B.x - NEEDLE_A.x, NEEDLE_B.y - NEEDLE_A.y)
const ux = (NEEDLE_B.x - NEEDLE_A.x) / NEEDLE_L
const uy = (NEEDLE_B.y - NEEDLE_A.y) / NEEDLE_L
/** A point `s` along the needle and `o` across it. */
export const along = (s: number, o: number): [number, number] => [NEEDLE_A.x + ux * s - uy * o, NEEDLE_A.y + uy * s + ux * o]
export const NEEDLE_WIDTH = 5.4

export interface Straw {
  x: number
  y: number
  ang: number
  len: number
  /** Width index into WIDTHS. */
  wi: number
  /** Tone index into RAMP. */
  ci: number
  v: number
  r1: number
  r2: number
  r3: number
  r4: number
  /** For a straw that blows away: the scroll progress at which it leaves. */
  th?: number
}

export interface Haystack {
  /** The bed, which stays under the needle. */
  keep: Straw[]
  /** The straw above the needle, which the wind takes. */
  fly: Straw[]
  motes: { s: number; c: number; ph: number; sp: number; r: number }[]
  drift: { off: number; y: number; sp: number; len: number; ph: number }[]
}

let cached: Haystack | null = null

export function haystack(): Haystack {
  if (cached) return cached
  const R = rng(20261109)
  const cx = 500
  const base = 800
  const RX = 390
  const H = 455
  const HB = 176
  const bedTop = (x: number) => {
    const u = (x - cx) / RX
    return base - HB * Math.pow(Math.max(0, 1 - u * u), 0.6)
  }
  const keep: Straw[] = []
  const fly: Straw[] = []
  for (let i = 0; i < 4000; i++) {
    const core = i < 1200
    const u = R() * 2 - 1
    const prof = Math.pow(1 - u * u, 0.62) * (1 + 0.05 * Math.sin(u * 7 + 1))
    const v = core ? Math.pow(R(), 0.9) * 0.93 : Math.pow(R(), 0.7)
    const x = cx + u * RX * (0.93 + R() * 0.11)
    const y = base - H * prof * v + (R() - 0.5) * 16
    const slope = (H * 0.62 * Math.pow(Math.max(0.02, 1 - u * u), -0.38) * 2 * u) / RX
    const ang = clamp(Math.atan(slope * v * 0.9), -1.2, 1.2) + (R() - 0.5) * 1.25
    const light = 0.2 + 0.46 * v + 0.2 * -u + (R() - 0.5) * 0.55
    const s: Straw = {
      x,
      y,
      ang,
      len: 24 + R() * 60,
      wi: core ? 2 : R() < 0.7 ? 0 : 1,
      ci: core ? Math.min(1, Math.round(light * 1.6)) : Math.max(0, Math.min(4, Math.round(light * 4))),
      v,
      r1: R(),
      r2: R(),
      r3: R(),
      r4: R(),
    }
    if (y > bedTop(x) + (R() - 0.5) * 26) keep.push(s)
    else {
      s.th = 0.03 + 0.36 * ((x - (cx - RX)) / (2 * RX)) + 0.16 * (1 - v) + R() * 0.2
      fly.push(s)
    }
  }
  keep.sort((a, b) => b.wi - a.wi || a.y - b.y)
  fly.sort((a, b) => Number(b.wi === 2) - Number(a.wi === 2) || a.v - b.v)
  const motes = Array.from({ length: 46 }, () => ({ s: R(), c: R(), ph: R() * 6.3, sp: 0.5 + R(), r: 1.4 + R() * 1.8 }))
  const drift = Array.from({ length: 9 }, (_, i) => ({ off: R() * 1300, y: 170 + i * 48 + R() * 30, sp: 0.6 + R() * 0.7, len: 30 + R() * 40, ph: R() * 6 }))
  cached = { keep, fly, motes, drift }
  return cached
}

/** The order the playground strokes the groups in: thick core first, then fine, then middling. */
export const WIDTH_ORDER = [2, 0, 1] as const
