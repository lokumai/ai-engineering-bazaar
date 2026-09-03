/**
 * §14.8 — the manager's panel, as a vocabulary and a set of decisions, with no
 * network and no DOM anywhere in it.
 *
 * The panel's whole difficulty is that it prints statements about OTHER people,
 * and §1 does not soften when the reader is a manager. Three consequences shape
 * this file:
 *
 * 1. **Claim and evidence are separate types, not one boolean.** §14.8.2 keeps
 *    `signOff` as §12.4.4 left it — *"Observed. Printed as evidence; gates
 *    nothing"* — and refuses to fold it into a single "completed" tick, because
 *    a tick would present the reader's own assertion as a verified fact.
 *    `SheetClaimRow` therefore carries the assertion and the two independent
 *    checks side by side, and no function in this file ever reduces them to a
 *    single verdict.
 *
 * 2. **Nothing here counts anything `derive.ts` already counts.** §14.9 exists
 *    because the moment "how far along is this person?" has two
 *    implementations, the panel says `18/32` while the reader's own page says
 *    `17/32`. So `latestSignOff` returns an instant and NOT a count, and
 *    `evidenceSummary` tallies only the evidence classes — a question
 *    `derive.ts` does not answer at all. The signed-sheet count on screen comes
 *    from `buildProgress` (`progress.ts`), which calls `derive.ts`, which is the
 *    same call the reader's own sheet makes.
 *
 * 3. **Every decision is a pure function over plain data.** §12.14.2's rule:
 *    anything that decides something is testable in node. `queries.ts` is
 *    allowed to be impure and is allowed to know column names; it is not
 *    allowed to decide anything. The join between profiles, records and the
 *    event log is a decision (about what to do when one of the three is
 *    missing), so it lives here as `assembleTeam` rather than in the SQL layer.
 *
 * Types-only imports from `lib/record/*` and `lib/supabase/env.ts`. All four are
 * fs-free, so §12.2's import direction holds and a client island may hold this
 * module.
 */

import type { SheetLog, SheetLogs } from '@/lib/record/attention'
import type { CurriculumFacts } from '@/lib/record/derive'
import type { RecordData, SheetRecord } from '@/lib/record/schema'
import type { AssignedSheet, AttentionFlag, EventKind, Progress } from '@/lib/record/wire'
import type { SupabaseUnavailable } from '@/lib/supabase/env'

// ---------------------------------------------------------------------------
// §14.2.1 — the platform tables, in this codebase's vocabulary
// ---------------------------------------------------------------------------

/** §14.2.1 `orgs`. `joinDomain` is null for an org that only invites (§14.5). */
export interface Org {
  id: string
  name: string
  joinDomain: string | null
}

/**
 * §14.2.1 `profiles`, narrowed to what the panel prints.
 *
 * `githubLogin` is the load-bearing field and the reason this is not just a
 * display record: §14.8.2 states it is written from OAuth metadata and the user
 * cannot write it, which is the ONLY fact in this system that can contradict
 * something the reader typed. `null` is a real and common value — a reader who
 * signed in with a magic link has no GitHub identity at all — and it must never
 * be treated as "does not match" (see `classifySubmittals`).
 *
 * `markSeed` and `mark` are deliberately absent. They are the reader's visible
 * identity (§12.3.5) and the panel has no use for drawing someone else's face;
 * carrying them would put them in a bundle for no reason.
 */
export interface OrgProfile {
  userId: string
  displayName: string | null
  githubLogin: string | null
  roleId: string | null
}

/** §14.2.1 `memberships`. An edge, not a scope (§14.3). */
export interface OrgMembership {
  orgId: string
  userId: string
  joinedAt: string | null
}

// ---------------------------------------------------------------------------
// §14.2.2 — one member's record, in three honest states
// ---------------------------------------------------------------------------

/**
 * What the panel knows about one person's `record_state` row.
 *
 * Three states, because there are three different truths and §11.25 forbids
 * printing them as one:
 *
 * - `record` — a row came back and this bundle could read it.
 * - `absent` — the account exists and has never pushed. Local-first means this
 *   is NORMAL, not broken: §14.7 keeps `localStorage` authoritative and the
 *   envelope only travels when a signed-in reader's device gets a chance to
 *   send it. A member in this state has done work the server has not seen, and
 *   the panel says exactly that instead of `0 / 32`.
 * - `unreadable` — a row exists and `validate.ts` quarantined it. Almost always
 *   a schema written by a bundle newer than the one serving this panel, which
 *   is routine on GitHub Pages with its cached bundles. Rendering it as zero
 *   would be the panel inventing a regression in someone else's record.
 */
