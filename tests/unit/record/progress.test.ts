/**
 * §14.9 — the projection, and the one assertion that keeps it a projection.
 *
 * Most of this file is not about `buildProgress`'s output being plausible; it
 * is about the output being IDENTICAL to what `derive.ts` returns for the same
 * input. That is the whole reason §14.9 stores this column: two answers to "how
 * far along am I?" is the failure being prevented, so the test that would catch
 * a regression is the one that compares the two answers directly, on records
 * that have drifted apart in every field a record can (§12.14.2).
 */

import { describe, expect, it } from 'vitest'
import { categoryProgress, signedCount, uptime, type CurriculumFacts } from '@/lib/record/derive'
import {
  addSubmittal,
  assessQuiz,
  observeDwell,
  recordSourceOpened,
  setChecklistItem,
  setIdentity,
  setQuizAnswer,
  signOff,
} from '@/lib/record/events'
import { buildProgress, type AttentionSelector } from '@/lib/record/progress'
import { EMPTY_RECORD, type RecordData } from '@/lib/record/schema'
import type { AssignedSheet, AttentionFlag } from '@/lib/record/wire'

const NOW = '2026-09-01T09:15:00.000Z'

/**
 * The corpus's own shape as `derive.test.ts` measures it — 32 sheets in six
 * categories, 15 drawn, one 8-item checklist on module 13. Restated rather than
 * imported because a test fixture is not an export, and because the numbers
 * below (`of: 32`) are the ones §14.9's example uses.
 */
const BANDS: ReadonlyArray<[string, number, number]> = [
  ['fundamentals', 1, 7],
  ['intermediate', 8, 15],
  ['expert', 16, 24],
  ['ecosystem', 25, 29],
  ['protocols', 30, 30],
  ['optional', 31, 32],
]

function slugOf(module: number): string {
  const band = BANDS.find(([, from, to]) => module >= from && module <= to)
  return `${band?.[0] ?? 'unknown'}/sheet-${module}`
}

function facts(): CurriculumFacts {
  const sheets = []
  for (const [category, from, to] of BANDS) {
    for (let module = from; module <= to; module += 1) {
      const drawn = module <= 15
      sheets.push({
        slug: slugOf(module),
        module,
        category,
        drawn,
        hasQuickCheck: drawn,
        checklistItems: module === 13 ? 8 : 0,
        sources: drawn ? 25 : 0,
      })
    }
  }
  return {
    sheets,
    categories: BANDS.map(([slug, from, to]) => ({ slug, total: to - from + 1 })),
    traces: 15,
  }
}

/** A stub that records what it was handed; §14.8.1's rule is tested in its own file. */
function stubAttention(flags: readonly AttentionFlag[] = []): AttentionSelector & {
  calls: Array<{ data: RecordData; assigned: readonly AssignedSheet[]; now: string }>
} {
  const calls: Array<{ data: RecordData; assigned: readonly AssignedSheet[]; now: string }> = []
  const selector = (data: RecordData, assigned: readonly AssignedSheet[], now: string) => {
    calls.push({ data, assigned, now })
    return flags
  }
  return Object.assign(selector, { calls })
}

/** Signs off the given modules, one day apart, oldest first. */
function signed(...modules: number[]): RecordData {
  let data: RecordData = EMPTY_RECORD
  modules.forEach((module, index) => {
    data = signOff(
      data,
      slugOf(module),
      'a1b2c3d',
      `2026-08-${String(20 + index).padStart(2, '0')}T09:00:00.000Z`,
    )
  })
  return data
}

/** A record that has been written in every way a record can be written. */
function fullish(): RecordData {
  let data = signed(...Array.from({ length: 15 }, (_, index) => index + 1))
  data = setIdentity(data, { name: 'Ada' }, NOW)
  for (let index = 0; index < 8; index += 1) {
    data = setChecklistItem(data, slugOf(13), index, true, NOW)
  }
  data = setQuizAnswer(data, slugOf(4), 'an answer', NOW)
  data = assessQuiz(data, slugOf(4), 'matched', NOW)
  data = recordSourceOpened(data, slugOf(4), 'https://example.org/a', NOW)
  data = observeDwell(data, slugOf(9), 120, NOW)
  data = addSubmittal(
    data,
    slugOf(2),
    { owner: 'o', repo: 'r', url: 'https://github.com/o/r', commit: null, note: '', at: NOW },
    NOW,
  )
  return data
}

