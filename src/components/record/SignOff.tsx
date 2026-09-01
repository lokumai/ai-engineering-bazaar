'use client'

import Link from 'next/link'
import { NAME_SCOPE } from '@/lib/record/scope'
import { useState } from 'react'
import type { SignOffCriteria } from '@/lib/content/criteria'
import { seedFrom } from '@/lib/identity/mark'
import { MAX_NAME_GRAPHEMES, countGraphemes, sanitiseName } from '@/lib/identity/name'
import { revisionDrift } from '@/lib/record/derive'
import { mintMarkSeed, setIdentity, signOff, unsign } from '@/lib/record/events'
import {
  nowIso,
  requestPersistence,
  update,
  useHydrated,
  useRecord,
  useWriteState,
} from '@/lib/record/store'
import { SIGN_OFF_ATTR } from '@/lib/record/keys'
import { DrafterStamp } from './DrafterStamp'

/**
 * §12.4 — sign-off, the only completion primitive on this site.
 *
 * The reader asserts; the site never infers. No scroll heuristic, no dwell
 * threshold, no view timer, ever — this is the one completion model that cannot
 * violate §1, because the learner is the asserting party. Moodle ships exactly
 * this as its manual "Mark as done" and its current release moved both the
 * criteria and the control to the top of the activity; the alternative on offer
 * elsewhere is a green tick for viewing a page "for at least five seconds",
 * which is precisely the fictional state this design refuses.
 *
 * So the block sits **above the content**, beside the criteria it asserts
 * against. A completion switch a reader meets after scrolling past everything
 * is a switch about a thing they have already left.
 *
 * **No confirmation dialog on sign-off or un-sign** (§12.4.1). Un-sign is its
 * own undo, and a dialog on a routine action trains the reader to auto-confirm
 * the one dialog that matters — the §12.15 erase, which is the only
 * confirmation anywhere on this site.
 *
 * `SignOff` is also where two once-per-record things happen, because the first
 * sign-off is the only genuine user gesture the record gets:
 * `navigator.storage.persist()` may only be asked on one (§12.1.6), and the
 * mark seed is minted here and never again (§12.3.5).
 *
 * The import of `SignOffCriteria` is a **type-only** import. `criteria.ts`
 * reaches the loader and therefore `node:fs`; the values arrive as serialised
 * props from the server component that measured them (§12.2).
 */

/** The three write outcomes §12.1.4 makes the UI say `NOT SAVED` about. */
const REFUSED: Record<string, string> = {
  quota: "THIS BROWSER'S STORAGE IS FULL",
  blocked: 'THIS BROWSER IS NOT STORING DATA FOR THIS SITE',
  'too-large': 'THE RECORD IS LARGER THAN THIS PAGE WILL WRITE',
}

/**
 * §12.3.5 — four bytes from the CSPRNG, once. The bytes are generated here and
 * the hex is built by the pure function, which is why `seedFrom` has no
 * parameter a name could arrive through: a name-derived mark would silently
 * change on every already-signed sheet the moment the reader renamed
 * themselves. Returns null where Web Crypto is unavailable, and the mark then
 * renders as nothing rather than as a pattern from a predictable seed.
 */
function mintSeed(): string | null {
  try {
    const bytes = new Uint8Array(4)
    crypto.getRandomValues(bytes)
    return seedFrom(bytes)
  } catch {
    return null
  }
}

