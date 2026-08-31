import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CategoryMeter } from '@/components/course/CategoryMeter'
import { CategoryTally } from '@/components/course/CategoryTally'
import { Prose } from '@/components/course/Prose'
import { SignOffMarks } from '@/components/record/SignOffMarks'
import { SheetIndex } from '@/components/sheet/SheetIndex'
import { TickGauge, ticksFrom } from '@/components/sheet/TickGauge'
import { PageShell } from '@/components/shell/PageShell'
import { CATEGORIES, categoryBySlug } from '@/lib/content/categories'
import { curriculumFacts } from '@/lib/content/facts'
import { categoryIntro } from '@/lib/content/intro'
import { categoryEyebrow, categoryRows } from '@/lib/content/manifest'
import { renderMarkdown } from '@/lib/content/render'
import { plural } from '@/lib/text'

/**
 * §4.9 — the category page. A sheet index table, not a card grid: cards would
 * spend a screen saying what a table says in a third of it, and there is no
 * category card in this system (§5.4, §11.2).
 *
 * The five items §4.9 asks for, in its order: the eyebrow, the h1, the one-line
 * blurb, the discrete tick gauge, and the index table with `TOPICS` in place
 * of `SUBSYSTEM`. Every count in the eyebrow and every tick in the gauge is
 * measured from the subsystem's own sheets.
 *
 * Then the subsystem's README, through the prose pipeline. Its `## Modules`
 * manifest is stripped at build time — the table above states all of it and
 * more, and every link in it addresses a `.md` file that is a route on the
 * MkDocs site and a 404 here (see `lib/content/intro.ts`). What is left is the
 * author's own prose about the subsystem, which nothing else on the page says:
 * Intermediate's note that its Turkish files are still placeholders is exactly
 * the kind of thing §7.6 exists to keep visible.
 */

interface RouteParams {
  category: string
}

export function generateStaticParams(): RouteParams[] {
  return CATEGORIES.map((category) => ({ category: category.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>
}): Promise<Metadata> {
  const category = categoryBySlug((await params).category)
  if (!category) return {}

  return { title: category.title, description: category.blurb }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<RouteParams>
}) {
  const category = categoryBySlug((await params).category)
  if (!category) notFound()

  const rows = categoryRows(category)
  const intro = categoryIntro(category.slug)
  const notes = intro === null ? null : await renderMarkdown(intro)

  return (
    <PageShell>
      {/* §13.5 surface 3 — the header band, and the one aggregate hue on this
          page. `hl-band-tint` paints §13.1.2's 2px rule above the subsystem's
          own name in its own flavour, resolved on channel A from the class the
          boot script stamped (§12.2); dormant is the structural line every
          other component uses, so a subsystem nobody has started looks like
          everything else rather than like a greyed-out version of itself.

          The meter beside it is what keeps the rule from being the only
          statement of progress (SC 1.4.1, §13.1.4): the eyebrow states the
          subsystem's extent, and `n/m signed off` states the reader's standing
          in text. Without that count the band's chroma would be the sole
          carrier of a claim about the reader, which §13.1.4 rules out. */}
      <div className="hl-band-tint hl-cat-tint pt-3" data-cat={category.slug}>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <p className="hl-eyebrow hl-mark m-0">{categoryEyebrow(category)}</p>
          <CategoryMeter category={category.slug} sheets={rows} />
        </div>

        <h1 className="hl-listing-title mt-3">{category.title}</h1>
      </div>

      <p className="hl-lead">{category.blurb}</p>

      {/* §4.9 item 4 — one tick per sheet in this subsystem. The eyebrow above
          states the same reading in words, so the gauge is decoration here and
          says so (§10.4). */}
      <TickGauge ticks={ticksFrom(rows)} className="hl-listing-gauge" />

      <SheetIndex
        rows={rows}
        column="topics"
        label={`${category.title}, ${plural(rows.length, 'sheet')}`}
      />

      {/* §12.2 — the table above is server-only here, so the ninth column's
          squares are filled by this one island after mount, and the band's
          `n/m` count by the one beside it. Both are tallies over the record,
          and every tally is channel B. */}
      <SignOffMarks facts={curriculumFacts()} />
      <CategoryTally facts={curriculumFacts()} />

      {notes && (
        <section className="hl-notes" aria-labelledby="general-notes">
          <h2 id="general-notes" className="hl-mark hl-notes-head">
            General notes
          </h2>
          <Prose html={notes.html} />
        </section>
      )}
    </PageShell>
  )
}
