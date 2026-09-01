/**
 * §14.7.2 / §14.12 — one case per row of the merge table, plus the two
 * properties §14.2.3 leans on: commutativity and idempotence. If those two do
 * not hold, `record_state` cannot be the source and the event log would have to
 * become one.
 */

import { describe, expect, it } from 'vitest'
import { mergeRecords } from '@/lib/record/merge'
import {
  EMPTY_RECORD,
  emptySheetRecord,
  type RecordData,
  type SheetRecord,
  type Submittal,
} from '@/lib/record/schema'

const A = 'fundamentals/llms'
const B = 'fundamentals/prompting'
const C = 'intermediate/agents'

/** Deep-frozen, so an in-place write throws instead of passing quietly. */
function frozen<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const inner of Object.values(value)) frozen(inner)
    Object.freeze(value)
  }
  return value
}

function record(patch: Partial<RecordData> = {}): RecordData {
  return frozen(structuredClone({ ...EMPTY_RECORD, ...patch }))
}

function sheet(patch: Partial<SheetRecord> = {}): SheetRecord {
  return { ...emptySheetRecord(), ...patch }
}

/** One sheet with `patch`, everything else empty. */
function one(slug: string, patch: Partial<SheetRecord>): RecordData {
  return record({ sheets: { [slug]: sheet(patch) } })
}

function submittal(patch: Partial<Submittal> = {}): Submittal {
  const owner = patch.owner ?? 'cevheri'
  const repo = patch.repo ?? 'demo'
  return {
    owner,
    repo,
    url: `https://github.com/${owner}/${repo}`,
    commit: null,
    note: '',
    at: '2026-08-01T00:00:00.000Z',
    ...patch,
  }
}

describe('signedOff — the earliest wins (§14.7.2)', () => {
  const early = '2026-08-01T10:00:00.000Z'
  const late = '2026-08-20T10:00:00.000Z'

  it('keeps the earlier of two signatures', () => {
    const merged = mergeRecords(one(A, { signedOff: late }), one(A, { signedOff: early }))
    expect(merged.sheets[A].signedOff).toBe(early)
  })

  it('keeps the earlier whichever side it arrives on', () => {
    const merged = mergeRecords(one(A, { signedOff: early }), one(A, { signedOff: late }))
    expect(merged.sheets[A].signedOff).toBe(early)
  })

  it('an old device syncing late cannot un-sign a signed sheet', () => {
    const stale = one(A, { signedOff: null, reachedEnd: true })
    const signed = one(A, { signedOff: early, signedRevision: 'abc1234' })
    expect(mergeRecords(stale, signed).sheets[A].signedOff).toBe(early)
    expect(mergeRecords(signed, stale).sheets[A].signedOff).toBe(early)
  })

  it('compares instants as instants, not as text', () => {
    // +03:00 sorts after 'Z' as text and before it in time.
    const offset = '2026-08-01T11:00:00.000+03:00'
    const utc = '2026-08-01T09:00:00.000Z'
    expect(
      mergeRecords(one(A, { signedOff: utc }), one(A, { signedOff: offset })).sheets[A].signedOff,
    ).toBe(offset)
  })
})

describe("signedRevision — the winning signature's (§14.7.2)", () => {
  it('travels with the instant that won, not with the newer record', () => {
    const merged = mergeRecords(
      one(A, { signedOff: '2026-08-20T10:00:00.000Z', signedRevision: 'newnew1' }),
      one(A, { signedOff: '2026-08-01T10:00:00.000Z', signedRevision: 'old1234' }),
    )
    expect(merged.sheets[A]).toMatchObject({
      signedOff: '2026-08-01T10:00:00.000Z',
      signedRevision: 'old1234',
    })
  })

  it('is null when no signature survived', () => {
    const merged = mergeRecords(one(A, { reachedEnd: true }), one(A, { dwellSeconds: 5 }))
    expect(merged.sheets[A].signedRevision).toBeNull()
  })

  it('prefers a recorded revision over null on an identical instant', () => {
    const at = '2026-08-01T10:00:00.000Z'
    const withRev = one(A, { signedOff: at, signedRevision: 'abc1234' })
    const without = one(A, { signedOff: at, signedRevision: null })
    expect(mergeRecords(withRev, without).sheets[A].signedRevision).toBe('abc1234')
    expect(mergeRecords(without, withRev).sheets[A].signedRevision).toBe('abc1234')
  })
})

