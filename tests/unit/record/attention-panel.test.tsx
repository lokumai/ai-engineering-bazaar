import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AttentionPanel, type AttentionSheet } from '@/components/record/AttentionPanel'
import { STALL_DAYS, selectAttention } from '@/lib/record/attention'
import { EMPTY_RECORD, emptySheetRecord, type RecordData, type SheetRecord } from '@/lib/record/schema'

/**
 * §15.7 — the note under `/dashboard/`'s attention list, pinned against the
 * only call that produces the list.
 *
 * **What went wrong, and what this file exists to stop happening again.** The
 * note used to state `selectAttention`'s definition — both the stall rule and
 * "Quick Check recorded as missed after 3 attempts". The panel calls
 * `selectAttention(record, [], now)` with no logs, so `attention.ts` falls back
 * to `sheet.quiz ? 1 : 0` and `1 >= QUIZ_ATTEMPTS` can never hold: a reader who
 * had missed the same Quick Check repeatedly read `NOTHING OPENED AND LEFT`
 * under a sentence promising that sheet would be listed. The stall clause was
 * wrong the same way — it said "nothing has been written against it", while the
 * 14-day anchor is only `quiz.at` or a submittal `at`, so a sheet whose only
 * evidence is checklist ticks could never be dated at all.
 *
 * So the assertions come in pairs: a seeded record run through **the panel's
 * own argument list** (record, no assignments, now, no logs), and the sentence
 * the reader is shown beside it. Either half changing alone fails.
 *
 * `renderToStaticMarkup` and no jsdom, following `record-dashboard.test.tsx`:
 * the note is server-rendered text that does not depend on the record, so the
 * static markup carries the exact string a reader receives. The listed rows are
 * channel B (§12.2) and belong to Playwright.
 */

const NOW = '2026-09-01T09:00:00.000Z'

function daysAgo(days: number): string {
  return new Date(Date.parse(NOW) - days * 86_400_000).toISOString()
}

function record(sheets: Record<string, SheetRecord>): RecordData {
  return { ...EMPTY_RECORD, sheets }
}

const SHEETS: readonly AttentionSheet[] = [
  { slug: 'fundamentals/llms', module: 1, title: 'LLMs', subsystem: 'Fundamentals', drawn: true },
]

/**
 * Exactly what `AttentionPanel` passes: no assignments and no logs. Written as
 * a helper so a test cannot accidentally hand the definition evidence this
 * surface does not have — which is the mistake the note itself made.
 */
function asThePanelAsks(data: RecordData) {
  return selectAttention(data, [], NOW)
}

/** Tags and React's text-separator comments removed; the prose is the subject. */
function text(markup: string): string {
  return markup
    .replace(/<!--.*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const NOTE = text(renderToStaticMarkup(<AttentionPanel sheets={SHEETS} />))

describe('the note under the list', () => {
  it('states the threshold the comparison used, not a second copy of it', () => {
    expect(STALL_DAYS).toBe(14)
    expect(NOTE).toContain(`${STALL_DAYS} or more days old`)
  })

  it('names the two dated writes, and says the undated evidence does not count', () => {
    expect(NOTE).toContain('Quick Check answer or a filed submittal')
    expect(NOTE).toContain('neither start nor reset that count')
  })

  it('promises no rule about attempts, because this surface cannot fire one', () => {
    // The old sentence read "after 3 attempts". Any restatement of an
    // attempt threshold here is the defect returning.
    expect(NOTE).not.toMatch(/\battempts?\b\s*(\.|,)?$/)
    expect(NOTE).not.toMatch(/after \d+ attempts/)
    expect(NOTE).toContain('the count of attempts is held in the event log')
  })

  it('keeps sign-off as the only exit', () => {
    expect(NOTE).toContain('signed off, never because more time passed')
  })
})

describe('what the panel actually lists, on its own arguments', () => {
  it('lists nothing for a Quick Check just recorded as missed — as the note now says', () => {
    const data = record({
      'fundamentals/llms': {
        ...emptySheetRecord(),
        reachedEnd: true,
        quiz: { answer: 'wrong', assessed: 'missed', at: daysAgo(1) },
      },
    })

    // Not "the reader is fine": the attempt count lives in `learner_event`,
    // which this page does not read. The note is the sentence that has to say
    // so, and the test above pins that it does.
    expect(asThePanelAsks(data)).toEqual([])
  })

  it('lists that same missed Quick Check once its answer is old, and calls it stalled', () => {
    const data = record({
      'fundamentals/llms': {
        ...emptySheetRecord(),
        reachedEnd: true,
        quiz: { answer: 'wrong', assessed: 'missed', at: daysAgo(STALL_DAYS) },
      },
    })

    const flags = asThePanelAsks(data)
    expect(flags).toHaveLength(1)
    // The reason word is the dated-write rule, which is the only rule the note
    // describes — a `quizFailing` here would mean the note is short a rule.
    expect(flags[0]?.why).toBe('stalled')
    expect(flags[0]?.idleDays).toBe(STALL_DAYS)
  })

  it('lists nothing for a sheet whose only evidence is undated ticks and sources', () => {
    const data = record({
      'fundamentals/llms': {
        ...emptySheetRecord(),
        checklist: { 'item-1': true },
        sources: ['https://example.invalid/paper'],
      },
    })

    // `wasOpened` is satisfied and there is still no anchor, so no age can be
    // stated. This is the half of the old sentence that lied by omission.
    expect(asThePanelAsks(data)).toEqual([])
  })
})
