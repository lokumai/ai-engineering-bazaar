/**
 * §12.2 Channel A — the two stampers, cross-tested against each other.
 *
 * `boot.ts` emits an ES5 string that runs inline before first paint; `stamp.ts`
 * is a typed function the store calls after every write. They derive the same
 * class set from the same record and they are written in different languages
 * against different constraints, which is exactly the situation where two
 * implementations quietly stop agreeing.
 *
 * So the boot script is not tested by reading it. It is EXECUTED, against a fake
 * root and a fake storage, and its answer is compared to the function's. A
 * change to either that the other does not match fails here.
 *
 * The removal half is tested only on `stamp.ts`, because only it has one: a boot
 * script starts from a clean document and never has a stale class to take off.
 * Un-signing does, and it is the case that would otherwise leave a mark claiming
 * a sign-off the reader had withdrawn.
 */

import { describe, expect, it } from 'vitest'
import { recordBootScript } from '@/lib/record/boot'
import { signOff, unsign } from '@/lib/record/events'
import { RECORD_STORAGE_KEY, SCHEMA_VERSION, EMPTY_RECORD, type RecordData } from '@/lib/record/schema'
import { type StampFacts, stampClassesFor, stampRecordState } from '@/lib/record/stamp'

const AT = '2026-08-31T09:00:00.000Z'

const FACTS: StampFacts = {
  categoryTotals: {
    fundamentals: 7, intermediate: 8, expert: 9, ecosystem: 5, protocols: 1, optional: 2,
  },
  slugToModule: {
    'fundamentals/llms': 1, 'fundamentals/training': 2, 'fundamentals/rag': 3,
    'fundamentals/tools': 4, 'fundamentals/memory': 5, 'fundamentals/agents': 6,
    'fundamentals/multi-agent': 7,
    'intermediate/security': 13, 'intermediate/loop-engineering': 14,
    'protocols/protocols-reference': 30,
  },
}

/** The slice of `<html>` both stampers touch, and nothing more. */
function fakeRoot(initial: string[] = []) {
  const classes = new Set(initial)
  const attributes = new Map<string, string>()
  return {
    classList: {
      add: (token: string) => { classes.add(token) },
      remove: (token: string) => { classes.delete(token) },
      contains: (token: string) => classes.has(token),
    },
    setAttribute: (name: string, value: string) => { attributes.set(name, value) },
    getAttribute: (name: string) => attributes.get(name) ?? null,
    get className() { return [...classes].join(' ') },
    owned: () => [...classes].filter((c) => c.startsWith('hl-')).sort(),
    attributes,
  }
}

/**
 * Run the emitted boot script for real. It closes over `window.localStorage`
 * and `document.documentElement`, so both are supplied as fakes — which is also
 * a test that the script touches nothing else.
 */
function runBootScript(data: RecordData, facts: StampFacts = FACTS): ReturnType<typeof fakeRoot> {
  const root = fakeRoot()
  const stored = JSON.stringify({ schema: SCHEMA_VERSION, savedAt: AT, data })
  const source = recordBootScript(facts.categoryTotals, facts.slugToModule)
  const run = new Function('window', 'document', 'Object', 'JSON', source)
  run(
    { localStorage: { getItem: (key: string) => (key === RECORD_STORAGE_KEY ? stored : null) } },
    { documentElement: root },
    Object,
    JSON,
  )
  return root
}

function signed(...slugs: string[]): RecordData {
  let data: RecordData = EMPTY_RECORD
  for (const slug of slugs) data = signOff(data, slug, 'a1b2c3d', AT)
  return data
}

// ---------------------------------------------------------------------------

describe('the two stampers agree', () => {
  const CASES: ReadonlyArray<[string, RecordData]> = [
    ['nothing signed off', EMPTY_RECORD],
    ['one sheet', signed('intermediate/security')],
    ['two sheets in one subsystem', signed('intermediate/security', 'intermediate/loop-engineering')],
    ['two subsystems', signed('intermediate/security', 'fundamentals/llms')],
    ['a whole subsystem, which is the one place `-complete` can be reached today',
      signed('fundamentals/llms', 'fundamentals/training', 'fundamentals/rag',
        'fundamentals/tools', 'fundamentals/memory', 'fundamentals/agents',
        'fundamentals/multi-agent')],
    ['a single-sheet subsystem, where one sign-off completes it',
      signed('protocols/protocols-reference')],
    ['a slug the build has no module number for', signed('expert/advanced-ui')],
  ]

  for (const [name, data] of CASES) {
    it(`derives the same classes for: ${name}`, () => {
      expect(runBootScript(data).owned()).toEqual(stampClassesFor(data, FACTS))
    })
  }

  it('leaves `data-hl-record` to the boot script, which is the only one that can answer it', () => {
    // The attribute is about what was in STORAGE at load, not about what is in
    // the record now, and the difference is §12.13's class 1 against class 2: a
    // fresh browser has no attribute and reads NEVER STARTED, while a reader who
    // erased their record keeps the `1` the load stamped and correctly reads
    // CLEARED BY YOU. An erased record and a never-started one are identical
    // from the inside; only the load can tell them apart.
    expect(runBootScript(signed('intermediate/security')).getAttribute('data-hl-record'))
      .toBe('1')
    // A readable envelope with no sign-offs in it is still a record.
    expect(runBootScript(EMPTY_RECORD).getAttribute('data-hl-record')).toBe('1')

    const root = fakeRoot()
    stampRecordState(root, signed('intermediate/security'), FACTS)
    expect(root.getAttribute('data-hl-record')).toBeNull()
    expect(root.getAttribute('data-hl-storage')).toBeNull()
  })
})

