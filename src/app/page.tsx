import type { Metadata } from 'next'
import Link from 'next/link'
import { KeepingYourPlace } from '@/components/home/KeepingYourPlace'
import { ContinueLine } from '@/components/record/Diagram'
import { CourseCompletion, type CompletionLevel } from '@/components/record/CourseCompletion'
import { PageShell } from '@/components/shell/PageShell'
import { CATEGORIES } from '@/lib/content/curriculum-file'
import { curriculumFacts } from '@/lib/content/facts'
import { corpusTotals, indexStatement, sheetRows } from '@/lib/content/manifest'
import { HOME_SCOPE } from '@/lib/record/scope'
import { INDEX_ROUTE } from '@/lib/route-labels'
import { SITE_NAME } from '@/lib/site'
import { hoursMinutes, numberWord, plural } from '@/lib/text'

/**
 * §15.2.2 — one document, so one title, and it claims nothing about the reader.
 *
 * `title.absolute` rather than a bare string: the root layout sets the template
 * `%s · AI Engineering Bazaar`, and a plain `title: SITE_NAME` here would print
 * the site's name twice in the tab. The rejected alternative was to export no
 * `metadata` at all and inherit the layout's default — which gives the right
 * title but leaves the front door describing itself with the site-wide
 * description, the one string on the site that spells a module count into prose.
 * The home page states its counts where they are measured, so the description
 * states the shape of the place and no number.
 *
 * "Where you left off" and "Welcome back" are both refused here: one document
 * serves every reader and the tab is written once, at build time, for a reader
 * the build has never met.
 */
export const metadata: Metadata = {
  title: { absolute: SITE_NAME },
  description:
    'The front door: what this course is, the module to start on, how far you '
    + 'are through it, and where your reading is kept.',
}

/**
 * M13 — the home page, option **A**: say what it is, then show the levels.
 *
 * ## What changed, and what the author asked for
 *
 * The author chose home **A** out of three, having seen all three: a course
 * landing page that answers *what is this, why this and not the hundredth AI
 * blog, and where do I start* in one screen, with the levels doubling as the
 * table of contents. What it replaced was a page in two halves — a first-visit
 * document and a returning-reader document, one of them hidden by CSS — whose
 * own cost the playground stated plainly: nine numbers about an empty record
 * for a stranger, and a hunt for the module you were on for everybody else.
 *
 * **So this is ONE document for both readers, and the branch is gone.** What
 * survives of it is one line: `.hl-home-continue` is the only thing on the page
 * keyed off `data-hl-record`, so a reader with a record gets the shortest path
 * back to work above the fold and a reader without one is not shown a control
 * for a state they are not in. That is the whole of the two-state machinery
 * that is left, and it is still channel A (§12.2, §15.2.1) — stamped before
 * first paint, so it costs no JavaScript and cannot be wrong for a frame.
 *
 * ## Completion control C is on this page, and that is D14
 *
 * *"A at the end of a module, because the reader wants one button there, and C
 * on the home and progress pages."* `CourseCompletion` is C: every level, every
 * module, the reader's own state visible and adjustable without opening
 * anything. It doubles as home A's level grid, which is the property A was
 * chosen for — the levels ARE the table of contents — so the page shows the
 * shape of the course to a stranger and the reader's own progress through it to
 * everybody else, out of one component and one derivation.
 *
 * Every tick in it is channel A and correct in frame one; every count is
 * channel B and prints `--` until the store answers. That split is M13's
 * acceptance criterion about the flash of an empty record, and
 * `CourseCompletion` carries the reasoning.
 *
 * ## Every number here is measured
 *
 * Not one count in this file is typed (§11.25). The statement is
 * `indexStatement()`, the strip is `corpusTotals()`, the first module is
 * `sheetRows()[0]`, and the levels come from `CATEGORIES` walked against
 * `sheetRows()`. Break one derivation and the page changes, which is the test
 * M13 asks for.
 *
 * **The lead action's target is a slug, not a number.** The first entry point is
 * the first row of the set as the corpus orders it, because the set has been
 * renumbered once already: a number is a label and a slug is an identity
 * (§12.1.3).
 *
 * ## What the page refuses to draw
 *
 * No hero image, no gradient, and no "get started" control that leads to a
 * second choice (§11.3, §15.2.4) — the primary action is the first module. No
 * percentage (§11.35). No modal, no banner and no dismissible box over the
 * identity strip, and no sentence anywhere claiming that signing in saves what
 * the browser is already keeping (§15.5.4). And nothing on it requires an
 * account: signed out is the default and it is complete.
 */
