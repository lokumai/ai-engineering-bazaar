import { describe, expect, it, vi } from 'vitest'
import { EMPTY_RECORD, SCHEMA_VERSION, type RecordData } from '@/lib/record/schema'
import { signOff } from '@/lib/record/events'
import {
  MAX_QUEUED_EVENTS,
  createSync,
  nextSyncState,
  type SyncState,
} from '@/lib/record/sync'
import type {
  LearnerEvent,
  Progress,
  RemoteEnvelope,
  RemoteRecordStore,
} from '@/lib/record/wire'

const NOW = '2026-09-01T09:15:00.000Z'
const LATER = '2026-09-01T10:00:00.000Z'

const PROGRESS: Progress = {
  signedOff: 0,
  attainable: 32,
  ratio: 0,
  byCategory: {},
  attention: [],
  lastActivity: null,
  days: 0,
}

/**
 * §14.12 — the port pattern from `storage.test.ts`, one layer out: a Map for
 * the row, arrays for what was sent, and a switch that makes any call reject on
 * demand. This is the whole reason `sync.ts` may not import supabase-js.
 */
function fakeRemote(row: RemoteEnvelope | null = null) {
  const writes: RemoteEnvelope[] = []
  const appended: LearnerEvent[][] = []
  let stored = row
  let deleted = 0
  let failWrite = false
  let failEvents = false
  let failRead = false
  /** A gate inside `write`, so "in flight" is a state a test can stand in. */
  let gate: Promise<void> | null = null
  let entered: (() => void) | null = null

  const remote: RemoteRecordStore = {
    async read() {
      if (failRead) throw new Error('read refused')
      return stored
    },
    async write(envelope) {
      if (gate) {
        entered?.()
        await gate
      }
      if (failWrite) throw new Error('write refused')
      writes.push(envelope)
      stored = envelope
    },
    async appendEvents(events) {
      if (failEvents) throw new Error('append refused')
      appended.push([...events])
    },
    async deleteRecord() {
      // §14.6's erase does not go through `sync.ts` — the local erase must not
      // wait for the network — so this exists to satisfy the port and to record
      // that no test here should be reaching it.
      deleted += 1
      const removed = stored === null ? 0 : 1
      stored = null
      return { rows: removed }
    },
  }

  return {
    remote,
    writes,
    appended,
    get stored() { return stored },
    get deleted() { return deleted },
    failWrite(on: boolean) { failWrite = on },
    failEvents(on: boolean) { failEvents = on },
    failRead(on: boolean) { failRead = on },
    /**
     * Holds `write` open. `reached` resolves once the port is actually inside
     * the call, so the test never guesses at microtask counts.
     */
    pauseWrite() {
      let release!: () => void
      gate = new Promise<void>((resolve) => { release = resolve })
      const reached = new Promise<void>((resolve) => { entered = resolve })
      return {
        reached,
        async release() {
          gate = null
          release()
          await Promise.resolve()
        },
      }
    },
  }
}

function sync(overrides: Partial<Parameters<typeof createSync>[0]> = {}) {
  let n = 0
  return createSync({
    merge: (local) => local,
    progressOf: () => PROGRESS,
    now: () => NOW,
    newId: () => `id-${++n}`,
    initial: EMPTY_RECORD,
    ...overrides,
  })
}

/**
 * The production precondition for a push (§14.7.4): sign in, THEN claim.
 *
 * `signIn` deliberately does not authorise a send. `attempt` is gated on the
 * claim having read the account, because between the two there is a window in
 * which `store.ts`'s throttled flush can fire and upsert this device's envelope
 * over the account's row — losing every signature the account held. So a test
 * that pushes after `signIn` alone is exercising a state no deployment reaches.
 *
 * The port's log is cleared afterwards, so the assertions that follow count
 * only the calls the test itself provoked.
 */
async function signedIn(
  engine: ReturnType<typeof sync>,
  port: ReturnType<typeof fakeRemote>,
): Promise<void> {
  engine.signIn(port.remote)
  await engine.claim()
  port.writes.length = 0
  port.appended.length = 0
}

const withSheet = (slug: string): RecordData => signOff(EMPTY_RECORD, slug, 'abc1234', NOW)

// --- the pure machine (§14.7.3) ----------------------------------------------

