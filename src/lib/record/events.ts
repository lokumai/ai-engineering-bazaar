/**
 * §12.4, §12.6–§12.9, §12.16 — every write to the record, as a pure reducer.
 *
 * Three rules hold across the whole file, and each of them is load-bearing:
 *
 * 1. **Nothing mutates.** Every function returns a NEW RecordData or the one it
 *    was given. The store keeps the in-memory record authoritative and notifies
 *    subscribers synchronously (§12.1.4); a mutation would leave React with a
 *    snapshot that is identity-equal to the previous one and no re-render.
 * 2. **No clock.** Every function that records a time takes the current ISO
 *    instant as an explicit `now`, so the reducers are deterministic under test
 *    — the same stance `lib/content/` takes on `Date` and `Math.random`. The
 *    caller decides the timezone by choosing what it passes; `store.ts` passes
 *    UTC, so a record stays comparable across travel and machines.
 * 3. **A no-op returns the same object.** `signOff` on an already-signed sheet,
 *    a duplicate source, a full submittal register: all return `data` itself,
 *    so the store can skip the notify and the flush. It also means a reducer
 *    can never rewrite a recorded fact by being called twice.
 *
 * Signatures put `now` last and make it required wherever a write happens, so a
 * caller cannot forget the day-stamp: `days` is what the §7.3 UPTIME strip is
 * drawn from, and an unstamped write would show as a gap the reader did not
 * take.
 */

import {
  DWELL_CAP_SECONDS,
  MAX_SUBMITTALS,
  emptySheetRecord,
  isSafeKey,
  type RecordData,
  type RoleId,
  type SheetRecord,
  type Submittal,
} from './schema'
import type { ClaimReceipt } from './claim'

const MARK_SEED = /^[0-9a-f]{8}$/
const GH_SEGMENT = /^[A-Za-z0-9._-]{1,100}$/
const COMMIT = /^[0-9a-f]{7,40}$/
const EXTERNAL_URL = /^https?:\/\//i
const INSTANT_DAY = /^(\d{4}-\d{2}-\d{2})(?:[T ]|$)/
/** §12.7 — the corpus's longest checklist is 8 items; 4 digits is generous. */
const MAX_CHECKLIST_INDEX = 9999

/**
 * The day an instant falls on, or null when the string is not an instant.
 *
 * The round trip is the range check, not `Date.parse`: MEASURED, V8 parses
 * `2026-02-31` to a finite time by rolling the day into March, and a day the
 * validator would reject on the next read must never be stamped now.
 */