export type TeamRecord =
  | {
      kind: 'record'
      schema: number
      data: RecordData
      /** §14.2.2 — the device's claim. Empty string when unvouched. */
      savedAt: string
      /** §14.9's column AS STORED. Never rendered as this panel's numbers. */
      storedProgress: Progress | null
      curriculumRev: string | null
    }
  | { kind: 'absent' }
  | { kind: 'unreadable'; reason: string }

/**
 * §14.2.3 — one log row, narrowed to the three fields §14.8.1's rules need.
 *
 * `payload` is not carried. The panel counts attempts and takes the latest
 * instant; the answers themselves are the reader's own writing, and pulling
 * every quiz answer of every colleague into a manager's browser to compute two
 * numbers would be gathering data for no stated purpose. §14.0/5 grants the
 * manager access to the whole record — it does not oblige the panel to ship it.
 */
export interface LearnerEventRow {
  userId: string
  kind: EventKind
  sheetSlug: string | null
  at: string
}

/** One row of `/team/`: a person, their record, and the log facts about it. */
export interface TeamMember {
  userId: string
  /** Every managed org this person is a member of; §14.3's multi-org case. */
  orgIds: readonly string[]
  /** `null` when `profiles` returned no row — see `memberLabel`. */
  profile: OrgProfile | null
  record: TeamRecord
  /** §14.8.1's `SheetLogs`, keyed by sheet slug. Empty is legal. */
  logs: SheetLogs
}

/** §14.2.4 — an assignment with its two child tables folded in. */
export interface Assignment {
  id: string
  orgId: string
  title: string
  note: string | null
  dueAt: string | null
  createdAt: string | null
  sheets: readonly string[]
  /** EMPTY MEANS THE WHOLE ORG (§14.2.4). Never "nobody". */
  targets: readonly string[]
}

/** What `/team/assignments/` collects before anything is written. */
export interface AssignmentDraft {
  orgId: string
  title: string
  note: string
  /** `YYYY-MM-DD` from a date input, or empty. */
  dueDate: string
  sheets: readonly string[]
  targets: readonly string[]
}

// ---------------------------------------------------------------------------
// The outer state of a panel page
// ---------------------------------------------------------------------------

/**
 * Everything `/team/` and `/team/assignments/` can be, including the four
 * states that are not failures.
 *
 * This is a union rather than a bag of booleans because the four non-`ready`
 * states have to be told APART on screen and their copy must not be shared —
 * the same argument `EmptyState`'s four classes settle (§12.13). "This build
 * has no backend", "you are not signed in", "you are signed in but manage
 * nothing", and "the query failed" are four different facts, and one reassuring
 * paragraph over all four is three lies.
 *
 * `loading` is first-class and is not a spinner over stale numbers: §1 and
 * §11.25 say a page may not state what it does not know, so while the query is
 * in flight the panel says so and renders no table at all.
 */
export type PanelState<T> =
  | { kind: 'loading' }
  | { kind: 'unconfigured'; why: SupabaseUnavailable }
  | { kind: 'signedOut' }
  | { kind: 'notManager' }
  | { kind: 'failed'; message: string }
  | { kind: 'ready'; value: T }

/**
 * The status line and the explanation for each non-`ready` state.
 *
 * Here, in a pure function, for the reason `emptyStateCopy` is: §12.14.1's copy
 * register scans one place, and the wording of "you are not a manager of an
 * organisation" is a decision worth pinning in a test rather than leaving in
 * JSX where a rewrite can quietly turn it into an apology. No exclamation
 * marks, no "just", no "sorry", no praise.
 *
 * It takes only the NON-ready states. That is not a convenience: a function
 * that also accepted `ready` would have to return `null` for it, and every call
 * site would then be a nullable check that TypeScript could not use to narrow
 * the state it was handed. Excluding the case makes `if (state.kind !== 'ready')`
 * the one branch, and the compiler carries the narrowing into the table below
 * it.
 */
