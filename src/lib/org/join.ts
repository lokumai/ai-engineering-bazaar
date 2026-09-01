/**
 * §14.5 — joining an organisation: which of the two paths applies, whether the
 * account carries an address either path can use, and what the reader is asked
 * to agree to before the row is written.
 *
 * **There is no invite token, and that absence is the design** (§14.0, Karar
 * 11). With zero Edge Functions and zero RPC (Karar 8) a token could only be
 * checked by reading the table that holds it, and RLS cannot express "you may
 * read the row whose secret you already know" — a reader who can select one
 * token can select every token, and then join every organisation on the
 * deployment. So identity does the work a token would have done badly: the
 * address in the JWT was verified by the identity provider, and §14.4.2's two
 * `insert` policies test it directly.
 *
 * **Both paths end with the USER inserting their own `memberships` row.** No
 * manager adds anybody; there is no policy that would let them. That is the
 * consent mechanism, and it is the entire reason a join SCREEN exists rather
 * than a link that quietly does the thing — Karar 5 opened the whole record to
 * the organisation's managers, and §14.5.1 is the disclosure that decision
 * incurred. The copy is in this module, not in the component, so a node test
 * can read it (§12.14.2) the way `ERASE_COPY` is read.
 *
 * **This module decides; it does not query.** `decideJoin` is a total function
 * from four lists to one state, so every branch below — including the two the
 * reader is most likely to hit and least likely to be told about, a GitHub
 * account with a hidden address and an organisation that matches nothing — is
 * exercised in node with no DOM and no network. The transport at the bottom is
 * the only part that names a column, and it decides nothing.
 *
 * What this module deliberately does NOT do: re-implement §14.4.2. RLS is the
 * authority on whether an insert lands. Everything computed here is for the
 * reader's benefit — which organisation to name, which path to explain — and a
 * mistake in it can only cost an offer the database then refuses, never an
 * access it would not have granted.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * What the JWT is asked for, and nothing else.
 *
 * `emailVerified` is carried separately from `email` because the two really do
 * come apart: a provider can hand back an address it has not confirmed, and
 * §14.4.2's policies compare `auth.jwt()->>'email'` without asking. See the
 * note on `decideJoin` for why this screen refuses anyway.
 */
export interface JoinIdentity {
  userId: string
  /** null when the account carries no address at all — §14.5's known gap. */
  email: string | null
  emailVerified: boolean
}

/**
 * §14.2.1 — the three `orgs` columns this screen needs. Named in camelCase
 * here and mapped once, at the bottom; nothing above the transport knows that
 * `joinDomain` is spelled `join_domain` in Postgres.
 */
export interface JoinableOrg {
  id: string
  name: string
  joinDomain: string | null
}

/**
 * Which of §14.5's two paths this offer rests on. It is shown to the reader
 * rather than kept as an implementation detail: "your address is on this
 * organisation's domain" and "somebody at this organisation entered your
 * address" are different facts about how the offer came to exist, and a reader
 * who is surprised by one of them should be able to see which it was.
 */
export type JoinPath = 'domain' | 'invite'

export interface JoinOffer {
  org: JoinableOrg
  path: JoinPath
}

/**
 * Why no join is possible from this account. Every value is something the
 * reader can act on, which is why it is a union and not a boolean:
 *
 * - `missing`   — §14.5's known gap. A GitHub account whose address is private
 *                 carries no `email` claim, so NEITHER path can match and no
 *                 amount of retrying helps. The screen says so in those words
 *                 rather than showing an empty list, which would read as "no
 *                 organisation wants you".
 * - `unverified` — an address the provider has not confirmed.
 * - `malformed`  — an address with no single domain part to compare.
 */
export type NoEmailReason = 'missing' | 'unverified' | 'malformed'

/**
 * What the screen renders. `alreadyMember` rides on every variant on purpose:
 * membership is the one fact worth printing even when no new join is possible,
 * because §14.5.1's second statement — every organisation you belong to sees
 * this same record — is only checkable if the reader can see the list it is
 * about.
 */
