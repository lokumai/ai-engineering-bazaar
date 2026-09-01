'use client'

/**
 * §12.2 Channel B — the React binding, and NOTHING ELSE.
 *
 * Every piece of arithmetic and every decision lives in the pure modules
 * beside this one: `events.ts` decides what a write does, `derive.ts` decides
 * what a number is, `validate.ts` decides what a stored string means, and
 * `storage.ts` owns the key. This file wires them to React and to four browser
 * events, so that everything worth testing is testable in node (§12.14.2) and
 * what remains is covered by Playwright in real Chrome.
 *
 * `'use client'` is deliberate even though this is a hook module: a server
 * component that imports it fails loudly at build time instead of quietly
 * calling `useSyncExternalStore` where there is no client.
 *
 * The one rule that governs every line here: the server and the FIRST client
 * render must agree. `getServerSnapshot` returns the frozen EMPTY_RECORD
 * singleton, storage is read in `subscribe` — which React calls after the
 * hydration commit — and nothing in a render path touches a browser API.
 * `suppressHydrationWarning` is forbidden on any readout (§12.2): it works one
 * level deep and React will not patch mismatched text, so a suppressed readout
 * keeps displaying the build-time value — it would lie rather than flicker.
 */

import { useSyncExternalStore } from 'react'
import { setPersisted } from './events'
import {
  carriesNothing,
  EMPTY_RECORD,
  RECORD_STORAGE_KEY,
  SCHEMA_VERSION,
  type Envelope,
  type RecordData,
} from './schema'
import { readRecord, safeStorage, writeRecord, type RecordStorage } from './storage'
/**
 * §14.7.4 — TYPE-only, deliberately. This module must not construct a `Sync`:
 * doing so would put `createSync`'s dependencies — and through them the
 * Supabase client — on the import path of every page that prints a readout,
 * and §14.7.1's whole arrangement is that the network is reachable from one
 * island and nowhere else. The instance is handed in by `attachSync`, so a
 * build with no backend never even evaluates `sync.ts`.
 */
import type { Sync, SyncState } from './sync'
import type { EventKind, RemoteEraseReceipt, RemoteRecordStore } from './wire'

import { envelopeTextFrom, parseEnvelope, type ParseResult } from './validate'

export type WriteState = 'saved' | 'quota' | 'blocked' | 'too-large' | 'pending'

/** §12.1.4 — trailing throttle. One write per burst of ticks and keystrokes. */
const FLUSH_MS = 500

/** §12.1.5 — the intra-app channel. Deliberately the same name as the key. */
const CHANNEL_NAME = 'hl-record'

// --- the singleton -----------------------------------------------------------

let current: RecordData = EMPTY_RECORD
let hydrated = false
let started = false
let storage: RecordStorage | null = null
let savedAt: string | null = null
let quarantined: 'newer' | 'malformed' | null = null
let lastWrite: WriteState = 'pending'
let dirty = false
let flushTimer: ReturnType<typeof setTimeout> | null = null
let channel: BroadcastChannel | null = null
let queriedPersisted: boolean | null = null
let persistenceAsked = false

const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of [...listeners]) listener()
}

/**
 * The instant every reducer is given. UTC, so a record stays comparable across
 * machines and time zones — the alternative is a day boundary that moves with
 * the device, which would redraw the §7.3 strip on a flight. Anything reading
 * `uptime(data, today)` must take `today` from the same basis.
 */
export function nowIso(): string {
  return new Date().toISOString()
}

function serialise(data: RecordData, at: string, pretty: boolean): string {
  const envelope: Envelope = { schema: SCHEMA_VERSION, savedAt: at, data }
  return pretty ? JSON.stringify(envelope, null, 2) : JSON.stringify(envelope)
}

/** §12.13 class 4 — the boot script's stamp, corrected by what a write learnt. */
function stampStorage(state: 'ok' | 'blocked'): void {
  try {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-hl-storage', state)
  } catch {
    // An attribute this page could not set is not worth an exception.
  }
}

