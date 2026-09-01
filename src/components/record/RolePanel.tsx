'use client'

import { useState } from 'react'
import Link from 'next/link'
import { RolePicker } from '@/components/path/RolePicker'
import { MARKS, type MarkId } from '@/lib/identity/mark'
import { pathStanding } from '@/lib/path/derive'
import { drawnCount, pathFor } from '@/lib/path/paths'
import { roleById, type Role } from '@/lib/path/roles'
import { setIdentity } from '@/lib/record/events'
import { nowIso, update, useHydrated, useRecord } from '@/lib/record/store'
import { DrafterStamp } from './DrafterStamp'

/**
 * §13.3, §13.6 — the role the reader has stated, the standing of the path that
 * role names, and the mark that role OFFERS.
 *
 * **A role is a statement the reader makes, never a guess this site makes**
 * (§13.3). There is no function anywhere in `lib/path/` that reads a record and
 * returns a role, and this panel adds none: with nothing on record it prints
 * `NO ROLE ON RECORD` and hands over the picker. Inferring a job title from a
 * name, or from which sheets have been signed off, and then printing it back is
 * exactly the class of claim §1 forbids — and it would be printed on the one
 * page whose whole subject is what the record actually holds.
 *
 * **Changing the role is not destructive and gets no confirmation** (§13.3). A
 * path is a view over the corpus, not a container: sign-offs are recorded
 * against sheets, so switching from QA to DevOps loses nothing and the old path
 * is redrawn by choosing the old role again. §12's SC 3.3.4 gate is for
 * destructive acts, and a dialog here would teach the reader that this control
 * costs something.
 *
 * **The suggested mark is an offer, and the offer is the whole of §13.6.** A
 * role names a drafting symbol that suits the work, the picker below is
 * PREFILLED with it and states why, and nothing reaches the record until the
 * reader confirms. A silent write would leave the record claiming a choice the
 * reader never made, one panel above the readout that prints it — §1's failure
 * with the evidence against it on the same screen.
 *
 * §12.2 channel B throughout: every value here is text or a computed count, so
 * none of it can travel on the pre-paint script. `useRecord()` returns the
 * frozen `EMPTY_RECORD` on the server and in the first client render, whose
 * `role` is null, so the prerendered panel is the empty state — the only thing
 * build-time HTML can truthfully say about a reader it has never met — and the
 * role arrives after the hydration commit. `hl-role-<id>` on `<html>` is
 * channel A's copy of the same fact, and it draws `/path/`; it is deliberately
 * not read here, because a class cannot carry a tally.
 *
 * What this panel deliberately does not do: it does not draw the path's steps
 * (that is `/path/`, and duplicating it here would put two renderings of one
 * ordered list on the site), and it does not write a mark by itself.
 */

/** §13.3 — the absence is the information. Never a placeholder occupation. */
const NO_ROLE = 'NO ROLE ON RECORD'

/** The instrument convention for "no reading", and it is true. */
const NO_READING = '--'

/**
 * §13.6 — the offered id, resolved against the mark set that actually exists
 * rather than trusted. `Role.suggestedMark` is typed `string` because
 * `lib/path/roles.ts` imports nothing (§12.2), so this is the boundary where it
 * becomes a `MarkId` or becomes nothing: an id no mark answers to yields no
 * offer at all, which is the §11.25 outcome, instead of a picker prefilled with
 * a glyph that cannot be drawn.
 */
function offeredMark(role: Role): MarkId | null {
  const offered = MARKS.find((mark) => mark.id === role.suggestedMark)
  return offered === undefined ? null : offered.id
}

export function RolePanel() {
  const record = useRecord()
  const hydrated = useHydrated()

  const role = roleById(record.identity.role)

  return (
    <div className="grid gap-4">
      {role === undefined ? <RoleEmpty /> : <RoleStanding role={role} />}

      {/* §13.6 — rendered only where it can be an offer: a role on record and
          no mark chosen. It is the last thing in the panel because it follows
          from the choice above it. */}
      {role !== undefined && record.identity.mark === null && hydrated && (
        <MarkOffer role={role} />
      )}
    </div>
  )
}

