/**
 * The small functions every animated scene on the site wrote for itself: a clamp, a
 * linear interpolation, a smoothstep, and the seeded generator the playground's art was
 * drawn with.
 *
 * Several scenes each had their own copy; the generators produce the same sequence for
 * the same seed, and the clamps differ only where bounds cross (see `clamp`), so one
 * definition stands for all of them.
 * What stays in each scene is what is particular to it: its easing curve, its
 * rounding, and the engraving's LCG, which is a different generator on purpose.
 */

/**
 * `v` held between `a` and `b`; with no bounds, between 0 and 1.
 *
 * **The floor wins when `a > b`** (`Math.max(a, Math.min(b, v))`). The caravan's
 * card and zoom placement call this with bounds that cross on a short window, and the
 * card must then sit at its top bound, not slide under the navigation; a ternary
 * clamp would answer the other bound.
 */
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))

/** The smoothstep curve over `t` held to [0, 1]: 0 at 0, 1 at 1, level at both ends. */
export const smoothstep = (t: number) => {
  const x = clamp(t)
  return x * x * (3 - 2 * x)
}

/** The point `t` of the way from `a` to `b`. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * Mulberry32: the generator the playground seeds, so a scene built from the same
 * seed draws the same picture. Returns numbers in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