/**
 * Take a record another tab produced (§12.1.5).
 *
 * `push` is false on ONE path and the distinction is a §14.6 correctness rule,
 * not a preference: the key was REMOVED rather than rewritten.
 *
 * §12.1.5 crossing §14.7.3. For a rewrite, the record arrived from another tab
 * of this same browser, so from the account's point of view it is a local write
 * and this tab has no way to learn whether the tab that made it got it through.
 * The alternatives were both worse: saying nothing leaves this footer claiming
 * `synced` for a record the server may not hold, and marking `pending` without
 * pushing leaves a claim that a send is owed which nothing will ever perform.
 * So it is pushed, and the cost — the same envelope upserted by two tabs — is
 * one idempotent request against a page that would otherwise lie.
 *
 * A REMOVAL is the opposite case, and pushing on it UNDID AN ERASE. The
 * sequence: the reader erases in tab A, `eraseAccountCopy` settles tab A's
 * queue and deletes `record_state`, and meanwhile tab B's `storage` handler
 * sees `newValue === null`, adopts the empty record and pushes it. Tab B's push
 * is independent of tab A's ordering, so it can land after the delete and
 * recreate the row — an empty one, which is worse than a stale one because it
 * looks like a record. The dialog had already reported the account copy
 * removed.
 *
 * No coordination, no tombstone, no message: a sibling tab pushing an empty
 * envelope is never the right act. Either the tab that removed the key owns the
 * account-side erase and performs it, or nothing removed it deliberately (a
 * cleared `localStorage`, a private window closing) and the account copy is
 * meant to survive — that is the whole point of having one.
 *
 * No `savedAt` is passed on either path: the instant this tab holds belongs to a
 * record it did not write, and a push stamping its own instant is the truthful
 * reading — this device is sending this record now.
 */
function adopt(data: RecordData): void {
  current = data
  notify()
  // `carriesNothing` and not "was the key removed", which was the first attempt
  // at this and closed the wrong door. `DataPanel` writes the empty record and
  // FLUSHES it before removing the key, so a sibling tab's first news of an
  // erase is a valid empty envelope — a rewrite, not a removal — and it pushed
  // that. MEASURED: the account row came back, holding an empty record, after
  // the dialog had reported it removed.
  if (carriesNothing(data)) {
    // And the same invalidation the erasing tab performs on itself: THIS tab may
    // have its own claim in flight, reading a row the other tab is deleting. It
    // would write that row back and push it, and no amount of not-pushing an
    // empty record here would stop it.
    sync?.abandonClaim()
    return
  }
  pushToAccount()
}

// --- the account (§14.7.3, §14.7.4) ------------------------------------------

/**
 * §14.7.4 — the seam, and the only thing this file knows about the network.
 *
 * The sync instance is created by whichever island signed the reader in (it
 * owns the port, the clock and the id minting), and handed here so that the
 * ordinary write path can mark it `pending`. Nothing above this line changes:
 * `getServerSnapshot` still returns the frozen singleton, the in-memory record
 * is still authoritative whatever storage or the network does, and the local
 * write is still synchronous. §14.7.3's rule and §12.1.4's rule are the same
 * rule — a write never waits for a slower layer, and the page never claims a
 * state that layer has not reached.
 */
let sync: Sync | null = null
let detachSync: (() => void) | null = null

/**
 * §14.6 — the port, kept beside the machine so the erase has ONE way to reach
 * the account's row.
 *
 * `Sync` deliberately does not expose its port: everything it does with it is
 * its own business. The erase is the exception, and it is an exception on
 * purpose rather than an oversight — deleting the account's copy is not a sync
 * operation. It is not owed, not retried, not throttled and not idempotent in
 * the way a push is. Handing `EraseDialog` a raw Supabase client instead would
 * put a second set of column names and a second user scoping in a component,
 * which is exactly what `RemoteRecordStore` exists to prevent.
 */
let remotePort: RemoteRecordStore | null = null

/**
 * A SECOND listener set, not the record's.
 *
 * The sync state changes without the record changing (a push landing, a push
 * failing) and the record changes without the sync state changing, so folding
 * them into one set would re-render every readout on the page for a footer
 * attribute — and would make `notify` fire twice for one act, which §12.2's
 * identity-equality discipline exists to avoid.
 */
const syncListeners = new Set<() => void>()

function notifySyncListeners(): void {
  for (const listener of [...syncListeners]) listener()
}

/**
 * Installs (or, with `null`, removes) the sync instance.
 *
 * The caller constructs it with `initial: snapshot()`; nothing is written or
 * pushed from here, because attaching is not an event in the reader's record —
 * `Sync.signIn` and `Sync.claim` are, and they belong to the caller that knows
 * which account was signed in to (§14.7.4).
 */
