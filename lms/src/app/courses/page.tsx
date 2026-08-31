import type { Metadata } from 'next'
import { CategoryBlock } from '@/components/sheet/CategoryBlock'
import { SheetIndex } from '@/components/sheet/SheetIndex'
import { ticksFrom } from '@/components/sheet/TickGauge'
import {
  categoryRows,
  coverageLabel,
  setEyebrow,
  subsystems,
} from '@/lib/content/manifest'
import { plural } from '@/lib/text'

export const metadata: Metadata = {
  title: 'Drawing set',
  description:
    'Every sheet in the set, grouped by subsystem, with the topics each one '
    + 'covers or is scheduled to cover.',
}

/**
 * The drawing set, by subsystem.
 *
 * The index sheet (§4.8) is the flat manifest: thirty-two rows in sheet order,
 * filterable, with the subsystem as a column. This page is the same thirty-two
 * sheets under their six band headers, with §4.9's `TOPICS` column in place of
 * `SUBSYSTEM` — which is the one thing the flat manifest cannot show, because
 * a sheet's topics are its own sections and they only mean something next to
 * their neighbours.
 *
 * It is also where the six subsystem pages are reached from, and where the
 * shape of the set is legible at a glance: two bands solid, four bands dashed
 * from end to end.
 */
export default function DrawingSetPage() {
  return (
    <>
      <p className="hl-eyebrow hl-mark">{setEyebrow()}</p>

      <h1 className="hl-listing-title">Drawing set</h1>

      <p className="hl-lead">
        Every sheet in the set, grouped by subsystem. The topics column names
        what a sheet covers: its first three sections where it is drawn, the
        first three items of its schedule of parts where it is not.
      </p>

      <hr className="hl-rule-struct" aria-hidden="true" />

      {subsystems().map(({ category, coverage, path }) => {
        const rows = categoryRows(category)

        return (
          <section key={category.slug} className="hl-band">
            <div className="hl-band-head">
              {/* The band header is the section's heading: a screen reader
                  meets `SUBSYSTEM 02 · INTERMEDIATE` as an h2 and a link, not
                  as a decorative strip beside an unlabelled table. */}
              <h2 className="hl-band-title">
                <CategoryBlock
                  order={category.order}
                  title={category.title}
                  path={path}
                  ticks={ticksFrom(rows)}
                />
              </h2>
              <p className="hl-mark hl-band-meta">{coverageLabel(coverage)}</p>
            </div>

            <SheetIndex
              rows={rows}
              column="topics"
              label={`${category.title}, ${plural(rows.length, 'sheet')}`}
            />
          </section>
        )
      })}
    </>
  )
}
