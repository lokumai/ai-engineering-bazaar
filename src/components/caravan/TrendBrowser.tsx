'use client'

import { useEffect, useRef, useState } from 'react'
import { ViewIcon } from '@/components/catalog/ViewIcon'
import { clampPage, countLabel, filterTrends, PAGE_SIZE, pageButtons, pageCount, pageOf } from './browse'
import { type ListTrend, TrendEntry } from './TrendEntry'

/**
 * M93 — the list of every trend under the scene, browsed the way the catalog is: a search, a year
 * filter, a Cards and a List view, and twelve to a page with Previous and Next (`browse.ts` holds
 * the rules, the author's words are there).
 *
 * **The catalog's controls, not new ones.** The rows are the catalog's filter bar (`bz-filters`,
 * `bz-chip-row` with its visible `Year:` name, `bz-viewtoggle` with the catalog's icons, the count
 * on the bar's trailing edge, said in a live region), the search is the language's field, and the page
 * buttons are chips, the current one marked the way the catalog marks the current level
 * (`aria-current="page"`). Two things differ, each for a reason. The view is React state carried
 * by `aria-pressed`, where the catalog stamps `<html>` before paint and says `Showing`: the
 * catalog's view is a stored preference that must be right in frame one, and this one is not
 * stored. And the choices are not in the address, because the catalog keeps none there either.
 *
 * **Without the island every trend is listed**, as cards, and the controls are not shown. The
 * first render (the server's, and the first in the browser) hides nothing, and the controls and the
 * paging are keyed on `data-cv-browse`, which only this island sets once it has run (`caravan.css`).
 * So a page whose script never runs, and a page whose script ran but whose island did not (a chunk
 * that failed to load, a hydration error), both keep a full list and no dead control. The cost is
 * that the list shortens to one page when the island starts, below the scene, out of view on load.
 *
 * Every entry stays in the page on every page, hidden or not, because the scene's card copies a
 * trend's entry from here whichever page it is on.
 *
 * **The count is announced once the reader pauses** (`ANNOUNCE_MS`), not on every keystroke of a
 * search: the visible count follows each key, the live region only its settled value.
 */

type View = 'cards' | 'list'

const VIEWS: readonly { id: View; name: string; icon: 'cards' | 'table' }[] = [
  { id: 'cards', name: 'Cards', icon: 'cards' },
  { id: 'list', name: 'List', icon: 'table' },
]

/** How long the count must hold still before the live region says it. */
const ANNOUNCE_MS = 500

/** The id a `#trend-<id>` address names, or null for any other hash, or one that does not decode. */
function hashTrend(hash: string): string | null {
  if (!hash.startsWith('#trend-')) return null
  try {
    return decodeURIComponent(hash.slice('#trend-'.length))
  } catch {
    return null
  }
}

/** Why nothing is shown, naming only the filters that are set. */
function noMatch(year: number | null, query: string): string {
  const words = query.trim()
  if (year !== null && words !== '') return `No trend in ${year} matches “${words}”.`
  if (year !== null) return `No trend in ${year}.`
  return `No trend matches “${words}”.`
}

