'use client'

import { selectAttention } from '@/lib/record/attention'
import type { CurriculumFacts } from '@/lib/record/derive'
import { buildProgress } from '@/lib/record/progress'
import {
  assignedSheetsFor,
  attentionReason,
  memberLabel,
  sheetClaimRows,
  type QuizEvidence,
  type SheetClaimRow,
  type SubmittalEvidence,
  type TeamMember,
} from '@/lib/org/types'
import type { TeamSnapshot } from '@/lib/org/queries'

/**
 * §14.8 — `/team/?u=<uuid>`, which is a PANEL and not a route.
 *
 * §14.8's static-export note is the whole reason: *"`generateStaticParams` runs
 * at build time, users exist only after it, so a `/team/[user]/` route cannot be
 * generated; the person detail is resolved with a query parameter."* This
 * component is that resolution — the same page, the same already-answered
 * query, one more panel below the table.
 *
 * It is where §14.8.2's two columns are printed at full width, one row per
 * sign-off. The roster above summarises them; this is the thing a manager
 * actually reads before speaking to somebody, so every row carries the evidence
 * that produced its verdict: the sheet, the date claimed, the revision claimed
 * against, the quiz outcome, and — where they disagree with
 * `profiles.github_login` — the repository owners as they were registered.
 *
 * Nothing here recomputes anything. `buildProgress` and `selectAttention` are
 * the same two calls the roster row made and the reader's own sheet makes
 * (§14.9), and `sheetClaimRows` is called once per render with the same
 * arguments, so the summary above and the table below cannot disagree.
 */

/** SHEET 300 + CLAIM 230 + QUIZ 200 + SUBMITTAL 330 = `.hl-index`'s 1060px. */
const COLUMNS: ReadonlyArray<{ key: string; label: string; width: number }> = [
  { key: 'sheet', label: 'Sheet', width: 300 },
  { key: 'claim', label: 'Claim', width: 230 },
  { key: 'quiz', label: 'Evidence · quiz', width: 200 },
  { key: 'submittal', label: 'Evidence · submittal', width: 330 },
]

/**
 * §12.6 — the quiz outcome in words.
 *
 * `NOT ASSESSED` and `NO ANSWER` are separate because they are separate facts:
 * one reader wrote an answer and never revealed the sheet's summary, the other
 * never answered. Both are legitimate; neither is a failure; and reporting them
 * as one would be the panel asserting something nobody established.
 */
function quizWords(quiz: QuizEvidence): { text: string; muted: boolean } {
  switch (quiz) {
    case 'matched':
      return { text: 'MATCHED', muted: false }
    case 'missed':
      return { text: 'MISSED', muted: false }
    case 'unassessed':
      return { text: 'ANSWERED, NOT ASSESSED', muted: true }
    case 'none':
      return { text: 'NO ANSWER', muted: true }
  }
}

/**
 * §14.8.2 — the submittal verdict in words, with the reason available beside it.
 *
 * `OWNER MISMATCH` is the loudest thing this panel says about a person, so it is
 * never printed alone: `SubmittalRow` puts the registered owners and the
 * profile's own login next to it, which is what turns a flag into something a
 * manager can examine and, if it is wrong, dismiss. §12.4.4 is untouched —
 * nothing is gated, and the sign-off stands as the reader's assertion either
 * way.
 */
function submittalWords(evidence: SubmittalEvidence): { text: string; muted: boolean } {
  switch (evidence) {
    case 'verified':
      return { text: 'VERIFIED', muted: false }
    case 'ownerMismatch':
      return { text: 'OWNER MISMATCH', muted: false }
    case 'unattributable':
      return { text: 'NO GITHUB LINK ON PROFILE', muted: true }
    case 'none':
      return { text: 'NONE REGISTERED', muted: true }
  }
}

/** Sliced, never localised — `report.ts`'s rule, for its reason. */
function day(instant: string | null): string {
  return instant === null || instant === '' ? '—' : instant.slice(0, 10)
}

