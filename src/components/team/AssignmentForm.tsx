'use client'

import { useCallback, useEffect, useState } from 'react'
import type { CurriculumFacts } from '@/lib/record/derive'
import {
  assembleTeam,
  memberLabel,
  panelStateCopy,
  validateAssignment,
  MAX_ASSIGNMENT_NOTE,
  MAX_ASSIGNMENT_TITLE,
  type AssignmentDraft,
  type AssignmentProblem,
  type PanelState,
} from '@/lib/org/types'
import {
  createAssignment,
  loadManagedOrgs,
  loadTeamSnapshot,
  type TeamSnapshot,
} from '@/lib/org/queries'
import { viewFromSession } from '@/lib/auth/session'
import { supabaseBrowser } from '@/lib/supabase/client'
import { supabaseEnv } from '@/lib/supabase/env'

/**
 * §14.2.4, §14.8 — `/team/assignments/`: create an assignment.
 *
 * Four things go in and one row plus two child rows come out: a title, a note, a
 * due date, and which sheets. Then, optionally, who — and the default is the
 * one that matters, because **an empty target set means the whole organisation**
 * (§14.2.4). The form says that on the control rather than leaving it to be
 * discovered: read as "nobody", an org-wide assignment would produce no
 * `overdue` flag at all and the panel would report a clean team on the day
 * everybody missed the deadline.
 *
 * **Every decision is in `types.ts`.** `validateAssignment` decides whether a
 * draft may be written, `dueInstant` decides what `2026-09-01` means as an
 * instant, and both are pure and tested in node (§12.14.2). This component
 * holds form state and prints messages; it settles nothing, which is why a
 * change to what an assignment may contain is a change to one tested function
 * and not to JSX.
 *
 * **The write is not transactional and cannot be**, because §14.0/8 rules out
 * functions and RPC. `createAssignment` therefore mints the id here, writes
 * with `on conflict do nothing`, and removes its own parent row if a child
 * insert fails; see its comment. That is why the button is disabled while a
 * write is in flight — a second click would be a second assignment, and
 * idempotency protects a RETRY of the same id, not a new one.
 */

/** §14.8's own route table calls this page `atama oluştur / son tarih / kapsam`. */
const PROBLEM_COPY: Readonly<Record<AssignmentProblem, string>> = {
  noOrg: 'Choose the organisation this assignment belongs to.',
  noTitle: 'The assignment needs a title. It is what a member will see first.',
  longTitle: `The title is longer than ${MAX_ASSIGNMENT_TITLE} characters.`,
  noSheets:
    'Select at least one sheet. An assignment with no sheets has no deadline '
    + 'anything can be measured against, so it would produce no signal at all.',
  badDueDate: 'The due date is not a real calendar date.',
}

const EMPTY_DRAFT: AssignmentDraft = {
  orgId: '',
  title: '',
  note: '',
  dueDate: '',
  sheets: [],
  targets: [],
}

/** What the form is doing, as distinct from what the page knows. */
type Write =
  | { kind: 'idle' }
  | { kind: 'writing' }
  | { kind: 'written'; title: string }
  | { kind: 'failed'; message: string }

/**
 * `record.css`'s `.hl-field input` rules, as utilities, for the two controls it
 * does not reach.
 *
 * `.hl-field` styles `input` and nothing else, so a `<select>` and a
 * `<textarea>` inside one would render as unstyled browser widgets in the
 * middle of a technical drawing. The right fix is one more selector in
 * `record.css`; this file may not touch it (another agent owns that surface in
 * this change), so the rules are restated here against the SAME custom
 * properties — never a hardcoded colour — and the duplication is named so it
 * can be deleted the moment `.hl-field :is(input, select, textarea)` exists.
 * Reported to the orchestrator.
 */
const FIELD_CONTROL =
  'block w-full rounded-none border border-line-strong bg-sunken px-2.5 '
  + 'font-display text-ui text-ink hover:border-line-cut'