describe('submittals — union, last MAX_SUBMITTALS by `at` (§14.7.2)', () => {
  it('unions disjoint hand-ins from two devices', () => {
    const local = one(A, {
      submittals: [submittal({ repo: 'one', at: '2026-08-01T00:00:00.000Z' })],
    })
    const remote = one(A, {
      submittals: [submittal({ repo: 'two', at: '2026-08-02T00:00:00.000Z' })],
    })
    expect(mergeRecords(local, remote).sheets[A].submittals.map((s) => s.repo)).toEqual([
      'one',
      'two',
    ])
  })

  it('keeps the same repository once, taking the later `at`', () => {
    const older = submittal({ repo: 'one', at: '2026-08-01T00:00:00.000Z', note: 'first' })
    const newer = submittal({ repo: 'ONE', at: '2026-08-09T00:00:00.000Z', note: 'second' })
    const merged = mergeRecords(one(A, { submittals: [older] }), one(A, { submittals: [newer] }))
    expect(merged.sheets[A].submittals).toHaveLength(1)
    expect(merged.sheets[A].submittals[0].note).toBe('second')
  })

  it('trims the OLDEST when the union exceeds the §12.9.1 cap of three', () => {
    const local = one(A, {
      submittals: [
        submittal({ repo: 'r1', at: '2026-08-01T00:00:00.000Z' }),
        submittal({ repo: 'r2', at: '2026-08-02T00:00:00.000Z' }),
      ],
    })
    const remote = one(A, {
      submittals: [
        submittal({ repo: 'r3', at: '2026-08-03T00:00:00.000Z' }),
        submittal({ repo: 'r4', at: '2026-08-04T00:00:00.000Z' }),
      ],
    })
    expect(mergeRecords(local, remote).sheets[A].submittals.map((s) => s.repo)).toEqual([
      'r2',
      'r3',
      'r4',
    ])
  })
})

describe('checklist — independent boxes (§14.7.2)', () => {
  it('unions ticks across devices', () => {
    const merged = mergeRecords(
      one(A, { checklist: { '0': true, '2': true } }),
      one(A, { checklist: { '1': true } }),
    )
    expect(merged.sheets[A].checklist).toEqual({ '0': true, '1': true, '2': true })
  })

  it('does not un-tick a box the other copy still holds', () => {
    // §14.7.2 asks for "last writer per index"; §12.7 stores no per-index
    // instant, so there is nobody to ask. The union is the implementable rule
    // and it errs the way `signedOff` does.
    const unticked = one(A, { checklist: {}, reachedEnd: true })
    const ticked = one(A, { checklist: { '0': true } })
    expect(mergeRecords(unticked, ticked).sheets[A].checklist).toEqual({ '0': true })
    expect(mergeRecords(ticked, unticked).sheets[A].checklist).toEqual({ '0': true })
  })

  it('refuses a prototype-shaped index key', () => {
    const poisoned = record({
      sheets: { [A]: sheet({ checklist: { __proto__: true, '0': true } as never }) },
    })
    const merged = mergeRecords(poisoned, one(A, { checklist: { '1': true } }))
    expect(Object.keys(merged.sheets[A].checklist).sort()).toEqual(['0', '1'])
  })
})

describe('days and sources — set union (§14.7.2)', () => {
  it('unions days and keeps them sorted', () => {
    const merged = mergeRecords(
      record({ days: ['2026-08-01', '2026-08-03'] }),
      record({ days: ['2026-08-02', '2026-08-03'] }),
    )
    expect(merged.days).toEqual(['2026-08-01', '2026-08-02', '2026-08-03'])
  })

  it('unions sources distinctly', () => {
    const merged = mergeRecords(
      one(A, { sources: ['https://a.example/x', 'https://b.example/y'] }),
      one(A, { sources: ['https://b.example/y', 'https://c.example/z'] }),
    )
    expect(merged.sheets[A].sources).toEqual([
      'https://a.example/x',
      'https://b.example/y',
      'https://c.example/z',
    ])
  })
})

describe('dwellSeconds — the larger, never the sum (§14.7.2)', () => {
  it('takes the maximum', () => {
    expect(
      mergeRecords(one(A, { dwellSeconds: 400 }), one(A, { dwellSeconds: 90 })).sheets[A]
        .dwellSeconds,
    ).toBe(400)
  })

  it('re-applies the §12.4.4 cap', () => {
    expect(
      mergeRecords(one(A, { dwellSeconds: 99999 }), one(A, { dwellSeconds: 10 })).sheets[A]
        .dwellSeconds,
    ).toBe(3600)
  })
})

