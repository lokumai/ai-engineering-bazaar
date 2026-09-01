/**
 * §14.7 — every decision the sign-in flow makes, in one module with no DOM, no
 * network and no supabase-js import.
 *
 * The three pages of §14.7 that a reader can actually get stuck on are all
 * decisions, not rendering: is this session good enough to say "signed in"?
 * where does the reader go after the round trip through a provider? what does
 * this `error=access_denied&error_code=...` string mean in a sentence a person
 * can act on? Each of those has exactly one wrong-looking answer that ships
 * silently — a page that says SIGNED IN against an expired token, a `?next=`
 * parameter that redirects off-site, a blank callback — so each lives here,
 * where `vitest` can hold it still (§12.14.2, §14.12).
 *
 * **Why nothing here imports `@supabase/supabase-js`.** `lib/supabase/client.ts`
 * is the only module allowed to construct a client, and it is unreachable in
 * node by design. If these functions took a `Session` from the library, testing
 * them would mean constructing one, and the shape would be pinned to a
 * dependency's minor version. Instead they take the narrow structural types
 * below — the fields this codebase actually reads — and the components do the
 * one-line widening at the boundary. supabase-js's own `Session` and `User`
 * satisfy them structurally, so the widening is free and typed.
 *
 * **Why the session is never parsed out of storage here.** supabase-js owns the
 * stored session, its key, its rotation and its cross-tab coordination
 * (`client.ts` records why). Reading that value directly would create a second
 * apparent owner of a record this codebase must not write, and it would go
 * stale the moment the library refreshes a token. Everything below works from
 * what the library hands us, or from a URL.
 */

import type { SupabaseUnavailable } from '@/lib/supabase/env'

// ---------------------------------------------------------------------------
// The session, as this application understands it
// ---------------------------------------------------------------------------

/**
 * The subset of supabase-js's `User` this codebase reads. Structural, so a real
 * `User` is assignable without a cast and a test fixture is three fields.
 *
 * `identities` is here and `user_metadata` is deliberately NOT: see
 * `githubLoginOf`.
 */
export interface RawUser {
  id: string
  email?: string | null
  identities?: readonly RawIdentity[] | null
}

export interface RawIdentity {
  provider: string
  identity_data?: Record<string, unknown> | null
}

/**
 * The subset of supabase-js's `Session` this codebase reads. `expires_at` is
 * seconds since the epoch, which is the library's own unit — converting it here
 * would put a second unit into a system that already has one.
 */
export interface RawSession {
  user: RawUser
  expires_at?: number | null
}

/**
 * §14.8.2 — who is signed in, reduced to the four things any panel on this site
 * needs, and no more. A component that wants a fifth field should be asking the
 * server for a `profiles` row, not widening this: this object is derived from a
 * token in the browser, and §14.8.2 is explicit that the *evidence* side of the
 * declaration/evidence split is `profiles.github_login`, written from OAuth
 * metadata by the database where the user cannot reach it.
 */
export interface SessionUser {
  id: string
  email: string | null
  /**
   * The GitHub handle as the *provider* reported it, or null. See
   * `githubLoginOf` for why this is not yet evidence of anything.
   */
  githubLogin: string | null
  /** `github` · `google` · `email` · whatever else a future deploy enables. */
  provider: string | null
}

/**
 * §1 and §11.25 applied to an asynchronous fact: there are FOUR states here and
 * `unknown` is the load-bearing one.
 *
 * A boolean `signedIn` would force every panel to render one of two claims
 * before it knows either to be true, and the honest answer for the first tick
 * after mount — plus every tick of a slow `getSession()` — is that we have not
 * asked yet. `disabled` is separate again, because "this build has no accounts"
 * is a different sentence from "you are not signed in" and §12.13 forbids two
 * states that do not share a cause sharing their copy.
 */
export type SessionView =
  | { status: 'disabled'; why: SupabaseUnavailable }
  | { status: 'unknown' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: SessionUser; expiresAt: number | null }

