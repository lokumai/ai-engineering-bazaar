'use client'

import { useLayoutEffect } from 'react'

/**
 * The About page's one island (M90, D115). It renders nothing: it finds the story the server
 * rendered and hands it to `motion.ts`, which is imported on demand so the page's first paint carries
 * no `gsap`, the home page's pattern (`BazaarStreetMotion.tsx`).
 *
 * A LAYOUT effect, for the home page's reason: the motion pins stalls (GSAP wraps each pinned node in
 * a spacer) and splits headings into words, and its cleanup must put every node back under its own
 * parent before React removes the page on a client navigation.
 */
export function AboutMotion({ rootId }: { rootId: string }) {
  useLayoutEffect(() => {
    const root = document.getElementById(rootId)
    if (!root) return
    let stop: (() => void) | null = null
    let gone = false
    void import('./motion').then(({ initAbout }) => {
      if (!gone) stop = initAbout(root)
    })
    return () => {
      gone = true
      stop?.()
    }
  }, [rootId])

  return null
}
