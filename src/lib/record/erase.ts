/**
 * §12.15 — the erase, as arithmetic, plus the two direct key reads §12.11
 * item 7 needs.
 *
 * The arithmetic is here for the reason `lib/record/keys.ts` and
 * `lib/figure/zoom.ts` both state for themselves: what a typed confirmation
 * counts as, what the dialog enumerates, and how long the undo window has left
 * are decisions, and a decision belongs somewhere a node test can reach it
 * with no DOM (§12.14.2). What is left for `EraseDialog` is three pieces of
 * state and a Radix wrapper.
 *
 * **Why the raw reads live here rather than in `storage.ts`.** §12.11 item 7
 * prints the stored strings **verbatim** — the cheapest possible proof that
 * §1's rule extends all the way down to the storage layer — and re-serialising
 * the in-memory record instead would defeat the entire point of the section: a
 * reconstruction proves nothing about what is on disk. That read has to bypass
 * `readRecord`'s parse, and §12.1.1 confines every such access to
 * `src/lib/record/`, so it cannot sit in the component that renders it. It is
 * the same key-level access the erase itself needs — the two keys this file
 * removes are exactly the two it prints — so they are one concern and they are
 * in one place.
 *
 * Both take the port as an argument and are therefore testable behind a
 * Map-backed fake, the pattern `storage.ts` established; the two wrappers below
 * them are what a component calls.
 *
 * **§14.6 added a second half to the erase, at the bottom of this file.** The
 * record now lives in a `record_state` row as well as in two storage keys, so
 * an erase that stopped at the keys would be a control lying about its reach.
 * That half is port-shaped for exactly the reason the first half is: this
 * module imports no supabase-js and knows nothing about a session, so every
 * branch of it — including the one where the delete fails after the local data
 * is already gone — is exercised in node.
 */

import type { tally } from './derive'
import { RECORD_QUARANTINE_KEY, RECORD_STORAGE_KEY } from './schema'
import { safeStorage, type RecordStorage } from './storage'

/** §12.15 — the word that gates the danger button. */
export const ERASE_WORD = 'ERASE'

/**
 * §12.15 — the typed confirmation.
 *
 * **Trimmed and case-folded, deliberately.** The gate exists to make the act
 * deliberate, which typing five letters already is; failing a reader who typed
 * `erase ` because of a trailing space or a lower-case `e` would refuse the
 * exact act that was asked for, and the reader's only recourse would be to
 * guess at whitespace they cannot see. Internal whitespace is NOT collapsed:
 * `E R A S E` is five letters and four spaces, not the word.
 *
 * The label prints `ERASE` because §12.14.1's readout register is uppercase,
 * not because the case is the test. `toUpperCase` is safe without a locale
 * here for a reason worth writing down: the word contains no `i`, so the
 * Turkish dotted/dotless mapping — the one casing trap this audience actually
 * hits (§12.3.4) — cannot reach it.
 */
export function confirmsErase(typed: string): boolean {
  return typed.trim().toUpperCase() === ERASE_WORD
}

/**
 * What the dialog counts. Taken from `tally` rather than restated, so the
 * dialog and the record cannot disagree about how much there is; the import is
 * type-only, which crosses no boundary (§12.2).
 */
export type EraseTally = ReturnType<typeof tally>

/** §12.15 — "7 sheet states, 1 name, 3 submittals" is answerable. "Are you sure?" is not. */
export const NOTHING_RECORDED = 'NOTHING RECORDED IN THIS BROWSER'

