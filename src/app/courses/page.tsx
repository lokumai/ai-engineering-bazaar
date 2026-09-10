import type { Metadata } from 'next'
import { CategoryMeter } from '@/components/course/CategoryMeter'
import { CategoryTally } from '@/components/course/CategoryTally'
import { SignOffMarks } from '@/components/record/SignOffMarks'
import { CategoryBlock } from '@/components/sheet/CategoryBlock'
import { SheetIndex } from '@/components/sheet/SheetIndex'
import { PageShell } from '@/components/shell/PageShell'
import { ticksFrom } from '@/components/sheet/TickGauge'
import { curriculumFacts } from '@/lib/content/facts'
import {
  categoryRows,
  coverageLabel,
  setEyebrow,
  subsystems,
} from '@/lib/content/manifest'
import { plural } from '@/lib/text'

export const metadata: Metadata = {
  title: 'Curriculum',
  description:
    'Every module in the set, grouped by level, with the topics each one '
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
 *
 * This page renders `SheetIndex` server-only — no filter chips, so no client
 * component above it — which is precisely why the ninth column's squares are
 * filled by one document-level island and not by a hook inside the table
 * (§12.2). A hook there would work on `/` and fail this page's static export.
 */
export default function DrawingSetPage() {
  return (
    <PageShell column={false}>
      <p className="bz-facts">{setEyebrow()}</p>

      <h1 className="bz-display">Curriculum</h1>

      <p className="bz-lead">
        Every module in the curriculum, grouped by level. The topics column names
        what a module covers: its first three sections where it is ready, the
        first three items of its schedule of parts where it is not.
      </p>

      <hr className="bz-rule" aria-hidden="true" />

      {subsystems().map(({ category, coverage, path }) => {
        const rows = categoryRows(category)

        return (
          <section key={category.slug} className="bz-level">
            {/* §13.5 surface 1 — the subsystem's own standing, on its own
                colour. `bz-cat-tint` resolves the hue to the structural line,
                half chroma or full chroma from the class the boot script
                stamped, and `bz-cat-rule` paints it down the leading edge
                (channel A, §12.2). `ps-4` is the clearance the rule needs:
                `bz-cat-rule` reserves its 1.5px in a transparent border and
                paints inside the padding box, so without padding the rule
                would sit under the block's first pixels.

                There is no category card here and this does not introduce one
                (§5.4, §11.2): the classes go on the band header that already
                existed. */}
            <div
              className="bz-level-head bz-cat-tint bz-cat-rule ps-4"
              data-cat={category.slug}
            >
              {/* The band header is the section's heading: a screen reader
                  meets `LEVEL 02 · INTERMEDIATE` as an h2 and a link, not
                  as a decorative strip beside an unlabelled table. */}
              <h2 className="bz-level-title">
                <CategoryBlock
                  order={category.order}
                  title={category.title}
                  path={path}
                  ticks={ticksFrom(rows)}
                />
              </h2>
              <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
                <p className="bz-level-meta">{coverageLabel(coverage)}</p>
                {/* §13.1.4 — the meter never stands alone: it prints
                    `n/m completed` beside itself, and that count is what the
                    hue reinforces rather than replaces. */}
                <CategoryMeter category={category.slug} sheets={rows} />
              </div>
            </div>

            <SheetIndex
              rows={rows}
              column="topics"
              label={`${category.title}, ${plural(rows.length, 'module')}`}
            />
          </section>
        )
      })}

      {/* §12.2 — one island for all six tables on the page. */}
      <SignOffMarks facts={curriculumFacts()} />

      {/* §12.2 channel B — and one island for all six meters' counts, for the
          same reason: the tables and the meters are server-rendered here, so
          the count arrives after mount or not at all. */}
      <CategoryTally facts={curriculumFacts()} />
    </PageShell>
  )
}
