'use client'

import { useCallback, useEffect, useState } from 'react'
import { selectAttention } from '@/lib/record/attention'
import type { CurriculumFacts } from '@/lib/record/derive'
import { buildProgress } from '@/lib/record/progress'
import type { AttentionFlag, Progress } from '@/lib/record/wire'
import {
  assembleTeam,
  assignedSheetsFor,
  attentionReason,
  evidenceSummary,
  latestSignOff,
  memberLabel,
  panelStateCopy,
  sheetClaimRows,
  type EvidenceSummary,
  type PanelState,
  type TeamMember,
} from '@/lib/org/types'
import { loadManagedOrgs, loadTeamSnapshot, type TeamSnapshot } from '@/lib/org/queries'
import { viewFromSession } from '@/lib/auth/session'
import { supabaseBrowser } from '@/lib/supabase/client'
import { supabaseEnv } from '@/lib/supabase/env'
import { PersonDetail } from './PersonDetail'

/**
 * §14.8 — `/team/`: one row per member of the org, and the two columns §14.8.2
 * insists on keeping apart.
 *
 * **Why this is an island and not a page.** §14.8's static-export constraint:
 * `generateStaticParams` runs at build time and users exist only afterwards, so
 * there is no `/team/[user]/` route to generate. The roster does not exist at
 * build time either — it is a query issued by the signed-in manager's own
 * browser under §14.4's policies — so the page above this component prerenders
 * a heading, a lead and this island, and nothing that could be a claim about
 * anybody.
 *
 * **Why the query parameter is read from `window.location` and not with
 * `useSearchParams`.** Next's own documentation for that hook: *"During
 * production builds, a static page that calls `useSearchParams` from a Client
 * Component must be wrapped in a `Suspense` boundary, otherwise the build fails
 * with the Missing Suspense boundary with useSearchParams error"*, and calling
 * it makes the tree up to that boundary client-rendered. A three-line effect
 * plus a `popstate` listener costs less than a bailout that has to be
 * remembered by every future editor of the page above, and it keeps the
 * prerender of the 32 sheets and this route unconditionally clean.
 *
 * **Why every number comes from `buildProgress`.** §14.9. `18 / 32` on this
 * screen and `18 / 32` on the reader's own sheet are the output of one call to
 * `derive.ts`, reached through `progress.ts`, so they cannot drift. The stored
 * `progress` column is read too, but only to detect that it has gone stale
 * (§14.13's fourth risk row) — never to print a number, because it was computed
 * against whichever curriculum the member's device last saw.
 *
 * **Four states before the table.** `loading`, `unconfigured`, `signedOut`,
 * `notManager`. §1 and §11.25: while the query is in flight the panel says so
 * and renders no rows. A non-manager gets `NOT A MANAGER` and not an empty
 * table, because §14.4's policies return an empty set to them and an empty set
 * is not the same statement as "your org has no members".
 */

/** The columns, summing to `.hl-index`'s hand-computed 1060px `min-width`. */
const COLUMNS: ReadonlyArray<{ key: string; label: string; width: number | null }> = [
  { key: 'member', label: 'Member', width: 220 },
  { key: 'github', label: 'GitHub', width: 150 },
  { key: 'progress', label: 'Progress', width: 110 },
  // §14.8.2's two columns. Adjacent, equally weighted, never merged.
  { key: 'claim', label: 'Claim', width: 190 },
  { key: 'evidence', label: 'Evidence', width: 250 },
  { key: 'attention', label: 'Attention', width: null },
]

/** §14.8.1 — how many flags fit in a 52px-ish row before the rest is counted. */
const FLAGS_IN_ROW = 2

/**
 * The `?u=` value, read once after mount and kept in step with the back button.
 *
 * `null` on the server and on the first client frame, which is the same value
 * both sides compute (§12.2's rule for anything read from the browser).
 */