describe('nextSyncState — every transition, both directions where one exists', () => {
  it('starts off and stays off through everything but signing in', () => {
    for (const signal of [
      { kind: 'localWrite' },
      { kind: 'pushStarted' },
      { kind: 'pushLanded', stale: false },
      { kind: 'pushFailed' },
      { kind: 'readFailed' },
      { kind: 'signedOut' },
    ] as const) {
      expect(nextSyncState('off', signal)).toBe('off')
    }
  })

  it('off → pending on sign-in: nothing has been exchanged yet', () => {
    // Not `synced`. Even two empty sides are an unverified claim, and the row
    // does not exist until a push creates it.
    expect(nextSyncState('off', { kind: 'signedIn' })).toBe('pending')
  })

  it('pending → synced when a push lands, synced → pending on a local write', () => {
    expect(nextSyncState('pending', { kind: 'pushLanded', stale: false })).toBe('synced')
    expect(nextSyncState('synced', { kind: 'localWrite' })).toBe('pending')
  })

  it('pending → failed on a failed push, failed → synced on a retry that lands', () => {
    expect(nextSyncState('pending', { kind: 'pushFailed' })).toBe('failed')
    expect(nextSyncState('failed', { kind: 'pushLanded', stale: false })).toBe('synced')
  })

  it('keeps failed through a local write: the record is still in one browser', () => {
    expect(nextSyncState('failed', { kind: 'localWrite' })).toBe('failed')
  })

  it('reports pending, not synced, when the push landed behind the record', () => {
    expect(nextSyncState('pending', { kind: 'pushLanded', stale: true })).toBe('pending')
  })

  it('leaves the state alone on a failed read and on an in-flight push', () => {
    for (const state of ['synced', 'pending', 'failed'] as SyncState[]) {
      expect(nextSyncState(state, { kind: 'readFailed' })).toBe(state)
      expect(nextSyncState(state, { kind: 'pushStarted' })).toBe(state)
    }
  })

  it('returns to off from every state on sign-out', () => {
    for (const state of ['synced', 'pending', 'failed'] as SyncState[]) {
      expect(nextSyncState(state, { kind: 'signedOut' })).toBe('off')
    }
  })
})

// --- the invariant: no code path awaits before the local write ---------------

describe('a local write never waits for the network (§12.2, §14.7.3)', () => {
  it('is authoritative in memory while the push is still in flight', async () => {
    const port = fakeRemote()
    const engine = sync()
    await signedIn(engine, port)
    // Something must be owed, or `attempt` returns before it reaches the port
    // and `pauseWrite` is never entered: the claim above left the machine
    // `synced`.
    engine.localWrite(withSheet('seed'))
    const paused = port.pauseWrite()
    const inFlight = engine.push()
    await paused.reached

    // Synchronous, in the same tick as the call — nothing was awaited, and the
    // port is demonstrably mid-call while this runs.
    engine.localWrite(withSheet('fundamentals/llms'))
    expect(engine.snapshot().record.sheets['fundamentals/llms']?.signedOff).toBe(NOW)
    expect(engine.state()).toBe('pending')

    await paused.release()
    await inFlight
    // The write landed, but it carried the older record: still pending.
    expect(engine.state()).toBe('pending')
  })

  it('includes a write made in the same tick as the push that follows it', async () => {
    // `push` defers its attempt by a microtask, and `attempt` reads the record
    // at the moment it RUNS, not the moment it was requested. So a handler that
    // writes locally and then asks for a push sends the new record, not the old
    // one — the ordering a caller would naively assume, made true on purpose.
    const port = fakeRemote()
    const engine = sync()
    await signedIn(engine, port)
    engine.localWrite(withSheet('a'))
    const pushed = engine.push()
    engine.localWrite(withSheet('b'))
    expect(await pushed).toBe('synced')
    expect(port.writes[0].data.sheets['b']).toBeDefined()
  })

  it('serialises pushes: two overlapping requests never run at once', async () => {
    const port = fakeRemote()
    const engine = sync()
    await signedIn(engine, port)
    engine.localWrite(withSheet('seed'))
    const paused = port.pauseWrite()
    const first = engine.push()
    await paused.reached
    engine.localWrite(withSheet('a'))
    const second = engine.push()
    await paused.release()
    expect(await first).toBe('pending') // landed behind the record
    expect(await second).toBe('synced') // the chained attempt caught up
    expect(port.writes).toHaveLength(2)
  })

  it('accepts writes and events while every call rejects, and never throws', async () => {
    const port = fakeRemote()
    port.failWrite(true)
    port.failEvents(true)
    port.failRead(true)
    const engine = sync()
    await signedIn(engine, port)

    expect(() => {
      engine.localWrite(withSheet('a'))
      engine.enqueue('signOff', 'a')
      engine.localWrite(withSheet('b'))
    }).not.toThrow()
    expect(engine.snapshot().queued).toBe(1)
    expect(engine.snapshot().record.sheets['b']?.signedOff).toBe(NOW)
  })

  it('does not touch the port on a local write or an enqueue', async () => {
    const port = fakeRemote()
    const engine = sync()
    await signedIn(engine, port)
    // Installed AFTER the claim: §14.7.4's claim pushes once, by design, and
    // this test is about what a local write does — not about that push.
    const spy = vi.spyOn(port.remote, 'write')
    engine.localWrite(withSheet('a'))
    engine.enqueue('signOff', 'a')
    expect(spy).not.toHaveBeenCalled()
    expect(port.appended).toEqual([])
  })
})

