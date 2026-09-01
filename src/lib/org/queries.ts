/**
 * §14.8, §14.9 — the panel's SQL. It FILTERS and it AUTHORISES. It computes
 * nothing.
 *
 * That sentence is the whole design rule and it is §14.9's: the moment a
 * `count(*)` or a `/ 32.0` appears in this file, the question "how far along is
 * this person?" has a second answer, and the panel comes to say `18/32` while
 * the reader's own page says `17/32`. So there is no `group by`, no aggregate,
 * no arithmetic and no `.rpc()` anywhere below. Every number the panel prints
 * comes from `derive.ts` through `progress.ts`, or from `attention.ts` — the
 * same functions the reader's own sheet calls, which is what makes the two
 * agree by construction rather than by review.
 *
 * **On authority.** RLS is the security boundary, and it is the only one
 * (§14.3, §14.4). A manager selecting from `record_state` gets their own org's
 * records and nothing else because §14.4.3's policy says so, not because this
 * file asked nicely. Every `.eq()` and `.in()` below is therefore a QUERY
 * NARROWING — it makes the request smaller and the response faster — and each
 * one is commented as such. None of them is a check. If RLS were dropped
 * tomorrow, removing these filters would change nothing about what the server
 * is willing to return, and that is the correct way round: a client-side filter
 * called security is a filter an attacker edits out of the bundle.
 *
 * **On trust.** A `record_state` row arriving over the network goes through
 * `validate.ts`'s single entry point, exactly as a `localStorage` payload does.
 * §14.2.2's second consequence — *"`validate.ts` validates what arrives from
 * the network too, no new trust boundary is opened"* — is only true if some
 * module actually does it, and for the panel's many-row read that is this one.
 * A row this bundle cannot read becomes `{ kind: 'unreadable' }` and is
 * rendered as such, never as zero.
 *
 * **On functions.** There are none, by §14.0/8. So `createAssignment` writes
 * three tables without a transaction, and the comment on it says what that
 * costs and how it is contained.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { SheetLogs } from '@/lib/record/attention'
import { parseEnvelope } from '@/lib/record/validate'
import type { EventKind, Progress } from '@/lib/record/wire'
import {
  dueInstant,
  sheetLogsByUser,
  type Assignment,
  type AssignmentDraft,
  type LearnerEventRow,
  type Org,
  type OrgMembership,
  type OrgProfile,
  type TeamRecord,
} from './types'

// §14.2 — the table names, each written once so a typo cannot become a silent
// second table.
const ORG_MANAGER = 'org_manager'
const ORGS = 'orgs'
const MEMBERSHIPS = 'memberships'
const PROFILES = 'profiles'
const RECORD_STATE = 'record_state'
const LEARNER_EVENT = 'learner_event'
const ASSIGNMENTS = 'assignments'
const ASSIGNMENT_SHEETS = 'assignment_sheets'
const ASSIGNMENT_TARGETS = 'assignment_targets'

/**
 * The ceiling on rows pulled out of `learner_event` for one panel load.
 *
 * The log grows without bound — §14.2.3 writes a row per quiz attempt, per
 * sign-off, per source opened, for every member — and a panel that fetches all
 * of it eventually stops loading at all. A cap is therefore unavoidable; what
 * matters is which way it fails.
 *
 * Rows come back NEWEST FIRST, so truncation drops the oldest events. That
 * makes `lastTouchedAt` exact for every sheet still represented, and makes
 * `attempts` an UNDERCOUNT rather than an overcount — which can only make
 * §14.8.1's rule 2 fire less often, never more. A cap that could invent a flag
 * against a colleague would be unacceptable; one that can only miss one is a
 * cost the panel states on screen (`eventsTruncated`) rather than hides.
 *
 * 20_000 is not a measurement of this deployment — there is no production data
 * yet — it is the size at which a single JSON response is still a few megabytes
 * and a browser tab still parses it without a visible stall. It is a number to
 * be replaced by a measurement, and §14.11's `sheet_state` projection is the
 * documented answer when the threshold is really crossed.
 */
export const MAX_EVENT_ROWS = 20_000

/**
 * The `kind` values worth pulling. §14.8.1 needs attempts (`setQuizAnswer`) and
 * the last write against a sheet; the per-person events (`setIdentity`,
 * `setRole`, `mintMarkSeed`) carry no `sheet_slug` and are excluded at the
 * server rather than skipped in the browser — a narrowing, again, not a check.
 */
