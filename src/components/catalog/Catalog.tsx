'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { SheetIndex } from '@/components/sheet/SheetIndex'
import { VIEWS, type CatalogViewId } from '@/lib/catalog/views'
import {
  ALL_LEVELS,
  DEFAULT_FILTER_ID,
  FILTERS,
  NO_MATCH_CUE,
  applyFilter,
  applyLevel,
  levelsOf,
  noMatchReadout,
  type SheetRow,
} from '@/lib/content/rows'
import { setCatalogView } from '@/lib/record/events'
import { update, useRecord } from '@/lib/record/store'
import { INDEX_ROUTE, levelRoute } from '@/lib/route-labels'
import { plural } from '@/lib/text'
import { CatalogCards } from './CatalogCards'
import { CatalogOverview } from './CatalogOverview'
import { ViewIcon } from './ViewIcon'

/**
 * M12 / D13 — the catalog: ONE route, ONE data source, THREE views.
 *
 * The author, having seen all three alternatives: *"I want All 3 !!! They
 * should be all loaded and using a toggle, the view should change! C should be
 * Overview, A should be named Cards, and B should be named Table, with each in
 * the toggle having their own visual aid such as icon."* D13 records the
 * decision, the reason (they answer three different questions) and the cost
 * (three renderings to keep working), and it bounds that cost with two rules
 * this file is the enforcement of: **no view-specific data and no
 * view-specific route.**
 *
 * ## All three are always rendered, and CSS reveals one
 *
 * Every view is in the DOM on every load, and `src/app/catalog.css` shows
 * exactly one — keyed off `data-hl-view`, which `lib/record/boot.ts` stamps on
 * `<html>` before first paint from the reader's stored preference (channel A). So
 * a reader who chose Table last week meets Table in frame one: no flash of a
 * view they did not ask for, no hydration, and it works with the bundle
 * blocked. It is the arrangement `/path/`'s nine role bodies already use, and
 * the reason a view is not a URL — D13's own criterion is that adding a view
 * must not add an address.
 *
 * The two views that are not showing are `display: none`, which is what takes
 * their links out of the tab order. That is load-bearing rather than tidy: with
 * three views in one document, a keyboard reader would otherwise traverse 99
 * module links to get past the catalog. `catalog.spec.ts` asserts both halves —
 * the hidden views' links are unreachable by Tab, and the showing view's are
 * reachable — because either half alone passes for the wrong reason (D17).
 *
 * ## Why the toggle carries no `aria-pressed`
 *
 * Which view is showing is decided by an attribute on `<html>` that no React
 * render sets, so `aria-pressed` would be a second author of one state and the
 * two would disagree for every frame before hydration — the reader whose stored
 * view is Table would be shown the table and told "Overview, pressed". Instead
 * each button carries the word `Showing`, hidden from sight and revealed by the
 * same channel-A rule that reveals the view, so the picture and the sentence
 * cannot come apart. It is the arrangement the curriculum rail's tick uses for
 * exactly the same reason (`CurriculumRail`), and the one `MainNav` reaches for
 * when it refuses to put a menu behind `useState`.
 *
 * ## M16 stage 4: what the mockup changed, and what it did not
 *
 * `playground/03-catalog.html` puts the filters in a STICKY bar at the top of
 * the frame, which is where they already were — so the arrangement survived and
 * the appearance was rebuilt around it. Three things did change.
 *
 * **The two views this component composes are different components now.**
 * `CatalogCards` groups its cards under a level heading and `CatalogOverview`
 * is a five-column board, because that is what variants A and C draw.
 *
 * **The search field is refused.** `03`'s filter bar leads with a `.fsearch`
 * that looks like a control and is a `<div role="button">` opening nothing.
 * A control that opens nothing is the claim §1 forbids — the same reason the
 * top bar's own search slot stays empty and is recorded in the fidelity
 * harness's `DELIBERATELY_ABSENT`. The chips beside it are real.
 *
 * **The toggle is derived, and it is the one thing here with no reference.**
 * `03` presents A, B and C as three separate frames; neither it nor `01` draws
 * a segmented control anywhere. So it is built from primitives the language
 * does have — the 33px control height, `.bz-btn-quiet`'s edge — and the
 * showing one is marked by a thicker bottom rule rather than a fill, because
 * forced colours keeps a border's width and takes its colour.
 *
 * ## The two filters
 *
 * At the TOP of the page, which is M12's deliverable and a reversal: §4.8 put
 * them BELOW the table, on the argument that a reader should meet the whole set
 * before narrowing it. With three views there is no single "whole set" to meet
 * first, and a control that changes what is on screen belongs above the thing
 * it changes.
 *
 * Two groups, not one row of eleven chips, because the questions compose: "the
 * Expert modules" and "the ones I have not completed" are independent, and one
 * group cannot express the pair.
 *
 * **M17 / D62 split them by kind, and the split is the milestone.** The level
 * group is `<nav>` full of links carrying `aria-current`, because a level is an
 * address: `/sheets/expert/` is prerendered with that level selected. The state
 * group stays `<button aria-pressed>` inside a named `role="group"`, because
 * two of its six selections read the RECORD and no address can hold a fact
 * about a reader the page has never met. Both shapes give a screen reader the
 * group's name and each control's state without anyone re-implementing arrow
 * keys (§10.3) — and neither one invents a widget, which is what a single group
 * spanning both kinds would have had to do.
 *
 * **Both filters open at `all` and have to** (§12.2). Two of the six selections
 * read the RECORD, which no prerendered page has met, so a reader-state filter
 * active on load would make the first client render emit a different set of
 * rows than the prerender — the worst class of hydration mismatch, and one
 * React 19 answers by discarding the subtree and repainting. `useRecord()`
 * returns the frozen `EMPTY_RECORD` on the server and in the first client
 * render, so with `all`/`all` active both renders emit the same 33 modules
 * whatever is in storage.
 *
 * With scripting off the reader gets the overview and **a working level
 * filter**, because that filter is now six links to six prerendered pages. The
 * state chips still do nothing, which is the right failure for them: they ask
 * a question about a record only the browser holds. Everything is shown and
 * nothing is claimed.
 */

