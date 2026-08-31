'use client'

import { useState } from 'react'
import { FILTERS, type SheetRow, applyFilter } from '@/lib/content/rows'
import { SheetIndex } from './SheetIndex'

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
 * With JavaScript off the server-rendered table is the whole set and the chips
 * do nothing, which is the right failure: everything is shown, nothing is
 * claimed.
 */
export function SheetFilters({
  rows,
  label,
}: {
  rows: readonly SheetRow[]
  label: string
}) {
  const [active, setActive] = useState(FILTERS[0].id)
  const visible = applyFilter(rows, active)

  return (
    <>
      <SheetIndex rows={visible} column="subsystem" label={label} />

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

        <p className="hl-mark hl-chip-count" aria-live="polite">
          Showing <span className="hl-chip-count-value">{visible.length}</span> of{' '}
          <span className="hl-chip-count-value">{rows.length}</span>
        </p>
      </div>
    </>
  )
}
