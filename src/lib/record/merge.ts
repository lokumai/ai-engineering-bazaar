/**
 * §14.7.2 — two copies of one record, reconciled by field, as a pure function.
 *
 * §14.2.3 decided that `record_state` is the source and `learner_event` sits
 * BESIDE it rather than under it: state is never replayed from the log. That
 * decision is only affordable because this function is **commutative,
 * associative and idempotent** on the fields that carry the reader's work. If
 * merging depended on the order the two copies arrived in, a record's value
 * would depend on which device happened to open the site first, and the log
 * would have to become the source — which is the expensive half of event
 * sourcing that §14.0 #6 refused. So the properties are not a nicety here;
 * they are the reason the schema is allowed to be this small.
 *
 * Three rows of §14.7.2's table are deliberately NOT commutative — `prefs`
 * (device preference) and the three `identity` fields (the account's visible
 * identity must not change on sign-in). Those are asymmetric by design, and the
 * argument order is the whole point of them. Everything under `sheets`, plus
 * `days`, is order-free.
 *
 * Discipline copied from `events.ts` verbatim: nothing mutates, no clock is
 * read, and when the merge changes nothing the ARGUMENT is returned rather than
 * a structurally-equal copy — the store notifies subscribers on identity
 * (§12.1.4), so a fresh object that says the same thing is a re-render and a
 * flush for nothing.
 *
 * fs-free and DOM-free; the whole table is exercised in node (§12.14.2).
 */

import {
  DWELL_CAP_SECONDS,
  MAX_SUBMITTALS,
  isEmptySheetRecord,
  isSafeKey,
  type QuizRecord,
  type RecordData,
  type SheetRecord,
  type Submittal,
} from './schema'

/**
 * An instant's sort position. `validate.ts` accepts an offset (`+03:00`) and a
 * bare date as legitimate instants — a hand-edited export carries both — so
 * lexicographic comparison is wrong: `2026-01-01T10:00:00+03:00` precedes
 * `2026-01-01T08:00:00Z` as text and follows it in time.
 *
 * The string is kept as the tiebreak. Two spellings of the same instant have to
 * resolve the same way whichever side they arrive on, or commutativity dies on
 * a detail no reader could ever see.
 */
function order(instant: string): [number, string] {
  const time = Date.parse(instant)
  return [Number.isFinite(time) ? time : Number.POSITIVE_INFINITY, instant]
}

/** True when `a` sorts strictly before `b`. Total, so ties are decided once. */
function precedes(a: string, b: string): boolean {
  const [at, ax] = order(a)
  const [bt, bx] = order(b)
  return at !== bt ? at < bt : ax < bx
}

function earliest(a: string, b: string): string {
  return precedes(a, b) ? a : b
}

function latest(a: string, b: string): string {
  return precedes(a, b) ? b : a
}

/** Set union of strings, sorted. Sorted because a merge must not depend on which
 *  copy was called `local`; `days` is read as a 14-day window (§7.3) and
 *  `sources` as an unordered list of links (§12.8), so neither loses meaning. */
function unite(a: readonly string[], b: readonly string[]): string[] {
  return [...new Set([...a, ...b])].sort()
}

/**
 * §14.7.2 `quiz` — "the further state wins (`assessed` > answer > null)", so a
 * merge never walks the reader's retrieval attempt backwards.
 *
 * Rank is the whole rule; `at` only breaks a tie between two copies at the same
 * rank, where the later one is the reader's more recent word on it. An assessed
 * quiz therefore beats a newer bare answer, which is intended: `setQuizAnswer`
 * already keeps the assessment across an edit (§12.5.1's flat 60 is for the
 * attempt, and taking it back would penalise the behaviour the evidence
 * supports).
 */
function rankQuiz(quiz: QuizRecord | null): number {
  if (quiz === null) return 0
  if (quiz.assessed === null) return 1
  return 2
}

