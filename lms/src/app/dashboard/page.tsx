import type { Metadata } from 'next'
import { ContinueLine, Diagram, DiagramReadout } from '@/components/record/Diagram'
import { StampShelf } from '@/components/record/StampShelf'
import { Uptime } from '@/components/record/Uptime'
import { PageShell } from '@/components/shell/PageShell'
import { moduleGraph } from '@/lib/content/edges'
import { curriculumFacts } from '@/lib/content/facts'
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
 * which reach `node:fs`, and hands the result down as plain data; the five
 * islands below it read the record. §12.2's import rule is that a single value
 * imported across that line pulls `node:fs` into the browser bundle and the
 * build stops, so the boundary is drawn here, at the page, and nowhere lower.
 *
 * The order is §4.10's, exactly: the readout strip and §12.10.6's `CONTINUE`
 * above the graph, the graph, then the uptime strip and the set-level stamp
 * shelf below it. Nothing on this page is a fourth progress surface (§11.38): the diagram
 * is the node graph, the strip is the readout, and the mascot in the header is
 * the third — the stamps and the uptime ticks are records of what happened, not
 * meters of how far along the reader is.
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

  return (
    <PageShell>
      <h1 className="hl-listing-title">Dashboard</h1>

      <p className="hl-lead">
        The whole drawing set as one diagram: every sheet, every prerequisite,
        and every cross-reference between sheets in the same subsystem. What
        this browser records against each sheet is drawn onto it after the page
        loads, because a page prerendered once for everybody knows nothing about
        the reader until then.
      </p>

      <hr className="hl-rule-struct" aria-hidden="true" />

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
