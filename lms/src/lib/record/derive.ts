/**
 * §12.5, §12.10.6, §12.15, §12.4.3 — every number the record surfaces prints,
 * as a pure selector over the record plus the curriculum.
 *
 * **The curriculum arrives as an argument.** This module must not import
 * `lib/content/*`: `derive.ts`, `loader.ts`, `revision.ts` and `paths.ts` there
 * reach `node:fs`, and a client leaf imports this file. So the caller — a
 * server component, which may read the file system — measures the corpus and
 * passes `CurriculumFacts` down as plain data.
 *
 * **Every denominator is derived** (§11.25, §12.5.2). `attainableToday` is
 * computed from the facts, never typed: §7.2's "7,200 at full build-out" is
 * withdrawn precisely because 17 sheets are unwritten, so their Quick Checks
 * and checklists do not exist and their contribution is not derivable.
 *
 * **A sheet nobody has drawn awards nothing** (§11.28, §12.4.1). That is what
 * keeps every denominator on the site honest, and it is enforced here rather
 * than in the UI, because a record imported from a file can carry a sign-off
 * for a draft sheet that no control on the site could have produced.
 */

import {
  isEmptySheetRecord,
  type RecordData,
  type SheetRecord,
} from './schema'

/**
 * What the record needs to know about the drawing set. Measured at build time
 * from the corpus, passed in as plain data.
 */
export interface CurriculumFacts {
  sheets: ReadonlyArray<{
    slug: string
    module: number
    category: string
    drawn: boolean
    hasQuickCheck: boolean
    checklistItems: number
    sources: number
  }>
  categories: ReadonlyArray<{ slug: string; total: number }>
  /** §7.1 `TRACES n/32`. Carried for the readout; no selector here uses it. */
  traces: number
}

type SheetFact = CurriculumFacts['sheets'][number]

// ---------------------------------------------------------------------------
// §12.5.1 — XP. Three events, all of them real acts.
// ---------------------------------------------------------------------------

/** §12.5.1, amending §7.2. Sources and dwell pay nothing at all. */
export const XP_SIGN_OFF = 100
export const XP_QUIZ = 60
export const XP_CHECKLIST = 40

export type XpSource = 'SIGN-OFF' | 'QUIZ' | 'CHECKLIST'

export interface XpReadout {
  total: number
  /** Derived from the corpus. §7.2's full-set ceiling is withdrawn (§12.5.1). */
  attainableToday: number
  bySource: Record<XpSource, number>
}

/** §12.7 — every item on the sheet, at the indices the sheet actually has. */
function checklistComplete(sheet: SheetRecord, items: number): boolean {
  if (items <= 0) return false
  for (let index = 0; index < items; index += 1) {
    if (sheet.checklist[String(index)] !== true) return false
  }
  return true
}

/**
 * §12.5.1 — "a Quick Check answer written AND self-assessed, either outcome".
 * Both halves are required: an assessment with no answer behind it is a state
 * the UI cannot produce and an imported file should not be paid for.
 */
function quizAttempted(sheet: SheetRecord): boolean {
  return sheet.quiz !== null && sheet.quiz.assessed !== null && sheet.quiz.answer.trim() !== ''
}

export function xp(data: RecordData, facts: CurriculumFacts): XpReadout {
  const bySource: Record<XpSource, number> = { 'SIGN-OFF': 0, QUIZ: 0, CHECKLIST: 0 }
  let attainableToday = 0

  for (const fact of facts.sheets) {
    if (!fact.drawn) continue
    attainableToday += XP_SIGN_OFF
    if (fact.hasQuickCheck) attainableToday += XP_QUIZ
    if (fact.checklistItems > 0) attainableToday += XP_CHECKLIST

    const sheet = data.sheets[fact.slug]
    if (!sheet) continue
    if (sheet.signedOff !== null) bySource['SIGN-OFF'] += XP_SIGN_OFF
    if (fact.hasQuickCheck && quizAttempted(sheet)) bySource.QUIZ += XP_QUIZ
    if (checklistComplete(sheet, fact.checklistItems)) bySource.CHECKLIST += XP_CHECKLIST
  }

  const total = bySource['SIGN-OFF'] + bySource.QUIZ + bySource.CHECKLIST
  return { total, attainableToday, bySource }
}

