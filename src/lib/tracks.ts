/**
 * D86, D91 — the two tracks of every module, and the one place their names and
 * addresses are written.
 *
 * For Engineers is the course as it was before the tracks existed, so it keeps
 * every address it had (`/courses/…`, `/sheets/…`): no bookmark moves. For
 * Everyone lives under one prefix, `/everyone/`, after the language prefix when
 * there is one (`/tr/everyone/courses/…`). A page that belongs to neither track
 * (home, progress, legend, 404) has no track in its address; the bar then shows
 * the track the reader last opened (`prefs.track`).
 *
 * Imports nothing, so a client island and the boot script's factory can both
 * read it without pulling the content layer into the browser.
 */

export type Track = 'engineers' | 'everyone'

export interface TrackInfo {
  id: Track
  /** The name a reader sees (A1). */
  label: string
  /** The address prefix, empty for For Engineers. */
  prefix: string
}

export const TRACKS: readonly TrackInfo[] = [
  { id: 'engineers', label: 'For Engineers', prefix: '' },
  { id: 'everyone', label: 'For Everyone', prefix: '/everyone' },
]

export const TRACK_IDS: readonly Track[] = TRACKS.map((one) => one.id)

export const DEFAULT_TRACK: Track = 'engineers'

/** The URL segment that marks a For Everyone page. */
export const EVERYONE_SEGMENT = 'everyone'

export function isTrack(value: unknown): value is Track {
  return TRACK_IDS.includes(value as Track)
}

export function trackLabel(track: Track): string {
  return TRACKS.find((one) => one.id === track)?.label ?? track
}

/** The other track, for the switch. */
export function otherTrack(track: Track): Track {
  return track === 'engineers' ? 'everyone' : 'engineers'
}

/**
 * Which track an address belongs to, or null for a page that belongs to
 * neither. Works on an app-relative path and on one carrying the base path,
 * because it only asks whether a segment is `everyone` or the address is a
 * course or catalog page.
 */
export function trackOfPath(pathname: string): Track | null {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.includes(EVERYONE_SEGMENT)) return 'everyone'
  if (segments.includes('courses') || segments.includes('sheets')) return 'engineers'
  return null
}

/** The catalog, or one level of it, in a track. */
export function catalogRoute(track: Track, level: string | null = null): string {
  const prefix = track === 'everyone' ? `/${EVERYONE_SEGMENT}` : ''
  return `${prefix}/sheets/${level === null ? '' : `${level}/`}`
}

/** A module's page in a track and a language. */
export function moduleRoute(slug: string, track: Track, lang: string = 'en'): string {
  const language = lang === 'en' ? '' : `/${lang}`
  const prefix = track === 'everyone' ? `/${EVERYONE_SEGMENT}` : ''
  return `${language}${prefix}/courses/${slug}/`
}
