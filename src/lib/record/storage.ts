/**
 * §12.1.1, §12.1.4 — the ONLY module that names the storage key or touches a
 * Storage object. Nothing else in the codebase may (the sole existing
 * exception, `hl-theme` in `lib/theme.ts`, is unchanged).
 *
 * Port-shaped, so every branch below is testable in node behind a Map-backed
 * fake — the pattern `ThemeStorage` already established (§12.14.2). The port
 * deliberately does NOT swallow errors: the two functions here own the
 * try/catch, because what a failure means differs between a read and a write.
 */

import {
  RECORD_QUARANTINE_KEY,
  RECORD_STORAGE_KEY,
  SCHEMA_VERSION,
  type Envelope,
  type RecordData,
} from './schema'
import { parseEnvelope, type ParseResult } from './validate'

/** The slice of `Storage` this module uses. */
export interface RecordStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * §12.1.4 — a soft cap well under the 5 MiB the whole origin gets, which is
 * SHARED with every sibling site on `lokumai.github.io` and from which an
 * exceeded write is rejected rather than evicted. The cap exists to stop an
 * imported file from consuming the shared quota, not to constrain real use: a
 * record of 32 sheets with three submittals each is a few kilobytes.
 */
export const SOFT_CAP_BYTES = 512 * 1024

const ENCODER = new TextEncoder()

/**
 * §12.1.4 — the `window.localStorage` PROPERTY ACCESS ITSELF is inside the
 * try/catch. The getter throws `SecurityError` when the origin is opaque or
 * the user has configured the browser not to persist data, and blocking
 * cookies is commonly interpreted as exactly that instruction — so the access
 * throws before any key is read.
 *
 * Returns null for "no storage here", which the caller renders as §12.13's
 * empty-state class 4: the reader is told, rather than signing off sheets into
 * nothing.
 */
export function safeStorage(): RecordStorage | null {
  try {
    // Not a render-time read: §12.2 forbids `typeof window` in a render path,
    // and this is only ever called from an effect or an event handler.
    if (typeof window === 'undefined') return null
    const storage = window.localStorage
    if (!storage) return null
    return {
      getItem: (key) => storage.getItem(key),
      setItem: (key, value) => { storage.setItem(key, value) },
      removeItem: (key) => { storage.removeItem(key) },
    }
  } catch {
    return null
  }
}

/**
 * Reads the record, quarantining anything this code cannot read.
 *
 * A quarantine NEVER removes `hl-record`: §12.1.2 forbids discarding a payload
 * from a newer version, because GitHub Pages serves cached bundles and this is
 * the only copy of the record in existence. The live record is treated as
 * absent; the copy under `hl-record-quarantine` is what makes that safe.
 *
 * A read that throws returns `empty` rather than quarantining — there is
 * nothing to preserve, because nothing was read.
 */
export function readRecord(storage: RecordStorage | null): ParseResult {
  if (storage === null) return { kind: 'empty' }

  let raw: string | null
  try {
    raw = storage.getItem(RECORD_STORAGE_KEY)
  } catch {
    return { kind: 'empty' }
  }

  const result = parseEnvelope(raw)
  if (result.kind === 'quarantine') {
    try {
      // Byte for byte, and not rewritten on every reload of the same payload.
      if (storage.getItem(RECORD_QUARANTINE_KEY) !== result.raw) {
        storage.setItem(RECORD_QUARANTINE_KEY, result.raw)
      }
    } catch {
      // The record is still reported as quarantined and still left in place;
      // there is nothing more this function can do about a refused write.
    }
  }
  return result
}

/**
 * §12.1.4 — the flush. The in-memory store stays authoritative whatever this
 * returns, and the UI prints `NOT SAVED` beside the affected control with
 * `EXPORT YOUR RECORD` adjacent: a write silently thrown away while the page
 * keeps claiming the state is the §1 failure in its purest form.
 *
 * The size guard runs BEFORE the write, in UTF-8 bytes — `json.length` counts
 * UTF-16 units and would pass a payload that is twice or four times the size on
 * the way in.
 *
 * The error branch reads `err.name`, never `instanceof`: `QuotaExceededError`
 * is mid-transition from a plain `DOMException` to its own interface, so
 * `instanceof` is unreliable in both directions. Firefox's legacy
 * `NS_ERROR_DOM_QUOTA_REACHED` is included because it is still what older
 * Gecko throws.
 */
export function writeRecord(
  storage: RecordStorage | null,
  data: RecordData,
  now: string,
): { ok: true } | { ok: false; reason: 'quota' | 'blocked' | 'too-large' } {
  if (storage === null) return { ok: false, reason: 'blocked' }

  const envelope: Envelope = { schema: SCHEMA_VERSION, savedAt: now, data }
  let json: string
  try {
    json = JSON.stringify(envelope)
  } catch {
    // A record JSON cannot express is a payload problem, not a storage one.
    return { ok: false, reason: 'too-large' }
  }
  if (ENCODER.encode(json).length > SOFT_CAP_BYTES) return { ok: false, reason: 'too-large' }

  try {
    storage.setItem(RECORD_STORAGE_KEY, json)
  } catch (error) {
    const name = (error as { name?: unknown } | null)?.name
    const quota = name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED'
    return { ok: false, reason: quota ? 'quota' : 'blocked' }
  }
  return { ok: true }
}
