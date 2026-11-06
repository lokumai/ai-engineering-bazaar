'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type MiniSearch from 'minisearch'
import type { SearchResult } from 'minisearch'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SEARCH_OPEN_EVENT } from '@/lib/search/events'
import { SEARCH_LANGS, searchOptions, type SearchLang } from '@/lib/search/normalise'
import { readingTrackOf, trackLabel, type Track } from '@/lib/tracks'
import { href } from '@/lib/url'

/**
 * M59 (D95, the author's pick N2 on O1) — search, as a window over the page.
 *
 * A magnifier in the bar opens it, and so do Ctrl+K (⌘K on a Mac) and `/` (bound in the
 * site's key map, so the off switch for one-key shortcuts turns it off too). It is a native
 * modal `<dialog>`: the page behind is inert, Tab stays inside, Escape closes it, and focus
 * goes back to where it was.
 *
 * **The index loads the first time the window opens, never with the page**: MiniSearch and
 * `/search/<lang>.json`, written by the build from the corpus (`app/search/[file]`). A page
 * that is never searched pays nothing.
 *
 * **What it searches by default** is the reader's own track and language, the pages they
 * are reading in; one switch widens it to every track and language (D97, the open question
 * D95 left). Results are links: ↓ from the field moves into them, ↑ and ↓ move between them,
 * Enter follows one.
 */

type Doc = {
  module: string
  section: string
  url: string
  level: string
  track: Track
  kind: 'module' | 'section' | 'level'
  ready: boolean
  excerpt: string
  lang: SearchLang
}
type Hit = SearchResult & Doc

const LIMIT = 20
const LANG_NAME: Readonly<Record<SearchLang, string>> = { en: 'English', tr: 'Türkçe', fa: 'فارسی' }

/** The language of the page being read: its address says so (`/tr/…`, `/fa/…`). */
function langOf(pathname: string): SearchLang {
  const first = pathname.split('/').filter(Boolean)[0]
  return first === 'tr' || first === 'fa' ? first : 'en'
}

function MagnifierIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="7" cy="7" r="4.6" />
      <path d="M10.4 10.4 14 14" />
    </svg>
  )
}

/** The excerpt, with the words the reader typed marked where they appear as typed. */
function Snippet({ text, terms }: { text: string; terms: string[] }) {
  const words = terms.filter((t) => t.length > 1)
  if (words.length === 0) return <>{text}</>
  const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'giu')
  const parts = text.split(pattern)
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))}
    </>
  )
}

