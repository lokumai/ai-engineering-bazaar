import type { Metadata } from 'next'
import Link from 'next/link'
import { CategoryMeter } from '@/components/course/CategoryMeter'
import { CategoryTally } from '@/components/course/CategoryTally'
import { FaceLegend, type FaceLegendRows } from '@/components/mascot/FaceLegend'
import { FLAVOURS } from '@/components/mascot/geometry'
import { Lkm01 } from '@/components/mascot/Lkm01'
import { PathStanding } from '@/components/path/PathStanding'
import { ContinueLine, Diagram, DiagramReadout } from '@/components/record/Diagram'
import { StampShelf } from '@/components/record/StampShelf'
import { Uptime } from '@/components/record/Uptime'
import { PageShell } from '@/components/shell/PageShell'
import { CATEGORIES } from '@/lib/content/categories'
import { moduleGraph } from '@/lib/content/edges'
import { curriculumFacts, type CurriculumFacts, type SheetFact } from '@/lib/content/facts'
import { ROLES } from '@/lib/path/roles'
import { xp } from '@/lib/record/derive'
import { EMPTY_RECORD } from '@/lib/record/schema'

/**
 * §7.1 — `XP 1,240`. Locale-free, the same rule `Readout` applies, because a
 * strip that groups digits differently depending on where it is read is not an
 * instrument. Arithmetic, not policy, so a second copy of it cannot drift.
 */
function group(value: number): string {
  return String(Math.trunc(value)).replace(/\B(?=(\d{3})+$)/g, ',')
}

/**
 * §13.2 — the six legend rows, measured from the corpus.
 *
 * The denominator is a build-time fact and survives; the numerator does not.
 * `signed: null` is the only thing this page can truthfully say about a reader
 * it has never met (§1), and `FaceLegend` prints it as `--` rather than a zero —
 * a `0` here would claim a reading nobody took (§11.25). `CategoryTally` then
 * replaces it from the record, so the legend and the meters below it are one
 * derivation seen twice rather than two that can disagree. The per-sheet
 * truth arrives in frame one on channel A instead, in the meters below and in
 * the faces of the mark itself, because a fill is drawable from a stamped class
 * and a count is not (§12.2).
 *
 * Keyed off `CATEGORIES` rather than off `facts.categories`, because the type
 * requires all six faces to be present: a category with no sheets in the corpus
 * still has a face, and that face has to be able to report a total of zero.
 */
function legendRows(facts: CurriculumFacts): FaceLegendRows {
  // DRAWN sheets, not every sheet — `FaceLegendRow.total` is documented as "the
  // sheets a reader could sign off", and a draft sheet carries no sign-off
  // control at all (§12.4.1). This page first used `category.total`, so the
  // same table printed `--/9` for Expert here and `NOT DRAWN` on `/profile/`:
  // one component, two denominators, which is exactly the drift §11.25 exists
  // to stop. Nine sign-offs nobody can take is also a claim about the reader's
  // future that §1 does not allow.
  const drawn = new Map<string, number>()
  for (const sheet of facts.sheets) {
    if (!sheet.drawn) continue
    drawn.set(sheet.category, (drawn.get(sheet.category) ?? 0) + 1)
  }

  return Object.fromEntries(
    CATEGORIES.map((category) => [
      category.slug,
      {
        title: category.title,
        total: drawn.get(category.slug) ?? 0,
        // Reader state, so channel B: `CategoryTally` fills the numerator from
        // the `data-hl-cat-tally` contract after mount (§12.2).
        signed: null,
      },
    ]),
  ) as FaceLegendRows
}

/** The sheets of one subsystem, in module order — the segment order §13.1.3 fixes. */
function sheetsOf(facts: CurriculumFacts, slug: string): readonly SheetFact[] {
  return facts.sheets
    .filter((sheet) => sheet.category === slug)
    .slice()
    .sort((a, b) => a.module - b.module)
}

export const metadata: Metadata = {
  title: 'Dashboard',
  description:
    'The drawing set as a single-line diagram, with what this browser records '
    + 'against each sheet.',
}

