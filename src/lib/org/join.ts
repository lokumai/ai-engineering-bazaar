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

import { EMAIL_IDENTITY } from '@/lib/auth/session'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * What the JWT is asked for, and nothing else.
 *
 * `providers` is `app_metadata.providers`, carried separately from `email`
 * because the two really do come apart: a provider can hand back an address
 * nobody has proved possession of, and both `insert` policies in
 * `0005_phase4_provider_verified.sql` ask for the provider list rather than the
 * address.
 *
 * **This replaced an `emailVerified` boolean, and the replacement is the fix
 * for a defect.** That boolean was `email_confirmed_at` OR
 * `user_metadata.email_verified`, and `0005`'s header records the measurement
 * that makes the second term worthless: `user_metadata` is written by the
 * signed-in user through `auth.updateUser({ data })`, so the flag this screen
 * gated on was one the reader could set. Worse, it gated on the wrong question:
 * `0005` asks `app_metadata -> 'providers' ? 'email'`, which no address claim
 * can satisfy, so a GitHub-only account on a matching domain was offered a join
 * the database then refused with 42501 — a button whose only outcome is an
 * error, which §12.13 forbids. The list is carried verbatim so `decideJoin` can
 * ask the policies' own question.
 */
export interface JoinIdentity {
  userId: string
  /** null when the account carries no address at all — §14.5's known gap. */
  email: string | null
  /**
   * `app_metadata.providers`, as the token carries it. Server-controlled:
   * `0005` measured a raw `PUT /auth/v1/user` carrying `app_metadata` answering
   * 403, which is the whole reason this field is trusted and
   * `user_metadata.email_verified` is not.
   */
  providers: readonly string[]
}

/**
 * The provider entry that both `0005` policies require, spelled once.
 *
 * `providers ? 'email'` means GoTrue completed an email identity, and with
 * `mailer_autoconfirm` off that happens only when somebody opened the mailbox.
 * Possession of the mailbox is the proof; the address written on the account is
 * only a claim about it.
 */
/**
 * The provider name both `0005` policies test for.
 *
 * Taken from `lib/auth/session.ts` rather than spelt again: `SignInPanel` now
 * decides what to OFFER from the same string this module decides what to REFUSE
 * from, and two copies of it is exactly the arrangement that let the screen and
 * the database disagree about verification in the first place (§14.14.5).
 */
const EMAIL_PROVIDER = EMAIL_IDENTITY

/**
 * Whether this account carries the proof both `insert` policies ask for.
 *
 * Exported so a test can assert the clause and the screen and the copy all read
 * the same one thing — the previous arrangement had the screen deciding on one
 * field and the database on another, and nothing compared them.
 */
