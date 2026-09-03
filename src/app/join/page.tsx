import type { Metadata } from 'next'
import Link from 'next/link'
import { JoinPanel } from '@/components/org/JoinPanel'
import { PageShell } from '@/components/shell/PageShell'

export const metadata: Metadata = {
  title: 'Join an organisation',
  description:
    'The two routes into an organisation, the limit on each of them, and what '
    + 'an organisation is shown about your record once you take one.',
}

/**
 * §14.5, §15.8 — the join sheet.
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
 * **§15.8's limits, read from the policy rather than paraphrased.** Each route
 * now states what stops it, and both sentences were written against
 * `0005_phase4_provider_verified.sql` with the file open:
 *
 *  - Both `insert` policies carry the SAME first clause,
 *    `app_metadata -> 'providers' ? 'email'`. So the mailbox proof is not a
 *    property of the domain route — it guards the invited route too, and the
 *    copy says so twice rather than letting a reader infer that an invitation
 *    is a way around it.
 *  - The domain comparison is `o.join_domain = split_part(…, '@', 2)` with no
 *    `lower()` on either side, which `lib/org/join.ts` deliberately mirrors.
 *    Case is therefore load-bearing and is stated; a reader refused by a
 *    capital letter has no other way to find that out.
 *
 * **§15.8 asked for a code with a use limit and an expiry printed before the
 * join, and this sheet prints that there is none.** MEASURED: `pending_invites`
 * is `(org_id, email, invited_at)` and no policy reads `invited_at`, so there is
 * no counter to spend and no date at which anything lapses; §14.0 decision 11
 * rejected a token table outright, because with no functions the only way to
 * check a secret is to read the row holding it and RLS cannot say "you may read
 * the row whose contents you already know". Printing a use limit and an expiry
 * here would be printing two numbers the schema does not hold. What the reader
 * is owed instead — what the line admits, that it cannot be passed on, and that
 * only a manager deleting it ends it — is stated in its place, before the
 * control, which is the requirement the limits were standing in for.
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
          <p className="hl-mark m-0 text-ink-faint">Each with its own limit</p>
        </div>

        <ol className="m-0 grid list-none gap-3 p-0">
          <li>
            <p className="hl-mark m-0 text-ink">1 · The organisation domain</p>
            <p className="m-0 mt-1 max-w-[68ch] font-display text-meta leading-normal text-ink-muted">
              An organisation may register the domain of its own addresses. If
              the address on your account is on that domain, the organisation
              appears below and you write your own membership row. No code is
              involved. The domain is compared exactly, capital letters
              included, so an address at{' '}
              <span className="font-mono text-ink">Example.com</span> does not
              match an organisation that registered{' '}
              <span className="font-mono text-ink">example.com</span>.
            </p>
            {/* The clause `app_metadata -> 'providers' ? 'email'`, in the
                reader's terms. It is the one requirement that cannot be read
                off the screen the reader is looking at, and the refusal it
                produces is otherwise unexplainable. */}
            <p className="m-0 mt-2 max-w-[68ch] font-display text-meta leading-normal text-ink-muted">
              The limit: the account must carry a sign-in by email that the mail
              service itself completed. The rule reads the list of providers on
              your account rather than the address written on it, because an
              address is a claim and a followed link to a mailbox is evidence.
              An account that has only ever signed in through another provider
              is refused by domain even where that provider reports the address
              as confirmed — the way in is to add an email sign-in to the same
              account, which proves the mailbox the way every other member
              proved theirs.
            </p>
          </li>
          <li>
            <p className="hl-mark m-0 text-ink">2 · An address a manager entered</p>
            <p className="m-0 mt-1 max-w-[68ch] font-display text-meta leading-normal text-ink-muted">
              A manager can enter your address at their organisation. Nothing
              is sent to you and nothing happens to your record: the entry
              makes the organisation visible on this sheet, and writing the
              membership row is still your action. You can read only the entry
              that names your own address.
            </p>
            <p className="m-0 mt-2 max-w-[68ch] font-display text-meta leading-normal text-ink-muted">
              The limit, stated as what the entry is: one organisation, one
              address, and the date a manager entered it. It admits the account
              that holds that address and no other, so it cannot be forwarded or
              shared; nothing counts down and nothing lapses, so it stands until
              a manager removes it. The sign-in by email above is required on
              this route as well — the same clause guards both, and an
              invitation is not a way around it.
            </p>
          </li>
        </ol>

        {/* §14.0, Karar 11 — the absence of a token is a design decision, and a
            reader looking for the invite link they were expecting deserves to
            read why there is not one instead of concluding the page is broken.
            §15.8: it is also where the missing use count and expiry are
            accounted for, since a reader who has used another site's invite
            code will look for both. */}
        <div className="hl-note">
          <p className="hl-mark m-0 text-ink">There is no invitation code</p>
          <p className="m-0 mt-1 max-w-[68ch] font-display text-meta leading-normal text-ink-muted">
            A code would have to be checked against a stored list, and this site
            has no server of its own to check it: authority lives entirely in
            the database rules. A rule that lets a reader read the code they
            hold also lets that reader read every other code and join every
            other organisation. The address confirmed at sign-in is already
            evidence of who you are, so it is what both routes use — which is
            also why there is no code to type, no number of uses to spend, and
            no date on which a way in stops working.
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
