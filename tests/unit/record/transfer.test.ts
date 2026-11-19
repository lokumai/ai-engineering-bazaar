import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  MAX_INFLATED_BYTES,
  MAX_PAYLOAD_CHARS,
  appLink,
  compactJson,
  decodeTransfer,
  encodeTransfer,
  mergeTransfer,
  nothingToMove,
  parseCompactJson,
  payloadFromHash,
  transferCounts,
  transferLink,
  type TransferProgress,
} from '@/lib/record/transfer'
import { EMPTY_RECORD, type RecordData, type SheetRecord } from '@/lib/record/schema'
import { coerceRecordData } from '@/lib/record/validate'

/**
 * D144 — the transfer link, held to the shared protocol.
 *
 * The vector was made by a third implementation (Python's zlib), so it proves the codec reads a
 * payload this code did not write, and the app's suite replays the same file. Everything else
 * is a rule over invented slugs, never a fact about the course (tests/README.md).
 */

interface Vector {
  recordData: unknown
  compactJson: string
  payload: string
  url: string
}

const VECTOR: Vector = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'tests/fixtures/transfer/vector-1.json'), 'utf8'),
)

const NOW = '2026-11-02T09:15:30.123Z'

function sheet(partial: Partial<SheetRecord> = {}): SheetRecord {
  return { signedOff: null, signedRevision: null, reachedEnd: false, dwellSeconds: 0, checklist: {}, ...partial }
}

function record(partial: Partial<RecordData> = {}): RecordData {
  return { ...coerceRecordData({}), ...partial }
}

function incoming(partial: Partial<TransferProgress> = {}): TransferProgress {
  return { sheets: {}, everyoneSheets: {}, days: [], ...partial }
}

async function deflateText(text: string): Promise<string> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'))
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer())
  return Buffer.from(bytes).toString('base64url')
}

describe('vector 1', () => {
  const data = coerceRecordData(VECTOR.recordData)

  it('encodes the record to the compact JSON exactly', () => {
    expect(compactJson(data)).toBe(VECTOR.compactJson)
  })

  it('decodes the payload another implementation made', async () => {
    const progress = await decodeTransfer(VECTOR.payload)
    expect(progress).toEqual(parseCompactJson(VECTOR.compactJson))
    expect(progress?.sheets['alpha/first']).toEqual({
      signedOff: data.sheets['alpha/first'].signedOff,
      signedRevision: data.sheets['alpha/first'].signedRevision,
      ticks: [0, 2],
    })
    expect(progress?.days).toEqual(data.days)
  })

  it('reads its own link back from the fragment the vector names', () => {
    expect(payloadFromHash(new URL(VECTOR.url).hash)).toBe(VECTOR.payload)
    expect(transferLink(new URL(VECTOR.url).origin, VECTOR.payload)).toBe(VECTOR.url)
  })

  it('round-trips: what it encodes, it decodes, and merging into nothing gives the progress back', async () => {
    const payload = await encodeTransfer(data)
    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/)
    const progress = await decodeTransfer(payload)
    expect(progress).not.toBeNull()
    const merged = mergeTransfer(record(), progress!)
    expect(compactJson(merged)).toBe(VECTOR.compactJson)
  })
})

describe('encoding', () => {
  it('leaves out a module with neither a completion nor a tick, and says when nothing is left', () => {
    const data = record({ sheets: { 'a/one': sheet({ reachedEnd: true, dwellSeconds: 30 }) } })
    expect(JSON.parse(compactJson(data)).e).toEqual({})
    expect(nothingToMove(data)).toBe(true)
    expect(nothingToMove(record({ everyoneSheets: { 'a/one': sheet({ checklist: { '3': true } }) } }))).toBe(false)
  })

  it('carries a non-canonical instant as it is, and a revision the record refuses as empty', () => {
    const data = record({
      sheets: { 'a/one': sheet({ signedOff: '2026-11-02', signedRevision: 'NOT-A-HASH' }) },
    })
    expect(JSON.parse(compactJson(data)).e['a/one']).toEqual(['2026-11-02', '', []])
  })

  it('carries an instant before 1970 as it is, and reads it back', async () => {
    const before = '1969-12-31T23:59:59.000Z'
    const data = record({ sheets: { 'a/one': sheet({ signedOff: before, signedRevision: 'abcd' }) } })
    expect(JSON.parse(compactJson(data)).e['a/one']).toEqual([before, 'abcd', []])
    const progress = await decodeTransfer(await encodeTransfer(data))
    expect(progress?.sheets['a/one']).toEqual({ signedOff: before, signedRevision: 'abcd', ticks: [] })
    expect(mergeTransfer(record(), progress!).sheets['a/one'].signedOff).toBe(before)
  })

  it('writes no revision for a module that is not completed', () => {
    const data = record({ sheets: { 'a/one': sheet({ signedRevision: 'abcd', checklist: { '1': true } }) } })
    expect(JSON.parse(compactJson(data)).e['a/one']).toEqual(['', '', [1]])
  })

  it('builds the app link on the custom scheme', () => {
    expect(appLink('abc')).toBe('aibazaar://transfer#t=abc')
  })
})

