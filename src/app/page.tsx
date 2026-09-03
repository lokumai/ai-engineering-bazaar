import type { Metadata } from 'next'
import { FirstVisit } from '@/components/home/FirstVisit'
import { Resume } from '@/components/home/Resume'
import { PageShell } from '@/components/shell/PageShell'
import { ticksFrom } from '@/components/sheet/TickGauge'
import { curriculumFacts } from '@/lib/content/facts'
import {
  categoryRows,
  indexStatement,
  setSummary,
  sheetRows,
  subsystems,
} from '@/lib/content/manifest'
import { HOME_SCOPE } from '@/lib/record/scope'
import { SITE_NAME } from '@/lib/site'

/**
 * §15.2.2 — one document, so one title, and it claims nothing about the reader.
 *
 * `title.absolute` rather than a bare string: the root layout sets the template
 * `%s · AI Engineering Bazaar`, and a plain `title: SITE_NAME` here would print
 * the site's name twice in the tab. The rejected alternative was to export no
 * `metadata` at all and inherit the layout's default — which gives the right
 * title but leaves the front door describing itself with the site-wide
 * description, the one string on the site that spells a sheet count into prose.
 * The home screen states its counts in the statement, where they are measured,
 * so the description states the shape of the place and no number.
 *
 * "Where you left off" and "Welcome back" are both refused here: two states
 * share this document and the tab is written once, at build time, for a reader
 * the build has never met.
 */
export const metadata: Metadata = {
  title: { absolute: SITE_NAME },
  description:
    'The front door: what the set is, the sheet to start on, the whole set, '
    + 'the path through it, and where your reading is kept.',
}

/**
 * §15.2 — the home screen. One document, two states, no branch.
 *
 * **The state is chosen by CSS, and this page does not know which one won.**
 * Both blocks are rendered unconditionally and always sit in the DOM;
 * `home.css` keys the swap off `data-hl-record`, which `lib/record/boot.ts` has
 * stamped on `<html>` before first paint since Phase 2 (§15.2.1). The rejected
 * alternative is the ordinary React one — read the store, render one block —
 * and §12.2 rules it out by name: a block selected in an effect is wrong for
 * one frame on every load, and a static export has no reader to select for at
 * build time. So there is no hook here, no `Suspense`, no `dynamic`, and no
 * condition on the record. `Resume` is written first because that is where
 * §15.2 puts it for the reader who has a record, and with no stylesheet at all
 * a reader gets both blocks in the order the section states them.
 *
 * **Every number is measured here and passed down.** Neither block computes a
 * count (§14.9): this page reads the corpus — `indexStatement()`,
 * `setSummary()`, `sheetRows()`, `subsystems()`, `curriculumFacts()` — and both
 * components print what they are handed. That is also the §12.2 import rule
 * made visible: `lib/content/*` reaches `node:fs`, so it may be touched from a
 * server component and from nowhere else, and the counts cross into the islands
 * inside those two blocks as serialised props.
 *
 * **The lead card's target is a slug, not a number.** The first entry point is
 * `sheetRows()[0]` — the first row of the set as the corpus orders it — because
 * the set has been renumbered once already, and a number is a label while a
 * slug is an identity (§12.1.3). Its subsystem's size is counted off the same
 * rows for the same reason: typing "of seven" here would be a count nobody
 * measured (§11.25), wrong the day a sheet moves band.
 *
 * **What the page refuses to draw.** No hero, no gradient, no "Get started"
 * control that leads to a second choice (§11.3, §15.2.4) — the primary action
 * is the first sheet. No percentage (§11.35). No fourth progress surface: the
 * three counts in the resume block are the dashboard's and the profile
 * sheet's, read through the same selectors (§11.38). No modal, no banner and no
 * dismissible box over the identity strip, and no sentence anywhere that
 * signing in saves what the browser is already keeping (§15.5.4).
 *
 * The 56px `hl-index-title` step is used here, once, and nowhere else on the
 * site (§3.2) — which is why the manifest gave it up when it moved to
 * `/sheets/`.
 */
export default function HomePage() {
  const rows = sheetRows()
  const facts = curriculumFacts()
  const set = setSummary()
  const bands = subsystems()

  // The first row of the set, and the size of the band it opens. Both measured
  // off the same array, so the card cannot name one sheet and count another.
  const first = rows[0]
  const firstBandSheets = rows.filter(
    (row) => row.subsystem.order === first.subsystem.order,
  ).length

  return (
    <PageShell>
      {/* True in both states, so it can be stated once above both blocks: the
          set is open, no part of it is behind an account, and the identity
          strip at the foot of the first-visit block says the same thing again
          where a reader is deciding (§15.2.5). */}
      <p className="hl-eyebrow hl-mark">
        Open drawing set · no account · nothing gated
      </p>

      {/* §15.2.2 — one h1 for one document. Neither block draws its own, so a
          reader and a screen reader get exactly one title whichever state the
          stylesheet chose, and `Resume` heads itself with an h2. */}
      <h1 className="hl-index-title">{SITE_NAME}</h1>

      <Resume
        facts={facts}
        subsystems={bands.map(({ category, coverage }) => ({
          slug: category.slug,
          title: category.title,
          // The denominator is the band, undiminished: every sheet in it, drawn
          // or not, one segment each, in module order.
          sheets: categoryRows(category).map((row) => ({
            module: row.module,
            drawn: row.drawn,
          })),
          drawn: coverage.drawn,
        }))}
      />

      <FirstVisit
        // §15.2.3 — `indexStatement()`'s measured lines, then the one line that
        // is not a measurement but a commitment, kept in `scope.ts` with the
        // other three sentences about where the record goes (§15.9.1).
        statement={[...indexStatement(), HOME_SCOPE]}
        firstSheet={{
          number: first.number,
          title: first.title,
          path: first.path,
          subsystem: first.subsystem.title,
          subsystemSheets: firstBandSheets,
        }}
        setSheets={set.sheets}
        setDrawn={set.drawn}
        subsystems={bands.map(({ category, coverage, path }) => ({
          slug: category.slug,
          order: category.order,
          title: category.title,
          blurb: category.blurb,
          path,
          // §7.5 — the gauge reports the drawing set, not the reader, so it is
          // true for everybody in every frame on a page built once.
          ticks: ticksFrom(categoryRows(category)),
          sheets: coverage.sheets,
          drawn: coverage.drawn,
        }))}
      />
    </PageShell>
  )
}
