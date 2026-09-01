/**
 * §14.7.3 — the sync state machine. The ONLY module that decides WHEN the
 * server is talked to, and the only one that owns what a rejection means.
 *
 * It is written against `RemoteRecordStore` (`wire.ts`) and imports neither
 * supabase-js nor anything under `lib/supabase/`. That is not layering
 * hygiene for its own sake: every branch below is a claim the footer makes
 * about the reader's data, so every branch has to be reachable in node against
 * a fake that fails on demand (§12.14.2, §14.12). A machine whose failure
 * paths can only be exercised by unplugging a cable is a machine whose failure
 * paths are untested.
 *
 * **The one rule, inherited verbatim from `writeRecord` (§12.1.4): a local
 * write never waits for the network, and the page never claims `synced` when
 * it is not.** §12.2's Channel A reads `localStorage` synchronously before
 * first paint and a `fetch` cannot be synchronous, so the network is not
 * merely off the fast path — it cannot be on it. Everything here that touches
 * the port is therefore initiated by the caller AFTER the local write has
 * already happened, and `localWrite`/`enqueue` return `void`-shaped results
 * that no caller can accidentally await into a dependency.
 *
 * Three collaborators are INJECTED rather than imported, and each for a
 * reason:
 *
 *   * `merge` — §14.7.2's field-by-field rules live in `merge.ts`. If they
 *     were imported here, the state machine's tests would depend on the merge
 *     table and vice versa; injected, `claim` is tested with a merge that
 *     simply returns a sentinel.
 *   * `progressOf` — §14.9 exists to keep the arithmetic single-valued. This
 *     module must not become its second home, so it is handed the function
 *     `derive.ts` already backs.
 *   * `hydrate` — §14.2.2's second consequence is that `migrate.ts` and
 *     `validate.ts` cover the server too, because the row IS the envelope.
 *     That happens at this seam. Returning `null` means "this code cannot read
 *     what the server sent", which is handled exactly like a rejected read:
 *     local stays authoritative.
 *
 * No module-level singleton, no timer. `createSync` returns an instance; the
 * clock and id minting are arguments. A test that cannot control time is a
 * test that either sleeps or flakes.
 */

import { SCHEMA_VERSION, type RecordData } from './schema'
import type {
  EventKind,
  LearnerEvent,
  Progress,
  RemoteEnvelope,
  RemoteRecordStore,
} from './wire'

/**
 * §14.7.3 — the four states, and each one is a CLAIM, not an internal phase:
 *
 *   off      not signed in — nothing is being asserted about a server
 *   synced   local equals server
 *   pending  local is ahead, a push is owed
 *   failed   a push was attempted and did not land
 *
 * `failed` is the one that earns its keep. It is what puts §12.15's export
 * beside the readout while the only copy of the record is still in that one
 * browser.
 */
export type SyncState = 'off' | 'synced' | 'pending' | 'failed'

/**
 * The transitions, as data. Each variant is something that HAPPENED, never an
 * instruction — `nextSyncState` decides what it means, which is what makes the
 * whole machine a pure function testable row by row.
 *
 * `pushLanded.stale` is the subtle one: it is true when the record changed
 * while the push was in flight, so what landed on the server is already behind
 * what is in memory. Reporting `synced` there would be the §1 violation in its
 * purest form — the write succeeded, and the claim is still false.
 */
export type SyncSignal =
  | { kind: 'signedIn' }
  | { kind: 'signedOut' }
  | { kind: 'localWrite' }
  | { kind: 'pushStarted' }
  | { kind: 'pushLanded'; stale: boolean }
  | { kind: 'pushFailed' }
  | { kind: 'readFailed' }

/**
 * §14.7.3 as a total function. Pure, no clock, no port — the same discipline
 * `events.ts` holds itself to.
 *
 * Two decisions the spec leaves open are made here, and both fall out of "no
 * page may lie":
 *
 * 1. **Signing in yields `pending`, never `synced`.** At that instant nothing
 *    has been exchanged, so "local equals server" is unverified even when both
 *    sides happen to be empty. A push is owed if only to create the row.
 * 2. **`failed` is sticky under a local write.** A reader who edits after a
 *    failed push is still a reader whose record exists in one browser only;
 *    relabelling that `pending` would retire the export advice on the strength
 *    of a keystroke. Only a landed push clears it.
 *
 * `pushStarted` deliberately changes nothing. An in-flight retry is not
 * progress, and showing one as such would flicker `failed` off and back on.
 */
