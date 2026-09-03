/**
 * §14.8.1 — what "stalled" MEANS, as a definition rather than a query.
 *
 * The reason this is a module and not a `where` clause is stated in §14.8.1
 * itself: the manager's list and the reader's own page call the same function,
 * so the system cannot say one thing to the front and another to the back. A
 * SQL predicate in the panel plus an `if` in a sheet page is exactly how a
 * reader comes to be told "you are fine" while a manager is told "this person
 * is stuck", and §14.9 already lost that argument once over `count(*) / 32.0`.
 * The output is also what §14.9 stores in `record_state.progress.attention`,
 * so Metabase reads this definition too and no third one is ever written.
 *
 * Pure, node-testable, no clock (§12.14.2, and events.ts's rule): `now`
 * arrives as an argument. A selector that reads `Date.now()` cannot be tested
 * at a boundary, and every rule here IS a boundary.
 *
 * Nothing here imports `lib/org/*`. §14.8.1's third rule needs a due date and
 * nothing else about assignments, which is why `wire.ts` carries the
 * two-field `AssignedSheet`: making the org layer a prerequisite for testing
 * the reader's own page would be the same coupling the panel/page split is
 * meant to prevent.
 */

import type { AssignedSheet, AttentionFlag } from './wire'
import type { RecordData, SheetRecord } from './schema'

/**
 * §14.8.1 rule 1 — days a sheet may sit opened-but-unsigned before it asks for
 * attention.
 *
 * 14, not 7 and not 30. The corpus is read on the reader's own time, and the
 * observed rhythm this is aimed at is weekly: someone who opens a sheet on a
 * Saturday and signs it off the following Saturday is doing exactly what the
 * site asks, and a 7-day threshold would flag that person on the normal path —
 * a flag that fires on correct behaviour trains the manager to ignore the
 * column. 30 fails the other way: it is no longer a nudge, because by then the
 * reader has lost the context the sheet was building and a reminder costs them
 * a re-read. 14 means two whole weekly cycles passed with nothing written
 * against the sheet, which is a claim worth putting in front of a person.
 */
export const STALL_DAYS = 14

/**
 * §14.8.1 rule 2 — recorded quiz attempts, still self-assessed `missed`,
 * before the quiz itself is called out.
 *
 * 3, not 2 and not 5. §12.6's Quick Check is a retrieval exercise and its
 * intended loop is miss → re-read → try again; the second attempt IS that
 * loop, so flagging at 2 would report the mechanism working as a failure. The
 * third recorded attempt still missed is the first point at which the reader's
 * own assessment says the material is not landing — the signal is theirs, not
 * ours, which is what keeps §12.4.4's self-report intact. 5 arrives after the
 * fact: a reader who has missed five times has usually already stopped, and
 * the flag then describes an abandonment instead of preventing one.
 */
export const QUIZ_ATTEMPTS = 3

/**
 * §14.2.3 — what the append-only log knows and the envelope does not.
 *
 * Two of §14.8.1's three rules need a fact the record cannot hold. `quiz` is
 * ONE `QuizRecord` per sheet (§12.1.2): it carries the latest answer and its
 * assessment, never a count, so "attempted K times" is only answerable from
 * `learner_event` where `setQuizAnswer` writes a row per attempt. And no field
 * of `SheetRecord` timestamps `reachedEnd` or `dwellSeconds`, so a sheet that
 * was only READ has no anchor for "N days" inside the envelope either.
 *
 * Rather than invent either number, the caller passes what it has. The panel
 * fills this from `learner_event` (`count(*)` and `max(at)` per `sheet_slug`);
 * the reader's own page passes nothing and gets the record-derived fallback
 * below. Both call ONE function, which is §14.8.1's actual requirement — it
 * asks for a single definition, not for both callers to hold identical
 * evidence.
 *
 * This is reported to the orchestrator as a gap in §14.8.1: the spec's
 * signature (record + assignments + now) cannot express rule 2 at all.
 */
export interface SheetLog {
  /** Rows of `kind = 'setQuizAnswer'` for this sheet. */
  attempts?: number
  /** `max(at)` over this sheet's events — the last write against it. */
  lastTouchedAt?: string | null
}

export type SheetLogs = Readonly<Record<string, SheetLog>>