// ---------------------------------------------------------------------------
// §12.5.2, §12.5.3 — the readout's counts
// ---------------------------------------------------------------------------

function isSigned(data: RecordData, fact: SheetFact): boolean {
  return fact.drawn && (data.sheets[fact.slug]?.signedOff ?? null) !== null
}

/**
 * §12.5.2 — the readout leads with what is left, not with the position
 * reached: for high-commitment goals to-go feedback beats to-date, and stating
 * present position raised aspiration least. `of` is the whole set, drawn or
 * not, because §12.5.3 pins CLASS to sheets out of 32.
 */
export function signedCount(
  data: RecordData,
  facts: CurriculumFacts,
): { signed: number; toGo: number; of: number } {
  const of = facts.sheets.length
  const signed = facts.sheets.filter((fact) => isSigned(data, fact)).length
  return { signed, toGo: of - signed, of }
}

/** §12.5.3 / §7.5 — 8 / 16 / 24 / 32, and the numeral is a COUNT of sheets. */
export const CLASS_THRESHOLDS: ReadonlyArray<{ numeral: 'I' | 'II' | 'III' | 'IV'; at: number }> = [
  { numeral: 'I', at: 8 },
  { numeral: 'II', at: 16 },
  { numeral: 'III', at: 24 },
  { numeral: 'IV', at: 32 },
]

/**
 * The next threshold is always named — instrumentation, not mystery (§7.1).
 *
 * CLASS may never be given a capability statement: any 8 of the 32 sheets
 * reach CLASS I, so naming a competence there would be false. Capability
 * language belongs on the six subsystem stamps, which require a whole category.
 */
export function classOf(signed: number): {
  numeral: 'I' | 'II' | 'III' | 'IV' | null
  next: { numeral: string; at: number } | null
} {
  let numeral: 'I' | 'II' | 'III' | 'IV' | null = null
  for (const step of CLASS_THRESHOLDS) if (signed >= step.at) numeral = step.numeral
  const next = CLASS_THRESHOLDS.find((step) => signed < step.at) ?? null
  return { numeral, next: next === null ? null : { numeral: next.numeral, at: next.at } }
}

/**
 * §8.2 — the shape `Lkm01Progress` consumes, keyed by category slug. Every
 * category is present even at zero, because a dormant face is a state the mark
 * has to be able to draw, and the tick gauge needs the total either way.
 *
 * Totals come from the curriculum, so a category with nine undrawn sheets still
 * says nine: a denominator that shrank to what is drawn would flatter the
 * reader (§11.25).
 */
export function categoryProgress(
  data: RecordData,
  facts: CurriculumFacts,
): Record<string, { approved: number; total: number }> {
  const out: Record<string, { approved: number; total: number }> = {}
  const declared = new Set<string>()
  for (const category of facts.categories) {
    declared.add(category.slug)
    out[category.slug] = { approved: 0, total: category.total }
  }
  for (const fact of facts.sheets) {
    // A category the sheet list names but the category list does not still gets
    // a row, counted from the sheets themselves rather than dropped silently.
    let entry = out[fact.category]
    if (!entry) {
      entry = { approved: 0, total: 0 }
      out[fact.category] = entry
    }
    if (!declared.has(fact.category)) entry.total += 1
    if (isSigned(data, fact)) entry.approved += 1
  }
  return out
}

// ---------------------------------------------------------------------------
// §7.3 — UPTIME
// ---------------------------------------------------------------------------

/** §7.3 — one tick per day, last 14 days. Dashboard only, no flame, no modal. */
export const UPTIME_DAYS = 14
const DAY_MS = 86_400_000

function dayNumber(day: string): number | null {
  const parsed = new Date(`${day}T00:00:00.000Z`)
  const time = parsed.getTime()
  if (!Number.isFinite(time) || parsed.toISOString().slice(0, 10) !== day) return null
  return time
}

