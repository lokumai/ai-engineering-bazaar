import { mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { contentVersionOf, sha256Hex, sortedRecord } from '../../../scripts/lib/bundle-hash.mjs'
import { checkBundleOut } from '../../../scripts/check-bundle-out.mjs'

/**
 * Guard 12's checker, run as a function over a synthetic export (spec 2.13
 * guard 10). The clean tree passes; each case below breaks exactly one
 * property of it and asserts the checker names that property. Every value is
 * invented: one level, one English module, one diagram in two variants, one
 * image and a font file.
 */

const BASE = '/base'
const LIGHT = 'api/v1/diagrams/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.svg'
const DARK = 'api/v1/diagrams/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.svg'
const IMAGE = 'course-images/level/picture.png'
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0L10 10" stroke="#000000"/></svg>'

interface Docs {
  level: Record<string, unknown>
  module: Record<string, unknown>
  svg: string
  tokens: string
}

interface Options {
  /** Changes a document before anything is hashed, so every hash still agrees. */
  docs?: (docs: Docs) => void
  /** Changes the index before contentVersion is computed from it. */
  index?: (index: Record<string, unknown>) => void
  /** Changes the finished export on disk, after every hash was taken. */
  after?: (dir: string) => void
}

const made: string[] = []

afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function put(dir: string, path: string, content: string | Uint8Array): void {
  const file = join(dir, path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, content)
}

function tree(options: Options = {}): { dir: string; fontFile: string } {
  const dir = mkdtempSync(join(tmpdir(), 'bundle-'))
  made.push(dir)

  const docs: Docs = {
    level: {
      schemaVersion: 1,
      slug: 'level',
      title: 'Level',
      blocks: [{ type: 'image', number: '1', title: null, note: null, src: IMAGE, alt: 'A picture', width: 4, height: 3 }],
    },
    module: {
      schemaVersion: 1,
      key: 'level/module',
      lang: 'en',
      dir: 'ltr',
      title: 'Module',
      objectives: { lang: 'en', items: [] },
      prerequisites: [],
      previous: null,
      next: null,
      toc: [],
      body: [
        { type: 'paragraph', inlines: [{ type: 'text', text: 'Body' }] },
        { type: 'diagram', number: '1', title: 'Flow', svg: { light: LIGHT, dark: DARK } },
      ],
      draft: null,
      quiz: null,
    },
    svg: SVG,
    tokens: JSON.stringify({ schemaVersion: 1, light: { '--a': '#000000ff' }, dark: { '--a': '#ffffffff' } }),
  }
  options.docs?.(docs)

  const font = new TextEncoder().encode('font bytes')
  const fontFile = join(dir, 'font.ttf')
  writeFileSync(fontFile, font)

  const bundle: Record<string, string> = {
    'api/v1/levels/level.json': JSON.stringify(docs.level),
    'api/v1/modules/level/module/en.json': JSON.stringify(docs.module),
    'api/v1/tokens.json': docs.tokens,
    [LIGHT]: docs.svg,
    [DARK]: SVG,
  }
  for (const [path, content] of Object.entries(bundle)) put(dir, path, content)
  put(dir, 'api/index.json', JSON.stringify({ majors: [1] }))
  put(dir, 'api/v1/record-conformance.json', JSON.stringify({ cases: [] }))
  const picture = new TextEncoder().encode('png bytes')
  put(dir, IMAGE, picture)

  const index: Record<string, unknown> = {
    schemaVersion: 1,
    contentVersion: '',
    publishedAt: '2026-11-05T07:20:30.000Z',
    sourceLanguage: 'en',
    translations: [],
    diagramFont: { family: 'Vazirmatn', sha256: sha256Hex(font) },
    levels: [{ slug: 'level', title: 'Level', status: 'ready', blurb: '', total: 1, readme: 'api/v1/levels/level.json' }],
    modules: [],
    files: sortedRecord(Object.entries(bundle).map(([path, content]) => [path, sha256Hex(content)])),
    images: sortedRecord([[IMAGE, sha256Hex(picture)]]),
  }
  options.index?.(index)
  index.contentVersion = contentVersionOf(index)
  put(dir, 'api/v1/index.json', JSON.stringify(index))

  options.after?.(dir)
  return { dir, fontFile }
}

function check(options: Options = {}): string[] {
  const { dir, fontFile } = tree(options)
  return checkBundleOut(dir, { basePath: BASE, fontFile })
}

function rewriteIndex(dir: string, change: (index: Record<string, unknown>) => void): void {
  const file = join(dir, 'api/v1/index.json')
  const index = JSON.parse(readFileSync(file, 'utf8'))
  change(index)
  writeFileSync(file, JSON.stringify(index))
}

function flipLastByte(dir: string, path: string): void {
  const file = join(dir, path)
  const bytes = readFileSync(file)
  bytes[bytes.length - 1] ^= 1
  writeFileSync(file, bytes)
}

/** At least one failure, and one of them matches. */
function expectNamed(failures: string[], pattern: RegExp): void {
  expect(failures.length, 'the broken tree passed').toBeGreaterThan(0)
  expect(failures, failures.join('\n')).toEqual(expect.arrayContaining([expect.stringMatching(pattern)]))
}

describe('checkBundleOut on a conforming tree', () => {
  it('passes', () => {
    expect(check()).toEqual([])
  })

  it('passes a string that carries the base path anywhere but at its start', () => {
    expect(check({
      docs: (docs) => {
        docs.module.body = [{
          type: 'paragraph',
          inlines: [{ type: 'link', target: { kind: 'external', url: `https://example.com${BASE}/x` }, inlines: [] }],
        }, ...(docs.module.body as unknown[])]
      },
    })).toEqual([])
  })

  it('skips the base-path check when the base path is empty', () => {
    const { dir, fontFile } = tree({ docs: (docs) => { docs.module.title = `${BASE}/leak` } })
    expect(checkBundleOut(dir, { basePath: '', fontFile })).toEqual([])
  })
})

describe('checkBundleOut names each broken property', () => {
  it('api/index.json lists major 1', () => {
    expectNamed(check({ after: (dir) => put(dir, 'api/index.json', JSON.stringify({ majors: [2] })) }), /api\/index\.json does not list major 1/)
  })

  it('index.json has schemaVersion 1', () => {
    expectNamed(check({ index: (index) => { index.schemaVersion = 2 } }), /schemaVersion is 2, not 1/)
  })

  it('contentVersion is 64 lowercase hex', () => {
    expectNamed(
      check({ after: (dir) => rewriteIndex(dir, (index) => { index.contentVersion = 'ABC' }) }),
      /contentVersion "ABC" is not 64 lowercase hex/,
    )
  })

  it('every files value is 64 lowercase hex', () => {
    expectNamed(
      check({ index: (index) => { (index.files as Record<string, string>)['api/v1/tokens.json'] = 'nope' } }),
      /files\["api\/v1\/tokens\.json"\] is not 64 lowercase hex/,
    )
  })

  it('every images value is 64 lowercase hex', () => {
    expectNamed(
      check({ index: (index) => { (index.images as Record<string, string>)[IMAGE] = 'nope' } }),
      /images\["course-images\/level\/picture\.png"\] is not 64 lowercase hex/,
    )
  })

  it('the draft is gone', () => {
    expectNamed(check({ after: (dir) => put(dir, 'api/v1/index.draft.json', '{}') }), /index\.draft\.json is present/)
  })

  it('index.json exists', () => {
    expectNamed(check({ after: (dir) => unlinkSync(join(dir, 'api/v1/index.json')) }), /api\/v1\/index\.json is missing/)
  })

  it('every bundle JSON parses', () => {
    expectNamed(check({ docs: (docs) => { docs.tokens = '{' } }), /api\/v1\/tokens\.json does not parse as JSON/)
  })

  it('every file under api/v1/ is listed', () => {
    expectNamed(check({ after: (dir) => put(dir, 'api/v1/stray.json', '{}') }), /files: api\/v1\/stray\.json is under api\/v1\/ but not listed/)
  })

  it('every listed file exists', () => {
    expectNamed(
      check({ after: (dir) => unlinkSync(join(dir, 'api/v1/tokens.json')) }),
      /files: api\/v1\/tokens\.json is listed but does not exist/,
    )
  })

  it('every file hash matches', () => {
    expectNamed(
      check({ after: (dir) => flipLastByte(dir, 'api/v1/modules/level/module/en.json') }),
      /files: api\/v1\/modules\/level\/module\/en\.json hashes to [0-9a-f]{64}, the index says/,
    )
  })

  it('every image a document names is listed', () => {
    expectNamed(
      check({ index: (index) => { index.images = {} } }),
      /images: course-images\/level\/picture\.png is named by a document but not listed/,
    )
  })

  it('every listed image is named by a document', () => {
    expectNamed(
      check({ index: (index) => { index.images = sortedRecord([...Object.entries(index.images as Record<string, string>), ['course-images/level/other.png', 'c'.repeat(64)]]) } }),
      /images: course-images\/level\/other\.png is listed but no document names it/,
    )
  })

  it('every image exists', () => {
    expectNamed(check({ after: (dir) => unlinkSync(join(dir, IMAGE)) }), /images: course-images\/level\/picture\.png does not exist/)
  })

  it('every image hash matches', () => {
    expectNamed(check({ after: (dir) => flipLastByte(dir, IMAGE) }), /images: course-images\/level\/picture\.png hashes to [0-9a-f]{64}, the index says/)
  })

  it('files keys ascend', () => {
    expectNamed(
      check({ index: (index) => { index.files = Object.fromEntries(Object.entries(index.files as Record<string, string>).reverse()) } }),
      /files: the keys are not in ascending order/,
    )
  })

  it('images keys ascend', () => {
    expectNamed(
      check({
        docs: (docs) => {
          (docs.level.blocks as unknown[]).push({ ...(docs.level.blocks as Record<string, unknown>[])[0], src: 'course-images/level/a.png' })
        },
        after: (dir) => {
          put(dir, 'course-images/level/a.png', 'a')
          rewriteIndex(dir, (index) => {
            const images = index.images as Record<string, string>
            index.images = { [IMAGE]: images[IMAGE], 'course-images/level/a.png': sha256Hex('a') }
            index.contentVersion = contentVersionOf(index)
          })
        },
      }),
      /images: the keys are not in ascending order/,
    )
  })

  it('contentVersion recomputes', () => {
    expectNamed(
      check({ after: (dir) => rewriteIndex(dir, (index) => { index.contentVersion = 'f'.repeat(64) }) }),
      /contentVersion is f{64}, but the index recomputes to [0-9a-f]{64}/,
    )
  })

  it('every SVG passes the profile', () => {
    expectNamed(
      check({ docs: (docs) => { docs.svg = SVG.replace('<path', '<path class="edge"') } }),
      /api\/v1\/diagrams\/a{32}\.svg: forbidden string "class="/,
    )
  })

  it('every SVG has a viewBox', () => {
    expectNamed(
      check({ docs: (docs) => { docs.svg = SVG.replace(' viewBox="0 0 10 10"', '') } }),
      /api\/v1\/diagrams\/a{32}\.svg: the root <svg> has no viewBox/,
    )
  })

  it('every diagram path a document names exists', () => {
    expectNamed(
      check({ after: (dir) => unlinkSync(join(dir, DARK)) }),
      /api\/v1\/modules\/level\/module\/en\.json names the diagram api\/v1\/diagrams\/b{32}\.svg, which is not in the export/,
    )
  })

  it('no JSON string starts with the base path', () => {
    expectNamed(
      check({ docs: (docs) => { docs.module.title = `${BASE}/leak` } }),
      /api\/v1\/modules\/level\/module\/en\.json: the string "\/base\/leak" starts with the base path/,
    )
  })

  it('no SVG contains the base path', () => {
    expectNamed(
      check({ docs: (docs) => { docs.svg = SVG.replace('</svg>', `<text>${BASE}/leak</text></svg>`) } }),
      /api\/v1\/diagrams\/a{32}\.svg contains the base path/,
    )
  })

  it('diagramFont.sha256 is the installed font', () => {
    const { dir } = tree()
    const other = join(dir, 'other.ttf')
    writeFileSync(other, 'other font')
    expectNamed(checkBundleOut(dir, { basePath: BASE, fontFile: other }), /diagramFont\.sha256 is [0-9a-f]{64}, but .*other\.ttf hashes to/)
  })
})
