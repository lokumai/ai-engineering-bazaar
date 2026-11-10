'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { type StampFacts, TRACK_ATTR, currentTrack, stampRecordState } from '@/lib/record/stamp'
import { snapshot, subscribe } from '@/lib/record/store'
import { languageOfPath } from '@/lib/content/languages'
import { lastTrack, rememberTrack, trackOfPath } from '@/lib/tracks'

/**
 * §12.2 Channel A, after first paint.
 *
 * The boot script in `<head>` stamps `<html>` before the first frame; this keeps
 * those stamps true for the rest of the session. Both are needed and neither
 * replaces the other: without the script the mascot flickers through a frame of
 * "nothing signed off" on every load, and without this it freezes at whatever
 * was true when the document loaded — and since every navigation here is a
 * client transition, that is the entire session.
 *
 * It renders `null` and holds no state, which is the DOM-enhancement pattern
 * `shell/Affordances.tsx` establishes. It subscribes to the store directly
 * rather than through `useRecord`, because there is no render to re-run: the
 * work is one attribute pass on one element.
 *
 * The two build-time maps arrive as props from the root layout, which already
 * measures them for the boot script. They cannot be imported here — the module
 * that measures them reaches `node:fs`, and a client component importing it
 * stops the build (§12.2).
 */
export function RecordStateSync({ facts }: { facts: StampFacts }) {
  const pathname = usePathname()

  /* D91 — a track page remembers its track for this tab, so a page that
     belongs to neither shows the bar in the track the reader was reading. In
     session storage, never the record: opening a page records nothing (§12.13).
     Runs before the stamping effect above, so the stamp reads the new value. */
  useEffect(() => {
    const track = trackOfPath(pathname)
    if (track !== null) rememberTrack(track)
  }, [pathname])

  /* D119 — `<html lang>` is the page's own language. The layout renders `en` for every
     address (`<html>` carries `suppressHydrationWarning`, so a different value in the
     document is no mismatch), the exported HTML and the boot script already hold the
     right one for a loaded page, and a client transition into or out of a translated
     page lands here. React never rewrites the attribute itself: its own prop does not change. */
  useEffect(() => {
    const lang = languageOfPath(pathname)
    if (document.documentElement.lang !== lang) document.documentElement.lang = lang
  }, [pathname])

  useEffect(() => {
    const root = document.documentElement

    function apply(): void {
      stampRecordState(root, snapshot(), facts)
      // D91 — and the current track, which a client transition can change.
      root.setAttribute(TRACK_ATTR, currentTrack(pathname, lastTrack()))
    }

    // Once on mount as well as on every change: the boot script may have been
    // unable to read storage at all, and another tab may have written since.
    apply()
    return subscribe(apply)
  }, [facts, pathname])


  return null
}