export function SignOff({
  slug,
  criteria,
  revision,
  drawn,
}: {
  slug: string
  /** §12.4.1 — the sheet's own `objectives`, plus the one sentence §12.4.1 authors. */
  criteria: SignOffCriteria
  /** §12.4.3 — the sheet's REV short hash now, for the drift line. */
  revision: string | null
  /** §12.4.1 — a draft sheet gets no control at all: absent, not disabled. */
  drawn: boolean
}) {
  const record = useRecord()
  const hydrated = useHydrated()
  const write = useWriteState()
  const [prompting, setPrompting] = useState(false)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState(false)

  // §12.4.1 — absent, not disabled. A draft awards nothing and cannot be
  // signed, and that is what keeps every denominator on the site honest.
  if (!drawn) return null

  const key = slug.replace(/[^A-Za-z0-9]+/g, '-')
  const headId = `hl-signoff-${key}`
  const hintId = `${headId}-hint`
  const errorId = `${headId}-error`

  const signedOff = hydrated ? (record.sheets[slug]?.signedOff ?? null) : null
  const drift = hydrated ? revisionDrift(record, slug, revision) : null
  const refused = REFUSED[write] ?? null

  function onToggle(): void {
    if (signedOff !== null) {
      update((data) => unsign(data, slug), { kind: 'unsign', sheetSlug: slug })
      return
    }

    const now = nowIso()
    // The seed is minted once and never regenerated, so its absence is the
    // honest test for "this is the first sign-off" (§12.3.5).
    const first = record.identity.markSeed === null
    update((data) => signOff(data, slug, revision, now), {
      // §12.4.3's drift line needs the revision the reader signed AGAINST, and
      // the log is where a later un-sign-and-re-sign stays visible.
      kind: 'signOff',
      sheetSlug: slug,
      payload: { revision },
    })
    if (!first) return

    const seed = mintSeed()
    if (seed !== null) {
      update((data) => mintMarkSeed(data, seed, now), { kind: 'mintMarkSeed' })
    }
    // §12.1.6 — called once, on a genuine user gesture. A `false` answer is
    // normal, not an error, and the store records the queried value.
    void requestPersistence()
    // §12.3.2 — the name is asked for at exactly one moment, and only when
    // there is not one already. No first-run gate, no modal, no coach mark: a
    // controlled study of 70 users across 4 apps found tutorial-viewers rated
    // tasks significantly harder (4.92 vs 5.49, p=0.047) with no gain in
    // success or speed.
    if (record.identity.name === null) setPrompting(true)
  }

  function onNameChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const next = event.target.value
    // §12.3.4 — 80 GRAPHEMES, counted with `Intl.Segmenter`. `maxLength` counts
    // UTF-16 units, which charges a Devanagari cluster or a joined emoji for
    // width it does not occupy, so it is not the instrument for this.
    if (countGraphemes(next) > MAX_NAME_GRAPHEMES) return
    setName(next)
    // §12.3.3 — errors clear live the moment the input becomes valid. The
    // check itself never runs per keystroke; only the clearing does.
    if (nameError && sanitiseName(next) !== '') setNameError(false)
  }

  function onNameSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const clean = sanitiseName(name)
    // §12.3.3 — validation on submit only. Asking to save a name when there is
    // none is the error; declining to give one is `SKIP`, and is legitimate.
    if (clean === '') {
      setNameError(true)
      return
    }
    update((data) => setIdentity(data, { name: clean }, nowIso()), {
      kind: 'setIdentity',
      payload: { named: true },
    })
    setPrompting(false)
  }

  return (
    <section className="hl-signoff" aria-labelledby={headId}>
      <div className="hl-signoff-head hl-mark">
        <span id={headId}>SIGN-OFF</span>
        {/* §12.4.1 / §12.12.1 — who is asserting is the one thing about this
            block a reader must not have to infer. The state itself is on the
            control, which is where §12.4.1 puts it. */}
        <span>SELF-ASSERTED</span>
      </div>

      <div className="hl-signoff-body">
        {/* §12.4.1 requires the control to sit beside the criteria it asserts
            against, and it does — the criteria ARE §5.5's objectives block,
            immediately above this one, and `signOffCriteria` derives from the
            same `frontmatter.objectives` that block prints.

            So they are pointed at, not reprinted. Rendering the list again here
            put the same three lines on screen twice inside 100px, which reads as
            a mistake rather than as thoroughness; and the count comes from the
            list itself, so the two can never disagree about how many there are.

            record.css authors no class for these two sentences, so they take the
            same tokens directly. */}
        <p className="mb-1 font-display text-meta text-ink-muted">
          {criteria.objectives.length > 0 && (
            <>
              Asserted against the{' '}
              <a className="hl-link" href="#hl-objectives-head">
                {criteria.objectives.length} objectives above
              </a>
              .{' '}
            </>
          )}
          {criteria.assertion}
        </p>

        <div className="hl-signoff-actions">
          {/* §12.16's `s` clicks this control by attribute, because the
              shortcut handler lives in the shell and has no page data in scope.
              The manifest's ninth column deliberately uses
              `data-hl-signoff-cell` instead, so 32 non-interactive squares on
              the index can never answer this selector and swallow the key. */}
          <button
            type="button"
            className="hl-btn"
            {...{ [SIGN_OFF_ATTR]: slug }}
            aria-pressed={signedOff !== null}
            onClick={onToggle}
          >
            {signedOff === null ? 'SIGN OFF' : `SIGNED OFF ${signedOff.slice(0, 10)}`}
          </button>
          {/* §12.4.1 — `UNSIGN` adjacent, and the toggle itself un-signs too: a
              pressed toggle whose click did nothing would be a control lying
              about what it is. */}
          {signedOff !== null && (
            <button
              type="button"
              className="hl-btn"
              onClick={() => update((data) => unsign(data, slug), { kind: 'unsign', sheetSlug: slug })}
            >
              UNSIGN
            </button>
          )}
        </div>

        {/* §12.4.3 — a completion claim that quietly became false. No LMS
            handles this. Not an error state and no caution colour: the sheet
            changing after you signed it is a fact, not something you did wrong.
            The short hashes keep their own case — a git hash is not ours to
            recase, and `.hl-mark` uppercases everything else in the line. */}
        {drift !== null && signedOff !== null && (
          <p className="hl-signoff-drift hl-mark">
            {`SIGNED OFF ${signedOff.slice(0, 10)} AGAINST REV `}
            <span className="normal-case">{drift.signedAgainst}</span>
            {' · SHEET NOW AT REV '}
            <span className="normal-case">{drift.nowAt}</span>
          </p>
        )}

        {/* §12.1.4 — the in-memory record stays live, and the page says so
            rather than going on claiming a state storage refused to hold. A
            write silently thrown away while the page keeps claiming the state
            is the §1 failure in its purest form. */}
        {refused !== null && (
          <>
            <p className="hl-not-saved hl-mark" role="alert">
              {`NOT SAVED · ${refused}`}
            </p>
            <p className="mt-1 font-display text-meta text-ink-muted">
              The record is held in memory on this page only. Export it to a file to keep it.
            </p>
            {/* §12.1.4 — the safe path is the adjacent action, not a paragraph
                the reader has to act on somewhere else. */}
            <div className="hl-signoff-actions mt-2">
              <Link href="/profile/" className="hl-btn hl-no-print">
                EXPORT YOUR RECORD
              </Link>
            </div>
          </>
        )}

        {/* §12.3.2 — asked for inline, as the empty `CHECKED BY` field of this
            sheet's own title block: the drawing is asking who is checking it.
            Not a modal, and genuinely skippable — the skipped state prints
            `UNSIGNED`, never a placeholder person. */}
        {prompting && (
          <form className="mt-3" onSubmit={onNameSubmit}>
            <div className="hl-identity">
              {/* The seed was minted a moment ago by the click that opened
                  this, so the mark it draws is the reader's own from here on. */}
              <DrafterStamp mark={record.identity.mark} seed={record.identity.markSeed} />
              <label className="hl-field flex-1" data-invalid={nameError ? 'true' : 'false'}>
                <span className="hl-field-label">
                  Name or initials, as you would sign a drawing
                  {/* Optional in words, never by the absence of an asterisk. */}
                  <span className="hl-field-optional">Optional</span>
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={onNameChange}
                  // The WHATWG token for "a typically short name used instead
                  // of the full name", which also satisfies SC 1.3.5.
                  autoComplete="nickname"
                  autoCapitalize="off"
                  spellCheck={false}
                  dir="auto"
                  aria-describedby={nameError ? `${hintId} ${errorId}` : hintId}
                />
              </label>
            </div>

            {/* §12.1.7 — the boundary that actually matters. Reading your own
                local storage is not a transmission; the export is precisely
                where that stops being true, and the reader is the one who
                crosses the line. */}
            <p className="hl-field-hint" id={hintId}>
              {NAME_SCOPE}
            </p>

            {nameError && (
              <p className="hl-field-error" id={errorId} role="alert">
                Enter the name to print on the report
              </p>
            )}

            <div className="hl-signoff-actions mt-2">
              <button type="submit" className="hl-btn">
                SAVE NAME
              </button>
              <button type="button" className="hl-btn" onClick={() => setPrompting(false)}>
                SKIP
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
