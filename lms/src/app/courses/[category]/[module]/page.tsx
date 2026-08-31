import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Prose } from '@/components/course/Prose'
import { CheckedBy, SheetStamps } from '@/components/record/CheckedBy'
import { QuickCheck } from '@/components/record/QuickCheck'
import { SignOff } from '@/components/record/SignOff'
import { ChecklistIsland } from '@/components/record/ChecklistIsland'
import { SourceTracking } from '@/components/record/SourceTracking'
import { Submittal } from '@/components/record/Submittal'
import { ContentsDrawer } from '@/components/sheet/ContentsDrawer'
import type { DependencyRelation, SheetLink } from '@/components/sheet/DependencyBlock'
import { Objectives } from '@/components/sheet/Objectives'
import { PrevNext, type PrevNextTarget } from '@/components/sheet/PrevNext'
import { ScheduleOfParts } from '@/components/sheet/ScheduleOfParts'
import { SheetRail } from '@/components/sheet/SheetRail'
import { StatusBand } from '@/components/sheet/StatusBand'
import { TitleBlock, TitleStrip } from '@/components/sheet/TitleBlock'
import { PageShell } from '@/components/shell/PageShell'
import {
  moduleByNumber,
  neighbours,
  positionOf,
  sheetCount,
  sheetPath,
} from '@/lib/content/curriculum'
import { signOffCriteria } from '@/lib/content/criteria'
import { moduleGraph } from '@/lib/content/edges'
import { curriculumFacts } from '@/lib/content/facts'
import { imageBaseFor } from '@/lib/content/images'
import { type CourseModule, loadAllModules, loadModule } from '@/lib/content/loader'
import { quickCheckOf, summarySection } from '@/lib/content/quickcheck'
import { renderMarkdown } from '@/lib/content/render'
import { scheduleOfParts, summarySentence } from '@/lib/content/schedule'
import {
  carriesCheckedBy,
  eyebrow,
  sheetFacts,
  sheetLabel,
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
 * position, the size of the set — is derived (§11.25). The spine still tracks
 * scroll and not completion; §12 adds the surfaces that do carry reader state,
 * and every one of them is an island under §12.2's two-channel rule: the server
 * renders the honest empty form — `SIGN OFF` unpressed, `CHECKED BY —`, an
 * empty answer, every stamp slot at zero against its real threshold — and the
 * record fills it in after the hydration commit. Nothing here reads storage
 * during render, and nothing claims a state the build could not know.
 *
 * **A draft sheet gets none of it** (§12.4.1): no sign-off control, no Quick
 * Check, no submittal register, no `CHECKED BY` row, no stamp slots. It awards
 * nothing and cannot be signed, and that is what keeps every denominator on the
 * site honest.
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

  // §12.4.1 — the criteria the reader is asserting against, which are the
  // sheet's own declared objectives plus one sentence naming who is asserting.
  const criteria = drawn ? signOffCriteria(slug) : null

  // §12.6 trap 2 — the component keys on the extractor returning non-null,
  // never on `status === 'ready'`. That all 15 drawn sheets happen to ask
  // something is a measurement of the corpus today, not a rule.
  const quickCheck = drawn ? quickCheckOf(sheet.body) : null
  const summaryMarkdown = quickCheck === null ? null : summarySection(sheet.body)
  // §12.6 item 3 — the sheet's own authored `## Summary`, rendered by the same
  // pipeline as the prose so it is typeset as prose. Deliberately WITHOUT the
  // sheet number: a summary that one day carries a table would then be numbered
  // `TBL. 1` in its own sequence rather than colliding with the prose's
  // `TBL. 13.1`, and two figures with one number is the lie to avoid. The
  // extractor has already removed the question from it, so the reader's own
  // answer is never printed above the question again.
  const summaryHtml =
    summaryMarkdown === null
      ? null
      : (
          await renderMarkdown(summaryMarkdown, {
            imageBase: imageBaseFor(sheet.category.slug),
          })
        ).html

  // §7.4 — which stamp slots this sheet has is a fact about the corpus, so it
  // is measured here; how full they are is reader state and is filled in by the
  // island (§12.2). One sheet's facts, not the whole set's: `sheetStamps` reads
  // nothing else, and serialising 32 sheets into every page to look one of them
  // up would be payload for nothing.
  const stampFact = drawn
    ? (curriculumFacts().sheets.find((entry) => entry.slug === slug) ?? null)
    : null

  // §12.3.1 — absent on a draft: a sheet nobody has drawn cannot be checked.
  const checkedBy = carriesCheckedBy(facts) ? <CheckedBy slug={slug} /> : null

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
    // §5.2 — the footer's own row of facts, which only this page knows: the
    // sheet's number in the set, and the commit that last touched its file.
    <PageShell sheet={sheetLabel(facts)} revision={sheet.revision}>
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
            checkedBy={checkedBy}
            className={format === 'A0' ? 'xl:hidden' : undefined}
          />

          <Objectives items={sheet.frontmatter.objectives} />

          {/* §12.4.1 — ABOVE the content, beside the stated criteria. A
              completion switch a reader meets after scrolling past everything
              is a switch about a thing they have already left, which is why
              Moodle moved both to the top of the activity. */}
          {criteria !== null && (
            <SignOff
              slug={slug}
              criteria={criteria}
              revision={sheet.revision?.hash ?? null}
              drawn={drawn}
            />
          )}

          {drawn && rendered ? (
            <Prose html={rendered.html} />
          ) : (
            <>
              {summary && <p className="hl-summary">{summary}</p>}
              <ScheduleOfParts parts={scheduleOfParts(sheet.body)} />
            </>
          )}

          {/* §12.6 — the retrieval attempt, and the sheet's own summary as the
              one authored thing that stands in for the model answer this corpus
              does not contain. */}
          {quickCheck !== null && (
            <QuickCheck
              slug={slug}
              question={quickCheck.question}
              summaryHtml={summaryHtml}
            />
          )}

          {/* §12.9.1 — at the end of every ready sheet, before `PrevNext`. The
              only content in the whole record a third party can check. */}
          {drawn && <Submittal slug={slug} />}

          <PrevNext previous={target(previous)} next={target(next)} />

          {/* §12.8 — one delegated listener for the whole document, mounted
              once. Evidence, not currency: no XP, no click counting. */}
          {drawn && <SourceTracking slug={slug} />}
          {/* §12.7 — the checklist is upgraded where it already stands, inside
              the section that explains it, rather than lifted out and stacked
              below the prose. Mounted only where there is one: one sheet in the
              corpus has items, and an island that finds nothing is a wasted
              mount on the other fourteen. */}
          {drawn && rendered !== null && rendered.checklist.length > 0 && (
            <ChecklistIsland slug={slug} />
          )}
        </div>

        {format === 'A0' && (
          <div className="hl-rail-right">
            <TitleBlock
              rows={titleBlockRows(facts)}
              checkedBy={checkedBy}
              stamps={stampFact === null ? null : <SheetStamps slug={slug} fact={stampFact} />}
            />
          </div>
        )}
      </div>
    </PageShell>
  )
}
