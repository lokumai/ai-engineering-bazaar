'use client'

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
 * Every view is in the DOM on every load, and `manifest.css` shows exactly one
 * — keyed off `data-hl-view`, which `lib/record/boot.ts` stamps on `<html>`
 * before first paint from the reader's stored preference (§12.2 channel A). So
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
 * group cannot express the pair. Both are `<button aria-pressed>` inside a
 * named `role="group"`, which gives a screen reader the group's name and each
 * button's state without anyone re-implementing arrow keys (§10.3).
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
 * With scripting off the reader gets the overview, the whole set, and controls
 * that do nothing — which is the right failure: everything is shown and nothing
 * is claimed.
 */

/** `data-view` — the contract between a view's box, its button and the CSS. */
const VIEW_ATTR = 'data-view'

/** M12 — the attribute the boot script stamps and this component maintains. */
const VIEW_ROOT_ATTR = 'data-hl-view'

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
}: {
  total: number
  onClear: () => void
}) {
  return (
    <div className="hl-empty">
      <p className="hl-empty-status">{noMatchReadout(total)}</p>
      <p className="hl-empty-cue">{NO_MATCH_CUE}</p>
      <button type="button" className="hl-btn hl-empty-path" onClick={onClear}>
        Show the whole catalog
      </button>
    </div>
  )
}

export function Catalog({
  rows,
  label,
}: {
  rows: readonly SheetRow[]
  /** Names the table's scroll region and each view's section (§10.3). */
  label: string
}) {
  const [select, setSelect] = useState(DEFAULT_FILTER_ID)
  const [level, setLevel] = useState<string>(ALL_LEVELS)
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

  const levels = useMemo(() => levelsOf(rows), [rows])
  const visible = applyLevel(applyFilter(rows, select, signed), level)
  // Gated on `rows` as well: "no module matches" is a claim about a filter, and
  // it would be false where there was nothing to exclude.
  const excluded = visible.length === 0 && rows.length > 0

  function clear(): void {
    setSelect(DEFAULT_FILTER_ID)
    setLevel(ALL_LEVELS)
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
    <>
      <div className="hl-cat-controls">
        <div className="hl-cat-filters">
          <div className="hl-chip-row" role="group" aria-label="Filter by level">
            <button
              type="button"
              className="hl-chip"
              aria-pressed={level === ALL_LEVELS}
              onClick={() => setLevel(ALL_LEVELS)}
            >
              Every level
            </button>
            {levels.map((one) => (
              <button
                key={one.slug}
                type="button"
                className="hl-chip"
                data-cat={one.slug}
                aria-pressed={level === one.slug}
                onClick={() => setLevel(one.slug)}
              >
                {/* The 7px square is the hue; the name beside it is what a
                    reader in forced colours reads instead (SC 1.4.1). */}
                <span aria-hidden="true" className="hl-chip-chip" />
                {one.title}
              </button>
            ))}
          </div>

          <div className="hl-chip-row" role="group" aria-label="Filter by state or language">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className="hl-chip"
                aria-pressed={filter.id === select}
                onClick={() => setSelect(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="hl-cat-viewbar">
          {/* D13 — the toggle. Three buttons, an icon and a word each, and the
              state carried by the hidden `Showing` rather than by an ARIA
              attribute React would have to render (see the docblock). */}
          <div className="hl-viewtoggle" role="group" aria-label="Catalog view">
            {VIEWS.map((view) => (
              <button
                key={view.id}
                type="button"
                className="hl-viewbtn"
                {...{ [VIEW_ATTR]: view.id }}
                onClick={() => choose(view.id)}
              >
                <ViewIcon id={view.id} />
                {view.name}
                <span className="sr-only hl-view-on">Showing</span>
              </button>
            ))}
          </div>

          {/*
            §12.13 — the count goes in a `role="status"` live region and the
            count itself is announced: SC 4.1.3 is Level AA and its own examples
            are "5 results returned" / "No results returned". One region,
            rendered in both states, so the announcement comes from an element
            the reader's software has already seen rather than from one that
            appears at the moment it has something to say.
          */}
          <p className="hl-chip-count" role="status">
            Showing <span className="hl-chip-count-value">{visible.length}</span> of{' '}
            <span className="hl-chip-count-value">{rows.length}</span>
          </p>
        </div>
      </div>

      {excluded ? (
        <NoMatch total={rows.length} onClear={clear} />
      ) : (
        <div className="hl-views">
          {VIEWS.map((view) => (
            <section
              key={view.id}
              className="hl-view"
              {...{ [VIEW_ATTR]: view.id }}
              aria-labelledby={`hl-view-${view.id}`}
            >
              {/* Each view heads and explains itself, so the line saying what
                  this view is for is on the same channel as the view (channel
                  A) rather than rendered from the active id (channel B), which
                  would print one view's purpose above another's contents for
                  every frame before hydration. */}
              <h2 id={`hl-view-${view.id}`} className="hl-view-head">
                {view.name}
                <span className="hl-view-answers">{view.answers}</span>
              </h2>

              {view.id === 'overview' && <CatalogOverview rows={visible} />}
              {view.id === 'cards' && <CatalogCards rows={visible} />}
              {view.id === 'table' && (
                <SheetIndex
                  rows={visible}
                  column="subsystem"
                  label={`${label}, ${plural(visible.length, 'module')}`}
                />
              )}
            </section>
          ))}
        </div>
      )}
    </>
  )
}
