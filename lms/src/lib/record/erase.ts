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