describe('the fragment', () => {
  it('reads only the t parameter, and nothing when there is none', () => {
    expect(payloadFromHash('#x=1&t=abc&y=2')).toBe('abc')
    expect(payloadFromHash('')).toBeNull()
    expect(payloadFromHash('#')).toBeNull()
    expect(payloadFromHash('#data')).toBeNull()
  })
})

describe('refusals: the whole link or nothing', () => {
  const good = (e: unknown) => JSON.stringify({ v: 1, e, y: {}, d: [] })

  it('refuses another version', async () => {
    expect(parseCompactJson(JSON.stringify({ v: 2, e: {}, y: {}, d: [] }))).toBeNull()
    expect(await decodeTransfer(await deflateText(JSON.stringify({ v: 2, e: {}, y: {}, d: [] })))).toBeNull()
  })

  it('refuses an unsafe slug, even beside a good one', () => {
    expect(parseCompactJson('{"v":1,"e":{"a/one":["","",[1]],"__proto__":["","",[1]]},"y":{},"d":[]}')).toBeNull()
    expect(parseCompactJson(good({ constructor: ['', '', [1]] }))).toBeNull()
    expect(parseCompactJson(good({ ['x'.repeat(201)]: ['', '', [1]] }))).toBeNull()
  })

  it('refuses an instant the record would not accept', () => {
    expect(parseCompactJson(good({ 'a/one': ['2026-02-31T00:00:00.000Z', '', []] }))).toBeNull()
    expect(parseCompactJson(good({ 'a/one': ['NOT36', '', []] }))).toBeNull()
    expect(parseCompactJson(good({ 'a/one': ['zzzzzzzzzzz', '', []] }))).toBeNull()
    expect(parseCompactJson(good({ 'a/one': ['zzzzzzzzzzzz', '', []] }))).toBeNull()
  })

  it('reads a base36 instant and a date-only instant', () => {
    const ms = Date.parse(NOW).toString(36)
    expect(parseCompactJson(good({ 'a/one': [ms, '', []] }))?.sheets['a/one'].signedOff).toBe(NOW)
    expect(parseCompactJson(good({ 'a/one': ['2026-11-02', '', []] }))?.sheets['a/one'].signedOff).toBe('2026-11-02')
  })

  it('refuses a revision the record would not accept, a tick out of range, and a bad day', () => {
    expect(parseCompactJson(good({ 'a/one': ['', 'XYZ', []] }))).toBeNull()
    expect(parseCompactJson(good({ 'a/one': ['', '', [10000]] }))).toBeNull()
    expect(parseCompactJson(good({ 'a/one': ['', '', [-1]] }))).toBeNull()
    expect(parseCompactJson(good({ 'a/one': ['', '', [1.5]] }))).toBeNull()
    expect(parseCompactJson(good({ 'a/one': ['', '', ['1']] }))).toBeNull()
    expect(parseCompactJson(JSON.stringify({ v: 1, e: {}, y: {}, d: ['2026-02-31'] }))).toBeNull()
  })

  it('refuses the wrong shape', () => {
    expect(parseCompactJson(good({ 'a/one': ['', ''] }))).toBeNull()
    expect(parseCompactJson(good({ 'a/one': { signedOff: '' } }))).toBeNull()
    expect(parseCompactJson(good([['', '', []]]))).toBeNull()
    expect(parseCompactJson(JSON.stringify({ v: 1, e: {}, y: {} }))).toBeNull()
    expect(parseCompactJson('[1]')).toBeNull()
    expect(parseCompactJson('{')).toBeNull()
  })

  it('refuses garbage base64, a payload that does not inflate, and text that is not UTF-8', async () => {
    expect(await decodeTransfer('not base64!')).toBeNull()
    expect(await decodeTransfer('')).toBeNull()
    expect(await decodeTransfer('AAAA')).toBeNull()
    expect(await decodeTransfer(Buffer.from('plain text, not deflate').toString('base64url'))).toBeNull()
  })

  it('refuses a payload over the length limit before decoding it', async () => {
    expect(await decodeTransfer(VECTOR.payload + 'A'.repeat(MAX_PAYLOAD_CHARS))).toBeNull()
  })

  it('refuses a payload that inflates past the limit', async () => {
    const big = JSON.stringify({ v: 1, e: {}, y: {}, d: [], pad: ' '.repeat(MAX_INFLATED_BYTES) })
    const payload = await deflateText(big)
    expect(payload.length).toBeLessThanOrEqual(MAX_PAYLOAD_CHARS)
    expect(await decodeTransfer(payload)).toBeNull()
  })

  it('accepts the payload with its base64 padding', async () => {
    const padded = VECTOR.payload + '='.repeat((4 - (VECTOR.payload.length % 4)) % 4)
    expect(await decodeTransfer(padded)).toEqual(parseCompactJson(VECTOR.compactJson))
  })
})