function useSelectedUser(): [string | null, (userId: string | null) => void] {
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    const read = (): void => {
      setSelected(new URLSearchParams(window.location.search).get('u'))
    }
    read()
    window.addEventListener('popstate', read)
    return () => window.removeEventListener('popstate', read)
  }, [])

  /**
   * `pushState`, so the browser's own back button closes the detail panel — the
   * URL in §14.8's route table (`/team/?u=<uuid>`) is a real address a manager
   * can send to a colleague, not a decoration over component state.
   */
  const select = useCallback((userId: string | null): void => {
    const url = new URL(window.location.href)
    if (userId === null) url.searchParams.delete('u')
    else url.searchParams.set('u', userId)
    window.history.pushState(null, '', url)
    setSelected(userId)
  }, [])

  return [selected, select]
}

/**
 * One member's numbers, assembled the way `progress.ts` is meant to be called.
 *
 * `attention` is passed as the selector `buildProgress` asks for, closed over
 * this member's `SheetLogs`. That closure is the only reason the panel's flags
 * are stronger than the reader's own page's: §14.8.1's rule 2 needs a count of
 * quiz attempts, which lives in `learner_event` and not in the envelope, and
 * `attention.ts` accepts it as an argument precisely so ONE definition can be
 * fed by two different bodies of evidence.
 */
function memberProgress(
  member: TeamMember,
  facts: CurriculumFacts,
  snapshot: TeamSnapshot,
): { progress: Progress; stale: boolean } | null {
  if (member.record.kind !== 'record') return null

  const assigned = assignedSheetsFor(snapshot.assignments, member.userId, member.orgIds)
  const progress = buildProgress({
    data: member.record.data,
    facts,
    now: snapshot.at,
    assigned,
    attention: (data, sheets, now) => selectAttention(data, sheets, now, member.logs),
  })

  // §14.13 — "`progress` goes stale (the curriculum changes); `curriculum_rev`;
  // the panel marks the aged row". The comparison is against the denominator
  // this build measured, which is the number that moves when a sheet is added
  // or withdrawn. It is a comparison, not a calculation: both sides were
  // produced by `derive.ts`.
  const stored = member.record.storedProgress
  const stale = stored !== null && stored.attainable !== progress.attainable

  return { progress, stale }
}

/** §14.8.2 — the evidence cell, in words. Two lines, never a glyph alone. */
function evidenceLines(summary: EvidenceSummary): string[] {
  const quiz: string[] = []
  if (summary.quizMatched > 0) quiz.push(`${summary.quizMatched} MATCHED`)
  if (summary.quizMissed > 0) quiz.push(`${summary.quizMissed} MISSED`)
  if (summary.quizUnassessed > 0) quiz.push(`${summary.quizUnassessed} NOT ASSESSED`)
  if (summary.quizNone > 0) quiz.push(`${summary.quizNone} NO ANSWER`)

  const submittal: string[] = []
  if (summary.submittalVerified > 0) submittal.push(`${summary.submittalVerified} VERIFIED`)
  if (summary.submittalMismatch > 0) {
    submittal.push(`${summary.submittalMismatch} OWNER MISMATCH`)
  }
  if (summary.submittalUnattributable > 0) {
    // Named as unverifiable rather than as a failure: §14.8.2's check needs a
    // `github_login`, and a reader who signed in by e-mail has none.
    submittal.push(`${summary.submittalUnattributable} NO GITHUB LINK`)
  }
  if (summary.submittalNone > 0) submittal.push(`${summary.submittalNone} NONE`)

  return [
    `QUIZ ${quiz.length === 0 ? '—' : quiz.join(' · ')}`,
    `SUBMITTAL ${submittal.length === 0 ? '—' : submittal.join(' · ')}`,
  ]
}

/** Dates are sliced, never localised — `report.ts`'s rule, for its reason. */
function day(instant: string | null): string {
  return instant === null || instant === '' ? '—' : instant.slice(0, 10)
}

function AttentionCell({ flags }: { flags: readonly AttentionFlag[] }) {
  if (flags.length === 0) {
    // Not "all clear": §14.8.1 flags three specific conditions and their
    // absence is the absence of those three, which is what this says.
    return <span className="text-ink-muted">NO FLAGS</span>
  }
  const shown = flags.slice(0, FLAGS_IN_ROW)
  const rest = flags.length - shown.length
  return (
    <ul className="m-0 list-none p-0">
      {shown.map((flag) => (
        <li key={`${flag.why}:${flag.sheetSlug}`} className="whitespace-nowrap">
          {attentionReason(flag)}
        </li>
      ))}
      {rest > 0 && <li className="text-ink-muted">{`${rest} MORE — OPEN THE DETAIL`}</li>}
    </ul>
  )
}

