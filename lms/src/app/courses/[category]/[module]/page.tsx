import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Prose } from '@/components/course/Prose'
import { ContentsDrawer } from '@/components/sheet/ContentsDrawer'
import type { DependencyRelation, SheetLink } from '@/components/sheet/DependencyBlock'
import { Objectives } from '@/components/sheet/Objectives'
import { PrevNext, type PrevNextTarget } from '@/components/sheet/PrevNext'
import { ScheduleOfParts } from '@/components/sheet/ScheduleOfParts'
import { SheetRail } from '@/components/sheet/SheetRail'
import { StatusBand } from '@/components/sheet/StatusBand'
import { TitleBlock, TitleStrip } from '@/components/sheet/TitleBlock'
import {
  moduleByNumber,
  neighbours,
  positionOf,
  sheetCount,
  sheetPath,
} from '@/lib/content/curriculum'
import { moduleGraph } from '@/lib/content/edges'
import { imageBaseFor } from '@/lib/content/images'
import { type CourseModule, loadAllModules, loadModule } from '@/lib/content/loader'
import { renderMarkdown } from '@/lib/content/render'
import { scheduleOfParts, summarySentence } from '@/lib/content/schedule'
import {
  eyebrow,
  sheetFacts,
  titleBlockRows,
  titleStripRows,
} from '@/lib/content/title-block'

/**
 * The module sheet — §4.4's three formats, chosen at build time from status
 * and extent and never overridden by hand.
 *
 * **A0**, the assembly sheet: a drawn module of 2,500 words or more, three
 * zones, 208 + 24 + 656 + 24 + 240 = 1152.
 * **A2**, the part sheet: a drawn module under that, two zones centred.
 * **A4**, the detail sheet: a module that is not yet drawn. §4.5 gives it its
 * own anatomy — a status band, one sentence and a schedule of parts — because
 * wrapping a 1,144px instrument panel around 120 words of stub is the single
 * biggest failure mode of this whole direction. An A4 sheet is not a broken
 * A0; on seventeen of the thirty-two sheets it is the design.
 *
 * Every number the page prints — extent, figures, sources, revision, language,
 * position, the size of the set — is derived (§11.25). Nothing on this page is
 * a claim about the reader (§1): the spine tracks scroll, not completion, and
 * the stamp slots that would carry reader state are absent rather than empty.
 */

interface RouteParams {
  category: string
  module: string
}

export function generateStaticParams(): RouteParams[] {
  return loadAllModules().map((sheet) => ({
    category: sheet.category.slug,
    module: sheet.moduleSlug,
  }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>
}): Promise<Metadata> {
  const { category, module } = await params
  const sheet = loadModule(`${category}/${module}`)
  if (!sheet) return {}

  return {
    title: sheet.frontmatter.title,
    description: sheet.frontmatter.summary ?? summarySentence(sheet.body) ?? undefined,
  }
}

/** A dependency edge, resolved from a module number to something linkable. */
function link(module: number): SheetLink | null {
  const target = moduleByNumber(module)
  if (!target) return null
  return {
    module,
    title: target.frontmatter.title,
    path: sheetPath(target),
    draft: target.frontmatter.status === 'draft',
  }
}

function relation(label: string, modules: readonly number[]): DependencyRelation {
  return {
    label,
    targets: modules
      .map(link)
      .filter((target): target is SheetLink => target !== null),
  }
}

function target(sheet: CourseModule | null): PrevNextTarget | null {
  if (!sheet) return null
  return {
    module: sheet.frontmatter.module,
    title: sheet.frontmatter.title,
    path: sheetPath(sheet),
    draft: sheet.frontmatter.status === 'draft',
  }
}

export default async function ModuleSheetPage({
  params,
}: {
  params: Promise<RouteParams>
}) {
  const { category, module } = await params
  const slug = `${category}/${module}`
  const sheet = loadModule(slug)
  const position = positionOf(slug)
  if (!sheet || !position) notFound()

  const graph = moduleGraph()
  const number = sheet.frontmatter.module
  const facts = sheetFacts(sheet, {
    position,
    sheets: sheetCount(),
    requires: graph.requires(number),
    feeds: graph.feeds(number),
  })

  const format = sheet.sheetFormat
  const drawn = format !== 'A4'

  // A4 sheets render no prose: §4.5's body is one sentence and a schedule, and
  // the markdown holds nothing else once the h1, the dek, the placeholder note
  // and the deleted progress rail are accounted for.
  const rendered = drawn
    ? await renderMarkdown(sheet.body, {
      imageBase: imageBaseFor(sheet.category.slug),
      sheet: number,
    })
    : null

  const rail = drawn ? (
    <SheetRail
      toc={rendered?.toc.filter((entry) => entry.depth === 2) ?? []}
      relations={[
        relation('Requires', graph.requires(number)),
        relation('Feeds', graph.feeds(number)),
        relation('See also', graph.seeAlso(number)),
      ]}
    />
  ) : null

  // §4.5 item 5 — the single descriptive sentence, read out of the source
  // rather than retyped, and absent rather than invented if it is not there.
  const summary = drawn
    ? null
    : sheet.frontmatter.summary ?? summarySentence(sheet.body)

  const { previous, next } = neighbours(slug)

  return (
    <div className="hl-sheet" data-format={format}>
      {rail && <div className="hl-rail-left">{rail}</div>}

      <div className="hl-column">
        {format === 'A4' && <StatusBand />}

        {rail && <ContentsDrawer>{rail}</ContentsDrawer>}

        <p className="hl-eyebrow hl-mark">{eyebrow(facts)}</p>

        {/* The sheet title lives in the frontmatter and the markdown h1 is
            stripped (B6.1), so the column's own h1 takes §6.1's rule: 16px,
            a structural line, then 32px. */}
        <div className="prose hl-sheet-title">
          <h1>{sheet.frontmatter.title}</h1>
        </div>

        {/* Variant B, in the column. On an A0 sheet it is the fallback the
            right rail leaves behind below 1280px (§4.7). */}
        <TitleStrip
          rows={titleStripRows(facts)}
          className={format === 'A0' ? 'xl:hidden' : undefined}
        />

        <Objectives items={sheet.frontmatter.objectives} />

        {drawn && rendered ? (
          <Prose html={rendered.html} />
        ) : (
          <>
            {summary && <p className="hl-summary">{summary}</p>}
            <ScheduleOfParts parts={scheduleOfParts(sheet.body)} />
          </>
        )}

        <PrevNext previous={target(previous)} next={target(next)} />
      </div>

      {format === 'A0' && (
        <div className="hl-rail-right">
          <TitleBlock rows={titleBlockRows(facts)} />
        </div>
      )}
    </div>
  )
}
