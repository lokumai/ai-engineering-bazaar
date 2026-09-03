import type { Metadata } from 'next'
import Link from 'next/link'
import { CategoryMeter } from '@/components/course/CategoryMeter'
import { CategoryTally } from '@/components/course/CategoryTally'
import { FaceLegend, type FaceLegendRows } from '@/components/mascot/FaceLegend'
import { FLAVOURS } from '@/components/mascot/geometry'
import { Lkm01 } from '@/components/mascot/Lkm01'
import { PathStanding } from '@/components/path/PathStanding'
import { AttentionPanel, type AttentionSheet } from '@/components/record/AttentionPanel'
import { ContinueLine, Diagram, DiagramReadout } from '@/components/record/Diagram'
import { StampShelf } from '@/components/record/StampShelf'
import { Uptime } from '@/components/record/Uptime'
import { PageShell } from '@/components/shell/PageShell'
import type { CategorySlug } from '@/lib/content/categories'
import { CATEGORIES } from '@/lib/content/curriculum-file'
import { moduleGraph } from '@/lib/content/edges'
import { curriculumFacts, type CurriculumFacts, type SheetFact } from '@/lib/content/facts'
import { ROLES } from '@/lib/path/roles'
import { xp } from '@/lib/record/derive'
import { EMPTY_RECORD } from '@/lib/record/schema'
import { plural } from '@/lib/text'

/**
 * §7.1 — `XP 1,240`. Locale-free, the same rule `Readout` applies, because a
 * strip that groups digits differently depending on where it is read is not an
 * instrument. Arithmetic, not policy, so a second copy of it cannot drift.
 */
function group(value: number): string {
  return String(Math.trunc(value)).replace(/\B(?=(\d{3})+$)/g, ',')
}

/**
 * §11.25 — the em dash is "this cannot be derived", and §15.3.1 asks for it in
 * the tally of a subsystem that holds nothing signable.
 *
 * A local constant, and knowingly the third copy of one glyph in this codebase:
 * `lib/content/manifest.ts` and `lib/content/title-block.ts` each hold a
 * private, unexported `DASH`, and both of those modules reach `node:fs`, so
 * neither can become the shared one for a component tree that includes islands.
 */
