import type { Metadata } from 'next'
import Link from 'next/link'
import { SessionProvider } from '@/components/auth/SessionProvider'
import { SignInPanel } from '@/components/auth/SignInPanel'
import { PageShell } from '@/components/shell/PageShell'

export const metadata: Metadata = {
  title: 'Sign in',
  description:
    'Connect the record this browser holds to an account, so it survives this '
    + 'browser. Optional: everything on this site works without one.',
}

/**
 * §14.7 — `/sign-in/`.
 *
 * **A server page around one client island**, which is the shape every route on
 * this site already uses: the page is the same document for every reader, which
 * is the only thing a prerender can honestly be, and everything that depends on
 * *this* reader is inside `SignInPanel` behind §12.2's channel B.
 *
 * **This page always exists.** It is prerendered into the export unconditionally
 * and it never 404s, whatever `NEXT_PUBLIC_AUTH_ENABLED` says. A route that
 * appears and disappears with an environment variable is a route that breaks
 * every link to it, including the one in the account panel on `/profile/`, and
 * §12.13's rule is that a missing capability is stated rather than hidden. With
 * the flag off, `SignInPanel` renders the notice and no provider button, and the
 * prose below stays true because it never promised a button.
 *
 * **Nothing here can break the other 32 sheets.** The page imports no
 * `node:fs`-reaching module beyond `PageShell` (which every page uses), and the
 * supabase client is unreachable from any render path by construction — so the
 * static export of this route is three headings, a paragraph and a form
 * skeleton, produced in node with no environment at all.
 */
export default function SignInPage() {
  return (
    <PageShell sheet="SIGN IN">
      <p className="hl-eyebrow hl-mark">OPTIONAL · NOTHING IS GATED BEHIND IT</p>

      <h1 className="hl-listing-title">Sign in</h1>

      <p className="hl-lead">
        An account moves your record off this one browser. Nothing on this site
        is locked behind it: every sheet, every Quick Check and every sign-off
        works exactly the same signed out, and the record stays in this browser
        either way. What an account adds is that the record survives a cleared
        cache, a second machine and a lost laptop — and that a submittal can be
        shown as verified rather than merely typed.
      </p>

      <hr className="hl-rule-struct" aria-hidden="true" />

      {/* The provider is mounted here rather than in the root layout: §12.2's
          channel B islands are mounted where they are consumed, and the 32
          sheets consume nothing from it. `AuthPanels.tsx` records the full
          argument. */}
      <SessionProvider>
        <SignInPanel />
      </SessionProvider>

      <div className="hl-note">
        <p>
          Whichever way you sign in, the record already in this browser is not
          discarded. If the account has a record too, the two are merged
          field by field — a sign-off is never taken back, and no submittal is
          dropped — and you are shown what the merge did before it is kept.
        </p>
        <p className="m-0">
          <Link href="/profile/">
            The profile sheet is where the record itself lives
          </Link>
          .
        </p>
      </div>
    </PageShell>
  )
}