export default function HomePage() {
  const rows = sheetRows()
  const facts = curriculumFacts()
  const totals = corpusTotals()

  // The first row of the set, and the size of the level it opens. Both measured
  // off the same array, so the card cannot name one module and count another.
  const first = rows[0]
  const firstLevel = rows.filter(
    (row) => row.subsystem.order === first.subsystem.order,
  ).length

  /**
   * Control C's input: every level in curriculum order, with every module in
   * it — drawn or not, because the denominator is the level and not the part of
   * it somebody has written (§11.25).
   *
   * Measured here because `lib/content/*` reaches `node:fs` and control C is a
   * client island: a single value imported across that line pulls `node:fs`
   * into the browser bundle and stops the build (§12.2).
   */
  const levels: readonly CompletionLevel[] = CATEGORIES.map((category) => ({
    slug: category.slug,
    title: category.title,
    order: category.order,
    modules: rows
      .filter((row) => row.subsystem.slug === category.slug)
      .map((row) => ({
        slug: row.slug,
        module: row.module,
        title: row.title,
        path: row.path,
        drawn: row.drawn,
      })),
  }))

  return (
    <PageShell column={false}>
      <div className="hl-home-hero">
        {/* §15.2.2 — one h1 for one document, and it says what the place is
            rather than repeating the wordmark two rows above it. */}
        <h1 className="hl-hero-title">
          AI engineering, written by someone who builds it.
        </h1>

        {/* §15.2.3 — the measured statement, then the one line that is not a
            measurement but a commitment, kept in `scope.ts` with the other
            three sentences about where the record goes (§15.9.1). */}
        <div className="hl-statement">
          {[...indexStatement(), HOME_SCOPE].map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        {/* §15.2.1 — the only thing on this page that knows about the reader
            before React does. Absent for a browser with no record, which is
            what makes it a shortcut rather than a prompt. */}
        <div className="hl-home-continue">
          <ContinueLine facts={facts} />
        </div>

        <div className="hl-hero-actions">
          {/* DESIGN.md, Components — one `button-primary` per screen region,
              and this is the home page's. §15.2.4: the primary action opens a
              module rather than a menu. */}
          <Link className="bz-btn" href={first.path}>
            Start with {first.title}
          </Link>
          <Link className="bz-btn" href={INDEX_ROUTE}>
            Browse the catalog
          </Link>
        </div>

        {/* The four facts, each one counted from the corpus. A dash is
            impossible here: these are measurements of the repository, so the
            honest empty form of any of them is a zero somebody counted. */}
        <ul className="hl-facts">
          <li>
            <span className="hl-facts-value">
              {totals.ready} of {totals.modules}
            </span>
            modules written
          </li>
          <li>
            <span className="hl-facts-value">{hoursMinutes(totals.minutes)}</span>
            of reading
          </li>
          <li>
            <span className="hl-facts-value">{totals.figures}</span>
            diagrams and figures
          </li>
          <li>
            <span className="hl-facts-value">{totals.sources}</span>
            sources cited
          </li>
        </ul>
      </div>

      {/* D14's control C, and home A's level grid: one component, because they
          are the same thing seen by two readers. */}
      <div className="bz-panel-head">
        <h2 id="hl-home-levels" className="bz-panel-title">
          The {numberWord(levels.length)} levels
        </h2>
        <p className="bz-panel-note">
          {plural(firstLevel, 'module')} in {first.subsystem.title}, which
          assumes you write software and assumes nothing else
        </p>
      </div>
      <CourseCompletion facts={facts} levels={levels} headingId="hl-home-levels" />

      {/* Home A's second half: the argument for reading this rather than the
          next thing a search returns. Four claims, each one checkable against
          the corpus itself, and none of them about the reader. */}
      <section className="bz-panel" aria-labelledby="hl-home-why">
        <div className="bz-panel-head">
          <h2 id="hl-home-why" className="bz-panel-title">
            Why this and not the hundredth AI blog
          </h2>
          <p className="bz-panel-note">Four reasons, all of them checkable</p>
        </div>
        <dl className="hl-why">
          <div>
            <dt>A person wrote it</dt>
            <dd>
              Most of this is too new for a model to have read anything reliable
              about. Every claim comes from a primary source, dated, and the
              module says which.
            </dd>
          </div>
          <div>
            <dt>It reads like being told</dt>
            <dd>
              Ask an engineer in person and you get a straight answer with the
              caveats attached. That is the voice here.
            </dd>
          </div>
          <div>
            <dt>Short on purpose</dt>
            <dd>
              {hoursMinutes(Math.round(totals.minutes / Math.max(1, totals.ready)))} a
              module on average, then links out when you want more.
            </dd>
          </div>
          <div>
            <dt>The pictures do the work</dt>
            <dd>
              {totals.figures} diagrams and figures, because a loop is easier to
              see than to read.
            </dd>
          </div>
        </dl>
      </section>

      {/* §15.2.5 — identity arrives last and quietly: three rows of fact and
          two links, with nothing on the page behind them. */}
      <KeepingYourPlace />
    </PageShell>
  )
}
