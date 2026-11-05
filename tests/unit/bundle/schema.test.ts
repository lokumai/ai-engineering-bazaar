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
  Tokens,
} from '@/lib/bundle/schema'

/**
 * The bundle's contract, as zod's own JSON Schema export, stored beside this
 * file. A field added, renamed or retyped shows here as a diff to accept with
 * `npx vitest -u` or to undo, which is the point: a contract change is a
 * decision (spec 2.8), never a side effect.
 */

const SCHEMAS = {
  ApiIndex, Index, IndexDraft, Tokens, LevelDoc, ModuleDoc, Ref, Block, Inline, LinkTarget, Cell, DiagramSource,
}

const ref = { key: 'alpha/first', number: 1, title: 'First', drawn: true, lang: 'en' }

const moduleDoc = {
  schemaVersion: 1,
  key: 'alpha/first',
  lang: 'en',
  dir: 'ltr',
  title: 'First',
  objectives: { lang: 'en', items: ['One'] },
  prerequisites: [ref],
  previous: null,
  next: ref,
  toc: [{ id: 'one', text: 'One', depth: 2, mark: 'I' }],
  body: [{ type: 'paragraph', inlines: [{ type: 'text', text: 'Hello' }] }],
  draft: null,
  quiz: null,
}

describe('the bundle schema', () => {
  it('exports the JSON Schema it exported last time', async () => {
    const exported = Object.fromEntries(
      Object.entries(SCHEMAS).map(([name, schema]) => [name, z.toJSONSchema(schema, { io: 'output' })]),
    )
    await expect(JSON.stringify(exported, null, 2) + '\n').toMatchFileSnapshot('./__snapshots__/bundle-schema.json')
  })

  it('accepts a well-formed module document', () => {
    expect(() => ModuleDoc.parse(moduleDoc)).not.toThrow()
  })

  it('refuses a module document with an extra key', () => {
    expect(ModuleDoc.safeParse({ ...moduleDoc, extra: true }).success).toBe(false)
  })

  it('refuses a language that is neither English nor a translation', () => {
    expect(Ref.safeParse({ ...ref, lang: 'xx' }).success).toBe(false)
    expect(ModuleDoc.safeParse({ ...moduleDoc, lang: 'xx' }).success).toBe(false)
  })

  it('refuses a path with a leading slash', () => {
    const block = { type: 'diagram', number: '1.1', title: null, svg: { light: '/api/v1/diagrams/a.svg', dark: 'api/v1/diagrams/a.svg' } }
    expect(Block.safeParse(block).success).toBe(false)
  })

  it('refuses a block type it does not know', () => {
    expect(Block.safeParse({ type: 'video' }).success).toBe(false)
  })
})