/**
 * §4.10 / §12.10 — the dashboard.
 *
 * A **server** page, and that is load-bearing rather than incidental. It
 * measures the corpus with `curriculumFacts()` and `moduleGraph()`, both of
 * which reach `node:fs`, and hands the result down as plain data; the
 * islands below it read the record. §12.2's import rule is that a single value
 * imported across that line pulls `node:fs` into the browser bundle and the
 * build stops, so the boundary is drawn here, at the page, and nowhere lower.
 *
 * The order is §4.10's, exactly: the readout strip and §12.10.6's `CONTINUE`
 * above the graph, the graph, then the uptime strip and the set-level stamp
 * shelf below it. The stamps and the uptime ticks are records of what happened,
 * not meters of how far along the reader is.
 *
 * **§13 adds two surfaces above the graph and one below it, and §11.38's count
 * has to be restated honestly rather than left as it was.** §13.2 gives this
 * page the mark at 128px with its face legend, and §13.1.3 (5) licenses a
 * per-subsystem meter here by name. So the progress surfaces on this page are
 * now the mark, the readout strip, the diagram and the six meters — and the
 * mark, the legend and the meters are three renderings of ONE reading, taken
 * from the same stamped classes, which is why they cannot disagree. The path
 * panel is not a fifth: it reports a route through the corpus, not the corpus.
 *
 * **The mark and the meters are channel A; every count is channel B or absent**
 * (§12.2). A face fill and a filled segment are drawable from
 * `html.hl-signed-<n>` / `html.hl-cat-<slug>-…` alone, so both are correct in
 * frame one with no React at all. A tally is a computed number and cannot ride
 * a class: the readout strip, the path standing and `CategoryTally` are islands
 * that take theirs after mount, each one printing `--` until it has a reading.
 * The face legend has no island of its own and its numerators stay em dashes,
 * which is what "no reading" looks like and never a zero (§11.25).
 *
 * **Every denominator is derived.** `curriculumFacts()` counts the sheets, the
 * category totals and the traces; the graph asserts its own shape and fails the
 * build on a cycle. Nothing on this page is typed by hand, including the
 * numbers a reader would most expect to be (§11.25).
 */
