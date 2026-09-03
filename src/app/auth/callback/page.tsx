import type { Metadata } from 'next'
import { CallbackPanel } from '@/components/auth/AuthPanels'
import { PageShell } from '@/components/shell/PageShell'

/**
 * `noindex, nofollow`. This URL only ever exists in the middle of a sign-in
 * round trip and only ever carries a single-use code, so an indexed copy of it
 * is at best a dead end and at worst a search result that hands a reader
 * somebody else's spent code. Setting it here is why the page is a server
 * component: `metadata` cannot be exported from a client module.
 */
export const metadata: Metadata = {
  title: 'Completing sign-in',
  description: 'Finishes a sign-in that a provider has just returned from.',
  robots: { index: false, follow: false },
}

/**
 * §14.7 — `/auth/callback/`, the static page that finishes the round trip.
 *
 * **Why a static page can do this at all.** §14.0/8 rules out Edge Functions and
 * RPC, and `output: 'export'` rules out route handlers, so there is no server to
 * exchange the OAuth code. PKCE is what makes that survivable (`client.ts`
 * records the choice): the code is exchanged in the browser, by supabase-js,
 * with no client secret involved. This page's whole job is to exist at a stable
 * URL that a provider can be told to return to, and to let the library get on
 * with it.
 *
 * **Why it renders a body rather than redirecting.** A redirect page that only
 * ever flashes is fine until it stops working, and then it is a blank screen
 * with no way out — the one failure this route must not have. So the panel
 * always states which of the four things is happening (reading, exchanging,
 * nothing to complete, or failed), and both terminal states carry a link. §1: a
 * page that cannot finish says so, in words, with a way onward.
 *
 * The reader is returned by `router.replace`, so the spent code does not sit in
 * the history behind a Back press.
 */
export default function AuthCallbackPage() {
  return (
    <PageShell sheet="COMPLETING SIGN-IN">
      <p className="hl-eyebrow hl-mark">RETURN FROM A SIGN-IN PROVIDER</p>

      <h1 className="hl-listing-title">Completing sign-in</h1>

      <p className="hl-lead">
        This page finishes a sign-in that has just come back from GitHub, Google
        or an emailed link. It runs in this browser — there is no server in this
        site to run it on — and then sends you where you were going. If it
        cannot finish, it says so here rather than leaving you on a blank page.
      </p>

      <hr className="hl-rule-struct" aria-hidden="true" />

      <CallbackPanel />
    </PageShell>
  )
}