const SHEET_EVENT_KINDS: readonly EventKind[] = [
  'signOff',
  'unsign',
  'setChecklistItem',
  'setQuizAnswer',
  'assessQuiz',
  'addSubmittal',
  'removeSubmittal',
  'recordSourceOpened',
  'observeReachedEnd',
]

/**
 * PostgREST reports failure in the resolved value, not by rejecting, so every
 * call site funnels through here. The message names the table and the
 * operation because an RLS refusal and a dropped connection arrive in the same
 * shape, and the person reading the panel's `QUERY FAILED` line needs to know
 * which read was refused.
 */
function fail(operation: string, error: { message?: string; code?: string } | null): never {
  const code = error?.code ? ` [${error.code}]` : ''
  throw new Error(`${operation} failed${code}: ${error?.message ?? 'unknown error'}`)
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * §14.9's column as stored, or null.
 *
 * Shallow on purpose: `derive.ts` owns what a `Progress` contains, and
 * restating its field list here would be the second definition §14.9 forbids.
 * The column is `not null default '{}'`, so `{}` is a legal row — it is what a
 * client that pushed before `progress` existed leaves behind — and it comes
 * back as `null` here so the panel can say "not computed" instead of "zero".
 */
function asStoredProgress(value: unknown): Progress | null {
  if (!isObject(value)) return null
  if (typeof value.signedOff !== 'number') return null
  return value as unknown as Progress
}

// ---------------------------------------------------------------------------
// §14.3 — which orgs does the signed-in user manage?
// ---------------------------------------------------------------------------

/**
 * §14.4.1 — the one policy on `org_manager` is `user_id = auth.uid()`, so this
 * select needs no predicate at all: the server returns the caller's own
 * manager rows and nothing else. An empty result is the answer "you are not a
 * manager of an organisation", and it is read FIRST for exactly that reason —
 * without it, a non-manager's empty `record_state` result would be
 * indistinguishable from a manager whose org has no members, and the panel
 * would print "no members" at someone who has no authority here.
 *
 * Note what is NOT done: no `.eq('user_id', …)`. Adding it would look like a
 * check and be a tautology, and every other narrowing in this file would then
 * be read as security too.
 */
export async function loadManagedOrgs(client: SupabaseClient): Promise<Org[]> {
  const grants = await client.from(ORG_MANAGER).select('org_id')
  if (grants.error) fail(`${ORG_MANAGER} read`, grants.error)

  const orgIds = (grants.data ?? [])
    .map((row) => text((row as { org_id?: unknown }).org_id))
    .filter((id): id is string => id !== null)

  if (orgIds.length === 0) return []

  // §14.4.4 gives `orgs` a select policy for MEMBERS, a matching join domain,
  // or a pending invite — but none for managers as such. §14.3's third
  // invariant ("a manager is also a student") makes this work in practice
  // because a manager is a member too. A manager who is not a member reads
  // their own `org_manager` row and then gets no org name back, so the org is
  // still listed, under its uuid, rather than disappearing: the roster below is
  // keyed on the grant, not on the name.
  const orgs = await client
    .from(ORGS)
    .select('id, name, join_domain')
    // Narrowing. §14.4.4's policy is what decides which of these come back.
    .in('id', orgIds)
  if (orgs.error) fail(`${ORGS} read`, orgs.error)

  const named = new Map<string, { name: string; joinDomain: string | null }>()
  for (const row of orgs.data ?? []) {
    const record = row as { id?: unknown; name?: unknown; join_domain?: unknown }
    const id = text(record.id)
    if (id === null) continue
    named.set(id, {
      name: text(record.name) ?? id,
      joinDomain: text(record.join_domain),
    })
  }

  return orgIds.map((id) => ({
    id,
    // The uuid, not "Unknown organisation": a name nobody returned is absent,
    // and the uuid is the only true thing available to print (§11.25).
    name: named.get(id)?.name ?? id,
    joinDomain: named.get(id)?.joinDomain ?? null,
  }))
}

// ---------------------------------------------------------------------------
// §14.8 — the roster, in four reads and no arithmetic
// ---------------------------------------------------------------------------

/** §14.4.2 — every member of the orgs this manager manages. */
export async function loadMemberships(
  client: SupabaseClient,
  orgIds: readonly string[],
): Promise<OrgMembership[]> {
  if (orgIds.length === 0) return []
  const { data, error } = await client
    .from(MEMBERSHIPS)
    .select('org_id, user_id, joined_at')
    // Narrowing. §14.4.2's "a manager sees the org's members" policy is the
    // authority; this only avoids asking for orgs we already know about.
    .in('org_id', orgIds)
  if (error) fail(`${MEMBERSHIPS} read`, error)

  const out: OrgMembership[] = []
  for (const row of data ?? []) {
    const record = row as { org_id?: unknown; user_id?: unknown; joined_at?: unknown }
    const orgId = text(record.org_id)
    const userId = text(record.user_id)
    if (orgId === null || userId === null) continue
    out.push({ orgId, userId, joinedAt: text(record.joined_at) })
  }
  return out
}

/** §14.4.4 — the profiles of those members. `github_login` is why (§14.8.2). */
export async function loadProfiles(
  client: SupabaseClient,
  userIds: readonly string[],
): Promise<OrgProfile[]> {
  if (userIds.length === 0) return []
  const { data, error } = await client
    .from(PROFILES)
    .select('id, display_name, github_login, role_id')
    // Narrowing.
    .in('id', userIds)
  if (error) fail(`${PROFILES} read`, error)

  const out: OrgProfile[] = []
  for (const row of data ?? []) {
    const record = row as {
      id?: unknown
      display_name?: unknown
      github_login?: unknown
      role_id?: unknown
    }
    const userId = text(record.id)
    if (userId === null) continue
    out.push({
      userId,
      displayName: text(record.display_name),
      githubLogin: text(record.github_login),
      roleId: text(record.role_id),
    })
  }
  return out
}

/**
 * §14.4.3, §14.2.2 — the members' envelopes.
 *
 * Every row goes through `parseEnvelope`, which runs `migrate.ts`'s ladder and
 * `validate.ts`'s coercer. Three outcomes, all of them kept: a readable record,
 * a row the bundle cannot read (`unreadable`), and — by omission — no row at
 * all, which `assembleTeam` turns into `absent`. A quarantined row is NOT
 * reported as an empty record: that would have the panel invent a regression in
 * a colleague's work, and on GitHub Pages a bundle newer than this one writing
 * a newer schema is routine rather than exotic.
 *
 * The `JSON.stringify` round trip is the price of having ONE entry point into
 * the validator. `parseEnvelope` takes text because Web Storage and an imported
 * file both hand it text; paying a few kilobytes of serialisation per member
 * buys the §14.2.2 property that the network opened no second trust boundary.
 */
export async function loadRecordStates(
  client: SupabaseClient,
  userIds: readonly string[],
): Promise<Map<string, TeamRecord>> {
  const out = new Map<string, TeamRecord>()
  if (userIds.length === 0) return out

  const { data, error } = await client
    .from(RECORD_STATE)
    // Listed, never `select('*')`.
    .select('user_id, schema, data, progress, curriculum_rev, saved_at')
    // Narrowing. §14.4.3's manager policy is the authority: it returns the
    // records of members of orgs this caller manages, and nothing else.
    .in('user_id', userIds)
  if (error) fail(`${RECORD_STATE} read`, error)

  for (const row of data ?? []) {
    const record = row as {
      user_id?: unknown
      schema?: unknown
      data?: unknown
      progress?: unknown
      curriculum_rev?: unknown
      saved_at?: unknown
    }
    const userId = text(record.user_id)
    if (userId === null) continue

    const savedAt = text(record.saved_at)
    const parsed = parseEnvelope(
      JSON.stringify({ schema: record.schema, savedAt, data: record.data }),
    )

    if (parsed.kind === 'quarantine') {
      out.set(userId, { kind: 'unreadable', reason: parsed.reason })
      continue
    }
    if (parsed.kind === 'empty') {
      out.set(userId, { kind: 'unreadable', reason: 'row carried no envelope' })
      continue
    }

    out.set(userId, {
      kind: 'record',
      schema: parsed.schema,
      data: parsed.data,
      // `parseEnvelope` returns null for an instant it will not vouch for. The
      // empty string is the one value no reader mistakes for a date.
      savedAt: parsed.savedAt ?? '',
      storedProgress: asStoredProgress(record.progress),
      curriculumRev: text(record.curriculum_rev),
    })
  }

  return out
}

/**
 * §14.4.3, §14.2.3 — the raw log rows §14.8.1's rules are made of.
 *
 * Three fields and no `payload`: the panel needs a count and a maximum, not
 * everyone's quiz answers. The tally itself is `sheetLogsByUser` in `types.ts`,
 * a pure tested function — see the note there on why this is not a `group by`.
 *
 * Ordered `at` descending against `MAX_EVENT_ROWS`, so what a cap drops is the
 * oldest history. `truncated` is returned rather than swallowed: the panel
 * prints it, because an undercounted attempt tally is a flag that may be
 * missing and a reader is entitled to know that.
 */
export async function loadSheetEvents(
  client: SupabaseClient,
  userIds: readonly string[],
): Promise<{ events: LearnerEventRow[]; truncated: boolean }> {
  if (userIds.length === 0) return { events: [], truncated: false }

  const { data, error } = await client
    .from(LEARNER_EVENT)
    .select('user_id, kind, sheet_slug, at')
    // Narrowing on the user set; §14.4.3's manager policy is the authority.
    .in('user_id', userIds)
    // Narrowing on kind: the excluded reducers carry no `sheet_slug` at all.
    .in('kind', SHEET_EVENT_KINDS)
    .order('at', { ascending: false })
    .limit(MAX_EVENT_ROWS)
  if (error) fail(`${LEARNER_EVENT} read`, error)

  const rows = data ?? []
  const events: LearnerEventRow[] = []
  for (const row of rows) {
    const record = row as {
      user_id?: unknown
      kind?: unknown
      sheet_slug?: unknown
      at?: unknown
    }
    const userId = text(record.user_id)
    const at = text(record.at)
    if (userId === null || at === null) continue
    events.push({
      userId,
      // The column is free text in Postgres; `EventKind` is this codebase's
      // union (§14.2.3). A value outside it is carried through as-is rather
      // than dropped — `sheetLogsByUser` only ever tests it for equality with
      // `setQuizAnswer`, so an unknown kind still contributes its instant to
      // `lastTouchedAt`, which is correct: something was written.
      kind: record.kind as EventKind,
      sheetSlug: text(record.sheet_slug),
      at,
    })
  }

  return { events, truncated: rows.length >= MAX_EVENT_ROWS }
}

// ---------------------------------------------------------------------------
// §14.2.4 — assignments
// ---------------------------------------------------------------------------

/**
 * §14.4.5 — the org's assignments with both child tables embedded.
 *
 * The embeds are PostgREST's foreign-key traversal, not a join this file wrote:
 * `assignment_sheets.assignment_id` and `assignment_targets.assignment_id` both
 * reference `assignments`, so one request returns the tree. §14.4.5's own note
 * says the children's select policies defer to the parent's, which means the
 * scoping is inherited here rather than restated.
 */
export async function loadAssignments(
  client: SupabaseClient,
  orgIds: readonly string[],
): Promise<Assignment[]> {
  if (orgIds.length === 0) return []
  const { data, error } = await client
    .from(ASSIGNMENTS)
    .select(
      'id, org_id, title, note, due_at, created_at, '
        + `${ASSIGNMENT_SHEETS}(sheet_slug), ${ASSIGNMENT_TARGETS}(user_id)`,
    )
    // Narrowing. §14.4.5's manager policy is the authority.
    .in('org_id', orgIds)
    .order('created_at', { ascending: false })
  if (error) fail(`${ASSIGNMENTS} read`, error)

  const out: Assignment[] = []
  for (const row of data ?? []) {
    const record = row as {
      id?: unknown
      org_id?: unknown
      title?: unknown
      note?: unknown
      due_at?: unknown
      created_at?: unknown
      assignment_sheets?: unknown
      assignment_targets?: unknown
    }
    const id = text(record.id)
    const orgId = text(record.org_id)
    if (id === null || orgId === null) continue

    const sheets = Array.isArray(record.assignment_sheets)
      ? record.assignment_sheets
          .map((child) => text((child as { sheet_slug?: unknown }).sheet_slug))
          .filter((slug): slug is string => slug !== null)
      : []
    const targets = Array.isArray(record.assignment_targets)
      ? record.assignment_targets
          .map((child) => text((child as { user_id?: unknown }).user_id))
          .filter((userId): userId is string => userId !== null)
      : []

    out.push({
      id,
      orgId,
      title: text(record.title) ?? '',
      note: text(record.note),
      dueAt: text(record.due_at),
      createdAt: text(record.created_at),
      sheets,
      targets,
    })
  }
  return out
}

/**
 * §14.2.4 — write one assignment and its two child tables.
 *
 * **There is no transaction, and there cannot be one.** §14.0/8 rules out Edge
 * Functions and RPC, and a transaction spanning three PostgREST requests does
 * not exist. So the failure mode is a parent row whose children did not land —
 * an assignment targeting nothing, which by §14.2.4 reads as "the whole org"
 * and would silently widen its own scope. That is the one outcome worth
 * spending code on, so a child failure is followed by a best-effort DELETE of
 * the parent (§14.4.5 gives a manager `for all` on `assignments`, so the delete
 * is permitted) and the original error is rethrown either way. If the cleanup
 * also fails, the caller is told BOTH things rather than the tidier one.
 *
 * **`id` is minted by the caller**, exactly as §14.2.3 mints `learner_event.id`,
 * and for the same reason: the insert is an upsert that ignores duplicates, so
 * a retry after a timeout cannot produce two assignments. A double-clicked
 * button is the common case, not the exotic one.
 */
export async function createAssignment(
  client: SupabaseClient,
  input: { id: string; createdBy: string; draft: AssignmentDraft },
): Promise<void> {
  const { id, createdBy, draft } = input
  const dueAt = draft.dueDate.trim() === '' ? null : dueInstant(draft.dueDate)

  const parent = await client.from(ASSIGNMENTS).upsert(
    {
      id,
      org_id: draft.orgId,
      created_by: createdBy,
      title: draft.title.trim(),
      note: draft.note.trim() === '' ? null : draft.note.trim(),
      due_at: dueAt,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  )
  if (parent.error) fail(`${ASSIGNMENTS} write`, parent.error)

  try {
    const sheets = await client.from(ASSIGNMENT_SHEETS).upsert(
      draft.sheets.map((sheetSlug) => ({ assignment_id: id, sheet_slug: sheetSlug })),
      { onConflict: 'assignment_id,sheet_slug', ignoreDuplicates: true },
    )
    if (sheets.error) fail(`${ASSIGNMENT_SHEETS} write`, sheets.error)

    // An empty target list writes no rows AND MEANS THE WHOLE ORG (§14.2.4).
    if (draft.targets.length > 0) {
      const targets = await client.from(ASSIGNMENT_TARGETS).upsert(
        draft.targets.map((userId) => ({ assignment_id: id, user_id: userId })),
        { onConflict: 'assignment_id,user_id', ignoreDuplicates: true },
      )
      if (targets.error) fail(`${ASSIGNMENT_TARGETS} write`, targets.error)
    }
  } catch (error) {
    const cleanup = await client.from(ASSIGNMENTS).delete().eq('id', id)
    const original = error instanceof Error ? error.message : String(error)
    if (cleanup.error) {
      throw new Error(
        `${original} — and the incomplete assignment ${id} could not be removed `
          + `(${cleanup.error.message}). It exists with no sheets; delete it by hand.`,
      )
    }
    throw new Error(`${original} — the incomplete assignment was removed.`)
  }
}

// ---------------------------------------------------------------------------
// The one call the panel makes
// ---------------------------------------------------------------------------

export interface TeamSnapshot {
  orgs: readonly Org[]
  memberships: readonly OrgMembership[]
  profiles: readonly OrgProfile[]
  records: ReadonlyMap<string, TeamRecord>
  logs: ReadonlyMap<string, SheetLogs>
  assignments: readonly Assignment[]
  /** §14.2.3 — the log hit `MAX_EVENT_ROWS`; attempt counts may be low. */
  eventsTruncated: boolean
  /** The instant the reads were issued. Every date on screen is relative to it. */
  at: string
}

/**
 * Everything `/team/` needs, in five reads.
 *
 * The membership read gates the rest: with no members there is nothing to ask
 * about, and issuing four `.in(…, [])` queries to prove it would be four
 * pointless round trips. The other four are issued together — they are
 * independent, and serialising them would put four latencies end to end in
 * front of a reader who is watching a `QUERY IN FLIGHT` line.
 *
 * The tally of the log into `SheetLogs` happens in `types.ts`, deliberately
 * outside this function: §14.9's rule is that this file does no arithmetic, and
 * `sheetLogsByUser` is where "attempts against this sheet" is defined, once.
 */
export async function loadTeamSnapshot(
  client: SupabaseClient,
  orgs: readonly Org[],
  now: string,
): Promise<TeamSnapshot> {
  const orgIds = orgs.map((org) => org.id)
  const memberships = await loadMemberships(client, orgIds)
  const userIds = [...new Set(memberships.map((membership) => membership.userId))]

  if (userIds.length === 0) {
    const assignments = await loadAssignments(client, orgIds)
    return {
      orgs,
      memberships,
      profiles: [],
      records: new Map(),
      logs: new Map(),
      assignments,
      eventsTruncated: false,
      at: now,
    }
  }

  const [profiles, records, events, assignments] = await Promise.all([
    loadProfiles(client, userIds),
    loadRecordStates(client, userIds),
    loadSheetEvents(client, userIds),
    loadAssignments(client, orgIds),
  ])

  return {
    orgs,
    memberships,
    profiles,
    records,
    logs: sheetLogsByUser(events.events),
    assignments,
    eventsTruncated: events.truncated,
    at: now,
  }
}
