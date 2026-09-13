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
import { ContentsDrawer } from '@/components/sheet/ContentsDrawer'
import type { DependencyRelation, SheetLink } from '@/components/sheet/DependencyBlock'
import { Objectives } from '@/components/sheet/Objectives'
import { PrevNext, type PrevNextTarget } from '@/components/sheet/PrevNext'
import { ScheduleOfParts } from '@/components/sheet/ScheduleOfParts'
import { FactsStrip } from '@/components/sheet/FactsStrip'
import { Requirements } from '@/components/sheet/Requirements'
import { SheetRail } from '@/components/sheet/SheetRail'
import { StatusBand } from '@/components/sheet/StatusBand'
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
  sheetFacts,
  sheetLabel,
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
    <SheetRail toc={rendered?.toc.filter((entry) => entry.depth === 2) ?? []} />
  ) : null

  /* M16 stage 5 — the relations left the rail. `01` puts them behind the
     action row's quiet `Requirements (n)` button, so they are a disclosure a
     reader opens once when deciding whether they can start, rather than a
     permanent column of module numbers beside the prose. */
  const relations = [
    relation('Requirements', graph.requires(number)),
    relation('Unlocks', graph.feeds(number)),
    relation('See also', graph.seeAlso(number)),
  ]

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
      /* M21 — **the trail's last crumb was the raw slug.** `breadcrumbFor`
         falls back to `segment.replaceAll('-', ' ')` for a segment no route
         table names, so a module read `Home / Catalog / Fundamentals / llms`
         while its own heading said `LLM Fundamentals`. Found by screenshot,
         and it matters more than it did: with the level tag gone from the
         facts strip, the trail is what names the level on this page, so it
         had better be the part of the chrome that is right. */
      trailLeaf={sheet.frontmatter.title}
    >
      <div className="bz-sheet" data-format={format}>
        {/* The rail's fold control used to be rendered here and M21 moved it
            into `PageShell`, immediately before the rail. It is `position:
            fixed`, so its place in the document decides only the TAB ORDER —
            and from here a keyboard reader could not reach it in 30 presses. */}

        {format === 'A4' && <StatusBand />}

        {/* Below the width where a rail can sit beside the prose, both rails'
            content moves behind one control (§4.7). Which widths that is
            depends on which rails this format has, so the drawer is told:
            `wide` opens at the point the contents rail goes, `narrow` at the
            point the curriculum list does. */}
        <ContentsDrawer at={drawn ? 'wide' : 'narrow'}>
          {rail && <div className="bz-drawer-contents">{rail}</div>}
          <div className="bz-drawer-curriculum">{curriculum}</div>
        </ContentsDrawer>

        {/*
          THE COLUMN, IN THE ORDER `01` DRAWS IT — M16 stage 5.

          `main > .col` has six children: the trail, the display heading, a row
          of tags, the prose, a top-ruled action row, and a two-up pager. The
          trail is `PageShell`'s; the other five are here, and getting to five
          from fourteen is most of what this stage did.

          What went, and where:

          - the EYEBROW — `LEVEL 01 · FUNDAMENTALS · MODULE 3 OF 33`, a
            tracked-out all-caps meta line above the title. DESIGN.md names
            that shape as a tell, and every fact in it is in the two tags
            below.
          - the TITLE STRIP — twelve `dt`/`dd` rows. `FactsStrip` says where
            each of them went.
          - the OBJECTIVES — from a numbered list under a mono head, outside
            the prose, to the mockup's `leaf` card as the prose's first child.
          - the RIGHT RAIL's second half — the dependency list, now the action
            row's quiet disclosure.

          §13.1.3 still holds and is the reason this page takes NO category hue
          beyond the facts strip's dot: a category hue may appear only on a
          surface that reports that category's progress, and this page reports
          one module's.
        */}
        {/* M21 — **THE LANGUAGE CONTROL'S SLOT IS HERE, AND IT IS EMPTY ON
            PURPOSE.**

            The author placed it: *"Language of each module should be selectable
            from the top-right corner of the box which contains the whole
            center-aligned module content."* That is this box, level with the
            heading below, on its trailing edge.

            **M21 builds nothing in it.** 33 `_tr.md` files exist and the
            loader renders none of them, so a control here would switch
            nothing — the claim §1 forbids, and the same reason the mockup's own
            `TR` button and search field were both left out of the bar. M19 owns
            the second language and is the only milestone that can make this do
            something; this comment exists so M19 does not have to re-decide
            where it goes.

            When it lands it is an ADDRESS and not a preference (M19's shape 1),
            which is what lets a reader send somebody a Turkish URL and what
            makes it right with the bundle blocked. */}
        <h1 className="bz-display">{sheet.frontmatter.title}</h1>

        <FactsStrip facts={facts} />

        {drawn && rendered ? (
          <Prose
            html={rendered.html}
            opening={<Objectives items={sheet.frontmatter.objectives} />}
          />
        ) : (
          <>
            <Objectives items={sheet.frontmatter.objectives} />
            {summary && <p className="bz-lead">{summary}</p>}
            <ScheduleOfParts parts={scheduleOfParts(sheet.body)} />
          </>
        )}

        {/* M11 / D14 — COMPLETION CONTROL A: one button, at the end of the
            module, where the reader already is. §12.4.1 put it above the
            content; the author chose the opposite and chose it for both
            surfaces at once (BRAINSTORM D14). A draft has no control at all,
            so on those the row carries the quiet button alone. */}
        {criteria !== null ? (
          <SignOff
            slug={slug}
            criteria={criteria}
            revision={sheet.revision?.hash ?? null}
            drawn={drawn}
            beside={<Requirements relations={relations} />}
          />
        ) : (
          <div className="bz-actions">
            <Requirements relations={relations} />
          </div>
        )}

        {/*
          WHAT A READER DOES AFTER READING, as `leaf` cards below the action
          row and above the pager.

          None of these five has a mockup: `01` draws a module and stops at the
          pager. So **D30** applies, and the derivation is the mockup's own
          reading order — the action row is where the page turns from reading
          to doing, and everything a reader can do belongs after it. The honest
          cost is a longer column; the alternative was inventing a shape for
          five components at once, which is how M9 to M14 went wrong.
        */}
        {quickCheck !== null && (
          <QuickCheck slug={slug} question={quickCheck.question} summaryHtml={summaryHtml} />
        )}

        {drawn && <Submittal slug={slug} />}

        {stampFact !== null && (
          <section className="bz-card" aria-labelledby="marked-by">
            <b id="marked-by" className="bz-card-title">
              Marked by
            </b>
            <SheetStamps slug={slug} fact={stampFact} variant="strip" />

            {/* Labelled, because `CheckedBy` and `Repositories` render a bare
                value — they were written to be the `<dd>` of a title-block row,
                and the row they belonged to is gone. A name and a count with
                nothing saying which is which is the meta strip DESIGN.md calls
                a tell, so the pair keeps its labels and the `<dl>` that makes
                them a pair to a screen reader. */}
            <dl className="bz-card-facts">
              {checkedBy !== null && (
                <div>
                  <dt>Checked by</dt>
                  <dd>{checkedBy}</dd>
                </div>
              )}
              {repositories !== null && (
                <div>
                  <dt>Repositories</dt>
                  <dd>{repositories}</dd>
                </div>
              )}
            </dl>
          </section>
        )}

        <PrevNext previous={target(previous)} next={target(next)} />

        {/* §12.8 — one delegated listener for the whole document, mounted
            once. Evidence, not currency: no XP, no click counting. */}
        {drawn && <SourceTracking slug={slug} />}
        {/* §12.7 — the checklist is upgraded where it already stands, inside
            the section that explains it, rather than lifted out and stacked
            below the prose. */}
        {drawn && rendered !== null && rendered.checklist.length > 0 && (
          <ChecklistIsland slug={slug} />
        )}
      </div>
    </PageShell>
  )
}