export function attachSync(instance: Sync | null, port: RemoteRecordStore | null = null): void {
  detachSync?.()
  detachSync = null
  sync = instance
  remotePort = instance === null ? null : port
  if (instance !== null) detachSync = instance.subscribe(notifySyncListeners)
  notifySyncListeners()
}

/** True when there is an account copy for §14.6's erase to remove. */
export function hasAccountCopy(): boolean {
  return remotePort !== null
}

/**
 * §14.6 — removes the account's copy of the envelope.
 *
 * THE ORDERING IS THE WHOLE FUNCTION. The local erase has already run by the
 * time this is called, and it went through `update`, which marks the sync
 * `pending` and schedules a throttled flush. Delete first and that flush lands
 * afterwards, recreating the row this call was asked to remove — and the reader
 * has already been told it was gone. So the pending push is settled first, and
 * only then is the row deleted; nothing is owed after that, so nothing
 * recreates it.
 *
 * `learner_event` is untouched. §14.4.3 gives that table no delete policy for
 * anyone, which is §14.6's second row working as designed: an organisation's
 * training history is not erasable from a browser, and the dialog says so.
 *
 * Throws on failure, because the caller is `eraseRemote` in `erase.ts`, whose
 * whole job is to turn that into the one thing the reader can act on: the local
 * erase happened, the account copy may still be there.
 *
 * The receipt is RETURNED rather than discarded, and that is the difference
 * between reporting the erase and asserting it: a delete filtered away by RLS
 * resolves without an error and removes nothing, so the row count is the only
 * observation either side of this call has. `{ rows: 0 }` with no port is not a
 * silent success — there is no account copy to remove, and `eraseRemote` is
 * handed `null` in that case rather than this function.
 */
export async function eraseAccountCopy(): Promise<RemoteEraseReceipt> {
  const port = remotePort
  if (port === null) return { rows: 0, historyRows: 0 }
  flush()
  if (sync !== null) await sync.push()

  // Any claim still reading the account's row is invalidated FIRST, before
  // anything is deleted. A claim that resumes after the delete would write the
  // row it read back into this machine and push it, recreating exactly what the
  // reader asked to remove — and it would do so intermittently, which is worse
  // than doing it always.
  sync?.abandonClaim()

  // `record_state` first: it is the half the dialog's copy promises, so if only
  // one of the two can happen it should be that one.
  const record = await port.deleteRecord()

  // Then §14.6 row 1. This call is why `0003_phase4_erase.sql` exists, and its
  // absence is why that migration shipped as a policy nothing exercised. A
  // throw here propagates: it means part of what the account holds did not go,
  // and a reader who asked for everything to be removed is owed that rather
  // than a quiet "deleted".
  const history = await port.deleteHistory()

  return { rows: record.rows, historyRows: history.rows }
}

/** §14.7.3 — `off` until an instance says otherwise. Never a guess. */
export function syncState(): SyncState {
  return sync?.state() ?? 'off'
}

export function subscribeSyncState(listener: () => void): () => void {
  syncListeners.add(listener)
  start()
  return () => {
    syncListeners.delete(listener)
  }
}

/**
 * §14.7.3 — the four values, subscribed, for the footer readout.
 *
 * `off` on the server and in the first client render: a static export is built
 * before the reader has an account, so "nothing is being asserted about a
 * server" is the only true thing build-time HTML can say. It is also a constant
 * the server and the first client render compute identically, which is the one
 * rule this file has (§12.2).
 */
export function useSyncState(): SyncState {
  return useSyncExternalStore(
    subscribeSyncState,
    () => syncState(),
    () => 'off' as SyncState,
  )
}

/**
 * Hands the current record to the account layer and lets it try.
 *
 * `localWrite` first, always: it records what is now authoritative and that a
 * push is owed, so an attempt that fails leaves `failed` beside a record the
 * store still holds. Nothing is awaited and nothing is returned — a caller
 * cannot accidentally make the local write depend on the network, which is
 * §12.1.4's rule and §14.7.3's rule stated once.
 */
function pushToAccount(at?: string): void {
  if (sync === null) return
  sync.localWrite(current, at)
  void sync.push().then(
    () => undefined,
    () => {
      // `sync.ts` owns what a rejection means and has already recorded it.
      // Swallowed here only so a rejected push cannot become an unhandled
      // rejection in a reader's console.
    },
  )
}

// --- the flush ---------------------------------------------------------------