/**
 * §12.13's fifth empty state, added by §13.14 — record present, role absent.
 * It offers the picker and draws no path, because there is no path to draw.
 */
function RoleEmpty() {
  return (
    <>
      <p className="hl-mark m-0 text-ink-muted">{NO_ROLE}</p>

      <p className="m-0 font-display text-meta leading-normal text-ink-muted">
        A role is never worked out from your name, from the sheets you have
        signed off, or from anything else this browser holds. It is on record
        only if you state it here, and it can be changed or removed at any time
        without touching a single sign-off.
      </p>

      <RolePicker />
    </>
  )
}

/**
 * §13.4.2, §13.8 — the path's standing, in sheets.
 *
 * The denominator counts DRAWN steps only. 17 of the 32 sheets are drafts
 * holding a topic list and nothing else, and a draft sheet carries no sign-off
 * control at all (§12.4.1) — so counting one as something left to do would ask
 * the reader to finish a sheet nobody has written. The draft steps a path
 * carries are stated on their own line instead, as a roadmap, and never added
 * to the tally.
 *
 * The tally is framed to-go, and there is no percentage here or anywhere
 * (§11.35): counting in sheets is what lets both framings stay true at once.
 */
function RoleStanding({ role }: { role: Role }) {
  const record = useRecord()
  const hydrated = useHydrated()

  const path = pathFor(role.id)
  const drawn = path === undefined ? null : drawnCount(path)
  const standing = path === undefined ? null : pathStanding(path, record)
  const drafts = path === undefined || drawn === null ? null : path.steps.length - drawn

  return (
    <>
      <dl className="hl-defs">
        <dt>Role</dt>
        <dd>{role.label}</dd>

        <dt>Signed off on this path</dt>
        <dd>
          {/* Gated on `hydrated` even though a role on record implies the store
              has answered: the gate is what tells "nothing recorded" from "not
              yet read", and only one of those is a fact about the reader. */}
          {hydrated && standing !== null && drawn !== null
            ? `${standing.signed} OF ${drawn}`
            : NO_READING}
        </dd>

        <dt>To go</dt>
        <dd>{hydrated && standing !== null ? String(standing.remaining) : NO_READING}</dd>

        <dt>Steps not yet drawn</dt>
        <dd>{drafts === null ? NO_READING : String(drafts)}</dd>
      </dl>

      <p className="m-0 font-display text-meta leading-normal text-ink">{role.blurb}</p>

      {/* §13.4.2 — stated where the two numbers sit, so the denominator cannot
          be misread as the length of the list. */}
      <p className="m-0 font-display text-meta leading-normal text-ink-muted">
        The tally counts sheets that are drawn. Steps pointing at a sheet nobody
        has written yet are on the path as a roadmap and are left out of it,
        because a sheet with no content has nothing to sign off.
      </p>

      <p className="m-0 font-display text-ui leading-normal">
        <Link href="/path/" className="hl-link">
          The steps on this path, in order
        </Link>
      </p>

      {/* §13.3 — no dialog, and the summary says why there is none. A reader
          who has to be warned about a control will not use it. */}
      <details>
        <summary className="cursor-pointer font-mono text-mark uppercase tracking-[0.06em] text-ink-muted">
          Another role
        </summary>

        <p className="mt-2 mb-2 font-display text-meta leading-normal text-ink-muted">
          Changing the role changes which sheets the path recommends and in what
          order. It changes nothing that is on record: sign-offs are recorded
          against sheets, so every one of them survives, and choosing this role
          again brings this path back exactly as it stands now.
        </p>

        <RolePicker />
      </details>
    </>
  )
}

