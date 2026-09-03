import { describe, expect, it } from 'vitest'
import {
  QUIZ_ATTEMPTS,
  STALL_DAYS,
  selectAttention,
  type SheetLogs,
} from '@/lib/record/attention'
import {
  EMPTY_RECORD,
  emptySheetRecord,
  type RecordData,
  type SheetRecord,
  type Submittal,
} from '@/lib/record/schema'
import type { AssignedSheet } from '@/lib/record/wire'

/**
 * §14.8.1's rules are all boundaries, so every instant in this file is written
 * out and `now` is always passed. Nothing here reads a clock — that is the
 * property being protected, not an incidental style choice (§12.14.2).
 */
const NOW = '2026-09-01T09:00:00.000Z'

/** Days before NOW, as an instant. Same wall time, so only the day differs. */
function daysAgo(days: number): string {
  return new Date(Date.parse(NOW) - days * 86_400_000).toISOString()
}

function record(sheets: Record<string, SheetRecord>): RecordData {
  return { ...EMPTY_RECORD, sheets }
}

function sheet(overrides: Partial<SheetRecord> = {}): SheetRecord {
  return { ...emptySheetRecord(), ...overrides }
}

function submittal(at: string): Submittal {
  return {
    owner: 'reader',
    repo: 'work',
    url: 'https://github.com/reader/work',
    commit: null,
    note: '',
    at,
  }
}

/** Opened per rule 1 — read to the bottom — with a written anchor. */
function openedAt(at: string): SheetRecord {
  return sheet({ reachedEnd: true, submittals: [submittal(at)] })
}

const NO_ASSIGNMENTS: readonly AssignedSheet[] = []

describe('the constants', () => {
  it('are the ones §14.8.1 argues for, and are exported rather than inlined', () => {
    // The values are load-bearing for the panel AND the reader's page reading
    // the same definition; a change here is a product decision, not a tweak.
    expect(STALL_DAYS).toBe(14)
    expect(QUIZ_ATTEMPTS).toBe(3)
  })
})

describe('rule 1 — opened but unsigned for N days', () => {
  it('flags a sheet whose last write is N days old', () => {
    const data = record({ 'fundamentals/llms': openedAt(daysAgo(STALL_DAYS)) })
    expect(selectAttention(data, NO_ASSIGNMENTS, NOW)).toEqual([
      {
        sheetSlug: 'fundamentals/llms',
        why: 'stalled',
        idleDays: STALL_DAYS,
        attempts: 0,
        dueAt: null,
      },
    ])
  })

  it('does not flag the day before the boundary', () => {
    const data = record({ 'fundamentals/llms': openedAt(daysAgo(STALL_DAYS - 1)) })
    expect(selectAttention(data, NO_ASSIGNMENTS, NOW)).toEqual([])
  })

  it('accepts dwell alone as "opened"', () => {
    const data = record({
      'fundamentals/llms': sheet({
        dwellSeconds: 300,
        quiz: { answer: 'a', assessed: null, at: daysAgo(STALL_DAYS) },
      }),
    })
    expect(selectAttention(data, NO_ASSIGNMENTS, NOW).map((flag) => flag.why)).toEqual(['stalled'])
  })

  it('flags a sheet whose only evidence of being opened is a filed submittal', () => {
    // This assertion was the other way round while `wasOpened` read only
    // `reachedEnd` and `dwellSeconds`. Both are recorded by nobody — Phase 2
    // shipped `observeReachedEnd` and `observeDwell` and never shipped a caller
    // — so the rule could not fire for any record that exists, and a submittal
    // filed ninety days ago and never signed off read as "never opened".
    //
    // A submittal IS evidence of opening, and stronger evidence than a dwell
    // timer: it is an act, not a measurement of a tab. Ninety days with work
    // filed and no sign-off is precisely what a manager should be shown.
    const data = record({
      'fundamentals/llms': sheet({ submittals: [submittal(daysAgo(90))] }),
    })
    expect(selectAttention(data, NO_ASSIGNMENTS, NOW).map((flag) => flag.why)).toEqual(['stalled'])
  })

  it('does not flag a sheet the record has never held anything for', () => {
    // The honest "never opened": no entry at all. §12.1.3's
    // `isEmptySheetRecord` means a sheet with nothing recorded is dropped from
    // the envelope on read, so this — and not an all-defaults sheet record — is
    // the shape a never-visited sheet actually has.
    expect(selectAttention(record({}), NO_ASSIGNMENTS, NOW)).toEqual([])
  })

  it('says nothing when the envelope holds no anchor rather than inventing one', () => {
    // Read once, never written to: the idle span is genuinely unknown, and
    // guessing it would fabricate the evidence the flag is made of.
    const data = record({ 'fundamentals/llms': sheet({ reachedEnd: true }) })
    expect(selectAttention(data, NO_ASSIGNMENTS, NOW)).toEqual([])
  })

  it('uses the event log’s anchor when the panel supplies one', () => {
    const data = record({ 'fundamentals/llms': sheet({ reachedEnd: true }) })
    const logs: SheetLogs = { 'fundamentals/llms': { lastTouchedAt: daysAgo(STALL_DAYS + 6) } }
    expect(selectAttention(data, NO_ASSIGNMENTS, NOW, logs)).toEqual([
      {
        sheetSlug: 'fundamentals/llms',
        why: 'stalled',
        idleDays: STALL_DAYS + 6,
        attempts: 0,
        dueAt: null,
      },
    ])
  })

  it('measures the sheet, not the reader — activity elsewhere does not refresh it', () => {
    const data: RecordData = {
      ...EMPTY_RECORD,
      days: ['2026-09-01'],
      sheets: {
        'fundamentals/llms': openedAt(daysAgo(STALL_DAYS)),
        'fundamentals/tokens': openedAt(daysAgo(0)),
      },
    }
    expect(selectAttention(data, NO_ASSIGNMENTS, NOW).map((flag) => flag.sheetSlug)).toEqual([
      'fundamentals/llms',
    ])
  })
})

