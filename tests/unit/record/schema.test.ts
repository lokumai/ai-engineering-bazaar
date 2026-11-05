import { describe, expect, it } from 'vitest'
import {
  DWELL_CAP_SECONDS,
  EMPTY_RECORD,
  RECORD_QUARANTINE_KEY,
  RECORD_STORAGE_KEY,
  SCHEMA_VERSION,
  carriesNothing,
  emptySheetRecord,
  type RecordData } from '@/lib/record/schema'

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

  it('defaults charKeys on, as §12.16 specifies for this audience', () => {
    expect(EMPTY_RECORD.prefs.charKeys).toBe(true)
  })

  it('defaults the curriculum rail OPEN, because nobody asked for it shut', () => {
    expect(EMPTY_RECORD.prefs.railFolded).toBe(false)
  })

  /**
   * M12 — null, not `'overview'`. The distinction is what tells "has not
   * chosen" from "chose the view that happens to be the default": the boot
   * script stamps nothing for null and the stylesheet's fallback reveals the
   * default, so a later change of default moves the reader who never chose and
   * leaves the reader who did where they put themselves.
   */
  it('defaults the catalog view to null, which is not the same as the default view', () => {
    expect(EMPTY_RECORD.prefs.catalogView).toBeNull()
  })

  it('is one singleton, or useSyncExternalStore loops', () => {
    // getServerSnapshot must return an identical value every call.
    const first: unknown = EMPTY_RECORD
    const second: unknown = EMPTY_RECORD
    expect(first).toBe(second)
  })

  it('is frozen all the way down, so no reducer can smuggle a mutation in', () => {
    expect(Object.isFrozen(EMPTY_RECORD)).toBe(true)
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

  it('hands back a fresh mutable object every call', () => {
    const a = emptySheetRecord()
    const b = emptySheetRecord()
    expect(a).not.toBe(b)
    expect(a.checklist).not.toBe(b.checklist)
    expect(Object.isFrozen(a)).toBe(false)
  })
})