/**
 * §13.6 — the mark the role offers: prefilled, visible, changeable, and written
 * only when the reader confirms.
 *
 * The role names a drafting symbol because the symbol means something about the
 * work — `weld` joins two things so the joint carries load, `finish` says a
 * surface was inspected — and `markRationale` is shipped as real text rather
 * than left in a comment so the reader can read the reasoning and disagree with
 * it. The prefill is a local `useState` seeded from the role, so the record is
 * untouched until `SET THIS MARK`, and `LEAVE THE MARK AS IT IS` writes nothing
 * at all.
 *
 * **Confirming the seeded option settles the offer without writing anything,
 * and that is correct rather than a shortcut.** §12.1.3 stores the seeded
 * pattern as `mark: null` — "use `markSeed`" — so "seeded" and "nothing chosen"
 * are the same stored value by design, and two of the nine roles offer exactly
 * that. `setIdentity` is still called for the audit trail every other write
 * gets, and the offer then stands down for this visit rather than reappearing
 * to ask a question the reader has answered.
 */
function MarkOffer({ role }: { role: Role }) {
  const record = useRecord()
  const suggested = offeredMark(role)

  const [choice, setChoice] = useState<MarkId | null>(null)
  const [settled, setSettled] = useState(false)

  if (suggested === null || settled) return null

  // The prefill: the role's own offer until the reader picks something else.
  const selected: MarkId = choice ?? suggested

  function confirm(): void {
    update(
      (data) => setIdentity(data, { mark: selected === 'seeded' ? null : selected }, nowIso()),
      { kind: 'setIdentity', payload: { mark: selected === 'seeded' ? null : selected } },
    )
    setSettled(true)
  }

  return (
    <div className="border border-line-strong bg-cleared p-3">
      <p className="hl-mark m-0 text-ink">NO MARK CHOSEN</p>

      <p className="mt-1 mb-0 font-display text-meta leading-normal text-ink-muted">
        {`This mark is the one offered to a ${role.label}. ${role.markRationale}`}
      </p>

      <fieldset
        role="radiogroup"
        aria-labelledby="hl-role-mark-legend"
        className="mt-3 mb-0 border-0 p-0"
      >
        <legend id="hl-role-mark-legend" className="hl-field-label">
          Approval mark offered for this role
        </legend>

        <div className="grid gap-2 sm:grid-cols-2">
          {MARKS.map((option) => {
            const descriptionId = `hl-role-mark-${option.id}-desc`
            // The seeded option draws the minted pattern; a named one draws its
            // glyph, which needs no seed at all.
            const mark = option.id === 'seeded' ? null : option.id
            return (
              <div
                key={option.id}
                className="border border-line-strong bg-paper p-3"
                data-hl-mark={option.id}
                data-hl-selected={selected === option.id ? 'true' : 'false'}
                data-hl-offered={option.id === suggested ? 'true' : 'false'}
              >
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="hl-role-mark"
                    value={option.id}
                    checked={selected === option.id}
                    onChange={() => setChoice(option.id)}
                    aria-describedby={descriptionId}
                    // Native appearance, accent through `accent-color`, for the
                    // reason `MarkPicker` records: a hand-painted box carries
                    // its checked state in a shadow, and forced-colors deletes
                    // every shadow on the page.
                    style={{ accentColor: 'var(--color-accent)' }}
                    className="h-[14px] w-[14px] shrink-0"
                  />
                  <DrafterStamp mark={mark} seed={record.identity.markSeed} />
                  <span className="hl-mark text-ink">{option.label}</span>
                </label>
                <p
                  id={descriptionId}
                  className="mt-1 mb-0 font-display text-meta leading-normal text-ink-muted"
                >
                  {option.description}
                </p>
                {option.id === suggested && (
                  <p className="hl-mark m-0 mt-1 text-ink-muted">OFFERED FOR THIS ROLE</p>
                )}
              </div>
            )
          })}
        </div>
      </fieldset>

      <div className="hl-signoff-actions mt-3">
        <button type="button" className="hl-btn" onClick={confirm}>
          SET THIS MARK
        </button>
        <button type="button" className="hl-btn" onClick={() => setSettled(true)}>
          LEAVE THE MARK AS IT IS
        </button>
      </div>

      {/* §13.6 — the state of the offer, stated. Nothing above this line has
          reached the record. */}
      <p className="mt-2 mb-0 font-display text-meta leading-normal text-ink-muted">
        Nothing here is on record until you set it. The mark can be changed
        afterwards in the identity panel above, and changing it does not change
        the dates sheets were signed off on.
      </p>
    </div>
  )
}
