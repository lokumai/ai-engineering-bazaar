import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '@/lib/content/categories'
import { loadAllModules } from '@/lib/content/loader'
import {
  categoryProgress,
  classOf,
  nextUnsigned,
  revisionDrift,
  sheetStamps,
  signedCount,
  stamps,
  tally,
  uptime,
  xp,
  type CurriculumFacts,
} from '@/lib/record/derive'
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
import { EMPTY_RECORD, MAX_SUBMITTALS, type RecordData, type Submittal } from '@/lib/record/schema'

const NOW = '2026-08-31T09:15:00.000Z'
const TODAY = '2026-08-31'

/**
 * The corpus's own shape, as Appendix A and §12.5.1 measure it: 32 sheets,
 * 15 drawn, 15 self-checks (module 1 asks its own under a different label), one checklist of
 * 8 items on module 13, categories 7 · 8 · 9 · 5 · 1 · 2. The slugs are
 * synthetic because identity is the slug, not the number, and nothing here
 * depends on which words a slug contains.
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
        // Every drawn sheet asks a self-check, as the corpus does today.
        hasQuickCheck: drawn,
        checklistItems: module === 13 ? 8 : 0,
        sources: drawn ? (module >= 8 ? 25 : 2) : 0,
      })
    }
  }
  return {
    sheets,
    categories: BANDS.map(([slug, from, to]) => ({ slug, total: to - from + 1 })),
    traces: 14,
  }
}

/**
 * The same curriculum with one drawn sheet asking nothing.
 *
 * The corpus does not currently contain this case — all 15 drawn sheets ask a
 * self-check — but §12.5.1 pays for the answer and §7.4 drops the slot, and
 * both rules have to hold on the day a sheet is drawn without a question. So
 * the fact is constructed rather than borrowed.
 */
function factsWithoutQuizOn(module: number): CurriculumFacts {
  const base = facts()
  return {
    ...base,
    sheets: base.sheets.map((sheet) =>
      sheet.module === module ? { ...sheet, hasQuickCheck: false } : sheet,
    ),
  }
}

/** Signs off the given module numbers, one instant apart, oldest first. */
function signed(...modules: number[]): RecordData {
  let data: RecordData = EMPTY_RECORD
  modules.forEach((module, index) => {
    data = signOff(data, slugOf(module), 'a1b2c3d', `2026-08-${String(10 + index).padStart(2, '0')}T09:00:00.000Z`)
  })
  return data
}

const submittal = (repo: string): Submittal => ({
  owner: 'o', repo, url: `https://github.com/o/${repo}`, commit: null, note: '', at: NOW,
})

// ---------------------------------------------------------------------------
// §12.5.1 — XP
// ---------------------------------------------------------------------------

