import type { Metadata } from 'next'
import Link from 'next/link'
import { PageShell } from '@/components/shell/PageShell'
import { AssignmentForm } from '@/components/team/AssignmentForm'
import { curriculumFacts } from '@/lib/content/facts'

export const metadata: Metadata = {
  title: 'Assignments',
  description:
    'Create an assignment for an organisation: a title, a note, a due date and '
    + 'which sheets. Naming nobody assigns it to the whole organisation.',
}

/**
 * §14.2.4, §14.8 — creating an assignment.
 *
 * A server page over a client island, for the reason `/team/` gives: the sheet
 * list is measured from the corpus at build time (`curriculumFacts()` reaches
 * `node:fs`, §12.2), and everything about an organisation is a query the
 * manager's own session issues under §14.4.5's policies.
 *
 * **An assignment is the ORGANISATION'S data, not the record's** (§14.2.4). It
 * touches no envelope, enters no sync, and appears in the reader's own record
 * nowhere — the only thing it changes for a member is that §14.8.1's third rule
 * (assigned, deadline passed, no sign-off) now has a deadline to compare
 * against. That containment is why this page can write to the database without
 * any of §14.7's merge machinery being involved.
 *
 * **Nothing here can force a sign-off, and nothing should.** §14.11 keeps the
 * nudging channel out of v1 deliberately: a manager sees who is behind and
 * reaches them through Slack or e-mail, in their own words. The site does not
 * send anybody anything.
 */
export default function AssignmentsPage() {
  const facts = curriculumFacts()

  return (
    <PageShell sheet="ASSIGNMENTS">
      <p className="hl-eyebrow hl-mark">ORGANISATION DATA · NOT PART OF A RECORD</p>

      <h1 className="hl-listing-title">Assignments</h1>

      <p className="hl-lead">
        A title, a note, a due date and a set of sheets. Name nobody and it
        applies to the whole organisation, including whoever joins next; name
        people and it applies to exactly those accounts. The deadline is the only
        thing an assignment adds to what the site measures: a sheet that is
        assigned, past its date and unsigned starts asking for attention, with
        the reason shown.
      </p>

      <p className="hl-lead">
        An assignment cannot make anyone sign anything off. Sign-off is the
        reader&rsquo;s own assertion and stays that way; this page sets a
        deadline and the panel reports against it.
      </p>

      <hr className="hl-rule-struct" aria-hidden="true" />

      <AssignmentForm facts={facts} />

      <div className="hl-signoff-actions">
        <Link className="hl-btn" href="/team/">
          BACK TO THE ROSTER
        </Link>
      </div>
    </PageShell>
  )
}