describe('stampClassesFor — what a record implies', () => {
  it('is empty for a reader with nothing recorded', () => {
    expect(stampClassesFor(EMPTY_RECORD, FACTS)).toEqual([])
  })

  it('names the sheet by MODULE NUMBER and the subsystem by SLUG', () => {
    expect(stampClassesFor(signed('intermediate/security'), FACTS))
      .toEqual(['hl-cat-intermediate-started', 'hl-signed-13'])
  })

  it('says `started` while a subsystem is under way and `complete` when it is not', () => {
    const six = signed('fundamentals/llms', 'fundamentals/training', 'fundamentals/rag',
      'fundamentals/tools', 'fundamentals/memory', 'fundamentals/agents')
    expect(stampClassesFor(six, FACTS)).toContain('hl-cat-fundamentals-started')
    expect(stampClassesFor(six, FACTS)).not.toContain('hl-cat-fundamentals-complete')

    const seven = signOff(six, 'fundamentals/multi-agent', 'a1b2c3d', AT)
    expect(stampClassesFor(seven, FACTS)).toContain('hl-cat-fundamentals-complete')
    expect(stampClassesFor(seven, FACTS)).not.toContain('hl-cat-fundamentals-started')
  })

  it('will not say `complete` against a total it does not have (§11.25)', () => {
    // A category with no measured total: the honest answer is "under way", not
    // "finished", because finished is a claim about a denominator.
    const facts: StampFacts = { categoryTotals: {}, slugToModule: FACTS.slugToModule }
    expect(stampClassesFor(signed('intermediate/security'), facts))
      .toEqual(['hl-cat-intermediate-started', 'hl-signed-13'])
  })

  it('ignores a sheet that was recorded but never signed off', () => {
    const data = signOff(EMPTY_RECORD, 'intermediate/security', 'a1b2c3d', AT)
    expect(stampClassesFor(unsign(data, 'intermediate/security'), FACTS)).toEqual([])
  })
})

describe('stampRecordState — the half a boot script never needs', () => {
  it('removes a class that has stopped being true', () => {
    const data = signed('intermediate/security', 'fundamentals/llms')
    const root = fakeRoot()
    stampRecordState(root, data, FACTS)
    expect(root.owned())
      .toEqual(['hl-cat-fundamentals-started', 'hl-cat-intermediate-started',
        'hl-signed-1', 'hl-signed-13'])

    // Un-signing has to take the mark off, or the cube keeps claiming a
    // sign-off the reader has withdrawn.
    stampRecordState(root, unsign(data, 'fundamentals/llms'), FACTS)
    expect(root.owned()).toEqual(['hl-cat-intermediate-started', 'hl-signed-13'])
  })

  it('goes back to nothing when the record is erased', () => {
    const root = fakeRoot()
    stampRecordState(root, signed('intermediate/security'), FACTS)
    stampRecordState(root, EMPTY_RECORD, FACTS)
    expect(root.owned()).toEqual([])
    // `data-hl-record` keeps whatever the load stamped, which is how §12.13
    // tells CLEARED BY YOU apart from NEVER STARTED. See the test above.
    expect(root.getAttribute('data-hl-record')).toBeNull()
  })

  it('leaves classes it does not own alone', () => {
    // The font variables and the `dark` class live on the same element.
    const root = fakeRoot(['dark', 'ibm_plex_mono_variable', 'hl-signed-99'])
    stampRecordState(root, signed('intermediate/security'), FACTS)
    expect(root.classList.contains('dark')).toBe(true)
    expect(root.classList.contains('ibm_plex_mono_variable')).toBe(true)
    // `hl-signed-99` is ours and is no longer true, so it goes.
    expect(root.classList.contains('hl-signed-99')).toBe(false)
  })

  it('is idempotent', () => {
    const data = signed('intermediate/security', 'fundamentals/llms')
    const root = fakeRoot()
    stampRecordState(root, data, FACTS)
    const once = root.owned()
    stampRecordState(root, data, FACTS)
    expect(root.owned()).toEqual(once)
  })
})