describe('rule 2 — quiz attempted K times, still missed', () => {
  const missed = sheet({
    reachedEnd: true,
    quiz: { answer: 'wrong', assessed: 'missed', at: daysAgo(1) },
  })

  it('flags at exactly K attempts', () => {
    const data = record({ 'expert/agents': missed })
    const logs: SheetLogs = { 'expert/agents': { attempts: QUIZ_ATTEMPTS } }
    expect(selectAttention(data, NO_ASSIGNMENTS, NOW, logs)).toEqual([
      { sheetSlug: 'expert/agents', why: 'quizFailing', idleDays: 1, attempts: QUIZ_ATTEMPTS, dueAt: null },
    ])
  })

  it('stays quiet at K-1 — that is §12.6’s retrieval loop working', () => {
    const data = record({ 'expert/agents': missed })
    const logs: SheetLogs = { 'expert/agents': { attempts: QUIZ_ATTEMPTS - 1 } }
    expect(selectAttention(data, NO_ASSIGNMENTS, NOW, logs)).toEqual([])
  })

  it('does not flag a matched quiz however many attempts it took', () => {
    const data = record({
      'expert/agents': sheet({
        reachedEnd: true,
        quiz: { answer: 'right', assessed: 'matched', at: daysAgo(1) },
      }),
    })
    const logs: SheetLogs = { 'expert/agents': { attempts: QUIZ_ATTEMPTS + 4 } }
    expect(selectAttention(data, NO_ASSIGNMENTS, NOW, logs)).toEqual([])
  })

  it('counts one attempt from the envelope alone, never more', () => {
    // With no log the record proves exactly one attempt happened, so a K of 3
    // can never be reached from the envelope — which is the honest outcome.
    const data = record({ 'expert/agents': missed })
    expect(selectAttention(data, NO_ASSIGNMENTS, NOW)).toEqual([])
    expect(
      selectAttention(data, NO_ASSIGNMENTS, NOW, { 'expert/agents': { attempts: 1 } }),
    ).toEqual([])
  })
})

describe('rule 3 — assigned, due date passed, no signature', () => {
  const assignments: readonly AssignedSheet[] = [
    { sheetSlug: 'protocols/mcp', dueAt: '2026-08-20T00:00:00.000Z' },
  ]

  it('flags an assigned sheet past its deadline even with no record of it', () => {
    expect(selectAttention(EMPTY_RECORD, assignments, NOW)).toEqual([
      {
        sheetSlug: 'protocols/mcp',
        why: 'overdue',
        idleDays: null,
        attempts: 0,
        dueAt: '2026-08-20T00:00:00.000Z',
      },
    ])
  })

  it('does not flag the same untouched sheet with no assignment present', () => {
    expect(selectAttention(EMPTY_RECORD, NO_ASSIGNMENTS, NOW)).toEqual([])
    const data = record({ 'protocols/mcp': sheet({ reachedEnd: true }) })
    expect(selectAttention(data, NO_ASSIGNMENTS, NOW)).toEqual([])
  })

  it('does not flag a deadline that has not arrived, or one that never existed', () => {
    const future: readonly AssignedSheet[] = [
      { sheetSlug: 'protocols/mcp', dueAt: '2026-09-30T00:00:00.000Z' },
      { sheetSlug: 'ecosystem/rag', dueAt: null },
    ]
    expect(selectAttention(EMPTY_RECORD, future, NOW)).toEqual([])
  })

  it('takes the earliest deadline when a sheet is assigned twice', () => {
    const twice: readonly AssignedSheet[] = [
      { sheetSlug: 'protocols/mcp', dueAt: '2026-08-25T00:00:00.000Z' },
      { sheetSlug: 'protocols/mcp', dueAt: '2026-08-10T00:00:00.000Z' },
    ]
    expect(selectAttention(EMPTY_RECORD, twice, NOW)).toEqual([
      {
        sheetSlug: 'protocols/mcp',
        why: 'overdue',
        idleDays: null,
        attempts: 0,
        dueAt: '2026-08-10T00:00:00.000Z',
      },
    ])
  })
})