function flushNow(): void {
  if (flushTimer !== null) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (!started || !dirty) return
  dirty = false
  const at = nowIso()
  const result = writeRecord(storage, current, at)
  if (result.ok) {
    savedAt = at
    lastWrite = 'saved'
  } else {
    lastWrite = result.reason
    // §12.1.4 — the in-memory store stays live. The UI prints NOT SAVED beside
    // the affected control, with EXPORT YOUR RECORD as the adjacent action.
    if (result.reason === 'blocked') stampStorage('blocked')
  }
  // Posted whether or not the write landed: another tab can still be right
  // about the reader's state even when this browser refuses to store it.
  try {
    channel?.postMessage(serialise(current, at, false))
  } catch {
    // A closed channel is not an error worth propagating.
  }
  notify()
  /**
   * §14.7.3 — the push rides the flush, and it rides it LAST.
   *
   * The throttle §12.1.4 already installed is exactly the debounce a network
   * write wants: one send per burst of ticks and keystrokes rather than one per
   * reducer. Being here also fixes the ordering that matters — the local copy
   * has been attempted first, so the account never holds a state this browser
   * never tried to keep.
   *
   * `at` is passed whether or not storage accepted the value, so the envelope
   * on the server carries the same `savedAt` as the one on disk. When storage
   * REFUSED, that instant matters more rather than less: the server's copy is
   * then the only durable one, and giving it a different timestamp from the
   * export the reader was just told to take would make two copies of one record
   * disagree about when it was written.
   */
  pushToAccount(at)
}

function scheduleFlush(): void {
  dirty = true
  lastWrite = 'pending'
  if (flushTimer !== null) return
  flushTimer = setTimeout(flushNow, FLUSH_MS)
}

// --- cross-tab (§12.1.5) -----------------------------------------------------

/**
 * `storage` covers durability: it fires in a tab that never opened a channel.
 * `key === null` is `clear()`; `newValue === null` is removed-or-cleared. In
 * both cases the record is gone from storage, and an erase in another tab
 * (§12.15) has to reach this one, so the in-memory record follows it down.
 *
 * A quarantine arriving from another tab is deliberately NOT adopted: the copy
 * is preserved under the quarantine key by whichever context read it, and
 * this tab's readable state is the better thing to keep on screen.
 */
function onStorage(event: StorageEvent): void {
  if (event.key !== null && event.key !== RECORD_STORAGE_KEY) return
  if (event.key === null || event.newValue === null) {
    // The key is gone: an erase, or storage cleared under this tab. `adopt`
    // declines to push an empty record, which is what keeps this from undoing
    // the erase the other tab is performing.
    adopt(EMPTY_RECORD)
    return
  }
  const result = parseEnvelope(event.newValue)
  if (result.kind === 'ok') {
    savedAt = result.savedAt
    adopt(result.data)
  }
}

function onMessage(event: MessageEvent): void {
  if (typeof event.data !== 'string') return
  const result = parseEnvelope(event.data)
  if (result.kind === 'ok') {
    savedAt = result.savedAt
    adopt(result.data)
  }
}

function onVisibilityChange(): void {
  if (document.visibilityState === 'hidden') flushNow()
}

/**
 * §12.1.6 — the QUERIED answer, never an assumed one. Recorded through the
 * reducer so the readout re-renders and so the answer survives a reload; a
 * `false` result is normal and is not an error.
 */
function askPersisted(): void {
  try {
    if (typeof navigator === 'undefined') return
    if (typeof navigator.storage?.persisted !== 'function') return
    void navigator.storage
      .persisted()
      .then((granted) => {
        // In memory only, and NOT through the reducer.
        //
        // `update` schedules a flush, so writing the grant here made merely
        // LOADING a page put an envelope in storage. Two things were wrong with
        // that. It breaks §12.13's own distinction: the boot script stamps
        // `data-hl-record` from whatever storage holds at load, so from a
        // reader's SECOND page view onward an envelope written by their first
        // would have had the empty state tell them they had cleared a record
        // they never made. And it wrote to a reader's device for a fact about
        // their browser, before they had asked the site to remember anything.
        //
        // Nothing is lost. The grant is re-queried on every load and
        // `storageReadout` reads this variable first, so the readout is the
        // browser's current answer rather than a stored one that may have gone
        // stale. `requestPersistence` still records it through the reducer,
        // because that runs on the first sign-off — where a write is happening
        // anyway, for work the reader actually did.
        queriedPersisted = granted
        notify()
      })
      .catch(() => {
        // Unimplemented or refused: the readout stays UNKNOWN, which is true.
      })
  } catch {
    // Same.
  }
}

