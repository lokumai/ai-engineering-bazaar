import { notFound } from 'next/navigation'
import { Catalog } from '@/components/catalog/Catalog'
import { CategoryMeter } from '@/components/course/CategoryMeter'
import { CategoryTally } from '@/components/course/CategoryTally'
import { Prose } from '@/components/course/Prose'
import { SignOffMarks } from '@/components/record/SignOffMarks'
import { PageShell } from '@/components/shell/PageShell'
import { categoryBySlug } from '@/lib/content/curriculum-file'
import { curriculumFacts } from '@/lib/content/facts'
import { categoryIntro } from '@/lib/content/intro'
import { categoryCoverage, categoryRows, sheetRows } from '@/lib/content/manifest'
import { renderMarkdown } from '@/lib/content/render'
import type { Track } from '@/lib/tracks'

/**
 * One level of the catalog, in either track: `/sheets/<level>/` and
 * `/everyone/sheets/<level>/` (D91). Moved out of the For Engineers route so
 * both routes render the one component; the reasoning in the comments below is
 * the For Engineers page's, unchanged.
 */
export async function LevelCatalog({
  level,
  track = 'engineers',
}: {
  level: string
  /** D91 — whose catalog this is. */
  track?: Track
}) {
  const category = categoryBySlug(level)
  if (!category) notFound()

  const own = categoryRows(category, track)
  const intro = categoryIntro(category.slug)
  const notes = intro === null ? null : await renderMarkdown(intro)

  return (
    <PageShell column={false} track={track}>
      {/* §13.5 surface 3 — the header band, and the one aggregate hue on this
          page. `bz-level-tint` paints §13.1.2's 2px rule above the level's own
          name in its own flavour, resolved on channel A from the class the boot
          script stamped (§12.2); dormant is the structural line every other
          component uses, so a level nobody has started looks like everything
          else rather than like a greyed-out version of itself.

          The meter beside it is what keeps the rule from being the only
          statement of progress (SC 1.4.1, §13.1.4): the eyebrow states the
          level's length, and `n/m completed` states the reader's standing in
          text. Without that count the band's chroma would be the sole carrier
          of a claim about the reader, which §13.1.4 rules out. */}
      <div className="bz-level-tint bz-cat-tint pt-3" data-cat={category.slug}>
        <h1 className="bz-display">{category.title}</h1>
      </div>

      {/* M20 — the blurb was here and the eyebrow was above the heading; the
          author asked for one line in one place. `category.blurb` was a second
          description of the level beside a catalog that now prints each
          module's own sentence, and the eyebrow's `Level 02` was the heading
          said again in digits.

          **The non-colour carrier survives the move**, which is the thing to
          check rather than assume: §13.1.4 asks that the band's hue never be
          the sole statement, and what answers it is the meter beside the
          heading (`n/m completed`, in words) plus this line's own counts. Both
          are text, both are still on the page, and neither moved off it. */}
      {/* The counts on the left, the reader's standing on the right — the
          pairing the eyebrow row used to have, moved under the heading with
          the line itself. M20 left the meter alone in the old row for one
          build and it read as an orphan floating above the title; screenshot,
          not test, is what said so (**D59**). */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-6">
        <p className="bz-lead">{categoryCoverage(category)}</p>
        <CategoryMeter category={category.slug} sheets={own} />
      </div>

      {/* §4.9's discrete tick gauge is NOT here, and that is M17 rather than an
          oversight. It drew one tick per module in this level, under a table
          drawing one row per module in this level — the same reading, twice, on
          one screen. MANIFESTO rule 16: the interface talks, and it does not say
          a thing twice in two idioms. */}

      <Catalog rows={sheetRows(track)} label={category.title} level={category.slug} track={track} />

      {/* §12.2 — one island per document for the ninth column's squares, and
          one for the band's `n/m` count. Both are tallies over the record, and
          every tally is channel B. */}
      <SignOffMarks facts={curriculumFacts(track)} track={track} />
      <CategoryTally facts={curriculumFacts(track)} track={track} />

      {notes && (
        <section className="bz-notes" aria-labelledby="general-notes">
          <h2 id="general-notes" className="bz-section">
            General notes
          </h2>
          <Prose html={notes.html} />
        </section>
      )}
    </PageShell>
  )
}
