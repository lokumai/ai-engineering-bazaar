import type { Metadata } from 'next'
import Link from 'next/link'
import { PageShell } from '@/components/shell/PageShell'
import { TeamTable } from '@/components/team/TeamTable'
import { curriculumFacts } from '@/lib/content/facts'

export const metadata: Metadata = {
  title: 'Team',
  description:
    "An organisation's roster: progress against the drawing set, what each "
    + 'member asserted about themselves, the evidence beside it, and what needs '
    + 'attention.',
}

/**
 * §14.8 — the manager's panel.
 *
 * **A server page over a client island, exactly like `/profile/` and
 * `/dashboard/`, and the boundary is drawn here for the same reason.**
 * `curriculumFacts()` reaches `node:fs` through the loader, so it runs at build
 * time and crosses into the island as serialised props; §12.2's import rule is
 * that a single value imported across that line pulls `node:fs` into the browser
 * bundle and the build stops. The facts are what make §14.9 hold: the panel's
 * `18 / 32` is `derive.ts` measuring THIS build's corpus, which is the same
 * measurement the reader's own sheet makes, so the two cannot drift.
 *
 * **Everything below this file is a query the reader's own session issues.**
 * There is no roster at build time and there must not be one: §14.4's policies
 * are the authority on who may read whose record, and they run in Postgres
 * against `auth.uid()`. So this page prerenders a heading, a lead and one
 * island, and states nothing about anybody. With Supabase unconfigured or
 * `NEXT_PUBLIC_AUTH_ENABLED` off, the island renders `BACKEND NOT CONFIGURED`
 * and this page is still a valid, complete, prerendered page — which is the
 * §14.1 requirement that the kill switch cost the rest of the site nothing.
 *
 * **There is no `/team/[user]/`.** §14.8: `generateStaticParams` runs at build
 * time and users exist only afterwards, so a per-user route cannot be
 * generated. `?u=<uuid>` and an in-page panel are the whole answer, and the
 * general rule behind it — anything unknown at build time is a query parameter
 * — is why the other 32 sheets, the categories and `/path/` stay entirely
 * static.
 */
export default function TeamPage() {
  const facts = curriculumFacts()

  return (
    <PageShell sheet="TEAM">
      <p className="hl-eyebrow hl-mark">SCOPED BY RLS · NOT BY THIS PAGE</p>

      <h1 className="hl-listing-title">Team</h1>

      <p className="hl-lead">
        One row per member of your organisation. The claim column is what each
        person asserted about themselves; the evidence column is what can be
        checked without them. They are separate columns because a sign-off is a
        statement by its author and not a verified fact, and merging them into
        one tick would print the first as the second.
      </p>

      <p className="hl-lead">
        Nothing on this page is fetched at build time. Your own session issues
        every query, and the database decides what comes back: a manager reads
        the records of their organisation&rsquo;s members, and nobody reads
        anything else.
      </p>

      <hr className="hl-rule-struct" aria-hidden="true" />

      <TeamTable facts={facts} />

      <section className="hl-panel" aria-labelledby="hl-team-limits">
        <div className="hl-panel-head">
          <h2 id="hl-team-limits" className="hl-panel-title">
            What this panel cannot tell you
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Stated, not implied</p>
        </div>

        {/* §12.12.3's stance, applied to a screen about other people: naming the
            limits precisely is what makes the rest of it worth believing. Each
            line is a real property of the system above, not a disclaimer. */}
        <ul className="m-0 max-w-[var(--width-prose)] list-none p-0 font-display text-meta leading-normal text-ink-muted">
          <li className="py-1">
            A sign-off is the member&rsquo;s own assertion. Nothing assessed it,
            and nothing here gates on it.
          </li>
          <li className="py-1">
            A quiz result is the member&rsquo;s own comparison of their answer
            with the sheet&rsquo;s summary. There is no marker.
          </li>
          <li className="py-1">
            A verified submittal means the repository owner matches the GitHub
            login the sign-in supplied. It says nothing about what is in the
            repository — resolve the commit yourself.
          </li>
          <li className="py-1">
            Records are local-first. A member with no server copy has not
            necessarily done nothing; their device may simply never have pushed.
          </li>
          <li className="py-1">
            Attention flags are three fixed rules over dates and counts. They
            describe a record, not a person.
          </li>
        </ul>

        <div className="hl-signoff-actions">
          <Link className="hl-btn" href="/team/assignments/">
            ASSIGNMENTS
          </Link>
          <Link className="hl-btn" href="/legend/">
            SHEET 00 — LEGEND
          </Link>
        </div>
      </section>
    </PageShell>
  )
}
