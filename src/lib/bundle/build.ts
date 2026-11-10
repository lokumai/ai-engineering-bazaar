import { moduleByNumber } from '@/lib/content/curriculum'
import { CATEGORIES, categoryBySlug } from '@/lib/content/curriculum-file'
import { curriculumFacts } from '@/lib/content/facts'
import { type ReadingLang, TRANSLATIONS } from '@/lib/content/languages'
import { type CourseModule, loadAllModules, loadModuleIn } from '@/lib/content/loader'
import { type RenderRef, levelRenderInput, moduleRenderInput } from '@/lib/content/module-render'
import { MOVED_LEVELS, MOVED_MODULES } from '@/lib/content/moved'
import { loadStory } from '@/lib/content/story'
import { quizFor } from '@/lib/content/quiz'
import { TRACKS, type Track, moduleRoute } from '@/lib/tracks'
import { addressOf } from './address'
import { type BlockContext, toBlocks } from './blocks'
import { courseImageSize } from './image-size'
import { designTokens } from './tokens'
import {
  BUNDLE_MAJOR,
  type DiagramSource,
  IndexDraft,
  LevelDoc,
  ModuleDoc,
  type Ref,
  StoryDoc,
  Tokens,
} from './schema'

/**
 * Every document of the content bundle that the TypeScript pipeline can
 * produce: the level documents, the module documents in each language, the
 * tokens and the draft index (spec 2.5). The route handlers serialise what
 * this returns; the finaliser completes the draft.
 *
 * **It reads, it does not derive.** A module document's body, contents,
 * quiz, draft summary and neighbours come from `moduleRenderInput`, the same
 * call the module page makes, so the bundle and the page cannot disagree about
 * any of them. What is assembled here is only the bundle's own shape.
 *
 * **Each document is parsed with its strict schema before it is returned**, so
 * a builder that drifts from the contract fails where it is built, naming the
 * field, rather than in a route handler or in the native reader.
 *
 * Build-time only: it reaches the loader, and so `node:fs`.
 */

/**
 * The languages a module has a document in, in a track: `'en'` first, then
 * every translation in `TRANSLATIONS` order. In For Everyone a module has
 * documents only where its For Everyone file is written (D91), which is also
 * where the web builds a page.
 */
export function docLanguages(module: CourseModule, track: Track = 'engineers'): ReadingLang[] {
  if (track === 'everyone') {
    const version = module.everyone
    if (version === null) return []
    return ['en', ...TRANSLATIONS.filter((one) => version.translations[one.id] !== null).map((one) => one.id)]
  }
  return ['en', ...TRANSLATIONS.filter((one) => module.translations[one.id] !== null).map((one) => one.id)]
}

/** Site-relative; `slug` is the module key, `<level>/<module>`. For Everyone sits under `everyone/`. */
export function moduleDocPath(slug: string, lang: ReadingLang, track: Track = 'engineers'): string {
  return track === 'everyone'
    ? `api/v1/modules/${slug}/everyone/${lang}.json`
    : `api/v1/modules/${slug}/${lang}.json`
}

export function levelDocPath(slug: string): string {
  return `api/v1/levels/${slug}.json`
}

/** The story document, site-relative. STORY.md is written in English only, so it is the one language (D125). */
export const STORY_DOC_PATH = 'api/v1/story/en.json'

/** The About page's story, as the page reads it (D115), in the bundle's shape (D125). */
export function buildStoryDoc(): StoryDoc {
  const { title, stalls, motto } = loadStory()
  return StoryDoc.parse({ schemaVersion: BUNDLE_MAJOR, lang: 'en', dir: 'ltr', title, stalls, motto })
}