function ClaimRow({ row, login }: { row: SheetClaimRow; login: string | null }) {
  const quiz = quizWords(row.quiz)
  const submittal = submittalWords(row.submittal)

  return (
    <tr className="hl-row">
      <th scope="row" className="hl-row-title">
        <span className="hl-mark block text-ink-muted">
          {row.module === null ? 'NOT IN THIS CORPUS' : `SHEET ${String(row.module).padStart(2, '0')}`}
        </span>
        {row.slug}
      </th>

      {/* §14.8.2 — THE CLAIM: an instant the reader asserted, and the revision
          they asserted it against (§12.4.3). Never a tick. */}
      <td className="hl-row-context hl-mark">
        {`SIGNED OFF ${day(row.signedOff)}`}
        <span className="block text-ink-muted">
          {row.signedRevision === null ? 'NO REV RECORDED' : `REV ${row.signedRevision}`}
        </span>
      </td>

      <td className={`hl-row-context hl-mark${quiz.muted ? ' text-ink-muted' : ''}`}>
        {quiz.text}
      </td>

      <td className="hl-row-context hl-mark">
        <span className={submittal.muted ? 'text-ink-muted' : undefined}>{submittal.text}</span>
        {/* The reason, always — §14.8's rule that a flag is never a bare glyph.
            The owners are printed as recorded, so a manager can see that
            `torvalds` is not the person in front of them. */}
        {row.submittalOwners.length > 0 && (
          <span className="block text-ink-muted">
            {`OWNER ${row.submittalOwners.join(', ')}`}
            {row.submittal === 'ownerMismatch' && login !== null && ` · GITHUB ${login}`}
          </span>
        )}
      </td>
    </tr>
  )
}

export function PersonDetail({
  member,
  facts,
  snapshot,
  onClose,
}: {
  member: TeamMember
  facts: CurriculumFacts
  snapshot: TeamSnapshot
  onClose: () => void
}) {
  const label = memberLabel(member)
  const login = member.profile?.githubLogin ?? null
  const headId = 'hl-team-person'

  const assigned = assignedSheetsFor(snapshot.assignments, member.userId, member.orgIds)
  const assignments = snapshot.assignments.filter(
    (assignment) =>
      member.orgIds.includes(assignment.orgId)
      && (assignment.targets.length === 0 || assignment.targets.includes(member.userId)),
  )

  return (
    <section className="hl-panel" aria-labelledby={headId}>
      <div className="hl-panel-head">
        <h2 id={headId} className="hl-panel-title">
          {label}
        </h2>
        <button type="button" className="hl-btn hl-no-print" onClick={onClose}>
          CLOSE
        </button>
      </div>

      {/* The identifying facts, in the title-block idiom: label on the left,
          value on the right, no invented values. The uuid in full, because this
          panel is where it is the thing that matters — `?u=` carries it and a
          manager may need to quote it. */}
      <dl className="hl-mark m-0 mb-5 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1">
        <dt className="text-ink-muted">USER</dt>
        <dd className="m-0">{member.userId}</dd>
        <dt className="text-ink-muted">GITHUB</dt>
        <dd className="m-0">
          {login === null ? <span className="text-ink-muted">NOT LINKED</span> : login}
        </dd>
        <dt className="text-ink-muted">ROLE</dt>
        <dd className="m-0">
          {/* §13.3 — the reader's own statement, never inferred. Absent stays
              absent. */}
          {member.profile?.roleId ?? <span className="text-ink-muted">NOT STATED</span>}
        </dd>
        <dt className="text-ink-muted">SERVER COPY</dt>
        <dd className="m-0">
          {member.record.kind === 'record' ? (
            `SAVED ${day(member.record.savedAt)} · SCHEMA ${member.record.schema}`
          ) : member.record.kind === 'absent' ? (
            <span className="text-ink-muted">NONE — THIS ACCOUNT HAS NEVER PUSHED</span>
          ) : (
            <span className="text-ink-muted">{`UNREADABLE BY THIS BUILD (${member.record.reason})`}</span>
          )}
        </dd>
      </dl>

      {member.record.kind !== 'record' ? (
        <p
          className="m-0 max-w-[var(--width-prose)] font-display text-meta leading-normal text-ink-muted"
          role="status"
        >
          {member.record.kind === 'absent'
            ? 'Records are local-first (§14.7): this browser has nothing to read '
              + 'until this person signs in on the device that holds their record. '
              + 'Nothing here means they have done nothing.'
            : 'A row exists and this build cannot read it — usually a record '
              + 'written by a newer bundle than the one serving this page. It is '
              + 'not shown as empty, because it is not empty.'}
        </p>
      ) : (
        <PersonBody
          member={member}
          facts={facts}
          snapshot={snapshot}
          data={member.record.data}
          curriculumRev={member.record.curriculumRev}
          login={login}
          assigned={assigned}
          assignments={assignments}
        />
      )}
    </section>
  )
}

/**
 * Split out only so the readable-record branch can use the narrowed `data`
 * without an assertion. It carries no logic of its own.
 */
