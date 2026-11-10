import { existsSync } from 'node:fs'
import path_ from 'node:path'
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
import { loadAllModules, loadModule, loadModuleIn } from '@/lib/content/loader'
import { CONTENT_ROOT } from '@/lib/content/paths'
import { TRACK_IDS, type Track } from '@/lib/tracks'

/**
 * The whole bundle over the real corpus, built in process without drawing a
 * diagram (guard 11 of spec 2.13). Every assertion is a rule that holds for
 * any corpus: nothing here names a module, a count or a title.
 */

const STUB_INPUTS = {
  publishedAt: '2026-11-05T07:20:30.000Z',
  diagramFont: { family: 'Vazirmatn' as const, sha256: '0'.repeat(64) },
  diagramThemes: { light: { theme: 'default', background: 'white' }, dark: { theme: 'dark', background: '#333' } },
  render: { light: {}, dark: {} },
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
    else if (block.type === 'callout') {
      if (block.title !== null) inlines(block.title)
      found.push(...inlinesOf(block.blocks))
      if (block.action !== null) {
        found.push({ type: 'link', target: block.action.target, inlines: block.action.inlines })
        inlines(block.action.inlines)
      }
    } else if (block.type === 'table') for (const cell of [...block.head, ...block.rows.flat()]) inlines(cell.inlines)
  }
  return found
}

function blocksOf(blocks: readonly Block[]): Block[] {
  return blocks.flatMap((block) => [
    block,
    ...(block.type === 'list' ? block.items.flatMap((item) => blocksOf(item.blocks)) : []),
    ...(block.type === 'quote' || block.type === 'callout' ? blocksOf(block.blocks) : []),
  ])
}

function targetsOf(blocks: readonly Block[]): LinkTarget[] {
  return inlinesOf(blocks).flatMap((inline) => (inline.type === 'link' ? [inline.target] : []))
}

function everyDocument(): { path: string; blocks: Block[]; toc: string[] }[] {
  return [
    ...[...levels].map(([path, doc]) => ({ path, blocks: doc.blocks, toc: [] })),
    ...[...modules].map(([path, doc]) => ({
      path,
      blocks: [...(doc.body ?? []), ...(doc.draft?.written ?? [])],
      toc: doc.toc.map((entry) => entry.id),
    })),
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
    for (const [track, entry] of Object.entries(module.tracks)) {
      for (const [lang, path] of Object.entries(entry.docs)) {
        modules.set(path, (await buildModuleDoc(module.key, lang as ReadingLang, courseImageSize, track as Track)).doc)
      }
    }
  }
  if (modules.size === 0) throw new Error('bundle.test: the corpus built no module document to check.')
}, 600_000)