function toggle(list: readonly string[], value: string): string[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]
}

export function AssignmentForm({ facts }: { facts: CurriculumFacts }) {
  const [state, setState] = useState<PanelState<TeamSnapshot>>({ kind: 'loading' })
  const [draft, setDraft] = useState<AssignmentDraft>(EMPTY_DRAFT)
  const [write, setWrite] = useState<Write>({ kind: 'idle' })
  // Problems are shown on SUBMIT, not while typing (§12.3.3's rule for the
  // record's own fields): validating a title on the first keystroke tells the
  // reader they are wrong before they have finished being right.
  const [problems, setProblems] = useState<readonly AssignmentProblem[]>([])

  const load = useCallback(async (): Promise<void> => {
    const env = supabaseEnv()
    if (env.kind !== 'ready') {
      setState({ kind: 'unconfigured', why: env.why })
      return
    }
    const client = supabaseBrowser()
    if (client === null) {
      setState({ kind: 'failed', message: 'No Supabase client in this browser.' })
      return
    }
    try {
      // One definition of a usable session, shared with every other panel
      // (§14.8.2's `session.ts`); see the note in `TeamTable`.
      const { data } = await client.auth.getSession()
      if (viewFromSession(data.session, Date.now()).status !== 'signedIn') {
        setState({ kind: 'signedOut' })
        return
      }
      const orgs = await loadManagedOrgs(client)
      if (orgs.length === 0) {
        setState({ kind: 'notManager' })
        return
      }
      const snapshot = await loadTeamSnapshot(client, orgs, new Date().toISOString())
      setState({ kind: 'ready', value: snapshot })
      // One managed org is the common case, so it is preselected rather than
      // offered as a choice of one. With several, nothing is chosen for the
      // manager: an assignment written to the wrong org is not recoverable from
      // this screen.
      setDraft((current) =>
        current.orgId === '' && orgs.length === 1 && orgs[0] !== undefined
          ? { ...current, orgId: orgs[0].id }
          : current,
      )
    } catch (error) {
      setState({
        kind: 'failed',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (state.kind !== 'ready') {
    const copy = panelStateCopy(state)
    return (
      <section className="hl-panel" aria-labelledby="hl-assign-state">
        <div className="hl-panel-head">
          <h2 id="hl-assign-state" className="hl-panel-title">
            New assignment
          </h2>
          <p className="hl-mark m-0 text-ink-faint">{copy.status}</p>
        </div>
        <p
          className="m-0 max-w-[var(--width-prose)] font-display text-meta leading-normal text-ink-muted"
          role="status"
        >
          {copy.detail}
        </p>
      </section>
    )
  }

  const snapshot = state.value
  const members = assembleTeam({
    memberships: snapshot.memberships,
    profiles: snapshot.profiles,
    records: snapshot.records,
    logs: snapshot.logs,
  })
  const inOrg = members.filter((member) => member.orgIds.includes(draft.orgId))

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const found = validateAssignment(draft)
    setProblems(found)
    if (found.length > 0) return

    const client = supabaseBrowser()
    if (client === null) {
      setWrite({ kind: 'failed', message: 'No Supabase client in this browser.' })
      return
    }

    setWrite({ kind: 'writing' })
    try {
      const { data } = await client.auth.getSession()
      const view = viewFromSession(data.session, Date.now())
      if (view.status !== 'signedIn') {
        // The session can end between load and submit. Saying so is the only
        // honest outcome; a retry after signing in writes the same draft.
        setWrite({ kind: 'failed', message: 'Your session ended before this was written.' })
        return
      }
      // §14.2.3's pattern: the id is minted by the client, so the upsert is
      // idempotent and a retried write cannot produce a second assignment.
      await createAssignment(client, {
        id: crypto.randomUUID(),
        createdBy: view.user.id,
        draft,
      })
      setWrite({ kind: 'written', title: draft.title.trim() })
      setDraft({ ...EMPTY_DRAFT, orgId: draft.orgId })
      // Re-read rather than patching local state: the list below then shows what
      // the server actually holds, which is the only thing worth showing after a
      // write that had no transaction around it.
      await load()
    } catch (error) {
      setWrite({
        kind: 'failed',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const sheets = [...facts.sheets].sort((a, b) => a.module - b.module)

  return (
    <>
      <section className="hl-panel" aria-labelledby="hl-assign-new">
        <div className="hl-panel-head">
          <h2 id="hl-assign-new" className="hl-panel-title">
            New assignment
          </h2>
          <p className="hl-mark m-0 text-ink-faint">
            {draft.targets.length === 0 ? 'SCOPE — WHOLE ORGANISATION' : `SCOPE — ${draft.targets.length} NAMED`}
          </p>
        </div>

        {/* `noValidate`: the UA's own bubbles say "Please fill in this field",
            and §12.14.1 bans "please" from this site's copy, including copy the
            browser writes on its behalf. */}
        <form onSubmit={(event) => void onSubmit(event)} noValidate>
          {snapshot.orgs.length > 1 && (
            <label className="hl-field" data-invalid={problems.includes('noOrg') ? 'true' : 'false'}>
              <span className="hl-field-label">Organisation</span>
              <select
                className={`${FIELD_CONTROL} h-9`}
                value={draft.orgId}
                onChange={(event) => setDraft({ ...draft, orgId: event.target.value, targets: [] })}
              >
                <option value="">—</option>
                {snapshot.orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label
            className="hl-field mt-4"
            data-invalid={
              problems.includes('noTitle') || problems.includes('longTitle') ? 'true' : 'false'
            }
          >
            <span className="hl-field-label">Title</span>
            <input
              type="text"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              autoComplete="off"
              maxLength={MAX_ASSIGNMENT_TITLE}
            />
          </label>

          <label className="hl-field mt-4">
            <span className="hl-field-label">
              Note
              <span className="hl-field-optional">Optional</span>
            </span>
            <textarea
              className={`${FIELD_CONTROL} py-2`}
              value={draft.note}
              rows={3}
              maxLength={MAX_ASSIGNMENT_NOTE}
              onChange={(event) => setDraft({ ...draft, note: event.target.value })}
            />
          </label>

          <label
            className="hl-field mt-4"
            data-invalid={problems.includes('badDueDate') ? 'true' : 'false'}
          >
            <span className="hl-field-label">
              Due date
              <span className="hl-field-optional">Optional</span>
            </span>
            <input
              type="date"
              value={draft.dueDate}
              onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })}
            />
          </label>
          {/* The deadline's meaning, stated where it is typed. §14.8.1 calls a
              deadline missed only when it is strictly past, so a sheet assigned
              for the 1st starts asking for attention during the 2nd. */}
          <span className="hl-field-hint block">
            Stored as the start of that day, UTC. A sheet is flagged overdue from
            the first day after it.
          </span>

          {/* ---- which sheets ------------------------------------------------ */}
          <fieldset
            className="mt-6 border-0 p-0"
            data-invalid={problems.includes('noSheets') ? 'true' : 'false'}
          >
            <legend className="hl-mark p-0 text-ink">
              {`SHEETS — ${draft.sheets.length} SELECTED`}
            </legend>
            <div className="mt-2 max-h-72 overflow-y-auto border border-line-strong p-3">
              {sheets.map((sheet) => (
                <label key={sheet.slug} className="hl-check">
                  <input
                    type="checkbox"
                    checked={draft.sheets.includes(sheet.slug)}
                    onChange={() => setDraft({ ...draft, sheets: toggle(draft.sheets, sheet.slug) })}
                  />
                  <span className="hl-check-label">
                    <span className="hl-mark text-ink-muted">
                      {`SHEET ${String(sheet.module).padStart(2, '0')} `}
                    </span>
                    {sheet.slug}
                    {/* §4.8's hidden line in words: a sheet nobody has drawn
                        carries no sign-off control at all (§12.4.1), so
                        assigning it would create a deadline that can never be
                        met. It is offered — the corpus changes — and labelled. */}
                    {!sheet.drawn && (
                      <span className="hl-mark text-ink-muted"> · NOT DRAWN</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* ---- who ------------------------------------------------------- */}
          <fieldset className="mt-6 border-0 p-0">
            <legend className="hl-mark p-0 text-ink">WHO</legend>
            <p className="m-0 mb-2 max-w-[var(--width-prose)] font-display text-meta leading-normal text-ink-muted">
              Select nobody and the assignment applies to the whole organisation,
              including anyone who joins later (§14.2.4). Naming people limits it
              to exactly those accounts.
            </p>
            {inOrg.length === 0 ? (
              <p className="hl-mark m-0 text-ink-muted">
                NO MEMBERS TO NAME — THE ASSIGNMENT WILL APPLY TO THE WHOLE ORGANISATION
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto border border-line-strong p-3">
                {inOrg.map((member) => (
                  <label key={member.userId} className="hl-check">
                    <input
                      type="checkbox"
                      checked={draft.targets.includes(member.userId)}
                      onChange={() =>
                        setDraft({ ...draft, targets: toggle(draft.targets, member.userId) })
                      }
                    />
                    <span className="hl-check-label">{memberLabel(member)}</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          {problems.length > 0 && (
            <ul className="hl-field-error mt-4 list-none p-0" role="alert">
              {problems.map((problem) => (
                <li key={problem}>{PROBLEM_COPY[problem]}</li>
              ))}
            </ul>
          )}

          <div className="hl-signoff-actions mt-6">
            <button type="submit" className="hl-btn" disabled={write.kind === 'writing'}>
              {write.kind === 'writing' ? 'WRITING…' : 'CREATE ASSIGNMENT'}
            </button>
          </div>

          {/* The outcome, in its own live region. A write is the one thing on
              this page the reader caused, so a failure is an `alert` and a
              success is a `status` (§12.13's split). */}
          {write.kind === 'written' && (
            <p className="hl-mark m-0 mt-3" role="status">
              {`WRITTEN — ${write.title}`}
            </p>
          )}
          {write.kind === 'failed' && (
            <p className="hl-field-error m-0 mt-3" role="alert">
              {write.message}
            </p>
          )}
        </form>
      </section>

      {/* ---- what already exists ------------------------------------------- */}
      <section className="hl-panel" aria-labelledby="hl-assign-existing">
        <div className="hl-panel-head">
          <h2 id="hl-assign-existing" className="hl-panel-title">
            Existing assignments
          </h2>
          <p className="hl-mark m-0 text-ink-faint">
            {snapshot.orgs.map((org) => org.name).join(' · ')}
          </p>
        </div>

        {snapshot.assignments.length === 0 ? (
          <p className="hl-mark m-0 text-ink-muted" role="status">
            NONE
          </p>
        ) : (
          <ul className="m-0 list-none p-0">
            {snapshot.assignments.map((assignment) => (
              <li key={assignment.id} className="border-b border-line py-3 last:border-b-0">
                <p className="hl-mark m-0">
                  {assignment.title}
                  {' · '}
                  {assignment.dueAt === null ? 'NO DEADLINE' : `DUE ${assignment.dueAt.slice(0, 10)}`}
                  {' · '}
                  {`${assignment.sheets.length} SHEETS`}
                  {' · '}
                  {assignment.targets.length === 0
                    ? 'WHOLE ORGANISATION'
                    : `${assignment.targets.length} NAMED`}
                </p>
                {assignment.note !== null && (
                  <p className="m-0 mt-1 max-w-[var(--width-prose)] font-display text-meta leading-normal text-ink-muted">
                    {assignment.note}
                  </p>
                )}
                <p className="hl-mark m-0 mt-1 text-ink-faint">
                  {assignment.sheets.join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