function PersonBody({
  member,
  facts,
  snapshot,
  data,
  curriculumRev,
  login,
  assigned,
  assignments,
}: {
  member: TeamMember
  facts: CurriculumFacts
  snapshot: TeamSnapshot
  data: Parameters<typeof sheetClaimRows>[0]
  curriculumRev: string | null
  login: string | null
  assigned: ReturnType<typeof assignedSheetsFor>
  assignments: TeamSnapshot['assignments']
}) {
  // The same call the roster row made and the reader's own sheet makes (§14.9).
  const progress = buildProgress({
    data,
    facts,
    now: snapshot.at,
    assigned,
    attention: (record, sheets, now) => selectAttention(record, sheets, now, member.logs),
  })
  const rows = sheetClaimRows(data, facts, login)

  return (
    <>
      <hr className="hl-rule-struct" aria-hidden="true" />

      <p className="hl-mark m-0 mb-1">
        {`SIGNED OFF ${progress.signedOff} / ${progress.attainable}`}
        {' · '}
        {`ACTIVE ${progress.days} OF THE LAST 14 DAYS`}
        {' · '}
        {progress.lastActivity === null
          ? 'NO ACTIVITY RECORDED'
          : `LAST ACTIVITY ${progress.lastActivity}`}
      </p>
      {/* §14.9's `curriculum_rev`: which curriculum the STORED column was
          computed against. Printed rather than acted on — the numbers above
          were computed here, from this build's corpus, so they are current
          whatever the column says. */}
      {curriculumRev !== null && (
        <p className="hl-mark m-0 mb-5 text-ink-muted">
          {`STORED PROGRESS COMPUTED AT CURRICULUM REV ${curriculumRev}`}
        </p>
      )}

      {/* ---- §14.8.1 — attention, with reasons ----------------------------- */}
      <h3 className="hl-mark m-0 mb-2 text-ink">Attention</h3>
      {progress.attention.length === 0 ? (
        <p className="hl-mark m-0 mb-5 text-ink-muted">
          NO FLAGS — NOTHING OVERDUE, STALLED OR REPEATEDLY MISSED
        </p>
      ) : (
        <ul className="hl-mark m-0 mb-5 list-none p-0">
          {progress.attention.map((flag) => (
            <li key={`${flag.why}:${flag.sheetSlug}`} className="py-0.5">
              {attentionReason(flag)}
            </li>
          ))}
        </ul>
      )}

      {/* ---- §14.2.4 — what this person has been assigned ------------------ */}
      <h3 className="hl-mark m-0 mb-2 text-ink">Assignments</h3>
      {assignments.length === 0 ? (
        <p className="hl-mark m-0 mb-5 text-ink-muted">NONE</p>
      ) : (
        <ul className="hl-mark m-0 mb-5 list-none p-0">
          {assignments.map((assignment) => (
            <li key={assignment.id} className="py-0.5">
              {assignment.title}
              {' · '}
              {assignment.dueAt === null ? 'NO DEADLINE' : `DUE ${day(assignment.dueAt)}`}
              {' · '}
              {`${assignment.sheets.length} SHEETS`}
              {/* §14.2.4 — an empty target set is the whole org, and the row
                  says so rather than leaving a manager to infer why someone
                  they never named is on the hook. */}
              {assignment.targets.length === 0 && ' · WHOLE ORGANISATION'}
            </li>
          ))}
        </ul>
      )}

      {/* ---- §14.8.2 — the two columns, one row per sign-off --------------- */}
      <h3 className="hl-mark m-0 mb-2 text-ink">Claim and evidence</h3>
      <p className="m-0 mb-3 max-w-[var(--width-prose)] font-display text-meta leading-normal text-ink-muted">
        The left column is what this person asserted about themselves (§12.4.4:
        observed, printed as evidence, gating nothing). The two on the right are
        what can be checked without them — the Quick Check they assessed
        themselves against the sheet, and the repository owner compared with the
        GitHub login their sign-in supplied, which they cannot edit.
      </p>

      {rows.length === 0 ? (
        <p className="hl-mark m-0 text-ink-muted" role="status">
          NO SIGN-OFF RECORDED
        </p>
      ) : (
        <div
          className="hl-index-scroll"
          role="region"
          tabIndex={0}
          aria-label={`Claims and evidence for ${memberLabel(member)}`}
          data-hl-scroller=""
        >
          <table className="hl-index">
            <caption className="sr-only">
              One row per sign-off: the claim, and the evidence beside it.
            </caption>
            <colgroup>
              {COLUMNS.map((column) => (
                <col key={column.key} style={{ width: `${column.width}px` }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {COLUMNS.map((column) => (
                  <th key={column.key} scope="col">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <ClaimRow key={row.slug} row={row} login={login} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
