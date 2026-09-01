'use client'

import { useEffect, useState } from 'react'
import { SessionProvider, useSession } from '@/components/auth/SessionProvider'
import { NAME_FROM_ADDRESS, NAME_SCOPE, RECORD_SCOPE } from '@/lib/record/scope'
import { aliasFromEmail } from '@/lib/identity/alias-offer'
import {
  MAX_NAME_GRAPHEMES,
  countGraphemes,
  initialsOf,
  sanitiseName,
} from '@/lib/identity/name'
import { setIdentity } from '@/lib/record/events'
import { nowIso, update, useHydrated, useRecord } from '@/lib/record/store'
import { DrafterStamp } from './DrafterStamp'

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
 * **§16.2.2 took the mark picker out of this panel, and that is the one change
 * §16 makes to it.** `MarkPicker` was rendered here, and §16.1 renders it once
 * in the drafter block's half A so that the role's offer can be passed to it —
 * `offeredMark` resolves against the role, which this panel does not read. Two
 * call sites would have put two `data-hl-mark` groups and two `#hl-mark-legend`
 * ids on `/profile/`, which is §11.38's breach and an ambiguous anchor. The
 * field, its `SAVE NAME` button and `.hl-identity-initials` all stay here,
 * whole and unreworded: two e2e specs locate them by accessible name and read a
 * computed style off the initials.
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

/**
 * §16.3 — the provenance note's id, so the field is DESCRIBED by it rather than
 * merely followed by it. A reader on a screen reader meets the value in the
 * field before the line under it, and "where did this name come from" is a
 * question about the value.
 */
const SOURCE_HINT = 'hl-name-source'

/**
 * §16.3 — the panel carries its own `SessionProvider`, and that is a decision
 * rather than boilerplate.
 *
 * The note under the field is only true while the stored name is still the one
 * taken from THIS account's address, so the panel has to see the session.
 * MEASURED: on `/profile/` there is no provider above this component —
 * `layout.tsx:107-109` wraps `AccountSync` alone and `AuthPanels` brings its own
 * further down the page — so `useSession()` here returns null and the note could
 * never appear. **The rejected alternative was to require the caller to wrap
 * it**: a note whose visibility depends on an ancestor a different file owns is
 * a note that silently stops rendering the next time the page is reassembled,
 * and nothing in the unit suite can see that happen.
 *
 * Nesting costs nothing. `SessionProvider`'s own header records why: one cached
 * client, one refresh timer, one storage key, however many providers — which is
 * the same allowance `AuthPanels` already takes so that a page needs one tag.
 * With no backend configured the provider builds no client at all, so
 * `accounts-disabled.spec.ts`'s zero-request sweep over `/profile/` is unmoved.
 */
export function IdentityPanel() {
  return (
    <SessionProvider>
      <IdentityFields />
    </SessionProvider>
  )
}

function IdentityFields() {
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

  /**
   * §16.3 — is this name still the one the account's address supplied?
   *
   * Two facts have to hold, and the second is what makes the line disappear at
   * the right moment. `prefs.aliasNamedFor` says the offer was made to THIS
   * account (`AccountSync.aliasNameFor` is its only writer and never clears it,
   * which is what makes `REMOVE NAME` final). But the flag alone would leave the
   * note standing over a name the reader had since typed, and the note would
   * then be false — so the stored name is compared against the offer itself.
   * `aliasFromEmail` is the single author of that string, so the comparison
   * cannot drift from the write.
   *
   * `session` is null when no provider is mounted and the view is `unknown`
   * until an effect has run, so the note is absent in the prerendered HTML and
   * in the first client render — §12.2 channel B, the same discipline as the
   * name itself.
   */
  const session = useSession()
  const view = session?.view
  const fromAddress =
    view?.status === 'signedIn' &&
    record.prefs.aliasNamedFor === view.user.id &&
    stored !== null &&
    stored === aliasFromEmail(view.user.email)

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
            // In document order, so the announcement matches the page: where
            // the value came from, then where it goes, then what to fix.
            aria-describedby={[
              ...(fromAddress ? [SOURCE_HINT] : []),
              'hl-name-hint',
              ...(error ? ['hl-name-error'] : []),
            ].join(' ')}
          />
        </label>

        {/* §16.3 — where the value in the field above came from, printed only
            while it is still true of that value. One author (`scope.ts`), and
            never the address itself. */}
        {fromAddress && (
          <p className="hl-mark m-0 text-ink-muted" id={SOURCE_HINT}>
            {NAME_FROM_ADDRESS}
          </p>
        )}

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
