'use client'

import Link from 'next/link'
import {
  readingMinutes,
  signedCount,
  uptime,
  type CurriculumFacts,
} from '@/lib/record/derive'
import { nowIso, useHydrated, useRecord, useSyncState } from '@/lib/record/store'
import { hoursMinutes } from '@/lib/text'

/**
 * §7.1, §12.5.2 — the readout strip. A tmux statusline or a lab instrument,
 * never a profile header.
 *
 * ```
 * Completed 07/33 · To go 26 · Traces 14/32 · Streak 6d · Reading time 3 h 10 m
 * ```
 *
 * **M13 / O2 — three cells left the strip and one arrived.** `XP`, `Rank` and
 * `II at 16` are gone. O2 asked what question each answered and nobody named
 * one: a weighted sum of three unlike acts is not a quantity a reader can act
 * on, and a Roman numeral for any 8 modules of 33 is a rank that claims no
 * capability by its own rule (§12.5.3). `Reading time` took XP's place because
 * minutes are the one unit on this site a reader already thinks in, and it is
 * the author's own resolution of O2 — *"XP 0 becomes minutes read"*. The
 * selectors behind the retired cells are still in `derive.ts` and say there why.
 *
 * `Reading time` is the modules' own declared minutes over the modules the
 * reader has completed, never a measurement of the reader: nothing on this site
 * writes `dwellSeconds`, so a reader-measured figure would read `0 m` for
 * everybody. `readingMinutes` carries that reasoning.
 *
 * **Channel B (§12.2).** Every value here is text, so none of it can travel on
 * the pre-paint boot script: the server renders the honest empty form and the
 * reading arrives post-mount. `useRecord()` returns the frozen `EMPTY_RECORD`
 * on the server and in the first client render, and `useHydrated()` is what
 * tells "nothing recorded" from "not yet known" — the first prints `00/32`, the
 * second prints `--`, and the difference matters because only one of them is a
 * fact about the reader. `suppressHydrationWarning` is forbidden here (§12.2):
 * it works one level deep and React will not patch mismatched text, so a
 * suppressed readout would keep showing the build-time value — it would lie
 * rather than flicker.
 *
 * **`TO GO` leads (§12.5.2).** Not in position — §12.5.2 prints `SIGNED OFF`
 * first — but in ink: for a high-commitment goal, remaining-actions feedback
 * raises aspiration more than present position does, and the study that tested
 * this exact readout found that stating the position reached raised it least.
 * So the undrawn count takes `.bz-readout-togo` (ink, weight 500) and the Roman
 * numeral stays quiet.
 *
 * **No percentage, anywhere, ever** (§11.35, §12.5.7). Counting in sheets is
 * what lets to-date and to-go coexist truthfully; one percentage silently picks
 * a frame for the reader. Values snap — no count-up, no roll, no odometer
 * (§7.1, §9.1).
 *
 * **§14.7.3 — `data-sync`, the fourth attribute.** `off` / `synced` /
 * `pending` / `failed`, and it is a CLAIM in exactly the sense
 * `data-hydrated` is: `off` means nothing is being asserted about a server, and
 * it is what the server render and the first client render both produce, so the
 * attribute costs `data-hydrated` nothing — the Playwright check that reads
 * `data-hydrated` at first paint sees the same two values it always did.
 *
 * Only `failed` is given VISIBLE copy, and that is deliberate on both counts.
 * §14.7.3 writes copy for one state — `NOT SYNCED · EXPORT YOUR RECORD` —
 * because that is the state where the only copy of the record is still in this
 * browser and §12.15's export is the reader's move. `pending` is sub-second and
 * clears on the same throttle as a `localStorage` write, so a cell for it would
 * appear and vanish on every burst of keystrokes: motion §9.1 does not allow
 * and information the reader cannot act on. `synced` and `off` are answered by
 * the attribute, and by the account sheet, which is where a durability claim
 * belongs.
 */

/** §7.1 — the compact three-value form lives in the footer on every page. */
export type ReadoutVariant = 'full' | 'compact'

export interface ReadoutProps {
  variant: ReadoutVariant
  /**
   * Measured from the corpus at build time and passed down as plain data:
   * `lib/content/facts.ts` reaches `node:fs`, so a client leaf may never import
   * it (§12.2). Every denominator in the strip comes from here, never typed
   * (§11.25).
   */
  facts: CurriculumFacts
  /**
   * §5.8, §7.1 `TRACES n/32` — REQUIRES and SEE ALSO edges with both endpoints
   * signed off. The record's facts carry the denominator but not the graph, so
   * the dashboard — which builds the graph — is the only surface that can
   * supply the numerator. Absent rather than empty everywhere else (§11.25):
   * `TRACES --/32` on a page that never counted them would be a dash standing
   * in for a number nobody looked for.
   */
  traces?: number | null
  className?: string
}

