'use client'

import { useEffect, useState } from 'react'
import { UPTIME_DAYS, uptime } from '@/lib/record/derive'
import { dayOf } from '@/lib/record/events'
import { nowIso, useRecord } from '@/lib/record/store'

/**
 * §7.3 / §12.5.5 — UPTIME. Fourteen hairline ticks, one per day, dashboard
 * only.
 *
 * **No flame, no modal, no notification, and no loss-aversion copy anywhere
 * near it.** A visible gap where a day was missed is the entire message, and
 * §12.5.5's hardest rule is the one that shapes this file: **an empty strip is
 * never rendered as a deficit.** So fourteen inactive ticks are fourteen
 * hairlines — not fourteen empty boxes, which would read as slots waiting to be
 * filled, which is a nudge — and the label prints a count, never a warning.
 *
 * Recorded in the spec and worth restating here: this buys measured absence of
 * harm at the cost of unmeasured engagement. The harm is documented —
 * apprehension, guilt, disrupted routines and abandonment on streak loss among
 * adult users — while no fetched source shows a non-punitive tick strip
 * producing comparable engagement. It is the right trade for this audience. It
 * is still a trade.
 *
 * **`today` is the one value this component cannot render on the server.** The
 * build has no idea what day the reader will open the page on, and §12.2 fixes
 * the shape of that problem: a `useState` initial value must be a constant the
 * server computes identically, so it starts `null` and the effect fills it in.
 * The prerendered strip is therefore fourteen dated-by-nothing hairlines with
 * the label at `--`, which is the instrument convention for "no reading" and is
 * true at that instant. Reading `Date` during render would be exactly the
 * hydration mismatch §12.2 exists to prevent, and `suppressHydrationWarning`
 * would keep the build day on screen for ever instead of flickering once.
 *
 * The day basis is UTC, taken through the same `dayOf` the reducers stamp `days`
 * with (§12.1.4). A local-time basis would move the day boundary with the
 * device and redraw this strip on a flight.
 */
export function Uptime() {
  const record = useRecord()
  const [today, setToday] = useState<string | null>(null)

  useEffect(() => {
    setToday(dayOf(nowIso()))
  }, [])

  const reading = today === null ? null : uptime(record, today)

  // The honest pre-mount form: the right number of ticks, none of them
  // claiming a date, and no reading on the label.
  const ticks =
    reading?.days
    ?? Array.from({ length: UPTIME_DAYS }, () => ({
      date: '',
      active: false,
      today: false,
    }))

  return (
    <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
      <div
        className="hl-uptime"
        role="img"
        aria-label={strip(reading?.days ?? null)}
      >
        {ticks.map((tick, index) => (
          <span
            // Keyed by position: the strip is always UPTIME_DAYS long and the
            // window slides, so the index is the stable thing, not the date.
            key={index}
            className="hl-uptime-tick"
            data-active={tick.active ? 'true' : 'false'}
            data-today={tick.today ? 'true' : undefined}
          />
        ))}
      </div>
      <p className="hl-mark m-0 text-ink-muted">{label(reading)}</p>
    </div>
  )
}

/**
 * §7.3's label. `UPTIME 6d`, and `UPTIME 0d · LAST 3d AGO` when the run is
 * broken — a count and a fact, with no terminal period (§12.14.1).
 *
 * `LAST` is absent rather than zero when nothing has ever been recorded: there
 * is no last day, and `LAST 0D AGO` would assert one.
 */
function label(
  reading: { streak: number; lastActive: string | null; days: Array<{ date: string }> } | null,
): string {
  if (reading === null) return 'UPTIME --'
  if (reading.streak > 0) return `UPTIME ${reading.streak}D`
  const gap = daysAgo(reading)
  if (gap === null) return 'UPTIME 0D'
  return `UPTIME 0D · LAST ${gap}D AGO`
}

function daysAgo(reading: {
  lastActive: string | null
  days: Array<{ date: string }>
}): number | null {
  if (reading.lastActive === null || reading.days.length === 0) return null
  const today = Date.parse(`${reading.days[reading.days.length - 1].date}T00:00:00.000Z`)
  const last = Date.parse(`${reading.lastActive}T00:00:00.000Z`)
  if (!Number.isFinite(today) || !Number.isFinite(last)) return null
  return Math.max(0, Math.round((today - last) / 86_400_000))
}

/**
 * §10.4 — the strip is an image of a count, so it takes a name that states the
 * count rather than describing fourteen rectangles. Before the day is known it
 * says so; a name that claimed "0 of 14" against a window nobody has measured
 * would be the invented value §11.25 forbids.
 */
function strip(days: Array<{ active: boolean }> | null): string {
  if (days === null) return `Days recorded in the last ${UPTIME_DAYS}, not yet read`
  const active = days.filter((day) => day.active).length
  return `${active} of the last ${days.length} days recorded`
}
