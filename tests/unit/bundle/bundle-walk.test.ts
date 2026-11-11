import { describe, expect, it } from 'vitest'
import { diagramPaths, imagePaths, nodesOf } from '../../../scripts/lib/bundle-walk.mjs'

/**
 * The one walk over a bundle document, shared by the finaliser (which names
 * the documents a failed diagram belongs to and hashes every image) and the
 * checker (which compares both against the index). Every document here is
 * synthetic.
 */

const text = (value: string) => ({ type: 'text', text: value })

const image = {
  type: 'image',
  number: '1',
  title: null,
  note: null,
  src: 'course-images/level/nested.png',
  alt: 'nested',
  width: 10,
  height: 10,
}

const diagram = {
  type: 'diagram',
  number: '2',
  title: 'Flow',
  svg: { light: 'api/v1/diagrams/light.svg', dark: 'api/v1/diagrams/dark.svg' },
}

function moduleDoc(body: unknown[] | null) {
  return {
    schemaVersion: 1,
    key: 'level/module',
    lang: 'en',
    dir: 'ltr',
    title: 'Module',
    words: body === null ? null : 120,
    objectives: { lang: 'en', items: [] },
    translatedObjectives: null,
    prerequisites: [],
    previous: null,
    next: null,
    toc: [],
    body,
    draft: null,
    quiz: null,
  }
}

const nested = moduleDoc([
  { type: 'paragraph', inlines: [text('before')] },
  {
    type: 'quote',
    blocks: [
      {
        type: 'list',
        ordered: false,
        items: [{ blocks: [image] }],
      },
    ],
  },
  diagram,
])

describe('imagePaths', () => {
  it('finds an image inside a list item inside a quote', () => {
    expect(imagePaths(nested)).toEqual(['course-images/level/nested.png'])
  })

  it('reads a level document through its blocks', () => {
    const level = { schemaVersion: 1, slug: 'level', title: 'Level', blocks: [image] }
    expect(imagePaths(level)).toEqual(['course-images/level/nested.png'])
  })

  it('reads nothing from a draft, whose body is null', () => {
    expect(imagePaths(moduleDoc(null))).toEqual([])
  })
})

describe('diagramPaths', () => {
  it('returns both variants of a top-level diagram', () => {
    expect(diagramPaths(nested)).toEqual(['api/v1/diagrams/light.svg', 'api/v1/diagrams/dark.svg'])
  })
})

describe('nodesOf', () => {
  it('reaches inlines inside links, strong text and table cells', () => {
    const doc = moduleDoc([
      {
        type: 'table',
        number: '1',
        title: null,
        rowHeaders: false,
        align: [null],
        head: [{ inlines: [{ type: 'strong', inlines: [text('head')] }] }],
        rows: [[{ inlines: [{ type: 'link', target: { kind: 'catalog' }, inlines: [text('cell')] }] }]],
      },
    ])
    const texts = nodesOf(doc)
      .filter((node) => node.type === 'text')
      .map((node) => node.text)
    expect(texts).toEqual(['head', 'cell'])
  })

  it('throws naming a node type it does not know', () => {
    const doc = moduleDoc([{ type: 'quote', blocks: [{ type: 'nope' }] }])
    expect(() => nodesOf(doc)).toThrow(/"nope"/)
  })

  it('throws on a document that is neither a level nor a module', () => {
    expect(() => nodesOf({ schemaVersion: 1 })).toThrow(/neither/)
  })
})
