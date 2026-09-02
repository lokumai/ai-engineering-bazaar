'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { SessionProvider, useSession } from '@/components/auth/SessionProvider'
import {
  CALLBACK_TIMEOUT_MS,
  type CallbackPlan,
  planCallback,
} from '@/lib/auth/session'
import {
  ACCOUNTS_NOT_ENABLED,
  AuthShell,
  type AuthChrome,
} from '@/components/auth/SignInPanel'
import { supabaseBrowser } from '@/lib/supabase/client'

/**
 * §14.7 — the account panels, and the callback page's body.
 *
 * **Why these are panels and not a route.** §14.7 and §14.8 name a new
 * account page. There is none, and there will not be one: this repo already
 * has `/profile/` (§12.11), which is the
 * drafter's own sheet: identity, mark, role, the submittal register, what this
 * browser has stored, and the export/erase controls. Two identity pages is a
 * worse site than one — a reader who wants "my stuff" would have to know which
 * half of it lives where, and every §12.15 control would have to be reachable
 * from both or explained on neither. So the account surface is exported as
 * panels that drop into the existing sheet. See this task's report: the wiring
 * into `ProfilePanels.tsx` / `app/profile/page.tsx` is owed and deliberately not
 * done here.
 *
 * **Why the callback body is here too.** `app/auth/callback/page.tsx` has to be
 * a server component so it can carry `metadata` — in particular
 * `robots: noindex`, because a URL that only ever exists mid-flow with a
 * single-use code in it has no business in an index. A server component cannot
 * hold the flow, so the flow is a client panel, and this is the file the auth
 * client panels live in.
 *
 * Every panel below is Channel B by construction (§12.2): each renders its
 * honest "not asked yet" state on the first pass, identically on the server and
 * in the browser, and only an effect changes that.
 */

const NO_READING = '--'

/**
 * §12.11's own device for an absent value, reused rather than reinvented: a
 * dashed hairline that reads as "not yet" everywhere else on the sheet. Kept
 * local because `ProfilePanels.tsx` keeps its copy local for the same reason —
 * exporting it would make one component's private drawing convention an API.
 */