function count(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`
}

/**
 * §12.15 — the actual counts, one clause each, **zeros omitted**.
 *
 * A zero is not something erase will destroy, and listing `0 submittals`
 * beside two real counts pads the list the reader is meant to read. All five
 * of `tally`'s fields are offered rather than §12.15's three: quizzes and
 * sources opened are the reader's own work too, and a dialog that enumerated
 * three of the five things it deletes would be understating itself.
 *
 * A record with nothing in it returns an empty list, and the dialog then
 * prints `NOTHING RECORDED IN THIS BROWSER` — which is the truth, and is why
 * the control is not disabled at zero data (§12.13).
 */
export function eraseTallyLines(t: EraseTally): string[] {
  const lines: string[] = []
  if (t.sheets > 0) lines.push(count(t.sheets, 'sheet state', 'sheet states'))
  if (t.name > 0) lines.push(count(t.name, 'name', 'names'))
  if (t.submittals > 0) lines.push(count(t.submittals, 'submittal', 'submittals'))
  if (t.quizzes > 0) lines.push(count(t.quizzes, 'self-check', 'self-checks'))
  if (t.sources > 0) lines.push(count(t.sources, 'source opened', 'sources opened'))
  return lines
}

/** The same enumeration as one line, for a live region that has to read it out. */
export function eraseTallySentence(t: EraseTally): string {
  const lines = eraseTallyLines(t)
  return lines.length === 0 ? NOTHING_RECORDED : lines.join(', ')
}

/** §12.15 — `ERASED · UNDO AVAILABLE FOR 10 s`. Ten seconds, to the millisecond. */
export const UNDO_WINDOW_MS = 10_000

const UNDO_WINDOW_SECONDS = UNDO_WINDOW_MS / 1000

/**
 * Seconds still on the clock, rounded UP so the last fraction of a second is
 * offered rather than rounded away, and clamped at both ends.
 *
 * The upper clamp is not defensive noise: `Date.now()` can move backwards —
 * an NTP correction, a reader changing the system clock — and without it the
 * line would offer an undo window longer than the one it promised.
 *
 * A non-finite instant yields 0. There is no window we can vouch for, and
 * §11.25's rule is that an unmeasurable value is absent, never guessed.
 */
export function undoSecondsLeft(erasedAt: number, now: number): number {
  if (!Number.isFinite(erasedAt) || !Number.isFinite(now)) return 0
  const remaining = erasedAt + UNDO_WINDOW_MS - now
  if (remaining <= 0) return 0
  return Math.min(UNDO_WINDOW_SECONDS, Math.ceil(remaining / 1000))
}

export function undoAvailable(erasedAt: number, now: number): boolean {
  return undoSecondsLeft(erasedAt, now) > 0
}

/**
 * §12.15's status line. Uppercase `S`, following the `UPTIME 6D` precedent the
 * strip in `Uptime.tsx` already sets: these lines are readouts, and a readout
 * on this site is uppercase mono with no terminal period (§12.14.1).
 *
 * Only meaningful above zero — at zero the window is over and the caller
 * prints `UNDO_CLOSED` instead, because an offer of `FOR 0 S` is an offer of
 * nothing.
 */
export function undoLabel(secondsLeft: number): string {
  return `ERASED · UNDO AVAILABLE FOR ${secondsLeft} S`
}

/** The window shut. Stated, rather than the offer silently disappearing. */
export const UNDO_CLOSED = 'ERASED · UNDO WINDOW CLOSED'

/**
 * §12.11 item 7 — both stored strings, exactly as they sit in Web Storage.
 *
 * `null` means the key is absent, which is a different fact from an empty
 * record and is printed as one. Nothing is parsed, nothing is pretty-printed
 * and nothing is truncated: a verbatim value that had been reformatted on the
 * way out would no longer be evidence of anything.
 */
export interface RawStored {
  record: string | null
  quarantine: string | null
}

export function rawStoredFrom(storage: RecordStorage | null): RawStored {
  if (storage === null) return { record: null, quarantine: null }
  return { record: get(storage, RECORD_STORAGE_KEY), quarantine: get(storage, RECORD_QUARANTINE_KEY) }
}

function get(storage: RecordStorage, key: string): string | null {
  try {
    return storage.getItem(key)
  } catch {
    // §12.1.4 — every read is inside try/catch, the property access included.
    // A key that could not be read is reported absent rather than invented.
    return null
  }
}

/**
 * §12.15 — the keys go, both of them.
 *
 * The quarantined copy (§12.1.2) is the reader's data as much as the live
 * record is, so an erase that left it behind would not be the erase the dialog
 * described — and §12.1.2's whole justification for keeping that copy is that
 * nobody chose to lose it. Here somebody did.
 *
 * Removal, not an empty envelope written over the top: item 7 prints these
 * keys, and `NO VALUE STORED UNDER THIS KEY` is the only reading of that panel
 * that agrees with the word "erase".
 */
export function clearStored(storage: RecordStorage | null): void {
  if (storage === null) return
  for (const key of [RECORD_STORAGE_KEY, RECORD_QUARANTINE_KEY]) {
    try {
      storage.removeItem(key)
    } catch {
      // A refusal here leaves the value in place; the in-memory record is
      // still cleared by the caller, and the raw panel will keep printing what
      // is actually there — which is the honest outcome, not a silent one.
    }
  }
}

/**
 * §12.15 — the other half of a reversible erase.
 *
 * The live record comes back through the store, which is where a record
 * belongs; the quarantined copy is a raw string this code never parsed, so the
 * only faithful way to put it back is to write the same bytes again. Without
 * this, `UNDO` would restore part of what it erased and say nothing about the
 * rest — a control lying about what it is, which is the §1 failure the whole
 * undo window exists to avoid.
 *
 * `null` restores nothing, which is right: there was nothing under the key.
 */
export function restoreQuarantine(storage: RecordStorage | null, raw: string | null): void {
  if (storage === null || raw === null) return
  try {
    storage.setItem(RECORD_QUARANTINE_KEY, raw)
  } catch {
    // Quota, or a browser refusing to store anything. The live record has
    // already been restored through the store, and the raw panel keeps
    // printing what is actually under the key either way.
  }
}

/** What a component calls. The port is obtained the one sanctioned way. */
export function readRawStored(): RawStored {
  return rawStoredFrom(safeStorage())
}

export function eraseStored(): void {
  clearStored(safeStorage())
}

export function restoreStoredQuarantine(raw: string | null): void {
  restoreQuarantine(safeStorage(), raw)
}

/* ---------------------------------------------------------------------------
 * §14.6 — the account copy.
 *
 * Phase 4's whole job is that the record now exists in a second place, so
 * §12.15's erase acquired a second half. §14.6's table is three rows:
 *
 *   not in any org           record_state deleted   learner_event deleted
 *   in an org                record_state deleted   learner_event SURVIVES
 *   account closed entirely  both deleted, by `on delete cascade`
 *
 * What the CLIENT can perform is all three rows, and this comment used to say
 * otherwise. `0002_phase4_rls.sql` gives `record_state` an owner policy `for
 * all`, so deleting one's own row is permitted. It gave `learner_event` no
 * delete policy at all — and `0003_phase4_erase.sql` added one, narrow: a
 * reader may delete their own event rows while NO organisation holds them.
 *
 * The paragraph that stood here described 0002's world and survived 0003
 * unchanged, so this file and that migration contradicted each other about
 * whether the policy existed; meanwhile no code called the delete, so the row
 * 0003 was written to make performable stayed unperformable. Both are fixed:
 * the port has `deleteHistory`, `eraseAccountCopy` calls it, and the receipt
 * carries what each half removed.
 *
 * RLS filters `delete`, so a member's attempt removes nothing and reports no
 * error. Zero history rows is therefore §14.6's second row working, never a
 * failure, and the dialog keeps saying what it always said about an
 * organisation's log: see `ERASE_ORG_HISTORY`.
 *
 * PORT-SHAPED, for the reason `storage.ts` states for `RecordStorage`: this
 * module imports no supabase-js, knows nothing about a session, and stays
 * testable in node (§12.14.2). The caller hands in the delete; this file owns
 * only the decision about what its failure MEANS, which is the part a reader
 * is affected by.
 * ------------------------------------------------------------------------- */

/**
 * The one thing the caller supplies: a function that removes this account's
 * `record_state` row. It resolves on success and may reject; the resolved
 * VALUE is inspected too — see `eraseRemote`.
 *
 * `unknown` rather than `void` on purpose: the natural argument at the call
 * site is a PostgREST builder's promise, whose value is a response object, and
 * a signature that refused it would push the caller into a wrapper whose only
 * job is to throw the value away.
 */
export type RemoteRecordDeleter = () => Promise<unknown>

/**
 * §14.6 — the three answers, and there are exactly three because a reader
 * needs to be told a different thing in each.
 *
 *  - `signed-out` — there was no account copy to remove. Not a failure, and
 *    not something to report as one: a signed-out reader who is warned that
 *    "the account copy may remain" would be chasing a row that never existed.
 *  - `deleted` — the row is gone. The dialog's standing copy already said this
 *    would happen, so there is nothing extra to say.
 *  - `failed` — either the server reported an error, or it reported removing
 *    nothing. The local erase HAS ALREADY HAPPENED and cannot be undone
 *    beyond §12.15's ten-second window, so this outcome can never be retried
 *    into silence. It must be stated. `reason` is for the reader-facing detail
 *    line and for a report, never for a decision.
 */
/**
 * The `reason` for a delete the server accepted while removing no row.
 *
 * Lower case and no terminal period, because it is composed into a sentence
 * rather than printed as a readout, and it states the observation instead of
 * naming a cause: from the browser, an RLS refusal and a row that was never
 * there produce the identical answer, and guessing between them would be
 * §11.25's exact prohibition.
 */
export const NOTHING_REMOVED = 'the server removed no row'

export type RemoteEraseOutcome =
  | { kind: 'signed-out' }
  | { kind: 'deleted' }
  | { kind: 'failed'; reason: string }

/**
 * A rejection's message, without inventing one.
 *
 * §11.25's rule again: an unmeasurable value is absent, never guessed. A
 * thrown non-Error is stringified because that is what it actually was; an
 * empty message becomes the one honest phrase rather than a blank clause in
 * the middle of a sentence.
 */
export function eraseFailureReason(thrown: unknown): string {
  const raw = thrown instanceof Error ? thrown.message : String(thrown)
  const trimmed = raw.trim()
  return trimmed === '' ? 'no reason reported' : trimmed
}

/**
 * A resolved PostgREST response carrying an error, which is the trap this
 * whole check exists for: **PostgREST reports failure in the RESOLVED VALUE,
 * not by rejecting.** A `.delete()` dropped by the network resolves happily
 * with `{ error }`, so an `eraseRemote` that trusted a resolution would print
 * "removed from your account" over a row that is still there — precisely the
 * §1 failure this section was written to fix.
 *
 * An RLS refusal does not even do that much: it resolves with `error: null` and
 * removes nothing, because RLS FILTERS `delete` and only `insert` raises. No
 * error inspection can catch that one, which is what `resolvedRows` is for.
 *
 * `remote-store.ts` funnels its own calls through a `fail()` helper for the
 * same reason. This is the belt to that braces: a caller who passes the
 * builder promise straight in, which the signature above deliberately allows,
 * is covered here rather than punished for it.
 */
function resolvedError(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null
  const error = (value as { error?: unknown }).error
  if (error === null || error === undefined) return null
  if (typeof error === 'object' && 'message' in error) {
    return eraseFailureReason(new Error(String((error as { message?: unknown }).message ?? '')))
  }
  return eraseFailureReason(error)
}

/**
 * How many rows the delete reports removing, or `null` from a deleter that does
 * not say.
 *
 * Absent is not treated as zero. A `RemoteRecordStore` always returns a receipt
 * (`RemoteDeleteReceipt`), so the only callers that report nothing are test
 * doubles standing in for a port, and reading their silence as "nothing was
 * deleted" would make every such test assert a failure it did not arrange.
 * Production cannot reach that branch, because the type will not let it.
 */
function resolvedRows(value: unknown): number | null {
  if (typeof value !== 'object' || value === null) return null
  const rows = (value as { rows?: unknown }).rows
  return typeof rows === 'number' ? rows : null
}

/**
 * §14.6 — erase the account copy, and decide what to tell the reader.
 *
 * `null` deleter means "no session", which is how a signed-out reader reaches
 * §12.15 at all: `/profile/` works with no account (§14.0), and an erase there
 * is complete when the two keys are gone. Requiring a session would be a
 * disclosure lie in the other direction.
 *
 * Never throws. The local erase is already done by the time this runs — the
 * keys go first, because a reader who asked for the local data to go must get
 * that whatever the network says — so a throw here could only turn an
 * irreversible act into an unhandled rejection. The outcome is the return
 * value, and stating it is the caller's obligation, not an option.
 */
export async function eraseRemote(
  deleter: RemoteRecordDeleter | null,
): Promise<RemoteEraseOutcome> {
  if (deleter === null) return { kind: 'signed-out' }
  try {
    const resolved = await deleter()
    const reported = resolvedError(resolved)
    if (reported !== null) return { kind: 'failed', reason: reported }
    // The row count, and the reason this is not an `if (error)` and done. A
    // delete filtered away by RLS resolves with no error and removes nothing,
    // so a resolution is evidence that the statement RAN and never evidence
    // that the row is gone. Zero rows after a push that just wrote one is not a
    // success to report quietly: the reader is told the account copy may remain,
    // which is the same thing they are told when the connection drops, because
    // from here the two are the same fact.
    if (resolvedRows(resolved) === 0) return { kind: 'failed', reason: NOTHING_REMOVED }
    return { kind: 'deleted' }
  } catch (thrown) {
    return { kind: 'failed', reason: eraseFailureReason(thrown) }
  }
}

/**
 * §14.6, §12.14.1 — the readout for a delete that did not go through.
 *
 * Uppercase mono with no terminal period, the register `UNDO_CLOSED` and
 * `UPTIME 6D` already set. It says ERASED HERE rather than ERASED, because the
 * local half did succeed and a reader deciding what to do next needs to know
 * which half is outstanding.
 */
export const REMOTE_ERASE_FAILED = 'ERASED HERE · ACCOUNT COPY MAY REMAIN'

/**
 * The sentence under that readout.
 *
 * Three things it has to do, in this order, because that is the order the
 * reader's questions arrive in: confirm what DID happen, admit what may not
 * have, and name the two ways out. "May remain" and not "remains": a refused
 * delete and a dropped connection are indistinguishable from here, and
 * asserting either would be a page claiming a server state it cannot see.
 */
export const REMOTE_ERASE_FAILED_NOTE =
  'The record is gone from this browser. The delete of what your account holds '
  + 'did not go through, so it may still be there. Erasing again while signed '
  + 'in retries it; closing your account removes it for certain.'

/**
 * What to print for an outcome, or null when the standing copy already said
 * it. Only `failed` speaks: a delete that worked is what the dialog promised,
 * and an extra line confirming the promise it just kept trains a reader to
 * stop reading these lines.
 */
export function remoteEraseNote(outcome: RemoteEraseOutcome): string | null {
  return outcome.kind === 'failed' ? REMOTE_ERASE_FAILED_NOTE : null
}

/* ---------------------------------------------------------------------------
 * §14.6 — the disclosure, as three sentences a node test can read.
 *
 * These live here rather than only in `EraseDialog`'s `ERASE_COPY` for the
 * reason §12.14.2 gives for every string on this site that carries a promise:
 * Radix portals into `document.body`, so the open dialog's markup is
 * unreachable in a unit test — the strings are not. `ERASE_COPY` composes them
 * and renders them; the wording is settled here, beside the function whose
 * behaviour it describes, so the two cannot drift.
 *
 * BEFORE THIS SECTION the dialog said "It changes nothing on any other device,
 * and nothing anywhere else: the record was never sent anywhere." That was
 * true in Phase 3 and became false the moment `record_state` existed. It is
 * gone. `/join/`'s §14.5.1 panel states the same table in the same terms, and
 * the two pages have to agree, because they are the two screens whose whole
 * job is this disclosure (§1).
 * ------------------------------------------------------------------------- */

/** Row 1 and row 2's first column: `record_state` is deleted either way. */
export const ERASE_SCOPE =
  'This removes the record from this browser, including the copy set aside '
  + 'from a version of the site this one could not read, and it removes the '
  + 'copy your account holds.'

/**
 * Row 2's second column, which is the one that surprises people: the log
 * SURVIVES. Stated as ownership rather than as a limitation of this button,
 * because that is what it is — §14.3 makes the organisation's training record
 * the organisation's, and §14.5.1's joining screen says so before the reader
 * joins, not after.
 */
export const ERASE_ORG_HISTORY =
  'The training history an organisation already holds is not removed: that '
  + 'log belongs to the organisation.'

/** Row 3. Both tables, by `on delete cascade`, and only this way. */
export const ERASE_CLOSE_ACCOUNT =
  'Only closing your account removes that history.'