/** `data-view` — the contract between a view's box, its button and the CSS. */
const VIEW_ATTR = 'data-view'

/** M12 — the attribute the boot script stamps and this component maintains. */
const VIEW_ROOT_ATTR = 'data-hl-view'

/**
 * The chip focus lands on when the filters are cleared from the empty state.
 * An attribute and not the group's `aria-label`, so the hand-off does not break
 * when a reader-visible string is edited.
 */
const RESET_ATTR = 'data-hl-filter-reset'

/**
 * §12.13 class 3 — the one empty state two filters can produce, in the space
 * the views occupied so the reader is told where the catalog went rather than
 * left to infer it from a gap.
 *
 * **M12 rewrote the copy, and that is the deliverable**: an empty result says
 * what to do next. The status names the filters as the cause rather than the
 * reader, the cue says which control to move, and there is exactly one path
 * out. No illustration and no mascot (§8.5).
 *
 * A separate export because a server render can never press a chip: this is the
 * only way the state's markup and its exact copy can be pinned by a unit test
 * (§12.14.2). The behaviour around it is Playwright's.
 */
export function NoMatch({
  total,
  onClear,
  clearTo = null,
}: {
  total: number
  onClear: () => void
  /**
   * M17 — where the one path out GOES, when going is what clears the filters.
   *
   * A level is an address now, so an empty result that a level helped produce
   * is escaped by navigating rather than by pressing: the state chips reset on
   * their own when this page unmounts. Null on the catalog's own front page,
   * where the only filter left is the state one and pressing is the whole of
   * it.
   *
   * The consequence is worth naming because it looks like an inconsistency and
   * is the opposite: the control is a LINK exactly when it leads somewhere, so
   * a reader with no JavaScript can still take it.
   */
  clearTo?: string | null
}) {
  return (
    <div className="bz-empty">
      <p className="bz-empty-status">{noMatchReadout(total)}</p>
      <p className="bz-empty-cue">{NO_MATCH_CUE}</p>
      {clearTo === null ? (
        <button type="button" className="bz-btn bz-empty-path" onClick={onClear}>
          Show the whole catalog
        </button>
      ) : (
        <Link className="bz-btn bz-empty-path" href={clearTo}>
          Show the whole catalog
        </Link>
      )}
    </div>
  )
}