function Unsigned({ children }: { children: string }) {
  return (
    <span className="inline-block border border-dashed border-line-strong px-1.5 text-ink-faint">
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// §14.7 — the session, and the way out of it
// ---------------------------------------------------------------------------

/**
 * The current session, printed as facts rather than as a greeting.
 *
 * The GitHub handle carries the word `UNVERIFIED HERE` beside it, and that is
 * not modesty. §14.8.2 puts the declaration/evidence split at the centre of the
 * manager panel, and the evidence side is `profiles.github_login` — written by
 * the database from OAuth metadata, where the reader cannot reach it. What this
 * panel has is a handle read out of the session in the browser, which is the
 * right thing to LABEL a session with and the wrong thing to call proof. A
 * panel that printed it as verified would be the first crack in the one
 * mechanism §14.8.2 builds.
 */
export function AccountPanel({ chrome = 'panel' }: { chrome?: AuthChrome }) {
  const session = useSession()

  if (session === null) {
    // A wiring bug, said out loud rather than rendered as a reader-facing
    // state. `SessionProvider` records why this is not a permanent "checking".
    return (
      <AuthShell chrome={chrome} headingId="hl-account-head" heading="Account">
        <p className="hl-mark m-0 text-ink-muted">NO SESSION IS BEING TRACKED ON THIS PAGE</p>
      </AuthShell>
    )
  }

  const { view, error, signOut } = session

  return (
    <AuthShell
      chrome={chrome}
      headingId="hl-account-head"
      heading="Account"
      mark={
        <p className="hl-mark m-0 text-ink-faint">
          {view.status === 'signedIn'
            ? 'RECORD CONNECTED TO AN ACCOUNT'
            : 'THIS BROWSER ONLY'}
        </p>
      }
    >
      <dl className="hl-defs">
        <dt>Session</dt>
        <dd aria-live="polite">
          {view.status === 'unknown' && 'CHECKING'}
          {view.status === 'disabled' && <Unsigned>{ACCOUNTS_NOT_ENABLED}</Unsigned>}
          {view.status === 'signedOut' && <Unsigned>NOT SIGNED IN</Unsigned>}
          {view.status === 'signedIn' && 'SIGNED IN'}
        </dd>

        <dt>Provider</dt>
        <dd>
          {view.status === 'signedIn'
            ? (view.user.provider ?? <Unsigned>NOT REPORTED</Unsigned>)
            : NO_READING}
        </dd>

        <dt>Email</dt>
        <dd>
          {view.status === 'signedIn'
            ? (view.user.email ?? <Unsigned>HIDDEN BY THE PROVIDER</Unsigned>)
            : NO_READING}
        </dd>

        <dt>GitHub</dt>
        <dd>
          {view.status !== 'signedIn' ? (
            NO_READING
          ) : view.user.githubLogin === null ? (
            <Unsigned>NO GITHUB IDENTITY ON THIS ACCOUNT</Unsigned>
          ) : (
            <>
              {view.user.githubLogin}
              <span className="ml-2 text-ink-faint">UNVERIFIED HERE</span>
            </>
          )}
        </dd>
      </dl>

      {view.status === 'signedIn' && (
        <p className="mt-4 mb-0 max-w-[var(--width-prose)] font-display text-meta leading-normal text-ink-muted">
          Signing out clears the session from this browser. It does not delete
          anything: your record stays in this browser, and the copy connected to
          this account stays on the account. The erase control on this sheet is
          the one that deletes.
        </p>
      )}

      <div className="hl-signoff-actions mt-4">
        {view.status === 'signedOut' && (
          <Link className="hl-btn" href="/sign-in/">
            Sign in
          </Link>
        )}
        {view.status === 'signedIn' && (
          <button type="button" className="hl-btn" onClick={() => void signOut()}>
            Sign out of this browser
          </button>
        )}
      </div>

      {error !== null && (
        <div className="hl-note" role="alert">
          <p>
            The account could not be read, so this panel is not claiming to
            know its state. Nothing was changed.
          </p>
          <p className="hl-mark text-ink-muted">REPORTED · {error}</p>
        </div>
      )}
    </AuthShell>
  )
}

// ---------------------------------------------------------------------------
// §14.2.1, §14.5 — organisations, read-only
// ---------------------------------------------------------------------------

/** One `memberships` row as this panel needs it. */
interface Membership {
  orgId: string
  orgName: string | null
  joinedAt: string | null
}

type MembershipState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'loaded'; rows: readonly Membership[] }
  | { kind: 'failed'; message: string }

/**
 * §14.2.1 and §14.4.2 — which organisations this account belongs to. READ ONLY
 * in this slice: no join control, no leave control, no manager affordance.
 *
 * That is a scope decision and worth recording, because the missing control is
 * the interesting one. Joining carries §14.5.1's disclosure debt — the reader
 * has to be told, *before the click*, that an organisation's managers will see
 * their whole record, every quiz attempt and every submittal, and that leaving
 * does not withdraw the history. A join button that ships before that sentence
 * ships is the §1 violation §14.5.1 was written to prevent, so this panel lists
 * and stops.
 *
 * **`eq('user_id', …)` is load-bearing, and the comment that used to stand here
 * said the opposite.** It claimed RLS (§14.4.2) already restricts `memberships`
 * to the caller's own rows, so no filter could be got wrong. That is false.
 * §14.4.2 grants `memberships` TWO select policies: "own membership is visible"
 * AND "manager sees the org's members". A reader who manages a twenty-person
 * organisation therefore selects twenty rows, and an unfiltered query renders
 * them all under a heading that says these are the organisations THIS ACCOUNT
 * belongs to — nineteen memberships that are not the reader's, nineteen
 * duplicate React keys on one `org_id`, and a JOINED date belonging to somebody
 * else. So the filter is not defence in depth; it is the only thing that makes
 * the heading true. `lib/org/join.ts` documents the same trap on
 * `listMemberOrgIds`, which is the tested precedent this follows.
 *
 * The query stays inline rather than moving to `createOrgJoinStore`: that port
 * returns `org_id` alone, and this panel prints the organisation's name and the
 * date it was joined. Reusing it would mean a second round trip per row to
 * recover the two columns this panel exists to show, so the shape — one select
 * with the embedded `orgs(name)` resolved through the foreign key — is kept and
 * the filter is copied instead.
 *
 * The panel remains READ ONLY, so a wrong row could never have been written
 * from here; it could only ever have been reported, which under §1 is the
 * failure that matters.
 */
export function OrgMembershipPanel({ chrome = 'panel' }: { chrome?: AuthChrome }) {
  const session = useSession()
  const [state, setState] = useState<MembershipState>({ kind: 'idle' })
  const status = session?.view.status ?? 'unknown'
  /**
   * The effect keys off the user ID rather than off `status`, because the ID is
   * what the query needs and it is also the thing that can change while
   * `status` does not: sign out and back in as somebody else and `status` reads
   * `signedIn` throughout. Keyed on `status`, the list from the previous
   * account would stay on screen.
   */
  const userId = session?.view.status === 'signedIn' ? session.view.user.id : null

  useEffect(() => {
    if (userId === null) {
      setState({ kind: 'idle' })
      return
    }

    const client = supabaseBrowser()
    if (client === null) return

    let live = true
    setState({ kind: 'loading' })

    void (async () => {
      const { data, error } = await client
        .from('memberships')
        .select('org_id, joined_at, orgs(name)')
        // See the note above the panel: without this, a manager reads the whole
        // organisation's rows and this list reports them as their own.
        .eq('user_id', userId)
      if (!live) return
      if (error !== null) {
        setState({ kind: 'failed', message: error.message })
        return
      }
      setState({ kind: 'loaded', rows: normaliseMemberships(data) })
    })()

    return () => {
      live = false
    }
  }, [userId])

  return (
    <AuthShell
      chrome={chrome}
      headingId="hl-orgs-head"
      heading="Organisations"
      mark={<p className="hl-mark m-0 text-ink-faint">READ ONLY IN THIS REVISION</p>}
    >
      {status !== 'signedIn' ? (
        /**
         * §16.4.1 — three statuses, because the summary that folds this body
         * has three and a fold may not contradict the line that was folded.
         *
         * **What the old code claimed.** It read the reader as either
         * `unknown` or signed out, so on the shipped default — accounts off —
         * this body printed `NOT SIGNED IN · NO MEMBERSHIP TO REPORT` while the
         * register row it sits in summarised the same state as
         * `ACCOUNTS NOT ENABLED YET`. Both sentences were defensible alone and
         * together they were a contradiction: nobody is signed out of a
         * deployment that has no sign-in, and opening the row disagreed with
         * the row.
         *
         * The disabled string is imported rather than retyped for the reason
         * `ACCOUNTS_NOT_ENABLED`'s own header gives: the summary above reads
         * from that same author, so the two cannot drift into a second
         * spelling.
         */
        <p className="hl-mark m-0 text-ink-muted">
          {status === 'unknown'
            ? 'CHECKING'
            : status === 'disabled'
              ? ACCOUNTS_NOT_ENABLED
              : 'NOT SIGNED IN · NO MEMBERSHIP TO REPORT'}
        </p>
      ) : state.kind === 'loading' || state.kind === 'idle' ? (
        <p className="hl-mark m-0 text-ink-muted" aria-live="polite">
          READING MEMBERSHIPS
        </p>
      ) : state.kind === 'failed' ? (
        <div className="hl-note" role="alert">
          <p>
            The membership list could not be read, so none is shown. This is not
            a statement that you belong to no organisation — it is a statement
            that this page does not know.
          </p>
          <p className="hl-mark text-ink-muted">REPORTED · {state.message}</p>
        </div>
      ) : state.rows.length === 0 ? (
        <p className="hl-submittal-empty">
          NOT A MEMBER OF ANY ORGANISATION. NOBODY BUT YOU CAN SEE THIS RECORD.
        </p>
      ) : (
        <ul className="hl-submittal-list">
          {state.rows.map((row) => (
            <li className="hl-submittal-item" key={row.orgId}>
              <div className="min-w-0 flex-1">
                <p className="hl-submittal-repo m-0">
                  {row.orgName ?? row.orgId}
                </p>
                <p className="hl-submittal-commit">
                  {row.joinedAt === null ? 'JOINED · NOT RECORDED' : `JOINED ${row.joinedAt}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {status === 'signedIn' && state.kind === 'loaded' && state.rows.length > 0 && (
        <div className="hl-note">
          <p>
            Managers of the organisations listed above can see your whole record:
            the sheets you have signed off, every quiz attempt, your submittals
            and your timeline. Erasing your record in this browser does not
            withdraw the history an organisation already holds.
          </p>
        </div>
      )}
    </AuthShell>
  )
}

/**
 * A `jsonb`-adjacent shape from PostgREST is `unknown` until something checks
 * it, and this is the something. An embedded relation comes back as an object
 * or as an array depending on how PostgREST reads the cardinality of the
 * foreign key, and it has changed which one it picks between releases — so both
 * are accepted here rather than pinned to whichever one today's schema cache
 * infers. A row whose `org_id` is not a string is dropped: a membership with no
 * organisation is not a fact worth printing.
 */
function normaliseMemberships(rows: unknown): readonly Membership[] {
  if (!Array.isArray(rows)) return []
  const out: Membership[] = []
  for (const raw of rows) {
    if (typeof raw !== 'object' || raw === null) continue
    const row = raw as Record<string, unknown>
    const orgId = row.org_id
    if (typeof orgId !== 'string' || orgId === '') continue

    const embedded = Array.isArray(row.orgs) ? row.orgs[0] : row.orgs
    const name =
      typeof embedded === 'object' && embedded !== null
        ? (embedded as Record<string, unknown>).name
        : null

    out.push({
      orgId,
      orgName: typeof name === 'string' && name !== '' ? name : null,
      joinedAt: typeof row.joined_at === 'string' ? row.joined_at : null,
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// §14.7 — both panels, with their own provider
// ---------------------------------------------------------------------------

/**
 * What `/profile/` drops in: one tag, its own `SessionProvider`.
 *
 * The provider is here rather than in the root layout on purpose. A layout-wide
 * provider would put an auth client on all 32 sheets, where nothing consumes
 * it — one more thing to go wrong on a page that has no accounts in it — and
 * §12.2's rule is that channel B islands are mounted where they are needed.
 * `supabaseBrowser()` caches, so a later decision to hoist the provider costs
 * nothing and breaks nothing.
 *
 * §16 splits the pair up — the account half moves into the drafter block and
 * the organisation half becomes a register row — so this wrapper's remaining
 * value is the provider, and `chrome` is passed through rather than fixed here.
 * Both halves in `inline` chrome would emit two heading-less blocks in a row,
 * which is why §16's page calls the two panels separately inside one provider
 * instead of calling this.
 */
export function AuthPanels({ chrome = 'panel' }: { chrome?: AuthChrome }) {
  return (
    <SessionProvider>
      <AccountPanel chrome={chrome} />
      <OrgMembershipPanel chrome={chrome} />
    </SessionProvider>
  )
}

// ---------------------------------------------------------------------------
// §14.7 — the callback
// ---------------------------------------------------------------------------

/**
 * The body of `/auth/callback/`: hand the URL back to supabase-js, then put the
 * reader where they were going.
 *
 * **There is no `exchangeCodeForSession` call here, and that is deliberate.**
 * `client.ts` constructs the client with `detectSessionInUrl: true`, which is
 * required for this flow — the exchange has to happen client-side because
 * §14.0/8 forbids functions, so there is no route handler to do it. That option
 * means the library performs the exchange itself, asynchronously, while the
 * client is being constructed. Calling `exchangeCodeForSession` as well would
 * race it for a single-use code and a single-use PKCE verifier, and the loser
 * reports a failure for a sign-in that actually succeeded. So this panel
 * OBSERVES: it constructs the client (which starts the exchange) and waits for
 * `onAuthStateChange` or `getSession()` to report the result.
 *
 * **Waiting needs a bound.** Without one, a broken deploy shows a reader a
 * spinner forever, which is a page claiming to be working when it has stopped.
 * `CALLBACK_TIMEOUT_MS` is the bound and `session.ts` records its size; after it
 * the page states what it does not know and offers the way out.
 *
 * **The error path is drawn, never swallowed.** `planCallback` reads both the
 * query and the fragment, because Supabase reports some failures in one and
 * some in the other; an expired magic link is by far the most common and it
 * arrives in the fragment.
 */
export function CallbackPanel() {
  return (
    <SessionProvider>
      <CallbackBody />
    </SessionProvider>
  )
}

type CallbackPhase =
  | { kind: 'reading' }
  | { kind: 'waiting'; returnPath: string }
  | { kind: 'error'; readout: string; note: string; returnPath: string }
  | { kind: 'nothing'; returnPath: string }
  | { kind: 'done'; returnPath: string }

function CallbackBody() {
  const session = useSession()
  const router = useRouter()
  const [phase, setPhase] = useState<CallbackPhase>({ kind: 'reading' })
  const status = session?.view.status ?? 'unknown'

  /**
   * The URL is read in an effect, not in render: §12.2 forbids `window` in a
   * render path, and this page is prerendered into a static file like every
   * other. The plan is derived once — the URL does not change under us, and
   * supabase-js strips the code from it after the exchange, so re-deriving
   * later would turn a successful sign-in into "nothing to complete".
   */
  useEffect(() => {
    const plan: CallbackPlan = planCallback(window.location.href)
    if (plan.kind === 'error') {
      setPhase({
        kind: 'error',
        readout: plan.description.readout,
        note: plan.description.note,
        returnPath: plan.returnPath,
      })
      return
    }
    if (plan.kind === 'nothing') {
      setPhase({ kind: 'nothing', returnPath: plan.returnPath })
      return
    }

    setPhase({ kind: 'waiting', returnPath: plan.returnPath })

    if (plan.kind === 'adopt') {
      // §14.7 — Supabase handed the session over whole, because this browser is
      // not the one that asked (see `CallbackParams.accessToken`). There is no
      // code to exchange, so nothing will arrive on its own and the page would
      // wait out its timeout on a sign-in that in fact succeeded.
      //
      // The fragment is replaced BEFORE the tokens are used, not after: it is
      // the only step that has to happen whatever `setSession` returns, and a
      // refresh token sitting in `location.hash` is readable by anything that
      // reads the URL. `history.replaceState` and not `router.replace`, so the
      // reader's Back press does not land on a spent link.
      const { accessToken, refreshToken } = plan
      window.history.replaceState(null, '', window.location.pathname + window.location.search)

      const client = supabaseBrowser()
      if (client === null) {
        setPhase({
          kind: 'error',
          readout: 'ACCOUNTS ARE NOT ENABLED HERE',
          note:
            'The link arrived complete, but this deployment carries no backend, '
            + 'so there is nothing to sign in to. Nothing was changed.',
          returnPath: plan.returnPath,
        })
        return
      }

      void client.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error === null) return
          setPhase({
            kind: 'error',
            readout: 'THE LINK COULD NOT BE USED',
            note:
              'The provider returned a session this browser refused. An emailed '
              + 'link can only be used once, and it expires. Nothing was '
              + 'changed — ask for a new link.',
            returnPath: plan.returnPath,
          })
        })
      // The provider above is subscribed; a successful `setSession` reaches the
      // page the same way an exchange would, through `onAuthStateChange`.
      return
    }

    // Constructing the client is what starts the exchange. Nothing is awaited:
    // the provider above is already subscribed to the result.
    void supabaseBrowser()

    const timer = window.setTimeout(() => {
      setPhase((current) =>
        current.kind === 'waiting'
          ? {
              kind: 'error',
              readout: 'SIGN-IN DID NOT COMPLETE IN TIME',
              note:
                'The provider returned here, but no session appeared in this '
                + 'browser. Nothing was changed. Try signing in again; if this '
                + 'repeats, third-party storage may be blocked for this site.',
              returnPath: current.returnPath,
            }
          : current,
      )
    }, CALLBACK_TIMEOUT_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  const goOn = useCallback(
    (returnPath: string) => {
      router.replace(returnPath)
    },
    [router],
  )

  /**
   * The return trip. `router.replace`, not `push`: the callback URL held a
   * single-use code, and leaving it in the history means a Back press lands on
   * a code that is spent and an error that is not one.
   */
  useEffect(() => {
    if (phase.kind !== 'waiting') return
    if (status !== 'signedIn') return
    setPhase({ kind: 'done', returnPath: phase.returnPath })
    goOn(phase.returnPath)
  }, [phase, status, goOn])

  return (
    <section className="hl-panel" aria-labelledby="hl-callback-head">
      <div className="hl-panel-head">
        <h2 id="hl-callback-head" className="hl-panel-title">
          Completing sign-in
        </h2>
      </div>

      <p className="hl-mark m-0 text-ink-muted" aria-live="polite">
        {phase.kind === 'reading' && 'READING THE RETURN ADDRESS'}
        {phase.kind === 'waiting' && 'EXCHANGING THE SIGN-IN CODE'}
        {phase.kind === 'done' && 'SIGNED IN · RETURNING'}
        {phase.kind === 'nothing' && 'NOTHING TO COMPLETE ON THIS PAGE'}
        {phase.kind === 'error' && phase.readout}
      </p>

      {phase.kind === 'nothing' && (
        <div className="hl-note">
          <p>
            This page only does something when a sign-in provider sends a reader
            back to it, and this visit carries nothing to complete. Nothing was
            changed.
          </p>
        </div>
      )}

      {phase.kind === 'error' && (
        <div className="hl-note" role="alert">
          <p>{phase.note}</p>
        </div>
      )}

      {(phase.kind === 'error' || phase.kind === 'nothing') && (
        <div className="hl-signoff-actions mt-4">
          <Link className="hl-btn" href="/sign-in/">
            Back to sign in
          </Link>
          <Link className="hl-btn" href={phase.returnPath}>
            Continue without signing in
          </Link>
        </div>
      )}
    </section>
  )
}