// --- the engine, driven ------------------------------------------------------

describe('createSync — the states as the footer would read them', () => {
  it('is off before sign-in and pushes nothing while off', async () => {
    const port = fakeRemote()
    const engine = sync()
    expect(engine.state()).toBe('off')
    engine.localWrite(withSheet('a'))
    expect(engine.state()).toBe('off')
    expect(await engine.push()).toBe('off')
    expect(port.writes).toEqual([])
  })

  it('pending → synced, and the pushed row IS the envelope (§14.2.2)', async () => {
    const port = fakeRemote()
    const engine = sync()
    await signedIn(engine, port)
    engine.localWrite(withSheet('fundamentals/llms'), LATER)
    expect(engine.state()).toBe('pending')

    expect(await engine.push()).toBe('synced')
    expect(port.writes).toHaveLength(1)
    expect(port.writes[0]).toMatchObject({
      schema: SCHEMA_VERSION,
      savedAt: LATER, // the device's own claim, not the moment of the push
      progress: PROGRESS,
      curriculumRev: null,
    })
    expect(port.writes[0].data.sheets['fundamentals/llms']?.signedOff).toBe(NOW)
  })

  it('goes back to pending on the next local write, and synced again after', async () => {
    const port = fakeRemote()
    const engine = sync()
    await signedIn(engine, port)
    await engine.push()
    expect(engine.state()).toBe('synced')
    engine.localWrite(withSheet('a'))
    expect(engine.state()).toBe('pending')
    expect(await engine.push()).toBe('synced')
  })

  it('skips the network entirely when synced and nothing is owed', async () => {
    const port = fakeRemote()
    const engine = sync()
    await signedIn(engine, port)
    engine.localWrite(withSheet('a'))
    await engine.push()
    await engine.push()
    await engine.push()
    expect(port.writes).toHaveLength(1)
  })

  it('sign-out returns to off and drops the queue, so no row is misfiled', async () => {
    const port = fakeRemote()
    const engine = sync()
    await signedIn(engine, port)
    engine.enqueue('signOff', 'a')
    expect(engine.snapshot().queued).toBe(1)
    engine.signOut()
    expect(engine.snapshot()).toMatchObject({ state: 'off', queued: 0, lastFailure: null })
    // The envelope is untouched: it is the source, and it lives in localStorage.
    expect(engine.snapshot().record).toBe(EMPTY_RECORD)
  })

  it('notifies subscribers synchronously, and stops on unsubscribe', async () => {
    const port = fakeRemote()
    const engine = sync()
    await signedIn(engine, port)
    // Subscribed AFTER the claim: it legitimately drives pending -> synced, and
    // this test is about a local write notifying synchronously.
    const seen: SyncState[] = []
    const off = engine.subscribe(() => seen.push(engine.state()))
    // Two writes, so the assertion still reads on more than one notification
    // now that sign-in happens before the subscription.
    engine.localWrite(withSheet('a'))
    engine.localWrite(withSheet('b'))
    off()
    engine.signOut()
    expect(seen).toEqual(['pending', 'pending'])
  })
})

// --- failure (§14.7.3 `failed`) ----------------------------------------------

