/**
 * The three small functions every animated scene on the site wrote for itself: a clamp,
 * a linear interpolation, and the seeded generator the playground's art was drawn with.
 *
 * `haystack-geometry.ts`, `treaty.ts`, `caravan/scene/model.ts`, `chase.ts`,
 * `EngravingScene.tsx` and `stall-timelines.ts` each had their own copy; the copies
 * agreed (the generators produce the same sequence for the same seed, the clamps
 * differ only in how they are written), so one definition stands for all of them.
 * What stays in each scene is what is particular to it: its easing curve, its
 * rounding, and the engraving's LCG, which is a different generator on purpose.
 */

/** `v` held between `a` and `b`; with no bounds, between 0 and 1. */
export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v)

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
