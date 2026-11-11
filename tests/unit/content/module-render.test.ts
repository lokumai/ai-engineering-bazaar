import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '@/lib/content/curriculum-file'
import { moduleByNumber, neighbours, sheetPath } from '@/lib/content/curriculum'
import { moduleGraph } from '@/lib/content/edges'
import { categoryIntro } from '@/lib/content/intro'
import { type CourseModule, loadAllModules, loadModuleIn } from '@/lib/content/loader'
import { levelRenderInput, moduleRenderInput, type RenderRef } from '@/lib/content/module-render'
import { quizFor } from '@/lib/content/quiz'
import { renderMarkdown } from '@/lib/content/render'
import { scheduleOfParts, summarySentence } from '@/lib/content/schedule'

/**
 * The module page and the content bundle read one render input, so neither can
 * derive a field the other does not see.
 *
 * Every module is chosen from the loader at run time, so these hold for any
 * corpus with a drawn module, a draft and a Turkish module whose links land in
 * both languages; a corpus without one throws, naming what it lacks.
 */

const all = loadAllModules()

function load(module: CourseModule, lang: 'en' | 'tr'): CourseModule {
  const sheet = loadModuleIn(module.slug, lang)
  if (!sheet) throw new Error(`precondition: loadModuleIn yields nothing for ${module.slug} in ${lang}`)
  return sheet
}

function refsOf(input: {
  prerequisites: RenderRef[]
  previous: RenderRef | null
  next: RenderRef | null
}): RenderRef[] {
  return [...input.prerequisites, input.previous, input.next].filter(
    (ref): ref is RenderRef => ref !== null,
  )
}

describe('moduleRenderInput', () => {
  it('a drawn module gets a tree, a quiz decision and no summary', async () => {
    const drawn = all.find((m) => m.sheetFormat !== 'A4')
    if (!drawn) throw new Error('precondition: the loader yields no drawn module')
    const sheet = load(drawn, 'en')

    const input = await moduleRenderInput(sheet, 'en')

    expect(input.drawn).toBe(true)
    expect(input.tree).not.toBeNull()
    expect(input.html).not.toBeNull()
    expect(input.summary).toBeNull()
    expect(input.quiz).toEqual(quizFor(sheet.category.dir, sheet.name, 'en'))
    expect(input.parts).toEqual(scheduleOfParts(sheet.body))
    expect(input.objectives).toEqual(sheet.frontmatter.objectives)
  })

  it('a module has one quiz, whatever the track and the language it is read in (D137)', async () => {
    let everyone = 0
    for (const module of all) {
      for (const track of ['engineers', 'everyone'] as const) {
        for (const lang of ['en', 'tr', 'fa'] as const) {
          const sheet = loadModuleIn(module.slug, lang, track)
          if (!sheet || sheet.sheetFormat === 'A4') continue
          const input = await moduleRenderInput(sheet, lang, track)
          expect(input.quiz, `${module.slug} ${track} ${lang}`).toEqual(quizFor(module.category.dir, module.name, lang))
          if (track === 'everyone' && input.quiz !== null) everyone += 1
        }
      }
    }
    if (everyone === 0) throw new Error('precondition: no For Everyone page has a quiz to compare')
  })

  it('a draft gets no body, no quiz, its summary and its parts', async () => {
    const draft = all.find((m) => m.sheetFormat === 'A4')
    if (!draft) throw new Error('precondition: the loader yields no draft module')
    const sheet = load(draft, 'en')

    const input = await moduleRenderInput(sheet, 'en')

    expect(input.drawn).toBe(false)
    expect(input.tree).toBeNull()
    expect(input.html).toBeNull()
    expect(input.toc).toEqual([])
    expect(input.checklist).toEqual([])
    expect(input.quiz).toBeNull()
    expect(input.summary).toBe(sheet.frontmatter.summary ?? summarySentence(sheet.body))
    expect(input.parts).toEqual(scheduleOfParts(sheet.body))
  })

  it('names every prerequisite the graph has, in order, and both neighbours', async () => {
    const withRequires = all.find((m) => moduleGraph().requires(m.frontmatter.module).length > 0)
    if (!withRequires) throw new Error('precondition: the loader yields no module with a prerequisite')
    const sheet = load(withRequires, 'en')

    const input = await moduleRenderInput(sheet, 'en')

    const expected = moduleGraph()
      .requires(sheet.frontmatter.module)
      .map((number) => moduleByNumber(number))
      .filter((module): module is CourseModule => module !== undefined)
    expect(input.prerequisites.map((ref) => ref.module.slug)).toEqual(expected.map((m) => m.slug))
    const { previous, next } = neighbours(sheet.slug)
    expect(input.previous?.module.slug ?? null).toBe(previous?.slug ?? null)
    expect(input.next?.module.slug ?? null).toBe(next?.slug ?? null)
  })

  it('Turkish keeps a translated neighbour in Turkish and an untranslated one in English', async () => {
    const graph = moduleGraph()
    const linked = (m: CourseModule): CourseModule[] => {
      const { previous, next } = neighbours(m.slug)
      return [
        ...graph.requires(m.frontmatter.module).map((n) => moduleByNumber(n)),
        previous,
        next,
      ].filter((one): one is CourseModule => one !== null && one !== undefined)
    }
    const mixed = all.find(
      (m) =>
        m.translations.tr !== null &&
        linked(m).some((one) => one.translations.tr !== null) &&
        linked(m).some((one) => one.translations.tr === null),
    )
    if (!mixed) {
      throw new Error(
        'precondition: the loader yields no Turkish module linking to both a translated and an untranslated module',
      )
    }
    const sheet = load(mixed, 'tr')

    const input = await moduleRenderInput(sheet, 'tr')
    const refs = refsOf(input)

    for (const ref of refs) {
      expect(ref.path).toBe(input.localise(sheetPath(ref.module)))
      expect(ref.path.startsWith('/tr/')).toBe(ref.module.translations.tr !== null)
    }
    expect(refs.some((ref) => ref.path.startsWith('/tr/'))).toBe(true)
    expect(refs.some((ref) => !ref.path.startsWith('/tr/'))).toBe(true)
  })

  it('English is the identity', async () => {
    const first = all[0]
    if (!first) throw new Error('precondition: the loader yields no module')

    const input = await moduleRenderInput(load(first, 'en'), 'en')

    expect(input.localise('/courses/x/y/')).toBe('/courses/x/y/')
    for (const ref of refsOf(input)) {
      expect(ref.path).toBe(sheetPath(ref.module))
    }
  })
})

describe('levelRenderInput', () => {
  it('renders a level introduction as the level page does, and nothing where there is none', async () => {
    const withIntro = CATEGORIES.find((category) => categoryIntro(category.slug) !== null)
    if (!withIntro) throw new Error('precondition: no level has an introduction')
    const intro = categoryIntro(withIntro.slug) as string

    const input = await levelRenderInput(withIntro.slug)

    expect(input?.html).toBe((await renderMarkdown(intro)).html)
    expect(input?.tree).toBeDefined()
    expect(await levelRenderInput('no-such-level')).toBeNull()
  })
})
