/**
 * M91, D116 — months, the one unit Caravan counts in.
 *
 * A trend is a span of months (`YYYY-MM`), never a day: the evidence a trend is measured from is
 * monthly, and a stop on the road is a season or longer. So every date in `mini-courses/caravan/`
 * is a month key, and this module is the one place a key is parsed, compared, stepped or named.
 *
 * It reaches nothing, so the content layer (which validates the files at build time) and the
 * scene's island (which walks the road in the browser) share it rather than each keeping a copy.
 * A month key sorts as a string in time order, which the comparisons below rely on.
 */

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
export const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

const KEY = /^(\d{4})-(0[1-9]|1[0-2])$/

export function isMonth(value: string): boolean {
  return KEY.test(value)
}

function parts(key: string): [number, number] {
  const match = KEY.exec(key)
  if (match === null) throw new Error(`"${key}" is not a month (YYYY-MM)`)
  return [Number(match[1]), Number(match[2])]
}

export function yearOf(key: string): number {
  return parts(key)[0]
}

/** Months from `from` to `to`: 0 for the same month, negative when `to` is earlier. */
export function monthsBetween(from: string, to: string): number {
  const [y0, m0] = parts(from)
  const [y1, m1] = parts(to)
  return (y1 - y0) * 12 + (m1 - m0)
}

export function addMonths(key: string, n: number): string {
  const [y, m] = parts(key)
  const total = y * 12 + (m - 1) + n
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

/** Every month from `first` to `last`, both included. Empty when `last` is before `first`. */
export function monthRange(first: string, last: string): string[] {
  const n = monthsBetween(first, last)
  return Array.from({ length: Math.max(0, n + 1) }, (_, i) => addMonths(first, i))
}

/** `Nov 2022`, or `November 2022` when `long`. */
export function monthLabel(key: string, long = false): string {
  const [y, m] = parts(key)
  return `${(long ? MONTH_LONG : MONTH_SHORT)[m - 1]} ${y}`
}

/** The month a `Date` falls in, read in UTC so a build in any timezone agrees. */
export function monthOfDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

/**
 * A trend's span in words: `Nov 2022 to Feb 2023`, `Apr to Jun 2023` inside one year, `Mar 2025`
 * for one month, and `Since Mar 2025` while it has no end.
 */
export function periodLabel(start: string, end: string | null): string {
  if (end === null) return `Since ${monthLabel(start)}`
  if (end === start) return monthLabel(start)
  if (yearOf(start) === yearOf(end)) return `${MONTH_SHORT[parts(start)[1] - 1]} to ${monthLabel(end)}`
  return `${monthLabel(start)} to ${monthLabel(end)}`
}