describe('xp — the three events, and nothing else', () => {
  it('pays 100 for a sign-off on a ready sheet', () => {
    const readout = xp(signed(1), facts())
    expect(readout.bySource['SIGN-OFF']).toBe(100)
    expect(readout.total).toBe(100)
  })

  it('pays nothing for a sheet nobody has drawn (§11.28)', () => {
    // Module 20 is a draft: it has no sign-off control, so this state can only
    // arrive by way of an imported record. It must still award zero.
    const readout = xp(signed(20), facts())
    expect(readout.bySource['SIGN-OFF']).toBe(0)
    expect(readout.total).toBe(0)
  })

  it('pays nothing for a slug the curriculum does not contain', () => {
    const data = signOff(EMPTY_RECORD, 'fundamentals/invented', 'a1b2c3d', NOW)
    expect(xp(data, facts()).total).toBe(0)
  })

  it('pays a flat 60 for an assessed Quick Check, either outcome (§12.5.1)', () => {
    const matched = assessQuiz(setQuizAnswer(EMPTY_RECORD, slugOf(3), 'x', NOW), slugOf(3), 'matched', NOW)
    const missed = assessQuiz(setQuizAnswer(EMPTY_RECORD, slugOf(3), 'x', NOW), slugOf(3), 'missed', NOW)
    expect(xp(matched, facts()).bySource.QUIZ).toBe(60)
    expect(xp(missed, facts()).bySource.QUIZ).toBe(60)
  })

  it('pays nothing for an answer that was never self-assessed', () => {
    const written = setQuizAnswer(EMPTY_RECORD, slugOf(3), 'x', NOW)
    expect(xp(written, facts()).bySource.QUIZ).toBe(0)
  })

  it('pays no quiz XP on a drawn sheet that asks nothing', () => {
    // An answer and an assessment against a sheet with no question is a state
    // no control can produce, and an imported file must not be paid for it.
    const data = assessQuiz(setQuizAnswer(EMPTY_RECORD, slugOf(1), 'x', NOW), slugOf(1), 'matched', NOW)
    expect(xp(data, factsWithoutQuizOn(1)).bySource.QUIZ).toBe(0)
    // Against the corpus as it stands, sheet 1 does ask one, so it is paid.
    expect(xp(data, facts()).bySource.QUIZ).toBe(60)
  })

  it('pays 40 only when every checklist item on the sheet is ticked', () => {
    let seven: RecordData = EMPTY_RECORD
    for (let index = 0; index < 7; index += 1) seven = setChecklistItem(seven, slugOf(13), index, true, NOW)
    expect(xp(seven, facts()).bySource.CHECKLIST).toBe(0)
    const eight = setChecklistItem(seven, slugOf(13), 7, true, NOW)
    expect(xp(eight, facts()).bySource.CHECKLIST).toBe(40)
  })

  it('pays no checklist XP for ticks at indices the sheet does not have', () => {
    let data: RecordData = EMPTY_RECORD
    for (const index of [0, 1, 2, 3, 4, 5, 6, 99]) {
      data = setChecklistItem(data, slugOf(13), index, true, NOW)
    }
    expect(xp(data, facts()).bySource.CHECKLIST).toBe(0)
  })

  it('pays no checklist XP on a sheet with no checklist', () => {
    const data = setChecklistItem(EMPTY_RECORD, slugOf(4), 0, true, NOW)
    expect(xp(data, facts()).bySource.CHECKLIST).toBe(0)
  })

  it('pays nothing at all for opening sources or for dwelling (§12.5.1)', () => {
    let data: RecordData = EMPTY_RECORD
    for (let n = 0; n < 30; n += 1) {
      data = recordSourceOpened(data, slugOf(10), `https://a.example/${n}`, NOW)
    }
    data = observeDwell(data, slugOf(10), 3600, NOW)
    expect(xp(data, facts()).total).toBe(0)
  })

  it('adds up: the total is the sum of the three sources and nothing else', () => {
    let data = signed(13)
    data = assessQuiz(setQuizAnswer(data, slugOf(13), 'x', NOW), slugOf(13), 'missed', NOW)
    for (let index = 0; index < 8; index += 1) data = setChecklistItem(data, slugOf(13), index, true, NOW)
    const readout = xp(data, facts())
    expect(readout.bySource).toEqual({ 'SIGN-OFF': 100, QUIZ: 60, CHECKLIST: 40 })
    expect(readout.total).toBe(200)
  })
})

describe('xp — attainableToday is derived from the corpus, never typed', () => {
  it('is 2,440 for the corpus as it stands: 15 sign-offs, 15 quizzes, 1 checklist', () => {
    expect(xp(EMPTY_RECORD, facts()).attainableToday).toBe(15 * 100 + 15 * 60 + 1 * 40)
    expect(xp(EMPTY_RECORD, facts()).attainableToday).toBe(2440)
  })

  it('moves the moment the corpus does, which is the whole point of deriving it', () => {
    const grown = facts()
    const sixteenth = grown.sheets.find((sheet) => sheet.module === 16)
    const drawnNow: CurriculumFacts = {
      ...grown,
      sheets: grown.sheets.map((sheet) =>
        sheet === sixteenth ? { ...sheet, drawn: true, hasQuickCheck: true } : sheet,
      ),
    }
    expect(xp(EMPTY_RECORD, drawnNow).attainableToday).toBe(2440 + 100 + 60)
  })

  it('is 0 against an empty curriculum rather than a plausible number', () => {
    expect(xp(EMPTY_RECORD, { sheets: [], categories: [], traces: 0 }).attainableToday).toBe(0)
  })

  it('counts no quiz or checklist on an undrawn sheet, however the facts are shaped', () => {
    const lying: CurriculumFacts = {
      ...facts(),
      sheets: facts().sheets.map((sheet) =>
        sheet.drawn ? sheet : { ...sheet, hasQuickCheck: true, checklistItems: 4 },
      ),
    }
    expect(xp(EMPTY_RECORD, lying).attainableToday).toBe(2440)
  })
})