export type PanelWaiting = Exclude<PanelState<unknown>, { kind: 'ready' }>

export function panelStateCopy(state: PanelWaiting): {
  status: string
  detail: string
} {
  switch (state.kind) {
    case 'loading':
      // Named as a query in flight, not as emptiness. The distinction is the
      // whole point: an empty table and an unanswered query look identical and
      // mean opposite things.
      return {
        status: 'QUERY IN FLIGHT',
        detail: 'Nothing is stated until the query answers.',
      }
    case 'signedOut':
      return {
        status: 'NOT SIGNED IN',
        detail:
          'The panel reads records through your own session. Signing in is '
          + 'what scopes it; there is no view of it without one.',
      }
    case 'notManager':
      // §14.4's policies return an empty set to a non-manager, which is
      // indistinguishable from an org with no members. Saying "no members
      // found" to someone who simply has no authority here would be the page
      // guessing, so the absence of a managed org is reported as the fact it
      // is (see `TeamSnapshot`, where the org list is read first for exactly
      // this reason).
      return {
        status: 'NOT A MANAGER',
        detail:
          'You are not a manager of an organisation. Managers are appointed by '
          + 'hand in the Supabase console (§14.4.1); the application does not '
          + 'grant this to itself.',
      }
    case 'unconfigured':
      return { status: 'BACKEND NOT CONFIGURED', detail: unconfiguredDetail(state.why) }
    case 'failed':
      return { status: 'QUERY FAILED', detail: state.message }
  }
}

/**
 * §14.1's four reasons, each stated as something a maintainer can act on. The
 * default (`flagOff`) is not an error and is not written as one — it is the
 * safe configuration, and §14.1 makes it a precondition that auth stays off
 * until the custom domain is live.
 */
function unconfiguredDetail(why: SupabaseUnavailable): string {
  switch (why) {
    case 'flagOff':
      return 'Accounts are switched off for this build (NEXT_PUBLIC_AUTH_ENABLED).'
    case 'missingUrl':
      return 'Accounts are switched on but NEXT_PUBLIC_SUPABASE_URL is not set.'
    case 'missingKey':
      return 'Accounts are switched on but NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.'
    case 'malformedUrl':
      return 'NEXT_PUBLIC_SUPABASE_URL is not an absolute http(s) URL.'
  }
}

// ---------------------------------------------------------------------------
// §14.8.2 — the claim, and the two pieces of evidence beside it
// ---------------------------------------------------------------------------

/**
 * §12.6 — what the Quick Check can say about a signed-off sheet.
 *
 * Four values, because the reader's self-assessment has three outcomes and the
 * absence of one is a fourth. `unassessed` is an answer that was written and
 * never checked against the sheet's own summary, which is a different state
 * from never having answered — and both are different from having missed.
 * Collapsing any pair of them would be the panel reporting a fact nobody
 * established.
 */
export type QuizEvidence = 'matched' | 'missed' | 'unassessed' | 'none'

/**
 * §14.8.2 — what the submittal register can say, once `profiles.github_login`
 * is available to compare against.
 *
 * `unattributable` is the value the spec's two-outcome sentence does not have
 * and the panel cannot do without. §14.8.2 says: matching means
 * `✓ doğrulanmış`, otherwise `⚠ sahibi değil`. But a reader who signed in with
 * a magic link has no `github_login` at all, and calling their submittal
 * "not their own" on that basis would be the panel manufacturing an accusation
 * out of a missing field. So a null login yields `unattributable` — "this
 * cannot be checked" — which is the honest third answer and is reported to the
 * orchestrator as a gap in §14.8.2.
 */
export type SubmittalEvidence = 'verified' | 'ownerMismatch' | 'unattributable' | 'none'

/** §14.8.2 — one signed-off sheet: the claim, and the evidence beside it. */
export interface SheetClaimRow {
  slug: string
  /** The sheet label, or null when the corpus no longer carries this slug. */
  module: number | null
  /** THE CLAIM. An ISO instant, asserted by the reader (§12.4.4). */
  signedOff: string
  /** §12.4.3 — the REV the claim was made against, for the drift line. */
  signedRevision: string | null
  quiz: QuizEvidence
  submittal: SubmittalEvidence
  /**
   * The owners actually registered against this sheet, so the panel can print
   * the REASON rather than a warning glyph: `owner torvalds ≠ github cevheri`
   * is arguable, `⚠` is not.
   */
  submittalOwners: readonly string[]
  /**
   * False when the record holds a sign-off for a slug this build's corpus does
   * not contain — a renamed or withdrawn sheet. Shown, never dropped: the
   * reader asserted it, and silently omitting the row would make the panel's
   * list disagree with the reader's own.
   */
  inCurriculum: boolean
}