const DASH = '—'

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
  return Object.fromEntries(
    CATEGORIES.map((category) => [
      category.slug,
      {
        title: category.title,
        // DRAWN sheets, not every sheet — `FaceLegendRow.total` is documented
        // as "the sheets a reader could sign off", and a draft sheet carries no
        // sign-off control at all (§12.4.1). This page first used
        // `category.total`, so the same table printed `--/9` for Expert here and
        // `NOT DRAWN` on `/profile/`: one component, two denominators, which is
        // exactly the drift §11.25 exists to stop. Nine sign-offs nobody can
        // take is also a claim about the reader's future that §1 does not allow.
        total: drawnOf(facts, category.slug).length,
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

/** The signable subset of one subsystem: §15.3.1's denominator, and nothing else. */
function drawnOf(facts: CurriculumFacts, slug: string): readonly SheetFact[] {
  return sheetsOf(facts, slug).filter((sheet) => sheet.drawn)
}

/**
 * §15.7 — the build-time half of the attention list.
 *
 * The panel is handed every sheet in the set rather than the drawn ones alone.
 * `selectAttention` iterates the RECORD, and a record can legitimately hold an
 * entry for a sheet that has since been un-drawn (an import, a renamed file):
 * the honest row for that sheet names it and says `NOT DRAWN`, which it cannot
 * do if the page withheld the title (§12.1.3).
 *
 * The subsystem title travels as a string. The panel is an island and
 * `lib/content/*` reaches `node:fs`, so the measuring is done here and the
 * result crosses as plain data — §12.2's import direction, exactly as
 * `CategoryMeter`'s sheets and `FaceLegend`'s rows already do.
 */
function attentionSheets(facts: CurriculumFacts): readonly AttentionSheet[] {
  const titles = new Map(CATEGORIES.map((category) => [category.slug as string, category.title]))
  return facts.sheets
    .slice()
    .sort((a, b) => a.module - b.module)
    .map((sheet) => ({
      slug: sheet.slug,
      module: sheet.module,
      title: sheet.title,
      subsystem: titles.get(sheet.category) ?? sheet.category,
      drawn: sheet.drawn,
    }))
}

/**
 * §15.3.1 — the meter for a subsystem in which nothing is signable, and the
 * reason it is not `CategoryMeter`.
 *
 * `CategoryMeter` always writes the `data-hl-cat-tally` contract, and
 * `CategoryTally` fills every such cell with `approved/total` out of
 * `categoryProgress` — whose total is every sheet in the category, drawn or
 * not. On a subsystem where none of them is drawn that is precisely the `0/9`
 * §15.3.1 forbids: a reader is shown a denominator of nine sign-offs that no
 * control on this site can take. So this form omits the contract, and the
 * island therefore never touches the cell.
 *
 * Nothing is redrawn: the segments are `lokum.css`'s own `.hl-meter` /
 * `.hl-seg[data-drawn="false"]`, which are already dashed and already
 * unfillable. `data-module` is omitted as well, so no `html.hl-signed-<n>`
 * class can fill a segment for a sheet nobody has written even from a
 * hand-edited record (§12.1.3).
 *
 * The tally is the em dash §15.3.1 asks for, followed by the register's own
 * word for the state. Both are needed: the dash alone left a reader to guess
 * between "no sheets" and "cannot be worked out" (the measurement recorded in
 * `FaceLegend`), and `FaceLegend` prints `NOT DRAWN` in the same table on this
 * same page — two spellings of one status on one screen is the drift §12.14.1
 * bans.
 *
 * The count takes `plural` rather than a written-in `sheets`. Protocols & specs
 * is a subsystem of one and nothing in it is drawn, so it takes this branch and
 * the line read `1 sheets` — a typed word contradicting the measured number
 * beside it, on a page whose whole claim is that its numbers are derived
 * (§11.25). The corpus is the thing that changes, so the word is chosen from
 * the count for the same reason the count is not typed.
 */
function UnsignableMeter({
  category,
  sheets,
}: {
  category: CategorySlug
  sheets: readonly SheetFact[]
}) {
  if (sheets.length === 0) return null

  return (
    <div>
      {/* Decoration, deliberately: the line below states the same reading in
          text, which is the only condition under which a gauge may be silent
          (§10.4). */}
      <div className="hl-meter w-44" aria-hidden="true">
        {sheets.map((sheet) => (
          <span key={sheet.module} className="hl-seg" data-cat={category} data-drawn="false" />
        ))}
      </div>
      <p className="hl-mark m-0 mt-1 text-ink-muted">
        {DASH} signed off · {plural(sheets.length, 'sheet')}, NOT DRAWN
      </p>
    </div>
  )
}

export const metadata: Metadata = {
  title: 'Dashboard',
  description:
    'The sheets waiting on you and why, then the drawing set as a single-line '
    + 'diagram with what this browser records against each sheet.',
}

/**
 * §4.10 / §12.10 / §15.7 — the dashboard.
 *
 * A **server** page, and that is load-bearing rather than incidental. It
 * measures the corpus with `curriculumFacts()` and `moduleGraph()`, both of
 * which reach `node:fs`, and hands the result down as plain data; the
 * islands below it read the record. §12.2's import rule is that a single value
 * imported across that line pulls `node:fs` into the browser bundle and the
 * build stops, so the boundary is drawn here, at the page, and nowhere lower.
 *
 * **§15.7 changes the order, and the change is the point.** Waiting on you is
 * the first panel on the page, above the mark, above the readout strip and
 * above every meter. §4.10's order put the instruments first, which reads as a
 * report card: a reader arriving mid-course met four renderings of how far
 * along they are before anything told them what to do next. The rest of §4.10's
 * order is untouched below it — the readout strip and §12.10.6's `CONTINUE`
 * above the graph, the graph, then the uptime strip and the set-level stamp
 * shelf. The stamps and the uptime ticks are records of what happened, not
 * meters of how far along the reader is.
 *
 * **Every row in that first panel prints why it is there** (§15.7). A list that
 * cannot explain itself is a list a reader learns to ignore, and the reason is
 * `attention.ts`'s own — this page adds no rule, no threshold and no second
 * definition of "stalled". A sheet leaves the list when it is signed off and
 * never because time passed, which is `selectAttention`'s first line and is
 * stated in the panel rather than left to be inferred.
 *
 * §13 gives this page the mark at 128px with its face legend (§13.2) and
 * licenses a per-subsystem meter here by name (§13.1.3 (5)). So the progress
 * surfaces are the mark, the readout strip, the diagram and the six meters —
 * and the mark, the legend and the meters are three renderings of ONE reading,
 * taken from the same stamped classes, which is why they cannot disagree. The
 * path panel is not a fifth: it reports a route through the corpus, not the
 * corpus. **The attention panel is not a fifth either** (§11.38): it holds no
 * numerator, no denominator and no ratio, and the three counts on this page are
 * the three `/` and `/profile/` read.
 *
 * **The mark and the meters are channel A; every count is channel B or absent**
 * (§12.2). A face fill and a filled segment are drawable from
 * `html.hl-signed-<n>` / `html.hl-cat-<slug>-…` alone, so both are correct in
 * frame one with no React at all. A tally is a computed number and cannot ride
 * a class: the readout strip, the path standing and `CategoryTally` are islands
 * that take theirs after mount, each one printing `--` until it has a reading.
 * The attention list is on the same channel and for a stronger reason — nothing
 * `boot.ts` stamps can tell a sheet the reader left from one they never opened.
 * The face legend has no island of its own and its numerators stay em dashes,
 * which is what "no reading" looks like and never a zero (§11.25).
 *
 * **Every denominator is derived, and §15.3.1 shrinks two of them.** An undrawn
 * sheet enters no denominator: `legendRows` and the meters below count the
 * sheets a reader could actually sign off, and a subsystem with none of them
 * gets `UnsignableMeter` — dashed throughout, tallied with an em dash, and
 * carrying no tally contract for an island to fill with a zero. Nothing on this
 * page is typed by hand, including the numbers a reader would most expect to be
 * (§11.25).
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
        What is waiting on you and why, and then the whole drawing set as one
        diagram: every sheet, every prerequisite, and every cross-reference
        between sheets in the same subsystem. This page holds nothing the record
        in this browser does not already hold. What it records against each
        sheet reaches the mark and the meters before the first paint, and every
        tally after the page loads: a count has to be worked out, and a page
        prerendered once for everybody cannot work one out for a reader it has
        never met.
      </p>

      <hr className="hl-rule-struct" aria-hidden="true" />

      {/* §15.7 — the first panel on the page, above every meter.

          The heading is what the list is FOR and the strapline is the state it
          reports, in the register's one spelling of it (`OPENED, NOT SIGNED
          OFF`, which the roster table and the person sheet also print). The
          rows and the reasons come from `attention.ts` through the island; this
          markup contributes the frame and nothing else. */}
      <section className="hl-panel" aria-labelledby="waiting">
        <div className="hl-panel-head">
          <h2 id="waiting" className="hl-panel-title">
            Waiting on you
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Opened, not signed off</p>
        </div>
        <AttentionPanel sheets={attentionSheets(facts)} />
      </section>

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
          than because they are behind.

          The undrawn count takes `plural` too. Seventeen sheets are undrawn
          today, so a written-in `sheets` was true by accident; the corpus is
          the thing that changes, and the sentence has to survive the last
          sheet being drafted as well as the first. */}
      <p className="hl-mark mt-2 text-ink-muted">
        {group(ceiling)} attainable today
        {undrawn > 0 && (
          <>
            {' '}· Full-set ceiling not yet derivable — {plural(undrawn, 'sheet')}{' '}
            undrawn
          </>
        )}
      </p>

      {/* §12.10.6 — one line, the next ready sheet that is not signed off, and
          absent when there is none. It is not the panel at the top of the page
          and does not duplicate it: this names the next sheet to OPEN, in
          curriculum order, while that one names sheets already opened and left.
          Its absence is the first thing a returning reader notices, which is
          the whole reason it is this cheap. */}
      <div className="mt-4 mb-4">
        <ContinueLine facts={facts} />
      </div>

      <Diagram facts={facts} edges={edges} />

      {/* §13.1.3 (5), §13.5, §15.3.1 — one segmented meter per subsystem, in
          curriculum order, each with its own printed count under it.

          A segment is one sheet, in module order, and a sheet nobody has drawn
          is dashed and can never fill (§13.4.2) — so the meter states how much
          of the subsystem EXISTS as well as how much of it is signed off, which
          a bar could not. It is channel A throughout: no arithmetic, no
          hydration, right in frame one.

          A subsystem with nothing drawn takes `UnsignableMeter` instead, which
          is dashed end to end and tallied with an em dash: `0/9` would offer a
          denominator of nine sign-offs that no control on this site can take
          (§15.3.1).

          The hue is never the carrier (SC 1.4.1, §13.1.4). Every row prints its
          flavour name, its subsystem title and its count, and the segments keep
          their borders and their dashes when `forced-colors: active` drops
          every hue. */}
      <section className="hl-panel" aria-labelledby="meters">
        <div className="hl-panel-head">
          <h2 id="meters" className="hl-panel-title">
            Subsystems
          </h2>
          <p className="hl-mark m-0 text-ink-faint">
            One segment per sheet · dashed where NOT DRAWN
          </p>
        </div>
        <ul className="m-0 grid list-none gap-3 p-0">
          {CATEGORIES.map((category) => {
            const sheets = sheetsOf(facts, category.slug)
            const signable = sheets.filter((sheet) => sheet.drawn)
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
                {signable.length === 0 ? (
                  <UnsignableMeter category={category.slug} sheets={sheets} />
                ) : (
                  <CategoryMeter category={category.slug} sheets={sheets} />
                )}
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

      {/* §7.3 / §15.7.1 — the uptime strip, dashboard only, once. No flame, no
          modal, no notification, and an empty strip is never rendered as a
          deficit. The line under it says outright that there is no run to keep,
          because a fourteen-day strip is the shape readers have been trained by
          other software to read as a streak — and a reader who thinks one is
          being kept reads a gap as a failure the page never claimed. */}
      <section className="hl-panel mt-8" aria-labelledby="uptime">
        <div className="hl-panel-head">
          <h2 id="uptime" className="hl-panel-title">
            Uptime
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Days with a write, not hours</p>
        </div>
        <Uptime />
        <p className="mt-3 mb-0 max-w-[68ch] font-display text-meta leading-normal text-ink-muted">
          One tick per day on which something was written to the record. There
          is no run to keep and no state a quiet fortnight puts this strip into;
          nothing on this site changes because of what it shows.
        </p>
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