/**
 * How far ahead of a token's stated expiry we stop calling it usable.
 *
 * supabase-js refreshes on its own timer, so a session that expires in ten
 * seconds will almost certainly be renewed. "Almost certainly" is the problem:
 * the skew is the width of the window in which this page would print SIGNED IN
 * over a token the next request will reject. Thirty seconds is chosen to be
 * larger than any plausible clock drift between a browser and Supabase and far
 * smaller than the token's own hour, so it costs nothing and closes the window.
 */
export const EXPIRY_SKEW_SECONDS = 30

/**
 * Is this session good enough to make a claim on? A missing `expires_at` counts
 * as usable: the library omits it for a session it is managing, and treating
 * absence as expiry would sign the reader out of a perfectly live session —
 * §1's failure in the direction nobody notices until a reader loses work.
 *
 * An empty `user.id` is NOT usable. It cannot happen through supabase-js, and
 * that is exactly why it is checked: every row in §14.2 is keyed by
 * `auth.users.id`, so an empty id would be a record written against nobody.
 */
export function isSessionUsable(session: RawSession | null, nowMs: number): boolean {
  if (session === null) return false
  if (typeof session.user?.id !== 'string' || session.user.id === '') return false

  const expiresAt = session.expires_at
  if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) return true

  return expiresAt - EXPIRY_SKEW_SECONDS > nowMs / 1000
}

/**
 * §14.8.2 — the GitHub handle from the identity the PROVIDER wrote, never from
 * `user_metadata`.
 *
 * This distinction is the whole reason this function is four lines rather than
 * one. `user_metadata` is writable by the signed-in user through
 * `auth.updateUser()`, so a handle read from there is a claim by the reader —
 * indistinguishable from typing `owner: torvalds` into a submittal, which is
 * the precise abuse §14.8.2 exists to mark. `identities[].identity_data` is
 * written by the OAuth exchange and is not user-writable.
 *
 * Even so, what this returns is only good enough to LABEL a session with. The
 * verification in §14.8.2 compares `Submittal.owner` against
 * `profiles.github_login`, which the database fills from the same metadata on
 * the server side; a browser-derived string must never stand in for it, because
 * the browser is the party being checked.
 */
export function githubLoginOf(user: RawUser): string | null {
  const identities = user.identities ?? []
  const github = identities.find((identity) => identity.provider === 'github')
  if (github === undefined) return null

  // GitHub's OAuth profile calls the handle `user_name`; Supabase also copies it
  // to `preferred_username` for some provider versions. Both are read because
  // which one is present is not this codebase's decision, and neither is
  // trusted further than the label it prints.
  const data = github.identity_data ?? {}
  for (const key of ['user_name', 'preferred_username'] as const) {
    const value = data[key]
    if (typeof value === 'string' && value !== '') return value
  }
  return null
}

/**
 * Which provider this session came through, taken from the identity list rather
 * than from `app_metadata.provider`: a user who has linked two providers has
 * one `app_metadata.provider` and two identities, and naming the first identity
 * is at least a fact about a real linked account.
 */
export function providerOf(user: RawUser): string | null {
  const identities = user.identities ?? []
  return identities[0]?.provider ?? null
}

/** The projection every panel receives. Total, and never throws on a partial row. */
export function describeSessionUser(user: RawUser): SessionUser {
  return {
    id: user.id,
    email: typeof user.email === 'string' && user.email !== '' ? user.email : null,
    githubLogin: githubLoginOf(user),
    provider: providerOf(user),
  }
}

/**
 * The one place a `RawSession` becomes a `SessionView`, so "expired" and
 * "signed out" cannot come to mean different things in two components.
 */
export function viewFromSession(session: RawSession | null, nowMs: number): SessionView {
  if (session === null || !isSessionUsable(session, nowMs)) return { status: 'signedOut' }
  return {
    status: 'signedIn',
    user: describeSessionUser(session.user),
    expiresAt: typeof session.expires_at === 'number' ? session.expires_at : null,
  }
}