// ---------------------------------------------------------------------------
// §12.5.2, §12.5.3 — the readout's counts
// ---------------------------------------------------------------------------

describe('signedCount', () => {
  it('leads with what remains (§12.5.2) and counts out of the whole set', () => {
    expect(signedCount(signed(1, 2, 3, 4, 5, 6, 7), facts())).toEqual({ signed: 7, toGo: 25, of: 32 })
  })

  it('is 0 of 32 at zero data — a denominator that degrades honestly', () => {
    expect(signedCount(EMPTY_RECORD, facts())).toEqual({ signed: 0, toGo: 32, of: 32 })
  })

  it('never counts a draft sheet or an unknown slug', () => {
    const data = signOff(signed(20), 'nope/nope', null, NOW)
    expect(signedCount(data, facts()).signed).toBe(0)
  })
})

describe('classOf — a count of sheets, never a capability (§12.5.3)', () => {
  it('names the next threshold at every position, so it never reads as a bug', () => {
    expect(classOf(0)).toEqual({ numeral: null, next: { numeral: 'I', at: 8 } })
    expect(classOf(7)).toEqual({ numeral: null, next: { numeral: 'I', at: 8 } })
    expect(classOf(8)).toEqual({ numeral: 'I', next: { numeral: 'II', at: 16 } })
    expect(classOf(15)).toEqual({ numeral: 'I', next: { numeral: 'II', at: 16 } })
    expect(classOf(16)).toEqual({ numeral: 'II', next: { numeral: 'III', at: 24 } })
    expect(classOf(24)).toEqual({ numeral: 'III', next: { numeral: 'IV', at: 32 } })
    expect(classOf(31)).toEqual({ numeral: 'III', next: { numeral: 'IV', at: 32 } })
  })

  it('has nothing above IV', () => {
    expect(classOf(32)).toEqual({ numeral: 'IV', next: null })
    expect(classOf(99)).toEqual({ numeral: 'IV', next: null })
  })

  it('reaches CLASS I on any 8 sheets — which is why it may not claim a skill', () => {
    expect(classOf(signedCount(signed(8, 9, 10, 11, 12, 13, 14, 15), facts()).signed).numeral).toBe('I')
  })
})

describe('categoryProgress — the shape Lkm01Progress consumes', () => {
  it('reports approved out of total for every category, dormant ones included', () => {
    expect(categoryProgress(signed(1, 2, 8), facts())).toEqual({
      fundamentals: { approved: 2, total: 7 },
      intermediate: { approved: 1, total: 8 },
      expert: { approved: 0, total: 9 },
      ecosystem: { approved: 0, total: 5 },
      protocols: { approved: 0, total: 1 },
      optional: { approved: 0, total: 2 },
    })
  })

  it('counts a category complete only when every sheet in it is signed', () => {
    expect(categoryProgress(signed(1, 2, 3, 4, 5, 6), facts()).fundamentals)
      .toEqual({ approved: 6, total: 7 })
    expect(categoryProgress(signed(1, 2, 3, 4, 5, 6, 7), facts()).fundamentals)
      .toEqual({ approved: 7, total: 7 })
  })

  it('keeps totals from the curriculum, so a draft-only category still says 9', () => {
    expect(categoryProgress(EMPTY_RECORD, facts()).expert.total).toBe(9)
  })

  it('carries a category the sheet list names but the category list does not', () => {
    const odd: CurriculumFacts = {
      sheets: [{ slug: 'orphan/one', module: 1, category: 'orphan', drawn: true, hasQuickCheck: false, checklistItems: 0, sources: 0 }],
      categories: [],
      traces: 0,
    }
    const data = signOff(EMPTY_RECORD, 'orphan/one', null, NOW)
    expect(categoryProgress(data, odd)).toEqual({ orphan: { approved: 1, total: 1 } })
  })
})

// ---------------------------------------------------------------------------
// §7.3 — UPTIME
// ---------------------------------------------------------------------------

