/**
 * The track choice: which way the five level doors open.
 *
 * The page asks "How would you like to read?" and the doors open into one of
 * two tracks: For Engineers, at `/sheets/<level>/` (the course as it was), or
 * For Everyone, at `/everyone/sheets/<level>/`. The server renders every door
 * with the For Engineers address as its `href`, and the other one beside it in
 * `data-href-all`. So with no script, and for a reader who chooses nothing,
 * the doors open For Engineers, and a link checker that reads `href` finds
 * the address that always exists. This module is the half that swaps.
 *
 * **Nothing is saved.** No cookie, no storage: a reader who comes back meets
 * the same question, which is what the author asked for (D86). The choice
 * lives in the page's attributes (`data-track` on the street, `aria-pressed` on
 * the signs, the `href` of each door) and goes with the page; the bar shows it
 * too (`chooseTrack` with `remember` off).
 *
 * **And the doors follow the bar** (D91): the bar's switch on this page, or a
 * track this tab already read in, sets which way they open, with no sign
 * pressed, since the reader has not answered the question here.
 *
 * **Why the click is taken over, and not only the `href`.** The doors are
 * `next/link`s, and a Link navigates with the address React rendered it with,
 * not with whatever the attribute says now. So while For Everyone is chosen a
 * plain left click on a door is caught on the way down (capture phase, before
 * Link sees it) and sent to the router with the swapped address; a click that
 * means something else (a new tab, a modifier key) is left alone and uses the
 * attribute, which is why the attribute is swapped as well.
 *
 * Statically imported by the island, not loaded with the motion: the choice
 * works the moment the page does, before GSAP has arrived.
 */

import { TRACK_EVENT, type Track as SiteTrack, chooseTrack, lastTrack } from '@/lib/tracks'

export type Track = 'eng' | 'all'

const SITE: Record<Track, SiteTrack> = { eng: 'engineers', all: 'everyone' }
const LOCAL: Record<SiteTrack, Track> = { engineers: 'eng', everyone: 'all' }

const NAME: Record<Track, string> = { eng: 'For Engineers', all: 'For Everyone' }
const OTHER: Record<Track, Track> = { eng: 'all', all: 'eng' }

/** Sent on the street when a reader chooses at a sign; the motion listens, to bring the doors into view. */
export const CHOSEN = 'bz:track-chosen'

const $$ = <T extends Element = HTMLElement>(q: string, r: ParentNode): T[] => [...r.querySelectorAll<T>(q)]

/**
 * Wires the choice, and returns what undoes it. `go` takes an app-relative
 * address (no base path), which is what the router wants.
 */
export function initTrack(root: HTMLElement, go: (path: string) => void): () => void {
  const doors = $$<HTMLAnchorElement>('.door', root)
  const signs = $$<HTMLButtonElement>('[data-choose]', root)
  const switches = $$<HTMLButtonElement>('[data-switch]', root)
  let track: Track = 'eng'

  /* The base path is whatever the rendered address has in front of the one the
     server wrote beside it, so nothing here needs to know where the site is hosted. */
  const baseOf = (door: HTMLAnchorElement): string => {
    const path = door.dataset.hrefEng ?? ''
    const href = door.getAttribute('href') ?? ''
    return path !== '' && href.endsWith(path) ? href.slice(0, href.length - path.length) : ''
  }
  const pathOf = (door: HTMLAnchorElement, which: Track): string =>
    (which === 'eng' ? door.dataset.hrefEng : door.dataset.hrefAll) ?? ''

  const bases = new Map(doors.map((door) => [door, baseOf(door)]))

  function apply(next: Track, chosen: boolean): void {
    track = next
    doors.forEach((door) => door.setAttribute('href', `${bases.get(door)}${pathOf(door, next)}`))
    if (chosen) root.dataset.track = next
    else delete root.dataset.track
    signs.forEach((sign) => sign.setAttribute('aria-pressed', String(chosen && sign.dataset.choose === next)))
    $$('[data-track-name]', root).forEach((el) => { el.textContent = NAME[next] })
    $$('[data-track-other]', root).forEach((el) => { el.textContent = NAME[OTHER[next]] })
  }

  const onClick = (event: MouseEvent) => {
    const target = event.target as Element | null
    if (target === null) return

    const sign = target.closest<HTMLElement>('[data-choose]')
    if (sign !== null && root.contains(sign)) {
      apply(sign.dataset.choose as Track, true)
      chooseTrack(SITE[track], false)
      root.dispatchEvent(new CustomEvent(CHOSEN))
      return
    }
    if (target.closest('[data-switch]') !== null) {
      apply(OTHER[track], true)
      chooseTrack(SITE[track], false)
      return
    }
  }

  const onTrack = (event: Event) => {
    const next = LOCAL[(event as CustomEvent<SiteTrack>).detail]
    if (next !== undefined && next !== track) apply(next, false)
  }

  const onDoor = (event: MouseEvent) => {
    if (track === 'eng') return
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const door = (event.target as Element | null)?.closest<HTMLAnchorElement>('.door')
    if (door === null || door === undefined || !root.contains(door)) return
    event.preventDefault()
    event.stopPropagation()
    go(pathOf(door, track))
  }

  root.addEventListener('click', onClick)
  root.addEventListener('click', onDoor, true)
  window.addEventListener(TRACK_EVENT, onTrack)
  switches.forEach((sw) => { sw.hidden = false })
  if (lastTrack() === 'everyone') apply('all', false)

  return () => {
    root.removeEventListener('click', onClick)
    root.removeEventListener('click', onDoor, true)
    window.removeEventListener(TRACK_EVENT, onTrack)
    switches.forEach((sw) => { sw.hidden = true })
    /* Back to what the server wrote, which is what a reader meets on coming back. */
    apply('eng', false)
  }
}
