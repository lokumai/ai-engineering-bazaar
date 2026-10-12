'use client'

import { useLayoutEffect } from 'react'

/**
 * The one island on the home page: it starts the bazaar's motion and stops it.
 *
 * Renders nothing. `gsap` is imported on demand, so the page's first paint
 * carries none of it and a reader who never scrolls never pays for it.
 *
 * A LAYOUT effect, on purpose. On a wide screen the motion moves nodes React
 * rendered (the signs, the doors, the way in) into the walk, and its cleanup
 * puts them back. A layout effect's cleanup runs before React removes the page
 * on a client navigation; a passive effect's runs after, and React would then
 * try to remove a node from a parent it no longer has.
 */
export function BazaarStreetMotion({ rootId }: { rootId: string }) {
  useLayoutEffect(() => {
    let stop: (() => void) | null = null
    let gone = false
    const root = document.getElementById(rootId)
    if (!root) return
    void import('./street/motion').then(({ initBazaar }) => {
      if (!gone) stop = initBazaar(root)
    })
    return () => {
      gone = true
      stop?.()
    }
  }, [rootId])

  return null
}