// ---------------------------------------------------------------------------
// §14.7 — the providers, and why GitHub is first
// ---------------------------------------------------------------------------

/**
 * The three providers of §14.7, in the order they are drawn.
 *
 * The order is an argument, not a layout preference, and `note` on the first
 * row is where it is made: this audience's submittals ARE GitHub repositories
 * (§12.9), and §14.8.2 turns a GitHub identity into the difference between a
 * submittal whose owner is *verified* and one that was merely typed. A reader
 * who signs in with Google gets an account; a reader who signs in with GitHub
 * gets an account whose work can be checked. That is worth one line of copy
 * above the buttons and it is the only "recommended" this panel says.
 *
 * `id` for the two OAuth rows is the string supabase-js expects in
 * `signInWithOAuth({ provider })`, so no mapping table exists to drift.
 */
export interface ProviderOption {
  id: 'github' | 'google' | 'email'
  label: string
  note: string | null
}

export const SIGN_IN_PROVIDERS: readonly ProviderOption[] = [
  {
    id: 'github',
    label: 'Continue with GitHub',
    note:
      'Your submittals are GitHub repositories, and only a GitHub sign-in lets '
      + 'this site show a submittal as verified rather than merely typed.',
  },
  { id: 'google', label: 'Continue with Google', note: null },
  { id: 'email', label: 'Email a sign-in link', note: null },
]

/**
 * A syntactic plausibility check for the magic-link field, and nothing more.
 *
 * Deliberately not RFC 5322: an address is only ever proved by a link arriving
 * in it, so a stricter regex here can only reject a real address — the one
 * failure mode a sign-in form cannot recover from. This rejects the mistakes
 * that would otherwise cost a reader a round trip and a silent nothing: an
 * empty field, a missing `@`, whitespace, a missing dot in the host.
 */
export function isPlausibleEmail(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > 254) return false
  if (/\s/.test(trimmed)) return false
  const at = trimmed.indexOf('@')
  if (at <= 0 || at !== trimmed.lastIndexOf('@')) return false
  const host = trimmed.slice(at + 1)
  return host.length >= 3 && host.includes('.') && !host.startsWith('.') && !host.endsWith('.')
}

// ---------------------------------------------------------------------------
// §14.7 — the round trip
// ---------------------------------------------------------------------------

/**
 * Where a reader lands when nothing said otherwise.
 *
 * `/profile/` and not `/`: this repo's identity page already exists there, it is
 * where a session's own panels live (`AuthPanels`), and it is therefore the one
 * page on which arriving signed in explains itself. The spec named a new
 * `/account/` route; see this task's report.
 */
export const DEFAULT_RETURN_PATH = '/profile/'

/** The query parameter carrying the return path across the provider round trip. */
export const RETURN_PARAM = 'next'

/**
 * Reduce an untrusted `?next=` to an in-app path, or to the default.
 *
 * This is an open-redirect guard and it is written as an allow-list because a
 * deny-list here has been wrong in every codebase that has tried it. The value
 * arrives in a URL that a third party can hand to a reader, and the reader
 * clicks it *from a sign-in flow* — the moment they are least likely to check
 * the address bar. So the only accepted shape is one leading slash followed by
 * something that is not another slash or backslash: that rejects `//evil.example`
 * and `/\evil.example` (which browsers resolve as protocol-relative hosts),
 * every absolute URL, and every scheme including `javascript:`.
 *
 * A query or fragment is preserved — `/courses/x/?q=1#quiz` is a legitimate
 * destination on this site — but a control character is not, because a raw CR
 * or LF in a path is only ever a smuggling attempt.
 *
 * The path is NOT base-path-prefixed here: it is an app-relative route, which
 * is what `next/link` and `router.replace` take (`lib/url.ts` records why
 * prefixing those doubles the prefix).
 */
