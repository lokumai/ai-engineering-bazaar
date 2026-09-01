import Link from 'next/link'
import { CategoryBlock } from '@/components/sheet/CategoryBlock'
import type { TickState } from '@/components/sheet/TickGauge'
import { DOOR_ROWS } from '@/lib/auth/doors'
import { plural } from '@/lib/text'

/**
 * §15.2 — the first-visit half of the home screen, and the document a static
 * export can honestly prerender.
 *
 * **A server component, and it is always in the DOM.** `home.css` hides it for
 * a reader whose record `lib/record/boot.ts` found before first paint
 * (§15.2.1); it hides nothing for anybody else, including a reader with
 * scripting off, which is why this block — not the resume block — is the state
 * the prerendered HTML is in. §12.2 forbids the alternative outright: a block
 * chosen in an effect is wrong for one frame on every load.
 *
 * **Not one number here is typed** (§11.25). Every count arrives measured, as a
 * prop: the statement lines from `indexStatement()` plus `HOME_SCOPE`, the
 * first sheet from `sheetRows()[0]`, the six subsystems from `CATEGORIES` with
 * their coverage from `categorySummary()`. Nothing is computed in this file —
 * `plural` chooses a word for a number somebody else counted, and that is the
 * whole of the arithmetic (§14.9).
 *
 * **The primary action is the first sheet, not a menu** (§15.2.4). The lead
 * card opens sheet 01; the set and the path follow it. The rejected alternative
 * is the ordinary one — a "get started" control that leads to a second choice —
 * which §11.3 has ruled out since the index sheet and which costs a reader who
 * wants to read a sheet one extra decision.
 *
 * **Identity arrives last and quietly** (§15.2.5): three rows of fact and two
 * links, at the bottom, with nothing on the page behind them. No modal, no
 * banner, no dismissible box, and no sentence anywhere claiming that signing in
 * saves anything the browser is not already keeping (§15.5.4).
 *
 * **Every heading this block draws is an h2** (§15.2.2). The document's only h1
 * is the page title, and the document's other h2 — the resume block's — is
 * `display: none` for the reader who sees this block, so it heads nothing in
 * this state's outline. The card titles were h3 under that arrangement, which
 * gave a first-time reader h1 → h3 and a level that no heading occupies. Levels
 * are chosen for the outline each record state actually presents, not for the
 * order the two blocks happen to sit in the DOM.
 */

/** §5.4, §7.5 — one subsystem's row: the block, its blurb, and its coverage. */
export interface FirstVisitSubsystem {
  slug: string
  /** `SUBSYSTEM 01`. The order the set is numbered in, never an index. */
  order: number
  title: string
  /** The subsystem's own one-line description, from `CATEGORIES`. */
  blurb: string
  path: string
  /** One tick per sheet, in sheet order: `ticksFrom(categoryRows(category))`. */
  ticks: readonly TickState[]
  /** Measured coverage. Both figures are printed; neither is derived here. */
  sheets: number
  drawn: number
}

/** §15.2.4 — the lead card's target, off the first row of the manifest. */
export interface FirstVisitSheet {
  /** The sheet number as the manifest prints it: `01`. */
  number: string
  title: string
  path: string
  /** The subsystem it opens, by name — `Fundamentals`. */
  subsystem: string
  /** Sheets in that subsystem. Printed, not counted here. */
  subsystemSheets: number
}

export interface FirstVisitProps {
  /**
   * §15.2.3 — the lines of one statement, in the order the page states them:
   * `indexStatement()` and then `HOME_SCOPE`. The component prints what it is
   * handed and adds nothing, and this docblock names the sources rather than
   * how many lines they come to — it said "four lines" while the page rendered
   * five, which is the kind of count §11.25 forbids anybody from typing.
   */
  statement: readonly string[]
  firstSheet: FirstVisitSheet
  /** Rows in the manifest — `sheetRows().length`, for the second card. */
  setSheets: number
  /** Drawn sheets across the set, for the third card. */
  setDrawn: number
  subsystems: readonly FirstVisitSubsystem[]
}

/**
 * §15.5.2 — which doors can show a submittal as verified, read off the table
 * instead of restated beside it.
 *
 * The identity strip used to offer "a verified submittal" for an account of any
 * kind. `DOOR_ROWS` denies that, and it is the authority: `classifySubmittals`
 * matches a submittal's owner against `profiles.github_login`, a column only a
 * GitHub identity writes, so the email-link row answers `no` — and the emailed
 * link is the door this deployment enables. The front door was promising a
 * capability the table one click away refuses, which is the failure mode §1
 * exists to prevent, and `scope.ts`'s docblocks record what the last duplicated
 * claim cost. Derived here, the claim has one author: change a cell and this
 * sentence changes with it.
 */
const VERIFIED_SUBMITTAL_DOORS: readonly string[] = DOOR_ROWS.filter(
  (door) => door.cells.verifiedSubmittal === 'yes',
).map((door) => door.label)