export type JoinState =
  | { kind: 'noEmail'; why: NoEmailReason; alreadyMember: readonly JoinableOrg[] }
  | { kind: 'nothingMatches'; email: string; domain: string; alreadyMember: readonly JoinableOrg[] }
  | {
      kind: 'offered'
      email: string
      domain: string
      offers: readonly JoinOffer[]
      alreadyMember: readonly JoinableOrg[]
    }

export interface JoinInputs {
  identity: JoinIdentity
  /**
   * Every `orgs` row this reader can select. §14.4.4's policy already narrows
   * it to three reasons — membership, a matching `join_domain`, an invitation —
   * so this list is short and never the whole table.
   */
  orgs: readonly JoinableOrg[]
  /** `pending_invites.org_id` for this reader's address (§14.4.5). */
  invitedOrgIds: readonly string[]
  /** `memberships.org_id` for this reader, and only this reader. */
  memberOrgIds: readonly string[]
}

/**
 * The domain part, computed the way Postgres computes it.
 *
 * §14.4.2 gates the insert on `split_part(auth.jwt()->>'email', '@', 2)`, so
 * this function has one job: agree with that expression, or the screen offers
 * a join the database refuses. Two consequences that look like bugs and are
 * not:
 *
 * 1. **No lower-casing.** The policy compares `join_domain` to `split_part(…)`
 *    with no `lower()` on either side, so the comparison is case-sensitive in
 *    the database and has to be case-sensitive here. Folding case locally
 *    would produce exactly the failure this module exists to avoid — an offer
 *    that is refused after the reader consents. (That the policy is
 *    case-sensitive at all is arguably a defect in §14.4.2; it is reported
 *    upward rather than papered over here.)
 * 2. **More than one `@` is treated as no domain.** `split_part` would return
 *    the middle segment, which is not a domain anybody meant. Refusing to
 *    guess costs nothing — such an address matches no `join_domain` either way
 *    — and it keeps this function from being the one place that invents data.
 */
export function emailDomain(email: string): string | null {
  const parts = email.trim().split('@')
  if (parts.length !== 2) return null
  const [local, domain] = parts
  if (local === '' || domain === '') return null
  return domain
}

