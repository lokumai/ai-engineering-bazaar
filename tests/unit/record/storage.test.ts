import { afterEach, describe, expect, it } from 'vitest'
import {
  RECORD_QUARANTINE_KEY,
  RECORD_STORAGE_KEY,
  SCHEMA_VERSION,
  EMPTY_RECORD,
  type RecordData,
} from '@/lib/record/schema'
import { SOFT_CAP_BYTES, readRecord, safeStorage, writeRecord, type RecordStorage } from '@/lib/record/storage'
import { signOff } from '@/lib/record/events'
import { parseEnvelope } from '@/lib/record/validate'

const NOW = '2026-08-31T09:15:00.000Z'

/** The §12.14.2 port pattern: a Map behind the storage interface, in node. */
function fake(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  const writes: Array<[string, string]> = []
  let throwOnSet: { name: string } | null = null
  let throwOnGet: { name: string } | null = null
  const storage: RecordStorage = {
    getItem(key) {
      if (throwOnGet) throw Object.assign(new Error('blocked'), throwOnGet)
      return map.get(key) ?? null
    },
    setItem(key, value) {
      if (throwOnSet) throw Object.assign(new Error('rejected'), throwOnSet)
      writes.push([key, value])
      map.set(key, value)
    },
    removeItem(key) {
      map.delete(key)
    },
  }
  return {
    storage,
    map,
    writes,
    failSet(error: { name: string }) { throwOnSet = error },
    failGet(error: { name: string }) { throwOnGet = error },
  }
}

const envelope = (data: unknown, schema = SCHEMA_VERSION) =>
  JSON.stringify({ schema, savedAt: NOW, data })

afterEach(() => {
  delete (globalThis as { window?: unknown }).window
})

describe('safeStorage — the property access itself is guarded (§12.1.4)', () => {
  it('returns null with no window at all, as on the server', () => {
    expect(safeStorage()).toBeNull()
  })

  it('returns null when the getter throws SecurityError, not a broken port', () => {
    // The getter throws for an opaque origin and when the user has told the
    // browser not to persist data — blocking cookies is commonly read as
    // exactly that instruction — so the access can throw before any key.
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      get() {
        return {
          get localStorage(): unknown {
            throw Object.assign(new Error('denied'), { name: 'SecurityError' })
          },
        }
      },
    })
    expect(() => safeStorage()).not.toThrow()
    expect(safeStorage()).toBeNull()
  })

  it('hands back a port that reads and writes the real object', () => {
    const map = new Map<string, string>()
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => map.get(key) ?? null,
          setItem: (key: string, value: string) => { map.set(key, value) },
          removeItem: (key: string) => { map.delete(key) },
        },
      },
    })
    const port = safeStorage()
    expect(port).not.toBeNull()
    port?.setItem('hl-probe', 'x')
    expect(port?.getItem('hl-probe')).toBe('x')
    port?.removeItem('hl-probe')
    expect(port?.getItem('hl-probe')).toBeNull()
  })
})

describe('readRecord', () => {
  it('reads an absent port and an absent key as empty', () => {
    expect(readRecord(null)).toEqual({ kind: 'empty' })
    expect(readRecord(fake().storage)).toEqual({ kind: 'empty' })
  })

  it('reads a stored record back off the documented key', () => {
    const store = fake({ [RECORD_STORAGE_KEY]: envelope({ days: ['2026-08-31'] }) })
    const result = readRecord(store.storage)
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.data.days).toEqual(['2026-08-31'])
  })

  it('is empty rather than throwing when getItem itself throws', () => {
    const store = fake()
    store.failGet({ name: 'SecurityError' })
    expect(readRecord(store.storage)).toEqual({ kind: 'empty' })
  })
})