export function nextSyncState(state: SyncState, signal: SyncSignal): SyncState {
  if (signal.kind === 'signedOut') return 'off'
  if (signal.kind === 'signedIn') return 'pending'
  // Nothing that happens while signed out can make a claim about a server.
  if (state === 'off') return 'off'

  switch (signal.kind) {
    case 'localWrite':
      return state === 'failed' ? 'failed' : 'pending'
    case 'pushLanded':
      return signal.stale ? 'pending' : 'synced'
    case 'pushFailed':
      return 'failed'
    // A read that rejects leaves the local record authoritative (§14.7.3) and
    // says nothing about whether a push is owed, so it says nothing at all.
    case 'readFailed':
    case 'pushStarted':
      return state
  }
}

/**
 * §14.2.3 — the log's in-memory tail, bounded.
 *
 * §14.7.1's "no queue" is about the ENVELOPE, and it is true of it: the
 * envelope is whole-state, so `localStorage` is written every time and the
 * latest envelope is what gets sent whenever the network returns — there is
 * nothing to accumulate. `learner_event` is append-only ROWS, so §14.7.3's
 * at-least-once delivery necessarily has a tail, and this is it.
 *
 * The cap exists because a long session against a dead server is unbounded
 * otherwise. Overflow drops the OLDEST entries: the envelope already carries
 * the current state (Decision 6), so what a drop costs is the granularity of
 * how the reader got there, and the recent story is the part worth keeping.
 */
export const MAX_QUEUED_EVENTS = 500

/** What a failed push could not get through — for the footer's detail line. */
export type SyncFailure = 'state' | 'events'

export interface SyncSnapshot {
  state: SyncState
  /** Authoritative in memory whatever the network did (§12.1.4's stance). */
  record: RecordData
  /** Events awaiting a flush. Non-zero with `synced` is impossible. */
  queued: number
  lastFailure: SyncFailure | null
}

/** §14.7.4 — what claiming an anonymous record turned out to be. */
export type ClaimOutcome =
  | { kind: 'off'; record: RecordData }
  /**
   * §14.6 — the account's row was removed while this claim was reading it, so
   * the claim writes nothing and pushes nothing. There is nothing to tell the
   * reader: they asked for the record to go and the erase dialog already
   * reported what happened to each half.
   */
  | { kind: 'abandoned'; record: RecordData; state: SyncState }
  /** No row on the server: the local envelope is pushed as-is. */
  | { kind: 'adopted'; record: RecordData; state: SyncState }
  /** A row existed; `record` is `merge(local, remote)` (§14.7.2). */
  | {
      kind: 'merged'
      record: RecordData
      local: RecordData
      remote: RecordData
      state: SyncState
    }
  /**
   * The read rejected, or `hydrate` refused what came back. Local stays
   * authoritative and NOTHING is pushed — a push here could overwrite a server
   * row this code was unable to read, which is the one way this module could
   * destroy data.
   */
  | { kind: 'unreadable'; record: RecordData; state: SyncState }

export interface SyncDeps {
  /** §14.7.2's rules, injected. Must be pure; never called with a clock. */
  merge: (local: RecordData, remote: RecordData) => RecordData
  /** §14.9 — `derive.ts`'s output, so no second arithmetic is born here. */
  progressOf: (data: RecordData) => Progress
  /** Which curriculum `progressOf` was computed against (§14.9). */
  curriculumRev?: string | null
  /** ISO instant. UTC by convention, as `store.ts`'s `nowIso` (§12.1.4). */
  now: () => string
  /**
   * §14.2.3 — ids are minted on the CLIENT. That is what makes a resend land
   * as `on conflict (id) do nothing`, so nothing here has to remember whether
   * an event already got through.
   */
  newId: () => string
  /** §14.2.2 — where `migrate.ts`/`validate.ts` meet the network. */
  hydrate?: (envelope: RemoteEnvelope) => RecordData | null
  /** Starting in-memory record, before the first local write. */
  initial: RecordData
}

export interface Sync {
  snapshot(): SyncSnapshot
  state(): SyncState
  /** Synchronous, like `store.ts`'s notify: the footer must not lag a frame. */
  subscribe(listener: () => void): () => void
  signIn(remote: RemoteRecordStore): void
  signOut(): void
  /**
   * The local write has ALREADY happened when this is called. It records what
   * is now authoritative and that a push is owed. It returns nothing to await,
   * by construction.
   */
  localWrite(record: RecordData, savedAt?: string): void
  /** Mints and queues one log row. Returns null while `off`. */
  enqueue(
    kind: EventKind,
    sheetSlug: string | null,
    payload?: Readonly<Record<string, unknown>>,
    at?: string,
  ): LearnerEvent | null
  /** Attempts a push. Serialised against other pushes; never overlaps. */
  push(): Promise<SyncState>
  /** §14.7.4. */
  claim(): Promise<ClaimOutcome>
  /**
   * §14.6 — invalidate any claim currently in flight.
   *
   * A claim reads the account's row and then writes a merge of it into this
   * machine. An erase landing between those two steps made the write a
   * RESURRECTION: `record` was replaced by a merge computed from a row that no
   * longer exists, and the push that follows recreated it. MEASURED, and
   * intermittently — the erase's own `push()` is gated on `claimed`, which the
   * in-flight claim has not yet set, so it sent nothing and deleted, and the
   * claim then pushed the pre-erase record over the deletion.
   *
   * `claimed` is set to true here, deliberately. It guards against sending
   * before the account's row has been read, and after an erase there is no row
   * left to lose — so an ordinary write made afterwards should push as usual
   * rather than wait for a claim that will not come.
   */
  abandonClaim(): void
}

