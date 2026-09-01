'use client'

import { useEffect, useState } from 'react'
import { NAME_SCOPE, RECORD_SCOPE } from '@/lib/record/scope'
import {
  MAX_NAME_GRAPHEMES,
  countGraphemes,
  initialsOf,
  sanitiseName,
} from '@/lib/identity/name'
import { setIdentity } from '@/lib/record/events'
import { nowIso, update, useHydrated, useRecord } from '@/lib/record/store'
import { DrafterStamp } from './DrafterStamp'
import { MarkPicker } from './MarkPicker'

/**
 * §12.11 item 1, §12.3 — the drafter's own identity: the stamp, the name as it
 * will print, the field that edits it, and the boundary the export crosses.
 *
 * **The name is asked for once, at the first sign-off** (§12.3.2), and this is
 * not that moment — this is the one place it can be changed afterwards. There
 * is no first-run gate anywhere on this site: a controlled study of 70 users
 * across four apps found tutorial-viewers rated tasks significantly harder
 * (4.92 vs 5.49, p=0.047) with no gain in success or speed, and for senior
 * engineers the paradox of the active user makes it worse. So the field here is
 * an edit, never a prompt, and the empty state claims nothing.
 *
 * **What an edit does and does not touch** (§12.3.2, §12.3.5). The record holds
 * one name, so changing it changes what every sheet prints as `CHECKED BY`.
 * What an edit cannot reach is the dates sheets were signed off on and the
 * minted mark seed — both are recorded facts about a past act, and rewriting
 * either from a rename would retroactively alter a signed artefact. The panel
 * states that outright rather than leaving the reader to test it.
 *
 * §12.2 channel B throughout: `useRecord()` returns the frozen `EMPTY_RECORD`
 * on the server and in the first client render, so the prerendered panel prints
 * `NO NAME ON RECORD` with no stamp beside it — which is the only thing
 * build-time HTML can truthfully say about a reader it has never met — and the
 * value arrives after the hydration commit. The input's initial value is `''`,
 * a constant the server computes identically, and the stored name is copied
 * into it by an effect.
 */

/** §12.3.2 — never a placeholder person. The absence is the information. */
const NO_NAME = 'NO NAME ON RECORD'