describe('a push that does not land', () => {
  it('reports failed when the envelope write rejects, record still authoritative', async () => {
    const port = fakeRemote()
    port.failWrite(true)
    const engine = sync()
    await signedIn(engine, port)
    engine.localWrite(withSheet('a'))

    expect(await engine.push()).toBe('failed')
    expect(engine.snapshot().lastFailure).toBe('state')
    expect(engine.snapshot().record.sheets['a']?.signedOff).toBe(NOW)
  })

  it('reports failed when only the log rejects, and names which half', async () => {
    const port = fakeRemote()
    port.failEvents(true)
    const engine = sync()
    await signedIn(engine, port)
    engine.enqueue('setQuizAnswer', 'a', { answer: 'x' })

    expect(await engine.push()).toBe('failed')
    expect(engine.snapshot().lastFailure).toBe('events')
    // The envelope, which is the source, did land.
    expect(port.writes).toHaveLength(1)
    expect(engine.snapshot().queued).toBe(1)
  })

  it('stays failed across a local write and clears only when a push lands', async () => {
    const port = fakeRemote()
    port.failWrite(true)
    const engine = sync()
    await signedIn(engine, port)
    engine.localWrite(withSheet('a'))
    await engine.push()
    expect(engine.state()).toBe('failed')

    engine.localWrite(withSheet('b'))
    expect(engine.state()).toBe('failed')

    port.failWrite(false)
    expect(await engine.push()).toBe('synced')
    expect(engine.snapshot().lastFailure).toBeNull()
  })
})

// --- the queue (§14.2.3, §14.7.3) -------------------------------------------

describe('the event queue', () => {
  it('survives two consecutive failures and then flushes, once, in order', async () => {
    const port = fakeRemote()
    port.failEvents(true)
    const engine = sync()
    await signedIn(engine, port)
    engine.enqueue('signOff', 'a')
    engine.enqueue('setQuizAnswer', 'b', { answer: 'x' })

    expect(await engine.push()).toBe('failed')
    engine.enqueue('addSubmittal', 'c')
    expect(await engine.push()).toBe('failed')
    expect(engine.snapshot().queued).toBe(3)
    expect(port.appended).toEqual([])

    port.failEvents(false)
    expect(await engine.push()).toBe('synced')
    expect(engine.snapshot().queued).toBe(0)
    expect(port.appended).toHaveLength(1)
    expect(port.appended[0].map((event) => [event.id, event.kind, event.sheetSlug])).toEqual([
      ['id-1', 'signOff', 'a'],
      ['id-2', 'setQuizAnswer', 'b'],
      ['id-3', 'addSubmittal', 'c'],
    ])
  })

  it('mints the id on the client, so a resend is idempotent (§14.2.3)', async () => {
    const port = fakeRemote()
    const engine = sync()
    await signedIn(engine, port)
    const event = engine.enqueue('signOff', 'a', { revision: 'abc1234' }, LATER)
    expect(event).toEqual({
      id: 'id-1',
      kind: 'signOff',
      sheetSlug: 'a',
      payload: { revision: 'abc1234' },
      at: LATER,
    })
  })

  it('refuses to mint while off: a row now would be filed under whoever signs in', () => {
    const engine = sync()
    expect(engine.enqueue('signOff', 'a')).toBeNull()
    expect(engine.snapshot().queued).toBe(0)
  })

  it('keeps only rows queued after a failure that were not yet sent', async () => {
    const port = fakeRemote()
    const engine = sync()
    await signedIn(engine, port)
    engine.enqueue('signOff', 'a')
    await engine.push()
    expect(engine.snapshot().queued).toBe(0)
    port.failEvents(true)
    engine.enqueue('unsign', 'a')
    await engine.push()
    expect(engine.snapshot().queued).toBe(1)
    expect(port.appended[0].map((e) => e.kind)).toEqual(['signOff'])
  })

  it('caps the tail at MAX_QUEUED_EVENTS, dropping the oldest', async () => {
    const port = fakeRemote()
    port.failEvents(true)
    const engine = sync()
    await signedIn(engine, port)
    for (let i = 0; i < MAX_QUEUED_EVENTS + 5; i += 1) engine.enqueue('signOff', `s${i}`)
    expect(engine.snapshot().queued).toBe(MAX_QUEUED_EVENTS)
  })

  it('an enqueue during an in-flight push leaves the state pending, not synced', async () => {
    // The case sync.test.ts covered for `localWrite` and not for `enqueue`. A
    // machine reporting `synced` with a queued row prints
    // `data-sync="synced"` over a quiz attempt that never left the browser, and
    // leaves nothing to schedule another send: `owed` is false, so the row waits
    // for an unrelated future write.
    const port = fakeRemote()
    const engine = sync()
    await signedIn(engine, port)

    engine.localWrite(withSheet('llms'))
    const held = port.pauseWrite()
    const inFlight = engine.push()
    await held.reached

    engine.enqueue('setQuizAnswer', 'llms', { attempt: 1 })
    await held.release()
    await inFlight

    expect(engine.state()).toBe('pending')
    expect(engine.snapshot().queued).toBe(1)
  })
})

