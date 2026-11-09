/**
 * M91, D116 — what the scene is given, and the small pure helpers every part of it shares. Ported
 * from the round-5 mockup's shared block (`buildTrends`, `heatAt`, `onRoad`).
 */

/** One trend, as the scene needs it. Its words are not here: the card shows the page's own entry. */
export interface SceneTrend {
  id: string
  title: string
  period: string
  /** First and last month on the road, as indexes into `months`. */
  si: number
  ei: number
  peak: number | null
}

export interface SceneData {
  months: string[]
  /** Per month, the summed strength of the trends on the road, scaled to the busiest month (0 to 1). */
  norm: number[]
  trends: SceneTrend[]
}

/** A trend with where its stop stands on the road, in months. */
export interface Placed extends SceneTrend {
  index: number
  at: number
}

/**
 * Where each stop stands: a quarter into its first month, or spread across the month when two or
 * more start together, so their props do not stand on one spot.
 */
export function place(trends: readonly SceneTrend[]): Placed[] {
  return trends.map((trend, index) => {
    const same = trends.filter((other) => other.si === trend.si)
    const slot = same.indexOf(trend)
    return { ...trend, index, at: trend.si + 0.25 + (same.length > 1 ? slot * 0.5 : 0.25) }
  })
}

/** The land's height at a fractional month: a Catmull-Rom curve through the months' centres. */
export function heatAt(norm: readonly number[], t: number): number {
  if (norm.length === 0) return 0
  const i = Math.floor(t - 0.5)
  const f = t - 0.5 - i
  const g = (k: number) => norm[Math.max(0, Math.min(norm.length - 1, k))]
  const p0 = g(i - 1)
  const p1 = g(i)
  const p2 = g(i + 1)
  const p3 = g(i + 2)
  const v = 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f)
  return Math.max(0, Math.min(1.05, v))
}

/** The trends on the road at month `t`, the latest `max` of them, in the order they joined. */
export function onRoad<T extends SceneTrend>(trends: readonly T[], t: number, max = 6): T[] {
  return trends.filter((trend) => t >= trend.si && t <= trend.ei + 1).slice(-max)
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export function reduced(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * At or below the language's touch floor (767px) the scene is drawn at its phone scale and the card
 * is a sheet, the same width `caravan.css` changes at. The mockup used 720px, which is no breakpoint
 * the language declares.
 */
export function isPhone(): boolean {
  return window.innerWidth <= 767
}