function mergeQuiz(a: QuizRecord | null, b: QuizRecord | null): QuizRecord | null {
  const ra = rankQuiz(a)
  const rb = rankQuiz(b)
  if (ra !== rb) return ra > rb ? a : b
  if (a === null || b === null) return null
  if (a.at !== b.at) return precedes(a.at, b.at) ? b : a
  // Same rank, same instant, different text: pick by the answer, then by the
  // assessment. Arbitrary but TOTAL — an undecided tie here would make the
  // result depend on argument order for two records the reader cannot tell
  // apart.
  if (a.answer !== b.answer) return a.answer < b.answer ? a : b
  return (a.assessed ?? '') <= (b.assessed ?? '') ? a : b
}

/** The identity `addSubmittal` dedupes on: one entry per repository per sheet. */
function submittalKey(entry: Submittal): string {
  return `${entry.owner.toLowerCase()}/${entry.repo.toLowerCase()}`
}

/**
 * §14.7.2 `submittals` — "union, the last `MAX_SUBMITTALS` by `at`. Reason: no
 * loss."
 *
 * "No loss" and a cap of three (§12.9.1) cannot both hold in full, and the
 * table resolves it in favour of the cap: what a merge must never do is drop an
 * entry that would have survived had the two copies been written on one device.
 * So the union is deduplicated on the same key `addSubmittal` uses, ordered by
 * `at`, and trimmed from the FRONT — the oldest go, exactly as they would have
 * been refused had they been handed in fourth.
 *
 * Result order is `at` ascending, which normalises the insertion order
 * `events.ts` produces. It has to: two devices' insertion orders have no
 * common history to preserve, and `at` is the only ordering both copies agree
 * on.
 */
function mergeSubmittals(a: readonly Submittal[], b: readonly Submittal[]): Submittal[] {
  const byKey = new Map<string, Submittal>()
  for (const entry of [...a, ...b]) {
    const key = submittalKey(entry)
    const held = byKey.get(key)
    if (held === undefined) {
      byKey.set(key, entry)
      continue
    }
    // The same repository handed in on both devices: keep the later `at` — the
    // reader's more recent note and commit. A tie on `at` falls to the note and
    // then the commit, so the choice is total and order-free.
    if (held.at !== entry.at) {
      byKey.set(key, latest(held.at, entry.at) === entry.at ? entry : held)
    } else if (held.note !== entry.note) {
      byKey.set(key, held.note < entry.note ? held : entry)
    } else if ((held.commit ?? '') > (entry.commit ?? '')) {
      byKey.set(key, entry)
    }
  }
  const united = [...byKey.values()].sort((left, right) =>
    left.at === right.at
      ? submittalKey(left) < submittalKey(right)
        ? -1
        : 1
      : precedes(left.at, right.at)
        ? -1
        : 1,
  )
  return united.slice(Math.max(0, united.length - MAX_SUBMITTALS))
}

/**
 * §14.7.2 `checklist[i]` — the table says "last writer per index, reason:
 * independent boxes", and **that rule is not implementable against this
 * record**: §12.7 stores only ticks, keyed by index, with no per-index instant
 * anywhere in `SheetRecord`. There is no clock to ask who wrote last, and
 * `merge.ts` is handed `RecordData`, not two envelopes, so not even `savedAt`
 * is in reach.
 *
 * The union is what is implementable, and it errs in the same direction
 * §14.7.2 chose for `signedOff`: a box the reader ticked on either device stays
 * ticked, so the page cannot come to show less work than was done. The cost is
 * named rather than hidden — an UNTICK performed on one device is lost when
 * another device still holds the tick. That is recoverable (untick again) and
 * silent loss of a tick would not be.
 *
 * Making the table's rule real would need a per-index instant in §12.7's shape;
 * that is a schema change and therefore not this module's decision.
 */
function mergeChecklist(
  a: SheetRecord['checklist'],
  b: SheetRecord['checklist'],
): SheetRecord['checklist'] {
  const merged: SheetRecord['checklist'] = {}
  for (const key of [...Object.keys(a), ...Object.keys(b)].sort()) {
    if (!isSafeKey(key)) continue
    if (a[key] === true || b[key] === true) merged[key] = true
  }
  return merged
}

/**
 * One sheet, field by field. Symmetric in its two arguments — every rule below
 * is a min, a max, a union or a total order, which is what lets §14.2.3 skip
 * the event log.
 */