export function dayOf(now: string): string | null {
  const match = INSTANT_DAY.exec(now)
  if (!match) return null
  const day = match[1]
  const parsed = new Date(`${day}T00:00:00.000Z`)
  if (!Number.isFinite(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10) === day ? day : null
}

/** `days` stays sorted and distinct: it is read as a 14-day window (§7.3). */
function stampDay(data: RecordData, now: string): RecordData {
  const day = dayOf(now)
  if (day === null || data.days.includes(day)) return data
  return { ...data, days: [...data.days, day].sort() }
}

/**
 * Reads the sheet's record, hands it to `edit`, and writes the result back with
 * the day stamped. `edit` returns null for "nothing changed", which is how
 * every no-op above reaches the caller as the same object.
 */
function editSheet(
  data: RecordData,
  slug: string,
  now: string | null,
  edit: (sheet: SheetRecord) => SheetRecord | null,
): RecordData {
  if (!isSafeKey(slug)) return data
  const next = edit(data.sheets[slug] ?? emptySheetRecord())
  if (next === null) return data
  const written = { ...data, sheets: { ...data.sheets, [slug]: next } }
  return now === null ? written : stampDay(written, now)
}

/**
 * §12.4.1 — the reader asserts completion; the site never infers it.
 * §12.4.3 — the sheet's REV short hash at this instant is recorded so a
 * completion claim that later becomes false can say so. `null` where git gave
 * no revision: derived or absent (§11.25), never a plausible hash.
 *
 * Already signed off is a no-op, not a re-stamp. The recorded date and revision
 * are facts about a past act; UNSIGN then SIGN OFF is how a reader re-asserts
 * against a new revision.
 */
export function signOff(
  data: RecordData,
  slug: string,
  revision: string | null,
  now: string,
): RecordData {
  return editSheet(data, slug, now, (sheet) =>
    sheet.signedOff !== null
      ? null
      : { ...sheet, signedOff: now, signedRevision: revision },
  )
}

/**
 * §12.4.1 — un-sign is its own undo, which is why neither it nor sign-off gets
 * a confirmation dialog. It clears the assertion and nothing else: the quiz
 * answer, the ticks, the sources and the submittals were separate acts.
 */
export function unsign(data: RecordData, slug: string): RecordData {
  return editSheet(data, slug, null, (sheet) =>
    sheet.signedOff === null && sheet.signedRevision === null
      ? null
      : { ...sheet, signedOff: null, signedRevision: null },
  )
}

/**
 * §12.3 — the name and the chosen mark. Both are nullable and both nulls are
 * legitimate states, not missing data: a reader who skipped the name prints
 * `UNSIGNED`, and a null mark means "use the minted seed".
 *
 * `markSeed` in the patch is IGNORED. §12.3.5 mints it once and never
 * regenerates it, so it has exactly one door — `mintMarkSeed` — and that door
 * only opens when the seed is absent. A name edit that reseeded the mark would
 * retroactively alter every sheet the reader had already signed.
 */
export function setIdentity(
  data: RecordData,
  patch: Partial<RecordData['identity']>,
  now: string,
): RecordData {
  const identity = { ...data.identity }
  if ('name' in patch) identity.name = patch.name ?? null
  if ('mark' in patch) identity.mark = patch.mark ?? null
  return stampDay({ ...data, identity }, now)
}

/**
 * §13.3 — the reader's role, or `null` to clear it. The day is stamped like
 * every other write (§7.3).
 *
 * **Changing a role is not destructive and gets no confirmation.** §12's SC
 * 3.3.4 gate is for acts that lose something, and a path is a view over the
 * corpus rather than a container: sign-offs are recorded against sheets, so
 * switching from `qa` to `devops` leaves every one of them in place and the old
 * path is re-drawable by choosing the old role again. Treating it as destructive
 * would teach the reader that the two are connected, which is the thing §13.4.4
 * says they are not.
 *
 * The role is never inferred, so there is deliberately no reducer here that
 * derives one from the record; this function only ever writes what the reader
 * picked.
 */
export function setRole(data: RecordData, role: RoleId | null, now: string): RecordData {
  if (data.identity.role === role) return data
  return stampDay({ ...data, identity: { ...data.identity, role } }, now)
}

/**
 * §12.3.5 — 8 hex characters, minted ONCE at first sign-off, never derived from
 * the name and never regenerated. The seed is generated by the CALLER, from
 * `crypto.getRandomValues`, so this stays pure and testable.
 */
export function mintMarkSeed(data: RecordData, seed: string, now: string): RecordData {
  if (data.identity.markSeed !== null || !MARK_SEED.test(seed)) return data
  return stampDay({ ...data, identity: { ...data.identity, markSeed: seed } }, now)
}

/**
 * §12.8 — evidence, not currency. Distinct URLs only, and no XP anywhere near
 * it: rewarding an outbound click rewards a proxy, and the documented failure
 * with adult users is XP farming.
 *
 * http(s) only. The record is reprinted as a list of links in the exported
 * document, so a `javascript:` URL must not be able to get into it.
 */
export function recordSourceOpened(
  data: RecordData,
  slug: string,
  url: string,
  now: string,
): RecordData {
  if (!EXTERNAL_URL.test(url)) return data
  return editSheet(data, slug, now, (sheet) =>
    sheet.sources.includes(url) ? null : { ...sheet, sources: [...sheet.sources, url] },
  )
}

/**
 * §12.7 — items are keyed by stable index within the sheet. Only ticks are
 * stored: an unticked box is the default, so unticking deletes the key rather
 * than writing `false`, and no count has to distinguish the two.
 */
export function setChecklistItem(
  data: RecordData,
  slug: string,
  index: number,
  ticked: boolean,
  now: string,
): RecordData {
  if (!Number.isInteger(index) || index < 0 || index > MAX_CHECKLIST_INDEX) return data
  const key = String(index)
  return editSheet(data, slug, now, (sheet) => {
    if ((sheet.checklist[key] === true) === ticked) return null
    const checklist = { ...sheet.checklist }
    if (ticked) checklist[key] = true
    else delete checklist[key]
    return { ...sheet, checklist }
  })
}

/**
 * §14.8.1 rule 2 — is this editing session an attempt worth a log row?
 *
 * Pure, and separated from `QuickCheck` for the reason §5 gives for every
 * decision in this codebase: what counts as an attempt is a rule, the textarea
 * is a binding, and only one of the two can be tested without a browser.
 *
 * `openedWith` is the answer as it stood when the reader took the field, and
 * `null` means the field was never focused. Three refusals, each one a thing a
 * reader plainly did not do:
 *
 *  - **Never focused.** Nothing to file; a blur without a focus is a stray
 *    event, not a try.
 *  - **Unchanged.** Opening a saved answer, reading it and tabbing away is
 *    reading, and filing a row for it would inflate the very tally §14.8.1's
 *    `quizFailing` flag is thresholded on.
 *  - **Emptied.** Deleting an answer is a withdrawal. §11.25's rule is that an
 *    absence is recorded as an absence, never as a zero-length attempt — and
 *    `setQuizAnswer` drops the quiz record entirely in that case, so a row here
 *    would describe a state the envelope no longer holds.
 *
 * The comparison is against the value at FOCUS, not against the last row filed.
 * A ref seeded from the record cannot do this job: the first frame of a static
 * export always has an empty answer (§12.2), so it would read hydration itself
 * as an edit and file a row nobody made.
 */
export function filesAttempt(openedWith: string | null, value: string): boolean {
  if (openedWith === null) return false
  if (value === openedWith) return false
  return value.trim() !== ''
}

/**
 * §12.6 — the retrieval attempt, persisted per sheet. An answer emptied back to
 * nothing drops the record instead of leaving an empty one behind, which keeps
 * the in-memory shape identical to what the validator would read back.
 */
export function setQuizAnswer(
  data: RecordData,
  slug: string,
  answer: string,
  now: string,
): RecordData {
  return editSheet(data, slug, now, (sheet) => {
    const assessed = sheet.quiz?.assessed ?? null
    if (answer.trim() === '' && assessed === null) {
      return sheet.quiz === null ? null : { ...sheet, quiz: null }
    }
    if (sheet.quiz?.answer === answer) return null
    // The assessment survives an edit: the reader already did the retrieval and
    // the 60 XP is for the attempt (§12.5.1), so taking it back would penalise
    // exactly the behaviour the evidence supports.
    return { ...sheet, quiz: { answer, assessed, at: now } }
  })
}

/**
 * §12.6 item 4 — either outcome records the self-assessment and pays the flat
 * 60. §12.4.2 — no third state is ever derived from it: no pass, no grade.
 *
 * There is nothing to assess until an answer has been written; a reveal before
 * an attempt destroys the retrieval effect, which is the one thing here the
 * evidence strongly supports.
 */
export function assessQuiz(
  data: RecordData,
  slug: string,
  assessed: 'matched' | 'missed',
  now: string,
): RecordData {
  return editSheet(data, slug, now, (sheet) => {
    const quiz = sheet.quiz
    if (quiz === null || quiz.answer.trim() === '') return null
    if (quiz.assessed === assessed) return null
    return { ...sheet, quiz: { ...quiz, assessed, at: now } }
  })
}

/**
 * §12.9 — the strongest evidence this system will ever hold, and the only
 * content a third party can independently check. Up to three per sheet.
 *
 * The URL is RECONSTRUCTED from owner and repo here as well as in the
 * validator, because it is the value that becomes an `href`: a link whose text
 * lies about its destination has to be impossible, not merely unlikely
 * (§12.9.2).
 */
export function addSubmittal(
  data: RecordData,
  slug: string,
  submittal: Submittal,
  now: string,
): RecordData {
  const { owner, repo } = submittal
  if (!GH_SEGMENT.test(owner) || !GH_SEGMENT.test(repo)) return data
  const key = `${owner.toLowerCase()}/${repo.toLowerCase()}`
  return editSheet(data, slug, now, (sheet) => {
    if (sheet.submittals.length >= MAX_SUBMITTALS) return null
    const taken = sheet.submittals.some(
      (entry) => `${entry.owner.toLowerCase()}/${entry.repo.toLowerCase()}` === key,
    )
    if (taken) return null
    const entry: Submittal = {
      owner,
      repo,
      url: `https://github.com/${owner}/${repo}`,
      commit: submittal.commit !== null && COMMIT.test(submittal.commit) ? submittal.commit : null,
      note: submittal.note,
      at: submittal.at === '' ? now : submittal.at,
    }
    return { ...sheet, submittals: [...sheet.submittals, entry] }
  })
}

/** Removal is not destructive enough to need the §12.15 dialog: it is one row. */
export function removeSubmittal(data: RecordData, slug: string, index: number): RecordData {
  return editSheet(data, slug, null, (sheet) => {
    if (!Number.isInteger(index) || index < 0 || index >= sheet.submittals.length) return null
    return { ...sheet, submittals: sheet.submittals.filter((_, at) => at !== index) }
  })
}

/**
 * §12.4.4 — an observation, printed as evidence, gating nothing. Accumulated
 * and capped at 3600 s per sheet, so a tab left open overnight cannot dominate
 * the record. It pays no XP (§12.5.1): trace indicators explained 4–7% of the
 * variance in effort, and paying for them makes the reward
 * engagement-contingent, which is where undermining is measured.
 */
export function observeDwell(
  data: RecordData,
  slug: string,
  seconds: number,
  now: string,
): RecordData {
  if (!Number.isFinite(seconds) || seconds <= 0) return data
  return editSheet(data, slug, now, (sheet) => {
    const next = Math.min(DWELL_CAP_SECONDS, sheet.dwellSeconds + Math.round(seconds))
    return next === sheet.dwellSeconds ? null : { ...sheet, dwellSeconds: next }
  })
}

/** §12.4.4 — observed, never a completion criterion (§12.4.1). */
export function observeReachedEnd(data: RecordData, slug: string, now: string): RecordData {
  return editSheet(data, slug, now, (sheet) =>
    sheet.reachedEnd ? null : { ...sheet, reachedEnd: true },
  )
}

/**
 * §16.3 — records that the alias question has been SETTLED for `userId`, and
 * writes NOTHING else. The name itself is `setIdentity`'s to write; the seam
 * calls both inside one store update so a half-written state cannot exist.
 *
 * **Settled, not taken**, and the difference is the F1 defect. This function was
 * unchanged by that repair; what changed is the seam's rule for reaching it.
 * `AccountSync.aliasDecision` used to return early when the record already
 * carried a name, so the flag was written only where an offer was ACCEPTED, and
 * a reader who had typed a name before signing in never got one. Clearing the
 * name then left nothing in the record saying the question had been asked, and
 * the next claim wrote the address over an explicit `REMOVE NAME`. The seam now
 * calls this whenever the decision is made — including the decision to write no
 * name — which is what makes the guard below mean what its name says.
 *
 * This is the only writer of `prefs.aliasNamedFor`, and that single-door rule is
 * what makes clearing the name final: the seam decides only when the flag does
 * not name the current account, so a decision that has been recorded is never
 * re-taken — including on the `TOKEN_REFRESHED`, `INITIAL_SESSION` and cross-tab
 * sign-in events that remint the session object and re-run the effect. A guard
 * held in component state instead would be reset by every one of them; that was
 * the measured failure this field exists to remove. `erase.ts`'s `erasedRecord`
 * is the other side of the same rule: the §12.15 erase carries this field across
 * rather than resetting it, because a reset is a second, silent writer.
 *
 * The day is stamped like every other write (§7.3): the reader signed in, which
 * is something they did.
 *
 * Two ways out return `data` itself, per this file's rule 3. An id that already
 * matches means the offer is already recorded, so there is nothing to write and
 * no day to stamp for it. A blank id is refused rather than stored: the empty
 * string compares unequal to every real account id, so a record carrying one
 * would be re-offered on every load — and `coerceRecordData` would drop it back
 * to null on the next read anyway, which would make the in-memory record differ
 * from what storage returns.
 */
export function noteAliasNamed(data: RecordData, userId: string, now: string): RecordData {
  if (userId.trim() === '') return data
  if (data.prefs.aliasNamedFor === userId) return data
  return stampDay({ ...data, prefs: { ...data.prefs, aliasNamedFor: userId } }, now)
}

/**
 * §17.4 — the last newsworthy claim, recorded. The only writer of
 * `meta.lastClaim`, on `noteAliasNamed`'s single-door rule.
 *
 * **It does not stamp a day, and that is the difference from `noteAliasNamed`.**
 * `days` is the list of dates on which something was written and it is what
 * §7.3's fourteen-day strip draws; a sign-in is not a day the reader worked, and
 * stamping one would inflate the strip with work that did not happen. The receipt
 * carries its own instant in `at`, so nothing is lost by not stamping. `erase.ts`
 * records what the opposite choice cost the alias flag: "a day they had not
 * worked".
 *
 * **One slot.** A second claim replaces the first. The register row is `Last
 * claim`, not a log: §14.2.3's append-only history is the events table, and a
 * growing array in `localStorage` would be a second history with no reader.
 *
 * **It takes no clock.** Every other writer here takes `now` because it stamps
 * a day with it; this one stamps nothing, and the instant the receipt is about
 * is already inside the receipt. A parameter a function does not read is a
 * question the next caller has to ask about, so it is not taken.
 */
export function noteClaim(data: RecordData, receipt: ClaimReceipt): RecordData {
  return { ...data, meta: { ...data.meta, lastClaim: receipt } }
}

/**
 * §12.16 — SC 2.1.4's off switch for single-character shortcuts. Default on for
 * this audience; modifier shortcuts keep working when it is off.
 */
export function setCharKeys(data: RecordData, on: boolean): RecordData {
  if (data.prefs.charKeys === on) return data
  return { ...data, prefs: { ...data.prefs, charKeys: on } }
}

/** §12.15 — `lastExport`, so `NO EXPORT ON RECORD` can be a truthful state. */
/**
 * §7.3 — the reader did something today, and nothing else about the record has
 * to change for that to be true.
 *
 * Every other reducer stamps the day as a side effect of the thing it records.
 * The export needs it on its own, and needs it BEFORE the bytes are frozen: the
 * exported file is the reader's backup (§12.12.6), and a backup written a line
 * before the day was stamped comes back missing a tick the reader earned by
 * doing the export. `lastExport` deliberately does NOT move here — see
 * `markExported`.
 */
export function markActivity(data: RecordData, now: string): RecordData {
  return stampDay(data, now)
}

/**
 * §12.11 — when the reader last took their record out of this browser.
 *
 * Called AFTER the download has actually started, and therefore never present
 * in the file it describes: a file cannot honestly claim an export that had not
 * happened when it was written. The day is stamped separately and earlier, by
 * `markActivity`, because the day IS true of the record being written.
 */
export function markExported(data: RecordData, now: string): RecordData {
  if (data.meta.lastExport === now) return data
  return stampDay({ ...data, meta: { ...data.meta, lastExport: now } }, now)
}

/**
 * §12.1.6 — the QUERIED answer from `navigator.storage`, including `false`,
 * which is normal and not an error. `null` means not yet queried, and the
 * readout must never print a value that has not been (§12.1.6).
 *
 * No day is stamped: this is the browser answering a question, not the reader
 * doing work, and the UPTIME strip is a record of the reader's days.
 */
export function setPersisted(data: RecordData, granted: boolean | null): RecordData {
  if (data.meta.persisted === granted) return data
  return { ...data, meta: { ...data.meta, persisted: granted } }
}