describe('the bundle, over the real corpus', () => {
  it('parses every level and module document with its strict schema', () => {
    for (const [path, doc] of levels) expect(() => LevelDoc.parse(doc), path).not.toThrow()
    for (const [path, doc] of modules) expect(() => ModuleDoc.parse(doc), path).not.toThrow()
  })

  it('carries the track\'s English objectives in every document, whatever its language (v1, D123)', () => {
    let translatedChecked = 0
    for (const [path, doc] of modules) {
      const english = loadModuleIn(doc.key, 'en', doc.track)
      if (!english) throw new Error(`bundle.test: ${path} has no English page in ${doc.track}`)
      expect(doc.objectives.lang, path).toBe('en')
      expect([...doc.objectives.items], path).toEqual(english.frontmatter.objectives)
      // Non-vacuity: a translated document whose own list differs from the English
      // is what tells a bundle that leaked the translation from one that did not.
      if (doc.lang !== 'en') {
        const own = loadModuleIn(doc.key, doc.lang as ReadingLang, doc.track)!.frontmatter.objectives
        if (JSON.stringify(own) !== JSON.stringify(english.frontmatter.objectives)) translatedChecked++
      }
    }
    expect(translatedChecked, 'no translated document declares its own objectives, so a leak could not be seen')
      .toBeGreaterThan(0)
  })

  it('carries a translated document\'s own objectives beside the English, and null where it has none (D124)', () => {
    let carried = 0
    for (const [path, doc] of modules) {
      const own = doc.lang === 'en' ? null : loadModuleIn(doc.key, doc.lang as ReadingLang, doc.track)!
      if (own === null || own.objectivesLang === 'en') {
        expect(doc.translatedObjectives, path).toBeNull()
        continue
      }
      expect(doc.translatedObjectives, path).toEqual({ lang: doc.lang, items: own.frontmatter.objectives })
      expect(doc.translatedObjectives!.items.length, path).toBe(doc.objectives.items.length)
      carried++
    }
    expect(carried, 'no translated document declares its own objectives, so the field could not be seen').toBeGreaterThan(0)
  })

  it('names each level document at its own path', () => {
    for (const level of draft.levels) {
      if (level.readme !== null) expect(level.readme).toBe(levelDocPath(level.slug))
    }
  })

  it('gives every module an entry in every track, in tracks.ts order', () => {
    for (const module of draft.modules) expect(Object.keys(module.tracks), module.key).toEqual([...TRACK_IDS])
  })

  it('lists exactly the languages a module has in each track, English among them wherever it is written', () => {
    let everyone = 0
    for (const module of draft.modules) {
      const loaded = loadModule(module.key)
      if (!loaded) throw new Error(`bundle.test: the index names ${module.key}, which the loader does not know`)
      for (const track of TRACK_IDS) {
        const entry = module.tracks[track]
        const languages = docLanguages(loaded, track)
        expect(Object.keys(entry.docs), `${module.key} ${track}`).toEqual(languages)
        for (const lang of languages) expect(entry.docs[lang]).toBe(moduleDocPath(module.key, lang, track))
        if (track === 'engineers') expect(Object.keys(entry.docs), module.key).toContain('en')
        else {
          expect(entry.drawn, module.key).toBe(languages.length > 0)
          if (entry.drawn) everyone += 1
        }
      }
    }
    if (everyone === 0) throw new Error('bundle.test: the corpus has no For Everyone version to check.')
  })

  it('stamps each module document with the track and language it was built for', () => {
    for (const module of draft.modules) {
      for (const [track, entry] of Object.entries(module.tracks)) {
        for (const [lang, path] of Object.entries(entry.docs)) {
          const doc = modules.get(path)
          expect(doc?.track, path).toBe(track)
          expect(doc?.lang, path).toBe(lang)
          if (track === 'everyone') expect(doc?.quiz, path).toBeNull()
        }
      }
    }
  })

  it('sends every reference to a document the bundle has, in the track and language it names', () => {
    const byKey = new Map(draft.modules.map((module) => [module.key, module]))
    const exists = (key: string, track: Track, lang: string) => byKey.get(key)?.tracks[track]?.docs[lang] !== undefined
    let checked = 0
    for (const [path, doc] of modules) {
      for (const ref of [...doc.prerequisites, doc.previous, doc.next]) {
        if (ref === null) continue
        // An unwritten For Engineers module still has its planned page.
        expect(exists(ref.key, ref.track, ref.lang), `${path} -> ${ref.key} (${ref.track}, ${ref.lang})`).toBe(true)
        checked += 1
      }
    }
    if (checked === 0) throw new Error('bundle.test: the corpus built no reference to check.')
  })

  it('forwards every moved address to a level or module the index has', () => {
    const levels = new Set(draft.levels.map((level) => level.slug))
    const keys = new Set(draft.modules.map((module) => module.key))
    for (const [from, to] of Object.entries(draft.moved.levels)) {
      expect(levels.has(to), `${from} -> ${to}`).toBe(true)
      expect(levels.has(from), from).toBe(false)
    }
    for (const [from, to] of Object.entries(draft.moved.modules)) {
      expect(keys.has(to), `${from} -> ${to}`).toBe(true)
      expect(keys.has(from), from).toBe(false)
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
        if (target.kind === 'module') {
          expect(keys.has(target.key), `${path} -> ${target.key}`).toBe(true)
          const entry = draft.modules.find((module) => module.key === target.key)?.tracks[target.track]
          expect(entry?.docs[target.lang], `${path} -> ${target.key} (${target.track}, ${target.lang})`).toBeDefined()
        }
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

  it('names only logos that exist under mini-courses/, and marks the single-colour ones', () => {
    let logos = 0
    for (const { path, blocks } of everyDocument()) {
      for (const inline of inlinesOf(blocks)) {
        if (inline.type !== 'logo') continue
        const dir = inline.src.split('/')[1]
        const level = loadAllModules().find((module) => module.category.slug === dir)
        if (!level) throw new Error(`bundle.test: ${path} names a logo under ${inline.src}, which is no level's image folder`)
        const file = path_.join(level.category.dir, 'images', inline.src.split('/').slice(2).join('/'))
        expect(existsSync(path_.join(CONTENT_ROOT, file)), `${path}: ${inline.src}`).toBe(true)
        expect(inline.mono, inline.src).toBe(inline.src.endsWith('-mono.svg'))
        logos += 1
      }
    }
    if (logos === 0) throw new Error('bundle.test: the corpus built no logo to check.')
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
