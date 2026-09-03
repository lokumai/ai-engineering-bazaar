'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { ClaimSummary } from '@/components/record/ClaimSummary'
import { claimAnnounced, subscribeClaimAnnounce } from '@/lib/record/claim-announce'
import { CLAIM_COPY, claimNeedsExport, claimReceiptReading } from '@/lib/record/claim'
import { useHydrated, useRecord } from '@/lib/record/store'

/**
 * §17.6 — what the reader meets on arrival: one line, in the page column.
 *
 * ## What this replaces, and what was measured
 *
 * §14.7.4 shipped the full summary in a bare `<div class="hl-claim-shell">`
 * appended to `<body>` after `{children}`. MEASURED on the deployed build at
 * 1440×900: the panel sat at `x: 0, width: 1440` with no padding and no
 * `max-width` while the page column starts at `x≈143`, and at `y: 1165` — BELOW
 * the footer and below the fold. `TWO RECORDS` was clipped at the viewport edge
 * and the fixed mascot overlapped `DISMISS`. Worse than any of that: the panel
 * came back on EVERY full page load, reporting a merge in which nothing had
 * moved, because the claim runs on every mount with a session (§17.0).
 *
 * So the line is rendered by `PageShell`, inside the column every page's content
 * is in, and it appears only when the claim was news (`claimIsNews`, written into
 * `meta.lastClaim`) AND the claim happened in this document.
 *
 * ## Two states, and the second one is not folded
 *
 * Routine: one line. `claimNeedsExport` — a signature or a submittal is
 * unaccounted for — keeps the sentences and the export button, because §14.7.3's
 * rule is that while something is missing the reader gets the copy they can hold.
 * Folding that into a reading would be the one case where the fold hides an act
 * the reader has to take.
 *
 * ## One marker, both states
 *
 * `data-hl-receipt` is on both, because the two gates that measure this line —
 * the once-only gate and the geometry gate — located `.hl-receipt`, which the
 * action-needed state has never carried. Both were therefore blind to exactly
 * the state the reader most needs the layout to be right in. The class is not
 * shared instead: `.hl-receipt` is a flex rule with `justify-content:
 * space-between`, and putting it on a panel would fight the panel's own layout.
 * The action-needed state carries the attribute on a WRAPPER rather than on the
 * summary, so the marker costs `ClaimSummary` no prop and the located element's
 * `parentElement` is the page column in both states, which is what the geometry
 * gate measures against.
 *
 * ## No DISMISS
 *
 * The detail is permanent in `/profile/`'s register, so closing this line
 * destroys nothing and navigation is the dismissal (§17.1). The button also
 * collided with the mascot, but that is not why it is gone.
 */
export function ClaimReceipt() {
  const record = useRecord()
  const hydrated = useHydrated()
  const announced = useSyncExternalStore(
    subscribeClaimAnnounce,
    claimAnnounced,
    // §12.2 — the prerender has met no reader, so it announces nothing.
    () => false,
  )

  const receipt = record.meta.lastClaim
  if (!hydrated || !announced || receipt === null) return null

  if (claimNeedsExport(receipt.summary)) {
    return (
      <div data-hl-receipt="needs-export">
        <ClaimSummary summary={receipt.summary} className="hl-receipt-full" heading="p" />
      </div>
    )
  }

  return (
    <section
      className="hl-receipt"
      data-hl-receipt="routine"
      role="status"
      aria-label={CLAIM_COPY.head}
    >
      <p className="hl-mark m-0 text-ink">{CLAIM_COPY.head}</p>
      <p className="hl-mark m-0 text-ink-muted">
        {claimReceiptReading(receipt)}
        {' · '}
        <Link href="/profile/#claim">DETAILS</Link>
      </p>
    </section>
  )
}
