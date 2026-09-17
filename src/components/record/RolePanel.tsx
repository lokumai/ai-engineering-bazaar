'use client'

import { useMemo } from 'react'
import { RolePicker } from '@/components/path/RolePicker'
import { MARKS, type MarkId } from '@/lib/identity/mark'
import { drawnCount, pathFor } from '@/lib/path/paths'
import { roleById, type Role } from '@/lib/path/roles'
import { useRecord } from '@/lib/record/store'

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
const NO_ROLE = 'No role on record'

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

export interface RolePanelProps {
  /**
   * The slugs the corpus says are drawn, serialised down from `/profile/`.
   * `status: ready` lives in the markdown, only `lib/content/` can read it, and
   * this panel is a client island (§12.2).
   */
  drawnSlugs: readonly string[]
}

export function RolePanel({ drawnSlugs }: RolePanelProps) {
  const record = useRecord()

  const role = roleById(record.identity.role)

  return (
    <div className="grid gap-4">
      {role === undefined
        ? <RoleEmpty drawnSlugs={drawnSlugs} />
        : <RoleStanding role={role} drawnSlugs={drawnSlugs} />}
    </div>
  )
}

/**
 * §12.13's fifth empty state, added by §13.14 — record present, role absent.
 * It offers the picker and draws no path, because there is no path to draw.
 */
function RoleEmpty({ drawnSlugs }: { drawnSlugs: readonly string[] }) {
  /*
    `bz-path-empty` is what lets CHANNEL A settle this in frame one. React
    renders this branch whenever the record it can see has no role, and the
    record it can see before the store answers is the frozen empty one — so a
    reader who HAS chosen a role would meet "no role on record" for a frame.
    The negation chain in `progress.css` hides it unless `<html>` carries no
    `hl-role-<id>` at all, which the boot script decided before first paint;
    then the hydrated render replaces it with the standing. Two channels, one
    answer, and neither has to wait for the other.
  */
  return (
    <div className="bz-path-empty">
      <p className="text-mark m-0 text-on-surface-muted">{NO_ROLE}</p>

      <p className="m-0 text-meta leading-normal text-on-surface-muted">
        A role is never worked out from your name, from the modules you have
        completed, or from anything else this browser holds. It is on record
        only if you state it here, and it can be changed or removed at any time
        without touching a single completion.
      </p>

      <RolePicker drawnSlugs={drawnSlugs} />
    </div>
  )
}

/**
 * §13.4.2, §13.8 — the path's standing, in sheets.
 *
 * The denominator counts DRAWN steps only. Most of the sheets are drafts
 * holding a topic list and nothing else, and a draft sheet carries no sign-off
 * control at all (§12.4.1) — so counting one as something left to do would ask
 * the reader to finish a sheet nobody has written. The draft steps a path
 * carries are stated on their own line instead, as a roadmap, and never added
 * to the tally.
 *
 * The tally is framed to-go, and there is no percentage here or anywhere
 * (§11.35): counting in sheets is what lets both framings stay true at once.
 */
function RoleStanding({
  role,
  drawnSlugs,
}: {
  role: Role
  drawnSlugs: readonly string[]
}) {
  const drawnSet = useMemo(() => new Set(drawnSlugs), [drawnSlugs])

  // The offer's label, resolved through `offeredMark` so the id is checked
  // against the mark set once, in the one place that does it (§11.25).
  const suggested = offeredMark(role)
  const offered = MARKS.find((mark) => mark.id === suggested)

  const path = pathFor(role.id)
  const drawn = path === undefined ? null : drawnCount(path, drawnSet)
  const drafts = path === undefined || drawn === null ? null : path.steps.length - drawn

  return (
    <>
      {/* M14 — two rows left this list, and the reason is that the path's own
          steps are on this row now.
 
          `Completed on this path` and `To go` were here because `/path/` was a
          different page and this panel was a reader's only sight of the
          standing. Since M14 folded that route in, `PathStanding` sits directly
          above the ordered steps in this same row — one derivation
          (`pathStanding`), one live region, one place a reader reads it. Two
          renderings of one reading inside one row is the drift §16.4.2 exists
          to stop, and the one that survives is the one beside the steps it
          describes.

          `Steps planned` stays, because nothing else states it: it is the
          count `PathStanding`'s denominator deliberately leaves out (§13.4.2),
          and leaving it out silently is what would make the denominator look
          like the length of the list. */}
      <dl className="bz-defs">
        <dt>Role</dt>
        <dd>{role.label}</dd>

        <dt>Steps planned</dt>
        {/* Gated on `hydrated` nowhere: this is a count of the corpus, true for
            every reader in every frame, and dashing it would refuse a number
            somebody did measure (§11.25). */}
        <dd>{drafts === null ? NO_READING : String(drafts)}</dd>
      </dl>

      <p className="m-0 text-meta leading-normal text-on-surface">{role.blurb}</p>

      {/* §13.6, §16.2.1 — the reasoning behind the offered mark, kept as one
          line of reader-visible prose where the role is stated, and marked as an
          offer on the shared mark row rather than ready again here. Nothing on
          this line is on record: an offer is a marking, and the only write is
          the reader's own click on a glyph. */}
      {offered !== undefined && (
        <p className="m-0 text-meta leading-normal text-on-surface-muted">
          {`The mark offered for this role is ${offered.label}. ${role.markRationale} It is marked as the offer on the mark row above, and an offer writes nothing: the mark on record is whichever glyph is chosen there.`}
        </p>
      )}

      {/* §13.4.2 — stated where the two numbers sit, so the denominator cannot
          be misread as the length of the list. */}
      {/* M14 — the ordered steps used to be a link to `/path/` from here. They
          are in this same register row now, immediately below the picker, so
          the link would have pointed at the page it is already on. */}
      <p className="m-0 text-meta leading-normal text-on-surface-muted">
        The tally counts modules that are ready. Steps pointing at a module nobody
        has written yet are on the path as a roadmap and are left out of it,
        because a module with no content has nothing to complete.
      </p>

      {/* §13.3 — no dialog, and the summary says why there is none. A reader
          who has to be warned about a control will not use it. */}
      <details>
        <summary className="bz-btn bz-btn-quiet">
          Another role
        </summary>

        <p className="mt-2 mb-2 text-meta leading-normal text-on-surface-muted">
          Changing the role changes which modules the path recommends and in what
          order. It changes nothing that is on record: completions are recorded
          against modules, so every one of them survives, and choosing this role
          again brings this path back exactly as it stands now.
        </p>

        <RolePicker drawnSlugs={drawnSlugs} />
      </details>
    </>
  )
}