function mergeSheet(a: SheetRecord, b: SheetRecord): SheetRecord {
  /**
   * §14.7.2 `signedOff` — **the EARLIEST wins**, a deliberate departure from
   * last-write-wins, and the one rule in this file that exists for a reason
   * outside merge theory.
   *
   * A signature is an EVENT, not a current value. Under last-write-wins an old
   * device syncing late would carry `signedOff: null` into a signed sheet and
   * un-sign it: the reader signed that sheet, the record would say they had
   * not, and the page would be lying — the one thing §1 forbids. Taking the
   * earliest makes a signature monotone: it can be created by a merge and never
   * destroyed by one.
   *
   * The consequence is faced, not hidden. An `unsign` performed on one device
   * does not survive a merge with a device that still holds the signature —
   * §14.2.3 keeps the `unsign` row in `learner_event`, so the act is not lost
   * from the history, only from the state. UNSIGN is one click to repeat; a
   * silently un-signed sheet is a lie the reader has no way to notice.
   */
  const signedOff =
    a.signedOff === null
      ? b.signedOff
      : b.signedOff === null
        ? a.signedOff
        : earliest(a.signedOff, b.signedOff)

  /**
   * §14.7.2 `signedRevision` — "the winning signature's", atomic with it.
   * §12.4.3 draws the drift line from this pair, so a revision from one
   * signature beside an instant from another would print a drift warning about
   * a comparison that never happened.
   */
  let signedRevision: string | null = null
  if (signedOff !== null) {
    const fromA = a.signedOff === signedOff
    const fromB = b.signedOff === signedOff
    if (fromA && fromB) {
      // The same instant on both sides: prefer a recorded revision over `null`
      // (§11.25 — absent is not the same as unknown), then the smaller string,
      // so the pair stays deterministic.
      signedRevision =
        a.signedRevision === null
          ? b.signedRevision
          : b.signedRevision === null
            ? a.signedRevision
            : a.signedRevision <= b.signedRevision
              ? a.signedRevision
              : b.signedRevision
    } else {
      signedRevision = fromA ? a.signedRevision : b.signedRevision
    }
  }

  return {
    signedOff,
    signedRevision,
    /**
     * Not in §14.7.2's table. `reachedEnd` is an observation and `events.ts`
     * only ever sets it, so OR is the only rule that agrees with how it is
     * written: a scroll that happened on one device happened.
     */
    reachedEnd: a.reachedEnd || b.reachedEnd,
    /**
     * §14.7.2 `dwellSeconds` — "the larger one. Reason: an observation; adding
     * them would double-count." The two copies overlap in history, so their
     * sum counts the shared prefix twice. The §12.4.4 cap is re-applied because
     * an imported or older record can carry more than it.
     */
    dwellSeconds: Math.min(DWELL_CAP_SECONDS, Math.max(a.dwellSeconds, b.dwellSeconds)),
    quiz: mergeQuiz(a.quiz, b.quiz),
    checklist: mergeChecklist(a.checklist, b.checklist),
    /** §14.7.2 `sources` — set union, "by its nature" (§12.8: distinct URLs). */
    sources: unite(a.sources, b.sources),
    submittals: mergeSubmittals(a.submittals, b.submittals),
  }
}

/**
 * §14.7.2 `identity.name` / `.role` / `.markSeed` — **the ACCOUNT's wins; when
 * the account's is empty the local one is carried up.**
 *
 * This is the asymmetric half of the table and the argument order is the rule:
 * `remote` is the account. `markSeed` matters most — §12.3.5 mints it once and
 * never regenerates it, and the mark is drawn beside every signature the reader
 * has already made, so signing in must not redraw their visible identity.
 * `role` follows §13.3: never inferred, only ever what the reader picked, so a
 * merge may carry a null up but must not invent one.
 *
 * `mark` (the reader's override) is not in the table and is treated the same
 * way, for the same reason: it is the other half of the visible identity, and
 * splitting the two would let sign-in change the drawing while keeping the
 * seed.
 */
