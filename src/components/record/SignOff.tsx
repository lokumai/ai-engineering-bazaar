'use client'

import Link from 'next/link'
import { NAME_SCOPE } from '@/lib/record/scope'
import { useState } from 'react'
import type { SignOffCriteria } from '@/lib/content/criteria'
import { MAX_NAME_GRAPHEMES, countGraphemes, sanitiseName } from '@/lib/identity/name'
import { toggleCompletion } from '@/lib/record/complete'
import { revisionDrift } from '@/lib/record/derive'
import { setIdentity, unsign } from '@/lib/record/events'
import {
  nowIso,
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
 * **The write itself is not here any more, and that is D14's constraint.** M13
 * and M14 put completion control **C** on the home and progress pages, and the
 * first completion on a record is three writes rather than one: the sign-off,
 * the mark seed minted once and never again (§12.3.5), and the single permitted
 * `navigator.storage.persist()` (§12.1.6). Two controls implementing that
 * separately is two implementations of one thing, so it lives in
 * `lib/record/complete.ts` and both controls call it — two controls, one path
 * through `store.ts`, which is the only writer of learner state.
 *
 * What stays here is the one thing that belongs to this page: §12.3.2's name
 * prompt, asked in the module's own `CHECKED BY` field, which control C has no
 * module to ask inside.
 *
 * The import of `SignOffCriteria` is a **type-only** import. `criteria.ts`
 * reaches the loader and therefore `node:fs`; the values arrive as serialised
 * props from the server component that measured them (§12.2).
 */

/** The three write outcomes §12.1.4 makes the UI say `NOT SAVED` about. */
const REFUSED: Record<string, string> = {
  quota: "THIS BROWSER'S STORAGE IS FULL",
  blocked: 'This browser is not storing data for this site',
  'too-large': 'The record is larger than this page will write',
}

export function SignOff({
  slug,
  criteria,
  revision,
  drawn,
  beside,
}: {
  slug: string
  /** §12.4.1 — the sheet's own `objectives`, plus the one sentence §12.4.1 authors. */
  criteria: SignOffCriteria
  /** §12.4.3 — the sheet's REV short hash now, for the drift line. */
  revision: string | null
  /** §12.4.1 — a draft sheet gets no control at all: absent, not disabled. */
  drawn: boolean
  /** The one quiet control `01` allows beside the primary. */
  beside?: React.ReactNode
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
    // D14 — the write itself is `toggleCompletion`, shared with control C on
    // the home and progress pages: two controls, one path, because the first
    // completion is three writes and not one (`lib/record/complete.ts`).
    const outcome = toggleCompletion(record, slug, revision)
    // §12.3.2 — the name is asked for at exactly one moment, and only when
    // there is not one already. No first-run gate, no modal, no coach mark: a
    // controlled study of 70 users across 4 apps found tutorial-viewers rated
    // tasks significantly harder (4.92 vs 5.49, p=0.047) with no gain in
    // success or speed. It stays HERE rather than in the shared write, because
    // the field it asks in is this module's own `CHECKED BY` and control C has
    // no module to ask inside.
    if (outcome.first && record.identity.name === null) setPrompting(true)
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
    <section className="bz-signoff" aria-labelledby={headId}>
      <div className="bz-signoff-head">
        <span id={headId}>Completion</span>
        {/* §12.4.1 / §12.12.1 — who is asserting is the one thing about this
            block a reader must not have to infer. The state itself is on the
            control, which is where §12.4.1 puts it. */}
        <span>Self-asserted</span>
      </div>

      <div className="bz-signoff-body">
        {/* §12.4.1 requires the control to sit beside the criteria it asserts
            against, and it does — the criteria ARE §5.5's objectives block,
            immediately above this one, and `signOffCriteria` derives from the
            same `frontmatter.objectives` that block prints.

            So they are pointed at, not reprinted. Rendering the list again here
            put the same three lines on screen twice inside 100px, which reads as
            a mistake rather than as thoroughness; and the count comes from the
            list itself, so the two can never disagree about how many there are.

            completion.css authors no class for these two sentences, so they take the
            same tokens directly. */}
        <p className="mb-1 text-meta text-on-surface-muted">
          {criteria.objectives.length > 0 && (
            <>
              Asserted against the{' '}
              <a className="bz-link" href="#hl-objectives-head">
                {criteria.objectives.length} objectives above
              </a>
              .{' '}
            </>
          )}
          {criteria.assertion}
        </p>

        {/* THE ACTION ROW `01` DRAWS: a 2px top rule, one primary button, at
            most one quiet one beside it, and a note. This is the language's
            `bz-actions` primitive, and stage 5 put the row and its two buttons
            in place; the completion behaviour inside it — the states, the
            drift notice, the identity prompt — is stage 7's to rebuild. */}
        <div className="bz-actions">
          {/* §12.16's `s` clicks this control by attribute, because the
              shortcut handler lives in the shell and has no page data in scope.
              The manifest's ninth column deliberately uses
              `data-hl-signoff-cell` instead, so 32 non-interactive squares on
              the index can never answer this selector and swallow the key. */}
          {/* M11 / D14 — COMPLETION CONTROL A, and `kia-context/specs/DESIGN.md`
              names this the canonical `button-primary`: cobalt, filled, with a
              check glyph. It is the only filled button on the page, which is
              what makes it the one thing a reader who has finished reading
              looks for. Sentence case, because a tracked-out all-caps label is
              the tell DESIGN.md refuses; the label was `COMPLETE`. */}
          <button
            type="button"
            className="bz-btn"
            {...{ [SIGN_OFF_ATTR]: slug }}
            aria-pressed={signedOff !== null}
            onClick={onToggle}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 8.5l3.5 3.5L13 5" />
            </svg>
            {signedOff === null ? 'Complete' : `Completed ${signedOff.slice(0, 10)}`}
          </button>
          {/* §12.4.1 — the un-complete control adjacent, and the toggle itself
              un-completes too: a pressed toggle whose click did nothing would
              be a control lying about what it is.

              It read `UNSIGN` until M11. That is the drawing-set vocabulary
              §9 retired — sign-off became Complete — and it survived the M9
              rename because the copy register matches on word boundaries and
              `UNSIGN` carries no hyphen for `sign-off` to be found inside. The
              keyboard sheet already printed "Complete or un-complete the
              current module", so the two now say the same word. */}
          {signedOff !== null && (
            <button
              type="button"
              className="bz-btn bz-btn-quiet"
              onClick={() => update((data) => unsign(data, slug), { kind: 'unsign', sheetSlug: slug })}
            >
              Un-complete
            </button>
          )}

          {/* `01`'s row holds one primary and AT MOST ONE quiet button, and on
              a module the reader has not finished the quiet slot is the
              mockup's `Requirements (n)`. Passed in rather than built here,
              because the relations are build-time facts and this component is
              a client island — the page hands over the finished disclosure. */}
          {beside}
        </div>

        {/* §12.4.3 — a completion claim that quietly became false. No LMS
            handles this. Not an error state and no caution colour: the module
            changing after you signed it is a fact, not something you did wrong.

            The line used to be written in capitals, because the class it
            carried applied `text-transform: uppercase` and pre-casing the
            string kept the two in step. The design language has no uppercase
            at all, so both went: the sentence is secondary prose in the `meta`
            size, and the two `normal-case` spans that existed only to protect
            the git hashes from the transform went with it — there is nothing
            left to protect them from. */}
        {drift !== null && signedOff !== null && (
          <p className="bz-signoff-drift">
            {`Completed ${signedOff.slice(0, 10)} against rev `}
            <span>{drift.signedAgainst}</span>
            {' · module now at rev '}
            <span>{drift.nowAt}</span>
          </p>
        )}

        {/* §12.1.4 — the in-memory record stays live, and the page says so
            rather than going on claiming a state storage refused to hold. A
            write silently thrown away while the page keeps claiming the state
            is the §1 failure in its purest form. */}
        {refused !== null && (
          <>
            <p className="bz-not-saved" role="alert">
              {`NOT SAVED · ${refused}`}
            </p>
            <p className="mt-1 text-meta text-on-surface-muted">
              The record is held in memory on this page only. Export it to a file to keep it.
            </p>
            {/* §12.1.4 — the safe path is the adjacent action, not a paragraph
                the reader has to act on somewhere else. */}
            <div className="bz-actions mt-2">
              <Link href="/profile/" className="bz-btn bz-no-print">
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
            <div className="bz-identity">
              {/* The seed was minted a moment ago by the click that opened
                  this, so the mark it draws is the reader's own from here on. */}
              <DrafterStamp mark={record.identity.mark} seed={record.identity.markSeed} />
              <label className="bz-field flex-1" data-invalid={nameError ? 'true' : 'false'}>
                <span className="bz-field-label">
                  Name or initials, as you would sign a drawing
                  {/* Optional in words, never by the absence of an asterisk. */}
                  <span className="bz-field-optional">Optional</span>
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
            <p className="bz-field-hint" id={hintId}>
              {NAME_SCOPE}
            </p>

            {nameError && (
              <p className="bz-field-error" id={errorId} role="alert">
                Enter the name to print on the report
              </p>
            )}

            <div className="bz-actions mt-2">
              <button type="submit" className="bz-btn">
                SAVE NAME
              </button>
              <button type="button" className="bz-btn" onClick={() => setPrompting(false)}>
                SKIP
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