describe('uptime — 14 days, ending today', () => {
  const withDays = (...days: string[]): RecordData => ({ ...EMPTY_RECORD, days })

  it('returns exactly 14 days, oldest first, with today last', () => {
    const strip = uptime(EMPTY_RECORD, TODAY)
    expect(strip.days).toHaveLength(14)
    expect(strip.days[0].date).toBe('2026-08-18')
    expect(strip.days[13].date).toBe(TODAY)
    expect(strip.days.filter((day) => day.today)).toHaveLength(1)
    expect(strip.days[13].today).toBe(true)
  })

  it('marks the days that were written on, and nothing else', () => {
    const strip = uptime(withDays('2026-08-30', TODAY), TODAY)
    expect(strip.days.filter((day) => day.active).map((day) => day.date)).toEqual(['2026-08-30', TODAY])
  })

  it('never renders an empty record as a deficit: no active days, streak 0', () => {
    const strip = uptime(EMPTY_RECORD, TODAY)
    expect(strip.streak).toBe(0)
    expect(strip.lastActive).toBeNull()
    expect(strip.days.some((day) => day.active)).toBe(false)
  })

  it('counts the run of consecutive days ending today', () => {
    expect(uptime(withDays('2026-08-29', '2026-08-30', TODAY), TODAY).streak).toBe(3)
  })

  it('keeps a run alive on a day the reader has not written yet', () => {
    // The day is not over. Printing 0d at 09:00 for a reader who wrote on each
    // of the last six days would be a deficit the record cannot support.
    expect(uptime(withDays('2026-08-29', '2026-08-30'), TODAY).streak).toBe(2)
  })

  it('breaks the run on a missed day', () => {
    expect(uptime(withDays('2026-08-25', '2026-08-26', '2026-08-27'), TODAY).streak).toBe(0)
  })

  it('reports the last active day, including one older than the window', () => {
    expect(uptime(withDays('2026-01-04'), TODAY).lastActive).toBe('2026-01-04')
    expect(uptime(withDays('2026-01-04'), TODAY).days.some((day) => day.active)).toBe(false)
  })

  it('ignores a day in the future, which only a skewed device clock produces', () => {
    const strip = uptime(withDays('2026-09-20'), TODAY)
    expect(strip.lastActive).toBeNull()
    expect(strip.streak).toBe(0)
  })

  it('counts a streak that runs off the start of the window', () => {
    const days = Array.from({ length: 20 }, (_, index) => {
      const date = new Date(Date.UTC(2026, 7, 31) - (19 - index) * 86_400_000)
      return date.toISOString().slice(0, 10)
    })
    expect(uptime(withDays(...days), TODAY).streak).toBe(20)
  })
})

// ---------------------------------------------------------------------------
// §7.4, §12.5.4 — stamps
// ---------------------------------------------------------------------------

