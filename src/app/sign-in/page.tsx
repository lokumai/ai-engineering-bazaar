import type { Metadata } from 'next'
import Link from 'next/link'
import { SessionProvider } from '@/components/auth/SessionProvider'
import { SignInPanel } from '@/components/auth/SignInPanel'
import { PageShell } from '@/components/shell/PageShell'
import {
  ACCOUNT_DOOR_COUNT,
  ANSWER_WORDS,
  DOOR_CONSEQUENCES,
  DOOR_ROWS,
} from '@/lib/auth/doors'
import { numberWord } from '@/lib/text'
import { ALIAS_SCOPE } from '@/lib/record/scope'

export const metadata: Metadata = {
  title: 'Sign in',
  description:
    'Three doors into this site — a local alias, an emailed link, GitHub — '
    + 'with what each one costs and what each one refuses to do. Optional: '
    + 'everything on this site works without any of them.',
}

/**
 * §14.7, §15.5 — `/sign-in/`: three doors, in ascending order of what they
 * cost the reader.
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
 * the flag off, `SignInPanel` renders the notice and no provider button, and
 * every paragraph this page prints stays true because none of them promises a
 * button: the alias door is a link to a route whose own form asks for nothing
 * off this browser, and the two account paragraphs describe what those doors
 * ask for and refuse, which is the same whether or not this deployment has
 * switched them on.
 *
 * **Nothing here can break the other 32 sheets.** The page imports no
 * `node:fs`-reaching module beyond `PageShell` (which every page uses), and the
 * supabase client is unreachable from any render path by construction — so the
 * static export of this route is prose, a table and a form skeleton, produced
 * in node with no environment at all. `lib/auth/doors.ts` has no imports, so
 * pulling the table in does not widen that surface.
 *
 * ## The three decisions this sheet is made of
 *
 * **The alias is a door, not a footnote (§15.5.1).** It is first, and it is the
 * one carrying the accent edge — the order is ascending cost and the accent
 * marks the cheapest door rather than the one that suits us. Accent normally
 * means "signed off" on this site (T1, `.hl-btn[aria-pressed="true"]`), and
 * that reading cannot arise here: this sheet has no sign-off state on it at
 * all, and the badge beside the mark says in words what the edge is marking, so
 * the colour is never the only signal (§2.6). Putting an account first, or
 * styling one door larger, would imply an account is the price of being
 * recognised, which is false — an alias is a label on the local record and
 * nothing on this site is gated behind any of the three.
 *
 * **Every cell of the comparison table comes from `lib/auth/doors.ts`**
 * (§15.5.2). A table hand-written in JSX is a set of behaviour claims nothing
 * checks: it goes quietly false the first time a policy moves, and this one has
 * already had to disagree with the approved drawing twice — Rev B printed
 * `Yes` for a magic-link verified submittal and `By code` for a GitHub domain
 * join, and the code says `no` to both. So the renderer decides only the
 * markup; the words come from `ANSWER_WORDS` and the columns from
 * `DOOR_CONSEQUENCES`, whose `question` text is what the sr-only caption reads
 * out, because a heading of three words (`Join by domain`) is ambiguous on its
 * own.
 *
 * **Each door states its own limit in its own paragraph (§15.5.3).** A GitHub
 * identity carries no address this site can prove, so joining an organisation
 * by its email domain does not work under one — that is `0005`'s
 * `app_metadata.providers ? 'email'` clause, and a reader is owed it here
 * rather than as a refusal on `/join/` after they have already committed to a
 * provider. The alias paragraph carries the same discipline in the other
 * direction: it says what an alias does not prove.
 *
 * **What this page may not say (§15.5.4).** "Sign in to save your progress" and
 * every paraphrase of it. The record is written to `localStorage` on every
 * mutation with no session involved (§14.7.3), so the sentence is false, and it
 * is the easiest false thing this site could say. An account adds a second
 * copy; it does not do the saving.
 *
 * **The alias door composes `ALIAS_SCOPE` rather than restating it (§15.9.1).**
 * It used to print its own version, and that version had gone false in the way
 * `scope.ts` records: it told the reader an alias "does not reach another
 * machine", while `/sign-in/alias/` tells the same reader that signing in from
 * that browser carries the name and the mark to the account and the roster.
 * Two sentences describing one behaviour and disagreeing is worse than either
 * alone, so the door now takes the constant verbatim and adds only what is this
 * door's own and not the alias's — that no address and no password are asked
 * for, that an alias cannot join an organisation, and that a submittal under it
 * stays a typed claim. The same edit dropped "no request leaves the page": the
 * root layout mounts `SessionProvider` and `AccountSync` around every document,
 * so the honest subject of that claim is the form, not the page.
 *
 * The lead was corrected in the same pass. "The first never leaves this
 * browser" read as a property of the alias, and the alias is exactly what a
 * later sign-in carries off the browser; it now says the alias sends nothing on
 * its own and names the reader's act as the thing that moves it, which is the
 * sequence-of-states shape `RECORD_SCOPE` and `ALIAS_SCOPE` both use.
 */
