'use client'

import { AccountPanel } from '@/components/auth/AuthPanels'
import { SessionProvider } from '@/components/auth/SessionProvider'
import { SignInPanel } from '@/components/auth/SignInPanel'
import { roleById } from '@/lib/path/roles'
import { useRecord } from '@/lib/record/store'
import { IdentityPanel } from './IdentityPanel'
import { MarkPicker } from './MarkPicker'
import { DrafterMark } from './ProfilePanels'
import { offeredMark } from './RolePanel'

/**
 * §16.1 — the drafter block: the one thing on `/profile/` that arrives open.
 *
 * **What it is for, measured.** §16.0 counted `out/profile/index.html`'s
 * `<main>` with no React island mounted: 1260 words, eleven `<h2>` panels,
 * twenty form controls. The two things a reader comes to this sheet to do —
 * name themselves, and connect the record to an account — sat about 700 words
 * apart, in panels one and nine. This block is both of them in one box, and
 * everything else on the page folds into the register below it.
 *
 * §16.0 also names an opening of **163 words**, and that number is the approved
 * mockup's — `docs/superpowers/mockups/profile-v2.html`, whose halves hold five
 * controls and no `NAME_SCOPE`, no `RECORD_SCOPE`, no five-state sign-in panel.
 * It is the target this block was drawn against, not a property of the shipped
 * page, and a maintainer who reads it as one will "fix" a regression that never
 * happened. The shipped figures, measured the way §16.0 measured its 1260 —
 * `renderToStaticMarkup(<ProfilePage />)`, no island mounted, tags stripped,
 * tokens containing a letter or digit counted:
 *
 * | Measurement | Words |
 * | --- | --- |
 * | `<main>`, every fold's body included | 999 |
 * | `<main>` as it opens, closed folds' bodies excluded | 398 |
 * | this block alone | 317 |
 *
 * So the reader's first screen is 398 words rather than 1260, and 317 of them
 * are the two things they came to do. The gap to the mockup's 163 is copy the
 * mockup never carried: the field hints and the scope sentences that state where
 * the record goes, which §12.1.7 requires next to the control and which are
 * therefore not the register's to hide.
 *
 * **One box, two halves, and the half rule is an argument rather than a
 * layout.** Both halves answer one question — how this record is recognised —
 * at two different ranges: the alias is true of this browser, the account is
 * true across browsers. A hairline between them would read as two unrelated
 * panels stacked; §2.2's 1.5px structural weight says two halves of one box.
 * That weight is painted by `.hl-drafter-half + .hl-drafter-half`, because
 * Chrome floors `border-width` to whole pixels and a 1.5px border would draw a
 * hairline while claiming to be a rule.
 *
 * **Each half is a `<section aria-labelledby>` rather than a `<div>`**, which
 * costs nothing and keeps two ids resolving: `identity`, and `hl-account-head`.
 * Both moved from an `h2` to an `h3` here, because §16.7 gives the block the
 * `h2` and each half an `h3`; what has to survive a heading level is the
 * fragment, and both `#identity` and `#hl-account-head` still land on a heading
 * that names the same thing. The second one is the reason this matters — `AuthShell` in `inline` chrome deliberately emits no
 * heading and no id (its own header explains why: two elements with
 * `hl-account-head` would make the anchor ambiguous rather than redundant), so
 * the caller owns that id, and the caller is this file.
 *
 * **Nothing here branches on the session.** §16.1.1's rejected alternative was
 * writing a second sign-in form inside the block; §11.38 forbids a second
 * implementation and §16.0 is the measurement that settles it — the mark picker
 * had been written three times on one page and all three copies had drifted.
 * `SignInPanel` already renders five shapes over four `SessionView` statuses,
 * with `unknown` never collapsed into `signedOut`, and `AccountPanel` renders
 * the account's own four. So both are rendered, both in `inline` chrome, and
 * each decides what it has to say: signed out, the first draws the email field
 * and the doors and the second reports `NOT SIGNED IN`; signed in, the first
 * shrinks to the identity line (plus §14.5's sign-out offer when the account
 * carries no email identity) and the second prints the account, the door used,
 * the last sync and `SIGN OUT OF THIS BROWSER`. An `if (signedIn)` here would
 * have been this file guessing at a state machine two files already hold.
 *
 * **Half B carries its own `SessionProvider`**, for the reason
 * `IdentityPanel`'s does: a panel whose readout depends on an ancestor a
 * different file owns is a panel that silently stops reporting the next time the
 * page is reassembled, and nothing in the unit suite can see that happen.
 * Nesting is free — `SessionProvider`'s header records one cached client, one
 * refresh timer and one storage key however many providers there are — and with
 * no backend configured it builds no client at all, so
 * `accounts-disabled.spec.ts`'s zero-request sweep over `/profile/` is unmoved.
 *
 * **Heading levels.** `h2` for the block, `h3` for each half, and the page keeps
 * exactly one `h1` (§16.7). That is also why `inline` chrome exists: an `h2`
 * from `AuthShell` inside a half would nest a panel heading under a half
 * heading.
 */

