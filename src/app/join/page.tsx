import type { Metadata } from 'next'
import Link from 'next/link'
import { JoinPanel } from '@/components/org/JoinPanel'
import { PageShell } from '@/components/shell/PageShell'

export const metadata: Metadata = {
  title: 'Join an organisation',
  description:
    'The two routes into an organisation, and what an organisation is shown '
    + 'about your record once you take one.',
}

/**
 * §14.5 — the join sheet.
 *
 * **A server page with one client island, which is the shape §14.8 forces.**
 * `generateStaticParams` runs at build time and an organisation is a row that
 * exists afterwards, so there is no route segment naming one: the whole
 * decision is taken in the browser, after the page has loaded, by
 * `lib/org/join.ts`. This page therefore contributes nothing to the prerender
 * except prose that is true whether or not this build has a backend at all —
 * which is what keeps the 32 sheets' prerender unaffected by the account layer.
 *
 * **Why the page carries the explanation and the panel carries the
 * disclosure.** The two paragraphs below describe the MECHANISM: two routes,
 * no code to type, and the row written by the reader. They are the same for
 * everybody and knowable at build time, so they are printed by the server and
 * are there for a reader with scripting off. §14.5.1's disclosure is about a
 * NAMED organisation and a reader whose other memberships change its third
 * sentence, so it is rendered by the island, immediately above the control,
 * and never by this page.
 *
 * **No route on this site links here yet on the strength of this file alone.**
 * That is deliberate for one deploy: with `NEXT_PUBLIC_AUTH_ENABLED` off
 * (§14.1's default, and the safe one until `bazaar.lokumai.com` is live) the
 * panel below can only report that accounts are not enabled, and a navigation
 * item pointing at that is chrome promising a capability the build does not
 * have.
 */
export default function JoinPage() {
  return (
    <PageShell>
      <h1 className="hl-listing-title">Join an organisation</h1>

      <p className="hl-lead">
        An organisation is a group whose managers follow the progress of the
        people in it. Joining one is a decision with a consequence for
        everything this browser has recorded about you, so this sheet states the
        consequence before it offers the control, and the row that makes you a
        member is written by you from here — not by a manager, and not by a link
        in a message.
      </p>

      <hr className="hl-rule-struct" aria-hidden="true" />

      <section className="hl-panel" aria-labelledby="routes">
        <div className="hl-panel-head">
          <h2 id="routes" className="hl-panel-title">
            The two routes in
          </h2>
          <p className="hl-mark m-0 text-ink-faint">No code to type</p>
        </div>

        <ol className="m-0 grid list-none gap-3 p-0">
          <li>
            <p className="hl-mark m-0 text-ink">1 · The organisation domain</p>
            <p className="m-0 mt-1 max-w-[68ch] font-display text-meta leading-normal text-ink-muted">
              An organisation may register the domain of its own addresses. If
              the address confirmed on your account is on that domain, the
              organisation appears below and you can join it.
            </p>
          </li>
          <li>
            <p className="hl-mark m-0 text-ink">2 · An invitation to your address</p>
            <p className="m-0 mt-1 max-w-[68ch] font-display text-meta leading-normal text-ink-muted">
              A manager can enter your address at their organisation. Nothing
              is sent to you and nothing happens to your record: the entry
              makes the organisation visible on this sheet, and joining it is
              still your action. You can see only the entry that names your own
              address.
            </p>
          </li>
        </ol>

        {/* §14.0, Karar 11 — the absence of a token is a design decision, and a
            reader looking for the invite link they were expecting deserves to
            read why there is not one instead of concluding the page is broken. */}
        <div className="hl-note">
          <p className="hl-mark m-0 text-ink">There is no invitation code</p>
          <p className="m-0 mt-1 max-w-[68ch] font-display text-meta leading-normal text-ink-muted">
            A code would have to be checked against a stored list, and this site
            has no server of its own to check it: authority lives entirely in
            the database rules. A rule that lets a reader read the code they
            hold also lets that reader read every other code and join every
            other organisation. The address confirmed at sign-in is already
            evidence of who you are, so it is what both routes use.
          </p>
        </div>
      </section>

      <section className="hl-panel" aria-labelledby="offers">
        <div className="hl-panel-head">
          <h2 id="offers" className="hl-panel-title">
            Open to you
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Read after the page loads</p>
        </div>
        <JoinPanel />
      </section>

      <section className="hl-panel" aria-labelledby="leaving">
        <div className="hl-panel-head">
          <h2 id="leaving" className="hl-panel-title">
            Leaving, and erasing
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Stated here as well</p>
        </div>
        <p className="m-0 max-w-[68ch] font-display text-meta leading-normal text-ink">
          You can leave an organisation, and leaving stops its managers reading
          your record from that moment. It does not withdraw the training
          history the organisation already holds: that log belongs to the
          organisation and stays with it. Erasing your own record on the{' '}
          <Link href="/profile/" className="hl-link">
            profile sheet
          </Link>{' '}
          removes it from this browser and removes the copy your account
          holds, and leaves that same organisation history in place. Closing
          the account removes everything, the history included.
        </p>
      </section>
    </PageShell>
  )
}