/** §12.6 — the quiz half of the evidence column, for one sheet. */
export function classifyQuiz(sheet: SheetRecord | undefined): QuizEvidence {
  const quiz = sheet?.quiz
  if (!quiz) return 'none'
  if (quiz.assessed === 'matched') return 'matched'
  if (quiz.assessed === 'missed') return 'missed'
  return 'unassessed'
}

/**
 * §14.8.2 — the submittal half, for one sheet.
 *
 * Two decisions the spec leaves open, both recorded here rather than in a
 * component:
 *
 * **Comparison is case-insensitive.** GitHub logins are case-insensitive as
 * identities, so `Torvalds` and `torvalds` are one account; flagging a
 * capitalisation difference as "not the owner" would be a false accusation over
 * nothing. Nothing else is normalised — no trimming of interior characters, no
 * unicode folding — because a login is `[A-Za-z0-9-]` and anything outside that
 * genuinely is a different string.
 *
 * **Any mismatch wins over any match.** A sheet with three submittals, one of
 * them owned by someone else, reports `ownerMismatch`. The alternative
 * (`verified` if any owner matches) would let a real claim launder an
 * unattributed one, and §14.8.2's example — `owner: torvalds`, presenting Linux
 * as one's own work — is precisely the case being caught. It is a FLAG, not a
 * gate (§12.4.4 is untouched): the panel prints the owners beside it and a
 * manager reads them. Legitimate cases exist — a contribution to an
 * organisation's repository is owned by the organisation — and the row shows
 * enough for a person to judge, which is the whole design.
 */
export function classifySubmittals(
  sheet: SheetRecord | undefined,
  githubLogin: string | null,
): SubmittalEvidence {
  const submittals = sheet?.submittals ?? []
  if (submittals.length === 0) return 'none'

  const login = (githubLogin ?? '').trim().toLowerCase()
  if (login === '') return 'unattributable'

  const mismatched = submittals.some((entry) => entry.owner.trim().toLowerCase() !== login)
  return mismatched ? 'ownerMismatch' : 'verified'
}

/**
 * §14.8.2 — every sign-off this record holds, each with its evidence, in the
 * order the drawing set is numbered.
 *
 * Only signed-off sheets appear. That is what makes the two columns mean
 * anything: evidence is evidence FOR a claim, and a sheet nobody has claimed
 * has nothing to corroborate. Unsigned sheets that need attention are the other
 * mechanism entirely (`attention.ts`, §14.8.1), and printing them here as well
 * would have the panel make the same point twice in two different vocabularies.
 *
 * Iteration is over the record and then ordered by the curriculum, rather than
 * over the curriculum. Both directions matter: a sign-off for a slug the corpus
 * has dropped must still be listed (`inCurriculum: false`), and the sheets the
 * corpus does carry must come out in `module` order, which is the order every
 * other listing on the site uses.
 */
export function sheetClaimRows(
  data: RecordData,
  facts: CurriculumFacts,
  githubLogin: string | null,
): SheetClaimRow[] {
  const order = new Map<string, number>()
  for (const fact of facts.sheets) order.set(fact.slug, fact.module)

  const rows: SheetClaimRow[] = []
  for (const [slug, sheet] of Object.entries(data.sheets)) {
    if (sheet.signedOff === null) continue
    const module = order.get(slug)
    rows.push({
      slug,
      module: module ?? null,
      signedOff: sheet.signedOff,
      signedRevision: sheet.signedRevision,
      quiz: classifyQuiz(sheet),
      submittal: classifySubmittals(sheet, githubLogin),
      submittalOwners: sheet.submittals.map((entry) => entry.owner),
      inCurriculum: module !== undefined,
    })
  }

  // Numbered sheets first, in number order; then the orphans, alphabetically,
  // so the list is stable across the `jsonb` round trip that does not preserve
  // key order (the same reason `selectAttention` sorts its output).
  return rows.sort((a, b) => {
    if (a.module !== null && b.module !== null) return a.module - b.module
    if (a.module !== null) return -1
    if (b.module !== null) return 1
    return a.slug.localeCompare(b.slug)
  })
}

