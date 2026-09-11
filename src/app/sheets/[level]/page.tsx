import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Catalog } from '@/components/catalog/Catalog'
import { CategoryMeter } from '@/components/course/CategoryMeter'
import { CategoryTally } from '@/components/course/CategoryTally'
import { Prose } from '@/components/course/Prose'
import { SignOffMarks } from '@/components/record/SignOffMarks'
import { PageShell } from '@/components/shell/PageShell'
import { CATEGORIES, categoryBySlug } from '@/lib/content/curriculum-file'
import { curriculumFacts } from '@/lib/content/facts'
import { categoryIntro } from '@/lib/content/intro'
import { categoryEyebrow, categoryRows, sheetRows } from '@/lib/content/manifest'
import { renderMarkdown } from '@/lib/content/render'

/**
 * M17 / D62 — the catalog, opened at one level. Six of these, prerendered.
 *
 * ## Why a level is an address again, having just stopped being one
 *
 * It is not the page that came back; it is the FILTER that got one. `/courses/`
 * and `/courses/<level>/` listed the course a second and third time, in a
 * component with no filters and no views, and M17 retired both. What the
 * navbar's dropdown needed afterwards was a way to open the one catalog with a
 * level already chosen — and the catalog's level filter was `useState`, which
 * nothing outside the component can set.
 *
 * Two shapes were available and the brief costed both. A parameter read by
 * `boot.ts` before first paint would have been one page, and it would have been
 * the first time channel A read the URL rather than the record — new mechanism
 * in the most load-bearing script in the codebase, for a filter that does
 * nothing at all with scripting off. Six prerendered pages cost six HTML files
 * and a `generateStaticParams`, and they buy three things the other shape
 * cannot: the filter is right in frame one with no script, a level is a URL
 * somebody can send to somebody else, and **the chips that choose a level
 * become links** — so the one control this site had that did nothing without
 * JavaScript now works without it.
 *
 * ## This page is the whole catalog, filtered — not one level's rows
 *
 * `sheetRows()` and not `categoryRows()`, with the level handed down beside it.
 * The count on the filter bar therefore reads `Showing 8 of 33`, which is the
 * true statement, and the chips for the other five levels are all present with
 * somewhere to go. Handing this page only its own eight rows would have made
 * the denominator a lie and stranded the reader on one level.
 *
 * ## What it carries that the catalog cannot
 *
 * **The level's own README.** `/courses/<level>/` was the only page on the site
 * that rendered `mini-courses/<level>/README.md`, and the capability ledger the
 * brief drew did not list it — retiring that route without this section would
 * have silently deleted authored prose from the site. Intermediate's note that
 * its Turkish files are still placeholders is exactly the kind of thing §7.6
 * exists to keep visible, and nothing else says it.
 *
 * The band, the blurb and the meter come from the same page for the same
 * reason: they are what a level says about itself, and the catalog's own
 * heading is `Catalog`.
 */

interface RouteParams {
  level: string
}

export function generateStaticParams(): RouteParams[] {
  return CATEGORIES.map((category) => ({ level: category.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>
}): Promise<Metadata> {
  const category = categoryBySlug((await params).level)
  if (!category) return {}

  return { title: category.title, description: category.blurb }
}

export default async function LevelCatalogPage({
  params,
}: {
  params: Promise<RouteParams>
}) {
  const category = categoryBySlug((await params).level)
  if (!category) notFound()

  const own = categoryRows(category)
  const intro = categoryIntro(category.slug)
  const notes = intro === null ? null : await renderMarkdown(intro)

  return (
    <PageShell column={false}>
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
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <p className="bz-facts m-0">{categoryEyebrow(category)}</p>
          <CategoryMeter category={category.slug} sheets={own} />
        </div>

        <h1 className="bz-display mt-3">{category.title}</h1>
      </div>

      <p className="bz-lead">{category.blurb}</p>

      {/* §4.9's discrete tick gauge is NOT here, and that is M17 rather than an
          oversight. It drew one tick per module in this level, under a table
          drawing one row per module in this level — the same reading, twice, on
          one screen. MANIFESTO rule 16: the interface talks, and it does not say
          a thing twice in two idioms. */}

      <Catalog rows={sheetRows()} label={category.title} level={category.slug} />

      {/* §12.2 — one island per document for the ninth column's squares, and
          one for the band's `n/m` count. Both are tallies over the record, and
          every tally is channel B. */}
      <SignOffMarks facts={curriculumFacts()} />
      <CategoryTally facts={curriculumFacts()} />

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
