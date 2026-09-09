import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Prose } from '@/components/course/Prose'
import { CheckedBy, Repositories, SheetStamps } from '@/components/record/CheckedBy'
import { QuickCheck } from '@/components/record/QuickCheck'
import { SignOff } from '@/components/record/SignOff'
import { ChecklistIsland } from '@/components/record/ChecklistIsland'
import { SourceTracking } from '@/components/record/SourceTracking'
import { Submittal } from '@/components/record/Submittal'
import { CurriculumRail } from '@/components/curriculum/CurriculumRail'
import { RailRestoreTab } from '@/components/curriculum/RailFold'
import { ContentsDrawer } from '@/components/sheet/ContentsDrawer'
import type { DependencyRelation, SheetLink } from '@/components/sheet/DependencyBlock'
import { Objectives } from '@/components/sheet/Objectives'
import { PrevNext, type PrevNextTarget } from '@/components/sheet/PrevNext'
import { ScheduleOfParts } from '@/components/sheet/ScheduleOfParts'
import { SheetRail } from '@/components/sheet/SheetRail'
import { StatusBand } from '@/components/sheet/StatusBand'
import { TitleStrip } from '@/components/sheet/TitleBlock'
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
import { railLevels } from '@/lib/content/rail'
import { type CourseModule, loadAllModules, loadModule } from '@/lib/content/loader'
import { quickCheckOf, summarySection } from '@/lib/content/quickcheck'
import { renderMarkdown } from '@/lib/content/render'
import { scheduleOfParts, summarySentence } from '@/lib/content/schedule'
import {
  carriesCheckedBy,
  carriesRepositories,
  eyebrow,
  sheetFacts,
  sheetLabel,
  titleStripRows,
} from '@/lib/content/title-block'