describe('quiz — the further state wins (§14.7.2)', () => {
  const answered = { answer: 'a vector store', assessed: null, at: '2026-08-05T00:00:00.000Z' }
  const assessed = {
    answer: 'a vector store',
    assessed: 'matched' as const,
    at: '2026-08-02T00:00:00.000Z',
  }

  it('an answer beats nothing', () => {
    expect(
      mergeRecords(one(A, { quiz: null, reachedEnd: true }), one(A, { quiz: answered })).sheets[A]
        .quiz,
    ).toEqual(answered)
  })

  it('assessed beats a bare answer even when the answer is newer', () => {
    expect(
      mergeRecords(one(A, { quiz: answered }), one(A, { quiz: assessed })).sheets[A].quiz,
    ).toEqual(assessed)
    expect(
      mergeRecords(one(A, { quiz: assessed }), one(A, { quiz: answered })).sheets[A].quiz,
    ).toEqual(assessed)
  })

  it('at equal rank the later `at` wins', () => {
    const later = { ...answered, answer: 'an index', at: '2026-08-09T00:00:00.000Z' }
    expect(
      mergeRecords(one(A, { quiz: answered }), one(A, { quiz: later })).sheets[A].quiz,
    ).toEqual(later)
  })
})

describe('prefs — local wins (§14.7.2)', () => {
  it('keeps the device preference', () => {
    const local = record({ prefs: { charKeys: false } })
    const remote = record({ prefs: { charKeys: true }, days: ['2026-08-01'] })
    expect(mergeRecords(local, remote).prefs.charKeys).toBe(false)
    expect(mergeRecords(remote, local).prefs.charKeys).toBe(true)
  })
})

describe('identity — the account wins, empty carries the local up (§14.7.2)', () => {
  const local = record({
    identity: { name: 'Local Reader', markSeed: 'aaaaaaaa', mark: 'weld', role: 'qa' },
  })

  it('the account keeps its markSeed so the visible mark does not change', () => {
    const remote = record({
      identity: { name: 'Account Reader', markSeed: 'bbbbbbbb', mark: null, role: 'devops' },
    })
    expect(mergeRecords(local, remote).identity).toEqual({
      name: 'Account Reader',
      markSeed: 'bbbbbbbb',
      mark: 'weld',
      role: 'devops',
    })
  })

  it('carries the local values up when the account has none', () => {
    expect(mergeRecords(local, record()).identity).toEqual(local.identity)
  })

  it('never infers a role (§13.3): a null on both sides stays null', () => {
    const signed = one(A, { signedOff: '2026-08-01T00:00:00.000Z' })
    expect(mergeRecords(signed, record()).identity.role).toBeNull()
  })
})

describe('meta — the local browser keeps its own claims', () => {
  it('does not adopt the account export instant', () => {
    const local = record({ meta: { lastExport: null, persisted: false } })
    const remote = record({
      meta: { lastExport: '2026-08-01T00:00:00.000Z', persisted: true },
      days: ['2026-08-01'],
    })
    expect(mergeRecords(local, remote).meta).toEqual({ lastExport: null, persisted: false })
  })
})

describe('shape', () => {
  it('mutates neither argument', () => {
    const local = one(A, { signedOff: '2026-08-02T00:00:00.000Z' })
    const remote = one(A, { signedOff: '2026-08-01T00:00:00.000Z', reachedEnd: true })
    mergeRecords(local, remote)
    expect(local.sheets[A].signedOff).toBe('2026-08-02T00:00:00.000Z')
    expect(remote.sheets[A].reachedEnd).toBe(true)
  })

  it('returns the local object itself when nothing changed', () => {
    const local = one(A, { signedOff: '2026-08-02T00:00:00.000Z' })
    expect(mergeRecords(local, record())).toBe(local)
  })

  it('returns a new object when anything changed', () => {
    const local = one(A, { signedOff: '2026-08-02T00:00:00.000Z' })
    const merged = mergeRecords(local, one(B, { reachedEnd: true }))
    expect(merged).not.toBe(local)
    expect(Object.keys(merged.sheets).sort()).toEqual([A, B].sort())
  })

  it('drops a sheet that holds nothing, as validate.ts would', () => {
    const hollow = record({ sheets: { [A]: sheet() } })
    expect(mergeRecords(hollow, record()).sheets).toEqual({})
  })

  it('refuses a prototype-shaped sheet key', () => {
    const poisoned = record({ sheets: { __proto__: sheet({ reachedEnd: true }) } as never })
    expect(Object.keys(mergeRecords(poisoned, one(A, { reachedEnd: true })).sheets)).toEqual([A])
  })
})

