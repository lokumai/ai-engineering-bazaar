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
import { setRole, signOff, unsign } from '@/lib/record/events'
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
    ['a role and nothing else, which is a reader who has chosen a path before signing anything',
      setRole(EMPTY_RECORD, 'qa', AT)],
    ['a role alongside sign-offs', setRole(signed('intermediate/security'), 'devops', AT)],
    ['a role the build does not know, which neither stamper may turn into a class',
      { ...EMPTY_RECORD, identity: { ...EMPTY_RECORD.identity, role: 'business-analyst' as never } }],
  ]

  for (const [name, data] of CASES) {
    it(`derives the same classes for: ${name}`, () => {
      expect(runBootScript(data).owned()).toEqual(stampClassesFor(data, FACTS))
    })
  }

  it('answers `data-hl-record` the same way after mount as at load', () => {
    // The REMOVAL of the attribute belongs to the load, and §12.13 is why: a
    // fresh browser has no attribute and reads NEVER STARTED, while a reader who
    // erased their record keeps the `1` and correctly reads CLEARED BY YOU. An
    // erased record and a never-started one are identical from the inside; only
    // the load can tell them apart. Setting it is a different question, and
    // §15.2.1's cases below hold that half — a client transition after a first
    // write used to leave the home screen saying "you are new here".
    expect(runBootScript(signed('intermediate/security')).getAttribute('data-hl-record'))
      .toBe('1')
    // §15.11 — but a readable envelope is not automatically a reader. An
    // envelope that `carriesNothing()` gets NO stamp, because the home screen
    // now swaps a whole document on this attribute: the old rule handed
    // "Where you left off", a resume block and a continue control to anyone
    // whose storage held a record with only `prefs` in it, which the store
    // writes on a first theme click. The attribute still answers "was there
    // something in storage at load", and §12.13's class 1 / class 2 split
    // survives intact — a reader whose record carried something is stamped at
    // load and keeps the `1` through an erase, so CLEARED BY YOU is still
    // distinguishable from NEVER STARTED.
    expect(runBootScript(EMPTY_RECORD).getAttribute('data-hl-record')).toBeNull()
    // And the line the gate must not cross: an identity the reader typed is
    // something, even with nothing signed off. A sign-off is not the only
    // evidence of a reader.
    expect(runBootScript(setRole(EMPTY_RECORD, 'qa', AT)).getAttribute('data-hl-record'))
      .toBe('1')

    const root = fakeRoot()
    stampRecordState(root, signed('intermediate/security'), FACTS)
    expect(root.getAttribute('data-hl-record')).toBe('1')
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

describe('the role (§13.3)', () => {
  it('stamps the chosen role, so `/path/` draws in frame one with no hydration', () => {
    expect(stampClassesFor(setRole(EMPTY_RECORD, 'qa', AT), FACTS)).toEqual(['hl-role-qa'])
  })

  it('takes the previous role off when the reader changes it', () => {
    // Changing role is not destructive (§13.3), so it happens freely — and if
    // the old class stayed, `/path/` would draw two paths at once.
    const root = fakeRoot()
    stampRecordState(root, setRole(EMPTY_RECORD, 'qa', AT), FACTS)
    expect(root.owned()).toEqual(['hl-role-qa'])
    stampRecordState(root, setRole(EMPTY_RECORD, 'devops', AT), FACTS)
    expect(root.owned()).toEqual(['hl-role-devops'])
    stampRecordState(root, setRole(EMPTY_RECORD, null, AT), FACTS)
    expect(root.owned()).toEqual([])
  })

  it('stamps nothing for an id outside the frozen nine', () => {
    // The typed path cannot produce this; a hand-edited record can, and a class
    // no stylesheet answers to would leave the empty state half-drawn.
    const data: RecordData = {
      ...EMPTY_RECORD,
      identity: { ...EMPTY_RECORD.identity, role: 'business-analyst' as never },
    }
    expect(stampClassesFor(data, FACTS)).toEqual([])
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
    // `data-hl-record` is never taken off, which is how §12.13 tells CLEARED BY
    // YOU apart from NEVER STARTED. Set one-way, so the `1` this browser earned
    // by holding a record survives the erase. See the test above.
    expect(root.getAttribute('data-hl-record')).toBe('1')
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

/**
 * §15.2.1 — the attribute the home screen reads, and the half of it that lives
 * here.
 *
 * MEASURED in Chrome before this: a clean browser opened `/`, saved an alias on
 * `/sign-in/alias/`, pressed Home, and was shown the FIRST-VISIT document —
 * `data-hl-record` absent, `.hl-home-new` visible — correct only after a full
 * reload. `stampRecordState` explicitly did not touch the attribute, and the
 * reason recorded for that only justified never REMOVING it: §12.13 needs an
 * erased record to keep the `1` the load stamped, so that CLEARED BY YOU can be
 * told from NEVER STARTED. Every navigation on this site is a client
 * transition, so "whatever was true at load" is the whole session.
 *
 * The three cases below are the rule: it goes on for a record that carries
 * something, it does not go on for one that carries nothing, and it never comes
 * off. The third is the one that protects §12.13.
 */
describe('data-hl-record after mount (§15.2.1, §12.13)', () => {
  it('goes on as soon as the live record carries something', () => {
    const root = fakeRoot()
    expect(root.getAttribute('data-hl-record')).toBeNull()

    stampRecordState(root, setRole(EMPTY_RECORD, 'qa', AT), FACTS)
    expect(root.getAttribute('data-hl-record')).toBe('1')
  })

  it('does not go on for a record that carries nothing', () => {
    const root = fakeRoot()
    stampRecordState(root, EMPTY_RECORD, FACTS)
    expect(root.getAttribute('data-hl-record')).toBeNull()

    // A preference is not something the reader recorded (§15.11), and it is what
    // the store writes on a first theme click.
    stampRecordState(root, { ...EMPTY_RECORD, prefs: { charKeys: false } }, FACTS)
    expect(root.getAttribute('data-hl-record')).toBeNull()
  })

  it('never comes off, so an erase still reads as CLEARED BY YOU (§12.13)', () => {
    const root = fakeRoot()
    const signed = signOff(EMPTY_RECORD, 'fundamentals/llms', 'b7225f8', AT)

    stampRecordState(root, signed, FACTS)
    expect(root.getAttribute('data-hl-record')).toBe('1')

    // The erase: the record goes back to empty and the classes come off, but
    // the attribute stays. Recomputing it both ways would make this browser
    // indistinguishable from one that had never held a record.
    stampRecordState(root, EMPTY_RECORD, FACTS)
    expect(root.owned()).toEqual([])
    expect(root.getAttribute('data-hl-record')).toBe('1')
  })

  it('agrees with the boot script on the same record, so a reload changes nothing', () => {
    const signed = signOff(EMPTY_RECORD, 'fundamentals/llms', 'b7225f8', AT)
    const mounted = fakeRoot()
    stampRecordState(mounted, signed, FACTS)

    expect(mounted.getAttribute('data-hl-record'))
      .toBe(runBootScript(signed).getAttribute('data-hl-record'))
  })
})
