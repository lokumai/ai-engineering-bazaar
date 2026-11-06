'use client'

import { useRouter } from 'next/navigation'
import { useLayoutEffect, useRef } from 'react'
import { initClouds } from './street/clouds'
import { initTrack } from './street/track'

/**
 * The one island on the home page: it starts the bazaar's motion and stops it,
 * and works the track choice and the story clouds over the people at the gate.
 *
 * Renders nothing. `gsap` is imported on demand, so the page's first paint
 * carries none of it and a reader who never scrolls never pays for it. The
 * track choice (`street/track.ts`) is imported statically instead: choosing
 * must work the moment the page does, and it is a few attribute writes.
 *
 * A LAYOUT effect, on purpose. On a wide screen the motion moves nodes React
 * rendered (the signs, the doors, the way in) into the walk, and its cleanup
 * puts them back. A layout effect's cleanup runs before React removes the page
 * on a client navigation; a passive effect's runs after, and React would then
 * try to remove a node from a parent it no longer has.
 */
export function BazaarStreetMotion({ rootId }: { rootId: string }) {
  const router = useRouter()
  /* The effect must not re-run when the router object changes: that would
     tear the walk down in the middle of a reader's scroll. */
  const push = useRef((path: string) => router.push(path))
  push.current = (path: string) => router.push(path)

  useLayoutEffect(() => {
    let stop: (() => void) | null = null
    let gone = false
    const root = document.getElementById(rootId)
    if (!root) return
    const stopTrack = initTrack(root, (path) => push.current(path))
    const stopClouds = initClouds(root)
    void import('./street/motion').then(({ initBazaar }) => {
      if (!gone) stop = initBazaar(root)
    })
    return () => {
      gone = true
      stop?.()
      stopTrack()
      stopClouds()
    }
  }, [rootId])

  return null
}