export function sanitiseReturnPath(raw: string | null | undefined): string {
  if (typeof raw !== 'string') return DEFAULT_RETURN_PATH
  const value = raw.trim()
  if (value === '') return DEFAULT_RETURN_PATH
  if (/[\u0000-\u001f\u007f]/.test(value)) return DEFAULT_RETURN_PATH
  if (!value.startsWith('/')) return DEFAULT_RETURN_PATH
  if (value.startsWith('//') || value.startsWith('/\\')) return DEFAULT_RETURN_PATH
  return value
}

/**
 * The absolute URL a provider is told to come back to.
 *
 * It has to be absolute — an OAuth `redirect_to` is consumed by Supabase and
 * then by the provider, neither of which has our origin in scope — and it has
 * to carry the base path, because on GitHub Pages the callback page is served
 * under it. So `callbackPath` is passed in already resolved by `lib/url.ts`
 * rather than being rebuilt here: two implementations of the base-path rule is
 * exactly the class of bug §14.9 spends a page on.
 *
 * `origin` and `callbackPath` are arguments rather than reads of
 * `window.location` and `process.env`, which is what makes this testable at
 * all. The return path travels as a query parameter and is re-sanitised on
 * arrival — it crosses two systems in between, and neither is ours.
 */
export function callbackUrl(origin: string, callbackPath: string, returnPath: string): string {
  const url = new URL(callbackPath, origin)
  const safe = sanitiseReturnPath(returnPath)
  if (safe !== DEFAULT_RETURN_PATH) url.searchParams.set(RETURN_PARAM, safe)
  return url.toString()
}

// ---------------------------------------------------------------------------
// §14.7 — the callback page's decision
// ---------------------------------------------------------------------------

/**
 * What the callback URL actually contains.
 *
 * Both the query string AND the fragment are read. The PKCE flow this build
 * uses (`client.ts`) returns `?code=`, but Supabase reports *errors* in the
 * fragment for some failures and in the query for others, and a magic link that
 * has already been used comes back as `#error=access_denied&error_code=otp_expired`.
 * Reading only one of the two is how a reader ends up on a page that says
 * nothing at all, which is the single failure this page exists to prevent.
 *
 * The query wins where both carry the same key: it is the one Supabase controls
 * end-to-end in the PKCE flow.
 */
export interface CallbackParams {
  code: string | null
  /**
   * §14.7 — the implicit pair, when Supabase returned one in the fragment.
   *
   * MEASURED, against a real project: `flowType: 'pkce'` does not make every
   * return trip a PKCE one. A PKCE exchange needs the `code_verifier` that the
   * browser minted when it ASKED, and an emailed link is very often opened
   * somewhere else — requested on a laptop, tapped on a phone. That browser has
   * no verifier, so Supabase's `/auth/v1/verify` redirects with
   * `#access_token=…&refresh_token=…` instead of `?code=…`, supabase-js finds
   * no code to exchange, and the callback waits for a session that will never
   * appear until it times out. Cross-device is the ordinary way people use an
   * email link, so this is the common path, not the exotic one.
   *
   * Accepting a fragment Supabase already sent is not the same decision as
   * CHOOSING the implicit flow, which `client.ts` argues against and still
   * refuses: the tokens are consumed and the fragment is replaced immediately,
   * so nothing is left in history or in a copied link.
   */
  accessToken: string | null
  refreshToken: string | null
  error: string | null
  errorCode: string | null
  errorDescription: string | null
  returnPath: string
}

function firstOf(...values: (string | null)[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value !== '') return value
  }
  return null
}