export default function SignInPage() {
  return (
    <PageShell sheet="SIGN IN">
      <p className="hl-eyebrow hl-mark">OPTIONAL · NOTHING IS GATED BEHIND IT</p>

      <h1 className="hl-listing-title">Sign in</h1>

      <p className="hl-lead">
        Three ways to put your name on this record, and they cost different
        things. The first asks for nothing and sends nothing on its own. The
        other two move a copy off this browser, carrying the name with it, so
        the record survives a cleared cache and a second machine. Every sheet,
        every Quick Check and every sign-off works the same under all three,
        and under none of them.
      </p>

      <hr className="hl-rule-struct" aria-hidden="true" />

      {/* Door 1 — the cheapest, and therefore the first and the marked one.
          The 2px left edge is `--stroke-cut` spent as a border, which is a
          whole pixel and paints (§2.2); the struct weight is the one that may
          never be a border. */}
      <section
        className="hl-panel border border-line-strong border-l-2 border-l-accent bg-cleared p-5"
        aria-labelledby="hl-door-alias"
      >
        <div className="hl-panel-head">
          <h2
            id="hl-door-alias"
            className="m-0 font-display text-h4 leading-tight font-semibold text-ink"
          >
            Use an alias
          </h2>
          <p className="hl-mark m-0 text-accent-ink">LOCAL ONLY · NOT AN ACCOUNT</p>
        </div>

        {/* §15.9.1 — what an alias is, what it proves and where it goes, from
            the one module allowed to say so. This door and `/sign-in/alias/`
            print the same characters. */}
        <p className="mt-0 mb-3 max-w-[68ch] font-display text-meta leading-normal text-ink-muted">
          {ALIAS_SCOPE}
        </p>

        {/* §15.5.3 — the door's own limit, in the door's own paragraph: only
            the facts `ALIAS_SCOPE` does not state. */}
        <p className="mt-0 mb-4 max-w-[68ch] font-display text-meta leading-normal text-ink-muted">
          No email and no password, and the form that asks for them sends
          nothing. Its limits: an alias cannot join an organisation, and a
          submittal recorded under it stays a typed claim rather than a checked
          one.
        </p>

        <p className="m-0">
          <Link className="hl-btn" href="/sign-in/alias/">
            Choose an alias
          </Link>
        </p>
      </section>

      {/* Doors 2 and 3 — what they ask for and what they refuse, stated by the
          server. The controls themselves are the island below: which providers
          this deployment has is a runtime answer, and these two paragraphs are
          true either way, so they are prerendered and a reader with scripting
          off still gets them. */}
      <section className="hl-panel" aria-labelledby="hl-door-accounts">
        <div className="hl-panel-head">
          {/* Counted, never typed. This heading said "two" while
              `SIGN_IN_PROVIDERS` carried three provider buttons and
              `ALL_PROVIDERS` turned the third on whenever the settings probe
              could not be read — so the page contradicted the panel under it in
              a state a deployment can actually be in (§11.25). */}
          <h2 id="hl-door-accounts" className="hl-panel-title">
            The {numberWord(ACCOUNT_DOOR_COUNT)} account doors
          </h2>
          <p className="hl-mark m-0 text-ink-faint">A COPY OFF THIS BROWSER</p>
        </div>

        <p className="mt-0 mb-3 max-w-[68ch] font-display text-meta leading-normal text-ink-muted">
          <span className="hl-mark text-ink">EMAIL A SIGN-IN LINK</span> — one
          link to your inbox, and no password to keep. Opening it is what proves
          the mailbox, and a proven mailbox is what an organisation admitting
          people by their email domain checks. Its limit: this site learns an
          address and nothing else, so a submittal recorded under it stays a
          typed claim — there is no repository owner to compare it against.
        </p>

        <p className="m-0 max-w-[68ch] font-display text-meta leading-normal text-ink-muted">
          <span className="hl-mark text-ink">CONTINUE WITH GITHUB</span> — one
          press, and it brings along the handle a roster prints and a submittal
          is checked against. Its limit: GitHub hands this site no address it
          can prove, so joining an organisation by its email domain does not
          work under a GitHub-only account.
        </p>

        <p className="m-0 mt-3 max-w-[68ch] font-display text-meta leading-normal text-ink-muted">
          <span className="hl-mark text-ink">CONTINUE WITH GOOGLE</span> — one
          press, and the copy off this browser that any account gives. It is the
          GitHub door without the handle: no address this site can prove, so no
          domain join, and no repository owner to compare a submittal against,
          so a submittal recorded under it stays a typed claim. The table below
          prints the difference as a row rather than leaving it to this
          paragraph.
        </p>
      </section>

      {/* The provider is mounted here rather than in the root layout: §12.2's
          channel B islands are mounted where they are consumed, and the 32
          sheets consume nothing from it. `AuthPanels.tsx` records the full
          argument. */}
      <SessionProvider>
        <SignInPanel />
      </SessionProvider>

      <section className="hl-panel" aria-labelledby="hl-door-table">
        <div className="hl-panel-head">
          <h2 id="hl-door-table" className="hl-panel-title">
            What each door does
          </h2>
          <p className="hl-mark m-0 text-ink-faint">READ ACROSS BEFORE YOU PICK</p>
        </div>

        {/* Every wide thing scrolls inside its own container, and the page body
            never scrolls sideways (§11.10). `data-hl-scroller` is what
            `Affordances` measures for §6.5's right-edge fade; `tabIndex={0}`
            because a scroll container a keyboard cannot reach is unusable
            (§10.3). */}
        <div
          className="hl-index-scroll"
          role="region"
          tabIndex={0}
          aria-label="What each sign-in door does"
          data-hl-scroller=""
        >
          <table className="hl-index">
            <caption className="sr-only">
              {`One row per door, and six consequences read across. ${DOOR_CONSEQUENCES
                .map((consequence) => consequence.question)
                .join(' ')}`}
            </caption>
            <colgroup>
              {/* Sums to `.hl-index`'s hand-computed 1060px `min-width`:
                  220 + six columns of 140. Below that the table scrolls
                  rather than crushing `In your orgs` into three lines. */}
              <col style={{ width: '220px' }} />
              {DOOR_CONSEQUENCES.map((consequence) => (
                <col key={consequence.id} style={{ width: '140px' }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Door</th>
                {DOOR_CONSEQUENCES.map((consequence) => (
                  <th key={consequence.id} scope="col">
                    {consequence.heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DOOR_ROWS.map((row) => (
                <tr key={row.id} className="hl-row">
                  <th scope="row" className="hl-row-title">
                    {row.label}
                  </th>
                  {/* One ink for all four answers, and the word is the whole
                      signal. The mockup tinted `Yes` verify-green, `No` faint
                      and `In your orgs` caution-amber; three of those readings
                      are wrong here. T6 reserves the semantic inks for
                      diagrams and status ticks, `--color-ink-faint` is
                      decorative only (T5) and would put the most common answer
                      on this table below the contrast floor, and a colour that
                      vanishes under `forced-colors` cannot be carrying a
                      consequence (§2.6, §10.4). The reader compares words. */}
                  {DOOR_CONSEQUENCES.map((consequence) => (
                    <td key={consequence.id} className="hl-mark">
                      {ANSWER_WORDS[row.cells[consequence.id]]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="hl-note">
        <p>
          Whichever door you take, the record already in this browser is not
          discarded. If the account has a record too, the two are merged
          field by field — a sign-off is never taken back, and no submittal is
          dropped — and you are shown what the merge did before it is kept.
        </p>
        <p>
          The copy an account holds stays until you erase it. Signing out ends
          the session in this browser and removes nothing.
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
