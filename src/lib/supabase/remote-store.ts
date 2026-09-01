/**
 * §14.2.2, §14.2.3, §14.7.1 — the only implementation of `RemoteRecordStore`,
 * and the only module that names a column of `record_state` or `learner_event`.
 *
 * Why this file exists separately from `sync.ts`: `sync.ts` owns the state
 * machine (§14.7.3 `off/synced/pending/failed`) and is written against the port
 * in `lib/record/wire.ts`, so its whole decision surface is exercised in node
 * against a fake that fails on demand. Everything that is merely *transport*
 * lives here — one place where camelCase meets snake_case, one place that knows
 * a jsonb column can contain anything, one place that turns a PostgREST error
 * into a rejected promise.
 *
 * Two shapes of that mapping are load-bearing:
 *
 * 1. **The row IS §12.1.2's `Envelope`** (§14.2.2). So a row that comes back
 *    over the network is fed through `validate.ts`'s single entry point, exactly
 *    as a payload out of `localStorage` is. §14.2.2's second consequence —
 *    "`validate.ts` validates what arrives from the network too, no new trust
 *    boundary is opened" — is only true if some module actually does it, and
 *    this is that module. No second validator, no second migration ladder.
 *
 * 2. **`learner_event.id` is minted by the client** (§14.2.3), so an append is
 *    idempotent: `upsert(..., { onConflict: 'id', ignoreDuplicates: true })` is
 *    PostgREST's spelling of `on conflict (id) do nothing`. That is what makes
 *    at-least-once delivery safe, and it is why `sync.ts` may retry a flush
 *    without asking "did some of those already land?".
 *
 * Every method rejects on failure and never returns a partial success. What a
 * rejection MEANS is `sync.ts`'s to decide, per `wire.ts`: a failed read leaves
 * the local record authoritative; a failed write is what the reader must be
 * told about.
 */

import type {
  LearnerEvent,
  Progress,
  RemoteDeleteReceipt,
  RemoteEnvelope,
  RemoteRecordStore,
} from '@/lib/record/wire'
import { parseEnvelope } from '@/lib/record/validate'
import type { SupabaseClient } from '@supabase/supabase-js'

/** §14.2.2. Named once so a typo cannot become a silent second table. */
const RECORD_STATE = 'record_state'
/** §14.2.3. */
const LEARNER_EVENT = 'learner_event'

/**
 * §14.9 — what `progress` reads as before anything has computed it. The column
 * is `not null default '{}'`, so an empty object is a LEGAL row: it is what a
 * client that pushed a record before `progress` existed leaves behind. Callers
 * are typed against `Progress`, so the zero value is produced here rather than
 * letting `{}` travel as a lie about a shape it does not have.
 *
 * A zero `Progress` is honest in a way a guessed one would not be: `derive.ts`
 * is the only thing allowed to fill it in, and it will, on the next write.
 */
const EMPTY_PROGRESS: Progress = {
  signedOff: 0,
  attainable: 0,
  ratio: 0,
  byCategory: {},
  attention: [],
  lastActivity: null,
  days: 0,
}

/** The `record_state` columns this client reads. Listed, never `select('*')`. */
const RECORD_STATE_COLUMNS = 'schema, data, progress, curriculum_rev, saved_at'