/**
 * The module page — the screen a reader spends 95% of their time on, rebuilt in
 * M10 and M11.
 *
 * ## The shell, and the swap at the middle of it
 *
 * Three tracks, with **both rails anchored to the window edges** and the
 * reading column centred between them, capped at 80ch
 * (`kia-context/logs/BRAINSTORM.md` D15). Left is the **curriculum**, right is
 * **what is on this page** — which is the opposite way round from how it
 * shipped, and the swap is the point: the thing a reader reaches for most often
 * on a course page is another page of the course, and the contents of the page
 * you are already reading is a within-page aid. `PageShell` is asked for
 * `bleed`, because the 1200px shell every other route sits in is exactly what
 * stops a rail reaching the window.
 *
 * `sheetFormat` is down to two and it decides exactly one thing here: whether
 * there is a contents rail at all. A draft has no sections to list, so it has
 * none — but it keeps the curriculum rail, because that is navigation rather
 * than module info and a reader who lands on a stub needs a way out of it more
 * than anyone does. §4.5 still gives it its own anatomy: a status band, one
 * sentence and a schedule of parts, because wrapping a 1,144px instrument panel
 * around 120 words of stub was the single biggest failure mode of this whole
 * direction, and on fourteen of the thirty-three modules the stub IS the
 * design.
 *
 * ## What has not changed
 *
 * Every number the page prints — length, figures, sources, revision, language,
 * position, the size of the course — is derived (§11.25). §12 adds the surfaces
 * that carry reader state, and every one of them is an island under §12.2's
 * two-channel rule: the server renders the honest empty form — the completion
 * control unpressed, `CHECKED BY —`, an empty answer, every stamp slot at zero
 * against its real threshold — and the record fills it in after the hydration
 * commit. Nothing here reads storage during render, and nothing claims a state
 * the build could not know.
 *
 * **A draft gets none of it** (§12.4.1): no completion control, no Quick Check,
 * no submittal register, no `CHECKED BY` row, no stamp slots. It awards nothing
 * and cannot be completed, and that is what keeps every denominator on the site
 * honest.
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
  //
  // `excerptOf` rather than `sheet` is that same distinction held to: the
  // summary needs the origin its internal links resolve against — three sheets
  // cross-reference a neighbour inside their summary, and without it four
  // `.md` hrefs shipped into this panel and 404'd — but it must not take the
  // body's figure sequence with it.
  const summaryHtml =
    summaryMarkdown === null
      ? null
      : (
          await renderMarkdown(summaryMarkdown, {
            imageBase: imageBaseFor(sheet.category.slug),
            excerptOf: number,
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
  // §12.9 — the register's count, in the block that summarises the sheet. A
  // reader registered three repositories and this panel said nothing about
  // them; `title-block.ts` carries the rest of the reasoning beside the label.
  const repositories = carriesRepositories(facts) ? <Repositories slug={slug} /> : null

  // A4 sheets render no prose: §4.5's body is one sentence and a schedule, and
  // the markdown holds nothing else once the h1, the dek, the placeholder note
  // and the deleted progress rail are accounted for.
  const rendered = drawn
    ? await renderMarkdown(sheet.body, {
      imageBase: imageBaseFor(sheet.category.slug),
      sheet: number,
    })
    : null

  // M11 — the RIGHT rail: what is on this page, and what sits either side of
  // it in the dependency graph. A draft has neither: no sections, because §4.5
  // gives it one sentence and a schedule, and nothing to depend on it.
  const rail = drawn ? (
    <SheetRail
      toc={rendered?.toc.filter((entry) => entry.depth === 2) ?? []}
      relations={[
        relation('Requirements', graph.requires(number)),
        relation('Unlocks', graph.feeds(number)),
        relation('See also', graph.seeAlso(number)),
      ]}
    />
  ) : null

  // M10 — the LEFT rail: the curriculum, one accordion section per level, with
  // this module's level open and enlarged. Every module page gets it, draft
  // included: it is navigation, not module info, and a reader who lands on a
  // stub needs a way out of it more than anyone.
  const curriculum = (
    <CurriculumRail
      levels={railLevels()}
      currentSlug={slug}
      currentLevel={sheet.category.slug}
    />
  )

  // §4.5 item 5 — the single descriptive sentence, read out of the source
  // rather than retyped, and absent rather than invented if it is not there.
  const summary = drawn
    ? null
    : sheet.frontmatter.summary ?? summarySentence(sheet.body)

  const { previous, next } = neighbours(slug)

  return (
    // §5.2 — the footer's own row of facts, which only this page knows: the
    // sheet's number in the set, and the commit that last touched its file.
    /*
      M16 stage 1 part 2 — the three columns are `PageShell`'s slots now, not
      three divs this page builds. `bleed` is gone with the 1152px box it used
      to opt out of, and `bz-shell` anchors the rail and the aside to the
      window, which is what D15 asked for and what a centred container could
      never give.
    */
    <PageShell
      sheet={sheetLabel(facts)}
      revision={sheet.revision}
      rail={curriculum}
      aside={rail ?? undefined}
    >
      <div className="bz-sheet" data-format={format}>
        {/* `position: fixed` against the window's left edge and vertically
            centred, so it cannot collide with the sticky bar the way the first
            version of it did (D15). Its place in the document does not matter;
            the fold reveals it from an ancestor attribute. */}
        <RailRestoreTab />

        {format === 'A4' && <StatusBand />}

          {/* Below the width where a rail can sit beside the prose, both rails'
              content moves behind one control (§4.7). Which widths that is
              depends on which rails this format has, so the drawer is told:
              `wide` opens at the point the contents rail goes, `narrow` at the
              point the curriculum list does. */}
          <ContentsDrawer at={drawn ? 'wide' : 'narrow'}>
            {rail && <div className="hl-drawer-contents">{rail}</div>}
            <div className="hl-drawer-curriculum">{curriculum}</div>
          </ContentsDrawer>

          {/* §13.1.3 — THE READING PAGE TAKES NO CATEGORY HUE, and the first
              draft of §13 was wrong to grant it one.

              §13.12 gave this page a tinted header band, and it was built. Then
              the rule above it settled the matter: a category hue may appear
              ONLY on a surface that reports that category's progress, and it
              may never be the sole carrier of what it reports (§13.1.4, SC
              1.4.1). This page prints no statement of the subsystem's standing
              anywhere — the eyebrow names the subsystem and the sheet's place
              in the curriculum, and the completion control speaks for this module
              alone. So a tinted rule here would have been chroma asserting
              something about the reader that no text on the page said, and
              satisfying 1.4.1 would have meant adding a second coloured element
              to the one page §13.1.3 allows exactly one.

              Both ways out were worse than leaving it: the page is where a
              reader spends 95% of their time (§6), and neither a progress
              readout nor a second band belongs in the middle of a drawing. The
              band stays, in the structural line every other component uses. */}
          <div className="pt-3">
            <p className="hl-eyebrow hl-mark">{eyebrow(facts)}</p>
          </div>

          {/* The sheet title lives in the frontmatter and the markdown h1 is
              stripped (B6.1), so the column's own h1 takes §6.1's rule: 16px,
              a structural line, then 32px. */}
          <div className="prose hl-sheet-title">
            <h1>{sheet.frontmatter.title}</h1>
          </div>

          {/* M11 — the module's own facts, in the column, at every width.
              This used to be the narrow-window fallback for a 240px rail of
              twelve metadata rows; the rail was cut back to what a reader uses
              while reading (the sections and the dependencies) and the panel
              came here, where it already had a variant. Nothing was dropped:
              the rows, `CHECKED BY`, the repository count and the stamp grid
              are all still in it, which is why none of this went to O2. */}
          <TitleStrip
            rows={titleStripRows(facts)}
            checkedBy={checkedBy}
            repositories={repositories}
            stamps={
              stampFact === null ? null : (
                <SheetStamps slug={slug} fact={stampFact} variant="strip" />
              )
            }
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

          {/* M11 / D14 — COMPLETION CONTROL A: one button, at the end of the
              module, where the reader already is.

              §12.4.1 put this above the content, reasoning that a switch a
              reader meets after scrolling past everything is a switch about a
              thing they have already left. The author chose the opposite, and
              chose it for both surfaces at once: option A here, option C — a
              row of adjustable state — on the home and progress pages, because
              the two surfaces ask different questions
              (`kia-context/logs/BRAINSTORM.md` D14). At the end of a module the
              reader has one thing to say and wants one button in front of them;
              a control at the top asks them to assert something before they
              have read it.

              Both controls write through `src/lib/record/store.ts`, which is
              the only writer (`kia-context/specs/ARCHITECTURE.md` §5). Two
              controls, one path. The `s` shortcut clicks whichever one is on
              the page, by attribute, so moving it cost the keyboard map
              nothing. */}
          {criteria !== null && (
            <SignOff
              slug={slug}
              criteria={criteria}
              revision={sheet.revision?.hash ?? null}
              drawn={drawn}
            />
          )}

          <PrevNext previous={target(previous)} next={target(next)} />

          {/* §12.8 — one delegated listener for the whole document, mounted
              once. Evidence, not currency: no XP, no click counting. */}
          {drawn && <SourceTracking slug={slug} />}
          {/* §12.7 — the checklist is upgraded where it already stands, inside
              the section that explains it, rather than lifted out and stacked
              below the prose. Mounted only where there is one: one module in the
              corpus has items, and an island that finds nothing is a wasted
              mount on the other fourteen. */}
          {drawn && rendered !== null && rendered.checklist.length > 0 && (
            <ChecklistIsland slug={slug} />
          )}
      </div>
    </PageShell>
  )
}
