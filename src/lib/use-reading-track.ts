'use client'

import { useSyncExternalStore } from 'react'
import { DEFAULT_TRACK, TRACK_EVENT, type Track, readingTrackOf, trackOfPath } from '@/lib/tracks'

/**
 * D91 — the track the bar shows on this page, as React state: the page's own,
 * or on a page of neither track the one stamped on `<html>`. It re-renders on
 * `TRACK_EVENT`, so a choice made on home or progress reaches the switch, the
 * catalog menu, the progress tabs and the footer at once.
 *
 * The server snapshot is the address's own track or For Engineers, because the
 * server cannot know this tab's memory; the boot script has already painted the
 * right one in frame one, and this catches up at hydration.
 */
export function useReadingTrack(pathname: string): Track {
  return useSyncExternalStore(
    subscribe,
    () => readingTrackOf(pathname, true),
    () => trackOfPath(pathname) ?? DEFAULT_TRACK,
  )
}

function subscribe(notify: () => void): () => void {
  window.addEventListener(TRACK_EVENT, notify)
  return () => window.removeEventListener(TRACK_EVENT, notify)
}