/** `--` is the instrument convention for "no reading", and it is true. */
const NO_READING = '--'

/** §12.13 — `SIGNED OFF 00 / 32`: the numerator is padded to the total's width. */
function fraction(count: number | null, of: number): string {
  const total = String(of)
  const numerator = count === null ? NO_READING : String(count).padStart(total.length, '0')
  return `${numerator}/${total}`
}

function Cell({
  label,
  value,
  togo = false,
}: {
  label: string
  value: string
  /** §12.5.2 — the one number in the strip that gets ink weight. */
  togo?: boolean
}) {
  return (
    <span>
      {label}{' '}
      <span className={togo ? 'bz-readout-value bz-readout-togo' : 'bz-readout-value'}>
        {value}
      </span>
    </span>
  )
}

export function Readout({ variant, facts, traces = null, className }: ReadoutProps) {
  const data = useRecord()
  const hydrated = useHydrated()
  const sync = useSyncState()

  const counts = signedCount(data, facts)
  const minutes = readingMinutes(data, facts)

  /**
   * The clock is read only once the store has answered, which is after the
   * hydration commit — never in the first client render, which has to match the
   * server's. UTC, the basis `store.ts` writes days in: a local day boundary
   * would redraw the strip on a flight.
   */
  const streak = hydrated ? uptime(data, nowIso().slice(0, 10)).streak : null

  const cells: React.ReactNode[] = []
  cells.push(
    <Cell
      key="signed"
      label="Completed"
      value={fraction(hydrated ? counts.signed : null, counts.of)}
    />,
  )

  if (variant === 'full') {
    cells.push(
      <Cell
        key="togo"
        label="To go"
        value={hydrated ? String(counts.toGo) : NO_READING}
        togo
      />,
    )
    if (traces !== null) {
      cells.push(
        <Cell
          key="traces"
          label="Traces"
          value={fraction(hydrated ? traces : null, facts.traces)}
        />,
      )
    }
    cells.push(
      <Cell key="uptime" label="Streak" value={streak === null ? NO_READING : `${streak}d`} />,
    )
  }

  // M13 / O2 — where `XP`, `Rank` and the next threshold used to be. One cell
  // instead of three, in a unit the reader already thinks in. The full strip
  // states the denominator as well, because a reading time with nothing beside
  // it does not say how much course there is.
  cells.push(
    <Cell
      key="minutes"
      label="Reading time"
      value={
        hydrated
          ? variant === 'full'
            ? `${hoursMinutes(minutes.done)} of ${hoursMinutes(minutes.of)}`
            : hoursMinutes(minutes.done)
          : NO_READING
      }
    />,
  )

  /**
   * §14.7.3 — the push did not land, so the strip says so and puts the export
   * beside it rather than a route away from it. `.bz-not-saved`'s fault ink is
   * borrowed as a utility rather than the class itself: that class carries a
   * `margin-top` written for a block under a control, and inside a 40px flex
   * row it would push the line off its baseline. §12.10.4 — the colour is not
   * alone; the words carry the state.
   *
   * `role="status"` and not the `role="alert"` `SignOff` uses for a refused
   * `localStorage` write. That one answers a gesture the reader just made; this
   * is ambient chrome on all 32 sheets, and an assertive region here would
   * interrupt on every client navigation for a fact that has not changed.
   */
  if (sync === 'failed') {
    cells.push(
      <span key="sync" role="status" className="whitespace-nowrap">
        <span className="bz-readout-value text-on-surface">Not synced</span>
        <span aria-hidden="true" className="bz-readout-sep">{' · '}</span>
        <Link href="/profile/" className="bz-link bz-no-print">
          Export your record
        </Link>
      </span>,
    )
  }

  return (
    <div
      className={[
        'bz-readout',
        // §5.2 — the compact form sits inside footer row 1, which already has
        // the footer's own top rule above it. §7.1's two painted rules belong to
        // the full strip on the dashboard; a second pair inside a 40px row is
        // two lines that mean nothing.
        variant === 'compact' ? 'bg-none' : null,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-variant={variant}
      data-hydrated={hydrated ? 'true' : 'false'}
      data-sync={sync}
    >
      {/* Every cell and every separator is its own flex child: §7.1's `gap: 0
          8px` is what spaces them, and the strip wraps between values rather
          than inside one. */}
      {cells.flatMap((cell, index) =>
        index === 0
          ? [cell]
          : [
              <span key={`sep-${index}`} aria-hidden="true" className="bz-readout-sep">
                ·
              </span>,
              cell,
            ],
      )}
    </div>
  )
}