export function parseCallbackUrl(href: string): CallbackParams {
  let search = new URLSearchParams()
  let hash = new URLSearchParams()
  try {
    const url = new URL(href)
    search = url.searchParams
    // The fragment is `#a=b&c=d` in this flow, so it parses as a query string
    // once the leading `#` is off. A fragment that is a plain anchor yields a
    // single valueless key and every lookup below misses, which is correct.
    hash = new URLSearchParams(url.hash.replace(/^#/, ''))
  } catch {
    // An unparseable href is not a crash: the page falls through to the
    // "nothing to exchange" plan and says so.
  }

  return {
    code: firstOf(search.get('code'), hash.get('code')),
    // Fragment first: Supabase puts the implicit pair only there.
    accessToken: firstOf(hash.get('access_token'), search.get('access_token')),
    refreshToken: firstOf(hash.get('refresh_token'), search.get('refresh_token')),
    error: firstOf(search.get('error'), hash.get('error')),
    errorCode: firstOf(search.get('error_code'), hash.get('error_code')),
    errorDescription: firstOf(
      search.get('error_description'),
      hash.get('error_description'),
    ),
    returnPath: sanitiseReturnPath(
      firstOf(search.get(RETURN_PARAM), hash.get(RETURN_PARAM)),
    ),
  }
}

/**
 * A described failure: an uppercase readout for the panel's status line, and a
 * sentence saying what to do next.
 *
 * Two fields rather than one string because the visual language splits them
 * that way everywhere else (`QUARANTINE_COPY` in `ProfilePanels.tsx` is the
 * same pair for the same reason): the readout is a state, the note is an
 * instruction, and a reader scanning the page needs the first without reading
 * the second.
 */
export interface AuthErrorDescription {
  readout: string
  note: string
}

/**
 * Turn a provider's error into something a person can act on.
 *
 * The provider's own `error_description` is deliberately NOT printed as the
 * note. It is written for a developer reading a log ("Unable to exchange
 * external code"), it is attacker-influenceable in the general case, and it
 * never says what to do. The mapped sentence says what to do; the raw code is
 * kept in the readout so a maintainer reading a screenshot still has the
 * identifier.
 *
 * The three named cases are the three that actually happen. `access_denied` is
 * a reader who pressed Cancel on the consent screen, which is not an error at
 * all and must not be dressed as one. `otp_expired` is a magic link opened
 * twice or opened late — the most common failure in this flow by a wide margin,
 * and the one where a generic message wastes the reader's time. A
 * `server_error` is Supabase's or the provider's, and the only honest advice is
 * to try again.
 */
export function describeAuthError(params: {
  error: string | null
  errorCode: string | null
}): AuthErrorDescription | null {
  const { error, errorCode } = params
  if (error === null && errorCode === null) return null

  const code = (errorCode ?? error ?? '').toLowerCase()

  if (code.includes('otp_expired') || code.includes('expired')) {
    return {
      readout: 'SIGN-IN LINK EXPIRED OR ALREADY USED',
      note:
        'A sign-in link works once and only for a short time. Ask for a new '
        + 'one and open it in this browser.',
    }
  }

  if (code.includes('access_denied')) {
    return {
      readout: 'SIGN-IN CANCELLED',
      note:
        'The provider reported that permission was not granted. Nothing was '
        + 'changed. You can try again, or keep using the site without an '
        + 'account.',
    }
  }

  if (code.includes('server_error') || code.includes('unexpected_failure')) {
    return {
      readout: 'PROVIDER COULD NOT COMPLETE THE SIGN-IN',
      note:
        'This failed on the provider’s side, not in your browser. Nothing was '
        + 'changed. Try again in a moment.',
    }
  }

  return {
    readout: `SIGN-IN FAILED · ${(errorCode ?? error ?? 'UNKNOWN').toUpperCase()}`,
    note:
      'The sign-in could not be completed and nothing was changed. Your record '
      + 'in this browser is untouched. Try again, or keep using the site '
      + 'without an account.',
  }
}

/**
 * How long the callback page waits for supabase-js to report a session before
 * it stops claiming to be working on it.
 *
 * There is a wait at all because `detectSessionInUrl` (see `client.ts`) does
 * the code exchange itself, asynchronously, as the client is constructed —
 * there is no promise this page can await, only an auth state change to
 * observe. Ten seconds is long enough for a slow mobile network to complete one
 * token request and short enough that a reader on a broken deploy is told the
 * truth rather than watched a spinner forever. §1: after this, the page states
 * that it does not know, and offers the way out.
 */
/**
 * §14.7 — which sign-in methods this PROJECT actually has, read from Supabase's
 * own public settings endpoint (`/auth/v1/settings`).
 *
 * THE REASON THIS EXISTS. `SignInPanel` used to offer all three unconditionally,
 * because the code for all three is there. But a provider also has to be
 * configured in the Supabase project, and until it is, pressing its button
 * produces an error from the server. §14.1's own argument against a dead
 * affordance applies to itself: a button that cannot work is worse than no
 * button, because the reader blames themselves.
 *
 * The endpoint is unauthenticated and lists every provider Supabase supports as
 * a boolean, so the panel can offer exactly what exists. It costs one request on
 * one page.
 *
 * `null` on anything unparseable, and the caller then FAILS OPEN — offers
 * everything. That direction is deliberate: hiding a provider that works would
 * lock a reader out of an account they could have had, while offering one that
 * does not leaves them with an error message that is already drawn. Refusing to
 * guess is right when guessing costs data; here it costs a sign-in.
 */
export interface ProviderAvailability {
  github: boolean
  google: boolean
  email: boolean
}

export function parseProviderAvailability(input: unknown): ProviderAvailability | null {
  if (typeof input !== 'object' || input === null) return null
  const external = (input as { external?: unknown }).external
  if (typeof external !== 'object' || external === null) return null
  const flag = (name: string): boolean | null => {
    const value = (external as Record<string, unknown>)[name]
    return typeof value === 'boolean' ? value : null
  }
  const github = flag('github')
  const google = flag('google')
  const email = flag('email')
  // All three have to be readable. A payload that answers for one provider and
  // not another is a shape this code does not understand, and guessing the rest
  // would hide a working provider on the strength of a partial answer.
  if (github === null || google === null || email === null) return null
  return { github, google, email }
}

/** Every provider, for the fail-open path and for a build with no probe yet. */
export const ALL_PROVIDERS: ProviderAvailability = { github: true, google: true, email: true }

export const CALLBACK_TIMEOUT_MS = 10_000

/**
 * What the callback page should do, decided from the URL alone.
 *
 * `nothing` is not a failure and is not drawn as one: it is what a reader sees
 * who bookmarked `/auth/callback/` or reloaded it after the parameters were
 * stripped. The honest response is a page that says there is nothing to
 * complete and offers the way onward — not an error, and certainly not a
 * spinner that never resolves.
 */
export type CallbackPlan =
  | { kind: 'await'; returnPath: string }
  /**
   * §14.7 — a session handed over whole, to be adopted with `setSession`.
   * `await` cannot serve here: there is no code for supabase-js to exchange, so
   * observing `onAuthStateChange` would observe nothing for ever.
   */
  | { kind: 'adopt'; accessToken: string; refreshToken: string; returnPath: string }
  | { kind: 'error'; description: AuthErrorDescription; returnPath: string }
  | { kind: 'nothing'; returnPath: string }

export function planCallback(href: string): CallbackPlan {
  const params = parseCallbackUrl(href)
  const description = describeAuthError(params)
  if (description !== null) {
    return { kind: 'error', description, returnPath: params.returnPath }
  }
  if (params.code !== null) return { kind: 'await', returnPath: params.returnPath }
  // Order matters only in that `code` wins: if both somehow arrive, the PKCE
  // exchange is the one that leaves no token in the URL.
  if (params.accessToken !== null && params.refreshToken !== null) {
    return {
      kind: 'adopt',
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      returnPath: params.returnPath,
    }
  }
  return { kind: 'nothing', returnPath: params.returnPath }
}
