'use client'

import { useEffect } from 'react'
import { categoryProgress, type CurriculumFacts } from '@/lib/record/derive'
import { useRecord } from '@/lib/record/store'

/**
 * §13.5 / §12.2 channel B — the one island that fills the printed count beside
 * every `CategoryMeter` on a page.
 *
 * The meter's segments are channel A and need nobody. The count is a tally, and
 * §12.2 puts every tally on channel B: `4/7` is arithmetic over the record, CSS
 * has no arithmetic, and a number stamped into a class name would be a computed
 * value on the wrong channel.
 *
 * It writes into the DOM rather than rendering the count itself, and that is a
 * structural fact about this codebase rather than a preference — the same one
 * `SignOffMarks` documents. `/courses/` renders its meters from a **server**
 * component, so no hook may sit inside `CategoryMeter`: it would work wherever
 * a client parent already existed and fail the static export everywhere else
 * (§12.2, "where hooks may not go"). So the server writes the contract into
 * the markup — `data-hl-cat-tally="<slug>"` on the cell, holding `--/7` — and
 * one island per document fills every cell after mount.
 *
 * The denominator is left exactly as the server drew it. It came from the
 * corpus, it is the same number `categoryProgress` derives, and rewriting it
 * from a second source is how two derivations of one count start disagreeing
 * (§11.25).
 *
 * No `MutationObserver`, unlike `SignOffMarks`: nothing on these two pages
 * re-renders a meter. The index page's filter chips unmount and re-mount rows,
 * which is why that island watches for insertions; no meter is inside a
 * filtered list, and adding a watcher for a case that does not exist would
 * claim one does.
 *
 * Nothing here is load-bearing. With JavaScript off every cell keeps the `--`
 * the prerender drew, which is the true statement that no record has been read
 * — never a `0` standing in for a reading nobody took.
 */

/**
 * The cell the server marked with the category's slug. Written here and read as
 * a literal in `CategoryMeter`, never imported across the boundary: that server
 * component would be pulled into the client bundle for the sake of one string,
 * which is the direction §12.2 spends its whole rule keeping clean.
 * `SignOffMarks` and `ModuleRow` hold their contract the same way.
 */
const CELL_ATTR = 'data-hl-cat-tally'

const CELLS = `[${CELL_ATTR}]`

export function CategoryTally({ facts }: { facts: CurriculumFacts }) {
  const record = useRecord()

  useEffect(() => {
    const standing = categoryProgress(record, facts)

    for (const cell of document.querySelectorAll<HTMLElement>(CELLS)) {
      const slug = cell.getAttribute(CELL_ATTR)
      if (!slug) continue

      // A slug the corpus no longer answers to — a renamed category, an
      // imported record — yields nothing, and the cell keeps the `--` the
      // server drew rather than being told a zero (§12.1.3).
      const entry = standing[slug]
      if (!entry) continue

      cell.textContent = `${entry.approved}/${entry.total}`
    }
  }, [record, facts])

  return null
}

/** The contract with `CategoryMeter`; exported so a test can pin it. */
export const CAT_TALLY_SELECTORS = { CELL_ATTR, CELLS }