describe('readRecord — quarantine (§12.1.2)', () => {
  it('copies a newer payload verbatim and leaves the live record in place', () => {
    const raw = envelope({ identity: { name: 'From the future' } }, SCHEMA_VERSION + 1)
    const store = fake({ [RECORD_STORAGE_KEY]: raw })
    const result = readRecord(store.storage)
    expect(result.kind).toBe('quarantine')
    if (result.kind !== 'quarantine') return
    expect(result.reason).toBe('newer')
    expect(store.map.get(RECORD_QUARANTINE_KEY)).toBe(raw)
    // Never discarded: this is the only copy of the record in existence.
    expect(store.map.get(RECORD_STORAGE_KEY)).toBe(raw)
  })

  it('quarantines a malformed payload the same way', () => {
    const store = fake({ [RECORD_STORAGE_KEY]: '{"schema":1,"data":' })
    const result = readRecord(store.storage)
    expect(result.kind).toBe('quarantine')
    if (result.kind !== 'quarantine') return
    expect(result.reason).toBe('malformed')
    expect(store.map.get(RECORD_QUARANTINE_KEY)).toBe('{"schema":1,"data":')
  })

  it('does not rewrite an identical quarantine copy on every reload', () => {
    const raw = envelope({}, 9)
    const store = fake({ [RECORD_STORAGE_KEY]: raw, [RECORD_QUARANTINE_KEY]: raw })
    readRecord(store.storage)
    expect(store.writes).toEqual([])
  })

  it('replaces an older quarantine copy with the newer payload', () => {
    const store = fake({ [RECORD_STORAGE_KEY]: envelope({ days: [] }, 9), [RECORD_QUARANTINE_KEY]: 'older' })
    readRecord(store.storage)
    expect(store.map.get(RECORD_QUARANTINE_KEY)).toBe(envelope({ days: [] }, 9))
  })

  it('still reports the quarantine when the quarantine write is refused', () => {
    const store = fake({ [RECORD_STORAGE_KEY]: envelope({}, 9) })
    store.failSet({ name: 'QuotaExceededError' })
    const result = readRecord(store.storage)
    expect(result.kind).toBe('quarantine')
  })
})

describe('writeRecord', () => {
  it('writes the versioned envelope under the one key', () => {
    const store = fake()
    const data = signOff(EMPTY_RECORD, 'fundamentals/llms', 'a1b2c3d', NOW)
    expect(writeRecord(store.storage, data, NOW)).toEqual({ ok: true })
    expect(store.writes).toHaveLength(1)
    expect(store.writes[0][0]).toBe(RECORD_STORAGE_KEY)
    expect(JSON.parse(store.writes[0][1])).toEqual({ schema: SCHEMA_VERSION, savedAt: NOW, data })
  })

  it('round-trips through the parser it will be read back with', () => {
    const store = fake()
    const data = signOff(EMPTY_RECORD, 'fundamentals/llms', 'a1b2c3d', NOW)
    writeRecord(store.storage, data, NOW)
    const result = readRecord(store.storage)
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.data).toEqual(data)
    expect(result.savedAt).toBe(NOW)
  })

  it('reports blocked with no storage at all, and writes nothing', () => {
    expect(writeRecord(null, EMPTY_RECORD, NOW)).toEqual({ ok: false, reason: 'blocked' })
  })

  it('branches on err.name, never on instanceof (§12.1.4)', () => {
    // QuotaExceededError is mid-transition from a plain DOMException to its own
    // interface, so instanceof is not reliable in either direction.
    const quota = fake()
    quota.failSet({ name: 'QuotaExceededError' })
    expect(writeRecord(quota.storage, EMPTY_RECORD, NOW)).toEqual({ ok: false, reason: 'quota' })

    const firefox = fake()
    firefox.failSet({ name: 'NS_ERROR_DOM_QUOTA_REACHED' })
    expect(writeRecord(firefox.storage, EMPTY_RECORD, NOW)).toEqual({ ok: false, reason: 'quota' })

    const denied = fake()
    denied.failSet({ name: 'SecurityError' })
    expect(writeRecord(denied.storage, EMPTY_RECORD, NOW)).toEqual({ ok: false, reason: 'blocked' })

    const unknown = fake()
    unknown.failSet({ name: 'TypeError' })
    expect(writeRecord(unknown.storage, EMPTY_RECORD, NOW)).toEqual({ ok: false, reason: 'blocked' })
  })

  it('refuses a payload over the soft cap before it touches storage', () => {
    expect(SOFT_CAP_BYTES).toBe(512 * 1024)
    const store = fake()
    const data: RecordData = { ...EMPTY_RECORD, identity: { ...EMPTY_RECORD.identity, name: 'x'.repeat(SOFT_CAP_BYTES) } }
    expect(writeRecord(store.storage, data, NOW)).toEqual({ ok: false, reason: 'too-large' })
    expect(store.writes).toEqual([])
  })

  it('measures UTF-8 bytes, not UTF-16 units', () => {
    // Half a million astral characters is 2 UTF-16 units each and 4 bytes each:
    // `json.length` would pass this and the write would fail in the browser.
    const store = fake()
    const name = '𐐷'.repeat(140_000)
    const data: RecordData = { ...EMPTY_RECORD, identity: { ...EMPTY_RECORD.identity, name } }
    expect(JSON.stringify(data).length).toBeLessThan(SOFT_CAP_BYTES)
    expect(writeRecord(store.storage, data, NOW)).toEqual({ ok: false, reason: 'too-large' })
  })

  it('writes a record that sits just under the cap', () => {
    const store = fake()
    const data: RecordData = { ...EMPTY_RECORD, identity: { ...EMPTY_RECORD.identity, name: 'x'.repeat(1000) } }
    expect(writeRecord(store.storage, data, NOW)).toEqual({ ok: true })
  })
})
