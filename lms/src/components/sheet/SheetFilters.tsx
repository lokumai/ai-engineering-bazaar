'use client'

/**
 * §4.8 items 4 and 5 — the manifest, and the filter chips that sit **below**
 * it. Nothing filters above the fold: the reader meets the whole set first and
 * narrows it afterwards, which is the opposite of a faceted search box and the
 * point of an index sheet.
 *
 * Filtering is instant (§9.2, 0ms) and never re-sorts (§9.1 forbids animating
 * a reorder; the simplest way to keep that promise is to have no reorder).
 * The row count beside the chips is there because a table that silently
 * shrinks is a table that has hidden something from you.
 *
 * Two of the six chips select on the record rather than on the drawing
 * (§12.18). The record cannot reach a prerender, so `SIGNED OFF` and `UNSIGNED`
 * only mean anything after the store has been read — which is exactly why
 * `DEFAULT_FILTER_ID` is `ALL` and has to stay `ALL`. A reader-state filter
 * active on load would make the first client render emit a different number of
 * `<tr>` than the prerender: the worst class of hydration mismatch, and one
 * React 19 recovers from by discarding the subtree and repainting the table.
 * `useRecord` returns the frozen `EMPTY_RECORD` on the server and in the first
 * client render, so with `ALL` active both renders emit the same thirty-two
 * rows whatever is in storage (§12.2).
 *
 * With JavaScript off the server-rendered table is the whole set and the chips
 * do nothing, which is the right failure: everything is shown, nothing is
 * claimed.
 */

import { useMemo, useState } from 'react'
import {
  DEFAULT_FILTER_ID,
  FILTERS,
  applyFilter,
  noMatchReadout,
  type SheetRow,
} from '@/lib/content/rows'
import { useRecord } from '@/lib/record/store'
import { SheetIndex } from './SheetIndex'

/**
 * §12.13 class 3 — NO MATCH, the one empty state a filter can produce, in the
 * space the table occupied so that the reader is told where their table went
 * rather than left to infer it from a gap. A status readout and exactly one
 * path out. No illustration, no mascot (§8.5), and the copy names the filter as
 * the cause rather than the reader.
 *
 * A separate component because a server render can never press a chip: this is
 * the only way the state's markup and its exact copy can be pinned by a unit
 * test (§12.14.2). The behaviour around it is Playwright's.
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
      <p className="hl-mark hl-empty-status">{noMatchReadout(total)}</p>
      <button type="button" className="hl-button hl-mark hl-empty-path" onClick={onClear}>
        Clear the filter
      </button>
    </div>
  )
}

export function SheetFilters({
  rows,
  label,
}: {
  rows: readonly SheetRow[]
  label: string
}) {
  const [active, setActive] = useState(DEFAULT_FILTER_ID)
  const record = useRecord()

  /**
   * §12.4.1 — the slugs the reader has asserted, and nothing else about them.
   * Empty on the server and in the first client render, which the two `record`
   * chips are built to tolerate rather than to work around.
   */
  const signed = useMemo(() => {
    const out = new Set<string>()
    for (const [slug, sheet] of Object.entries(record.sheets)) {
      if (sheet.signedOff !== null) out.add(slug)
    }
    return out
  }, [record])

  const visible = applyFilter(rows, active, signed)
  // Gated on `rows` as well: "no sheets match filter" is a claim about a
  // filter, and it would be false where there was nothing to exclude.
  const excluded = visible.length === 0 && rows.length > 0

  return (
    <>
      {excluded ? (
        <NoMatch total={rows.length} onClear={() => setActive(DEFAULT_FILTER_ID)} />
      ) : (
        <SheetIndex rows={visible} column="subsystem" label={label} />
      )}

      <div className="hl-chips">
        <div className="hl-chip-row" role="group" aria-label="Filter the drawing set">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className="hl-button hl-mark hl-chip"
              aria-pressed={filter.id === active}
              onClick={() => setActive(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/*
          §12.13 — filter counts and the no-match state go in a `role="status"`
          live region, and the count itself is announced: SC 4.1.3 is Level AA
          and its own examples are "5 results returned" / "No results
          returned". One region, rendered in both states, so the announcement
          comes from an element the reader's software has already seen rather
          than from one that appears at the moment it has something to say.
        */}
        <p className="hl-mark hl-chip-count" role="status">
          Showing <span className="hl-chip-count-value">{visible.length}</span> of{' '}
          <span className="hl-chip-count-value">{rows.length}</span>
        </p>
      </div>
    </>
  )
}