/**
 * Precedence when a sheet satisfies more than one rule.
 *
 * `AttentionFlag.why` is one word, so a sheet that is overdue AND has a
 * failing quiz has to be named something. The order is by how much of the
 * claim comes from outside the reader: `overdue` cites a deadline someone else
 * set and is the only rule with a third party in it; `quizFailing` cites the
 * reader's own repeated self-assessment and is actionable — it says WHERE they
 * are stuck; `stalled` is the weakest, because elapsed time alone explains
 * nothing.
 *
 * Nothing is lost by choosing: one flag per sheet is emitted and it carries
 * `idleDays`, `attempts` and `dueAt` whatever the winning word is, so the
 * panel can print "overdue, 3 attempts, 21 days idle" from a single row. The
 * precedence picks the REASON WORD, not the evidence.
 */
const WHY_ORDER: readonly AttentionFlag['why'][] = ['overdue', 'quizFailing', 'stalled']

/**
 * Whole UTC days between two instants, or null when either cannot be read.
 *
 * Calendar days, not elapsed hours, and deliberately: the thresholds above are
 * written in days, and a fractional comparison would make a flag appear and
 * disappear depending on what time of day the panel happened to be opened —
 * the same sheet reading `stalled` at 09:00 and clean at 08:00 is a page
 * disagreeing with itself. §12's `days: string[]` is already `YYYY-MM-DD` for
 * this reason.
 */
function daysBetween(fromIso: string, toIso: string): number | null {
  const from = Date.parse(fromIso)
  const to = Date.parse(toIso)
  if (Number.isNaN(from) || Number.isNaN(to)) return null
  const DAY = 86_400_000
  return Math.floor(to / DAY) - Math.floor(from / DAY)
}

/**
 * §14.8.1 rule 1's "opened".
 *
 * The first two halves are §12.4.4 observations, not claims: the reader reached
 * the end of the sheet, or the tab was actually in front of them.
 *
 * **The other four exist because, MEASURED, the first two are never recorded.**
 * `observeReachedEnd` and `observeDwell` are exported from `events.ts` and
 * called from nowhere in `src/` — Phase 2 shipped the reducers and never
 * shipped the observers. So `reachedEnd` is `false` and `dwellSeconds` is `0`
 * in every record that exists, and rule 1 as originally written could not fire
 * for anybody, ever. A rule that cannot fire is worse than an absent one: the
 * panel prints no stalls and reads as "nobody is stuck".
 *
 * The fix is not to add an observer here. It is that the record already holds
 * FOUR pieces of evidence a sheet was opened, and each is stronger than dwell:
 * a checklist tick, a quiz answer, a source followed, a submittal filed. None
 * of them can happen without the sheet being in front of the reader, and none
 * of them is a passive measurement of a tab — they are acts.
 *
 * Keeping `reachedEnd` and `dwellSeconds` in the disjunction costs nothing and
 * means the definition needs no revisiting on the day the observers land.
 */
function wasOpened(sheet: SheetRecord): boolean {
  return (
    sheet.reachedEnd ||
    sheet.dwellSeconds > 0 ||
    sheet.quiz !== null ||
    sheet.submittals.length > 0 ||
    sheet.sources.length > 0 ||
    Object.keys(sheet.checklist).length > 0
  )
}

/**
 * The fallback anchor for rule 1 when the event log is not at hand: the latest
 * instant the ENVELOPE can prove belongs to this sheet.
 *
 * `quiz.at` and each `Submittal.at` are the only per-sheet timestamps
 * §12.1.2 stores. `days` is deliberately not consulted: it records that the
 * reader wrote something SOMEWHERE that day, and using it here would keep
 * every opened sheet looking fresh for as long as the reader touches any other
 * sheet — the definition would then measure the reader's activity rather than
 * the sheet's.
 *
 * Returns null when the envelope holds no timestamp for the sheet, and the
 * caller then emits no `stalled` flag. That is the §1 answer: a sheet read
 * once and never written to has no knowable idle span, and picking one would
 * be inventing the evidence the flag is supposed to be made of. The panel path
 * always has `lastTouchedAt`, so this only ever degrades the reader's own page,
 * where a missing nudge is cheaper than a fabricated one.
 */
function lastTouchedFromRecord(sheet: SheetRecord): string | null {
  let latest: string | null = null
  const consider = (at: string | null | undefined): void => {
    if (typeof at !== 'string' || at === '') return
    if (Number.isNaN(Date.parse(at))) return
    if (latest === null || at > latest) latest = at
  }
  consider(sheet.quiz?.at)
  for (const submittal of sheet.submittals) consider(submittal.at)
  return latest
}