/**
 * §14.12 — the two properties. Both are asserted over non-trivial records:
 * three sheets, quizzes at three stages, overlapping and disjoint submittals,
 * disjoint checklists and days.
 *
 * `prefs`, `meta` and `identity` are held EQUAL across the two records here.
 * Those four rows of §14.7.2 are asymmetric on purpose (`prefs`/`meta` are
 * device facts, `identity` belongs to the account), so commutativity is claimed
 * for the fields that carry the reader's WORK — which is all §14.2.3 needs.
 */
const IDENTITY: RecordData['identity'] = {
  name: 'Shared Reader',
  markSeed: 'deadbeef',
  mark: null,
  role: 'software-engineer',
}

const LEFT = record({
  identity: IDENTITY,
  days: ['2026-08-01', '2026-08-04', '2026-08-09'],
  sheets: {
    [A]: sheet({
      signedOff: '2026-08-04T08:00:00.000Z',
      signedRevision: 'aaa1111',
      reachedEnd: true,
      dwellSeconds: 900,
      quiz: { answer: 'retrieval', assessed: 'matched', at: '2026-08-04T07:00:00.000Z' },
      checklist: { '0': true, '3': true },
      sources: ['https://a.example/one'],
      submittals: [
        submittal({ repo: 'left-only', at: '2026-08-02T00:00:00.000Z' }),
        submittal({ repo: 'shared', at: '2026-08-03T00:00:00.000Z', note: 'from left' }),
      ],
    }),
    [B]: sheet({
      dwellSeconds: 120,
      quiz: { answer: 'a draft answer', assessed: null, at: '2026-08-09T00:00:00.000Z' },
      checklist: { '1': true },
    }),
  },
})

const RIGHT = record({
  identity: IDENTITY,
  days: ['2026-08-04', '2026-08-11'],
  sheets: {
    [B]: sheet({
      signedOff: '2026-08-11T09:30:00.000Z',
      signedRevision: 'bbb2222',
      reachedEnd: true,
      dwellSeconds: 3400,
      quiz: { answer: 'a draft answer', assessed: 'missed', at: '2026-08-11T09:00:00.000Z' },
      checklist: { '2': true },
      sources: ['https://b.example/two', 'https://c.example/three'],
      submittals: [
        submittal({ repo: 'shared', at: '2026-08-07T00:00:00.000Z', note: 'from right' }),
        submittal({ repo: 'right-only', at: '2026-08-08T00:00:00.000Z' }),
      ],
    }),
    [C]: sheet({
      signedOff: '2026-08-11T10:00:00.000Z',
      signedRevision: 'ccc3333',
      reachedEnd: true,
      dwellSeconds: 60,
      sources: ['https://d.example/four'],
    }),
  },
})

describe('the properties §14.2.3 relies on', () => {
  it('is commutative on non-trivial records', () => {
    expect(mergeRecords(LEFT, RIGHT)).toEqual(mergeRecords(RIGHT, LEFT))
  })

  it('is commutative on the sheets even when the asymmetric rows differ', () => {
    const skewed = record({
      ...RIGHT,
      identity: { name: null, markSeed: '99999999', mark: 'hex', role: null },
      prefs: { charKeys: false },
    })
    expect(mergeRecords(LEFT, skewed).sheets).toEqual(mergeRecords(skewed, LEFT).sheets)
    expect(mergeRecords(LEFT, skewed).days).toEqual(mergeRecords(skewed, LEFT).days)
  })

  it('is idempotent, and identity-equal at that', () => {
    expect(mergeRecords(LEFT, LEFT)).toBe(LEFT)
    expect(mergeRecords(RIGHT, RIGHT)).toBe(RIGHT)
    expect(mergeRecords(EMPTY_RECORD, EMPTY_RECORD)).toBe(EMPTY_RECORD)
  })

  it('is idempotent on an already-merged record', () => {
    const merged = mergeRecords(LEFT, RIGHT)
    expect(mergeRecords(merged, merged)).toBe(merged)
    expect(mergeRecords(merged, LEFT)).toEqual(merged)
    expect(mergeRecords(merged, RIGHT)).toEqual(merged)
  })

  it('is associative, so three devices land in one place', () => {
    const third = one(A, { signedOff: '2026-07-30T00:00:00.000Z', checklist: { '5': true } })
    expect(mergeRecords(mergeRecords(LEFT, RIGHT), third).sheets).toEqual(
      mergeRecords(LEFT, mergeRecords(RIGHT, third)).sheets,
    )
  })
})