describe('stamps — the nine set-level stamps', () => {
  it('is nine stamps, in §7.4 order, with stable ids', () => {
    const shelf = stamps(EMPTY_RECORD, facts())
    expect(shelf).toHaveLength(9)
    expect(shelf.map((stamp) => stamp.id)).toEqual([
      'subsystem:fundamentals',
      'subsystem:intermediate',
      'subsystem:expert',
      'subsystem:ecosystem',
      'subsystem:protocols',
      'subsystem:optional',
      'full-set',
      'sources-100',
      'bilingual',
    ])
  })

  it('labels the subsystems the way §7.4 does, from the curriculum order', () => {
    const shelf = stamps(EMPTY_RECORD, facts())
    expect(shelf[0].label).toBe('SUBSYSTEM 01 · FUNDAMENTALS')
    expect(shelf[4].label).toBe('SUBSYSTEM 05 · PROTOCOLS')
    expect(shelf[6].label).toBe('FULL SET')
    // "OPENED", because the title block prints its own `SOURCES` row counting
    // the citations ON a sheet. A reader read the two side by side and took the
    // stamp for a broken meter.
    expect(shelf[7].label).toBe('SOURCES OPENED · 100')
    expect(shelf[8].label).toBe('BILINGUAL')
  })

  it('gives every locked stamp its exact threshold and current count (§12.5.4)', () => {
    for (const stamp of stamps(signed(1, 2, 3), facts())) {
      expect(Number.isInteger(stamp.threshold)).toBe(true)
      expect(Number.isInteger(stamp.current)).toBe(true)
      expect(stamp.threshold).toBeGreaterThan(0)
    }
    const fundamentals = stamps(signed(1, 2, 3), facts())[0]
    expect(fundamentals.threshold).toBe(7)
    expect(fundamentals.current).toBe(3)
    expect(fundamentals.earned).toBeNull()
  })

  it('earns a subsystem stamp on the instant its last sheet was signed', () => {
    const shelf = stamps(signed(1, 2, 3, 4, 5, 6, 7), facts())
    const fundamentals = shelf[0]
    expect(fundamentals.current).toBe(7)
    expect(fundamentals.threshold).toBe(7)
    expect(fundamentals.earned).toBe('2026-08-16T09:00:00.000Z')
    // A sheet signed in a category that is not fully drawn earns nothing: the
    // stamp needs every sheet of the subsystem, drawn or not (§7.4).
    expect(stamps(signed(30), facts())[4].current).toBe(0)
  })

  it('states which subsystems cannot be earned today, and why, in sheets drawn', () => {
    const shelf = stamps(EMPTY_RECORD, facts())
    expect(shelf[0].attainable).toBe(true)
    expect(shelf[0].reason).toBeNull()
    expect(shelf[1].attainable).toBe(true)
    expect(shelf[2].attainable).toBe(false)
    expect(shelf[2].reason).toBe('0 OF 9 SHEETS DRAWN')
    expect(shelf[3].reason).toBe('0 OF 5 SHEETS DRAWN')
    expect(shelf[4].reason).toBe('0 OF 1 SHEETS DRAWN')
    expect(shelf[5].reason).toBe('0 OF 2 SHEETS DRAWN')
  })

  it('prices FULL SET at the whole set and says how much of it is drawn', () => {
    const full = stamps(signed(1, 2), facts())[6]
    expect(full.threshold).toBe(32)
    expect(full.current).toBe(2)
    expect(full.attainable).toBe(false)
    expect(full.reason).toBe('15 OF 32 SHEETS DRAWN')
  })

  it('counts sources distinctly across the whole set, and pays no XP for them', () => {
    let data: RecordData = EMPTY_RECORD
    data = recordSourceOpened(data, slugOf(8), 'https://a.example/one', NOW)
    data = recordSourceOpened(data, slugOf(9), 'https://a.example/one', NOW)
    data = recordSourceOpened(data, slugOf(9), 'https://a.example/two', NOW)
    const sources = stamps(data, facts())[7]
    expect(sources.threshold).toBe(100)
    expect(sources.current).toBe(2)
    expect(sources.attainable).toBe(true)
  })

  it('says plainly that BILINGUAL cannot be earned in this slice (§12.19)', () => {
    const bilingual = stamps(EMPTY_RECORD, facts())[8]
    expect(bilingual.current).toBe(0)
    expect(bilingual.attainable).toBe(false)
    expect(bilingual.reason).toBe('TURKISH ROUTES NOT BUILT')
    expect(bilingual.earned).toBeNull()
  })

  it('has no exclamation mark, no praise and no anthropomorphism anywhere in it (§12.14.1)', () => {
    const banned = /!|great|nice|well done|congrat|you're|easy|just |simply|quick|please|sorry|oops/i
    for (const stamp of stamps(signed(1, 2, 3, 4, 5, 6, 7), facts())) {
      expect(stamp.label).not.toMatch(banned)
      expect(stamp.reason ?? '').not.toMatch(banned)
      expect(stamp.label).toBe(stamp.label.toUpperCase())
    }
  })
})