/** The loose shape of a `supabase.auth.getUser()` user, read defensively. */
export interface AuthUserLike {
  id?: unknown
  email?: unknown
  email_confirmed_at?: unknown
  user_metadata?: unknown
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

/**
 * Auth user → `JoinIdentity`, or null when there is no usable account.
 *
 * Verification is read from TWO places because the providers disagree about
 * which one they fill: `email_confirmed_at` is stamped by Supabase when it
 * knows the address is confirmed, and `user_metadata.email_verified` is the
 * claim an OAuth provider itself made. Either is accepted; neither is
 * invented. A user object that carries an address and no sign of confirmation
 * yields `emailVerified: false`, which the screen prints as a state rather
 * than treating as an absent address — those are different problems with
 * different fixes.
 */
export function identityFromUser(user: AuthUserLike | null | undefined): JoinIdentity | null {
  if (user === null || user === undefined) return null
  const userId = text(user.id)
  if (userId === null) return null

  const metadata =
    typeof user.user_metadata === 'object' && user.user_metadata !== null
      ? (user.user_metadata as Record<string, unknown>)
      : {}

  return {
    userId,
    email: text(user.email),
    emailVerified:
      text(user.email_confirmed_at) !== null || metadata.email_verified === true,
  }
}

function byName(a: JoinableOrg, b: JoinableOrg): number {
  return a.name.localeCompare(b.name, 'en')
}

/**
 * §14.5 in one total function.
 *
 * Three decisions the spec leaves open are taken here, and each one follows
 * from §1 rather than from convenience:
 *
 * 1. **An unconfirmed address blocks the screen, even though §14.4.2 would
 *    let it through.** The policies compare the `email` claim and never ask
 *    whether it was confirmed, so the insert could succeed. This module still
 *    refuses to OFFER, because the whole substitute for an invite token
 *    (Karar 11) is that the address was verified by somebody other than its
 *    claimant; joining an organisation on the strength of an unconfirmed
 *    address would hand it a record it cannot attribute. The refusal is local
 *    and honest about being local.
 * 2. **An organisation the reader already belongs to is never an offer.** It
 *    appears under `alreadyMember` instead. A second insert would be refused
 *    by the primary key, and a button whose only outcome is an error is a page
 *    claiming something it cannot do (§12.13).
 * 3. **`domain` wins when both paths apply.** An invitation for an address
 *    already on the organisation's own domain adds nothing; the domain is the
 *    standing rule and the honest explanation of why the offer exists. The
 *    insert would satisfy either policy, so nothing is lost by naming one.
 *
 * An org that matches neither path is dropped: §14.4.4 makes membership a
 * third reason a row is selectable, so the input list legitimately contains
 * organisations that are not offers.
 */
export function decideJoin(inputs: JoinInputs): JoinState {
  const { identity, orgs, invitedOrgIds, memberOrgIds } = inputs

  const memberIds = new Set(memberOrgIds)
  const alreadyMember = orgs.filter((org) => memberIds.has(org.id)).slice().sort(byName)

  if (identity.email === null) {
    return { kind: 'noEmail', why: 'missing', alreadyMember }
  }
  if (!identity.emailVerified) {
    return { kind: 'noEmail', why: 'unverified', alreadyMember }
  }
  const domain = emailDomain(identity.email)
  if (domain === null) {
    return { kind: 'noEmail', why: 'malformed', alreadyMember }
  }

  const invitedIds = new Set(invitedOrgIds)
  const offers: JoinOffer[] = []
  for (const org of orgs.slice().sort(byName)) {
    if (memberIds.has(org.id)) continue
    if (org.joinDomain !== null && org.joinDomain === domain) {
      offers.push({ org, path: 'domain' })
      continue
    }
    if (invitedIds.has(org.id)) offers.push({ org, path: 'invite' })
  }

  if (offers.length === 0) {
    return { kind: 'nothingMatches', email: identity.email, domain, alreadyMember }
  }
  return { kind: 'offered', email: identity.email, domain, offers, alreadyMember }
}

/* ===========================================================================
   §14.5.1 — the disclosure.

   Karar 5 gave an organisation's managers the WHOLE record. §14.5.1 sets the
   price: the reader reads what that means BEFORE clicking anything. So the
   copy lives above the control in the component, and here in a pure function
   a test can assert on — a disclosure that can be quietly reworded is not a
   disclosure.

   Nothing here is softened, and none of it is behind a link. §12.14.1's
   register still holds: no exclamation marks, no praise, no apology, and the
   software does not speak as a person. Plain future indicative, because that
   is what is actually going to happen.
   =========================================================================== */

export const JOIN_COPY = {
  title: 'Join an organisation',
  disclosureHead: 'What joining discloses',
  /** Above the button, always, and never collapsed. */
  action: 'Join',
  pathDomain: 'Your address is on this organisation domain',
  pathInvite: 'Somebody at this organisation entered your address',
  memberHead: 'Organisations you belong to',
  joined: 'Joined',
} as const

/**
 * The disclosure, as sentences, in the order they must be read.
 *
 * `otherOrgCount` is the number of organisations the reader ALREADY belongs
 * to. It changes the third sentence from a conditional into a statement of
 * fact, which is the difference between a warning and a description of the
 * reader's own situation — §14.3's accepted edge case ("a person in two
 * organisations is read by the managers of both") is not hypothetical for
 * somebody who is already in one.
 */
export function disclosureStatements(orgName: string, otherOrgCount: number): readonly string[] {
  const lines: string[] = [
    `You are joining ${orgName}.`,
    `Managers of ${orgName} will see your whole record: every sheet you have `
      + 'signed off, every quiz attempt including the ones you missed, every '
      + 'submittal, and the timeline of when you did each of those things.',
  ]

  lines.push(
    otherOrgCount === 0
      ? 'The record is held per person, not per organisation. If you later join '
        + 'a second organisation, the managers of both see this same record.'
      : `The record is held per person, not per organisation. You already `
        + `belong to ${String(otherOrgCount)} other `
        + `${otherOrgCount === 1 ? 'organisation' : 'organisations'}, and after `
        + 'this the managers of every one of them see this same record.',
  )

  lines.push(
    'Erasing your own record later does not erase the organisation copy of '
      + 'this history. The organisation training log stays with the '
      + 'organisation. Closing your account removes it.',
    'Nothing reaches the organisation until you use the control below: the '
      + 'membership row is written by you, from this browser, and that is what '
      + 'consent means here.',
  )

  return lines
}

/**
 * The reason a reader cannot join, in the register of §12.14.1.
 *
 * All three details send the reader to their PROFILE sheet, and the wording is
 * a correction rather than a preference: §14.7 named a dedicated account route,
 * no such route was built, and identity lives on `/profile/` (§12.11) instead.
 * Prose that names a sheet the site does not have is the same defect as a link
 * to it — the reader goes looking and finds nothing — and it is the worse half,
 * because no grep for a route path catches an English sentence.
 */
export function noEmailCopy(why: NoEmailReason): { status: string; detail: string } {
  switch (why) {
    case 'missing':
      return {
        status: 'NO ADDRESS ON THIS ACCOUNT',
        detail:
          'Both routes into an organisation compare the address on your '
          + 'account, and this account carries none — a sign-in that keeps the '
          + 'address private hands over nothing to compare. Add and confirm an '
          + 'address on your profile sheet, then return here.',
      }
    case 'unverified':
      return {
        status: 'ADDRESS NOT CONFIRMED',
        detail:
          'The address on your account has not been confirmed by the service '
          + 'that issued it. An unconfirmed address is not evidence of who you '
          + 'are, and it is the only evidence either route into an '
          + 'organisation uses. Confirm it on your profile sheet, then return '
          + 'here.',
      }
    case 'malformed':
      return {
        status: 'NO DOMAIN PART IN ADDRESS',
        detail:
          'The address on your account has no single domain part, so there is '
          + 'nothing to compare against an organisation domain. Change it on '
          + 'your profile sheet, then return here.',
      }
  }
}

/* ===========================================================================
   Transport. Below this line, and only below it, columns have their Postgres
   names. Nothing here decides anything: it is one place where camelCase meets
   snake_case and one place that turns a PostgREST result into a rejection —
   the same division `lib/supabase/remote-store.ts` draws for `record_state`.
   =========================================================================== */

const ORGS = 'orgs'
const MEMBERSHIPS = 'memberships'
const PENDING_INVITES = 'pending_invites'

/**
 * Why a join was refused. Classified from the error CODE, never from the
 * message: the message is localised by whatever Postgres and PostgREST were
 * built with, and a screen that pattern-matches English prose is a screen that
 * silently stops distinguishing these two on the day that changes.
 *
 * - `duplicate` (`23505`) — the row is already there. Not a failure to hide:
 *   two tabs, or a stale list, and the reader IS a member.
 * - `refused` (`42501`) — neither §14.4.2 policy accepted the row. This is the
 *   honest, expected outcome of a domain that does not match or an invitation
 *   that was withdrawn between the read and the click.
 * - `unknown` — anything else, including no network.
 */
export type JoinFailure = 'duplicate' | 'refused' | 'unknown'

export function classifyJoinError(error: { code?: string | null } | null | undefined): JoinFailure {
  const code = error?.code ?? null
  if (code === '23505') return 'duplicate'
  if (code === '42501') return 'refused'
  return 'unknown'
}

export type JoinAttempt =
  | { ok: true }
  | { ok: false; failure: JoinFailure; message: string }

/**
 * §14.7.1's port pattern, applied to the org tables.
 *
 * The three reads REJECT on failure, so a screen that cannot answer a question
 * renders "not read" rather than an empty list that reads as a fact (§11.25).
 * The insert does not: it returns a typed result, because its refusal is the
 * one outcome the screen has to describe precisely, and an `Error` thrown
 * across that seam arrives with its code already lost.
 */
export interface OrgJoinStore {
  listJoinableOrgs(): Promise<readonly JoinableOrg[]>
  listInvitedOrgIds(): Promise<readonly string[]>
  listMemberOrgIds(): Promise<readonly string[]>
  join(orgId: string): Promise<JoinAttempt>
}

function fail(operation: string, error: { message?: string; code?: string } | null): never {
  const code = error?.code ? ` [${error.code}]` : ''
  throw new Error(`${operation} failed${code}: ${error?.message ?? 'unknown error'}`)
}

function toJoinableOrg(row: Record<string, unknown>): JoinableOrg {
  return {
    id: String(row.id ?? ''),
    // A name is `not null` in §14.2.1, so an empty one is a row this build
    // cannot describe; the id is never shown in its place, because an
    // organisation identified by a UUID is not an organisation a reader can
    // decide about.
    name: typeof row.name === 'string' ? row.name : '',
    joinDomain: typeof row.join_domain === 'string' && row.join_domain !== ''
      ? row.join_domain
      : null,
  }
}

function orgIds(rows: readonly Record<string, unknown>[]): readonly string[] {
  return rows
    .map((row) => (typeof row.org_id === 'string' ? row.org_id : null))
    .filter((id): id is string => id !== null)
}

export function createOrgJoinStore(client: SupabaseClient, userId: string): OrgJoinStore {
  return {
    async listJoinableOrgs(): Promise<readonly JoinableOrg[]> {
      const { data, error } = await client.from(ORGS).select('id, name, join_domain')
      if (error) fail(`${ORGS} read`, error)
      return (data ?? []).map((row) => toJoinableOrg(row as Record<string, unknown>))
    },

    async listInvitedOrgIds(): Promise<readonly string[]> {
      // No `eq` on the address: §14.4.5's policy is `email = auth.jwt()->>'email'`,
      // so the reader's own row is the only row that exists as far as this query
      // is concerned. Filtering again on a value the client believes to be its
      // address would add a second, weaker definition of who this reader is.
      const { data, error } = await client.from(PENDING_INVITES).select('org_id')
      if (error) fail(`${PENDING_INVITES} read`, error)
      return orgIds((data ?? []) as Record<string, unknown>[])
    },

    async listMemberOrgIds(): Promise<readonly string[]> {
      // `eq('user_id', userId)` is REQUIRED here, unlike above. §14.4.2 gives
      // `memberships` a second select policy so a manager can see everybody in
      // their organisation — without this filter, a reader who happens to be a
      // manager would read colleagues' rows and this screen would report their
      // memberships as the reader's own.
      const { data, error } = await client
        .from(MEMBERSHIPS)
        .select('org_id')
        .eq('user_id', userId)
      if (error) fail(`${MEMBERSHIPS} read`, error)
      return orgIds((data ?? []) as Record<string, unknown>[])
    },

    async join(orgId: string): Promise<JoinAttempt> {
      // The reader inserts their OWN row, and `user_id` is written from the
      // session rather than from anything on screen. §14.4.2's `with check`
      // requires `user_id = auth.uid()` in both policies, so a different value
      // is refused by the database — this is the client agreeing with the
      // policy, not the client enforcing it.
      const { error } = await client
        .from(MEMBERSHIPS)
        .insert({ org_id: orgId, user_id: userId })

      if (error) {
        return {
          ok: false,
          failure: classifyJoinError(error),
          message: error.message ?? '',
        }
      }
      return { ok: true }
    },
  }
}
