/**
 * What a module page renders, derived once, for the two readers of it: the
 * module page (`ModuleSheet.tsx`) and the content bundle.
 *
 * **One input and two callers, so the page and the bundle cannot drift.** Each
 * field here was derived inside `ModuleSheet.tsx` until the bundle needed the
 * same answers; a second derivation in the bundle would have been a second
 * rule for which neighbour is Turkish, which module has a quiz and what a
 * draft's summary is, and the first one of them to change would have made the
 * native reader disagree with the web page without either failing. So the
 * page reads every field from here and derives none of them again, and
 * `scripts/compare-export.sh` against the export before the move found no
 * difference in any page.
 *
 * Build-time only: it reaches the loader, and so `node:fs`.
 */

import type { Root } from 'hast'
import type { ChecklistItem } from './checklist'
import { moduleByNumber, neighbours, sheetPath } from './curriculum'
import { moduleGraph } from './edges'
import { imageBaseFor, imagePathFor } from './images'
import { categoryIntro } from './intro'
import { type ReadingLang, type TranslatedLang } from './languages'
import { type CourseModule, loadAllModules } from './loader'
import { type QuizItem, quizFor } from './quiz'
import { type RenderedTree, type TocEntry, renderTree } from './render'
import { scheduleOfParts, summarySentence } from './schedule'

/**
 * A module this page links to, and where the link lands: `path` is the route
 * after localisation, and `lang` is the language of the page at that route,
 * the reading language only where a translated address exists.
 */
export interface RenderRef {
  module: CourseModule
  path: string
  lang: ReadingLang
}

export interface ModuleRenderInput {
  /** `sheetFormat !== 'A4'`: a draft renders no body, no rail and no quiz. */
  drawn: boolean
  tree: Root | null
  html: string | null
  toc: TocEntry[]
  checklist: ChecklistItem[]
  /** The quick quiz in the page's language, null for a draft or a module with none. */
  quiz: QuizItem[] | null
  /** §4.5 item 5, a draft's one sentence; null when drawn. */
  summary: string | null
  /** The draft's schedule of parts, read out of the body. */
  parts: string[]
  objectives: readonly string[]
  /** `graph.requires(number)`, a number no module answers to dropped. */
  prerequisites: RenderRef[]
  previous: RenderRef | null
  next: RenderRef | null
  /** One map for every link out of the page; the identity in English. */
  localise: (route: string) => string
}

/**
 * M19: keep a Turkish reader in Turkish when they follow a cross-reference.
 *
 * `rehypeCourseLinks` resolves `llms_tr.md` to a route, and the route it
 * resolves to is the ENGLISH one. **MEASURED on the built tree before this
 * existed: all 121 cross-references in the corpus landed in English**, so every
 * Turkish page was a one-way door, and nothing failed, because every one of
 * those links resolved perfectly.
 *
 * **It only redirects where there IS a Turkish address.** A module with no
 * usable translation has no `/tr/` page (`generateStaticParams` does not emit
 * one), so a link to it stays English rather than becoming a 404: a reader
 * sent to the English text of a module nobody translated is told nothing but is
 * also promised nothing, and a 404 would be worse on both counts.
 *
 * Built here rather than in `render.ts` because answering "does this module
 * have a translation" is the loader's knowledge, and `render.ts` may not import
 * the loader; this module already does and the other direction is a cycle.
 * It moved here from `ModuleSheet.tsx` so the bundle localises with the same map.
 */
function routeMapFor(lang: TranslatedLang): (route: string) => string {
  const translated = new Set(
    loadAllModules()
      .filter((sheet) => sheet.translations[lang] !== null)
      .map((sheet) => `/courses/${sheet.slug}/`),
  )
  return (route) => (translated.has(route) ? `/${lang}${route}` : route)
}

function refFor(
  module: CourseModule,
  lang: ReadingLang,
  localise: (route: string) => string,
): RenderRef {
  const route = sheetPath(module)
  const path = localise(route)
  return { module, path, lang: path !== route ? lang : 'en' }
}

/**
 * The render input of one module in one language. `sheet` is what
 * `loadModuleIn(slug, lang)` returned, so its body is already in `lang`.
 */
export async function moduleRenderInput(
  sheet: CourseModule,
  lang: ReadingLang,
): Promise<ModuleRenderInput> {
  const drawn = sheet.sheetFormat !== 'A4'
  const number = sheet.frontmatter.module

  /* Identity on the English tree, so nothing branches. */
  const localise = lang !== 'en' ? routeMapFor(lang) : (route: string) => route

  // A4 sheets render no prose: §4.5's body is one sentence and a schedule, and
  // the markdown holds nothing else once the h1, the dek, the placeholder note
  // and the deleted progress rail are accounted for.
  const rendered = drawn
    ? await renderTree(sheet.body, {
      imageBase: imageBaseFor(sheet.category.slug),
      imagePath: imagePathFor(sheet.category.slug),
      sheet: number,
      lang,
      localiseRoute: lang !== 'en' ? localise : undefined,
    })
    : null

  const prerequisites = moduleGraph()
    .requires(number)
    .map((one) => moduleByNumber(one))
    .filter((module): module is CourseModule => module !== undefined)
    .map((module) => refFor(module, lang, localise))

  const { previous, next } = neighbours(sheet.slug)

  return {
    drawn,
    tree: rendered?.tree ?? null,
    html: rendered?.html ?? null,
    toc: rendered?.toc ?? [],
    checklist: rendered?.checklist ?? [],
    // A draft never has a quiz: there is nothing yet to recall.
    quiz: drawn ? quizFor(sheet.category.dir, sheet.name, lang) : null,
    // §4.5 item 5: the single descriptive sentence, read out of the source
    // rather than retyped, and absent rather than invented if it is not there.
    summary: drawn ? null : sheet.frontmatter.summary ?? summarySentence(sheet.body),
    parts: scheduleOfParts(sheet.body),
    objectives: sheet.frontmatter.objectives,
    prerequisites,
    previous: previous ? refFor(previous, lang, localise) : null,
    next: next ? refFor(next, lang, localise) : null,
    localise,
  }
}

/**
 * A level's introduction, rendered with no options as the level page renders
 * it, or null where the level has none or there is no such level.
 */
export async function levelRenderInput(slug: string): Promise<RenderedTree | null> {
  const intro = categoryIntro(slug)
  return intro === null ? null : renderTree(intro)
}