function MemberRow({
  member,
  facts,
  snapshot,
  onSelect,
}: {
  member: TeamMember
  facts: CurriculumFacts
  snapshot: TeamSnapshot
  onSelect: (userId: string) => void
}) {
  const label = memberLabel(member)
  const computed = memberProgress(member, facts, snapshot)
  const login = member.profile?.githubLogin

  // §14.8.2's evidence is evidence FOR a claim, so it is built from the same
  // rows the detail panel prints — one classification, not two.
  const rows =
    member.record.kind === 'record'
      ? sheetClaimRows(member.record.data, facts, login ?? null)
      : []

  return (
    <tr className="hl-row">
      <th scope="row" className="hl-row-title">
        {/* The whole row is the link target, as everywhere else on the site.
            It is a real `href` so it can be middle-clicked and copied, and the
            handler cancels the navigation so the query the island already
            answered is not thrown away and re-issued. */}
        <a
          className="hl-row-link"
          href={`?u=${encodeURIComponent(member.userId)}`}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
            event.preventDefault()
            onSelect(member.userId)
          }}
        >
          {label}
        </a>
      </th>

      <td className="hl-row-context hl-mark">
        {login === undefined || login === null ? (
          // §14.8.2 — no login means the submittal check cannot run, and the
          // cell says which of the two it is rather than printing a dash.
          <span className="text-ink-muted">NOT LINKED</span>
        ) : (
          login
        )}
      </td>

      <td className="hl-mark">
        {computed === null ? (
          <span className="text-ink-muted">
            {member.record.kind === 'absent' ? 'NO SERVER COPY' : 'UNREADABLE'}
          </span>
        ) : (
          <>
            {`${computed.progress.signedOff} / ${computed.progress.attainable}`}
            {computed.stale && (
              <span className="block text-ink-muted">STORED PROGRESS STALE</span>
            )}
          </>
        )}
      </td>

      {/* §14.8.2 — THE CLAIM. The reader's own assertion, and labelled as one. */}
      <td className="hl-row-context hl-mark">
        {member.record.kind !== 'record' ? (
          <span className="text-ink-muted">—</span>
        ) : latestSignOff(member.record.data) === null ? (
          <span className="text-ink-muted">NO SIGN-OFF</span>
        ) : (
          `SIGNED OFF · LATEST ${day(latestSignOff(member.record.data))}`
        )}
      </td>

      {/* §14.8.2 — THE EVIDENCE. A separate column, never folded into the one
          on its left: the left column is what this person says about
          themselves, this one is what can be checked independently of them. */}
      <td className="hl-row-context hl-mark">
        {member.record.kind !== 'record' ? (
          <span className="text-ink-muted">—</span>
        ) : (
          evidenceLines(evidenceSummary(rows)).map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))
        )}
      </td>

      <td className="hl-row-context hl-mark">
        {computed === null ? (
          <span className="text-ink-muted">—</span>
        ) : (
          <AttentionCell flags={computed.progress.attention} />
        )}
      </td>
    </tr>
  )
}