function dayString(time: number): string {
  return new Date(time).toISOString().slice(0, 10)
}

/**
 * The 14-day strip and the run of consecutive days ending at it.
 *
 * A day the reader has not written on YET does not break the run: the day is
 * not over, and printing `0d` at 09:00 to a reader who wrote on each of the
 * previous six days would render an empty tick as a deficit, which §12.5.5
 * forbids. A genuinely missed day does break it, and the visible gap is the
 * entire message (§7.3).
 *
 * `lastActive` looks at the whole record, not the window, so `LAST 3d AGO` can
 * be true for a day that has scrolled off the strip. A day in the future is
 * ignored: only a skewed device clock produces one, and the record's own
 * timestamps are not attested by any authority (§12.12.3).
 */
export function uptime(
  data: RecordData,
  today: string,
): { days: Array<{ date: string; active: boolean; today: boolean }>; streak: number; lastActive: string | null } {
  const todayMs = dayNumber(today)
  if (todayMs === null) return { days: [], streak: 0, lastActive: null }

  const active = new Set<string>()
  for (const day of data.days) {
    const time = dayNumber(day)
    if (time !== null && time <= todayMs) active.add(day)
  }

  const days: Array<{ date: string; active: boolean; today: boolean }> = []
  for (let back = UPTIME_DAYS - 1; back >= 0; back -= 1) {
    const date = dayString(todayMs - back * DAY_MS)
    days.push({ date, active: active.has(date), today: back === 0 })
  }

  let cursor = active.has(today) ? todayMs : todayMs - DAY_MS
  let streak = 0
  while (active.has(dayString(cursor))) {
    streak += 1
    cursor -= DAY_MS
  }

  const lastActive = [...active].sort().pop() ?? null
  return { days, streak, lastActive }
}

// ---------------------------------------------------------------------------
// §7.4, §12.5.4 — stamps
// ---------------------------------------------------------------------------

/**
 * §12.5.4 — the strongest rule in the original spec: every locked stamp always
 * states its exact threshold and current count. That is what converts a badge
 * from controlling to informational (informationally administered feedback
 * d = +0.66 against controllingly administered d = −0.44).
 *
 * `earned` is a DATE, not a boolean. The earned test is
 * `current >= threshold`; `earned` carries the instant when the record holds
 * one, and null when it does not — the SOURCES stamp records no per-URL
 * instant, so its date is absent rather than invented (§11.25).
 *
 * `attainable` is false where the corpus cannot supply the threshold today, and
 * `reason` says so in sheets drawn (§7.4). Wording carries the whole §12.5.4
 * tension: a stamp reads as a completed inspection record, never as a prize,
 * and is never offered as the reason to perform an act.
 */
export interface Stamp {
  id: string
  label: string
  earned: string | null
  threshold: number
  current: number
  attainable: boolean
  reason: string | null
}

/** §7.4 stamp 8 — 100 distinct primary sources opened. */
export const SOURCES_STAMP_THRESHOLD = 100
/** §7.4's sheet-level SOURCES slot — 5 distinct sources from this sheet. */
export const SHEET_SOURCES_THRESHOLD = 5

function distinctSources(data: RecordData, slugs?: ReadonlySet<string>): number {
  const seen = new Set<string>()
  for (const [slug, sheet] of Object.entries(data.sheets)) {
    if (slugs && !slugs.has(slug)) continue
    for (const url of sheet.sources) seen.add(url)
  }
  return seen.size
}

/**
 * The latest sign-off instant among the given sheets — when the set completed.
 * Compared as a time, not as a string: the store always writes UTC, but an
 * imported record may legitimately carry an offset, and `'2026-08-14T09:00+03:00'`
 * sorts before `'2026-08-14T08:00Z'` lexicographically while being later.
 */
function latestSignOff(data: RecordData, facts: ReadonlyArray<SheetFact>): string | null {
  let latest: string | null = null
  let latestTime = Number.NEGATIVE_INFINITY
  for (const fact of facts) {
    const at = data.sheets[fact.slug]?.signedOff ?? null
    if (at === null) continue
    const time = Date.parse(at)
    if (!Number.isFinite(time) || time <= latestTime) continue
    latest = at
    latestTime = time
  }
  return latest
}

