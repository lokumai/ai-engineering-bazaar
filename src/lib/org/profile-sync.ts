/**
 * §14.2.1, §14.8.2 — what a `profiles` row should CONTAIN, decided as a pure
 * function, so that the evidence half of the manager's panel has something to
 * read.
 *
 * The defect this module closes. Nothing in this codebase ever wrote a
 * `profiles` row: every insert and upsert in `src/` targets `record_state`,
 * `learner_event`, `memberships` or the three assignment tables. So
 * `loadProfiles` (`queries.ts`) returned an empty array for every deployment,
 * and three separate promises made elsewhere were therefore false rather than
 * merely unpopulated — `memberLabel` printed `USER 1a2b3c4d` for a colleague
 * whose name the panel was holding, `classifySubmittals(sheet, null)` returned
 * `unattributable` for every submittal of every member for ever, and §13.3's
 * role never appeared next to anybody. §14.8.2's two-column panel had one
 * working column. `SignInPanel`'s own copy — *"only a GitHub sign-in lets this
 * site show a submittal as verified rather than merely typed"* — was, in that
 * build, a claim the build could not keep, which is the §1 failure this repo
 * spends most of its comments avoiding.
 *
 * **Port-shaped, deliberately.** This module holds no client, no session and no
 * `await`. It takes the two things it needs — the reader's record identity block
 * and their auth user — and returns the row; the CALLER performs the write
 * (`§12.14.2`: a decision belongs somewhere `vitest` can hold it still, and the
 * seam belongs to one owner). That also keeps this file importable in node: it
 * pulls in `lib/auth/session`'s structural `RawUser` rather than
 * `@supabase/supabase-js`'s, exactly as that module argues.
 */

import { STORABLE_MARK_IDS, type MarkId } from '@/lib/identity/mark'
import { sanitiseName } from '@/lib/identity/name'
import { ROLE_IDS, type RecordData, type RoleId } from '@/lib/record/schema'

/** §14.2.1's table name, written once so a typo cannot become a second table. */
export const PROFILES_TABLE = 'profiles'

/**
 * §14.2.1 — the row, in the database's own snake_case, with every column but
 * the key OPTIONAL.
 *
 * The optionality is the load-bearing part and it is not a convenience. The
 * caller upserts this object; PostgREST builds its `on conflict do update` set
 * from the KEYS PRESENT in the payload, so a column omitted here keeps whatever
 * the row already holds while a column present as `null` OVERWRITES it with
 * null. That difference decides whether this function can destroy evidence:
 *
 *   · A reader signs in with GitHub. `github_login` is written; their submittals
 *     read `✓ verified` in the panel.
 *   · The same reader later signs in with Google on a different machine. A row
 *     shape with a mandatory `github_login: null` would BLANK the verified
 *     column on the way past, and the panel would start marking honest
 *     submittals `⚠ not the owner` — a false accusation against a colleague,
 *     produced by a sign-in that said nothing about GitHub at all.
 *
 * So this function is ADDITIVE ONLY: it states facts it has, and never asserts
 * the absence of one. Clearing a profile is §14.6's business (account closure
 * cascades from `auth.users`), not a side effect of signing in.
 *
 * `id` is `auth.users.id`. It is required because §14.4.4's `own profile`
 * policy is `id = auth.uid()`: a row keyed by anything else is not a row this
 * client is permitted to write, and would fail as an RLS violation rather than
 * as a bug anyone could read.
 */
export interface ProfileRow {
  id: string
  /** §12.3.4-sanitised display name. Present only when non-empty. */
  display_name?: string
  /** §12.3.5 — 8 lowercase hex, minted once. Present only when well-formed. */
  mark_seed?: string
  /** The reader's glyph override. Absent means "use `mark_seed`" (§12.3.5). */
  mark?: MarkId
  /** One of §13.3's nine frozen ids. */
  role_id?: RoleId
  /**
   * The GitHub handle from the OAuth identity — §14.8.2's evidence column.
   *
   * BE HONEST ABOUT WHAT THIS IS. §14.2.1 says "the user MUST NOT write this"
   * and §14.8.2 treats it as trustworthy, but `0002_phase4_rls.sql` records
   * that v1 cannot deliver that: RLS is ROW level, the `own profile` policy is
   * `for all`, and admitting the owner to their row admits them to every column
   * of it. §14.0 decision 8 rules out the trigger or auth hook that would give
   * this column a writer other than the browser. So:
   *
   *   IS evidence that: the value came from `identities[].identity_data`, which
   *   the OAuth exchange wrote and `auth.updateUser()` cannot touch
   *   (`githubLoginOf` refuses `user_metadata` for exactly this reason). A
   *   reader going through the app, however motivated, gets their real handle.
   *
   *   IS NOT evidence that: nobody `PATCH`ed this column by hand with their own
   *   access token. That request is permitted today. A determined reader can
   *   still write `torvalds` here and have their submittal of Linux marked
   *   verified — the very abuse §14.8.2 exists to mark.
   *
   * That gap is why this comment exists rather than a guarantee. It closes when
   * a writer other than the client exists (`supabase/README.md` carries the
   * column-privilege hardening; a later phase may move the write server-side),
   * and NOT before. Until then the panel's `✓ verified` means "consistent with
   * the identity this account signed in through", which is strictly more than
   * the nothing it can say today, and less than proof.
   */
  github_login?: string
}

/** §12.3.5 — the seed's stored shape. A malformed one is not carried remotely. */
const MARK_SEED = /^[0-9a-f]{8}$/

