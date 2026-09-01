'use client'

import Link from 'next/link'
import { useId } from 'react'
import {
  CLAIM_COPY,
  claimNeedsExport,
  claimSummaryLines,
  type ClaimSummary as ClaimSummaryData,
} from '@/lib/record/claim'

/**
 * §14.7.4 — the claim summary, rendered. It computes NOTHING.
 *
 * Every number and every string comes from `claim.ts`, for the reason
 * `EraseDialog` gives for `eraseTallyLines`: this text is the reader's only
 * account of what happened to their own record, so the register and the
 * arithmetic have to sit somewhere a node test can read them with no DOM
 * (§12.14.2). What is left here is one table, one note block and one
 * conditional link.
 *
 * **Why a `dl` of numbers AND the sentences.** They are two readings of the
 * same facts and the site already speaks both languages: `hl-defs` is the
 * tabular, monospace form §12.11 uses for machine-derived pairs — tabular
 * figures, so a changing digit never shifts the column — and the note block is
 * §12.1.7's plain-prose form. A reader checking `18 + 12 → 21` wants the
 * column; a reader who has just signed in and is asking "did I lose anything"
 * wants the sentence. Dropping either would leave one of them guessing.
 *
 * **Note-block styling, not a banner** (§12.1.7): no icon, no dismiss, no
 * caution colour, no congratulation. A claim that went as designed is a routine
 * architectural fact, and escalating it to alarm styling spends the alarm
 * budget the erase dialog needs. The one thing that DOES escalate is the export
 * affordance, and it appears only when `claim.ts` found something the reader
 * has to act on (§14.7.3's rule for `failed`, applied here for the same
 * reason: while something is unaccounted for, the copy that is definitely whole
 * is the one the reader can hold).
 *
 * `role="status"` on the prose, following §12.13's split — counts and outcomes
 * in `status`, errors in `alert`. This is not an error even when it reports a
 * dropped submittal: §12.9.1's cap is the record working as specified, and
 * `alert` would interrupt the reader over it.
 */
export interface ClaimSummaryProps {
  summary: ClaimSummaryData
  /**
   * §12.15's export, wired by the caller so there is ONE implementation of it.
   * Absent means "no handler here": the link to the profile sheet is used
   * instead, which is the same route `SignOff` sends a refused write to.
   */
  onExport?: () => void
  className?: string
}

export function ClaimSummary({ summary, onExport, className }: ClaimSummaryProps) {
  const titleId = useId()
  const { signed, submittals } = summary
  const lines = claimSummaryLines(summary)
  const needsExport = claimNeedsExport(summary)

  return (
    <section
      aria-labelledby={titleId}
      className={['hl-panel', className].filter(Boolean).join(' ')}
      data-outcome={summary.outcome}
    >
      <div className="hl-panel-head">
        <h2 className="hl-panel-title" id={titleId}>
          {CLAIM_COPY.head}
        </h2>
        {/* The branch §14.7.4 took, as a readout: uppercase, no terminal
            period, and it names the case rather than describing it. */}
        <span className="hl-mark text-ink-muted">
          {summary.outcome === 'adopted' ? 'NO RECORD IN ACCOUNT' : 'TWO RECORDS'}
        </span>
      </div>

      {/* §11.25 — a counted zero prints `0`. Somebody looked; a dash here would
          say nobody did. */}
      <dl className="hl-defs">
        <dt>Signed off here</dt>
        <dd>{signed.here}</dd>
        <dt>In your account</dt>
        <dd>{signed.account}</dd>
        <dt>In both</dt>
        <dd>{signed.shared}</dd>
        <dt>Merged</dt>
        <dd>{signed.merged}</dd>
        <dt>Submittals</dt>
        <dd>
          {`${submittals.here} + ${submittals.account} → ${submittals.merged}`}
        </dd>
      </dl>

      <div className="hl-note" role="status">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      {/* §12.15 — the safe path is the adjacent action, not a paragraph the
          reader has to act on somewhere else. */}
      {needsExport && (
        <div className="hl-signoff-actions mt-2">
          {onExport ? (
            <button type="button" className="hl-btn hl-no-print" onClick={onExport}>
              {CLAIM_COPY.export}
            </button>
          ) : (
            <Link href="/profile/" className="hl-btn hl-no-print">
              {CLAIM_COPY.export}
            </Link>
          )}
        </div>
      )}
    </section>
  )
}