export function Catalog({
  rows,
  label,
  level = ALL_LEVELS,
}: {
  rows: readonly SheetRow[]
  /** Names the table's scroll region and each view's section (§10.3). */
  label: string
  /**
   * M17 / D62 — the level this page was prerendered at, or `ALL_LEVELS`.
   *
   * It arrives as a prop and never as state, because the six level pages are
   * six real addresses: the filter is chosen at build time, so it is right in
   * frame one, right with the bundle blocked, and it is a URL a reader can
   * send to somebody else.
   */
  level?: string
}) {
  const [select, setSelect] = useState(DEFAULT_FILTER_ID)
  const record = useRecord()

  /**
   * §12.4.1 — the slugs the reader has asserted, and nothing else about them.
   * Empty on the server and in the first client render, which the two record
   * selections are built to tolerate rather than to work around.
   */
  const signed = useMemo(() => {
    const out = new Set<string>()
    for (const [slug, sheet] of Object.entries(record.sheets)) {
      if (sheet.signedOff !== null) out.add(slug)
    }
    return out
  }, [record])

  /* Over EVERY row and not the visible ones. These chips are the navigation
     between the six level pages, so a chip that disappeared when its own level
     was filtered out would remove the only way back to it. */
  const levelRefs = useMemo(() => levelsOf(rows), [rows])
  const visible = applyLevel(applyFilter(rows, select, signed), level)
  // Gated on `rows` as well: "no module matches" is a claim about a filter, and
  // it would be false where there was nothing to exclude.
  const excluded = visible.length === 0 && rows.length > 0

  /**
   * Clearing the filters UNMOUNTS the button that cleared them — the empty
   * state is replaced by the three views — so focus would be dropped on the
   * floor, and a keyboard reader would lose their place at exactly the moment
   * the empty state told them to act. Focus therefore goes to the control that
   * now expresses the state they just chose: the `Every level` chip.
   *
   * Next frame and not this one, and by query rather than by ref, which is the
   * shape `RailFold` uses for the same hand-off and for the same measured
   * reason (D17) — the element that is to take focus is one this render has
   * only just decided about.
   */
  function clear(): void {
    setSelect(DEFAULT_FILTER_ID)
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[${RESET_ATTR}]`)?.focus()
    })
  }

  /**
   * The view is written through `store.ts` — the only writer of learner state
   * (`kia-context/specs/ARCHITECTURE.md` §5) — and stamped on `<html>` in the
   * same breath, because the boot script only runs on a load and every
   * navigation on this site is a client transition. Exactly the shape
   * `RailFold` uses for the fold, and for the same measured reason.
   */
  function choose(view: CatalogViewId): void {
    document.documentElement.setAttribute(VIEW_ROOT_ATTR, view)
    update((data) => setCatalogView(data, view))
  }

  return (
    <div className="bz-catalog">
      {/* `03`'s sticky filter bar. It carries the two chip groups and the
          count, and nothing else: the view toggle sits below it, because the
          bar's height is what the table view's own sticky header is offset by
          and a second row of controls inside it would make that sum wrong. */}
      <div className="bz-filters">
        {/* M17 / D62 — LINKS, not buttons. The level is an address, so the
            group is navigation: `aria-current="page"` and not `aria-pressed`,
            because the chip does not toggle a state this component holds, it
            goes to the page that holds it. The pay-off is the one thing a
            button could never do — with scripting off these six chips still
            filter the catalog. */}
        <nav className="bz-chip-row" aria-label="Filter by level">
          <Link
            href={INDEX_ROUTE}
            className="bz-chip"
            {...{ [RESET_ATTR]: '' }}
            aria-current={level === ALL_LEVELS ? 'page' : undefined}
          >
            Every level
          </Link>
          {levelRefs.map((one) => (
            <Link
              key={one.slug}
              href={levelRoute(one.slug)}
              className="bz-chip"
              data-cat={one.slug}
              aria-current={level === one.slug ? 'page' : undefined}
            >
              {/* The square is the hue; the name beside it is what a reader in
                  forced colours reads instead (SC 1.4.1). */}
              <span aria-hidden="true" className="bz-chip-key" />
              {one.title}
            </Link>
          ))}
        </nav>

        {/* `03`'s vertical divider between the two runs of chips is gone with
            the single row it divided. The two groups are one under the other
            now, so the gap between them is the separation, and a rule drawn
            across the bar would be a second one saying the same thing. */}
        <div className="bz-chip-row" role="group" aria-label="Filter by state or language">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className="bz-chip"
              aria-pressed={filter.id === select}
              onClick={() => setSelect(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/*
          The count goes in a `role="status"` live region and the count itself
          is announced: SC 4.1.3 is Level AA and its own examples are "5 results
          returned" / "No results returned". One region, rendered in both
          states, so the announcement comes from an element the reader's
          software has already seen rather than from one that appears at the
          moment it has something to say. It sits on the bar's trailing edge,
          which is where `03` puts its own readout.
        */}
        <p className="bz-filter-count" role="status">
          Showing <span className="bz-filter-count-value">{visible.length}</span> of{' '}
          <span className="bz-filter-count-value">{rows.length}</span>
        </p>
      </div>

      <div className="bz-viewbar">
        {/* D13 — the toggle. Three buttons, an icon and a word each, and the
            state carried by the hidden `Showing` rather than by an ARIA
            attribute React would have to render (see the docblock). */}
        <div className="bz-viewtoggle" role="group" aria-label="Catalog view">
          {VIEWS.map((view) => (
            <button
              key={view.id}
              type="button"
              className="bz-viewbtn"
              {...{ [VIEW_ATTR]: view.id }}
              onClick={() => choose(view.id)}
            >
              <ViewIcon id={view.id} />
              {view.name}
              <span className="sr-only bz-view-said">Showing</span>
            </button>
          ))}
        </div>
      </div>

      {excluded ? (
        <NoMatch
          total={rows.length}
          onClear={clear}
          clearTo={level === ALL_LEVELS ? null : INDEX_ROUTE}
        />
      ) : (
        <div className="bz-views">
          {VIEWS.map((view) => (
            <section
              key={view.id}
              className="bz-view"
              {...{ [VIEW_ATTR]: view.id }}
              aria-labelledby={`bz-view-${view.id}`}
            >
              {/* Each view heads and explains itself, so the line saying what
                  this view is for is on the same channel as the view (channel
                  A) rather than rendered from the active id (channel B), which
                  would print one view's purpose above another's contents for
                  every frame before hydration. */}
              {/* SAID AND NOT SHOWN. The toggle three inches above already
                  names the three views and marks the showing one, so a heading
                  repeating that name — with a sentence explaining what the
                  view is for under it — told a sighted reader what the view
                  itself is showing them. The section still needs a name, and
                  `aria-labelledby` still points here, so the heading stays in
                  the accessibility tree and leaves the screen. */}
              <h2 id={`bz-view-${view.id}`} className="bz-said">
                {view.name}
              </h2>

              {view.id === 'overview' && <CatalogOverview rows={visible} />}
              {view.id === 'cards' && <CatalogCards rows={visible} />}
              {view.id === 'table' && (
                <SheetIndex
                  rows={visible}
                  column="both"
                  label={`${label}, ${plural(visible.length, 'module')}`}
                />
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
