'use client'

import Link from 'next/link'
import { supabaseEnv } from '@/lib/supabase/env'
import { useEffect, useState } from 'react'
import { useSession } from '@/components/auth/SessionProvider'
import {
  DEFAULT_RETURN_PATH,
  RETURN_PARAM,
  ALL_PROVIDERS,
  SIGN_IN_PROVIDERS,
  carriesEmailIdentity,
  parseProviderAvailability,
  type ProviderAvailability,
  callbackUrl,
  isPlausibleEmail,
  sanitiseReturnPath,
  type ProviderOption,
} from '@/lib/auth/session'
import { supabaseBrowser } from '@/lib/supabase/client'
import { href } from '@/lib/url'

/**
 * §14.7 — the sign-in panel: three providers, GitHub first, and one line saying
 * why GitHub is first.
 *
 * **Why the order is argued rather than styled.** §14.0/3 keeps sign-in
 * optional and anonymous use alive, so this panel is never a gate — it is an
 * offer, and an offer has to say what it buys. §14.8.2 is what it buys: a
 * GitHub identity is the only thing on this site that turns a submittal from
 * "typed" into "verified", because `profiles.github_login` comes from OAuth
 * metadata the reader cannot write. A "recommended" badge would assert that
 * without explaining it; the sentence explains it and then the reader decides.
 * There is no other emphasis, no primary/secondary colour split between the
 * three buttons, and Google and email carry no apology.
 *
 * **Every network call is in a handler, never in a render.** This is a static
 * export: `supabaseBrowser()` is unreachable from a render path by contract
 * (`client.ts`), so the panel prerenders as three buttons and a field whether
 * or not a backend exists, and only a press reaches the library.
 *
 * **The `?next=` round trip.** A "sign in to continue" link elsewhere on the
 * site may carry `?next=/courses/x/`. It is read in an effect (channel B — a
 * render must not read `window.location` per §12.2), re-sanitised on arrival
 * (`session.ts` records the open-redirect argument), and handed to Supabase as
 * part of `redirectTo`. It is sanitised twice on purpose: once here and once on
 * the callback page, because in between it has passed through Supabase and a
 * third-party provider, and neither is ours.
 */

/** The one destination `redirectTo` may ever name. */
const CALLBACK_ROUTE = '/auth/callback/'

/**
 * §12.13, §14.1 — what a build with no accounts says, in the words of the state
 * it is actually in.
 *
 * `flagOff` is not a fault: §14.1 makes `bazaar.lokumai.com` a precondition and
 * `env.ts` makes the flag default to off precisely so that a deploy which
 * forgets it ships the safe configuration. So that row reads as a plan, not an
 * error. The other three rows are misconfigurations, and they are told apart
 * because a maintainer looking at this page is the only person who can fix
 * them, and "not enabled" would hide the difference.
 */
const UNAVAILABLE_COPY = {
  flagOff: {
    readout: 'ACCOUNTS NOT ENABLED YET',
    note:
      'Sign-in is not switched on for this deployment. Everything on this site '
      + 'works without an account: your record is kept in this browser, and the '
      + 'profile sheet can export it to a file you keep.',
  },
  missingUrl: {
    readout: 'ACCOUNTS ENABLED BUT NOT CONFIGURED · NO PROJECT URL',
    note:
      'This build was told accounts are on, but no Supabase URL reached it. '
      + 'Nothing can be signed into until the deployment carries one. Your '
      + 'record in this browser is unaffected.',
  },
  missingKey: {
    readout: 'ACCOUNTS ENABLED BUT NOT CONFIGURED · NO PUBLIC KEY',
    note:
      'This build was told accounts are on, but no Supabase anon key reached '
      + 'it. Nothing can be signed into until the deployment carries one. Your '
      + 'record in this browser is unaffected.',
  },
  malformedUrl: {
    readout: 'ACCOUNTS ENABLED BUT NOT CONFIGURED · PROJECT URL UNUSABLE',
    note:
      'The Supabase URL this build carries is not an absolute http or https '
      + 'address, so no request can be aimed at it. Your record in this browser '
      + 'is unaffected.',
  },
} as const

