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
    /** M13 — the module's own declared minutes, which `readingMinutes` sums. */
    duration: number
  }>
  categories: ReadonlyArray<{ slug: string; total: number }>
  /** §7.1 `TRACES n/32`. Carried for the readout; no selector here uses it. */
  traces: number
}

type SheetFact = CurriculumFacts['sheets'][number]

// ---------------------------------------------------------------------------
// §12.5.2, §12.5.3 — the readout's counts
// ---------------------------------------------------------------------------

export function isSigned(data: RecordData, fact: SheetFact): boolean {
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

/**
 * M13 / O2 — the reading time behind the modules a reader has completed, and
 * the whole course's, in minutes.
 *
 * **This is the number that replaced `XP` on every instrument.** O2 asked what
 * XP measures and the answer was nothing a reader can name: 100 for a
 * completion, 60 for a quick check, 40 for a checklist, summed. Minutes are the
 * one quantity on this site that answers "how far in am I" in a unit the reader
 * already thinks in, and both halves of it are derived.
 *
 * **Whose minutes, and the honest answer.** The module's own declared duration,
 * not the reader's time on the page. Nothing writes `dwellSeconds` — no
 * observer was ever shipped, which `attention.ts` records — so a reader-measured
 * reading time would be `0 m` for everybody, which is worse than an estimate
 * that says it is one. The surfaces that print this say whose estimate it is.
 *
 * `of` counts the DRAWN modules only, and that is the one place this denominator
 * differs from `signedCount`'s: a draft declares no duration (the curriculum
 * validator only requires one of a `ready` module), so counting the drafts in
 * would add nothing to the total and would still be a claim about minutes
 * nobody has written.
 */
export function readingMinutes(
  data: RecordData,
  facts: CurriculumFacts,
): { done: number; of: number } {
  let done = 0
  let of = 0
  for (const fact of facts.sheets) {
    if (!fact.drawn) continue
    of += fact.duration
    if (isSigned(data, fact)) done += fact.duration
  }
  return { done, of }
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
 * one, and null when it does not (the CHECKLIST stamp records no per-item
 * instant, so its date is absent rather than invented, §11.25).
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

/**
 * §7.4's four sheet-level slot types, for one sheet's title block.
 *
 * `READ` is now `SIGN-OFF`: §12.5.1 withdrew the READ event that fired it and
 * §12.4.1 makes the reader's assertion the only completion primitive.
 *
 * A slot the sheet cannot supply is ABSENT, not empty — §7.4's rule for the
 * CHECKLIST slot: no checklist, no CHECKLIST slot. A draft sheet has no slots at
 * all, because it has no sign-off control and awards nothing.
 */
export function sheetStamps(data: RecordData, facts: CurriculumFacts, slug: string): Stamp[] {
  const fact = facts.sheets.find((sheet) => sheet.slug === slug)
  if (!fact || !fact.drawn) return []
  const sheet = data.sheets[slug] ?? null
  const out: Stamp[] = []

  out.push({
    id: 'COMPLETION',
    label: 'COMPLETION',
    earned: sheet?.signedOff ?? null,
    threshold: 1,
    current: sheet?.signedOff ? 1 : 0,
    attainable: true,
    reason: null,
  })

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
 * §12.15 — what the erase dialog enumerates. "7 module states" is the body of
 * a WCAG 3.3.4 confirmation, so these are counts of
 * what will actually be destroyed: the whole record, including a slug the
 * current curriculum no longer contains.
 *
 * A true zero prints `0`, not a dash: somebody counted (§11.25).
 */
export function tally(data: RecordData): { sheets: number } {
  // D91 — both tracks: an erase removes both.
  const sheets = [...Object.values(data.sheets), ...Object.values(data.everyoneSheets ?? {})]
    .filter((sheet) => !isEmptySheetRecord(sheet))
  return { sheets: sheets.length }
}

/**
 * §12.4.3 — a completion claim that quietly became false. No LMS handles this,
 * and it is the sharpest available application of §1: the sheet changed under a
 * sign-off, so both revisions are printed. Not an error state, no caution
 * colour — a fact, in `--color-on-surface-muted`.
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
