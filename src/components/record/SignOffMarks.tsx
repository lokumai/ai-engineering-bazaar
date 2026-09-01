'use client'

import { useEffect } from 'react'
import { sheetStamps, type CurriculumFacts } from '@/lib/record/derive'
import { useRecord } from '@/lib/record/store'

/**
 * §4.8 column 9 / §12.2 channel B — the one island that fills the sign-off
 * squares on a listing page.
 *
 * The squares themselves are drawn by `ModuleRow`, in the unsigned state, at
 * build time. They cannot be filled by React, and that is a structural fact
 * about this codebase rather than a preference: `SheetFilters` is `'use client'`
 * and imports `SheetIndex`, which imports `ModuleRow`, so on `/` both already
 * run in the browser — while `/courses/` and `/courses/[category]/` render the
 * identical components server-only. A hook in either of them works on `/` and
 * fails the static export of the other two (§12.2, "where hooks may not go").
 *
 * So the boundary is drawn here instead, the way `Affordances` draws it: the
 * server writes a contract into the markup — `data-hl-signoff-cell="<slug>"` on
 * the cell, `data-hl-slot="<id>"` on each square — and ONE island per document
 * paints all of them after mount. One hydrating node, not thirty-two.
 *
 * `-cell` is not decoration in that name. `lib/record/keys.ts` owns
 * `data-hl-signoff` for §12.16's `s` shortcut, which clicks the sheet's
 * sign-off CONTROL, and its map is written on the promise that no listing page
 * carries one. Attribute selectors match a whole name, so the two contracts
 * cannot be confused for each other — and a cell here is not a control there.
 *
 * Channel A was the other candidate and record.css explains why it is not used
 * for these: a CSS selector cannot compare an attribute on `<html>` against an
 * attribute on a descendant, so the boot script would need one generated rule
 * per module to remove one frame of flicker from a column of 14px squares.
 *
 * `sheetStamps` decides what is filled — the same function `manifest.ts` asked
 * which squares to draw, so the two can never disagree about a slot. A square
 * is filled when its slot's count has reached its threshold, which is one rule
 * for all four slots (`SIGN-OFF` and `QUIZ` are thresholds of one).
 *
 * Nothing here is load-bearing. With JavaScript off every square stays as
 * drawn: unsigned, which is what the prerender already truthfully claimed, and
 * the sheet itself still states its own sign-off in text (§10.4).
 */

/** The cell the server marked with the sheet's slug (§12.1.3 — never a number). */
const CELL_ATTR = 'data-hl-signoff-cell'
/** The slot each square stands for, as `Stamp.id` spells it. */
const SLOT_ATTR = 'data-hl-slot'
/** §12.2 — the only two states a square is ever drawn in. */
const SIGNED = 'data-signed'

const CELLS = `[${CELL_ATTR}]`
const SQUARES = `[${SLOT_ATTR}]`

export function SignOffMarks({ facts }: { facts: CurriculumFacts }) {
  const record = useRecord()

  useEffect(() => {
    let frame = 0

    const paint = () => {
      for (const cell of document.querySelectorAll<HTMLElement>(CELLS)) {
        const slug = cell.getAttribute(CELL_ATTR)
        if (!slug) continue

        // A draft carries no slug at all, so this is always a drawn sheet and
        // the list is never empty. A slug the corpus no longer answers to —
        // an imported record, a renamed sheet — yields no stamps and leaves
        // every square exactly as the server drew it (§12.1.3).
        const marks = sheetStamps(record, facts, slug)

        for (const square of cell.querySelectorAll<HTMLElement>(SQUARES)) {
          const mark = marks.find((stamp) => stamp.id === square.getAttribute(SLOT_ATTR))
          const filled = mark !== undefined && mark.current >= mark.threshold
          square.setAttribute(SIGNED, filled ? 'true' : 'false')
        }
      }
    }

    /**
     * Filtering the index unmounts and re-mounts rows, and a re-mounted row
     * arrives with the server's `data-signed="false"` on it: React diffs
     * against the props it last rendered, not against attributes something
     * else wrote, so it neither preserves nor restores this paint. Watching
     * for inserted nodes is what keeps the column true after a chip is
     * pressed. Only `childList` is observed, so setting the attribute below
     * cannot feed the observer its own work.
     */
    const schedule = () => {
      if (frame !== 0) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        paint()
      })
    }

    paint()
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [record, facts])

  return null
}

/** The contract with `ModuleRow`; exported so a test can pin it. */
export const SIGN_OFF_SELECTORS = { CELLS, SQUARES, SIGNED }
