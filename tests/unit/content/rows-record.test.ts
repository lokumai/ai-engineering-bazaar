import { describe, expect, it } from 'vitest'
import { sheetRows } from '@/lib/content/manifest'
import {
  DEFAULT_FILTER_ID,
  FILTERS,
  applyFilter,
  noMatchReadout,
  type SheetRow,
} from '@/lib/content/rows'

/**
 * §4.8 item 5, §12.2, §12.13, §12.18 — the row model's link to the record, and
 * the two chips that select on it.
 *
 * `rows.ts` imports nothing, so most of this is arithmetic over plain data.
 * What it is protecting is a hydration invariant: the chip that is active on
 * load must be one the prerender can honour, or the first client render emits a
 * different number of `<tr>` than the HTML it is hydrating.
 *
 * The last block measures the real corpus, because the two caches in
 * `manifest.ts` and `loader.ts` never invalidate: a new `SheetRow` field that
 * came out empty would look identical in `next dev` to one that had not been
 * added at all.
 */

function row(over: Partial<SheetRow> = {}): SheetRow {
  return {
    module: 13,
    number: '13',
    slug: 'intermediate/security',
    title: 'Security',
    path: '/courses/intermediate/security/',
    drawn: true,
    status: 'READY',
    subsystem: { order: 2, title: 'Intermediate', path: '/courses/intermediate/' },
    extent: '4,883 W · 30 MIN',
    sources: '23',
    lang: 'EN',
    bilingual: false,
    requires: '12',
    topics: ['What is actually different'],
    slots: ['SIGN-OFF', 'QUIZ', 'CHECKLIST', 'SOURCES'],
    ...over,
  }
}

const SIGNED_SHEET = row()
const UNSIGNED_SHEET = row({ module: 12, slug: 'intermediate/agents', title: 'Agents' })
const DRAFT = row({
  module: 17,
  slug: 'expert/advanced-architectures',
  title: 'Advanced Architectures',
  drawn: false,
  status: 'NOT DRAWN',
  bilingual: true,
  slots: [],
})

const ROWS = [SIGNED_SHEET, UNSIGNED_SHEET, DRAFT]
const SIGNED = new Set([SIGNED_SHEET.slug, DRAFT.slug])

describe('the filter chips (§4.8 item 5, §12.18)', () => {
  it('offers §4.8\'s four names in its order, then §12.18\'s two', () => {
    expect(FILTERS.map((filter) => filter.label)).toEqual([
      'ALL', 'READY', 'NOT DRAWN', 'EN · TR', 'SIGNED OFF', 'UNSIGNED',
    ])
  })

  it('starts on ALL, the only chip a prerender can honour (§12.2)', () => {
    expect(DEFAULT_FILTER_ID).toBe('all')
    expect(FILTERS[0].id).toBe(DEFAULT_FILTER_ID)
    expect(FILTERS[0].basis).toBe('drawing')
  })

  it('says which chips select on the reader rather than on the drawing', () => {
    const record = FILTERS.filter((filter) => filter.basis === 'record')
    expect(record.map((filter) => filter.id)).toEqual(['signed', 'unsigned'])
  })

  it('keeps every sheet under ALL, whatever the record says', () => {
    expect(applyFilter(ROWS, 'all', SIGNED)).toHaveLength(3)
    expect(applyFilter(ROWS, 'all')).toHaveLength(3)
  })

  it('never re-sorts: the set is numbered and has one order (§9.1)', () => {
    expect(applyFilter(ROWS, 'all').map((r) => r.module)).toEqual([13, 12, 17])
    // 13 is signed off, so what is left keeps the order it was handed in.
    expect(applyFilter(ROWS, 'unsigned', SIGNED).map((r) => r.module)).toEqual([12, 17])
  })

  it('narrows nothing when it has no record: the honest empty first frame', () => {
    // What the server and the first client render see. `SIGNED OFF` selects
    // nothing, `UNSIGNED` selects everything, and neither is ever the active
    // chip at that moment.
    expect(applyFilter(ROWS, 'signed')).toHaveLength(0)
    expect(applyFilter(ROWS, 'unsigned')).toHaveLength(3)
  })

  it('selects the sheets the reader signed off, once there is a record', () => {
    expect(applyFilter(ROWS, 'signed', SIGNED).map((r) => r.slug))
      .toEqual([SIGNED_SHEET.slug])
  })

  it('never counts a draft as signed off, whatever the record carries', () => {
    // An imported record can carry a sign-off for a sheet nobody has drawn:
    // no control on this site could have produced it, and §11.28 says a draft
    // awards nothing. `SIGNED` above holds exactly that hostile case.
    expect(applyFilter(ROWS, 'signed', SIGNED)).not.toContain(DRAFT)
    expect(applyFilter(ROWS, 'unsigned', SIGNED)).toContain(DRAFT)
  })

  it('counts an undrawn sheet as unsigned, the way §12.5.2 counts TO GO', () => {
    expect(applyFilter(ROWS, 'unsigned', SIGNED).map((r) => r.module)).toEqual([12, 17])
  })

  it('is keyed by slug, never by module number (§12.1.3)', () => {
    const renumbered = [row({ module: 1, number: '01' })]
    expect(applyFilter(renumbered, 'signed', SIGNED)).toHaveLength(1)
  })

  it('returns every row for a chip id it does not recognise', () => {
    expect(applyFilter(ROWS, 'reader-was-here', SIGNED)).toHaveLength(3)
  })

  it('still filters on the drawing exactly as §4.8 asked', () => {
    expect(applyFilter(ROWS, 'ready').map((r) => r.module)).toEqual([13, 12])
    expect(applyFilter(ROWS, 'not-drawn').map((r) => r.module)).toEqual([17])
    expect(applyFilter(ROWS, 'bilingual').map((r) => r.module)).toEqual([17])
  })
})