function drawnReason(drawn: number, total: number): string {
  return `${drawn} OF ${total} SHEETS DRAWN`
}

export function stamps(data: RecordData, facts: CurriculumFacts): Stamp[] {
  const out: Stamp[] = []

  // §7.4 #1–#6 — one per subsystem. The ordinal is the category's position in
  // the curriculum order it was passed in, never a typed number.
  facts.categories.forEach((category, index) => {
    const members = facts.sheets.filter((sheet) => sheet.category === category.slug)
    const drawn = members.filter((sheet) => sheet.drawn).length
    const current = members.filter((fact) => isSigned(data, fact)).length
    const attainable = category.total > 0 && drawn >= category.total
    out.push({
      id: `subsystem:${category.slug}`,
      label: `SUBSYSTEM ${String(index + 1).padStart(2, '0')} · ${category.slug.toUpperCase()}`,
      earned: current >= category.total && category.total > 0 ? latestSignOff(data, members) : null,
      threshold: category.total,
      current,
      attainable,
      reason: attainable ? null : drawnReason(drawn, category.total),
    })
  })

  // §7.4 #7 — the whole set, drawn or not.
  const total = facts.sheets.length
  const drawn = facts.sheets.filter((sheet) => sheet.drawn).length
  const signed = facts.sheets.filter((fact) => isSigned(data, fact)).length
  const fullAttainable = total > 0 && drawn >= total
  out.push({
    id: 'full-set',
    label: 'FULL SET',
    earned: total > 0 && signed >= total ? latestSignOff(data, facts.sheets) : null,
    threshold: total,
    current: signed,
    attainable: fullAttainable,
    reason: fullAttainable ? null : drawnReason(drawn, total),
  })

  // §7.4 #8 — sources are evidence, and this is the only place they count for
  // anything. The available figure is the sum of the per-sheet DISTINCT counts
  // (§12.8: 209), which is an upper bound on the set-wide distinct total (188);
  // it is used only for the attainable test, never printed as a denominator.
  const available = facts.sheets.reduce((sum, sheet) => sum + (sheet.drawn ? sheet.sources : 0), 0)
  const openedSources = distinctSources(data)
  out.push({
    id: 'sources-100',
    label: `SOURCES · ${SOURCES_STAMP_THRESHOLD}`,
    earned: null,
    threshold: SOURCES_STAMP_THRESHOLD,
    current: openedSources,
    attainable: available >= SOURCES_STAMP_THRESHOLD,
    reason: available >= SOURCES_STAMP_THRESHOLD ? null : `${available} SOURCES IN THE SET`,
  })

  // §7.4 #9 — §12.0 defers the Turkish routes, so no reader can read a sheet
  // in both languages in this slice. Naming the absence is compliant with §1;
  // a slot that silently never fills is not (§12.19).
  out.push({
    id: 'bilingual',
    label: 'BILINGUAL',
    earned: null,
    threshold: 1,
    current: 0,
    attainable: false,
    reason: 'TURKISH ROUTES NOT BUILT',
  })

  return out
}

/**
 * §7.4's four sheet-level slot types, for one sheet's title block.
 *
 * `READ` is now `SIGN-OFF`: §12.5.1 withdrew the READ event that fired it and
 * §12.4.1 makes the reader's assertion the only completion primitive.
 *
 * A slot the sheet cannot supply is ABSENT, not empty — §7.4's rule for the
 * CHECKLIST slot, applied consistently: no Quick Check, no QUIZ slot; fewer
 * than five citable sources, no SOURCES slot. A draft sheet has no slots at
 * all, because it has no sign-off control and awards nothing.
 */