export function createSync(deps: SyncDeps): Sync {
  const hydrate = deps.hydrate ?? ((envelope: RemoteEnvelope) => envelope.data)

  let remote: RemoteRecordStore | null = null
  let state: SyncState = 'off'
  let record: RecordData = deps.initial
  let savedAt: string | null = null
  let queue: LearnerEvent[] = []
  let lastFailure: SyncFailure | null = null

  /**
   * Bumped by every local write. A push captures it before awaiting and
   * compares afterwards; that comparison is the whole of `pushLanded.stale`,
   * and it is why an interleaved write cannot be reported as synced.
   */
  let generation = 0

  /**
   * `true` once anything has changed since the last landed push. Not derivable
   * from `state`: `failed` is sticky, so it cannot double as "work is owed".
   */
  let owed = false

  const listeners = new Set<() => void>()

  function notify(): void {
    for (const listener of [...listeners]) listener()
  }

  /**
   * Applies one signal. It does NOT notify: every public operation below
   * notifies exactly once, at the end, because most of them change the record
   * or the queue as well as the state and a subscriber that heard twice would
   * render twice for one act (§12.2's identity-equality discipline).
   */
  function signal(next: SyncSignal): void {
    state = nextSyncState(state, next)
  }

  function envelopeOf(data: RecordData, at: string): RemoteEnvelope {
    return {
      schema: SCHEMA_VERSION,
      data,
      savedAt: at,
      progress: deps.progressOf(data),
      curriculumRev: deps.curriculumRev ?? null,
    }
  }

  /**
   * One attempt. Reads the CURRENT record and queue at the moment it runs, not
   * at the moment it was requested, so a burst of `push()` calls collapses into
   * one useful send rather than a queue of stale ones.
   *
   * Order is deliberate: the envelope goes first because it is the source
   * (Decision 6). If the log then fails, the server still holds the right
   * answer to "what now?" and only "how did we get here?" is owed. A retry
   * resends the envelope too, which is free — the row is an upsert.
   */
  /**
   * §14.7.4 — false from `signIn` until `claim` has actually read the account.
   *
   * THE FAILURE THIS PREVENTS, and it is the one Decision 4 calls the purest
   * violation of §1. `signIn` sets `owed`, and `store.ts` pushes on every
   * throttled flush and on every cross-tab adopt. So between `signIn(port)` and
   * `claim()`'s `await port.read()` there is a window in which the flush timer
   * can fire and upsert THIS DEVICE's envelope over the account's row. A reader
   * with twelve signed sheets in their account, signing in on a fresh browser,
   * loses all twelve — and then `claim` merges the local record with what it
   * just overwrote, reports `merged`, and the summary tells them
   * "Nothing was deleted."
   *
   * `remote-store.ts` states that "merge.ts has already run by this point".
   * That was an assumption about a caller rather than something this module
   * enforced. Now it is enforced here, where the send happens.
   *
   * An `unreadable` claim deliberately does NOT set this. If the account's row
   * could not be read, pushing over it is exactly the destructive act above
   * with no merge at all, so the machine stays `pending`: the footer says the
   * record is not synced, `report.ts`'s export sits beside it, and nothing is
   * lost. A stuck `pending` is a state the reader can act on; a silent
   * overwrite is not.
   */
  let claimed = false
  /**
   * Which claim is current. Incremented by `claim` on entry and by
   * `abandonClaim`, so a claim resuming after an await can tell whether the
   * world it read still exists.
   */
  let claimToken = 0

  async function attempt(): Promise<SyncState> {
    const port = remote
    if (port === null) return state
    if (!claimed) return state
    if (!owed && state === 'synced' && queue.length === 0) return state

    const sentGeneration = generation
    const sentQueue = queue.slice()
    const sentRecord = record
    const at = savedAt ?? deps.now()

    signal({ kind: 'pushStarted' })

    try {
      await port.write(envelopeOf(sentRecord, at))
    } catch {
      lastFailure = 'state'
      signal({ kind: 'pushFailed' })
      notify()
      return state
    }

    if (sentQueue.length > 0) {
      try {
        await port.appendEvents(sentQueue)
      } catch {
        // The envelope landed; the log did not. The reader is told, and the
        // queue is kept intact — resending is idempotent by id (§14.2.3), so
        // there is no bookkeeping to get wrong.
        lastFailure = 'events'
        signal({ kind: 'pushFailed' })
        notify()
        return state
      }
      const sent = new Set(sentQueue.map((event) => event.id))
      queue = queue.filter((event) => !sent.has(event.id))
    }

    const stale = generation !== sentGeneration
    if (!stale) owed = false
    lastFailure = null
    signal({ kind: 'pushLanded', stale })
    notify()
    return state
  }

  /**
   * Pushes never overlap. Chaining rather than a mutex keeps the ordering
   * observable from a test with plain `await`, and `attempt` reading live state
   * means a chained attempt is never a stale one.
   */
  let chain: Promise<SyncState> = Promise.resolve(state)

  function push(): Promise<SyncState> {
    chain = chain.then(attempt, attempt)
    return chain
  }

  return {
    snapshot: () => ({ state, record, queued: queue.length, lastFailure }),
    state: () => state,

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    signIn(port) {
      remote = port
      claimed = false
      owed = true
      signal({ kind: 'signedIn' })
      notify()
    },

    /**
     * The queue is dropped, and that is the safe direction. A queued row
     * carries no `user_id` — the server takes it from `auth.uid()` (§14.4.3) —
     * so flushing it after a different account signs in would file one
     * reader's history under another's name. The envelope, which is the
     * source, is untouched in `localStorage` either way.
     */
    signOut() {
      remote = null
      claimed = false
      queue = []
      owed = false
      lastFailure = null
      signal({ kind: 'signedOut' })
      notify()
    },

    localWrite(next, at) {
      record = next
      savedAt = at ?? null
      generation += 1
      owed = true
      signal({ kind: 'localWrite' })
      notify()
    },

    enqueue(kind, sheetSlug, payload, at) {
      // Nothing is being asserted while signed out, and a row minted now would
      // be attributed to whoever signs in later. §14.7.4's claim carries the
      // anonymous work across as an envelope, not as log rows.
      if (remote === null) return null
      const event: LearnerEvent = {
        id: deps.newId(),
        kind,
        sheetSlug,
        payload: payload ?? {},
        at: at ?? deps.now(),
      }
      queue.push(event)
      if (queue.length > MAX_QUEUED_EVENTS) {
        queue = queue.slice(queue.length - MAX_QUEUED_EVENTS)
      }
      // `generation` is bumped here for the same reason `localWrite` bumps it:
      // an appended row is a change the server has not seen, and `generation`
      // is how `attempt` learns that its in-flight send is already out of date.
      //
      // Without this, an enqueue landing DURING a push is invisible to it:
      // `sentQueue` was captured empty, `stale` compares equal, `owed` is
      // cleared and the machine reports `synced` with a non-empty queue —
      // contradicting `SyncSnapshot`'s own stated invariant, printing
      // `data-sync="synced"` over a quiz attempt that never left the browser,
      // and leaving nothing to schedule another send.
      generation += 1
      owed = true
      signal({ kind: 'localWrite' })
      notify()
      return event
    },

    push,

    abandonClaim() {
      claimToken += 1
      claimed = true
    },

    async claim() {
      const port = remote
      if (port === null) return { kind: 'off', record }

      const token = (claimToken += 1)

      let row: RemoteEnvelope | null
      try {
        row = await port.read()
      } catch {
        signal({ kind: 'readFailed' })
        return { kind: 'unreadable', record, state }
      }

      // The one check that makes this claim's write safe: the row was read
      // BEFORE the await returned, and an erase may have removed it since. Every
      // line below either replaces `record` or pushes it, and both would undo
      // the erase.
      if (token !== claimToken) return { kind: 'abandoned', record, state }

      if (row === null) {
        const local = record
        // The account holds nothing, so this device's record IS the answer and
        // sending it destroys nothing. Set before `push`, which is gated on it.
        claimed = true
        await push()
        return { kind: 'adopted', record: local, state }
      }

      const incoming = hydrate(row)
      if (incoming === null) {
        // Unreadable is not corrupt-and-overwrite. See `ClaimOutcome`.
        signal({ kind: 'readFailed' })
        return { kind: 'unreadable', record, state }
      }

      const local = record
      const merged = deps.merge(local, incoming)
      record = merged
      generation += 1
      owed = true
      // The account's row has been read and folded in, so a send can no longer
      // lose anything it held.
      claimed = true
      signal({ kind: 'localWrite' })
      notify()
      await push()
      return { kind: 'merged', record: merged, local, remote: incoming, state }
    },
  }
}