export function TeamTable({ facts }: { facts: CurriculumFacts }) {
  const [state, setState] = useState<PanelState<TeamSnapshot>>({ kind: 'loading' })
  const [selected, select] = useSelectedUser()

  useEffect(() => {
    let live = true

    async function load(): Promise<void> {
      // §14.1 — asked of `env.ts`, which owns the kill switch. A component that
      // tested for the anon key itself would give the switch a second, weaker
      // definition.
      const env = supabaseEnv()
      if (env.kind !== 'ready') {
        if (live) setState({ kind: 'unconfigured', why: env.why })
        return
      }

      const client = supabaseBrowser()
      if (client === null) {
        if (live) setState({ kind: 'failed', message: 'No Supabase client in this browser.' })
        return
      }

      try {
        // §14.8.2's own session module decides what "signed out" means, skew
        // and all (`viewFromSession`). Asking it rather than testing
        // `getUser() === null` here keeps ONE definition of a usable session
        // across every panel on the site — the same argument §14.9 makes about
        // arithmetic, applied to authentication state.
        const { data } = await client.auth.getSession()
        if (viewFromSession(data.session, Date.now()).status !== 'signedIn') {
          if (live) setState({ kind: 'signedOut' })
          return
        }

        // Read FIRST, and on its own. §14.4.1's policy makes an empty result
        // mean exactly "you manage nothing", which is the one thing an empty
        // roster cannot be distinguished from afterwards.
        const orgs = await loadManagedOrgs(client)
        if (orgs.length === 0) {
          if (live) setState({ kind: 'notManager' })
          return
        }

        // One instant for the whole load, taken here rather than in a render:
        // every "N days idle" and every "overdue" on screen is relative to it,
        // and a clock read during render is both a hydration mismatch and a
        // page whose two halves can disagree.
        const snapshot = await loadTeamSnapshot(client, orgs, new Date().toISOString())
        if (live) setState({ kind: 'ready', value: snapshot })
      } catch (error) {
        if (live) {
          setState({
            kind: 'failed',
            message: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }

    void load()
    return () => {
      live = false
    }
  }, [])

  if (state.kind !== 'ready') {
    const copy = panelStateCopy(state)
    return (
      <section className="hl-panel" aria-labelledby="hl-team-state">
        <div className="hl-panel-head">
          <h2 id="hl-team-state" className="hl-panel-title">
            Roster
          </h2>
          <p className="hl-mark m-0 text-ink-faint">{copy.status}</p>
        </div>
        {/* §12.13's live-region split: a query's progress and its outcome are
            both status, not alerts — nothing here is an error the reader
            caused. */}
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

  const person = members.find((member) => member.userId === selected) ?? null

  return (
    <>
      <section className="hl-panel" aria-labelledby="hl-team-roster">
        <div className="hl-panel-head">
          <h2 id="hl-team-roster" className="hl-panel-title">
            Roster
          </h2>
          <p className="hl-mark m-0 text-ink-faint">
            {snapshot.orgs.map((org) => org.name).join(' · ')}
          </p>
        </div>

        {/* §14.2.3 — the log cap, stated where it changes what the reader can
            conclude. An undercounted attempt tally can only hide a flag, never
            invent one, and a reader is entitled to know which way it fails. */}
        {snapshot.eventsTruncated && (
          <p className="hl-mark m-0 mb-3 text-ink-muted">
            EVENT LOG TRUNCATED — QUIZ ATTEMPT COUNTS MAY BE LOW
          </p>
        )}

        {members.length === 0 ? (
          <p className="hl-mark m-0 text-ink-muted" role="status">
            NO MEMBERS IN THIS ORGANISATION
          </p>
        ) : (
          <div
            className="hl-index-scroll"
            role="region"
            tabIndex={0}
            aria-label="Organisation roster"
            data-hl-scroller=""
          >
            <table className="hl-index">
              <caption className="sr-only">
                One row per member: progress, the claim, the evidence beside it,
                and what needs attention.
              </caption>
              <colgroup>
                {COLUMNS.map((column) => (
                  <col
                    key={column.key}
                    style={column.width === null ? undefined : { width: `${column.width}px` }}
                  />
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
                {members.map((member) => (
                  <MemberRow
                    key={member.userId}
                    member={member}
                    facts={facts}
                    snapshot={snapshot}
                    onSelect={select}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* §14.8 — the person detail, on the same page, because there is no
          `/team/[user]/` route to send anyone to. `selected` naming a member
          who is not in this roster renders nothing rather than an error: a
          stale link is not a fault, and §14.4 has already decided what this
          manager may see. */}
      {person !== null && (
        <PersonDetail
          member={person}
          facts={facts}
          snapshot={snapshot}
          onClose={() => select(null)}
        />
      )}
      {selected !== null && person === null && (
        <section className="hl-panel" aria-labelledby="hl-team-unknown">
          <div className="hl-panel-head">
            <h2 id="hl-team-unknown" className="hl-panel-title">
              Person
            </h2>
            <p className="hl-mark m-0 text-ink-faint">NOT IN THIS ROSTER</p>
          </div>
          <p className="m-0 font-display text-meta leading-normal text-ink-muted" role="status">
            {`No member of your organisation has the id ${selected}.`}
          </p>
        </section>
      )}
    </>
  )
}