/** The English page in a track, site-relative, for "Open on the web". */
function webPathOf(slug: string, track: Track): string {
  return moduleRoute(slug, track).replace(/^\//, '')
}

function refOf(ref: RenderRef): Ref {
  const { track, lang } = addressOf(ref.path)
  return {
    key: ref.module.slug,
    number: ref.module.frontmatter.module,
    title: ref.module.frontmatter.title,
    drawn: track === 'everyone' ? ref.module.everyone !== null : ref.module.frontmatter.status === 'ready',
    track,
    lang,
  }
}

function dirOf(lang: ReadingLang): 'ltr' | 'rtl' {
  if (lang === 'en') return 'ltr'
  const translation = TRANSLATIONS.find((one) => one.id === lang)
  if (!translation) throw new Error(`build: "${lang}" is not a languages.ts translation`)
  return translation.dir
}

/** The English objectives of a module, which v1 documents carry in every language. */
function englishObjectives(slug: string, track: Track, own: readonly string[], lang: ReadingLang): readonly string[] {
  if (lang === 'en') return own
  return loadModuleIn(slug, 'en', track)?.frontmatter.objectives ?? own
}

export async function buildModuleDoc(
  slug: string,
  lang: ReadingLang,
  sizeOf: BlockContext['sizeOf'] = courseImageSize,
  track: Track = 'engineers',
): Promise<{ doc: ModuleDoc; diagrams: DiagramSource[] }> {
  const sheet = loadModuleIn(slug, lang, track)
  if (sheet === undefined) throw new Error(`build: module "${slug}" has no ${lang} text in ${track} to build a document from`)
  const input = await moduleRenderInput(sheet, lang, track)

  const context = { module: track === 'everyone' ? `${slug} (everyone)` : slug, lang, sizeOf }
  const converted = input.tree === null ? null : toBlocks(input.tree, context)
  const written = input.written === null ? null : toBlocks(input.written.tree, context)

  const doc: ModuleDoc = {
    schemaVersion: BUNDLE_MAJOR,
    key: slug,
    track,
    lang,
    dir: dirOf(lang),
    // The translated heading (`loadModuleIn`); `ModuleRenderInput` carries no title.
    title: sheet.frontmatter.title,
    // v1 carries the English objectives in every document (`lang: 'en'`, ARCHITECTURE §13), and the
    // document's own list beside them as the additive field the mobile reader agreed (D123, D124).
    objectives: { lang: 'en', items: [...englishObjectives(slug, track, input.objectives, lang)] },
    translatedObjectives:
      lang !== 'en' && input.objectivesLang === lang ? { lang, items: [...input.objectives] } : null,
    prerequisites: input.prerequisites.map(refOf),
    previous: input.previous === null ? null : refOf(input.previous),
    next: input.next === null ? null : refOf(input.next),
    toc: input.toc.map((entry) => (entry.mark === undefined
      ? { id: entry.id, text: entry.text, depth: entry.depth }
      : { id: entry.id, text: entry.text, depth: entry.depth, mark: entry.mark })),
    body: converted === null ? null : converted.blocks,
    draft: input.drawn
      ? null
      : { summary: input.summary, parts: [...input.parts], written: written === null ? null : written.blocks },
    quiz: input.quiz === null
      ? null
      : input.quiz.map((item) => ({
        question: item.question,
        options: [...item.options],
        answer: item.answer,
        explain: item.explain,
      })),
  }

  return { doc: ModuleDoc.parse(doc), diagrams: [...(converted?.diagrams ?? []), ...(written?.diagrams ?? [])] }
}

export async function buildLevelDoc(
  slug: string,
  sizeOf: BlockContext['sizeOf'] = courseImageSize,
): Promise<{ doc: LevelDoc; diagrams: DiagramSource[] } | null> {
  const category = categoryBySlug(slug)
  if (category === undefined) throw new Error(`build: "${slug}" is not a level curriculum.yaml declares`)
  const rendered = await levelRenderInput(slug)
  if (rendered === null) return null

  const { blocks, diagrams } = toBlocks(rendered.tree, { module: slug, lang: 'en', sizeOf })
  const doc: LevelDoc = { schemaVersion: BUNDLE_MAJOR, slug, title: category.title, blocks }
  return { doc: LevelDoc.parse(doc), diagrams }
}

/** The first entry per id, in the order the lists arrive. */
export function uniqueDiagrams(lists: DiagramSource[][]): DiagramSource[] {
  const seen = new Set<string>()
  const unique: DiagramSource[] = []
  for (const diagram of lists.flat()) {
    if (seen.has(diagram.id)) continue
    seen.add(diagram.id)
    unique.push(diagram)
  }
  return unique
}

function prerequisiteKey(module: CourseModule, number: number): string {
  const prerequisite = moduleByNumber(number)
  if (prerequisite === undefined) {
    throw new Error(`build: module "${module.slug}" needs module ${number}, which no module is`)
  }
  return prerequisite.slug
}

/**
 * The index with `contentVersion`, `files` and `images` empty in their
 * positions, and the finaliser's two inputs after them (spec 2.5). It builds
 * every level and module document, because the diagrams to draw are the ones
 * those documents name; the levels first, then the modules, and the first
 * entry per diagram id is kept, in that order.
 */
/** A module's catalog entry in one track, building its documents on the way. */
async function trackEntry(
  module: CourseModule,
  track: Track,
  diagrams: DiagramSource[][],
): Promise<IndexDraft['modules'][number]['tracks'][Track]> {
  const languages = docLanguages(module, track)
  for (const lang of languages) diagrams.push((await buildModuleDoc(module.slug, lang, courseImageSize, track)).diagrams)

  if (track === 'everyone') {
    const english = loadModuleIn(module.slug, 'en', 'everyone')
    return {
      title: english?.frontmatter.title ?? module.frontmatter.title,
      drawn: module.everyone !== null,
      summary: module.everyone?.summary ?? null,
      // The quiz file asks about the For Engineers text (`moduleRenderInput`).
      hasQuiz: false,
      revision: module.everyone?.revision ?? null,
      docs: Object.fromEntries(languages.map((lang) => [lang, moduleDocPath(module.slug, lang, track)])),
      webPath: webPathOf(module.slug, track),
    }
  }
  const drawn = module.frontmatter.status === 'ready'
  return {
    title: module.frontmatter.title,
    drawn,
    summary: module.frontmatter.summary ?? null,
    hasQuiz: drawn && quizFor(module.category.dir, module.name, 'en') !== null,
    revision: module.revision,
    docs: Object.fromEntries(languages.map((lang) => [lang, moduleDocPath(module.slug, lang, track)])),
    webPath: webPathOf(module.slug, track),
  }
}

export async function buildIndexDraft(inputs: {
  publishedAt: string
  diagramFont: { family: 'Vazirmatn'; sha256: string }
  diagramThemes: IndexDraft['diagramThemes']
  render: IndexDraft['render']
}): Promise<IndexDraft> {
  const diagrams: DiagramSource[][] = []
  const totals = new Map(curriculumFacts().categories.map((category) => [category.slug, category.total]))

  const levels: IndexDraft['levels'] = []
  for (const category of CATEGORIES) {
    const built = await buildLevelDoc(category.slug)
    if (built !== null) diagrams.push(built.diagrams)
    const total = totals.get(category.slug)
    if (total === undefined) throw new Error(`build: curriculumFacts() has no total for level "${category.slug}"`)
    levels.push({
      slug: category.slug,
      title: category.title,
      status: category.status,
      blurb: category.blurb,
      total,
      readme: built === null ? null : levelDocPath(category.slug),
    })
  }

  const modules: IndexDraft['modules'] = []
  for (const module of loadAllModules()) {
    const entries: [Track, Awaited<ReturnType<typeof trackEntry>>][] = []
    for (const { id } of TRACKS) entries.push([id, await trackEntry(module, id, diagrams)])
    const tracks = Object.fromEntries(entries) as IndexDraft['modules'][number]['tracks']
    modules.push({
      key: module.slug,
      level: module.category.slug,
      number: module.frontmatter.module,
      minutes: module.frontmatter.duration,
      prerequisites: module.frontmatter.prerequisites.map((number) => prerequisiteKey(module, number)),
      tracks,
    })
  }

  return IndexDraft.parse({
    schemaVersion: BUNDLE_MAJOR,
    contentVersion: '',
    publishedAt: inputs.publishedAt,
    sourceLanguage: 'en',
    translations: TRANSLATIONS.map(({ id, label, dir }) => ({ id, label, dir })),
    tracks: TRACKS.map(({ id, label }) => ({ id, label })),
    diagramFont: inputs.diagramFont,
    diagramThemes: inputs.diagramThemes,
    levels,
    modules,
    moved: { levels: { ...MOVED_LEVELS }, modules: { ...MOVED_MODULES } },
    story: { en: STORY_DOC_PATH },
    files: {},
    images: {},
    diagrams: uniqueDiagrams(diagrams),
    render: inputs.render,
  })
}

/** Both themes' design tokens, as `tokens.json` carries them (spec 2.10). */
export function buildTokens(): Tokens {
  return Tokens.parse({ schemaVersion: BUNDLE_MAJOR, ...designTokens() })
}
