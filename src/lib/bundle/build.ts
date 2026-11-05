import { moduleByNumber } from '@/lib/content/curriculum'
import { CATEGORIES, categoryBySlug } from '@/lib/content/curriculum-file'
import { curriculumFacts } from '@/lib/content/facts'
import { type ReadingLang, TRANSLATIONS } from '@/lib/content/languages'
import { type CourseModule, loadAllModules, loadModuleIn } from '@/lib/content/loader'
import { type RenderRef, levelRenderInput, moduleRenderInput } from '@/lib/content/module-render'
import { quizFor } from '@/lib/content/quiz'
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

/** `'en'` first, then every translation the module has, in `TRANSLATIONS` order. */
export function docLanguages(module: CourseModule): ReadingLang[] {
  return ['en', ...TRANSLATIONS.filter((one) => module.translations[one.id] !== null).map((one) => one.id)]
}

/** Site-relative; `slug` is the module key, `<level>/<module>`. */
export function moduleDocPath(slug: string, lang: ReadingLang): string {
  return `api/v1/modules/${slug}/${lang}.json`
}

export function levelDocPath(slug: string): string {
  return `api/v1/levels/${slug}.json`
}

/** The English page, site-relative, for "Open on the web". */
function webPathOf(slug: string): string {
  return `courses/${slug}/`
}

function refOf(ref: RenderRef): Ref {
  return {
    key: ref.module.slug,
    number: ref.module.frontmatter.module,
    title: ref.module.frontmatter.title,
    drawn: ref.module.frontmatter.status === 'ready',
    lang: ref.lang,
  }
}

function dirOf(lang: ReadingLang): 'ltr' | 'rtl' {
  if (lang === 'en') return 'ltr'
  const translation = TRANSLATIONS.find((one) => one.id === lang)
  if (!translation) throw new Error(`build: "${lang}" is not a languages.ts translation`)
  return translation.dir
}

export async function buildModuleDoc(
  slug: string,
  lang: ReadingLang,
  sizeOf: BlockContext['sizeOf'] = courseImageSize,
): Promise<{ doc: ModuleDoc; diagrams: DiagramSource[] }> {
  const sheet = loadModuleIn(slug, lang)
  if (sheet === undefined) throw new Error(`build: module "${slug}" has no ${lang} text to build a document from`)
  const input = await moduleRenderInput(sheet, lang)

  const converted = input.tree === null ? null : toBlocks(input.tree, { module: slug, lang, sizeOf })

  const doc: ModuleDoc = {
    schemaVersion: BUNDLE_MAJOR,
    key: slug,
    lang,
    dir: dirOf(lang),
    // The translated heading (`loadModuleIn`); `ModuleRenderInput` carries no title.
    title: sheet.frontmatter.title,
    objectives: { lang: 'en', items: [...input.objectives] },
    prerequisites: input.prerequisites.map(refOf),
    previous: input.previous === null ? null : refOf(input.previous),
    next: input.next === null ? null : refOf(input.next),
    toc: input.toc.map((entry) => (entry.mark === undefined
      ? { id: entry.id, text: entry.text, depth: entry.depth }
      : { id: entry.id, text: entry.text, depth: entry.depth, mark: entry.mark })),
    body: converted === null ? null : converted.blocks,
    draft: input.drawn ? null : { summary: input.summary, parts: [...input.parts] },
    quiz: input.quiz === null
      ? null
      : input.quiz.map((item) => ({
        question: item.question,
        options: [...item.options],
        answer: item.answer,
        explain: item.explain,
      })),
  }

  return { doc: ModuleDoc.parse(doc), diagrams: converted?.diagrams ?? [] }
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
export async function buildIndexDraft(inputs: {
  publishedAt: string
  diagramFont: { family: 'Vazirmatn'; sha256: string }
  render: unknown
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
    const languages = docLanguages(module)
    for (const lang of languages) diagrams.push((await buildModuleDoc(module.slug, lang)).diagrams)

    const drawn = module.frontmatter.status === 'ready'
    modules.push({
      key: module.slug,
      level: module.category.slug,
      number: module.frontmatter.module,
      title: module.frontmatter.title,
      drawn,
      minutes: module.frontmatter.duration,
      summary: module.frontmatter.summary ?? null,
      prerequisites: module.frontmatter.prerequisites.map((number) => prerequisiteKey(module, number)),
      hasQuiz: drawn && quizFor(module.category.dir, module.name, 'en') !== null,
      revision: module.revision === null ? null : { hash: module.revision.hash, date: module.revision.date },
      docs: Object.fromEntries(languages.map((lang) => [lang, moduleDocPath(module.slug, lang)])),
      webPath: webPathOf(module.slug),
    })
  }

  return IndexDraft.parse({
    schemaVersion: BUNDLE_MAJOR,
    contentVersion: '',
    publishedAt: inputs.publishedAt,
    sourceLanguage: 'en',
    translations: TRANSLATIONS.map(({ id, label, dir }) => ({ id, label, dir })),
    diagramFont: inputs.diagramFont,
    levels,
    modules,
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
