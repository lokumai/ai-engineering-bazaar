'use client'

import Link from 'next/link'
import { RolePicker } from '@/components/path/RolePicker'
import { MARKS, type MarkId } from '@/lib/identity/mark'
import { pathStanding } from '@/lib/path/derive'
import { drawnCount, pathFor } from '@/lib/path/paths'
import { roleById, type Role } from '@/lib/path/roles'
import { useHydrated, useRecord } from '@/lib/record/store'

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
 * **The suggested mark is an offer, and §16.2.1 moved where the offer is
 * drawn.** §13.6 was implemented here as `MarkOffer`: a second complete copy of
 * the eight-option picker, prefilled, with `SET THIS MARK` and `LEAVE THE MARK
 * AS IT IS` beneath it. §16.0 measured the result — the same control rendered
 * twice on `/profile/`, a few hundred pixels apart — and the offer is now one
 * `data-hl-offered` cell on the single shared row in the drafter block, with
 * `offeredMark` exported for the block above to pass down. §13.6's guarantee is
 * not weakened by that, it is strengthened: there is no longer a confirm step to
 * write anything, because an offer is a marking and the reader's own click on a
 * glyph is the only write. What stays here is `role.markRationale`, as one line
 * of prose — it was shipped as real text on purpose, so a reader can read the
 * reasoning and disagree with it, and a comment would have hidden it.
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
 * offer at all, which is the §11.25 outcome, instead of a row marked with a
 * glyph that cannot be drawn.
 *
 * Exported by §16.2.1: the offer is drawn on the drafter block's shared mark
 * row, so the resolution stays here — one boundary, next to the panel that owns
 * the role — and the id travels up as a prop rather than being resolved a second
 * time by whoever renders the row.
 */
export function offeredMark(role: Role): MarkId | null {
  const offered = MARKS.find((mark) => mark.id === role.suggestedMark)
  return offered === undefined ? null : offered.id
}

export function RolePanel() {
  const record = useRecord()

  const role = roleById(record.identity.role)

  return (
    <div className="grid gap-4">
      {role === undefined ? <RoleEmpty /> : <RoleStanding role={role} />}
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

  // The offer's label, resolved through `offeredMark` so the id is checked
  // against the mark set once, in the one place that does it (§11.25).
  const suggested = offeredMark(role)
  const offered = MARKS.find((mark) => mark.id === suggested)

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

      {/* §13.6, §16.2.1 — the reasoning behind the offered mark, kept as one
          line of reader-visible prose where the role is stated, and marked as an
          offer on the shared mark row rather than drawn again here. Nothing on
          this line is on record: an offer is a marking, and the only write is
          the reader's own click on a glyph. */}
      {offered !== undefined && (
        <p className="m-0 font-display text-meta leading-normal text-ink-muted">
          {`The mark offered for this role is ${offered.label}. ${role.markRationale} It is marked as the offer on the mark row above, and an offer writes nothing: the mark on record is whichever glyph is chosen there.`}
        </p>
      )}

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
