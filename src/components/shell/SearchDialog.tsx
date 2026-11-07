'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type MiniSearch from 'minisearch'
import type { SearchResult } from 'minisearch'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SEARCH_OPEN_EVENT } from '@/lib/search/events'
import { SEARCH_LANGS, joinedVariant, normalise, queryTokenize, searchOptions, type SearchLang } from '@/lib/search/normalise'
import { DIALOG_SELECTOR } from '@/lib/record/keys'
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
 * **What it searches by default is everything** (D104, which replaces D97's own-track,
 * own-language default): every track, level and language. The reader's own language's index
 * loads when the window opens and the other two on the first search, never with the page.
 * **Filters** are a disclosure under the field, closed by default (D104): a chip per track,
 * per level and per language, where a pressed chip narrows and a group with nothing pressed
 * does not. **The chips apply only while the panel is open**, so opening it changes nothing
 * (nothing is pressed) and closing it stops the filtering: a reader cannot be narrowed by
 * something they cannot see. Their pressed state is kept while it is shut, and reopening shows
 * it and applies it again. The reader's own track and language still decide order, as a
 * tie-break. Each result carries a bar in its level's hue, on its start edge; the level is
 * also written in its meta line. Results are links: ↓ from the field moves into them, ↑ and ↓
 * move between them, Enter follows one.
 *
 * The toggle is a `<button aria-expanded>`, not a `<details>`: Chrome does not close a
 * `<details>` on Escape, and here Escape must keep closing the window.
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

export interface SearchLevel {
  slug: string
  title: string
}

/** What the reader has pressed. A group with nothing pressed does not narrow. */
interface Chosen {
  tracks?: Track[]
  levels?: string[]
  langs?: SearchLang[]
}

const LIMIT = 20
const LANG_NAME: Readonly<Record<SearchLang, string>> = { en: 'English', tr: 'Türkçe', fa: 'فارسی' }
const TRACK_CHOICES: readonly Track[] = ['engineers', 'everyone']

/** The languages a choice searches: none pressed is all of them. */
const searched = (langs: readonly SearchLang[]): readonly SearchLang[] => (langs.length > 0 ? langs : SEARCH_LANGS)

const toggled = <T,>(list: readonly T[], one: T): T[] => (list.includes(one) ? list.filter((x) => x !== one) : [...list, one])

/** The language of the page being read: its address says so (`/tr/…`, `/fa/…`). */
function langOf(pathname: string): SearchLang {
  const first = pathname.split('/').filter(Boolean)[0]
  return first === 'tr' || first === 'fa' ? first : 'en'
}

function Chevron() {
  return (
    <svg className="bz-search-chevron" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 6.5 8 10.5 12 6.5" />
    </svg>
  )
}

function MagnifierIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="7" cy="7" r="4.6" />
      <path d="M10.4 10.4 14 14" />
    </svg>
  )
}

const WINDOW = 220
const WORD = /([\p{L}\p{N}\p{M}\u200c]+)/u

/**
 * The excerpt around the first word that matched, with every matching word marked. A word
 * matches when the same normaliser the index uses makes it start with a typed word, so
 * "gorev" marks "görev" and an Arabic yeh marks a Persian one (M59 review).
 */
function Snippet({ text, terms, lang }: { text: string; terms: string[]; lang: SearchLang }) {
  const wanted = terms.map((t) => normalise(t, lang)).filter((t) => t.length > 1)
  const parts = text.split(WORD)
  const hit = (part: string, i: number) => i % 2 === 1 && wanted.some((w) => normalise(part, lang).startsWith(w))
  let at = parts.findIndex(hit)
  let from = 0
  if (at > 0) {
    const before = parts.slice(0, at).join('').length
    if (before > WINDOW / 3) {
      let chars = 0
      for (from = at; from > 0 && chars < WINDOW / 4; from -= 1) chars += parts[from - 1].length
    }
  } else at = 0
  const shown: Array<{ text: string; mark: boolean }> = []
  let length = 0
  for (let i = from; i < parts.length && length < WINDOW; i += 1) {
    shown.push({ text: parts[i], mark: hit(parts[i], i) })
    length += parts[i].length
  }
  const cut = shown.reduce((n, p) => n + p.text.length, 0) < parts.join('').length - parts.slice(0, from).join('').length
  return (
    <>
      {from > 0 ? '…' : null}
      {shown.map((p, i) => (p.mark ? <mark key={i}>{p.text}</mark> : p.text))}
      {cut ? '…' : null}
    </>
  )
}