describe('§12.13 class 3 — the NO MATCH readout', () => {
  it('is §12.13\'s copy, with the denominator the chips were handed', () => {
    expect(noMatchReadout(32)).toBe('NO SHEETS MATCH FILTER — 0 of 32')
    expect(noMatchReadout(8)).toBe('NO SHEETS MATCH FILTER — 0 of 8')
  })

  it('keeps the copy register: no terminal period, no exclamation (§12.14.1)', () => {
    const readout = noMatchReadout(32)
    expect(readout.endsWith('.')).toBe(false)
    expect(readout).not.toMatch(/!|just|simply|sorry|please|oops/i)
  })
})

describe('the row\'s sign-off slots (§4.8 column 9)', () => {
  it('names slots, and never says which of them are filled', () => {
    // The row is a fact about the drawing. Nothing in `SheetRow` can express a
    // filled square, which is what keeps the prerender honest (§12.2).
    expect(SIGNED_SHEET.slots).toEqual(['SIGN-OFF', 'QUIZ', 'CHECKLIST', 'SOURCES'])
    expect(Object.keys(SIGNED_SHEET)).not.toContain('signedOff')
  })

  it('gives a sheet nobody has drawn no slots at all (§11.28, §5.9)', () => {
    expect(DRAFT.slots).toEqual([])
  })
})

describe('the corpus\'s own slots (§4.8 column 9, §11.25)', () => {
  const rows = sheetRows()

  it('gives every drawn sheet a SIGN-OFF slot and every draft none', () => {
    for (const sheet of rows) {
      if (sheet.drawn) expect(sheet.slots[0], sheet.slug).toBe('SIGN-OFF')
      else expect(sheet.slots, sheet.slug).toEqual([])
    }
  })

  it('draws a CHECKLIST square on the one sheet that has a checklist (§12.7)', () => {
    const withChecklist = rows.filter((sheet) => sheet.slots.includes('CHECKLIST'))
    expect(withChecklist.map((sheet) => sheet.slug)).toEqual(['intermediate/security'])
  })

  it('draws no SOURCES square where the sheet cannot supply five (§5.9)', () => {
    // Modules 2, 4 and 5 cite nothing at all, and an empty slot that can never
    // fill is the one thing §5.9 refuses.
    for (const sheet of rows) {
      if (sheet.slots.includes('SOURCES')) {
        expect(Number(sheet.sources), sheet.slug).toBeGreaterThanOrEqual(5)
      }
    }
    expect(rows.some((sheet) => sheet.drawn && !sheet.slots.includes('SOURCES'))).toBe(true)
  })

  it('keys every row by the slug the record is keyed by (§12.1.3)', () => {
    expect(new Set(rows.map((sheet) => sheet.slug)).size).toBe(rows.length)
    for (const sheet of rows) expect(sheet.slug, sheet.title).toMatch(/^[a-z-]+\/[a-z0-9-]+$/)
  })

  it('never draws more squares than the column was widened for', () => {
    // 72px holds four 14px squares with record.css's 4px gaps, and `columnsFor`
    // and `min-width: 1060px` were computed against exactly that.
    for (const sheet of rows) expect(sheet.slots.length, sheet.slug).toBeLessThanOrEqual(4)
  })
})