export function IdentityPanel() {
  const record = useRecord()
  const hydrated = useHydrated()

  const stored = record.identity.name
  const [draft, setDraft] = useState('')
  const [edited, setEdited] = useState(false)
  const [error, setError] = useState(false)
  const [saved, setSaved] = useState(false)

  /**
   * The field is filled from the record once it has been read, and again if
   * another tab changes the name (§12.1.5) — but never over the reader's own
   * keystrokes, which is what `edited` guards. Reading the store during render
   * to seed `useState` would put a channel-B value in the first render and is
   * exactly the hydration mismatch §12.2 exists to prevent.
   */
  useEffect(() => {
    if (edited) return
    setDraft(stored ?? '')
  }, [stored, edited])

  const initials = stored === null ? null : initialsOf(stored)

  function onChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const next = event.target.value
    // §12.3.4 — 80 GRAPHEMES, counted with `Intl.Segmenter`. `maxLength` counts
    // UTF-16 units, which charges a Devanagari cluster or a joined emoji for
    // width it does not occupy, so it is not the instrument for this. The
    // STORED value is never truncated (§12.3.4); this refuses the keystroke
    // that would take it past the cap instead of quietly cutting it.
    if (countGraphemes(next) > MAX_NAME_GRAPHEMES) return
    setDraft(next)
    setEdited(true)
    setSaved(false)
    // §12.3.3 — errors clear live the moment the input becomes usable. The
    // check itself never runs per keystroke; only the clearing does.
    if (error && sanitiseName(next) !== '') setError(false)
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    // §12.3.3 — validation on submit only, never per keystroke.
    const clean = sanitiseName(draft)
    if (clean === '') {
      setError(true)
      return
    }
    update((data) => setIdentity(data, { name: clean }, nowIso()), {
      kind: 'setIdentity',
      payload: { named: true },
    })
    setEdited(false)
    setSaved(true)
  }

  /**
   * §12.3.2 — genuinely removable, and the removed state is legitimate:
   * `CHECKED BY` prints `UNSIGNED`, never a placeholder person. This is the
   * only way back out of having given a name, and a reader who is told the
   * export carries the name has to have one.
   */
  function onRemove(): void {
    update((data) => setIdentity(data, { name: null }, nowIso()), {
      kind: 'setIdentity',
      payload: { named: false },
    })
    setDraft('')
    setEdited(false)
    setError(false)
    setSaved(false)
  }

  return (
    <div className="grid gap-4">
      {/* The identity line: stamp, initials, name — all three absent rather
          than substituted when there is nothing to draw (§12.3.4 refuses `?`
          and the silhouette for exactly this state). */}
      <div className="hl-identity">
        <DrafterStamp mark={record.identity.mark} seed={record.identity.markSeed} />
        {initials !== null && (
          // As typed, not uppercased: CSS `text-transform` cases off the
          // element's `lang`, and `ilker` under `lang="en"` uppercases to a
          // dotless I where a Turkish reader expects İ (§12.3.4).
          <span className="hl-identity-initials normal-case">{initials}</span>
        )}
        {stored === null || stored.trim() === '' ? (
          <span className="hl-mark text-ink-muted">{NO_NAME}</span>
        ) : (
          <bdi dir="auto" className="hl-identity-name">
            {stored}
          </bdi>
        )}
      </div>

      {/* §12.3.1 — the row as the title block will print it. Signed sheets get
          the name; a sheet signed with no name on record prints `UNSIGNED`, and
          a sheet nobody has signed prints `—`. Printing it here is what makes
          the field's effect checkable before a reader signs anything. */}
      <dl className="hl-defs">
        <dt>Checked by</dt>
        <dd>
          {stored === null || stored.trim() === '' ? (
            'UNSIGNED'
          ) : (
            <bdi dir="auto" className="font-display normal-case tracking-normal">
              {stored}
            </bdi>
          )}
        </dd>
      </dl>

      <form onSubmit={onSubmit} noValidate>
        <label className="hl-field" data-invalid={error ? 'true' : 'false'}>
          {/* Visible and persistent, never a placeholder standing in for a
              label, and optional IN WORDS (§12.3.3): marking only the required
              fields makes readers mistake the optional ones for required. */}
          <span className="hl-field-label">
            Name or initials, as you would sign a drawing
            <span className="hl-field-optional">Optional</span>
          </span>
          <input
            type="text"
            value={draft}
            onChange={onChange}
            // The WHATWG token for "a typically short name used instead of the
            // full name", which also satisfies SC 1.3.5.
            autoComplete="nickname"
            autoCapitalize="off"
            spellCheck={false}
            dir="auto"
            aria-describedby={error ? 'hl-name-hint hl-name-error' : 'hl-name-hint'}
          />
        </label>

        {/* §12.1.7 — the boundary that actually matters. Reading your own local
            storage is not a transmission; the export is precisely where that
            stops being true, and the reader is the one who crosses the line. */}
        <p className="hl-field-hint" id="hl-name-hint">
          {NAME_SCOPE}
        </p>

        {/* GOV.UK register: imperative, and it describes the fix. No "please",
            no "sorry", no verdict on the input (§12.3.3, §12.14.1). */}
        {error && (
          <p className="hl-field-error" id="hl-name-error" role="alert">
            Enter the name to print on the report
          </p>
        )}

        <div className="hl-signoff-actions mt-2">
          <button type="submit" className="hl-btn">
            SAVE NAME
          </button>
          {stored !== null && stored.trim() !== '' && (
            <button type="button" className="hl-btn" onClick={onRemove}>
              REMOVE NAME
            </button>
          )}
          {/* A readout, not praise: the record logged it, and that is the whole
              of what is worth saying (§12.5.7, §12.14.1). Gated on `hydrated`
              so it can only ever follow a write this session made. */}
          {saved && hydrated && (
            <span className="hl-mark text-ink-muted" role="status">
              NAME ON RECORD
            </span>
          )}
        </div>
      </form>

      {/* §12.3.2, §12.3.5 — what an edit reaches, and what it cannot. */}
      <p className="m-0 font-display text-meta leading-normal text-ink-muted">
        Changing the name changes what every sheet prints as CHECKED BY. It does
        not change the dates sheets were signed off on, and it does not change
        the mark: both are records of something that already happened.
      </p>

      <MarkPicker />

      {/* §12.1.7 — three flat lines: mechanism, risk, mitigation. A note block,
          not a banner: no dismiss, no icon, no caution colour. Escalating a
          routine architectural fact to alarm styling both overstates it and
          spends the alarm budget the erase dialog needs (§12.15). */}
      <div className="hl-note">
        <p>{RECORD_SCOPE}</p>
        <p>
          Browser storage can be cleared without warning — by you, by the
          browser, or by a private window. Safari deletes it after seven days
          without a visit.
        </p>
        <p>Export your record to a file to keep it.</p>
      </div>
    </div>
  )
}