interface RecordStateRow {
  schema: unknown
  data: unknown
  progress: unknown
  curriculum_rev: unknown
  saved_at: unknown
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Accepts a stored `progress` only when it is recognisably one. The check is
 * deliberately shallow — a single numeric `signedOff` — because this is a
 * transport guard, not a second definition of the shape: `derive.ts` owns what
 * a `Progress` contains, and duplicating its field list here would be the
 * "second implementation of the same arithmetic" that §14.9 exists to prevent.
 */
function asProgress(value: unknown): Progress {
  if (!isObject(value)) return EMPTY_PROGRESS
  if (typeof value.signedOff !== 'number') return EMPTY_PROGRESS
  return value as unknown as Progress
}

function asNullableText(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

/**
 * Row → `RemoteEnvelope`, the ONE place the column names appear on the way in.
 *
 * `data` is re-serialised and handed to `parseEnvelope` rather than cast. That
 * costs one `JSON.stringify` of a few kilobytes and buys the §14.2.2 property
 * that the network is not a new trust boundary: the migration ladder runs, the
 * coercer runs, and an unreadable row is refused the same way an unreadable
 * `localStorage` payload is. `parseEnvelope` wants text because Web Storage and
 * an imported file both hand it text; the round trip is the price of not having
 * a second entry point into the validator.
 *
 * A quarantine THROWS. That is not data loss: the server row is untouched, and
 * `wire.ts` already says a failed read leaves the local record authoritative.
 * The alternative — returning `null`, i.e. "the account has no record" — would
 * let the next push overwrite a row this build merely failed to understand,
 * which for a `newer` payload (a schema written by a bundle ahead of this one,
 * routine on GitHub Pages with its cached bundles) destroys the newer record.
 * §12.1.2 forbids exactly that.
 */
function fromRecordStateRow(row: RecordStateRow): RemoteEnvelope {
  const savedAt = asNullableText(row.saved_at)
  const parsed = parseEnvelope(
    JSON.stringify({ schema: row.schema, savedAt, data: row.data }),
  )

  if (parsed.kind === 'quarantine') {
    throw new Error(`${RECORD_STATE}: unreadable row (${parsed.reason})`)
  }
  if (parsed.kind === 'empty') {
    throw new Error(`${RECORD_STATE}: row present but carried no envelope`)
  }

  return {
    schema: parsed.schema,
    data: parsed.data,
    // `parseEnvelope` returns null for an instant it cannot vouch for. The
    // column is `not null`, so falling back to the raw text would mean
    // presenting an unvouched string as a date; the epoch is not used either,
    // because a fabricated timestamp is worse than an admitted absent one —
    // `merge.ts` compares these. An empty string is the one value no reader can
    // mistake for a real instant.
    savedAt: parsed.savedAt ?? '',
    progress: asProgress(row.progress),
    curriculumRev: asNullableText(row.curriculum_rev),
  }
}

/**
 * `RemoteEnvelope` → row, the ONE place the column names appear on the way out.
 *
 * `updated_at` is absent ON PURPOSE. §14.2.2 calls `saved_at` "the device's
 * claim" and `updated_at` "the server's witness"; a client that writes the
 * witness column is forging it. See the note in the report: with zero triggers
 * (§14.2, §14.0/8) the column's default only fires on INSERT, so an operator
 * who wants it to move on every update needs a `default now()`-bearing trigger
 * or has to read `saved_at` instead. Either way the answer is not "let the
 * browser set it".
 */
function toRecordStateRow(userId: string, envelope: RemoteEnvelope): Record<string, unknown> {
  return {
    user_id: userId,
    schema: envelope.schema,
    data: envelope.data,
    progress: envelope.progress,
    curriculum_rev: envelope.curriculumRev,
    saved_at: envelope.savedAt,
  }
}

/** §14.2.3 — one event → one row. `received_at` is the server's, like above. */
function toLearnerEventRow(userId: string, event: LearnerEvent): Record<string, unknown> {
  return {
    id: event.id,
    user_id: userId,
    kind: event.kind,
    sheet_slug: event.sheetSlug,
    payload: event.payload,
    at: event.at,
  }
}

/**
 * PostgREST reports failure in the resolved value, not by rejecting. Every call
 * site funnels through here so that the port's contract — "every method may
 * reject" — is actually met, and so that the message names the table and the
 * operation: an RLS refusal and a dropped connection are the same `error` shape
 * to the caller, and the operator reading a report needs to know which write
 * was refused.
 */
function fail(operation: string, error: { message?: string; code?: string } | null): never {
  const code = error?.code ? ` [${error.code}]` : ''
  throw new Error(`${operation} failed${code}: ${error?.message ?? 'unknown error'}`)
}

/**
 * §14.7.1 — binds a signed-in user to the port.
 *
 * `userId` is passed in rather than read from `client.auth.getUser()` on every
 * call, for two reasons. It keeps each method a single round trip, and more
 * importantly it makes the identity of the row EXPLICIT: the caller that just
 * finished the claim flow (§14.7.4) knows which account it merged into, and a
 * store that silently re-asked the auth client could answer with a different
 * user mid-flush after a session change. RLS remains the actual authority —
 * this argument narrows the query, it does not grant anything.
 */
export function createRemoteRecordStore(
  client: SupabaseClient,
  userId: string,
): RemoteRecordStore {
  return {
    async read(): Promise<RemoteEnvelope | null> {
      const { data, error } = await client
        .from(RECORD_STATE)
        .select(RECORD_STATE_COLUMNS)
        .eq('user_id', userId)
        // `maybeSingle`, not `single`: "this account has no record yet" is the
        // FIRST branch of §14.7.4's claim flow, an expected state on every
        // first sign-in, and `single` would report it as an error (`PGRST116`)
        // that the caller would then have to un-mistake for a real failure.
        .maybeSingle()

      if (error) fail(`${RECORD_STATE} read`, error)
      if (data === null) return null
      return fromRecordStateRow(data as unknown as RecordStateRow)
    },

    async write(envelope: RemoteEnvelope): Promise<void> {
      const { error } = await client
        .from(RECORD_STATE)
        // Upsert on the primary key, because §14.7.4 has exactly two cases —
        // no row yet, or a row already merged with — and both end in "write the
        // envelope". `ignoreDuplicates` is NOT set here: unlike the event log,
        // a record write is meant to replace the row. `merge.ts` has already
        // run by this point, so the value written is the merge of both sides,
        // never a blind overwrite of the server's.
        .upsert(toRecordStateRow(userId, envelope), { onConflict: 'user_id' })

      if (error) fail(`${RECORD_STATE} write`, error)
    },

    async appendEvents(events: readonly LearnerEvent[]): Promise<void> {
      // No network call for nothing to say. `sync.ts` flushes on a timer, and
      // most ticks have an empty batch.
      if (events.length === 0) return

      const { error } = await client
        .from(LEARNER_EVENT)
        .upsert(
          events.map((event) => toLearnerEventRow(userId, event)),
          {
            // §14.2.3 — `on conflict (id) do nothing`. The id is the client's,
            // so a resent batch is a no-op and a partially-delivered batch can
            // be resent whole. Note that `ignoreDuplicates` also protects the
            // rows the server already has from being rewritten, which matters
            // because §14.6 gives the client no `update` or `delete` policy on
            // this table at all: an append is the only thing it may do.
            onConflict: 'id',
            ignoreDuplicates: true,
          },
        )

      if (error) fail(`${LEARNER_EVENT} append`, error)
    },

    async deleteRecord(): Promise<RemoteDeleteReceipt> {
      // §14.6 — `record_state` only. The owner's policy is `for all`, so this
      // is permitted; `learner_event` has no delete policy for anyone, which is
      // the design and not an omission (§14.4.3).
      //
      // `.select()` is the whole point of this line, not a flourish. A delete
      // refused by RLS RESOLVES with `error: null` and removes NOTHING — RLS
      // filters `DELETE`, and only `INSERT` raises — so an absent error is not
      // proof the row is gone. Without the returning clause there is no
      // observation to report and every caller has to assume the optimistic
      // answer, which is how §12.15's dialog came to stand by its promise over
      // a row that may have survived.
      //
      // `user_id` and not `*`: the caller needs a COUNT, and shipping the whole
      // envelope back for a row that is being destroyed is bandwidth spent on
      // data nobody reads.
      const { data, error } = await client
        .from(RECORD_STATE)
        .delete()
        .eq('user_id', userId)
        .select('user_id')

      if (error) fail(`${RECORD_STATE} delete`, error)

      return { rows: data?.length ?? 0 }
    },

    async deleteHistory(): Promise<RemoteDeleteReceipt> {
      // §14.6 row 1, via `0003_phase4_erase.sql`. `.select()` for the same
      // reason as above, and here the count is not merely diagnostic: it is the
      // only thing that distinguishes "the history is gone" from "an
      // organisation holds it", because the policy expresses that distinction as
      // a row filter rather than an error.
      const { data, error } = await client
        .from(LEARNER_EVENT)
        .delete()
        .eq('user_id', userId)
        .select('id')

      if (error) fail(`${LEARNER_EVENT} delete`, error)

      return { rows: data?.length ?? 0 }
    },
  }
}