/**
 * Empty for the purposes of the two identity rows: §14.7.2 says "the account's
 * wins; when the account's is empty the local one is carried up", and `??`
 * reads only `null` as empty.
 *
 * The distinction is not hypothetical. `validate.ts` does not normalise
 * `identity.name` on read, so a `record_state` row holding `""` — written by
 * hand, or left by an older client — would win against a device where the
 * reader had actually typed their name, and the name would be silently blanked
 * at sign-in. THE CORRECTION LIVES HERE, at the source, rather than in the
 * claim: `sync.ts` takes `merge` as an injected dependency, so a rule enforced
 * only by one particular injection is a rule the next caller gets wrong.
 *
 * Applied to all four fields even though `role`, `mark` and `markSeed` are
 * frozen unions or eight hex characters and cannot legitimately hold `""`. An
 * identity rule that held for one of four fields is a rule nobody remembers.
 */
function blank(value: string | null): boolean {
  return value === null || value.trim() === ''
}

function accountWins<T extends string>(account: T | null, local: T | null): T | null {
  return blank(account) ? local : account
}

function mergeIdentity(
  local: RecordData['identity'],
  remote: RecordData['identity'],
): RecordData['identity'] {
  return {
    name: accountWins(remote.name, local.name),
    markSeed: accountWins(remote.markSeed, local.markSeed),
    mark: accountWins(remote.mark, local.mark),
    role: accountWins(remote.role, local.role),
  }
}

/** Structural equality, so the merge can return its argument unchanged. Cheap:
 *  the record is a few kilobytes of JSON-shaped data with no cycles. */
function same(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ka = Object.keys(a as object)
  const kb = Object.keys(b as object)
  if (ka.length !== kb.length) return false
  return ka.every(
    (key) =>
      Object.hasOwn(b as object, key) &&
      same((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  )
}

/**
 * §14.7.2 — the merge. `local` is this browser's record (the source, §14's
 * local-first stance); `remote` is the account's `record_state.data`.
 *
 * Returns `local` itself when the merge adds nothing, which makes
 * `mergeRecords(a, a)` identity-equal to `a` and lets §14.7.3 stay in `synced`
 * without a write.
 *
 * §14.7.4's claim summary is computed by its caller from the three records, not
 * here: this function decides what the record IS, and counting what changed is
 * a separate question with a separate audience.
 */
export function mergeRecords(local: RecordData, remote: RecordData): RecordData {
  const sheets: RecordData['sheets'] = {}
  for (const slug of [...Object.keys(local.sheets), ...Object.keys(remote.sheets)].sort()) {
    if (!isSafeKey(slug) || Object.hasOwn(sheets, slug)) continue
    const mine = local.sheets[slug]
    const theirs = remote.sheets[slug]
    const merged =
      mine === undefined ? theirs : theirs === undefined ? mine : mergeSheet(mine, theirs)
    // A sheet holding nothing is dropped, exactly as `validate.ts` drops it on
    // read (§11.25). Otherwise a merge would write a shape that comes back
    // different, and every later merge would report a change that is not one.
    if (merged !== undefined && !isEmptySheetRecord(merged)) sheets[slug] = merged
  }

  const merged: RecordData = {
    identity: mergeIdentity(local.identity, remote.identity),
    sheets,
    /** §14.7.2 `days` — set union, "by its nature": a day the reader worked is
     *  a day the reader worked, whichever device recorded it (§7.3). */
    days: unite(local.days, remote.days),
    /** §14.7.2 `prefs` — **local wins**, "a device preference". §12.16's
     *  `charKeys` is an SC 2.1.4 switch about the keyboard in front of the
     *  reader, so the account has no standing to change it. */
    prefs: { ...local.prefs },
    /**
     * Not in §14.7.2's table, and it follows `prefs` rather than `identity`:
     * both fields are claims about THIS browser. §12.11 defines `lastExport` as
     * when the reader last took their record out of this browser, and §12.1.6's
     * `persisted` is this browser's answer from `navigator.storage`. Adopting
     * the account's values would make `NO EXPORT ON RECORD` and the persistence
     * readout say something about a machine the reader is not sitting at, which
     * §12.1.6 forbids by name.
     */
    meta: { ...local.meta },
  }

  return same(merged, local) ? local : merged
}