export function SearchDialog() {
  const pathname = usePathname() ?? '/'
  const dialog = useRef<HTMLDialogElement>(null)
  const field = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const indexes = useRef<Partial<Record<SearchLang, MiniSearch<Doc>>>>({})
  const [query, setQuery] = useState('')
  const [everything, setEverything] = useState(false)
  const [ready, setReady] = useState<Partial<Record<SearchLang, true>>>({})
  const [failed, setFailed] = useState(false)
  const [track, setTrack] = useState<Track>('engineers')
  const lang = langOf(pathname)

  useEffect(() => setTrack(readingTrackOf(pathname, true)), [pathname])

  const load = useCallback(async (langs: readonly SearchLang[]) => {
    const missing = langs.filter((l) => indexes.current[l] === undefined)
    if (missing.length === 0) return
    try {
      const { default: MiniSearchClass } = await import('minisearch')
      await Promise.all(
        missing.map(async (l) => {
          const response = await fetch(href(`/search/${l}.json`))
          if (!response.ok) throw new Error(`search index ${l}: ${response.status}`)
          indexes.current[l] = MiniSearchClass.loadJSON<Doc>(await response.text(), searchOptions(l))
          setReady((r) => ({ ...r, [l]: true }))
        }),
      )
    } catch {
      setFailed(true)
    }
  }, [])

  const open = useCallback(() => {
    const d = dialog.current
    if (d === null || d.open) return
    d.showModal()
    field.current?.select()
    void load(everything ? SEARCH_LANGS : [lang])
  }, [everything, lang, load])

  const close = useCallback(() => dialog.current?.close(), [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (dialog.current?.open) close()
        else open()
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener(SEARCH_OPEN_EVENT, open)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(SEARCH_OPEN_EVENT, open)
    }
  }, [open, close])

  /* a new page closes the window */
  useEffect(() => close(), [pathname, close])

  useEffect(() => {
    if (everything) void load(SEARCH_LANGS)
  }, [everything, load])

  const hits: Hit[] = useMemo(() => {
    const q = query.trim()
    if (q.length < 2) return []
    const langs = everything ? SEARCH_LANGS : [lang]
    const found: Hit[] = []
    for (const l of langs) {
      const index = indexes.current[l]
      if (!index) continue
      const filter = everything ? undefined : (r: SearchResult) => r.track === track
      found.push(...(index.search(q, { filter }) as Hit[]))
    }
    return found.sort((a, b) => b.score - a.score).slice(0, LIMIT)
    // `ready` is the signal that an index arrived; the indexes live in a ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, everything, lang, track, ready])

  /* What the reader typed, for marking in the excerpt: the index's own terms are normalised. */
  const typed = useMemo(() => query.trim().split(/\s+/), [query])
  const loading = !failed && !(everything ? SEARCH_LANGS.every((l) => ready[l]) : ready[lang])

  const onFieldKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      list.current?.querySelector<HTMLAnchorElement>('a')?.focus()
    }
  }
  const onListKey = (event: React.KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const links = [...(list.current?.querySelectorAll<HTMLAnchorElement>('a') ?? [])]
    const at = links.indexOf(document.activeElement as HTMLAnchorElement)
    const next = event.key === 'ArrowDown' ? at + 1 : at - 1
    if (next < 0) field.current?.focus()
    else links[Math.min(next, links.length - 1)]?.focus()
  }

  const status = query.trim().length < 2
    ? ''
    : failed
      ? 'Search could not load. Check the connection and try again.'
      : loading
        ? 'Loading…'
        : hits.length === 0
          ? 'No results'
          : `${hits.length === LIMIT ? `${LIMIT}+` : hits.length} results`

  return (
    <>
      <button
        type="button"
        className="bz-bar-icon"
        aria-label="Search"
        aria-keyshortcuts="Control+K Meta+K /"
        title="Search (Ctrl K)"
        aria-haspopup="dialog"
        onClick={open}
        data-search-open
      >
        <MagnifierIcon />
      </button>
      <dialog
        ref={dialog}
        className="bz-search"
        aria-label="Search the course"
        onClick={(event) => {
          if (event.target === dialog.current) close()
        }}
      >
        <div className="bz-search-panel">
          <div className="bz-search-field" role="search">
            <MagnifierIcon />
            <input
              ref={field}
              type="search"
              aria-label="Search the course"
              placeholder="Search the course"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onFieldKey}
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
            />
            <button type="button" className="bz-btn-quiet bz-search-close" onClick={close}>
              Close
            </button>
          </div>
          <label className="bz-search-scope">
            <input type="checkbox" checked={everything} onChange={(event) => setEverything(event.target.checked)} />
            All tracks and languages
          </label>
          <p className="bz-search-status" role="status" aria-live="polite">
            {status}
          </p>
          {hits.length > 0 && (
            <ul ref={list} className="bz-search-results" onKeyDown={onListKey}>
              {hits.map((hit) => (
                <li key={hit.id}>
                  <Link href={hit.url} onClick={close} lang={hit.lang === 'en' ? undefined : hit.lang} dir={hit.lang === 'fa' ? 'rtl' : undefined}>
                    <span className="bz-search-title">
                      {hit.module}
                      {hit.section ? <span className="bz-search-section"> · {hit.section}</span> : null}
                    </span>
                    {hit.excerpt ? (
                      <span className="bz-search-snippet">
                        <Snippet text={hit.excerpt} terms={typed} />
                      </span>
                    ) : null}
                    <span className="bz-search-meta" lang="en" dir="ltr">
                      {hit.kind === 'level' ? 'Level' : hit.level} · {trackLabel(hit.track)}
                      {everything ? ` · ${LANG_NAME[hit.lang]}` : ''}
                      {hit.ready ? '' : ' · Planned'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </dialog>
    </>
  )
}
