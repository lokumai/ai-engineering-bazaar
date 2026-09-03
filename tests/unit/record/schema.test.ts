import { describe, expect, it } from 'vitest'
import {
  DWELL_CAP_SECONDS,
  EMPTY_RECORD,
  MARK_IDS,
  MAX_SUBMITTALS,
  RECORD_QUARANTINE_KEY,
  RECORD_STORAGE_KEY,
  ROLE_IDS,
  SCHEMA_VERSION,
  carriesNothing,
  emptySheetRecord,
  type RecordData,
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
      identity: { name: null, markSeed: null, mark: null, role: null },
      sheets: {},
      days: [],
      // §16.3 widened `prefs`: `aliasNamedFor` is null here because no account
      // has named this record, which is the only thing a build can know about a
      // reader it has never met.
      prefs: { charKeys: true, aliasNamedFor: null },
      meta: { lastExport: null, persisted: null, lastClaim: null },
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
  it('lists the seven drafting marks and nothing else', () => {
    // Owned by lib/identity/mark.ts and re-exported here; `seeded` is storable
    // but is not a glyph choice — the record writes `null` for it.
    //
    // §13.14 amends §12.3.5 from seven ids to eight. `lokum` is LAST, and that
    // position is the contract: the picker renders this order, so a mark
    // inserted mid-list would silently move every glyph after it under a
    // reader who had already chosen one.
    expect([...MARK_IDS])
      .toEqual(['seeded', 'datum', 'section', 'weld', 'finish', 'centre', 'hex', 'lokum'])
  })

  it('lists the nine §13.3 roles in their frozen order and nothing else', () => {
    // Owned by lib/path/roles.ts and re-exported here, the same arrangement as
    // MARK_IDS: the order is the order the §13.4.3 picker renders, and the ids
    // are what key a stored record, so a rename orphans one.
    expect([...ROLE_IDS]).toEqual([
      'software-engineer', 'devops', 'data-engineer', 'data-analyst', 'analyst',
      'qa', 'project-manager', 'dba', 'pre-sales',
    ])
  })

  it('carries §12.4.4 and §12.9.1 as constants, not as magic numbers', () => {
    expect(DWELL_CAP_SECONDS).toBe(3600)
    expect(MAX_SUBMITTALS).toBe(3)
  })
})

describe('§17.3 — a receipt is not content', () => {
  it('carriesNothing ignores meta.lastClaim', () => {
    // A claim that moved nothing into an empty browser must not make that
    // browser look like it holds a record: `stamp.ts` would mark the document,
    // another tab would push the envelope, and `AccountSync`'s erase-wins guard
    // would stop being able to tell an erase from a claim.
    const receipted: RecordData = {
      ...EMPTY_RECORD,
      meta: {
        ...EMPTY_RECORD.meta,
        lastClaim: {
          at: '2026-09-02T11:17:00.000Z',
          summary: {
            outcome: 'adopted',
            signed: { here: 0, account: 0, shared: 0, merged: 0 },
            submittals: { here: 0, account: 0, shared: 0, merged: 0 },
            droppedSignatures: [],
            droppedSubmittals: [],
            identity: {
              name: 'absent',
              markSeed: 'absent',
              role: 'absent',
              markChanged: false,
              nameChanged: false,
              roleChanged: false,
            },
          },
        },
      },
    }
    expect(carriesNothing(receipted)).toBe(true)
  })
})