describe('counts', () => {
  it('counts completed modules per track, not ticked ones', () => {
    const progress = parseCompactJson(VECTOR.compactJson)!
    const expected = (map: TransferProgress['sheets']) =>
      Object.values(map).filter((entry) => entry.signedOff !== null).length
    expect(transferCounts(progress)).toEqual({
      engineers: expected(progress.sheets),
      everyone: expected(progress.everyoneSheets),
    })
    expect(transferCounts(incoming({ sheets: { 'a/one': { signedOff: null, signedRevision: null, ticks: [1] } } })))
      .toEqual({ engineers: 0, everyone: 0 })
  })
})

describe('the merge only adds', () => {
  const done = { signedOff: NOW, signedRevision: 'abcd123', ticks: [] }

  it('takes in a module this side does not have', () => {
    const merged = mergeTransfer(record(), incoming({ everyoneSheets: { 'a/one': { ...done, ticks: [2, 0] } } }))
    expect(merged.everyoneSheets['a/one']).toEqual(
      sheet({ signedOff: NOW, signedRevision: 'abcd123', checklist: { '0': true, '2': true } }),
    )
    expect(merged.sheets).toEqual({})
  })

  it('keeps a completion already here, with its own date and revision', () => {
    const local = record({ sheets: { 'a/one': sheet({ signedOff: '2026-01-01T00:00:00.000Z', signedRevision: 'ffff' }) } })
    const merged = mergeTransfer(local, incoming({ sheets: { 'a/one': done } }))
    expect(merged).toBe(local)
  })

  it('fills a completion that is missing here', () => {
    const local = record({ sheets: { 'a/one': sheet({ checklist: { '1': true }, reachedEnd: true, dwellSeconds: 90 }) } })
    const merged = mergeTransfer(local, incoming({ sheets: { 'a/one': done } }))
    expect(merged.sheets['a/one']).toEqual(
      sheet({ signedOff: NOW, signedRevision: 'abcd123', checklist: { '1': true }, reachedEnd: true, dwellSeconds: 90 }),
    )
  })

  it('joins the ticks and never removes one', () => {
    const local = record({ sheets: { 'a/one': sheet({ checklist: { '1': true, '5': true } }) } })
    const merged = mergeTransfer(local, incoming({ sheets: { 'a/one': { signedOff: null, signedRevision: null, ticks: [0, 1] } } }))
    expect(merged.sheets['a/one'].checklist).toEqual({ '0': true, '1': true, '5': true })
  })

  it('joins the days, sorted and distinct', () => {
    const local = record({ days: ['2026-11-01', '2026-11-03'] })
    const merged = mergeTransfer(local, incoming({ days: ['2026-11-02', '2026-11-03'] }))
    expect(merged.days).toEqual(['2026-11-01', '2026-11-02', '2026-11-03'])
  })

  it('leaves prefs, meta, reachedEnd and dwell as they are', () => {
    const local = record({
      sheets: { 'a/one': sheet({ reachedEnd: true, dwellSeconds: 40, checklist: { '1': true } }) },
      prefs: { ...EMPTY_RECORD.prefs, charKeys: false, railFolded: true },
      meta: { lastExport: NOW, persisted: true },
    })
    const merged = mergeTransfer(local, incoming({ sheets: { 'a/one': done, 'a/two': done } }))
    expect(merged.prefs).toBe(local.prefs)
    expect(merged.meta).toBe(local.meta)
    expect(merged.sheets['a/one'].reachedEnd).toBe(true)
    expect(merged.sheets['a/one'].dwellSeconds).toBe(40)
    expect(merged.sheets['a/two'].reachedEnd).toBe(false)
    expect(merged.sheets['a/two'].dwellSeconds).toBe(0)
  })

  it('returns the same record when the link adds nothing', async () => {
    const data = coerceRecordData(VECTOR.recordData)
    const progress = (await decodeTransfer(await encodeTransfer(data)))!
    expect(mergeTransfer(data, progress)).toBe(data)
    expect(mergeTransfer(data, incoming())).toBe(data)
    // An entry that carries nothing adds nothing, not an empty module.
    expect(mergeTransfer(data, incoming({ sheets: { 'a/new': { signedOff: null, signedRevision: null, ticks: [] } } })))
      .toBe(data)
  })

  it('does not change the record it was given', () => {
    const local = record({ sheets: { 'a/one': sheet({ checklist: { '1': true } }) }, days: ['2026-11-01'] })
    const before = JSON.stringify(local)
    mergeTransfer(local, incoming({ sheets: { 'a/one': { ...done, ticks: [2] } }, days: ['2026-11-02'] }))
    expect(JSON.stringify(local)).toBe(before)
  })

  it('writes what the record validator reads back unchanged', () => {
    const merged = mergeTransfer(record(), parseCompactJson(VECTOR.compactJson)!)
    expect(coerceRecordData(JSON.parse(JSON.stringify(merged)))).toEqual(merged)
  })
})
