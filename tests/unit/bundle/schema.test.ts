import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  ApiIndex,
  Block,
  Cell,
  DiagramSource,
  Index,
  IndexDraft,
  Inline,
  LevelDoc,
  LinkTarget,
  ModuleDoc,
  Ref,
  StoryDoc,
  Tokens,
} from '@/lib/bundle/schema'

/**
 * The bundle's contract, as zod's own JSON Schema export, stored beside this
 * file. A field added, renamed or retyped shows here as a diff to accept with
 * `npx vitest -u` or to undo, which is the point: a contract change is a
 * decision (spec 2.8), never a side effect.
 */

const SCHEMAS = {
  ApiIndex, Index, IndexDraft, Tokens, StoryDoc, LevelDoc, ModuleDoc, Ref, Block, Inline, LinkTarget, Cell, DiagramSource,
}

const ref = { key: 'alpha/first', number: 1, title: 'First', drawn: true, track: 'engineers', lang: 'en' }

const moduleDoc = {
  schemaVersion: 1,
  key: 'alpha/first',
  track: 'engineers',
  lang: 'en',
  dir: 'ltr',
  title: 'First',
  objectives: { lang: 'en', items: ['One'] },
  translatedObjectives: null,
  prerequisites: [ref],
  previous: null,
  next: ref,
  toc: [{ id: 'one', text: 'One', depth: 2, mark: 'I' }],
  body: [{ type: 'paragraph', inlines: [{ type: 'text', text: 'Hello' }] }],
  draft: null,
  quiz: null,
}

const storyDoc = {
  schemaVersion: 1,
  lang: 'en',
  dir: 'ltr',
  title: 'Our Story',
  stalls: [{ heading: 'One', paragraphs: ['Hello.'] }],
  motto: { lead: 'Our motto', lines: ['\u201cFirst.', 'Second.\u201d'] },
}

describe('the bundle schema', () => {
  it('exports the JSON Schema it exported last time', async () => {
    const exported = Object.fromEntries(
      Object.entries(SCHEMAS).map(([name, schema]) => [name, z.toJSONSchema(schema, { io: 'output' })]),
    )
    await expect(JSON.stringify(exported, null, 2) + '\n').toMatchFileSnapshot('./__snapshots__/bundle-schema.json')
  })

  it('accepts a well-formed story document, with or without a title and a motto (D125)', () => {
    expect(() => StoryDoc.parse(storyDoc)).not.toThrow()
    expect(() => StoryDoc.parse({ ...storyDoc, title: null, motto: null })).not.toThrow()
  })

  it('refuses a story with no stall, an empty heading, or a key it does not name', () => {
    expect(() => StoryDoc.parse({ ...storyDoc, stalls: [] })).toThrow()
    expect(() => StoryDoc.parse({ ...storyDoc, stalls: [{ heading: '', paragraphs: [] }] })).toThrow()
    expect(() => StoryDoc.parse({ ...storyDoc, extra: true })).toThrow()
  })

  it('accepts a well-formed module document', () => {
    expect(() => ModuleDoc.parse(moduleDoc)).not.toThrow()
  })

  it('accepts a translated document with its own objectives beside the English (D124)', () => {
    const translated = { ...moduleDoc, lang: 'tr', translatedObjectives: { lang: 'tr', items: ['Bir'] } }
    expect(() => ModuleDoc.parse(translated)).not.toThrow()
  })

  it('refuses translated objectives in English, or with no item', () => {
    expect(() => ModuleDoc.parse({ ...moduleDoc, translatedObjectives: { lang: 'en', items: ['One'] } })).toThrow()
    expect(() => ModuleDoc.parse({ ...moduleDoc, translatedObjectives: { lang: 'tr', items: [] } })).toThrow()
  })

  it('refuses a module document without translatedObjectives, which is null rather than absent', () => {
    const { translatedObjectives: _, ...without } = moduleDoc
    expect(() => ModuleDoc.parse(without)).toThrow()
  })

  it('refuses a module document with an extra key', () => {
    expect(ModuleDoc.safeParse({ ...moduleDoc, extra: true }).success).toBe(false)
  })

  it('refuses a language that is neither English nor a translation', () => {
    expect(Ref.safeParse({ ...ref, lang: 'xx' }).success).toBe(false)
    expect(ModuleDoc.safeParse({ ...moduleDoc, lang: 'xx' }).success).toBe(false)
  })

  it('refuses a track tracks.ts does not name', () => {
    expect(Ref.safeParse({ ...ref, track: 'managers' }).success).toBe(false)
    expect(ModuleDoc.safeParse({ ...moduleDoc, track: 'managers' }).success).toBe(false)
    expect(ModuleDoc.safeParse({ ...moduleDoc, track: 'everyone' }).success).toBe(true)
  })

  it('accepts a call-out with a title and a button, and refuses a kind GitHub does not have', () => {
    const callout = {
      type: 'callout',
      kind: 'important',
      title: [{ type: 'strong', inlines: [{ type: 'text', text: 'Title' }] }],
      blocks: [{ type: 'paragraph', inlines: [{ type: 'text', text: 'Body' }] }],
      action: { target: { kind: 'external', url: 'https://example.com/' }, inlines: [{ type: 'text', text: 'Go' }] },
    }
    expect(Block.safeParse(callout).success).toBe(true)
    expect(Block.safeParse({ ...callout, title: null, action: null }).success).toBe(true)
    expect(Block.safeParse({ ...callout, kind: 'shout' }).success).toBe(false)
  })

  it('accepts a logo inline with a site-relative path', () => {
    const logo = { type: 'logo', src: 'course-images/alpha/logos/x.svg', alt: 'X', mono: false }
    expect(Inline.safeParse(logo).success).toBe(true)
    expect(Inline.safeParse({ ...logo, src: '/course-images/alpha/logos/x.svg' }).success).toBe(false)
  })

  it('refuses a path with a leading slash', () => {
    const block = { type: 'diagram', number: '1.1', title: null, svg: { light: '/api/v1/diagrams/a.svg', dark: 'api/v1/diagrams/a.svg' } }
    expect(Block.safeParse(block).success).toBe(false)
  })

  it('refuses a block type it does not know', () => {
    expect(Block.safeParse({ type: 'video' }).success).toBe(false)
  })
})
