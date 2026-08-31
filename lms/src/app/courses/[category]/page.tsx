import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Prose } from '@/components/course/Prose'
import { SheetIndex } from '@/components/sheet/SheetIndex'
import { TickGauge, ticksFrom } from '@/components/sheet/TickGauge'
import { PageShell } from '@/components/shell/PageShell'
import { CATEGORIES, categoryBySlug } from '@/lib/content/categories'
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
      <p className="hl-eyebrow hl-mark">{categoryEyebrow(category)}</p>

      <h1 className="hl-listing-title">{category.title}</h1>

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