export function mailboxProven(identity: JoinIdentity): boolean {
  return identity.providers.includes(EMAIL_PROVIDER)
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
 * - `unprovenMailbox` — an account with an address and no email sign-in behind
 *                 it. This member replaced `unverified`, which named the wrong
 *                 condition: it was computed from a flag the reader could write
 *                 (`user_metadata.email_verified`, see `JoinIdentity`) and it
 *                 described a state neither `0005` policy asks about. What both
 *                 policies ask about is the provider list, so that is what this
 *                 member reports.
 * - `malformed`  — an address with no single domain part to compare.
 */
export type NoEmailReason = 'missing' | 'unprovenMailbox' | 'malformed'

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
  /** Where `providers` lives. The only field on the user object about proof. */
  app_metadata?: unknown
  /**
   * Declared and DELIBERATELY NOT READ. `0005`'s header proved the sequence:
   * `updateUser({ email_verified: true })` is accepted and the next token
   * carries the rewritten claim, so anything decided from here is decided by
   * the party being checked. It stays in the shape so the test that this module
   * ignores it can pass a user object carrying it.
   */
  user_metadata?: unknown
  /**
   * Also not read. Supabase stamps it, so it is not forgeable, but it answers a
   * question no policy asks: `0005` gates on the provider list, and a second,
   * differently-sourced notion of "confirmed" is how the screen and the
   * database came apart in the first place.
   */
  email_confirmed_at?: unknown
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

/**
 * Auth user → `JoinIdentity`, or null when there is no usable account.
 *
 * The provider list is read from ONE place, `app_metadata.providers`, and
 * nothing else on the user object is consulted about proof. The two fields this
 * function used to read are documented on `AuthUserLike` with the reason each
 * one is now ignored; the short version is that one of them was writable by the
 * reader and the other answered a question no policy asks.
 *
 * A list that is absent, or not an array of strings, yields an EMPTY list
 * rather than a guess. An empty list is refused by `decideJoin` and refused by
 * `0005`, which is the same answer from both sides — the failure mode of
 * inventing a provider here would be the offer-then-42501 this rewrite exists
 * to remove.
 */
export function identityFromUser(user: AuthUserLike | null | undefined): JoinIdentity | null {
  if (user === null || user === undefined) return null
  const userId = text(user.id)
  if (userId === null) return null

  const appMetadata =
    typeof user.app_metadata === 'object' && user.app_metadata !== null
      ? (user.app_metadata as Record<string, unknown>)
      : {}
  const raw = appMetadata.providers
  const providers = Array.isArray(raw)
    ? raw.filter((entry): entry is string => typeof entry === 'string')
    : []

  return {
    userId,
    email: text(user.email),
    providers,
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
 * 1. **An account with no email sign-in is offered NOTHING, on either path,
 *    because that is exactly what `0005` refuses.** Both `insert` policies open
 *    with `coalesce(auth.jwt() -> 'app_metadata' -> 'providers' ? 'email',
 *    false)` — the invited path included — so the requirement is a property of
 *    the table, not of the domain route, and an invitation is not a way around
 *    it. This check used to be a local, stricter-than-RLS refusal of an
 *    "unconfirmed" address; that was written against `0004` and left behind by
 *    `0005`, and in between it read a flag the reader could write. The rule now
 *    is the policies' clause and nothing else: what this screen offers is what
 *    the database accepts, both directions.
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
  if (!mailboxProven(identity)) {
    return { kind: 'noEmail', why: 'unprovenMailbox', alreadyMember }
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
 * The reason a reader cannot join, in the register of §12.14.1, with the one
 * sheet that can act on it.
 *
 * **The way out is part of the copy, not of the component.** Two of the three
 * reasons are about the address written on the account and are read on
 * `/profile/` — §14.7 named a dedicated account route, none was built, and
 * identity lives on `/profile/` (§12.11) instead; prose naming a sheet the site
 * does not have is the same defect as a link to it, and the worse half, because
 * no grep for a route path catches an English sentence. `unprovenMailbox` is
 * about which SIGN-INS the account carries, which `/profile/` does not show and
 * `/sign-in/` is the sheet for. The component used to send all three to
 * `/profile/`, so the one reader who needed a different sheet was sent to the
 * one page that could not help.
 *
 * The `unprovenMailbox` detail says the same thing `/sign-in/`'s GitHub
 * paragraph and `/join/`'s two route limits say, because all three are one
 * clause in `0005`, and it names the invited route explicitly: that policy
 * carries the identical clause, and a reader told only about the domain route
 * would reasonably expect an invitation to be the way round it.
 *
 * **This detail once promised a fix nothing performed.** It read "Adding an
 * email sign-in to this account… is what opens both" and sent the reader to
 * `/sign-in/`, which — the state being reachable only while signed in — showed
 * them "Already signed in" and a link back to `/profile/`. A closed trail, from
 * the module whose own rule is that a control whose only outcome is an error
 * must not be offered; a sentence promising an action that exists nowhere is
 * the same defect with no button to grep for. `SignInPanel` now names the limit
 * and offers the sign-out, and this detail says what that sheet actually holds
 * rather than what a reader would have to find on it.
 */
export function noEmailCopy(
  why: NoEmailReason,
): { status: string; detail: string; link: { href: string; label: string } } {
  const profile = { href: '/profile/', label: 'Your profile sheet' }

  switch (why) {
    case 'missing':
      return {
        status: 'NO ADDRESS ON THIS ACCOUNT',
        detail:
          'Both routes into an organisation compare the address on your '
          + 'account, and this account carries none — a sign-in that keeps the '
          + 'address private hands over nothing to compare. Add and confirm an '
          + 'address on your profile sheet, then return here.',
        link: profile,
      }
    case 'unprovenMailbox':
      return {
        status: 'NO EMAIL SIGN-IN ON THIS ACCOUNT',
        detail:
          'Both routes into an organisation ask for one thing before they read '
          + 'anything else: a sign-in by email that the mail service itself '
          + 'completed, which is what opening a link in the mailbox records. '
          + 'This account carries an address from another provider and no email '
          + 'sign-in, so the address is a claim nobody outside that provider '
          + 'has stood behind, and the database refuses the membership row on '
          + 'both routes — an invitation entered by a manager is not a way '
          + 'round it. Nothing on this site adds an email sign-in to an account '
          + 'that already exists; the sign-in sheet names that limit and holds '
          + 'the sign-out this browser needs before the email door is in '
          + 'reach.',
        link: { href: '/sign-in/', label: 'The sign-in sheet' },
      }
    case 'malformed':
      return {
        status: 'NO DOMAIN PART IN ADDRESS',
        detail:
          'The address on your account has no single domain part, so there is '
          + 'nothing to compare against an organisation domain. Change it on '
          + 'your profile sheet, then return here.',
        link: profile,
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
 * - `refused` (`42501`) — neither §14.4.2 policy accepted the row.
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
 * What a failed insert means, in the reader's terms.
 *
 * **It lives here rather than in the component for the reason `JOIN_COPY` does**
 * (§12.14.2): a node test can read it, and the sentence that has to stay true
 * is a sentence about `0005`. The version in `JoinPanel` explained a 42501 as
 * "the organisation domain is no longer the domain on your account, or the
 * invitation was withdrawn" — both temporary, both wrong for the case that
 * actually produced it. `0005` opens both policies with the provider clause, so
 * the first thing a refusal can mean is an account with no email sign-in, which
 * is permanent until the account gains one. `decideJoin` no longer offers that
 * reader anything, so this is the narrow race left over — a sign-in changed, or
 * the row moved, between the read and the click — and the clause is stated
 * first because it is the one the reader cannot see on this screen.
 */
export function joinFailureCopy(failure: JoinFailure, orgName: string): string {
  switch (failure) {
    case 'duplicate':
      return `The membership row for ${orgName} was already there. `
        + 'The list below is the state after re-reading it.'
    case 'refused':
      return `The database refused the row for ${orgName}. Both routes require `
        + 'an email sign-in that the mail service completed, and neither route '
        + 'applied at the moment of writing: this account carries no such '
        + 'sign-in, or the organisation domain is no longer the domain on your '
        + 'account, or the address a manager entered is no longer on record.'
    case 'unknown':
      return `The row for ${orgName} was not written, and the reason given is `
        + 'not one this screen can interpret. Nothing was recorded, in this '
        + 'browser or on the server.'
  }
}

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