describe('two rules at once', () => {
  it('names the reason by precedence and keeps every piece of evidence', () => {
    const data = record({
      'protocols/mcp': sheet({
        reachedEnd: true,
        quiz: { answer: 'wrong', assessed: 'missed', at: daysAgo(STALL_DAYS + 2) },
      }),
    })
    const assignments: readonly AssignedSheet[] = [
      { sheetSlug: 'protocols/mcp', dueAt: '2026-08-20T00:00:00.000Z' },
    ]
    const logs: SheetLogs = { 'protocols/mcp': { attempts: QUIZ_ATTEMPTS } }

    // One row per sheet: `why` is a single word, so overdue — the only rule
    // citing a third party's deadline — wins, and the row still carries the
    // idle span and the attempt count the other two rules found.
    expect(selectAttention(data, assignments, NOW, logs)).toEqual([
      {
        sheetSlug: 'protocols/mcp',
        why: 'overdue',
        idleDays: STALL_DAYS + 2,
        attempts: QUIZ_ATTEMPTS,
        dueAt: '2026-08-20T00:00:00.000Z',
      },
    ])
  })

  it('prefers quizFailing over stalled when nothing is overdue', () => {
    const data = record({
      'protocols/mcp': sheet({
        reachedEnd: true,
        quiz: { answer: 'wrong', assessed: 'missed', at: daysAgo(STALL_DAYS) },
      }),
    })
    const logs: SheetLogs = { 'protocols/mcp': { attempts: QUIZ_ATTEMPTS } }
    expect(selectAttention(data, NO_ASSIGNMENTS, NOW, logs).map((flag) => flag.why)).toEqual([
      'quizFailing',
    ])
  })
})

describe('a signed-off sheet', () => {
  it('is never flagged by any of the three rules', () => {
    const data = record({
      'protocols/mcp': sheet({
        signedOff: daysAgo(40),
        signedRevision: 'abc1234',
        reachedEnd: true,
        dwellSeconds: 900,
        quiz: { answer: 'wrong', assessed: 'missed', at: daysAgo(STALL_DAYS + 30) },
        submittals: [submittal(daysAgo(41))],
      }),
    })
    const assignments: readonly AssignedSheet[] = [
      { sheetSlug: 'protocols/mcp', dueAt: '2026-01-01T00:00:00.000Z' },
    ]
    const logs: SheetLogs = { 'protocols/mcp': { attempts: QUIZ_ATTEMPTS + 5 } }
    expect(selectAttention(data, assignments, NOW, logs)).toEqual([])
  })
})

describe('shape of the result', () => {
  it('is ordered by precedence then slug, so jsonb key order cannot change it', () => {
    const data = record({
      'expert/zebra': openedAt(daysAgo(STALL_DAYS)),
      'expert/alpha': openedAt(daysAgo(STALL_DAYS)),
      'expert/quiz': sheet({
        reachedEnd: true,
        quiz: { answer: 'wrong', assessed: 'missed', at: daysAgo(1) },
      }),
    })
    const assignments: readonly AssignedSheet[] = [
      { sheetSlug: 'expert/due', dueAt: '2026-08-01T00:00:00.000Z' },
    ]
    const logs: SheetLogs = { 'expert/quiz': { attempts: QUIZ_ATTEMPTS } }
    expect(selectAttention(data, assignments, NOW, logs).map((flag) => flag.sheetSlug)).toEqual([
      'expert/due',
      'expert/quiz',
      'expert/alpha',
      'expert/zebra',
    ])
  })

  it('returns nothing at all for an empty record with no assignments', () => {
    expect(selectAttention(EMPTY_RECORD, NO_ASSIGNMENTS, NOW)).toEqual([])
  })

  it('returns nothing rather than throwing when `now` cannot be read', () => {
    const data = record({ 'fundamentals/llms': openedAt(daysAgo(90)) })
    expect(selectAttention(data, NO_ASSIGNMENTS, 'not an instant')).toEqual([])
  })

  it('does not treat a `__proto__` sheet key as a prototype write', () => {
    const data = record({ __proto__: openedAt(daysAgo(STALL_DAYS)) } as Record<string, SheetRecord>)
    expect(() => selectAttention(data, NO_ASSIGNMENTS, NOW)).not.toThrow()
  })
})
