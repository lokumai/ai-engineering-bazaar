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
  EMPTY_RECORD,
  RECORD_STORAGE_KEY,
  SCHEMA_VERSION,
  type Envelope,
  type RecordData,
} from './schema'
import { readRecord, safeStorage, writeRecord, type RecordStorage } from './storage'
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

function adopt(data: RecordData): void {
  current = data
  notify()
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
export function update(fn: (data: RecordData) => RecordData): void {
  start()
  const next = fn(current)
  if (next === current) return
  current = next
  notify()
  scheduleFlush()
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
