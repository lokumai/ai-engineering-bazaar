'use client'

import { setCharKeys } from '@/lib/record/events'
import { quarantineReason, update, useHydrated, useRecord } from '@/lib/record/store'

/**
 * The small record panels that outlived the progress page's register: the
 * quarantine note and the keyboard switch.
 *
 * M38 and M40 (2026-11-05) removed everything else this file held, on the
 * author's word: the readout and its face legend, the streak, the stamps, the
 * submittals, the role, the organisation, the last claim, storage and the raw
 * stored values.
 */

/** §12.1.2 — the quarantine state, the one thing that explains an empty page. */
export const QUARANTINE_COPY: Readonly<
  Record<'newer' | 'malformed', { readout: string; note: string }>
> = {
  newer: {
    readout: 'RECORD WRITTEN BY A NEWER VERSION OF THIS SITE — NOT READ',
    note:
      'This browser has a cached older copy of the site. Reload to update. '
      + 'Your record is intact and has not been changed.',
  },
  malformed: {
    readout: 'RECORD COULD NOT BE READ BY THIS VERSION OF THIS SITE — NOT READ',
    note:
      'The stored record is not a shape this version of the site can read. It '
      + 'has been copied aside unchanged rather than discarded, and nothing has '
      + 'been written over it.',
  },
}

export function QuarantineNote() {
  const hydrated = useHydrated()
  const reason = hydrated ? quarantineReason() : null
  if (reason === null) return null

  const copy = QUARANTINE_COPY[reason]

  return (
    <section aria-label="Record status" className="mb-8">
      <p className="text-mark m-0 text-on-surface">{copy.readout}</p>
      <div className="bz-note">
        <p>{copy.note}</p>
      </div>
    </section>
  )
}

/**
 * §12.16, WCAG 2.2 SC 2.1.4 — single-character shortcuts must be possible to
 * switch off. It lives under the keyboard map on `/legend/` since M40, because
 * the progress page's keyboard row was removed in M38 and left the switch with
 * no home. Channel B: the server renders it on, which is the real default.
 */
export function CharKeysToggle() {
  const record = useRecord()
  const on = record.prefs.charKeys

  return (
    <div>
      <label className="bz-check items-center">
        <input
          type="checkbox"
          className="mt-0"
          checked={on}
          onChange={(event) => update((data) => setCharKeys(data, event.target.checked))}
        />
        <span className="text-item leading-normal text-on-surface">
          Single-character shortcuts
        </span>
      </label>
      <p className="mt-1 mb-0 text-meta leading-normal text-on-surface-muted">
        With this off, every single-character key and every two-key chord in the
        keyboard shortcuts stops doing anything. Shortcuts that need Ctrl, Cmd or
        Alt keep working, and Escape always closes what is open.
      </p>
    </div>
  )
}