/**
 * §14.8.2's evidence column, tallied over rows `sheetClaimRows` already built.
 *
 * It takes ROWS, not a record, and that is the §14.9 discipline in miniature:
 * the classification happens exactly once, and this function cannot come to
 * disagree with the per-sheet table printed under it, because it is counting
 * that table's own rows.
 *
 * These counts do not duplicate anything in `derive.ts`. "How many sheets are
 * signed off" is `signedCount`'s question and is NOT answered here — the panel
 * takes that number from `buildProgress`, which is the same call the reader's
 * own sheet makes. "How many of those claims have corroborating evidence" is a
 * question `derive.ts` does not ask at all, and this is its only
 * implementation.
 */
export interface EvidenceSummary {
  quizMatched: number
  quizMissed: number
  quizUnassessed: number
  quizNone: number
  submittalVerified: number
  submittalMismatch: number
  submittalUnattributable: number
  submittalNone: number
}

export function evidenceSummary(rows: readonly SheetClaimRow[]): EvidenceSummary {
  const out: EvidenceSummary = {
    quizMatched: 0,
    quizMissed: 0,
    quizUnassessed: 0,
    quizNone: 0,
    submittalVerified: 0,
    submittalMismatch: 0,
    submittalUnattributable: 0,
    submittalNone: 0,
  }
  for (const row of rows) {
    if (row.quiz === 'matched') out.quizMatched += 1
    else if (row.quiz === 'missed') out.quizMissed += 1
    else if (row.quiz === 'unassessed') out.quizUnassessed += 1
    else out.quizNone += 1

    if (row.submittal === 'verified') out.submittalVerified += 1
    else if (row.submittal === 'ownerMismatch') out.submittalMismatch += 1
    else if (row.submittal === 'unattributable') out.submittalUnattributable += 1
    else out.submittalNone += 1
  }
  return out
}

/**
 * The latest instant this record asserts a sign-off at, or null.
 *
 * An instant, deliberately NOT a count. §14.8.2's `BEYAN` column reads
 * "signed off 12 Aug", and the temptation is to return `{ count, latest }`
 * from one traversal — which would be a second implementation of
 * `signedCount`, the exact thing §14.9 was written to prevent. The count comes
 * from `derive.ts` through `buildProgress`; this supplies only the date, which
 * `derive.ts` does not publish.
 */
export function latestSignOff(data: RecordData): string | null {
  let latest: string | null = null
  for (const sheet of Object.values(data.sheets)) {
    const at = sheet.signedOff
    if (at === null) continue
    if (latest === null || at > latest) latest = at
  }
  return latest
}

// ---------------------------------------------------------------------------
// §14.8.1 — feeding the one attention definition from the event log
// ---------------------------------------------------------------------------

/**
 * §14.2.3 → §14.8.1 — the event log, reduced to the two facts `SheetLog` asks
 * for, per user and per sheet.
 *
 * `attention.ts`'s own docblock describes this as `count(*)` and `max(at)` in
 * SQL. It is done here instead, over raw rows, for the reason §14.9 gives:
 * `queries.ts` computes nothing, so that no number on screen has a second
 * implementation living in a `group by`. The cost is rows on the wire; the
 * benefit is that "attempts against this sheet" is one tested function.
 *
 * `attempts` counts `setQuizAnswer` only — §14.2.3 writes one row per attempt
 * and that is the count §14.8.1's rule 2 is about. `lastTouchedAt` takes the
 * maximum over EVERY kind, because rule 1 asks when the sheet was last written
 * to at all, not when it was last quizzed.
 *
 * Rows with a null `sheetSlug` are skipped: `setIdentity`, `setRole` and
 * `mintMarkSeed` are facts about the person, not about a sheet, and folding
 * them in would keep every opened sheet looking fresh because the reader
 * renamed themselves — the same error `attention.ts` refuses `days` for.
 *
 * A `Map` per user and a plain object per sheet: the outer keys are uuids from
 * the database, the inner keys are slugs, and the inner object is handed
 * straight to `attention.ts`, which already reads slugs through a `Map` of its
 * own. `Object.create(null)` for the inner table so a slug of `__proto__`
 * arriving from a `jsonb` column is a plain key and not a prototype write
 * (§12.1.2's `isSafeKey` guards the same hazard).
 */
