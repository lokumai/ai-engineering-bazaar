/**
 * What a module page renders, derived once, for the two readers of it: the
 * module page (`ModuleSheet.tsx`) and the content bundle that the mobile reader
 * draws (ARCHITECTURE §13).
 *
 * **One input and two callers, so the page and the bundle cannot drift.** Each
 * field here was derived inside `ModuleSheet.tsx` until the bundle needed the
 * same answers; a second derivation in the bundle would have been a second
 * rule for which neighbour is Turkish, which page a For Everyone link lands on,
 * which module has a quiz and what a planned module's summary is, and the first
 * of them to change would have made the mobile reader disagree with the web
 * page without either failing. So the page reads these fields from here and
 * derives none of them again.
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
import { scheduleOfParts, summarySentence, writtenSections } from './schedule'
import { type Track, moduleRoute } from '../tracks'

/**
 * M19 — keep a Turkish reader in Turkish when they follow a cross-reference.
 *
 * `rehypeCourseLinks` resolves `llms_tr.md` to a route, and the route it
 * resolves to is the ENGLISH one. **MEASURED on the built tree before this
 * existed: all 121 cross-references in the corpus landed in English**, so every
 * Turkish page was a one-way door — and nothing failed, because every one of
 * those links resolved perfectly.
 *
 * **It only redirects where there IS a Turkish address.** A module with no
 * usable translation has no `/tr/` page (`generateStaticParams` does not emit
 * one), so a link to it stays English rather than becoming a 404 — a reader
 * sent to the English text of a module nobody translated is told nothing but is
 * also promised nothing, and a 404 would be worse on both counts.
 *
 * Built here rather than in `render.ts` because answering "does this module
 * have a translation" is the loader's knowledge, and `render.ts` may not import
 * the loader — this module already does and the other direction is a cycle.
 */
function routeMapFor(lang: TranslatedLang): (route: string) => string {
  const translated = new Set(
    loadAllModules()
      .filter((sheet) => sheet.translations[lang] !== null)
      .map((sheet) => `/courses/${sheet.slug}/`),
  )
  return (route) => (translated.has(route) ? `/${lang}${route}` : route)
}

/**
 * D91 — the same rule for a For Everyone page: a link to a module goes to its
 * For Everyone page in this language where one is written, and otherwise to the
 * For Engineers page the plain map above would choose. A reader is never sent to
 * a page that does not exist.
 */
function everyoneRouteMap(lang: ReadingLang): (route: string) => string {
  const written = new Map(
    loadAllModules()
      .filter((sheet) => sheet.everyone !== null
        && (lang === 'en' || sheet.everyone.translations[lang] !== null))
      .map((sheet) => [`/courses/${sheet.slug}/`, moduleRoute(sheet.slug, 'everyone', lang)]),
  )
  const plain = lang === 'en' ? (route: string) => route : routeMapFor(lang)
  return (route) => written.get(route) ?? plain(route)
}

/**
 * One map for every link out of a module page in a track and a language: the
 * prose's cross-references, the pager, the prerequisites and the rail. The
 * identity on the English For Engineers tree, so nothing branches.
 */
export function localiserFor(track: Track, lang: ReadingLang): (route: string) => string {
  if (track === 'everyone') return everyoneRouteMap(lang)
  return lang !== 'en' ? routeMapFor(lang) : (route: string) => route
}

/** A module a page links to, and the address the link lands on after localisation. */
export interface RenderRef {
  module: CourseModule
  path: string
}

export interface ModuleRenderInput {
  /** `sheetFormat !== 'A4'`: a planned module renders no body, no rail and no quiz. */
  drawn: boolean
  tree: Root | null
  html: string | null
  toc: TocEntry[]
  checklist: ChecklistItem[]
  /**
   * D102 — the sections a planned module already holds, rendered as the page
   * renders them under its schedule; null when drawn or when it has none.
   */
  written: RenderedTree | null
  /**
   * The quick quiz in the page's language; null for a planned module and a
   * module with none. It is the module's one quiz file in every track (D137):
   * the tracks differ in the module text, not in what the reader is asked.
   */
  quiz: QuizItem[] | null
  /** §4.5 item 5, a planned module's one sentence; null when drawn. */
  summary: string | null
  /** The planned module's schedule of parts, read out of the body. */
  parts: string[]
  objectives: readonly string[]
  /** The language `objectives` are in: the page's own where the translation file declares them, else `en`. */
  objectivesLang: ReadingLang
  /** `graph.requires(number)`, a number no module answers to dropped. */
  prerequisites: RenderRef[]
  previous: RenderRef | null
  next: RenderRef | null
  /** `localiserFor(track, lang)`, the map every link above went through. */
  localise: (route: string) => string
}

function refFor(module: CourseModule, localise: (route: string) => string): RenderRef {
  return { module, path: localise(sheetPath(module)) }
}

/**
 * The render input of one module in one track and language. `sheet` is what
 * `loadModuleIn(slug, lang, track)` returned, so its body is already the one
 * that track shows, in `lang`.
 */
export async function moduleRenderInput(
  sheet: CourseModule,
  lang: ReadingLang,
  track: Track = 'engineers',
): Promise<ModuleRenderInput> {
  const drawn = sheet.sheetFormat !== 'A4'
  const number = sheet.frontmatter.module
  const localise = localiserFor(track, lang)
  const options = {
    imageBase: imageBaseFor(sheet.category.slug),
    imagePath: imagePathFor(sheet.category.slug),
    sheet: number,
    localiseRoute: lang !== 'en' || track === 'everyone' ? localise : undefined,
  }

  // A4 sheets render no prose: §4.5's body is one sentence and a schedule, and
  // the markdown holds nothing else once the h1, the dek, the placeholder note
  // and the deleted progress rail are accounted for.
  const rendered = drawn ? await renderTree(sheet.body, options) : null

  // D102 — a planned module may already hold sections a written one gave it.
  const early = drawn ? null : writtenSections(sheet.body)
  const written = early === null ? null : await renderTree(early, options)

  const prerequisites = moduleGraph()
    .requires(number)
    .map((one) => moduleByNumber(one))
    .filter((module): module is CourseModule => module !== undefined)
    .map((module) => refFor(module, localise))

  const { previous, next } = neighbours(sheet.slug)

  return {
    drawn,
    tree: rendered?.tree ?? null,
    html: rendered?.html ?? null,
    toc: rendered?.toc ?? [],
    checklist: rendered?.checklist ?? [],
    written,
    quiz: drawn ? quizFor(sheet.category.dir, sheet.name, lang) : null,
    // §4.5 item 5: the single descriptive sentence, read out of the source
    // rather than retyped, and absent rather than invented if it is not there.
    summary: drawn ? null : sheet.frontmatter.summary ?? summarySentence(sheet.body),
    parts: scheduleOfParts(sheet.body),
    objectives: sheet.frontmatter.objectives,
    objectivesLang: sheet.objectivesLang,
    prerequisites,
    previous: previous ? refFor(previous, localise) : null,
    next: next ? refFor(next, localise) : null,
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
