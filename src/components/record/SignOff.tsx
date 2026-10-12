'use client'

import Link from 'next/link'
import { toggleCompletion } from '@/lib/record/complete'
import { SIGN_OFF_ATTR } from '@/lib/record/keys'
import { useHydrated, useRecord, useWriteState } from '@/lib/record/store'

/**
 * The end of a module, part one: ONE familiar control that marks it complete
 * and un-marks it.
 *
 * The author, 2026-10-12, of everything this replaced: *"there should be a
 * mechanism to check something as completed or uncheck it using a familiar,
 * industry standard, best practice and intuitive UI/UX"*. What it replaced was
 * a `Completion · Self-asserted` head, a sentence pointing at the objectives,
 * a `Complete` button with a separate `Un-complete` beside it, a drift line
 * naming two revision hashes, and an inline form asking for a name or
 * initials after the first completion (`Save name` / `Skip`). All of it is gone
 * from the page; none of the record it wrote is.
 *
 * ## A real checkbox
 *
 * The control every course platform uses for this: a box and a label that
 * stays the same — `Mark this module as complete` — with the state carried by
 * the box, so a screen reader announces "checkbox, checked" instead of a label
 * that rewrites itself. The whole row is the label, so the target is the row.
 * The date it was completed is a quiet second line, there when it is true.
 *
 * `toggleCompletion` is still the one path a completion takes (`complete.ts`),
 * so the home page's course list and this checkbox cannot disagree, and the
 * `s` shortcut still works: it clicks whatever carries `SIGN_OFF_ATTR`, and a
 * click on a checkbox toggles it.
 *
 * ## What stays, and why
 *
 * Only the storage refusal (§12.1.4). If the browser will not store the
 * record, the box can still tick for this page, and a box that ticks while
 * nothing was kept is the one claim this control may never make — so a single
 * line says so, with the way out.
 */

const REFUSED: Record<string, string> = {
  quota: "This browser's storage is full",
  blocked: 'This browser is not storing data for this site',
  'too-large': 'The record is larger than this page will write',
}

/** `2026-10-11` → `11 Oct 2026`, in the reader's own calendar order. */
function shortDate(iso: string): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function SignOff({
  slug,
  revision,
  drawn,
}: {
  slug: string
  revision: string | null
  drawn: boolean
}) {
  const record = useRecord()
  const hydrated = useHydrated()
  const write = useWriteState()

  if (!drawn) return null

  const signedOff = hydrated ? (record.sheets[slug]?.signedOff ?? null) : null
  const done = signedOff !== null
  const refused = REFUSED[write] ?? null
  const id = `hl-complete-${slug.replace(/[^A-Za-z0-9]+/g, '-')}`

  return (
    <section className="bz-complete" aria-label="Module completion" data-done={done ? '' : undefined}>
      <label className="bz-complete-row" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          className="bz-complete-box"
          checked={done}
          onChange={() => toggleCompletion(record, slug, revision)}
          {...{ [SIGN_OFF_ATTR]: slug }}
        />
        <span className="bz-complete-mark" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
            strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8.5l3.2 3.2L13 4.8" />
          </svg>
        </span>
        <span className="bz-complete-text">
          <span className="bz-complete-label">Mark this module as complete</span>
          {done && <span className="bz-complete-when">Completed {shortDate(signedOff)}</span>}
        </span>
      </label>

      {refused !== null && (
        <p className="bz-complete-refused" role="alert">
          Not saved: {refused}.{' '}
          <Link href="/profile/" className="bz-link">Export your record</Link> to keep it.
        </p>
      )}
    </section>
  )
}