export function FirstVisit({
  statement,
  firstSheet,
  setSheets,
  setDrawn,
  subsystems,
}: FirstVisitProps) {
  return (
    <div className="hl-home-new">
      {/* One statement, however many lines the page measured for it: each line
          is its own <p> so a screen reader pauses where a reader does, and
          `.hl-statement` gives them no paragraph spacing so they do not read as
          separate claims (§3.3). This comment used to say "four lines" and the
          block rendered five — `indexStatement()` plus `HOME_SCOPE` — so it
          names what the lines are rather than counting them (§11.25). */}
      <div className="hl-statement">
        {statement.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <hr className="hl-rule-struct" aria-hidden="true" />

      <ul className="hl-home-cards">
        <li className="hl-home-card hl-home-card-lead">
          <p className="hl-mark m-0 text-ink-muted">
            Start · {firstSheet.subsystem} {firstSheet.number}
          </p>
          <h2 className="hl-home-card-title">{firstSheet.title}</h2>
          <p className="hl-home-card-note">
            The first of {plural(firstSheet.subsystemSheets, 'sheet')} in{' '}
            {firstSheet.subsystem}. It assumes you write software and assumes
            nothing else.
          </p>
          <p className="hl-home-card-go">
            <Link className="hl-btn" href={firstSheet.path}>
              Read sheet {firstSheet.number}
            </Link>
          </p>
        </li>

        <li className="hl-home-card">
          <p className="hl-mark m-0 text-ink-muted">
            Browse · {plural(setSheets, 'row')}
          </p>
          {/* Titled for where it goes. It read "The whole drawing set", which is
              the NAME of `/courses/`: two pages carried one name and each of
              their leads sent the reader to the other. `/sheets/` calls itself
              the sheet index, on the page and in `route-labels.ts`, and the
              banded set keeps the name it has. */}
          <h2 className="hl-home-card-title">The sheet index</h2>
          <p className="hl-home-card-note">
            One table: every sheet, its subsystem, its extent, and whether it is
            drawn. Filter it by subsystem, by state or by language.
          </p>
          <p className="hl-home-card-go">
            <Link className="hl-btn" href="/sheets/">
              Open the index
            </Link>
          </p>
        </li>

        <li className="hl-home-card">
          <p className="hl-mark m-0 text-ink-muted">
            Order · {setDrawn} drawn
          </p>
          <h2 className="hl-home-card-title">The path through them</h2>
          <p className="hl-home-card-note">
            The order the sheets are read in, and what each one needs before it.
          </p>
          <p className="hl-home-card-go">
            <Link className="hl-btn" href="/path/">
              Follow the path
            </Link>
          </p>
        </li>
      </ul>

      {/* §5.4 — the category block, reused rather than restyled: the same
          `SUBSYSTEM 0n` / name / tick gauge it draws on every listing page,
          with the subsystem's own line of prose beside it. The gauge reports
          the DRAWING SET — which sheets exist — and is true for everybody in
          every frame, which is what makes it the right instrument on a document
          that has never met the reader (§7.5). */}
      <section className="hl-panel" aria-labelledby="hl-home-subsystems">
        <div className="hl-panel-head">
          {/* Not "Six subsystems": a count typed into a heading is a count
              nobody measured, and the six blocks below are their own tally
              (§11.25). The manifest and the dashboard head this panel the same
              way, so one subject reads one way on three screens. */}
          <h2 id="hl-home-subsystems" className="hl-panel-title">
            Subsystems
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Counted from the files</p>
        </div>

        <ul className="hl-home-rows">
          {subsystems.map((subsystem) => (
            <li key={subsystem.slug} className="hl-home-row" data-cat={subsystem.slug}>
              <CategoryBlock
                order={subsystem.order}
                title={subsystem.title}
                path={subsystem.path}
                ticks={subsystem.ticks}
              />
              <p className="hl-home-row-note">{subsystem.blurb}</p>
              {/* §12.14.1 — one spelling of this status, everywhere: the
                  manifest, the filter chip, the module row and the diagram all
                  say NOT DRAWN. */}
              <p className="hl-mark hl-home-row-stat">
                {subsystem.drawn === 0
                  ? `${plural(subsystem.sheets, 'sheet')} · not drawn`
                  : `${subsystem.drawn} of ${plural(subsystem.sheets, 'sheet')} drawn`}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* §15.2.5 — the identity strip. Three rows of fact and two links, and
          the reader can take none of them and lose nothing: the record is being
          kept either way, which is what the first row says. */}
      <section className="hl-panel" aria-labelledby="hl-home-identity">
        <div className="hl-panel-head">
          <h2 id="hl-home-identity" className="hl-panel-title">
            Keeping your place
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Optional · one or none</p>
        </div>

        <dl className="hl-defs">
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

        <div className="hl-home-actions">
          <Link className="hl-btn" href="/sign-in/alias/">
            Choose an alias
          </Link>
          <Link className="hl-btn" href="/sign-in/">
            See all three
          </Link>
        </div>
      </section>
    </div>
  )
}
