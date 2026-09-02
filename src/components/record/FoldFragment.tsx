'use client'

import { useEffect } from 'react'

/**
 * §17.6 — a deep link into the register opens the fold it names.
 *
 * ## The defect this closes, and where it was measured
 *
 * The arrival line's affordance is labelled `DETAILS` and points at
 * `/profile/#claim`. That id sits on the `<h2>` inside a closed `<summary>`
 * (`Register.tsx` keeps it there so the fold does not flatten the page's
 * outline), so the browser scrolled the summary into view and the reader was
 * handed the same one line they had already read. `ClaimSummary`'s no-handler
 * export link has the same shape against `#data`.
 *
 * ## Why an island, and not a prop or CSS
 *
 * A fragment never reaches the server: `/profile/` is a static export, one
 * document for every reader, so `RegisterRow` cannot be told at build time
 * which row to render `open`. CSS cannot do it either — `:target` styles the
 * matched element and `open` is DOM state on the `<details>`, not a
 * presentational property, so no selector can force it (and forcing the body
 * visible with `display` would leave `<details>` reporting itself closed to
 * assistive technology and to find-in-page).
 *
 * The rejected alternative was making `RegisterRow` a client component and
 * reading the hash there. It would have pulled all eleven rows and their bodies
 * across §12.2's line into the browser bundle to answer a question that has one
 * answer per document. So this is mounted ONCE by the page: one listener, one
 * lookup, and the rows stay server-rendered.
 *
 * ## What it refuses to do
 *
 * It opens the fold that CONTAINS the fragment's target and nothing else. No
 * hash, no matching element, or a target with no `<details>` ancestor: it does
 * nothing, which is what keeps a plain `/profile/` visit a register of closed
 * rows. It never closes a fold either — a reader who opened one and then
 * followed a link within the page keeps what they opened.
 *
 * Renders `null`. On the server that is nothing at all, so the prerendered HTML
 * is unchanged and no row is reader-specific at build time (§12.2).
 */
export function FoldFragment() {
  useEffect(() => {
    const open = (): void => {
      const id = window.location.hash.slice(1)
      if (id === '') return
      // `getElementById` rather than `querySelector('#' + id)`: an id is not
      // required to be a valid CSS identifier, and a hash carrying one that is
      // not would throw rather than miss.
      const target = document.getElementById(decodeURIComponent(id))
      if (target === null) return
      const fold = target.closest('details')
      if (fold === null) return
      fold.open = true
      // Chrome had already finished scrolling to the summary before the fold
      // grew, so the body it just revealed can be below the fold in the other
      // sense. Re-anchoring on the element the reader asked for is the whole
      // promise of the link.
      target.scrollIntoView({ block: 'start' })
    }

    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
  }, [])

  return null
}