/**
 * Reads storage once and installs the listeners. Called from `subscribe` — so
 * it runs after the hydration commit, never during a render — and from
 * `update`, so a record can never be written on top of a record that was never
 * read.
 */
function start(): void {
  if (started || typeof window === 'undefined') return
  started = true

  storage = safeStorage()
  if (storage === null) stampStorage('blocked')

  const result = readRecord(storage)
  if (result.kind === 'ok') {
    current = result.data
    savedAt = result.savedAt
  } else if (result.kind === 'quarantine') {
    // §12.1.2 — the live record is treated as absent and the profile sheet
    // prints RECORD WRITTEN BY A NEWER VERSION OF THIS SITE — NOT READ.
    quarantined = result.reason
  }
  hydrated = true

  window.addEventListener('pagehide', flushNow)
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('storage', onStorage)
  try {
    channel = new BroadcastChannel(CHANNEL_NAME)
    channel.onmessage = onMessage
  } catch {
    // Unimplemented: the `storage` listener alone still covers cross-tab.
  }

  askPersisted()
  notify()
}

/**
 * Subscribe to the record, outside React.
 *
 * `useRecord` is the way for a component; this is the way for a
 * DOM-enhancement island, which has no render to re-run. `ChecklistIsland`
 * needs it so another tab ticking an item repaints this one (§12.1.5).
 *
 * Exported for that reason and no other. Anything with a render should use the
 * hook, so React owns when it re-reads.
 */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  start()
  return () => {
    listeners.delete(listener)
  }
}

// --- the hooks ---------------------------------------------------------------

/**
 * The record. On the server and in the first client render this is the frozen
 * EMPTY_RECORD singleton — the honest empty form, which is the only thing
 * build-time HTML can truthfully claim about a reader it has never met.
 */
export function useRecord(): RecordData {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => EMPTY_RECORD,
  )
}

/**
 * False on the server and in the first client render; true once storage has
 * been read. A readout uses it to tell "nothing recorded" from "not yet known"
 * — the two states §12.13 gives different copy.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hydrated,
    () => false,
  )
}

// --- writes ------------------------------------------------------------------

/**
 * Applies a reducer synchronously to memory, notifies, then schedules the
 * throttled flush. The in-memory store is authoritative (§12.1.4): the UI never
 * waits on storage, and a reducer that changed nothing costs nothing.
 */
export function update(fn: (data: RecordData) => RecordData, event?: RecordEvent): void {
  start()
  const next = fn(current)
  if (next === current) return
  current = next
  notify()
  scheduleFlush()
  // §14.7.3 — the account is told a write happened, and nothing here waits for
  // it. `localWrite` is synchronous bookkeeping: it marks `pending` so the
  // footer stops claiming `synced` the instant the record moves ahead of the
  // server, which is a whole flush interval before the send is attempted.
  sync?.localWrite(current)
  // §14.2.3 — and the log row, when the caller named one. `enqueue` returns
  // null while signed out, which is the common case and costs nothing.
  if (event !== undefined) {
    sync?.enqueue(event.kind, event.sheetSlug ?? null, event.payload, nowIso())
  }
}

/**
 * §14.2.3 — file a log row for an act that changed no data.
 *
 * `update` files its row as a side effect of a write, and returns early when
 * the reducer produced no change — correct there, because an act that moved
 * nothing is not an act. But some acts ARE the act while leaving the envelope
 * exactly as it was: an attempt boundary is one. `QuickCheck` writes every
 * keystroke through `update` and files ONE row when the reader leaves the
 * field, and by then the data has long since changed.
 *
 * Deliberately not an overload of `update` with an identity reducer. That would
 * work by relying on `next === current` NOT short-circuiting the enqueue, which
 * is the opposite of what that branch is for, and the next reader of either
 * function would have to hold both meanings at once.
 *
 * `enqueue` returns null while signed out, so this costs nothing in the common
 * case and nothing about the record depends on the row existing.
 */
export function logEvent(event: RecordEvent): void {
  start()
  sync?.enqueue(event.kind, event.sheetSlug ?? null, event.payload, nowIso())
}