/** The block's own heading id, so the page wires `aria-labelledby` to it. */
export const DRAFTER_HEADING_ID = 'drafter'

export function DrafterBlock() {
  const record = useRecord()

  /**
   * §13.6, §16.2.1 — the mark this reader's role offers, resolved once, in the
   * file that owns the role, and passed down as a prop.
   *
   * §13.6 shipped as `MarkOffer`: a second complete copy of the eight-option
   * picker with `SET THIS MARK` and `LEAVE THE MARK AS IT IS` under it. The
   * guarantee it was built for — nothing is written until the reader agrees — is
   * not weakened by reducing it to one marked cell, it is strengthened: an offer
   * is a marking, and the only write is the reader's own click on a glyph, so
   * there is no confirm step left to be wrong about.
   *
   * `undefined` rather than a role means no offer at all, which is §11.25's
   * outcome — a row marked with a glyph nobody suggested would be worse than an
   * unmarked row.
   */
  const role = roleById(record.identity.role)
  const offered = role === undefined ? null : offeredMark(role)

  return (
    <section aria-labelledby={DRAFTER_HEADING_ID}>
      <div className="hl-panel-head">
        <h2 id={DRAFTER_HEADING_ID} className="hl-panel-title">
          The drafter
        </h2>
        <p className="hl-mark m-0 text-ink-faint">This browser, and across browsers</p>
      </div>

      <div className="hl-drafter">
        <div className="hl-drafter-grid">
          {/* §16.1 — the drawing, with the mark and the seed under it as two
              separate lines. `DrafterMark` records why they are two. */}
          <div className="hl-drafter-mark">
            <DrafterMark />
          </div>

          <div className="hl-drafter-body">
            {/* ---- HALF A · IN THIS BROWSER ------------------------------- */}
            {/*
              §16.1 — everything the local record holds about the reader, in one
              place: the alias field, and §16.2's compact mark row under it.

              `IdentityPanel` is rendered whole and unchanged. Two e2e specs
              locate its field by its accessible name (`Name or initials`) and
              read a computed `text-transform` off `.hl-identity-initials`, and
              a computed style is meaningless inside a collapsed subtree — which
              is one of the reasons this block is the part of the page that does
              not fold.
            */}
            <section className="hl-drafter-half" aria-labelledby="identity">
              <div className="hl-drafter-halfhead">
                <h3 id="identity" className="hl-panel-title">
                  In this browser
                </h3>
                {/* Not "Local only": `IdentityPanel` prints `NAME_SCOPE` two
                    lines below this readout, and `AccountSync.pushProfileRow`
                    upserts the record's identity into `profiles` for every
                    signed-in reader — so "local only" and the sentence under it
                    contradicted each other on one screen. The register bans a
                    word, not a falsehood, which is why nothing failed.
                    `/sign-in/`'s "LOCAL ONLY · …" readouts stay, because those
                    describe an act (that form sends nothing) rather than the
                    data. This names reach the way `RECORD_SCOPE` argues it: the
                    browser holds the authoritative copy, the account a second
                    one, and both readouts are then true in either session
                    state. `/legend/`'s storage disclosure sits over the same
                    `RECORD_SCOPE` paragraph and carries this same spelling, so
                    one status is worded one way site-wide. */}
                <p className="hl-mark m-0 text-ink-faint">This browser’s copy</p>
              </div>

              <IdentityPanel />

              {/* §16.2.2 — the one mark picker on the site, at its default
                  prefix, so `name="hl-mark"` and `#hl-mark-legend` keep
                  resolving exactly as they did. */}
              <MarkPicker offered={offered} />
            </section>

            {/* ---- HALF B · ACROSS BROWSERS ------------------------------- */}
            <section className="hl-drafter-half" aria-labelledby="hl-account-head">
              <div className="hl-drafter-halfhead">
                <h3 id="hl-account-head" className="hl-panel-title">
                  Across browsers
                </h3>
                <p className="hl-mark m-0 text-ink-faint">An account keeps a second copy</p>
              </div>

              <SessionProvider>
                <SignInPanel chrome="inline" />
                <AccountPanel chrome="inline" />
              </SessionProvider>
            </section>
          </div>
        </div>
      </div>
    </section>
  )
}