/**
 * §14.2.1 — the row to write for this reader, or `null` when there is nothing
 * worth writing.
 *
 * **Why `null` and not an empty row.** §11.25's absent-not-empty rule: a
 * `profiles` row containing only an id is worse for the manager than no row at
 * all, because it makes "this person has not told us anything" and "this person
 * has a profile that happens to be blank" indistinguishable on screen, and
 * `TeamMember.profile` is precisely the three-state distinction §14.8 spent a
 * type on. An all-null row also costs the panel a truthful fallback:
 * `memberLabel` can reach for the record's own name when `profile` is `null`,
 * and cannot tell that a present-but-empty `display_name` means the same thing.
 *
 * **Every value is re-checked here, not trusted.** `identity` arrives from
 * `localStorage` via `validate.ts`, which is the honest reader of a store the
 * reader can edit by hand — and this is the moment that value stops being local
 * and starts being something a MANAGER reads about a colleague. A `mark_seed`
 * that is not 8 hex, a `role_id` outside §13.3's nine, a `mark` outside
 * `STORABLE_MARK_IDS`: each is dropped rather than uploaded, so a hand-edited
 * record cannot put an unrenderable value in front of somebody else.
 * `sanitiseName` is idempotent (`identity/name.ts`), so re-applying it to an
 * already-sanitised name costs nothing and covers a record written by an older
 * bundle.
 */
/**
 * What this function needs from a session, and nothing else.
 *
 * Deliberately NOT `RawUser`. `RawUser` declares `identities` optional, which
 * made the projected `SessionUser` — which has no identities at all — an
 * acceptable argument that silently produced a row with no `github_login`. A
 * parameter type that accepts an insufficient value is not a type check.
 *
 * `SessionUser` satisfies this structurally, so the island passes what it has
 * and a `RawUser` has to go through `describeSessionUser` first, which is where
 * `githubLoginOf`'s rules about what counts as evidence live.
 */
export interface ProfileSubject {
  id: string
  githubLogin: string | null
}

export function profileRowFor(
  identity: RecordData['identity'],
  authUser: ProfileSubject,
): ProfileRow | null {
  // §14.4.4 — a row keyed by nobody is not writable and not meaningful. This
  // cannot happen through supabase-js, which is why it is checked: the same
  // stance `isSessionUsable` takes on the same field.
  const id = typeof authUser.id === 'string' ? authUser.id.trim() : ''
  if (id === '') return null

  const row: ProfileRow = { id }

  const name = typeof identity.name === 'string' ? sanitiseName(identity.name) : ''
  if (name !== '') row.display_name = name

  const seed = typeof identity.markSeed === 'string' ? identity.markSeed.trim() : ''
  if (MARK_SEED.test(seed)) row.mark_seed = seed

  // `mark: null` is not "no mark", it is §12.3.5's "use the minted seed". An
  // omitted column says the same thing, so the two agree by construction.
  if (identity.mark !== null && STORABLE_MARK_IDS.includes(identity.mark)) {
    row.mark = identity.mark
  }

  if (identity.role !== null && ROLE_IDS.includes(identity.role)) {
    row.role_id = identity.role
  }

  // ALREADY RESOLVED by `describeSessionUser`, never re-derived here.
  //
  // This function used to call `githubLoginOf(authUser)` itself, and the effect
  // was that `github_login` was NEVER written in production. The caller has a
  // `SessionUser` — the projection every panel receives — which keeps
  // `githubLogin` and discards `identities`; `githubLoginOf` reads `identities`,
  // found none, and returned null every time. It typechecked because `RawUser`
  // declares `identities` optional, so the projection satisfied the parameter
  // while carrying nothing it needed.
  //
  // §14.8.2's evidence column compares `Submittal.owner` against
  // `profiles.github_login`, so the column being permanently absent meant no
  // submittal could ever resolve as attributable. Taking the resolved value is
  // what closes the boundary: there is now nothing for a caller to hand over
  // that looks sufficient and is not.
  const login = authUser.githubLogin
  if (typeof login === 'string' && login.trim() !== '') row.github_login = login.trim()

  // Nothing but the key: §11.25 again. Say nothing rather than say blank.
  return Object.keys(row).length > 1 ? row : null
}

/**
 * Does this row change anything the server already has?
 *
 * Offered because the caller runs on a session event, and §14.7 keeps
 * `localStorage` authoritative — which means the session island may compute the
 * same row on every mount, every tab focus and every token refresh. Sending an
 * identical upsert each time is not incorrect, it is noise, and noise in a
 * write path is the thing that later gets rate-limited at the worst moment.
 *
 * The comparison is against the projection `loadProfiles` returns rather than
 * against a `ProfileRow`, because that projection is what the caller can
 * actually hold: it is the only read of this table in the codebase. It carries
 * no `mark_seed` and no `mark`, so those two columns cannot be compared and are
 * treated as always worth sending — an honest limit, stated, rather than a
 * comparison that quietly skips a real change. Widening `loadProfiles`'
 * `select` would fix that, and is a change to a file this task does not own.
 */
export function profileRowIsRedundant(
  row: ProfileRow,
  known: { displayName: string | null; githubLogin: string | null; roleId: string | null } | null,
): boolean {
  if (known === null) return false
  // Unknowable from the current projection, so never claim redundancy.
  if (row.mark_seed !== undefined || row.mark !== undefined) return false
  const same = (value: string | undefined, stored: string | null): boolean =>
    value === undefined || value === stored
  return (
    same(row.display_name, known.displayName)
    && same(row.github_login, known.githubLogin)
    && same(row.role_id, known.roleId)
  )
}
