'use client'

import { stamps, type CurriculumFacts } from '@/lib/record/derive'
import { useRecord } from '@/lib/record/store'
import { Stamp } from './Stamp'

/**
 * §7.4 / §12.11 item 4 — the set-level stamp shelf. Nine stamps at `168 × 44`,
 * in one row that wraps.
 *
 * §12.2 channel B, and the first frame is the point: `useRecord` returns the
 * frozen `EMPTY_RECORD` on the server and in the first client render, so the
 * prerendered shelf shows nine empty slots, each printing its real threshold
 * against a count of zero. That is the only thing build-time HTML can
 * truthfully say about a reader it has never met, and it is a complete,
 * readable shelf rather than a placeholder — six of the nine are locked for the
 * whole of this slice anyway, because the sheets they need are undrawn.
 *
 * `stamps()` decides everything. The thresholds are the curriculum's own
 * category totals, and the shelf never types one: §11.25, and the reason
 * `facts` arrives as a prop instead of an import is §12.2's — `lib/content/`
 * reaches `node:fs` and this file runs in the browser.
 *
 * The three set-level stamps §7.4 lists as unattainable today keep their slots
 * and say why in sheets drawn. Hiding them would leave the shelf claiming the
 * set is smaller than it is (§12.5.6).
 */
export function StampShelf({ facts }: { facts: CurriculumFacts }) {
  const record = useRecord()
  const shelf = stamps(record, facts)

  return (
    <ul className="hl-stamp-shelf">
      {shelf.map((stamp) => (
        <li key={stamp.id}>
          <Stamp stamp={stamp} size="set" />
        </li>
      ))}
    </ul>
  )
}