// --- claim (§14.7.4) --------------------------------------------------------

describe('claim — the anonymous record meets the account', () => {
  it('a push before the claim cannot overwrite the account (§14.7.4)', async () => {
    // Decision 4's "purest violation of §1", as a test. The account holds a
    // signed sheet; this browser holds nothing. If the flush timer wins the race
    // against `claim`'s read, the empty local envelope lands on top and the
    // signature is gone — and the summary then reports `merged` with nothing
    // deleted, because the row it merged against is the one it just destroyed.
    const port = fakeRemote({
      schema: SCHEMA_VERSION,
      data: withSheet('llms'),
      savedAt: NOW,
      progress: PROGRESS,
      curriculumRev: null,
    })
    const engine = sync({ merge: (local, remote) => remote })

    engine.signIn(port.remote)
    // store.ts pushes on every throttled flush; this is that push, arriving
    // before the claim has read anything.
    await engine.push()

    expect(port.writes, 'a push before the claim reached the network').toEqual([])
    expect(engine.state(), 'the footer must not claim synced').toBe('pending')
    expect(
      Object.keys(port.stored!.data.sheets),
      "the account's record was overwritten",
    ).toEqual(['llms'])

    // And after the claim it flows normally.
    await engine.claim()
    expect(port.writes.length).toBeGreaterThan(0)
    expect(engine.state()).toBe('synced')
  })

  it('pushes the local envelope when the account has no row', async () => {
    const port = fakeRemote(null)
    const engine = sync()
    engine.signIn(port.remote)
    engine.localWrite(withSheet('a'))

    const outcome = await engine.claim()
    expect(outcome.kind).toBe('adopted')
    expect(engine.state()).toBe('synced')
    expect(port.writes).toHaveLength(1)
  })

  it('merges when a row exists, and pushes the merged record', async () => {
    const remoteRecord = withSheet('remote-only')
    const port = fakeRemote({
      schema: SCHEMA_VERSION,
      data: remoteRecord,
      savedAt: NOW,
      progress: PROGRESS,
      curriculumRev: null,
    })
    const merged = withSheet('merged')
    const engine = sync({ merge: () => merged })
    engine.signIn(port.remote)
    engine.localWrite(withSheet('local-only'))

    const outcome = await engine.claim()
    expect(outcome.kind).toBe('merged')
    if (outcome.kind !== 'merged') throw new Error('unreachable')
    expect(outcome.record).toBe(merged)
    expect(outcome.remote).toBe(remoteRecord)
    expect(outcome.local.sheets['local-only']).toBeDefined()
    expect(engine.state()).toBe('synced')
    expect(port.writes[0].data).toBe(merged)
    expect(engine.snapshot().record).toBe(merged)
  })

  it('leaves local authoritative and pushes NOTHING when the read rejects', async () => {
    const port = fakeRemote()
    port.failRead(true)
    const local = withSheet('a')
    const engine = sync()
    engine.signIn(port.remote)
    engine.localWrite(local)

    const outcome = await engine.claim()
    expect(outcome.kind).toBe('unreadable')
    expect(outcome.record).toBe(local)
    // Not `failed`: no push was attempted. And no overwrite of a row this code
    // could not read.
    expect(engine.state()).toBe('pending')
    expect(port.writes).toEqual([])
  })

  it('treats a row hydrate refuses exactly like a rejected read (§14.2.2)', async () => {
    const port = fakeRemote({
      schema: 99,
      data: EMPTY_RECORD,
      savedAt: NOW,
      progress: PROGRESS,
      curriculumRev: null,
    })
    const engine = sync({ hydrate: () => null })
    engine.signIn(port.remote)
    const outcome = await engine.claim()
    expect(outcome.kind).toBe('unreadable')
    expect(port.writes).toEqual([])
  })

  it('is a no-op while off', async () => {
    const engine = sync()
    expect(await engine.claim()).toEqual({ kind: 'off', record: EMPTY_RECORD })
  })
})