/**
 * What the panel is doing right now.
 *
 * `sent` is a state and not a toast: a magic link that has been sent is the one
 * moment in this flow where the next step happens in another application
 * entirely, and a message that fades away leaves the reader wondering whether
 * they asked. `working` names the provider so two presses cannot both look busy.
 */
type Phase =
  | { kind: 'idle' }
  | { kind: 'working'; provider: ProviderOption['id'] }
  | { kind: 'sent'; email: string }
  | { kind: 'failed'; message: string }

export function SignInPanel() {
  const session = useSession()
  const [returnPath, setReturnPath] = useState<string>(DEFAULT_RETURN_PATH)
  const [email, setEmail] = useState('')
  const [emailInvalid, setEmailInvalid] = useState(false)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  /**
   * §14.7 — which providers this project actually has. `null` while the answer
   * is in flight, which is a state the panel SAYS rather than papering over
   * (§11.25): offering three buttons and then removing two is worse than
   * spending a moment not offering any.
   */
  const [available, setAvailable] = useState<ProviderAvailability | null>(null)

  useEffect(() => {
    const asked = new URLSearchParams(window.location.search).get(RETURN_PARAM)
    setReturnPath(sanitiseReturnPath(asked))
  }, [])

  useEffect(() => {
    const env = supabaseEnv()
    if (env.kind !== 'ready') return
    let cancelled = false
    // Unauthenticated, and one request on one page. `apikey` is still sent
    // because PostgREST's gateway wants it on every route.
    void fetch(`${env.url}/auth/v1/settings`, { headers: { apikey: env.publishableKey } })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (cancelled) return
        // Fail open: an unreadable answer must not hide a provider that works.
        // Being locked out of an account you could have had is a worse outcome
        // than a button whose error message is already drawn.
        setAvailable(parseProviderAvailability(body) ?? ALL_PROVIDERS)
      })
      .catch(() => {
        if (!cancelled) setAvailable(ALL_PROVIDERS)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const view = session?.view ?? { status: 'unknown' as const }

  if (view.status === 'disabled') {
    const copy = UNAVAILABLE_COPY[view.why]
    return (
      <section className="hl-panel" aria-labelledby="hl-signin-state">
        <div className="hl-panel-head">
          <h2 id="hl-signin-state" className="hl-panel-title">
            Accounts
          </h2>
        </div>
        <p className="hl-mark m-0 text-ink-muted">{copy.readout}</p>
        <div className="hl-note">
          <p>{copy.note}</p>
        </div>
        <p className="mt-4 mb-0 font-display text-meta text-ink-muted">
          <Link href="/profile/">Go to the profile sheet</Link>
        </p>
      </section>
    )
  }

  /**
   * §1 — while the answer is in flight the page says so. It does not draw three
   * sign-in buttons that might be about to become "you are already signed in",
   * and it does not draw a signed-out state it has not established.
   */
  if (view.status === 'unknown') {
    return (
      <section className="hl-panel" aria-labelledby="hl-signin-state">
        <div className="hl-panel-head">
          <h2 id="hl-signin-state" className="hl-panel-title">
            Accounts
          </h2>
        </div>
        <p className="hl-mark m-0 text-ink-muted" aria-live="polite">
          CHECKING WHETHER THIS BROWSER IS SIGNED IN
        </p>
      </section>
    )
  }

  if (view.status === 'signedIn') {
    /**
     * §14.5 — the reader `/join/` sends here, and why this branch grew a
     * control.
     *
     * `unprovenMailbox` can only happen while signed in, and its copy told the
     * reader to add an email sign-in and pointed at this sheet. This sheet
     * answered "Already signed in" and offered a link back to `/profile/`: the
     * one reader who needed something from `/sign-in/` was the one reader it
     * had nothing for, and the trail `/join/ → /sign-in/ → /profile/` closed on
     * itself.
     *
     * **What is offered, and what was rejected.** `auth.linkIdentity` would add
     * the identity to this account in one press, and it is rejected: it needs
     * manual linking enabled in the project, this build cannot detect whether
     * it is, and `lib/org/join.ts`'s own rule forbids a control whose only
     * outcome may be an error. So the offer is the one thing that works on any
     * deployment — sign out, and the email door below is reachable. What that
     * lands on is stated rather than promised: whether the address arrives back
     * on this same account is the provider's linking behaviour, which this site
     * neither sets nor can read.
     */
    const needsMailbox = !carriesEmailIdentity(view.user)

    return (
      <section className="hl-panel" aria-labelledby="hl-signin-state">
        <div className="hl-panel-head">
          <h2 id="hl-signin-state" className="hl-panel-title">
            Already signed in
          </h2>
          <p className="hl-mark m-0 text-ink-faint">
            {view.user.githubLogin ?? view.user.email ?? 'SESSION ACTIVE'}
          </p>
        </div>
        <p className="mt-0 mb-4 max-w-[var(--width-prose)] font-display text-meta leading-normal text-ink-muted">
          This browser already holds a session. The profile sheet shows whose it
          is, what it is connected to, and how to sign out of it.
        </p>

        {needsMailbox && (
          <div className="mb-4" data-hl-needs-mailbox="1">
            <p className="hl-mark mt-0 mb-2 text-ink">NO EMAIL SIGN-IN ON THIS ACCOUNT</p>
            <p className="mt-0 mb-3 max-w-[var(--width-prose)] font-display text-meta leading-normal text-ink-muted">
              Both routes into an organisation ask for a sign-in by email that
              the mail service completed, and this session carries none. Nothing
              on this site adds one to an account that already exists. Signing
              out of this browser puts the email door below within reach;
              whether the address then arrives back on this same account is the
              provider&rsquo;s own linking behaviour, which this site does not
              set.
            </p>
            <button type="button" className="hl-btn" onClick={() => void session?.signOut()}>
              Sign out of this browser
            </button>
          </div>
        )}

        <p className="m-0 font-display text-meta">
          <Link href="/profile/">Open the profile sheet</Link>
        </p>
      </section>
    )
  }

  async function start(provider: 'github' | 'google'): Promise<void> {
    const client = supabaseBrowser()
    if (client === null) {
      setPhase({ kind: 'failed', message: 'No client could be created in this browser.' })
      return
    }
    setPhase({ kind: 'working', provider })
    const redirectTo = callbackUrl(
      window.location.origin,
      href(CALLBACK_ROUTE),
      returnPath,
    )
    const { error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo } })
    // A success here NAVIGATES; nothing after this line runs on the happy path.
    // Which is why the failure branch is the only thing that sets state.
    if (error !== null) setPhase({ kind: 'failed', message: error.message })
  }

  async function sendLink(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    // §12.9's rule for the submittal form, and the same reason: validate on
    // submit, never per keystroke, and clear the error the moment it is valid.
    if (!isPlausibleEmail(email)) {
      setEmailInvalid(true)
      return
    }
    setEmailInvalid(false)

    const client = supabaseBrowser()
    if (client === null) {
      setPhase({ kind: 'failed', message: 'No client could be created in this browser.' })
      return
    }
    setPhase({ kind: 'working', provider: 'email' })
    const emailRedirectTo = callbackUrl(
      window.location.origin,
      href(CALLBACK_ROUTE),
      returnPath,
    )
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo },
    })
    if (error !== null) {
      setPhase({ kind: 'failed', message: error.message })
      return
    }
    setPhase({ kind: 'sent', email: email.trim() })
  }

  const busy = phase.kind === 'working'
  const github = SIGN_IN_PROVIDERS[0]
  const google = SIGN_IN_PROVIDERS[1]
  const magic = SIGN_IN_PROVIDERS[2]

  return (
    <section className="hl-panel" aria-labelledby="hl-signin-state">
      <div className="hl-panel-head">
        <h2 id="hl-signin-state" className="hl-panel-title">
          Sign in
        </h2>
        <p className="hl-mark m-0 text-ink-faint">OPTIONAL · THE SITE WORKS WITHOUT IT</p>
      </div>

      {/* §14.8.2's argument, in one line, above the button it argues for — and
          only when that button is there. The sentence is about what a GitHub
          sign-in buys; printing it over a deployment that has no GitHub
          sign-in describes a capability the reader cannot reach. */}
      {available?.github !== false && (
        <p className="mt-0 mb-4 max-w-[var(--width-prose)] font-display text-meta leading-normal text-ink-muted">
          {github.note}
        </p>
      )}

      {available === null ? (
        <p className="hl-mark m-0 text-ink-faint">CHECKING WHICH METHODS THIS SITE OFFERS</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {available.github && (
            <button
              type="button"
              className="hl-btn"
              onClick={() => void start('github')}
              disabled={busy}
            >
              {phase.kind === 'working' && phase.provider === 'github'
                ? 'Opening GitHub…'
                : github.label}
            </button>
          )}
          {available.google && (
            <button
              type="button"
              className="hl-btn"
              onClick={() => void start('google')}
              disabled={busy}
            >
              {phase.kind === 'working' && phase.provider === 'google'
                ? 'Opening Google…'
                : google.label}
            </button>
          )}
          {!available.github && !available.google && (
            <p className="hl-mark m-0 text-ink-faint">
              NO PROVIDER SIGN-IN ON THIS DEPLOYMENT · USE THE EMAIL LINK BELOW
            </p>
          )}
        </div>
      )}

      <hr className="hl-rule-struct my-6" aria-hidden="true" />

      <form className="hl-submittal-form" onSubmit={(event) => void sendLink(event)} noValidate>
        <label className="hl-field" data-invalid={emailInvalid ? 'true' : 'false'}>
          <span className="hl-field-label">Email address</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            aria-describedby="hl-signin-email-hint"
            aria-invalid={emailInvalid ? 'true' : 'false'}
            onChange={(event) => {
              setEmail(event.target.value)
              if (emailInvalid && isPlausibleEmail(event.target.value)) setEmailInvalid(false)
            }}
          />
        </label>
        <span className="hl-field-hint block" id="hl-signin-email-hint">
          A single-use link is emailed to this address. It expires, and it only
          works in the browser you open it in.
        </span>
        {emailInvalid && (
          <p className="hl-field-error" role="alert">
            That does not look like an email address. Nothing was sent.
          </p>
        )}
        <div className="mt-3">
          <button type="submit" className="hl-btn" disabled={busy}>
            {phase.kind === 'working' && phase.provider === 'email' ? 'Sending…' : magic.label}
          </button>
        </div>
      </form>

      {phase.kind === 'sent' && (
        <div className="hl-note" role="status">
          <p>
            A sign-in link was sent to <strong>{phase.email}</strong>. It has not
            signed you in yet — nothing changes here until you open it. If it
            does not arrive, check the spelling above and ask again.
          </p>
        </div>
      )}

      {phase.kind === 'failed' && (
        <div className="hl-note" role="alert">
          <p>
            The sign-in could not be started, and nothing was changed. Your
            record in this browser is untouched.
          </p>
          {/* The library's own words, quoted and labelled as such rather than
              paraphrased into advice this panel cannot give. */}
          <p className="hl-mark text-ink-muted">REPORTED · {phase.message}</p>
        </div>
      )}

      {/* §14.5.1's disclosure debt is NOT discharged here, and must not appear
          to be: this panel creates an account, not a membership. The sentence
          §14.5.1 quotes belongs on the join screen, before the click that adds
          a `memberships` row. All this page owes is the truth that signing in
          is not joining anything. */}
      <div className="hl-note">
        <p>
          Signing in connects your record to an account so it survives this
          browser. It does not join you to an organisation and it does not share
          anything with anyone. Joining an organisation is a separate, explicit
          step, and it states what an organisation’s managers will see before
          you take it.
        </p>
      </div>
    </section>
  )
}