/**
 * §14.8.1 — every sheet asking for attention, and why.
 *
 * Three rules, no fourth. A sheet already signed off is never flagged, at all,
 * by any rule: sign-off is the reader's own assertion that they are done with
 * it (§12.4.4), and attention is about unfinished work. A signed sheet whose
 * quiz was missed is not silently dropped either — that is precisely what
 * §14.8.2's claim/evidence columns exist to show, and saying it twice, once as
 * an alarm, would make the panel argue with itself.
 *
 * Iteration covers the UNION of the record's sheets and the assigned ones. An
 * assignment whose sheet was never opened has no entry in `data.sheets`, and
 * that sheet going overdue is the single most important thing rule 3 has to
 * catch.
 *
 * The result is sorted (precedence, then slug) rather than left in whatever
 * order the keys came in. That is not cosmetic: the record makes this trip
 * through `jsonb`, which does not preserve object key order, so an unsorted
 * list would render one way on the device and another way after a round trip
 * to §14.2.2's row.
 */
export function selectAttention(
  data: RecordData,
  assigned: readonly AssignedSheet[],
  now: string,
  logs: SheetLogs = {},
): AttentionFlag[] {
  // A `now` that cannot be parsed makes all three rules unanswerable. Empty is
  // the only non-lying return; a thrown error inside a render path would take
  // the reader's own page down over a bad argument.
  if (Number.isNaN(Date.parse(now))) return []

  // Maps, not object literals: `sheetSlug` reaches this function from a jsonb
  // column and from a user-authored import file, and `__proto__` as a key on a
  // plain object is a prototype write (§12.1.2's `isSafeKey` guards the same
  // hazard on the way in).
  const due = new Map<string, string | null>()
  for (const item of assigned) {
    // Earliest deadline wins when a sheet is assigned twice (§14.3's
    // multi-org membership makes that reachable): the first one to pass is the
    // one the reader is already late for.
    const existing = due.get(item.sheetSlug)
    if (existing === undefined || (item.dueAt !== null && (existing === null || item.dueAt < existing))) {
      due.set(item.sheetSlug, item.dueAt)
    }
  }

  const slugs = new Set<string>([...Object.keys(data.sheets), ...due.keys()])
  const flags: AttentionFlag[] = []

  for (const slug of slugs) {
    const sheet: SheetRecord | undefined = data.sheets[slug]
    if (sheet?.signedOff) continue

    const log = logs[slug] ?? {}

    // The envelope proves a quiz was attempted at least once whenever it holds
    // one, so the fallback is 1 rather than 0 — never more, because the count
    // of earlier attempts genuinely is not in there.
    const attempts = log.attempts ?? (sheet?.quiz ? 1 : 0)

    const lastTouchedAt =
      log.lastTouchedAt ?? (sheet ? lastTouchedFromRecord(sheet) : null)
    const idleDays = lastTouchedAt === null ? null : daysBetween(lastTouchedAt, now)

    const dueAt = due.get(slug) ?? null
    // Strictly past: a deadline whose instant has only just arrived has not
    // been missed. With date-only deadlines (`2026-09-01` = that midnight) the
    // flag therefore appears during the first day AFTER the due date.
    const overdue = dueAt !== null && Date.parse(dueAt) < Date.parse(now)

    const quizFailing = sheet?.quiz?.assessed === 'missed' && attempts >= QUIZ_ATTEMPTS

    const stalled =
      sheet !== undefined && wasOpened(sheet) && idleDays !== null && idleDays >= STALL_DAYS

    const why = overdue ? 'overdue' : quizFailing ? 'quizFailing' : stalled ? 'stalled' : null
    if (why === null) continue

    flags.push({
      sheetSlug: slug,
      why,
      idleDays,
      attempts,
      // Only the overdue reason is entitled to print a deadline; carrying one
      // on a `stalled` row would read as "this was due", which nobody said.
      dueAt: why === 'overdue' ? dueAt : null,
    })
  }

  return flags.sort((a, b) => {
    const byWhy = WHY_ORDER.indexOf(a.why) - WHY_ORDER.indexOf(b.why)
    return byWhy !== 0 ? byWhy : a.sheetSlug.localeCompare(b.sheetSlug)
  })
}