export function sheetLogsByUser(
  events: readonly LearnerEventRow[],
): Map<string, SheetLogs> {
  const out = new Map<string, Record<string, SheetLog>>()

  for (const event of events) {
    const slug = event.sheetSlug
    if (slug === null || slug === '') continue
    if (Number.isNaN(Date.parse(event.at))) continue

    let perUser = out.get(event.userId)
    if (perUser === undefined) {
      perUser = Object.create(null) as Record<string, SheetLog>
      out.set(event.userId, perUser)
    }

    const existing = perUser[slug] ?? { attempts: 0, lastTouchedAt: null }
    const attempts = (existing.attempts ?? 0) + (event.kind === 'setQuizAnswer' ? 1 : 0)
    const last = existing.lastTouchedAt ?? null
    perUser[slug] = {
      attempts,
      lastTouchedAt: last === null || event.at > last ? event.at : last,
    }
  }

  return out as Map<string, SheetLogs>
}

/**
 * §14.2.4 — the sheets one person is on the hook for, with the deadline that
 * applies, in the two-field shape `attention.ts` accepts.
 *
 * **Empty `targets` means the whole org.** That is §14.2.4's rule and it is the
 * one place a mistake here is silent rather than loud: read as "nobody", an
 * org-wide assignment would simply never produce an `overdue` flag, and the
 * panel would report a clean team on the day everyone missed a deadline.
 *
 * An assignment only reaches a person through an org they are actually a member
 * of, which is why `memberOrgIds` is a parameter. §14.3's accepted edge case —
 * one person, two orgs — means a manager can be looking at a member who also
 * carries another org's assignments; those are that org's business and are not
 * in this manager's `assignments` result at all, so nothing has to exclude them
 * here beyond the membership check.
 *
 * The same sheet assigned twice is returned twice, deliberately:
 * `selectAttention` already resolves duplicate deadlines by taking the earliest
 * (the one the reader is already late for), and de-duplicating here would be a
 * second implementation of that rule.
 */
