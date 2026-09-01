/**
 * §14 — the shape of everything that crosses the network, and nothing else.
 *
 * This file exists because §14.7.1 puts five new modules on both sides of one
 * seam: `sync.ts` decides WHEN to talk to the server, `lib/supabase/client.ts`
 * decides HOW, and `progress.ts` decides what the server is told about a
 * record. Each of those is written and tested independently, so the vocabulary
 * they share has to live somewhere neither of them owns.
 *
 * It imports types only, from `schema.ts`, which is fs-free (§12.2's import
 * direction). Nothing here reaches the network, `localStorage`, or `node:fs` —
 * a client island may hold it, and every consumer stays testable in node behind
 * a fake (§12.14.2).
 */

import type { RecordData } from './schema'

/**
 * §14.2.3 — `learner_event.kind` is the reducer's own name, with no
 * translation layer. Every id below is an exported function in
 * `lib/record/events.ts`; if one is renamed there, this union stops compiling,
 * which is the point. The five observations §14.2.3 excludes as noise
 * (`observeDwell`, `markActivity`, `setCharKeys`, `markExported`,
 * `setPersisted`) are deliberately absent: they are already in the envelope.
 */
export type EventKind =
  | 'signOff'
  | 'unsign'
  | 'setIdentity'
  | 'setRole'
  | 'mintMarkSeed'
  | 'setChecklistItem'
  | 'setQuizAnswer'
  | 'assessQuiz'
  | 'addSubmittal'
  | 'removeSubmittal'
  | 'recordSourceOpened'
  | 'observeReachedEnd'

/**
 * §14.2.3 — one row of the append-only log.
 *
 * `id` is minted by the CLIENT, not the database. That is what makes the push
 * idempotent: an event resent after a failed flush lands as
 * `on conflict (id) do nothing`, so at-least-once delivery is safe and the
 * caller never has to ask "did that one get through?".
 *
 * `at` is the device's CLAIM about when this happened. The server stamps
 * `received_at` itself and the two are kept side by side (§14.2.3) rather than
 * reconciled: a clock that is wrong is a fact about the record, and correcting
 * it silently would be inventing data.
 */
export interface LearnerEvent {
  id: string
  kind: EventKind
  sheetSlug: string | null
  payload: Readonly<Record<string, unknown>>
  at: string
}

/**
 * §14.8.1 — one reason a sheet is asking for attention.
 *
 * The three `why` values are the three rules in §14.8.1 and there is no
 * fourth: a flag whose reason cannot be named is a number the reader cannot
 * argue with, which §11.25 forbids.
 */
export interface AttentionFlag {
  sheetSlug: string
  why: 'stalled' | 'quizFailing' | 'overdue'
  /** Days since the last write against this sheet; null when not applicable. */
  idleDays: number | null
  /** Quiz attempts recorded against this sheet. */
  attempts: number
  /** The assignment deadline that has passed, when `why` is `overdue`. */
  dueAt: string | null
}

/**
 * §14.8.1 — what `attention.ts` needs to know about assignments, and NOTHING
 * more. The full `assignments` / `assignment_sheets` shape belongs to
 * `lib/org/`; a pure selector over a record must not depend on it, or the
 * org layer becomes a prerequisite for testing the learner's own page.
 */
export interface AssignedSheet {
  sheetSlug: string
  dueAt: string | null
}

/**
 * §14.9 — `record_state.progress`, the stored output of `derive.ts`.
 *
 * This column exists for exactly one reason and it is not performance: it
 * stops a second implementation of the same arithmetic from being born. The
 * app calls `derive.ts`; Metabase reads this column; SQL computes nothing. A
 * `count(*) / 32.0` written in a dashboard is how a panel comes to say `18/32`
 * while the reader's own page says `17/32`, and §12.5.2 already fixed that
 * question in one place.
 */
export interface Progress {
  signedOff: number
  attainable: number
  ratio: number
  byCategory: Readonly<Record<string, { signedOff: number; attainable: number }>>
  attention: readonly AttentionFlag[]
  lastActivity: string | null
  days: number
}

/**
 * §14.2.2 — one `record_state` row. The first three fields ARE §12.1.2's
 * `Envelope`, unchanged, which is what lets `migrate.ts` and `validate.ts`
 * cover the server with no second ladder and no second validator.
 */
export interface RemoteEnvelope {
  schema: number
  data: RecordData
  savedAt: string
  progress: Progress
  curriculumRev: string | null
}

/**
 * §14.7.1 — the port. `sync.ts` is written against this and never against
 * supabase-js, so its whole state machine (§14.7.3) is exercised in node
 * against a fake that can fail on demand — the pattern `RecordStorage` in
 * `storage.ts` and `ThemeStorage` in `lib/theme.ts` both established.
 *
 * Every method may reject. `sync.ts` owns what a rejection MEANS, because it
 * differs per call: a failed read leaves the local record authoritative, while
 * a failed write is what the reader has to be told about (§14.7.3 `failed`).
 */
export interface RemoteRecordStore {
  /** The signed-in user's row, or null when the account has none yet. */
  read(): Promise<RemoteEnvelope | null>
  write(envelope: RemoteEnvelope): Promise<void>
  /** Idempotent by `LearnerEvent.id`; safe to resend. */
  appendEvents(events: readonly LearnerEvent[]): Promise<void>
  /**
   * §14.6 — removes the account's copy of the envelope, and NOTHING else.
   *
   * It is on the port rather than reached for with a raw client call in the
   * erase dialog for the reason this interface exists at all: every other
   * statement about `record_state` goes through here, and a second path to the
   * same table is a second place for the column names and the user scoping to
   * drift.
   *
   * `learner_event` is deliberately NOT touched. §14.6 keeps an organisation's
   * training history, and §14.4.3 gives that table no delete policy at all, so
   * a port method offering to remove it would be a promise the database
   * refuses. What removes it is closing the account, by cascade.
   */
  deleteRecord(): Promise<RemoteDeleteReceipt>
}

/**
 * What a delete actually did, which is not answerable from its error alone.
 *
 * **A delete refused by row-level security resolves with `error: null` and
 * removes nothing.** RLS is a filter on `UPDATE` and `DELETE`, not a gate: only
 * `INSERT` raises. So "no error" means the statement ran, never that a row is
 * gone, and a port returning `void` gave its caller no way to tell the
 * difference — §12.15's dialog then stood by its promise that the account copy
 * was removed over a row that might still be there.
 *
 * `rows` is what the server reports it removed. Zero is neither an error nor a
 * success: it is the answer "nothing matched", and the reader is entitled to be
 * told that rather than reassured.
 */
export interface RemoteDeleteReceipt {
  rows: number
}
