'use client'

import { useLayoutEffect } from 'react'
import type { SceneData } from './scene/model'

/**
 * M91, D116 — the Caravan page's one island. It renders nothing: it marks the page as having a
 * script, which shows the journey (`caravan.css` keeps it hidden otherwise, because without a script
 * it is a picture nobody can move), and hands the server's markup to `scene/index.ts`, imported on
 * demand so the first paint carries none of it (the home page's `BazaarStreetMotion.tsx`).
 *
 * The page's inline script sets the same mark before first paint on a full load; this sets it again
 * on a client navigation, where that script does not run.
 *
 * A LAYOUT effect, for the home page's reason: its cleanup must run before React removes the page,
 * so the scene stops before its nodes go.
 */
export function CaravanScene({ rootId, data }: { rootId: string; data: SceneData }) {
  useLayoutEffect(() => {
    const root = document.getElementById(rootId)
    if (!root) return
    document.documentElement.setAttribute('data-cv-script', '')
    let stop: (() => void) | null = null
    let gone = false
    void import('./scene').then(({ initCaravan }) => {
      if (!gone) stop = initCaravan(root, data)
    })
    return () => {
      gone = true
      stop?.()
    }
  }, [rootId, data])

  return null
}