export function assignedSheetsFor(
  assignments: readonly Assignment[],
  userId: string,
  memberOrgIds: readonly string[],
): AssignedSheet[] {
  const orgs = new Set(memberOrgIds)
  const out: AssignedSheet[] = []
  for (const assignment of assignments) {
    if (!orgs.has(assignment.orgId)) continue
    const applies = assignment.targets.length === 0 || assignment.targets.includes(userId)
    if (!applies) continue
    for (const sheetSlug of assignment.sheets) {
      out.push({ sheetSlug, dueAt: assignment.dueAt })
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// The join
// ---------------------------------------------------------------------------

export interface TeamInput {
  memberships: readonly OrgMembership[]
  profiles: readonly OrgProfile[]
  records: ReadonlyMap<string, TeamRecord>
  logs: ReadonlyMap<string, SheetLogs>
}

/**
 * `memberships` × `profiles` × `record_state` × `learner_event` → one row per
 * person.
 *
 * **`memberships` is the spine**, and that choice is what makes the panel
 * honest. Driving off `record_state` instead would list only the people whose
 * device has managed to push — so a member who has never signed in on a machine
 * with a network would be missing from their own team's roster rather than
 * shown as having pushed nothing. §14.4.2 gives a manager exactly this list;
 * everything else is decoration hung on it.
 *
 * A missing profile row leaves `profile: null` rather than dropping the person.
 * §14.4.4's policy covers profiles of org members, but `profiles` is written by
 * the account layer on first sign-in and a membership can exist before it — and
 * a row that vanishes because one of four tables was quiet is the worst
 * possible failure for a roster.
 *
 * Sorted by the label a reader sees, so the list does not reorder itself
 * between loads (uuid order is arbitrary and PostgREST makes no promise).
 */
export function assembleTeam(input: TeamInput): TeamMember[] {
  const byUser = new Map<string, string[]>()
  for (const membership of input.memberships) {
    const orgs = byUser.get(membership.userId)
    if (orgs === undefined) byUser.set(membership.userId, [membership.orgId])
    else if (!orgs.includes(membership.orgId)) orgs.push(membership.orgId)
  }

  const profiles = new Map<string, OrgProfile>()
  for (const profile of input.profiles) profiles.set(profile.userId, profile)

  const members: TeamMember[] = []
  for (const [userId, orgIds] of byUser) {
    members.push({
      userId,
      orgIds,
      profile: profiles.get(userId) ?? null,
      record: input.records.get(userId) ?? { kind: 'absent' },
      logs: input.logs.get(userId) ?? {},
    })
  }

  return members.sort((a, b) => {
    const byLabel = memberLabel(a).localeCompare(memberLabel(b))
    return byLabel !== 0 ? byLabel : a.userId.localeCompare(b.userId)
  })
}

/**
 * What to call a person on screen.
 *
 * §12.3.4's display name if they wrote one — from `profiles` if a row exists,
 * ELSE FROM THE RECORD SNAPSHOT THE PANEL IS ALREADY HOLDING — else the GitHub
 * login, else the first eight characters of the uuid prefixed `USER`. Never a
 * fabrication and never an email address: the address is in the JWT, not in
 * `profiles`, and printing a colleague's address in a roster would be
 * disclosing something the panel was not given.
 *
 * **Why the record's own name is consulted before the uuid.** The two names are
 * the SAME FACT from two places: `profiles.display_name` is written from
 * `record.data.identity.name` (`org/profile-sync.ts`), and §14.7 keeps the
 * local record authoritative, so the snapshot is the fresher of the two and the
 * row is its projection. Reaching for the uuid while `assembleTeam` has that
 * snapshot in hand is a needless failure — and until this phase it was the
 * NORMAL case, because nothing wrote a `profiles` row at all, so every member
 * of every org rendered as `USER 1a2b3c4d` for ever. A fallback that only works
 * when the primary source works is not a fallback.
 *
 * It stays SECOND rather than first because the two can legitimately disagree:
 * `profiles` is the value the reader most recently pushed from a signed-in
 * device, and `record` may be an older envelope from another one. And it stays
 * ahead of the GitHub login for the reason the login was ever second — a name a
 * person typed about themselves beats a handle a provider assigned them.
 *
 * Only readable records are consulted: `absent` and `unreadable` (§14.2.2) hold
 * no identity to read, and inventing one from a quarantined envelope is exactly
 * the §11.25 violation those two states exist to prevent.
 *
 * The uuid fragment is a LABEL, not an identity — `PersonDetail` prints the
 * whole uuid where the whole uuid matters. Eight hex characters is enough to
 * tell two rows apart and short enough not to dominate the column.
 */
export function memberLabel(member: TeamMember): string {
  const name = member.profile?.displayName?.trim()
  if (name !== undefined && name !== '') return name
  const recorded
    = member.record.kind === 'record' ? member.record.data.identity.name?.trim() : undefined
  if (recorded !== undefined && recorded !== '') return recorded
  const login = member.profile?.githubLogin?.trim()
  if (login !== undefined && login !== '') return login
  return `USER ${member.userId.slice(0, 8)}`
}

// ---------------------------------------------------------------------------
// §14.2.4 — validating a draft assignment
// ---------------------------------------------------------------------------

/**
 * Why a draft cannot be written yet. One value per field the form can fix, so
 * the form can put the message on the control rather than in a banner.
 *
 * `noTargets` is deliberately NOT in this list. An empty target set is the
 * org-wide assignment (§14.2.4) and is the most useful thing the form does.
 */
export type AssignmentProblem = 'noOrg' | 'noTitle' | 'longTitle' | 'noSheets' | 'badDueDate'

/** §12.1.3's cap on a one-line field, applied to the assignment title. */
export const MAX_ASSIGNMENT_TITLE = 120
/** The note is a paragraph, not a document. */
export const MAX_ASSIGNMENT_NOTE = 500

/**
 * §14.2.4 — is this draft writable?
 *
 * Two decisions §14.2.4 leaves open:
 *
 * **At least one sheet is required.** The spec makes `assignment_sheets` a
 * child table and says nothing about it being empty. An assignment with no
 * sheets is a title and a deadline with nothing to do against them, and
 * §14.8.1's rule 3 — *assigned, deadline passed, no sign-off* — can never fire
 * for it, so it would sit in the org's data producing no signal at all. The
 * form refuses it. Reported to the orchestrator as an open point.
 *
 * **A due date is optional.** `assignments.due_at` is nullable and §14.11's
 * roadmap treats reminders as a later phase, so an assignment that is a reading
 * list with no deadline is legitimate. What is refused is a date string the
 * browser cannot parse, because storing an unparseable deadline would make
 * `overdue` unanswerable for every sheet in it.
 *
 * A due date in the PAST is allowed. It is unusual, but a manager recording an
 * assignment after the fact is a real thing to do, and `selectAttention` will
 * correctly flag it as overdue immediately — which is the truth, not an error.
 */
export function validateAssignment(draft: AssignmentDraft): AssignmentProblem[] {
  const problems: AssignmentProblem[] = []
  if (draft.orgId.trim() === '') problems.push('noOrg')

  const title = draft.title.trim()
  if (title === '') problems.push('noTitle')
  else if (title.length > MAX_ASSIGNMENT_TITLE) problems.push('longTitle')

  if (draft.sheets.length === 0) problems.push('noSheets')

  if (draft.dueDate.trim() !== '' && dueInstant(draft.dueDate) === null) {
    problems.push('badDueDate')
  }
  return problems
}

/**
 * `YYYY-MM-DD` → the instant the day BEGINS, in UTC, or null.
 *
 * Midnight-at-the-start, not end-of-day, and UTC rather than the manager's zone.
 * Both follow from `selectAttention`, which calls a deadline missed only when
 * it is STRICTLY in the past: a `2026-09-01` deadline stored as
 * `2026-09-01T00:00:00Z` therefore starts flagging during the first day AFTER
 * the due date, which is what a reader means by "due on the 1st". Choosing the
 * manager's local midnight instead would make the same date mean a different
 * instant depending on who typed it, and the record it is compared against is
 * UTC throughout (§12's `days` are UTC `YYYY-MM-DD`).
 *
 * The round-trip check rejects `2026-02-31`, which `Date.parse` accepts and
 * rolls forward.
 */
export function dueInstant(dueDate: string): string | null {
  const day = dueDate.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  const parsed = new Date(`${day}T00:00:00.000Z`)
  const time = parsed.getTime()
  if (!Number.isFinite(time)) return null
  if (parsed.toISOString().slice(0, 10) !== day) return null
  return parsed.toISOString()
}

/**
 * §14.8's last requirement, and the one most easily lost in a component: an
 * attention flag is printed WITH ITS REASON, never as a bare warning glyph.
 *
 * A `⚠` beside a colleague's name is an accusation the manager cannot examine,
 * and it is the same failure §11.25 names for an unexplained number — the
 * reader is asked to act on something they have not been told. So the flag
 * renders as a sentence carrying the evidence `attention.ts` already put in the
 * row: which sheet, and the measurement that tripped the rule.
 *
 * It is a pure function of the flag so the wording is testable and lives beside
 * the other copy decisions rather than inside JSX. Each reason names its own
 * threshold constant's effect in numbers, never the constant's name: a manager
 * reading `21 DAYS IDLE` can disagree with it; `STALL_DAYS EXCEEDED` gives them
 * nothing to disagree with.
 */
export function attentionReason(flag: AttentionFlag): string {
  switch (flag.why) {
    case 'overdue':
      // The deadline is the whole claim, so it is printed even though `dueAt`
      // is typed as nullable — `selectAttention` only sets this reason when it
      // has one, and the fallback exists so a malformed row degrades to a
      // weaker statement instead of printing the word `null`.
      return flag.dueAt === null
        ? `OVERDUE · ${flag.sheetSlug}`
        : `OVERDUE · ${flag.sheetSlug} · DUE ${flag.dueAt.slice(0, 10)}`
    case 'quizFailing':
      return `QUIZ MISSED · ${flag.sheetSlug} · ${flag.attempts} ATTEMPTS`
    case 'stalled':
      return flag.idleDays === null
        ? `OPENED, NOT SIGNED OFF · ${flag.sheetSlug}`
        : `OPENED, NOT SIGNED OFF · ${flag.sheetSlug} · ${flag.idleDays} DAYS IDLE`
  }
}