describe('§14.9 buildProgress', () => {
  it('reports an empty record as zero, and as a real zero rather than null', () => {
    const progress = buildProgress({
      data: EMPTY_RECORD,
      facts: facts(),
      now: NOW,
      attention: stubAttention(),
    })
    expect(progress.signedOff).toBe(0)
    expect(progress.attainable).toBe(32)
    expect(progress.ratio).toBe(0)
    expect(progress.lastActivity).toBeNull()
    expect(progress.days).toBe(0)
    expect(progress.attention).toEqual([])
    // Every category is present at zero: §8.2's rule, inherited from the selector.
    expect(Object.keys(progress.byCategory)).toHaveLength(6)
    expect(progress.byCategory.fundamentals).toEqual({ signedOff: 0, attainable: 7 })
  })

  it('never yields NaN for a curriculum with no sheets', () => {
    const progress = buildProgress({
      data: EMPTY_RECORD,
      facts: { sheets: [], categories: [], traces: 0 },
      now: NOW,
      attention: stubAttention(),
    })
    expect(progress).toMatchObject({ signedOff: 0, attainable: 0, ratio: 0 })
    expect(Number.isNaN(progress.ratio)).toBe(false)
  })

  it('reports a partial record, with the ratio consistent with the counts', () => {
    const progress = buildProgress({
      data: signed(1, 2, 3, 8),
      facts: facts(),
      now: NOW,
      attention: stubAttention(),
    })
    expect(progress.signedOff).toBe(4)
    expect(progress.attainable).toBe(32)
    expect(progress.ratio).toBeCloseTo(4 / 32, 12)
    // The §14.9 invariant a dashboard depends on.
    expect(progress.ratio * progress.attainable).toBeCloseTo(progress.signedOff, 12)
    expect(progress.byCategory.fundamentals).toEqual({ signedOff: 3, attainable: 7 })
    expect(progress.byCategory.intermediate).toEqual({ signedOff: 1, attainable: 8 })
    expect(progress.byCategory.expert).toEqual({ signedOff: 0, attainable: 9 })
  })

  it('reports a fully written record, and keeps the undrawn sheets in the denominator', () => {
    const data = fullish()
    const progress = buildProgress({
      data,
      facts: facts(),
      now: NOW,
      attention: stubAttention(),
    })
    expect(progress.signedOff).toBe(15)
    // 32, not 15: §12.5.3 pins the denominator to the whole set (§11.25).
    expect(progress.attainable).toBe(32)
    expect(progress.ratio).toBeCloseTo(15 / 32, 12)
    expect(progress.lastActivity).toBe('2026-09-01')
    expect(progress.days).toBeGreaterThan(0)
  })

  it('passes the record, the assigned sheets and the instant straight to attention.ts', () => {
    const assigned: AssignedSheet[] = [{ sheetSlug: slugOf(20), dueAt: '2026-08-01T00:00:00.000Z' }]
    const flags: AttentionFlag[] = [
      { sheetSlug: slugOf(20), why: 'overdue', idleDays: null, attempts: 0, dueAt: assigned[0].dueAt },
    ]
    const attention = stubAttention(flags)
    const data = signed(1)
    const progress = buildProgress({ data, facts: facts(), now: NOW, assigned, attention })

    expect(progress.attention).toEqual(flags)
    expect(attention.calls).toHaveLength(1)
    expect(attention.calls[0].data).toBe(data)
    expect(attention.calls[0].assigned).toBe(assigned)
    expect(attention.calls[0].now).toBe(NOW)
  })

  it('defaults to no assignments for a reader with no org', () => {
    const attention = stubAttention()
    buildProgress({ data: EMPTY_RECORD, facts: facts(), now: NOW, attention })
    expect(attention.calls[0].assigned).toEqual([])
  })

  it('reports no activity, rather than a guess, when the instant is unreadable', () => {
    const progress = buildProgress({
      data: fullish(),
      facts: facts(),
      now: 'not an instant',
      attention: stubAttention(),
    })
    expect(progress.lastActivity).toBeNull()
    expect(progress.days).toBe(0)
    // The counts do not depend on the clock and are unaffected.
    expect(progress.signedOff).toBe(15)
  })

  /**
   * §14.9's actual subject. If any of these ever diverge, a manager's panel and
   * the reader's own page have started giving different answers to the same
   * question, which is the failure this column was added to prevent.
   */
  describe('agrees with derive.ts, field by field', () => {
    const cases: ReadonlyArray<[string, RecordData]> = [
      ['empty', EMPTY_RECORD],
      ['partial', signed(1, 2, 3, 8)],
      ['drawn set complete', fullish()],
      ['a sign-off on a sheet nobody has drawn', signed(1, 30)],
    ]

    for (const [name, data] of cases) {
      it(name, () => {
        const curriculum = facts()
        const progress = buildProgress({
          data,
          facts: curriculum,
          now: NOW,
          attention: stubAttention(),
        })
        const counts = signedCount(data, curriculum)
        const reading = uptime(data, NOW.slice(0, 10))

        expect(progress.signedOff).toBe(counts.signed)
        expect(progress.attainable).toBe(counts.of)
        expect(progress.ratio).toBe(counts.of === 0 ? 0 : counts.signed / counts.of)
        expect(progress.lastActivity).toBe(reading.lastActive)
        expect(progress.days).toBe(reading.days.filter((entry) => entry.active).length)

        const categories = categoryProgress(data, curriculum)
        expect(Object.keys(progress.byCategory).sort()).toEqual(Object.keys(categories).sort())
        for (const [slug, entry] of Object.entries(categories)) {
          expect(progress.byCategory[slug]).toEqual({
            signedOff: entry.approved,
            attainable: entry.total,
          })
        }
      })
    }
  })
})