/**
 * §14.2.3 — what a write WAS, named by the only code that can know.
 *
 * The envelope records the state after; the log records the act. Those are
 * different questions and the second one cannot be recovered from the first:
 * three quiz attempts and one lucky answer leave the same record behind, and
 * §14.8.1's second attention rule is defined on exactly that difference.
 *
 * The alternative considered and rejected was inferring the event by diffing
 * the record before and after inside `update`. That would put a SECOND
 * definition of "what happened" beside `events.ts`, computed by a different
 * mechanism, and the two would drift the first time a reducer touched a field
 * the differ did not know about. So the caller names it: the component that
 * chose the reducer is the one place the act is already known.
 *
 * `kind` is `EventKind`, whose members are the exported function names in
 * `events.ts` — rename one there and this stops compiling, which is the point.
 */
export interface RecordEvent {
  kind: EventKind
  /** Null for a record-wide act: identity, role, preferences. */
  sheetSlug?: string | null
  payload?: Readonly<Record<string, unknown>>
}

/** The record as it stands, for an event handler that is not a component. */
export function snapshot(): RecordData {
  return current
}

/** §12.11 item 6 — the envelope's own `savedAt`, or null if never written. */
export function recordSavedAt(): string | null {
  return savedAt
}

/** §12.1.2 — non-null when a payload this build cannot read was set aside. */
export function quarantineReason(): 'newer' | 'malformed' | null {
  return quarantined
}

/** §12.1.4 — what the last flush did. `pending` means not yet attempted. */
export function writeState(): WriteState {
  if (dirty || flushTimer !== null) return 'pending'
  return lastWrite
}

/**
 * The same value, subscribed. A component cannot learn about a refused write
 * from `useRecord` — the record itself did not change when storage said no —
 * so the `NOT SAVED` readout of §12.1.4 needs its own subscription. The
 * snapshot is a string, so it is stable by value.
 */
export function useWriteState(): WriteState {
  return useSyncExternalStore(
    subscribe,
    () => writeState(),
    () => 'pending' as WriteState,
  )
}

/** Forces the flush the throttle is holding — for a control that must confirm. */
export function flush(): void {
  flushNow()
}

/**
 * §12.1.6 — called ONCE, on a genuine user gesture (the first sign-off). A
 * `false` result is normal, not an error: the browser is entitled to say no.
 * Returns null where the API does not exist, which is not the same as a refusal
 * and must not be printed as one.
 */
export async function requestPersistence(): Promise<boolean | null> {
  if (persistenceAsked) return queriedPersisted
  persistenceAsked = true
  try {
    if (typeof navigator === 'undefined') return null
    if (typeof navigator.storage?.persist !== 'function') return null
    const granted = await navigator.storage.persist()
    queriedPersisted = granted
    update((data) => setPersisted(data, granted))
    return granted
  } catch {
    return null
  }
}

/**
 * §12.1.6 — never print a value that has not been queried, which is what
 * `UNKNOWN` is for. `navigator.storage.estimate()` is not read here at all: it
 * may be shown as bytes labelled an approximation, and never as a percentage,
 * gauge, ring or fill bar.
 */
export function storageReadout(): 'PERSISTENT' | 'BEST-EFFORT' | 'UNAVAILABLE' | 'UNKNOWN' {
  if ((started && storage === null) || lastWrite === 'blocked') return 'UNAVAILABLE'
  const answer = queriedPersisted ?? current.meta.persisted
  if (answer === true) return 'PERSISTENT'
  if (answer === false) return 'BEST-EFFORT'
  return 'UNKNOWN'
}

// --- export / import (§12.15) ------------------------------------------------

/**
 * §12.15 — export is load-bearing durability, not a convenience: Safari deletes
 * script-writable storage after seven days without a visit, and LRU eviction
 * deletes ALL of an origin's data at once. Indented, because GDPR Art. 20 asks
 * for "structured, commonly used and machine-readable" and a human reading
 * their own record in a text editor is the cheapest proof that §1 reaches the
 * storage layer.
 */
export function exportJson(data: RecordData, at: string = nowIso()): string {
  return serialise(data, at, true)
}

/**
 * §12.15 — an imported file is untrusted input and is fully validated before
 * anything is committed; the caller commits with
 * `update(() => result.data)` only for `kind: 'ok'`.
 *
 * §12.12.6 — accepts either the raw `.json` or the report `.html`, because the
 * failure mode that removes is a learner who keeps the pretty document and
 * loses the record. A file with no payload in it reads as `empty`.
 */
export function importJson(text: string): ParseResult {
  return parseEnvelope(envelopeTextFrom(text))
}
