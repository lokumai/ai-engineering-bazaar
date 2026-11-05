import { beforeAll, describe, expect, it } from 'vitest'
import {
  buildIndexDraft,
  buildLevelDoc,
  buildModuleDoc,
  docLanguages,
  levelDocPath,
  moduleDocPath,
} from '@/lib/bundle/build'
import { courseImageSize } from '@/lib/bundle/image-size'
import {
  type Block,
  type IndexDraft as IndexDraftType,
  type Inline,
  IndexDraft,
  LevelDoc,
  type LinkTarget,
  ModuleDoc,
} from '@/lib/bundle/schema'
import type { ReadingLang } from '@/lib/content/languages'
import { loadAllModules, loadModule } from '@/lib/content/loader'

/**
 * The whole bundle over the real corpus, built in process without drawing a
 * diagram (guard 11 of spec 2.13). Every assertion is a rule that holds for
 * any corpus: nothing here names a module, a count or a title.
 */

const STUB_INPUTS = {
  publishedAt: '2026-11-05T07:20:30.000Z',
  diagramFont: { family: 'Vazirmatn' as const, sha256: '0'.repeat(64) },
  render: {},
}

const DIAGRAM_PATH = /^api\/v1\/diagrams\/[0-9a-f]{32}\.svg$/

let draft: IndexDraftType
/** Every document the draft names, by its path. */
const levels = new Map<string, LevelDoc>()
const modules = new Map<string, ModuleDoc>()

function inlinesOf(blocks: readonly Block[]): Inline[] {
  const found: Inline[] = []
  const inlines = (list: readonly Inline[]) => {
    for (const inline of list) {
      found.push(inline)
      if ('inlines' in inline) inlines(inline.inlines)
    }
  }
  for (const block of blocks) {
    if (block.type === 'paragraph' || block.type === 'heading') inlines(block.inlines)
    else if (block.type === 'list') for (const item of block.items) found.push(...inlinesOf(item.blocks))
    else if (block.type === 'quote') found.push(...inlinesOf(block.blocks))
    else if (block.type === 'table') for (const cell of [...block.head, ...block.rows.flat()]) inlines(cell.inlines)
  }
  return found
}

function blocksOf(blocks: readonly Block[]): Block[] {
  return blocks.flatMap((block) => [
    block,
    ...(block.type === 'list' ? block.items.flatMap((item) => blocksOf(item.blocks)) : []),
    ...(block.type === 'quote' ? blocksOf(block.blocks) : []),
  ])
}

function targetsOf(blocks: readonly Block[]): LinkTarget[] {
  return inlinesOf(blocks).flatMap((inline) => (inline.type === 'link' ? [inline.target] : []))
}

function everyDocument(): { path: string; blocks: Block[]; toc: string[] }[] {
  return [
    ...[...levels].map(([path, doc]) => ({ path, blocks: doc.blocks, toc: [] })),
    ...[...modules].map(([path, doc]) => ({ path, blocks: doc.body ?? [], toc: doc.toc.map((entry) => entry.id) })),
  ]
}

beforeAll(async () => {
  draft = IndexDraft.parse(await buildIndexDraft(STUB_INPUTS))
  for (const level of draft.levels) {
    if (level.readme === null) continue
    const built = await buildLevelDoc(level.slug, courseImageSize)
    if (built === null) throw new Error(`bundle.test: ${level.slug} lists a readme and builds none`)
    levels.set(level.readme, built.doc)
  }
  for (const module of draft.modules) {
    for (const [lang, path] of Object.entries(module.docs)) {
      modules.set(path, (await buildModuleDoc(module.key, lang as ReadingLang, courseImageSize)).doc)
    }
  }
  if (modules.size === 0) throw new Error('bundle.test: the corpus built no module document to check.')
}, 600_000)

describe('the bundle, over the real corpus', () => {
  it('parses every level and module document with its strict schema', () => {
    for (const [path, doc] of levels) expect(() => LevelDoc.parse(doc), path).not.toThrow()
    for (const [path, doc] of modules) expect(() => ModuleDoc.parse(doc), path).not.toThrow()
  })

  it('names each level document at its own path', () => {
    for (const level of draft.levels) {
      if (level.readme !== null) expect(level.readme).toBe(levelDocPath(level.slug))
    }
  })

  it('lists exactly the languages a module has, English always among them', () => {
    for (const module of draft.modules) {
      const loaded = loadModule(module.key)
      if (!loaded) throw new Error(`bundle.test: the index names ${module.key}, which the loader does not know`)
      const languages = docLanguages(loaded)
      expect(Object.keys(module.docs), module.key).toEqual(languages)
      expect(Object.keys(module.docs), module.key).toContain('en')
      for (const lang of languages) expect(module.docs[lang]).toBe(moduleDocPath(module.key, lang))
    }
  })

  it('resolves every module and anchor link', () => {
    const keys = new Set(draft.modules.map((module) => module.key))
    let checked = 0
    for (const { path, blocks, toc } of everyDocument()) {
      const ids = new Set([
        ...toc,
        ...blocksOf(blocks).flatMap((block) => (block.type === 'heading' ? [block.id] : [])),
      ])
      for (const target of targetsOf(blocks)) {
        if (target.kind === 'module') expect(keys.has(target.key), `${path} -> ${target.key}`).toBe(true)
        if (target.kind === 'anchor') expect(ids.has(target.id), `${path} -> #${target.id}`).toBe(true)
        checked += 1
      }
    }
    if (checked === 0) throw new Error('bundle.test: the corpus built no link to check.')
  })

  it('names only images that exist under mini-courses/', () => {
    for (const { path, blocks } of everyDocument()) {
      for (const block of blocksOf(blocks)) {
        if (block.type !== 'image') continue
        expect(() => courseImageSize(block.src), `${path}: ${block.src}`).not.toThrow()
      }
    }
  })

  it('names a light and a dark file for every diagram', () => {
    let diagrams = 0
    for (const { path, blocks } of everyDocument()) {
      for (const block of blocksOf(blocks)) {
        if (block.type !== 'diagram') continue
        expect(block.svg.light, path).toMatch(DIAGRAM_PATH)
        expect(block.svg.dark, path).toMatch(DIAGRAM_PATH)
        diagrams += 1
      }
    }
    if (diagrams === 0) throw new Error('bundle.test: the corpus built no diagram to check.')
    expect(draft.diagrams.length).toBeGreaterThan(0)
  })

  it('counts every module of a level, and every module sits in a declared level', () => {
    const declared = new Set(draft.levels.map((level) => level.slug))
    for (const module of draft.modules) expect(declared.has(module.level), module.key).toBe(true)
    for (const level of draft.levels) {
      expect(level.total, level.slug).toBe(draft.modules.filter((module) => module.level === level.slug).length)
    }
  })

  it('lists modules in curriculum order, with numbers that only increase', () => {
    expect(draft.modules.map((module) => module.key)).toEqual(loadAllModules().map((module) => module.slug))
    draft.modules.forEach((module, at) => {
      if (at > 0) expect(module.number, module.key).toBeGreaterThan(draft.modules[at - 1].number)
    })
  })
})
