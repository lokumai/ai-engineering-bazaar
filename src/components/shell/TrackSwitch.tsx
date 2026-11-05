'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useHydrated, useRecord } from '@/lib/record/store'
import type { TranslatedLang } from '@/lib/content/languages'
import {
  TRACKS,
  type Track,
  EVERYONE_SEGMENT,
  catalogRoute,
  moduleRoute,
  trackOfPath,
} from '@/lib/tracks'

/**
 * M39 B1 + C1 — the track's name in the bar, as a two-segment toggle: both
 * tracks always visible, the one you are in filled. The author asked for the
 * filled one *"in a different color so it is distinguished and shows something
 * that is active rather than just a typical button"*, so it takes the band's
 * gold (`--color-ornament`) instead of the bar's cream chip.
 *
 * Each segment is a LINK to the same page in that track, so the switch works
 * with no script: on a module, the same module (an unwritten For Everyone
 * module has a page saying so, D91); on a catalog page, the same level; on a
 * page that belongs to neither track, that track's catalog. Which segment is
 * filled is drawn by `shell.css` from `data-bz-track`, which the boot script
 * stamps before first paint; the island only adds `aria-current`.
 *
 * On a phone the two names become their icons (`shell.css`), because C1 does
 * not fit there in words; the name stays the link's accessible name.
 */
export function TrackSwitch({
  translated,
}: {
  /** Which modules have a For Engineers page in each translation, `level/module`. */
  translated: Readonly<Record<TranslatedLang, readonly string[]>>
}) {
  const pathname = usePathname() ?? '/'
  const record = useRecord()
  const hydrated = useHydrated()
  const current: Track = trackOfPath(pathname) ?? (hydrated ? record.prefs.track : null) ?? 'engineers'
  const targets = targetsFor(pathname, translated)

  return (
    <nav aria-label="Track" className="bz-track">
      {TRACKS.map((track) => (
        <Link
          key={track.id}
          href={targets[track.id]}
          className="bz-track-seg"
          data-track-id={track.id}
          aria-current={current === track.id ? 'true' : undefined}
        >
          <TrackIcon track={track.id} />
          <span className="bz-track-label">{track.label}</span>
        </Link>
      ))}
    </nav>
  )
}

/** Where each segment goes from this page. */
function targetsFor(
  pathname: string,
  translated: Readonly<Record<TranslatedLang, readonly string[]>>,
): Record<Track, string> {
  const segments = pathname.split('/').filter(Boolean)
  const lang = segments[0] === 'tr' || segments[0] === 'fa' ? segments.shift()! : 'en'
  if (segments[0] === EVERYONE_SEGMENT) segments.shift()

  if (segments[0] === 'courses' && segments.length >= 3) {
    const slug = `${segments[1]}/${segments[2]}`
    const hasEngineers = lang === 'en' || translated[lang as TranslatedLang]?.includes(slug)
    return {
      engineers: moduleRoute(slug, 'engineers', hasEngineers ? lang : 'en'),
      // A For Everyone page exists in every language a page in either track has.
      everyone: moduleRoute(slug, 'everyone', lang),
    }
  }
  const level = segments[0] === 'sheets' ? (segments[1] ?? null) : null
  return { engineers: catalogRoute('engineers', level), everyone: catalogRoute('everyone', level) }
}

/** A code mark for For Engineers, an open book for For Everyone (C1's icons). */
function TrackIcon({ track }: { track: Track }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="bz-track-icon"
    >
      {track === 'engineers' ? (
        <path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5" />
      ) : (
        <path d="M8 4.2C6.6 3.2 4.6 3 2.5 3.3v8.9c2.1-.3 4.1-.1 5.5.9 1.4-1 3.4-1.2 5.5-.9V3.3C11.4 3 9.4 3.2 8 4.2Zm0 0v8.9" />
      )}
    </svg>
  )
}