export function TrendBrowser({ trends, years, sample }: { trends: readonly ListTrend[]; years: readonly number[]; sample: boolean }) {
  const [ready, setReady] = useState(false)
  const [year, setYear] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<View>('cards')
  const [page, setPage] = useState(1)
  /** The trend a `#trend-<id>` address opened on a later page, to bring into view once it shows. */
  const [jump, setJump] = useState<string | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const search = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setReady(true)
    // A link to one trend opens the page it is on.
    const id = hashTrend(window.location.hash)
    const at = id === null ? -1 : trends.findIndex((trend) => trend.id === id)
    if (at >= PAGE_SIZE) {
      setPage(Math.floor(at / PAGE_SIZE) + 1)
      setJump(id)
    }
  }, [trends])

  // The browser scrolled to the entry before the list was paged; once its page shows, scroll again.
  useEffect(() => {
    if (jump === null) return
    document.getElementById(`trend-${jump}`)?.scrollIntoView({ block: 'start' })
    setJump(null)
  }, [jump, page])

  const found = filterTrends(trends, { year, query })
  const pages = pageCount(found.length)
  const current = clampPage(page, found.length)
  const onPage = new Set(pageOf(found, current).map((trend) => trend.id))
  const count = countLabel(current, found.length)

  const [announced, setAnnounced] = useState(count)
  useEffect(() => {
    const timer = window.setTimeout(() => setAnnounced(count), ANNOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [count])

  function choose(next: { year?: number | null; query?: string }): void {
    if (next.year !== undefined) setYear(next.year)
    if (next.query !== undefined) setQuery(next.query)
    setPage(1)
  }

  /** A new page starts at the list's heading, as a new page of results would. */
  function go(to: number): void {
    setPage(clampPage(to, found.length))
    requestAnimationFrame(() => heading.current?.focus())
  }

  function clear(): void {
    choose({ year: null, query: '' })
    requestAnimationFrame(() => search.current?.focus())
  }

  return (
    <section className="cv-list" aria-labelledby="cv-list-title" data-cv-view={view} data-cv-browse={ready ? '' : undefined}>
      <h2 className="bz-section" id="cv-list-title" ref={heading} tabIndex={-1}>Trends</h2>

      <div className="bz-filters cv-filters cv-js">
        <div className="bz-field cv-search" role="search">
          <label className="bz-chip-label" htmlFor="cv-search">Search:</label>
          <input
            ref={search}
            id="cv-search"
            type="search"
            placeholder="Title or text"
            value={query}
            onChange={(event) => choose({ query: event.target.value })}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
          />
        </div>

        <div className="bz-chip-row" role="group" aria-labelledby="cv-chips-year">
          <span className="bz-chip-label" id="cv-chips-year">Year:</span>
          <button type="button" className="bz-chip" aria-pressed={year === null} onClick={() => choose({ year: null })}>
            All
          </button>
          {years.map((one) => (
            <button key={one} type="button" className="bz-chip" aria-pressed={year === one} onClick={() => choose({ year: one })}>
              {one}
            </button>
          ))}
        </div>

        <div className="bz-filter-last">
          <div className="bz-viewtoggle" role="group" aria-labelledby="cv-chips-view">
            <span className="bz-chip-label" id="cv-chips-view">View:</span>
            {VIEWS.map((one) => (
              <button key={one.id} type="button" className="bz-viewbtn" aria-pressed={view === one.id} onClick={() => setView(one.id)}>
                <ViewIcon id={one.icon} />
                {one.name}
              </button>
            ))}
          </div>
          <p className="bz-filter-count">{count}</p>
          <p className="sr-only" role="status" data-cv-count="">{announced}</p>
        </div>
      </div>

      {ready && found.length === 0 ? (
        <div className="bz-empty">
          <p className="bz-empty-status">{noMatch(year, query)}</p>
          <button type="button" className="bz-btn bz-empty-path" onClick={clear}>
            Show every trend
          </button>
        </div>
      ) : null}

      <ol className="cv-entries">
        {trends.map((trend) => (
          <li key={trend.id} hidden={ready && !onPage.has(trend.id)}>
            <TrendEntry trend={trend} sample={sample} />
          </li>
        ))}
      </ol>

      {pages > 1 ? (
        <nav className="cv-pages cv-js" aria-label="Pages">
          <button type="button" className="bz-chip cv-page-step" aria-label="Previous page" disabled={current === 1} onClick={() => go(current - 1)}>
            <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><path d="M8.5 3.5 5 7l3.5 3.5" /></svg>
            Previous
          </button>
          {pageButtons(current, pages).map((n, i) => (n === null
            ? <span key={`gap-${i}`} className="cv-page-gap" aria-hidden="true">…</span>
            : (
              <button
                key={n}
                type="button"
                className="bz-chip cv-page"
                aria-label={`Page ${n}`}
                aria-current={n === current ? 'page' : undefined}
                onClick={() => go(n)}
              >
                {n}
              </button>
            )))}
          <button type="button" className="bz-chip cv-page-step" aria-label="Next page" disabled={current === pages} onClick={() => go(current + 1)}>
            Next
            <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><path d="M5.5 3.5 9 7l-3.5 3.5" /></svg>
          </button>
        </nav>
      ) : null}
    </section>
  )
}
