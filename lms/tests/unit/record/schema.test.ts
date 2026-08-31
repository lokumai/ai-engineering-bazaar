import { describe, expect, it } from 'vitest'
import {
  DWELL_CAP_SECONDS,
  EMPTY_RECORD,
  MARK_IDS,
  MAX_SUBMITTALS,
  RECORD_QUARANTINE_KEY,
  RECORD_STORAGE_KEY,
  SCHEMA_VERSION,
  emptySheetRecord,
} from '@/lib/record/schema'

describe('the storage keys', () => {
  it('are the two §12.1.1 names', () => {
    expect(RECORD_STORAGE_KEY).toBe('hl-record')
    expect(RECORD_QUARANTINE_KEY).toBe('hl-record-quarantine')
  })

  it('both carry the hl- prefix, which is the only isolation the origin gives', () => {
    // §12.1.1: lokumai.github.io is shared with every other project site the
    // owner publishes, and an origin excludes the path.
    for (const key of [RECORD_STORAGE_KEY, RECORD_QUARANTINE_KEY]) {
      expect(key.startsWith('hl-')).toBe(true)
    }
    expect(RECORD_STORAGE_KEY).not.toBe(RECORD_QUARANTINE_KEY)
    expect(RECORD_STORAGE_KEY).not.toBe('hl-theme')
  })

  it('starts the envelope at schema 1 (§12.1.2)', () => {
    expect(SCHEMA_VERSION).toBe(1)
  })
})

describe('EMPTY_RECORD', () => {
  it('is the honest empty form §12.2 Channel B renders on the server', () => {
    expect(EMPTY_RECORD).toEqual({
      identity: { name: null, markSeed: null, mark: null },
      sheets: {},
      days: [],
      prefs: { charKeys: true },
      meta: { lastExport: null, persisted: null },
    })
  })

  it('defaults charKeys on, as §12.16 specifies for this audience', () => {
    expect(EMPTY_RECORD.prefs.charKeys).toBe(true)
  })

  it('is one singleton, or useSyncExternalStore loops', () => {
    // getServerSnapshot must return an identical value every call.
    const first: unknown = EMPTY_RECORD
    const second: unknown = EMPTY_RECORD
    expect(first).toBe(second)
  })

  it('is frozen all the way down, so no reducer can smuggle a mutation in', () => {
    expect(Object.isFrozen(EMPTY_RECORD)).toBe(true)
    expect(Object.isFrozen(EMPTY_RECORD.identity)).toBe(true)
    expect(Object.isFrozen(EMPTY_RECORD.sheets)).toBe(true)
    expect(Object.isFrozen(EMPTY_RECORD.days)).toBe(true)
    expect(Object.isFrozen(EMPTY_RECORD.prefs)).toBe(true)
    expect(Object.isFrozen(EMPTY_RECORD.meta)).toBe(true)
  })

  it('throws on a write attempt rather than silently accepting one', () => {
    expect(() => {
      ;(EMPTY_RECORD as { days: string[] }).days = ['2026-08-31']
    }).toThrow()
    expect(() => {
      EMPTY_RECORD.days.push('2026-08-31')
    }).toThrow()
    expect(EMPTY_RECORD.days).toEqual([])
  })
})

describe('emptySheetRecord', () => {
  it('is the §12.1.3 shape with nothing observed and nothing asserted', () => {
    expect(emptySheetRecord()).toEqual({
      signedOff: null,
      signedRevision: null,
      reachedEnd: false,
      dwellSeconds: 0,
      quiz: null,
      checklist: {},
      sources: [],
      submittals: [],
    })
  })

  it('hands back a fresh mutable object every call', () => {
    const a = emptySheetRecord()
    const b = emptySheetRecord()
    expect(a).not.toBe(b)
    expect(a.checklist).not.toBe(b.checklist)
    expect(Object.isFrozen(a)).toBe(false)
  })
})

describe('the closed vocabularies', () => {
  it('lists the six §12.3.5 drafting marks and nothing else', () => {
    // Owned by lib/identity/mark.ts and re-exported here; `seeded` is storable
    // but is not a glyph choice — the record writes `null` for it.
    expect([...MARK_IDS])
      .toEqual(['seeded', 'datum', 'section', 'weld', 'finish', 'centre', 'hex'])
  })

  it('carries §12.4.4 and §12.9.1 as constants, not as magic numbers', () => {
    expect(DWELL_CAP_SECONDS).toBe(3600)
    expect(MAX_SUBMITTALS).toBe(3)
  })
})
