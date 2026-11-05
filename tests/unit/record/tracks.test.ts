import { describe, expect, it } from 'vitest'
import { recordBootScript } from '@/lib/record/boot'
import { setChecklistItem, signOff, unsign } from '@/lib/record/events'
import {
  EMPTY_RECORD,
  RECORD_STORAGE_KEY,
  SCHEMA_VERSION,
  carriesNothing,
  trackView,
  type RecordData,
} from '@/lib/record/schema'
import { stampClassesFor, type StampFacts } from '@/lib/record/stamp'
import { coerceRecordData } from '@/lib/record/validate'

/**
 * D86, D91 — completion is per track. A module completed in one track is not
 * completed in the other, in the record, in what the boot script stamps, and in
 * what every reader of the record is handed. The browser suite cannot prove
 * this yet: no For Everyone module is written, so the For Everyone side has
 * nothing to draw. These rules hold for any content.
 */

const AT = '2026-11-05T09:00:00.000Z'
const SLUG = 'intermediate/security'
const FACTS: StampFacts = {
  categoryTotals: { intermediate: 8 },
  slugToModule: { [SLUG]: 15 },
}

describe('a completion belongs to one track', () => {
  it('For Everyone writes the For Everyone map and leaves For Engineers alone', () => {
    const data = signOff(EMPTY_RECORD, SLUG, null, AT, 'everyone')
    expect(data.everyoneSheets[SLUG]?.signedOff).toBe(AT)
    expect(data.sheets[SLUG]).toBeUndefined()
  })

  it('For Engineers is still the default, and writes the map it always wrote', () => {
    const data = signOff(EMPTY_RECORD, SLUG, 'a1b2c3d', AT)
    expect(data.sheets[SLUG]?.signedOff).toBe(AT)
    expect(data.everyoneSheets[SLUG]).toBeUndefined()
  })

  it('undoing one track keeps the other', () => {
    const both = signOff(signOff(EMPTY_RECORD, SLUG, null, AT), SLUG, null, AT, 'everyone')
    const undone = unsign(both, SLUG, 'everyone')
    expect(undone.sheets[SLUG]?.signedOff).toBe(AT)
    expect(undone.everyoneSheets[SLUG]?.signedOff ?? null).toBeNull()
  })

  it('a checklist tick is per track too', () => {
    const data = setChecklistItem(EMPTY_RECORD, SLUG, 0, true, AT, 'everyone')
    expect(data.everyoneSheets[SLUG]?.checklist).toEqual({ 0: true })
    expect(data.sheets[SLUG]).toBeUndefined()
  })

  it('hands each reader the map of the track it asked for', () => {
    const data = signOff(EMPTY_RECORD, SLUG, null, AT, 'everyone')
    expect(trackView(data, 'everyone').sheets[SLUG]?.signedOff).toBe(AT)
    expect(trackView(data, 'engineers').sheets[SLUG]).toBeUndefined()
  })

  it('a record with only a For Everyone completion carries something', () => {
    expect(carriesNothing(signOff(EMPTY_RECORD, SLUG, null, AT, 'everyone'))).toBe(false)
  })

  it('stamps each track with its own prefix and never the other', () => {
    expect(stampClassesFor(signOff(EMPTY_RECORD, SLUG, null, AT, 'everyone'), FACTS))
      .toEqual(['hl-e-cat-intermediate-started', 'hl-e-signed-15'])
    expect(stampClassesFor(signOff(EMPTY_RECORD, SLUG, null, AT), FACTS))
      .toEqual(['hl-cat-intermediate-started', 'hl-signed-15'])
  })
})

describe('a record from before the tracks', () => {
  it('reads as For Engineers progress, with an empty For Everyone map', () => {
    const before = { sheets: { [SLUG]: { signedOff: AT } }, days: [], prefs: {}, meta: {} }
    const data = coerceRecordData(before)
    expect(data.sheets[SLUG]?.signedOff).toBe(AT)
    expect(data.everyoneSheets).toEqual({})
  })

  it('keeps a For Everyone map it is given, and drops an unsafe key in it', () => {
    const data = coerceRecordData({
      sheets: {},
      everyoneSheets: { [SLUG]: { signedOff: AT }, __proto__: { signedOff: AT } },
    })
    expect(data.everyoneSheets[SLUG]?.signedOff).toBe(AT)
    expect(Object.keys(data.everyoneSheets)).toEqual([SLUG])
  })
})

/** Run the emitted boot script at an address, with this tab's remembered track. */
function trackStampedAt(pathname: string, remembered: string | null, data: RecordData = EMPTY_RECORD) {
  const attributes = new Map<string, string>()
  const root = {
    classList: { add() {}, remove() {}, contains: () => false },
    setAttribute: (name: string, value: string) => { attributes.set(name, value) },
    getAttribute: (name: string) => attributes.get(name) ?? null,
    style: { setProperty() {}, removeProperty() {} },
    className: '',
  }
  const stored = JSON.stringify({ schema: SCHEMA_VERSION, savedAt: AT, data })
  const run = new Function('window', 'document', 'Object', 'JSON',
    recordBootScript(FACTS.categoryTotals, FACTS.slugToModule))
  run(
    {
      location: { pathname },
      localStorage: { getItem: (key: string) => (key === RECORD_STORAGE_KEY ? stored : null) },
      sessionStorage: { getItem: (key: string) => (key === 'hl-track' ? remembered : null) },
    },
    { documentElement: root },
    Object,
    JSON,
  )
  return attributes.get('data-bz-track')
}

describe('the track on <html> in frame one', () => {
  it("is the address's own track, whatever the tab remembers", () => {
    expect(trackStampedAt('/everyone/courses/intermediate/security/', 'engineers')).toBe('everyone')
    expect(trackStampedAt('/ai-engineering-bazaar/tr/everyone/sheets/', null)).toBe('everyone')
    expect(trackStampedAt('/courses/intermediate/security/', 'everyone')).toBe('engineers')
    expect(trackStampedAt('/ai-engineering-bazaar/sheets/expert/', 'everyone')).toBe('engineers')
  })

  it('on a page of neither track, is the one this tab last read, else For Engineers', () => {
    expect(trackStampedAt('/profile/', 'everyone')).toBe('everyone')
    expect(trackStampedAt('/', 'engineers')).toBe('engineers')
    expect(trackStampedAt('/legend/', null)).toBe('engineers')
    expect(trackStampedAt('/profile/', 'nonsense')).toBe('engineers')
  })
})