export function SearchDialog({ levels }: { levels: readonly SearchLevel[] }) {
  const pathname = usePathname() ?? '/'
  const router = useRouter()
  const dialog = useRef<HTMLDialogElement>(null)
  const field = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const downOnBackdrop = useRef(false)
  const indexes = useRef<Partial<Record<SearchLang, MiniSearch<Doc>>>>({})
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState<Chosen>({})
  const [ready, setReady] = useState<Partial<Record<SearchLang, true>>>({})
  const [failed, setFailed] = useState(false)
  const [track, setTrack] = useState<Track>('engineers')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const lang = langOf(pathname)
  /* what the chips show */
  const tracks = chosen.tracks ?? []
  const langs = chosen.langs ?? []
  const chosenLevels = chosen.levels ?? []
  const narrowed = tracks.length + langs.length + chosenLevels.length > 0
  /* what the search uses: the chips only while the panel is open */
  const useTracks: readonly Track[] = filtersOpen ? tracks : []
  const useLangs: readonly SearchLang[] = filtersOpen ? langs : []
  const useLevels: readonly string[] = filtersOpen ? chosenLevels : []
  const trackKey = useTracks.join()
  const langKey = useLangs.join()
  const levelKey = useLevels.join()
  const searchedLangs = searched(useLangs)
  const searching = query.trim().length >= 2
  const levelOf = useMemo(() => new Map(levels.map((l) => [l.title, l.slug])), [levels])

  /* a new page starts again: nothing pressed, the panel shut */
  useEffect(() => {
    setTrack(readingTrackOf(pathname, true))
    setChosen({})
    setFiltersOpen(false)
  }, [pathname])

  /* one fetch per language: a second opening, or the switch ticked during a load, waits for it */
  const inFlight = useRef<Partial<Record<SearchLang, Promise<void>>>>({})
  const load = useCallback(async (langs: readonly SearchLang[]) => {
    const missing = langs.filter((l) => indexes.current[l] === undefined)
    if (missing.length === 0) return
    setFailed(false)
    try {
      const { default: MiniSearchClass } = await import('minisearch')
      await Promise.all(
        missing.map((l) => {
          inFlight.current[l] ??= (async () => {
            const response = await fetch(href(`/search/${l}.json`))
            if (!response.ok) throw new Error(`search index ${l}: ${response.status}`)
            indexes.current[l] = MiniSearchClass.loadJSON<Doc>(await response.text(), searchOptions(l))
            setReady((r) => ({ ...r, [l]: true }))
          })().catch((error: unknown) => {
            delete inFlight.current[l]
            throw error
          })
          return inFlight.current[l]
        }),
      )
    } catch {
      setFailed(true)
    }
  }, [])

  const open = useCallback(() => {
    const d = dialog.current
    if (d === null || d.open) return
    /* the track is read now: on a page in neither track the bar's switch does not navigate */
    setTrack(readingTrackOf(window.location.pathname, true))
    d.showModal()
    field.current?.select()
    /* the page's own language now; the others with the first search (below) */
    void load([lang])
  }, [lang, load])

  /* an index the search needs is fetched when there is something to search for, never earlier */
  useEffect(() => {
    if (searching) void load(searchedLangs)
    // `searchedLangs` is rebuilt each render; its content is what the effect depends on
  }, [searching, langKey, load])

  const close = useCallback(() => dialog.current?.close(), [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      /* by the key's place, so a Persian or Turkish layout works; not over another dialog */
      const other = event.target instanceof Element && event.target.closest(DIALOG_SELECTOR) !== null && !dialog.current?.contains(event.target)
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.code === 'KeyK' && !other) {
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

  const hits: Hit[] = useMemo(() => {
    const q = query.trim()
    if (q.length < 2) return []
    /* a group with nothing pressed does not narrow, and a shut panel presses nothing */
    const wantedTracks = useTracks.length > 0 ? useTracks : TRACK_CHOICES
    const wantedLangs = searched(useLangs)
    const wantedLevels = useLevels.flatMap((slug) => levels.filter((l) => l.slug === slug).map((l) => l.title))
    const found: Hit[] = []
    for (const l of wantedLangs) {
      const index = indexes.current[l]
      if (!index) continue
      const filter = (r: SearchResult) =>
        wantedTracks.includes(r.track) && (wantedLevels.length === 0 || wantedLevels.includes(r.level))
      /* the page's own language and track win a tie (D97's order, no longer its scope) */
      const own = l === lang ? 1.2 : 1
      const variant = joinedVariant(q, l)
      const asked = variant === null ? q : { combineWith: 'OR' as const, queries: [q, variant] }
      found.push(...(index.search(asked, { filter, tokenize: queryTokenize }) as Hit[]).map((h) => ({ ...h, score: h.score * own * (h.track === track ? 1.1 : 1) })))
    }
    /* a level is in every language's index: one row per address */
    const best = new Map<string, Hit>()
    for (const hit of found) if ((best.get(hit.url)?.score ?? -1) < hit.score) best.set(hit.url, hit)
    return [...best.values()].sort((a, b) => b.score - a.score).slice(0, LIMIT)
    // `ready` changes when an index arrives; the indexes themselves live in a ref
  }, [query, trackKey, langKey, levelKey, lang, track, levels, ready])

  /* What the reader typed, for marking in the excerpt: the index's own terms are normalised. */
  const typed = useMemo(() => query.trim().split(/\s+/), [query])
  const loading = !failed && !searchedLangs.every((l) => ready[l])

  /* a pressed chip narrows; an index a pressed language needs is fetched now, never earlier */
  const choose = (next: Chosen) => {
    setChosen(next)
    void load(searched(next.langs ?? []))
  }

  const onFieldKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      list.current?.querySelector<HTMLAnchorElement>('a')?.focus()
    } else if (event.key === 'Enter' && hits.length > 0 && !event.nativeEvent.isComposing) {
      event.preventDefault()
      go(hits[0].url)
    } else if (event.key === 'Escape') {
      /* a search field's own Escape empties it; here Escape closes the window, as everywhere */
      event.preventDefault()
      close()
    }
  }
  /* Tab and Shift+Tab go round the window rather than out of it into the browser */
  /* A section of the page already open, with its address already in the bar, gives the
     router nothing to do; scroll to it directly (PR #69 review). */
  const go = (url: string, event?: React.MouseEvent) => {
    close()
    const [path, id] = url.split('#')
    if (id && path === window.location.pathname) {
      event?.preventDefault()
      document.getElementById(decodeURIComponent(id))?.scrollIntoView()
      history.replaceState(null, '', url)
      return
    }
    if (!event) router.push(url)
  }
  const onDialogKey = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab') return
    /* a shut panel's chips are in the document but not reachable */
    const stops = [...(dialog.current?.querySelectorAll<HTMLElement>('input, button, a[href]') ?? [])].filter((el) => el.closest('[hidden]') === null)
    if (stops.length === 0) return
    const first = stops[0]
    const last = stops[stops.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
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
        aria-label="Search"
        onKeyDown={onDialogKey}
        /* the backdrop closes it, but not a drag that began in the field and ended there */
        onMouseDown={(event) => {
          downOnBackdrop.current = event.target === dialog.current
        }}
        onClick={(event) => {
          if (event.target === dialog.current && downOnBackdrop.current) close()
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
              dir="auto"
            />
            <button type="button" className="bz-btn-quiet bz-search-close" onClick={close}>
              Close
            </button>
          </div>
          {/* D103/D104: a pressed chip narrows, a group with nothing pressed does not, and the
              chips count only while this panel is open. Shut, the search is everything. */}
          <div className="bz-search-filter">
            <button
              type="button"
              className="bz-search-toggle"
              aria-expanded={filtersOpen}
              aria-controls="bz-search-filters"
              onClick={() => setFiltersOpen((o) => !o)}
            >
              Filters
              <Chevron />
            </button>
            <div className="bz-search-filters" id="bz-search-filters" role="group" aria-label="Narrow the results" hidden={!filtersOpen}>
              <div className="bz-chip-row" role="group" aria-labelledby="bz-search-f-track">
                <span className="bz-chip-label" id="bz-search-f-track">
                  Track:
                </span>
                <div className="bz-search-chips">
                  {TRACK_CHOICES.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className="bz-chip"
                      aria-pressed={tracks.includes(id)}
                      onClick={() => choose({ ...chosen, tracks: toggled(tracks, id) })}
                    >
                      {trackLabel(id)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bz-chip-row" role="group" aria-labelledby="bz-search-f-level">
                <span className="bz-chip-label" id="bz-search-f-level">
                  Level:
                </span>
                <div className="bz-search-chips">
                  {levels.map((one) => (
                    <button
                      key={one.slug}
                      type="button"
                      className="bz-chip"
                      data-cat={one.slug}
                      aria-pressed={chosenLevels.includes(one.slug)}
                      onClick={() => choose({ ...chosen, levels: toggled(chosenLevels, one.slug) })}
                    >
                      <span aria-hidden="true" className="bz-chip-key" />
                      {one.title}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bz-chip-row" role="group" aria-labelledby="bz-search-f-lang">
                <span className="bz-chip-label" id="bz-search-f-lang">
                  Language:
                </span>
                <div className="bz-search-chips">
                  {SEARCH_LANGS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className="bz-chip"
                      aria-pressed={langs.includes(id)}
                      lang={id === 'en' ? undefined : id}
                      onClick={() => choose({ ...chosen, langs: toggled(langs, id) })}
                    >
                      {LANG_NAME[id]}
                    </button>
                  ))}
                  {narrowed ? (
                    <button type="button" className="bz-btn-quiet bz-search-reset" onClick={() => choose({})}>
                      Reset filters
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <p className="bz-search-status" role="status" aria-live="polite">
            {status}
          </p>
          {hits.length > 0 && (
            <ul ref={list} className="bz-search-results" onKeyDown={onListKey}>
              {hits.map((hit, n) => (
                <li key={hit.id} data-cat={levelOf.get(hit.level)}>
                  <Link
                    href={hit.url}
                    onClick={(event) => go(hit.url, event)}
                    lang={hit.lang === 'en' ? undefined : hit.lang}
                    dir={hit.lang === 'fa' ? 'rtl' : undefined}
                    aria-describedby={`bz-search-hit-${n}`}
                  >
                    {/* the level's hue on the row's start edge (the right of a Persian row);
                        the level's name is in the line under the title */}
                    <span className="bz-search-key" aria-hidden="true" />
                    <span className="bz-search-main">
                      <span className="bz-search-title">
                        {hit.module}
                        {hit.section ? (
                          <span className="bz-search-section">
                            {' · '}
                            <Snippet text={hit.section} terms={typed} lang={hit.lang} />
                          </span>
                        ) : null}
                      </span>
                      {/* named by its title; the excerpt and the line under it describe it */}
                      <span id={`bz-search-hit-${n}`} aria-hidden="true" className="bz-search-more">
                        {hit.excerpt ? (
                          <span className="bz-search-snippet">
                            <Snippet text={hit.excerpt} terms={typed} lang={hit.lang} />
                          </span>
                        ) : null}
                        <span className="bz-search-meta" lang="en" dir="ltr">
                          {hit.kind === 'level' ? 'Level' : hit.level} · {trackLabel(hit.track)}
                          {searchedLangs.length === 1 ? '' : ` · ${LANG_NAME[hit.lang]}`}
                          {hit.ready ? '' : ' · Planned'}
                        </span>
                      </span>
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