export default function DashboardPage() {
  const facts = curriculumFacts()
  const edges = moduleGraph().edges

  // Both derived from the corpus, neither from the reader: `xp` ignores the
  // record for `attainableToday`, so the frozen empty record is the right thing
  // to hand it here and the answer is the same for everybody.
  const ceiling = xp(EMPTY_RECORD, facts).attainableToday
  const undrawn = facts.sheets.filter((sheet) => !sheet.drawn).length
  // §13.4.2's denominator, for the nine path readouts below. Measured here
  // because `PathStanding` is a client island and `status: ready` is in the
  // markdown (§12.2).
  const drawnSlugs = facts.sheets.filter((sheet) => sheet.drawn).map((sheet) => sheet.slug)

  return (
    <PageShell>
      <h1 className="hl-listing-title">Dashboard</h1>

      <p className="hl-lead">
        The whole drawing set as one diagram: every sheet, every prerequisite,
        and every cross-reference between sheets in the same subsystem. What
        this browser records against each sheet reaches the mark and the meters
        before the first paint, and every tally after the page loads: a count
        has to be worked out, and a page prerendered once for everybody cannot
        work one out for a reader it has never met.
      </p>

      <hr className="hl-rule-struct" aria-hidden="true" />

      {/* §13.2 — the mark at 128px, and the legend that makes it readable.

          The drawing is `aria-hidden` at every size and in every state
          (§12.18), so the six rows beside it are not a caption about the cube:
          they ARE the cube, in text, and they are what a reader who cannot see
          it gets. Three of the six faces are hidden by the projection, which is
          exactly why the legend prints all six. */}
      <section className="hl-panel" aria-labelledby="mark">
        <div className="hl-panel-head">
          <h2 id="mark" className="hl-panel-title">
            The mark
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Six faces, six subsystems</p>
        </div>
        <div className="flex flex-wrap items-start gap-8">
          <Lkm01 size={128} idPrefix="dashboard" />
          <div className="min-w-[16rem] flex-1">
            <FaceLegend rows={legendRows(facts)} />
          </div>
        </div>
      </section>

      {/* §13.3, §13.4.3 — the role on record and the standing of its path, or
          the plain statement that no role is on record.

          **All nine bodies are in this markup and channel A picks one.**
          `hl-role-<id>` is stamped on `<html>` before first paint, so the role
          and its blurb are right in frame one with no React deciding anything,
          and a reader who has stated nothing gets `.hl-path-empty` — which is
          the honest empty state and not a prompt. The tally inside each body is
          a computed count, so it is channel B and arrives after mount (§12.2).

          A role is NEVER inferred (§13.3): nothing here reads the record, and
          the control that states one lives on `/profile/`. The ordered steps
          live on `/path/` and are deliberately not repeated here — two
          renderings of one ordered list are two things to keep true. */}
      <section className="hl-panel" aria-labelledby="path">
        <div className="hl-panel-head">
          <h2 id="path" className="hl-panel-title">
            Role and path
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Stated, never inferred</p>
        </div>

        <div className="hl-path-empty">
          <p className="hl-mark m-0 text-ink">NO ROLE ON RECORD</p>
          <p className="mt-1 mb-0 max-w-[68ch] font-display text-meta leading-normal text-ink-muted">
            No role is worked out from your name, from the sheets you have
            signed off, or from anything else this browser holds. State one on
            the{' '}
            <Link href="/profile/" className="hl-link">
              profile sheet
            </Link>{' '}
            and a path is drawn for it; leave it unstated and the whole set
            stays exactly as it is.
          </p>
        </div>

        {ROLES.map((role) => (
          <div key={role.id} className="hl-path-body" data-role={role.id}>
            <p className="hl-mark m-0 text-ink-muted">
              Role <span className="text-ink">{role.label}</span>
            </p>
            <p className="mt-1 mb-2 max-w-[68ch] font-display text-meta leading-normal text-ink">
              {role.blurb}
            </p>
            {/* §13.4.2 — the denominator counts drawn steps only, and the
                island says so in the same breath as the numbers. */}
            <PathStanding role={role.id} drawnSlugs={drawnSlugs} />
            <p className="mt-2 mb-0 font-display text-ui leading-normal">
              <Link href="/path/" className="hl-link">
                The steps on this path, in order
              </Link>
            </p>
          </div>
        ))}
      </section>

      {/* §7.1 — the full readout strip, above the graph. `TRACES` is the one
          cell only this page can fill, so it is wired here (see
          `DiagramReadout`); the strip itself is the shell's single §7.1
          component, which also carries §5.2's compact form in the footer. */}
      <DiagramReadout facts={facts} edges={edges} />

      {/* §12.5.1 — the ceiling, and why it is low. This line needs no island at
          all: `attainableToday` is a fact about the corpus, not about the
          reader, so the server can print it and it is correct in frame one.
          §7.2's "7,200 at full build-out" is WITHDRAWN — seventeen sheets are
          unwritten, so their Quick Checks and checklists do not exist and their
          contribution is not derivable. Saying that is honest; inventing the
          number would be §11.25's failure, and a reader can see at a glance
          that the ceiling is low because the curriculum is unfinished rather
          than because they are behind. */}
      <p className="hl-mark mt-2 text-ink-muted">
        {group(ceiling)} attainable today
        {undrawn > 0 && (
          <> · Full-set ceiling not yet derivable — {undrawn} sheets undrawn</>
        )}
      </p>

      {/* §12.10.6 — one line, the next ready sheet that is not signed off, and
          absent when there is none. Its absence is the first thing a returning
          reader notices, which is the whole reason it is this cheap. */}
      <div className="mt-4 mb-4">
        <ContinueLine facts={facts} />
      </div>

      <Diagram facts={facts} edges={edges} />

      {/* §13.1.3 (5), §13.5 — one segmented meter per subsystem, in curriculum
          order, each with its own printed count under it.

          A segment is one sheet, in module order, and a sheet nobody has drawn
          is dashed and can never fill (§13.4.2) — so the meter states how much
          of the subsystem EXISTS as well as how much of it is signed off, which
          a bar could not. It is channel A throughout: no arithmetic, no
          hydration, right in frame one.

          The hue is never the carrier (SC 1.4.1, §13.1.4). Every row prints its
          flavour name, its subsystem title and its count, and the segments keep
          their borders and their dashes when `forced-colors: active` drops
          every hue. */}
      <section className="hl-panel" aria-labelledby="meters">
        <div className="hl-panel-head">
          <h2 id="meters" className="hl-panel-title">
            Subsystems
          </h2>
          <p className="hl-mark m-0 text-ink-faint">One segment per sheet</p>
        </div>
        <ul className="m-0 grid list-none gap-3 p-0">
          {CATEGORIES.map((category) => {
            const sheets = sheetsOf(facts, category.slug)
            return (
              <li key={category.slug} className="grid gap-1">
                <p className="hl-mark m-0 flex flex-wrap items-baseline gap-x-2">
                  {/* §13.9 — the flavour name in Turkish, stored uppercase, and
                      the English title beside it every time it is printed. */}
                  <span className="text-ink">{FLAVOURS[category.slug]}</span>
                  <span className="text-ink-muted">{category.title}</span>
                </p>
                {/* The meter prints its own count under the segments, and
                    `CategoryTally` below fills the numerator after mount —
                    which is why nothing here prints a second one. */}
                <CategoryMeter category={category.slug} sheets={sheets} />
              </li>
            )
          })}
        </ul>
        {/* §12.2 channel B — one island per document fills every `--/7` the
            meters drew. It renders nothing of its own, and with scripting off
            every cell keeps the dash, which is the true statement that no
            record was read. */}
        <CategoryTally facts={facts} />
      </section>

      {/* §7.3 — the uptime strip, dashboard only, once. No flame, no modal, no
          notification, and an empty strip is never rendered as a deficit. */}
      <section className="hl-panel mt-8" aria-labelledby="uptime">
        <div className="hl-panel-head">
          <h2 id="uptime" className="hl-panel-title">
            Uptime
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Last 14 days</p>
        </div>
        <Uptime />
      </section>

      {/* §7.4 — the nine set-level stamps at 168 × 44, in one row that wraps.
          Every locked stamp states its exact threshold and its live count
          (§12.5.4), and the three the corpus cannot supply today say so in
          sheets drawn rather than going quietly missing (§12.5.6). */}
      <section className="hl-panel" aria-labelledby="stamps">
        <div className="hl-panel-head">
          <h2 id="stamps" className="hl-panel-title">
            Stamps
          </h2>
          <p className="hl-mark m-0 text-ink-faint">
            Threshold and count, always
          </p>
        </div>
        <StampShelf facts={facts} />
      </section>

      {/* §12.1.7 places the durability disclosure on the index sheet and on
          SHEET 00, and nowhere else. It is not repeated here: a note that
          appears on every page carrying a number is a banner, which is the one
          thing that section rules out. */}
    </PageShell>
  )
}
