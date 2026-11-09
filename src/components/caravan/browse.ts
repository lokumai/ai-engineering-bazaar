/**
 * M93 — what the trend list under the scene shows: the year, the search and the page, as pure
 * functions of the list, so `TrendBrowser.tsx` only holds the reader's choices and draws.
 *
 * The author: "the trend cards below should have filter based on year and search bar and be visible
 * in card mode and in list mode, somehow similar to catalog page and we should use paging meaning
 * that even after filtering, not all should be visible and only 12 of them should be visible at a
 * time". So the page size applies after filtering, a filter or a search always starts again at page
 * 1, and a trend shows under every year its span touches, so an open trend is under every year from
 * its start to the road's end.
 */

/** Trends on one page. */
export const PAGE_SIZE = 12

export interface Browsable {
  title: string
  text: string
  /** Every year the trend's span touches, in order. */
  years: readonly number[]
}

export interface Choice {
  /** A year, or null for every year. */
  year: number | null
  query: string
}

/**
 * The trends a choice keeps, in their order: in the year, and with every word of the search in the
 * title or the text. `toLowerCase`, never `toLocaleLowerCase`: in a browser set to Turkish the
 * latter turns "Interview" into "ınterview", with a dotless i, and a search for "interview" misses.
 */
export function filterTrends<T extends Browsable>(trends: readonly T[], choice: Choice): T[] {
  const words = choice.query.toLowerCase().split(/\s+/).filter((word) => word !== '')
  return trends.filter((trend) => {
    if (choice.year !== null && !trend.years.includes(choice.year)) return false
    if (words.length === 0) return true
    const haystack = `${trend.title}\n${trend.text}`.toLowerCase()
    return words.every((word) => haystack.includes(word))
  })
}

export function pageCount(found: number): number {
  return Math.max(1, Math.ceil(found / PAGE_SIZE))
}

/** A page number held inside the pages there are. */
export function clampPage(page: number, found: number): number {
  return Math.min(Math.max(1, Math.floor(page)), pageCount(found))
}

/** The trends on `page` (from 1). */
export function pageOf<T>(found: readonly T[], page: number): T[] {
  const start = (clampPage(page, found.length) - 1) * PAGE_SIZE
  return found.slice(start, start + PAGE_SIZE)
}

/**
 * The page buttons to draw, with `null` for a gap: every page while there are seven or fewer, else
 * the first, the last, and the current page with its two neighbours, the way a results page does.
 */
export function pageButtons(current: number, pages: number): (number | null)[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const near = new Set([1, pages, current - 1, current, current + 1].filter((n) => n >= 1 && n <= pages))
  const sorted = [...near].sort((a, b) => a - b)
  const out: (number | null)[] = []
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push(n - sorted[i - 1] === 2 ? n - 1 : null)
    out.push(n)
  })
  return out
}

/** "Showing 13–22 of 22": the range on this page and how many the choice kept. */
export function countLabel(page: number, found: number): string {
  if (found === 0) return 'No trend matches'
  const first = (clampPage(page, found) - 1) * PAGE_SIZE + 1
  const last = Math.min(found, first + PAGE_SIZE - 1)
  return `Showing ${first}–${last} of ${found}`
}