export function sheetStamps(data: RecordData, facts: CurriculumFacts, slug: string): Stamp[] {
  const fact = facts.sheets.find((sheet) => sheet.slug === slug)
  if (!fact || !fact.drawn) return []
  const sheet = data.sheets[slug] ?? null
  const out: Stamp[] = []

  out.push({
    id: 'SIGN-OFF',
    label: 'SIGN-OFF',
    earned: sheet?.signedOff ?? null,
    threshold: 1,
    current: sheet?.signedOff ? 1 : 0,
    attainable: true,
    reason: null,
  })

  if (fact.hasQuickCheck) {
    // §7.4's condition is a self-reported MATCH. The flat 60 XP of §12.5.1 pays
    // for the attempt either way; the stamp records what the reader reported.
    const matched = sheet?.quiz?.assessed === 'matched'
    out.push({
      id: 'QUIZ',
      label: 'QUIZ',
      earned: matched ? (sheet?.quiz?.at ?? null) : null,
      threshold: 1,
      current: matched ? 1 : 0,
      attainable: true,
      reason: null,
    })
  }

  if (fact.checklistItems > 0) {
    const ticked = sheet
      ? Object.keys(sheet.checklist).filter(
          (key) => Number(key) < fact.checklistItems && sheet.checklist[key],
        ).length
      : 0
    out.push({
      id: 'CHECKLIST',
      label: 'CHECKLIST',
      earned: null,
      threshold: fact.checklistItems,
      current: ticked,
      attainable: true,
      reason: null,
    })
  }

  if (fact.sources >= SHEET_SOURCES_THRESHOLD) {
    out.push({
      id: 'SOURCES',
      label: 'SOURCES',
      earned: null,
      threshold: SHEET_SOURCES_THRESHOLD,
      current: distinctSources(data, new Set([slug])),
      attainable: true,
      reason: null,
    })
  }

  return out
}

// ---------------------------------------------------------------------------
// §12.10.6, §12.15, §12.4.3
// ---------------------------------------------------------------------------

/**
 * §12.10.6 `CONTINUE` — the next ready sheet that is not signed off. Absent
 * when there is none, and cheap: its absence is the first thing a returning
 * senior engineer notices.
 */
export function nextUnsigned(data: RecordData, facts: CurriculumFacts): string | null {
  const ordered = [...facts.sheets].sort((a, b) => a.module - b.module)
  const next = ordered.find((fact) => fact.drawn && !isSigned(data, fact))
  return next?.slug ?? null
}

/**
 * §12.15 — what the erase dialog enumerates. "7 sheet states, 1 name, 3
 * submittals" is the body of a WCAG 3.3.4 confirmation, so these are counts of
 * what will actually be destroyed: the whole record, including a slug the
 * current curriculum no longer contains.
 *
 * A true zero prints `0`, not a dash: somebody counted (§11.25).
 */
export function tally(data: RecordData): {
  sheets: number
  name: number
  submittals: number
  quizzes: number
  sources: number
} {
  const sheets = Object.values(data.sheets).filter((sheet) => !isEmptySheetRecord(sheet))
  return {
    sheets: sheets.length,
    name: (data.identity.name ?? '').trim() === '' ? 0 : 1,
    submittals: sheets.reduce((sum, sheet) => sum + sheet.submittals.length, 0),
    quizzes: sheets.filter((sheet) => sheet.quiz !== null).length,
    sources: distinctSources(data),
  }
}

/**
 * §12.4.3 — a completion claim that quietly became false. No LMS handles this,
 * and it is the sharpest available application of §1: the sheet changed under a
 * sign-off, so both revisions are printed. Not an error state, no caution
 * colour — a fact, in `--color-ink-muted`.
 *
 * Absent when either revision is unknown: a drift claim against a revision we
 * do not have is exactly the invented value §11.25 forbids.
 */
export function revisionDrift(
  data: RecordData,
  slug: string,
  currentRevision: string | null,
): { signedAgainst: string; nowAt: string } | null {
  const sheet = data.sheets[slug]
  if (!sheet || sheet.signedOff === null) return null
  const signedAgainst = sheet.signedRevision
  if (signedAgainst === null || currentRevision === null) return null
  if (signedAgainst === currentRevision) return null
  return { signedAgainst, nowAt: currentRevision }
}
