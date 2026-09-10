import Link from 'next/link'
import { DOOR_ROWS } from '@/lib/auth/doors'

/**
 * §15.2.5 — the identity strip at the foot of the home page.
 *
 * Three rows of fact and two links, at the bottom, with nothing on the page
 * behind them. The reader can take none of them and lose nothing, which is what
 * the first row says: the record is being kept either way. No modal, no banner,
 * no dismissible box, and no sentence anywhere claiming that signing in saves
 * something the browser is not already keeping (§15.5.4).
 *
 * M13 lifted it out of `FirstVisit`, which the home page's rebuild retired.
 * It moved verbatim, because it was the one part of that component that was
 * neither a count nor a card: it is a statement about where a reader's work
 * goes, and it is now on the page for every reader rather than only for the
 * half of them the old CSS switch showed it to.
 */

/**
 * §15.5.2 — which doors can show a submittal as verified, read off the table
 * instead of restated beside it.
 *
 * The strip used to offer "a verified submittal" for an account of any kind.
 * `DOOR_ROWS` denies that, and it is the authority: `classifySubmittals`
 * matches a submittal's owner against `profiles.github_login`, a column only a
 * GitHub identity writes, so the email-link row answers `no` — and the emailed
 * link is the door this deployment enables. The front door was promising a
 * capability the table one click away refuses, which is the failure mode §1
 * exists to prevent. Derived here, the claim has one author: change a cell and
 * this sentence changes with it.
 */
const VERIFIED_SUBMITTAL_DOORS: readonly string[] = DOOR_ROWS.filter(
  (door) => door.cells.verifiedSubmittal === 'yes',
).map((door) => door.label)

export function KeepingYourPlace() {
  return (
    <section className="bz-panel" aria-labelledby="bz-home-identity">
      <div className="bz-panel-head">
        <h2 id="bz-home-identity" className="bz-panel-title">
          Keeping your place
        </h2>
        <p className="bz-panel-note">Optional · one of these, or none</p>
      </div>

      <dl className="bz-defs">
        <dt>No name</dt>
        <dd>Reading is recorded in this browser. Nothing else happens.</dd>
        <dt>An alias</dt>
        <dd>A name and a mark on your record and on anything you export.</dd>
        <dt>An account</dt>
        <dd>
          A copy that outlives this browser.{' '}
          {VERIFIED_SUBMITTAL_DOORS.length > 0
            ? `${VERIFIED_SUBMITTAL_DOORS.join(' or ')} can also show a submittal as verified rather than typed.`
            : 'No door shows a submittal as verified.'}
        </dd>
      </dl>

      <div className="bz-actions">
        <Link className="bz-btn" href="/sign-in/alias/">
          Choose an alias
        </Link>
        <Link className="bz-btn" href="/sign-in/">
          See all three
        </Link>
      </div>
    </section>
  )
}