describe('sheetStamps — the four §7.4 slot types', () => {
  it('offers three slots on a sheet with a Quick Check and no checklist', () => {
    const slots = sheetStamps(EMPTY_RECORD, facts(), slugOf(9))
    expect(slots.map((slot) => slot.id)).toEqual(['SIGN-OFF', 'QUIZ', 'SOURCES'])
  })

  it('renders the CHECKLIST slot absent, not empty, and only where there is one', () => {
    expect(sheetStamps(EMPTY_RECORD, facts(), slugOf(13)).map((slot) => slot.id))
      .toEqual(['SIGN-OFF', 'QUIZ', 'CHECKLIST', 'SOURCES'])
    expect(sheetStamps(EMPTY_RECORD, facts(), slugOf(13)).find((slot) => slot.id === 'CHECKLIST')?.threshold)
      .toBe(8)
  })

  it('drops the QUIZ slot on a drawn sheet that has no self-check', () => {
    expect(sheetStamps(EMPTY_RECORD, factsWithoutQuizOn(1), slugOf(1)).map((slot) => slot.id))
      .toEqual(['SIGN-OFF'])
    // And keeps it where the sheet does ask something.
    expect(sheetStamps(EMPTY_RECORD, facts(), slugOf(1)).map((slot) => slot.id))
      .toEqual(['SIGN-OFF', 'QUIZ'])
  })

  it('drops the SOURCES slot on a sheet that cites fewer than five URLs', () => {
    // Modules 1–7 carry two apiece in this fixture, so the slot would be an
    // unattainable empty box — §7.4 forbids exactly that.
    expect(sheetStamps(EMPTY_RECORD, facts(), slugOf(3)).map((slot) => slot.id))
      .toEqual(['SIGN-OFF', 'QUIZ'])
  })

  it('has no slots at all on a sheet nobody has drawn', () => {
    expect(sheetStamps(EMPTY_RECORD, facts(), slugOf(20))).toEqual([])
    expect(sheetStamps(EMPTY_RECORD, facts(), 'nope/nope')).toEqual([])
  })

  it('records the sign-off instant on the SIGN-OFF slot', () => {
    const slots = sheetStamps(signed(9), facts(), slugOf(9))
    expect(slots[0].current).toBe(1)
    expect(slots[0].earned).toBe('2026-08-10T09:00:00.000Z')
  })

  it('earns the QUIZ slot on a self-reported match only, per §7.4', () => {
    const missed = assessQuiz(setQuizAnswer(EMPTY_RECORD, slugOf(9), 'x', NOW), slugOf(9), 'missed', NOW)
    const matched = assessQuiz(setQuizAnswer(EMPTY_RECORD, slugOf(9), 'x', NOW), slugOf(9), 'matched', NOW)
    expect(sheetStamps(missed, facts(), slugOf(9))[1].current).toBe(0)
    expect(sheetStamps(matched, facts(), slugOf(9))[1].current).toBe(1)
    expect(sheetStamps(matched, facts(), slugOf(9))[1].earned).toBe(NOW)
    // The XP is flat for either outcome even though the stamp is not.
    expect(xp(missed, facts()).bySource.QUIZ).toBe(60)
  })

  it('counts the sheet SOURCES slot out of five distinct URLs', () => {
    let data: RecordData = EMPTY_RECORD
    for (const n of [1, 2, 3]) data = recordSourceOpened(data, slugOf(9), `https://a.example/${n}`, NOW)
    const slot = sheetStamps(data, facts(), slugOf(9)).find((entry) => entry.id === 'SOURCES')
    expect(slot?.threshold).toBe(5)
    expect(slot?.current).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// §12.10.6, §12.15, §12.4.3
// ---------------------------------------------------------------------------

describe('nextUnsigned — the CONTINUE line (§12.10.6)', () => {
  it('is the first ready sheet that is not signed off', () => {
    expect(nextUnsigned(EMPTY_RECORD, facts())).toBe(slugOf(1))
    expect(nextUnsigned(signed(1, 2), facts())).toBe(slugOf(3))
  })

  it('skips a signed sheet in the middle rather than stopping at it', () => {
    expect(nextUnsigned(signed(1, 3), facts())).toBe(slugOf(2))
  })

  it('never offers a sheet nobody has drawn, and is absent when there is none', () => {
    const all = signed(...Array.from({ length: 15 }, (_, index) => index + 1))
    expect(nextUnsigned(all, facts())).toBeNull()
  })

  it('walks the set in module order however the facts are ordered', () => {
    const shuffled: CurriculumFacts = { ...facts(), sheets: [...facts().sheets].reverse() }
    expect(nextUnsigned(signed(1), shuffled)).toBe(slugOf(2))
  })
})

describe('tally — what the erase dialog enumerates (§12.15)', () => {
  it('counts the record in the reader’s own units', () => {
    let data = signed(1, 2)
    data = setIdentity(data, { name: 'A' }, NOW)
    data = addSubmittal(data, slugOf(1), submittal('r1'), NOW)
    data = addSubmittal(data, slugOf(2), submittal('r2'), NOW)
    data = assessQuiz(setQuizAnswer(data, slugOf(2), 'x', NOW), slugOf(2), 'matched', NOW)
    data = recordSourceOpened(data, slugOf(1), 'https://a.example/one', NOW)
    data = recordSourceOpened(data, slugOf(2), 'https://a.example/one', NOW)
    data = recordSourceOpened(data, slugOf(2), 'https://a.example/two', NOW)
    expect(tally(data)).toEqual({ sheets: 2, name: 1, submittals: 2, quizzes: 1, sources: 2 })
  })

  it('is all zeros on an empty record, and 0 is a counted zero, not a dash', () => {
    expect(tally(EMPTY_RECORD)).toEqual({ sheets: 0, name: 0, submittals: 0, quizzes: 0, sources: 0 })
  })

  it('counts a name that is present but never a name that is not', () => {
    expect(tally(setIdentity(EMPTY_RECORD, { name: '' }, NOW)).name).toBe(0)
    expect(tally(setIdentity(EMPTY_RECORD, { name: ' A ' }, NOW)).name).toBe(1)
  })
})

describe('revisionDrift — a completion claim that quietly became false (§12.4.3)', () => {
  it('reports both revisions when the sheet has moved on', () => {
    const data = signed(1)
    expect(revisionDrift(data, slugOf(1), 'e4f5a6b')).toEqual({
      signedAgainst: 'a1b2c3d',
      nowAt: 'e4f5a6b',
    })
  })

  it('is absent when the revision is unchanged', () => {
    expect(revisionDrift(signed(1), slugOf(1), 'a1b2c3d')).toBeNull()
  })

  it('is absent on a sheet nobody signed', () => {
    expect(revisionDrift(EMPTY_RECORD, slugOf(1), 'a1b2c3d')).toBeNull()
  })

  it('claims no drift against a revision it does not know (§11.25)', () => {
    expect(revisionDrift(signed(1), slugOf(1), null)).toBeNull()
    const noRevision = signOff(EMPTY_RECORD, slugOf(2), null, NOW)
    expect(revisionDrift(noRevision, slugOf(2), 'a1b2c3d')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// The fixture above claims to be the corpus. This is where that is checked.
// ---------------------------------------------------------------------------

describe('the corpus these numbers are derived from', () => {
  const modules = loadAllModules()

  /** Fence-aware, because §12.7 measured 44 tagged code blocks, 3 of them markdown. */
  function unfenced(body: string): string[] {
    const lines: string[] = []
    let fence: string | null = null
    for (const line of body.split('\n')) {
      const match = /^[ \t]*(`{3,}|~{3,})/.exec(line)
      if (match) {
        if (fence === null) fence = match[1]
        else if (match[1].startsWith(fence[0])) fence = null
        continue
      }
      if (fence === null) lines.push(line)
    }
    return lines
  }

  it('has 8 checklist items, all on one sheet (§12.7)', () => {
    const items = modules.map((module) => ({
      module: module.frontmatter.module,
      count: unfenced(module.body).filter((line) => /^[ \t]*- \[[ xX]\]/.test(line)).length,
    })).filter((entry) => entry.count > 0)
    expect(items).toEqual([{ module: 13, count: 8 }])
  })

})

describe('§12.9 — the register is not a stamp', () => {
  /**
   * A first attempt put a `SUBMITTAL` slot in the title block's stamp grid. It
   * worked and it said the wrong thing: `Stamp` prints `n OF m` or `APPROVED`
   * and nothing else, so a register at its cap of three rendered
   * `SUBMITTAL APPROVED`. Filling a register to its storage limit approves
   * nothing (§12.5.4). The count is a title-block ROW instead — see
   * `tests/unit/components/record-sheet.test.tsx` — and this case is what stops
   * the slot coming back.
   */
  it('adds no slot for the register, however many are registered', () => {
    let data: RecordData = EMPTY_RECORD
    for (let index = 0; index < MAX_SUBMITTALS; index += 1) {
      data = addSubmittal(data, slugOf(13), submittal(`repo-${index}`), NOW)
    }
    expect(data.sheets[slugOf(13)]?.submittals).toHaveLength(MAX_SUBMITTALS)
    expect(sheetStamps(data, facts(), slugOf(13)).map((stamp) => stamp.id)).toEqual([
      'SIGN-OFF', 'QUIZ', 'CHECKLIST', 'SOURCES',
    ])
  })
})
