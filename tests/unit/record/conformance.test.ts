import { describe, expect, it } from 'vitest'
import {
  categoryProgress,
  isSigned,
  nextUnsigned,
  signedCount,
  tally,
  type CurriculumFacts,
} from '@/lib/record/derive'
import { erasedRecord } from '@/lib/record/erase'
import { INSTANT_DAY, markActivity, markExported, signOff, unsign } from '@/lib/record/events'
import {
  EMPTY_RECORD,
  SCHEMA_VERSION,
  carriesNothing,
  emptySheetRecord,
  type RecordData,
  type SheetRecord,
  trackView,
} from '@/lib/record/schema'
import { SOFT_CAP_BYTES } from '@/lib/record/storage'
import { exportFilename, exportJson, serialise } from '@/lib/record/store'
import { ISO_DAY, ISO_TIME, envelopeTextFrom, parseEnvelope } from '@/lib/record/validate'
import { TRACK_IDS, type Track } from '@/lib/tracks'

/**
 * The record's answers, written to a file another implementation can be held to.
 *
 * The native reader keeps progress in the web's record format and moves it in
 * and out through the same file the web exports, so its parser, its reducers,
 * its writer and its selectors have to give the web's answers. This file asks
 * the web every question the app ports and pins what the web said, in
 * `__snapshots__/record-conformance.v1.json`; the build copies that file into
 * the bundle, and the app's own suite replays it.
 *
 * **The web is the oracle.** Every `expect` in the fixture is computed here by
 * the shipped code, never typed in, and every constant is imported from the
 * module that owns it, so this file restates no rule. Change a reducer and this
 * test prints the diff of what the app would now disagree with. Accept it with
 * `npx vitest -u` or fix what you broke.
 *
 * **No vocabulary rides along.** The app passes through every subtree it does
 * not write, so it never needs the web's lists of views or palettes, and a
 * copy of one would be a second rule that drifts. The shape test below holds
 * the fixture to its five sections and seven constants.
 *
 * **The `signedOff` cases are generated, not chosen.** The app's acceptance has
 * to equal V8's `Date.parse` over every shape `ISO_TIME` admits, and no grammar
 * for that is written down anywhere, so the battery walks the shape classes
 * (separator, precision, offset) and lets the web answer each one.
 *
 * **Both tracks (D91).** Completion is per track: For Engineers in `sheets`,
 * For Everyone in `everyoneSheets`, the same shape. The parse cases read both
 * maps, the reduce cases write each, and every derive answer is given per
 * track through `trackView`, the one function the web's pages see a track's
 * record through.
 *
 * Inputs are invented and frozen, slugs like `alpha/first`; every field other
 * than the one a case varies is canonical, meaning it reads back unchanged.
 */

const DAY = '2026-03-14'
const SAVED_AT = '2026-03-14T08:00:00.000Z'
const NOW = '2026-03-14T09:26:53.589Z'
const LATER = '2026-03-15T07:10:00.000Z'
const REVISION = 'a1b2c3d'

const SIGNED_SHEET: SheetRecord = { ...emptySheetRecord(), signedOff: NOW, signedRevision: REVISION }

function canonical(patch: Partial<RecordData> = {}): RecordData {
  return structuredClone({ ...EMPTY_RECORD, ...patch })
}

/** One signed sheet and a day: canonical, and not empty. */
const CANONICAL = canonical({
  sheets: { 'alpha/first': SIGNED_SHEET },
  days: [DAY],
})

// ---------------------------------------------------------------------------
// Building input text with the key order a case needs
// ---------------------------------------------------------------------------

/**
 * JSON text for an object whose keys keep the order given. `JSON.stringify`
 * moves integer-like keys to the front, which is exactly the reordering the
 * export cases exist to pin, so the input text is assembled by hand.
 */
function objectText(entries: ReadonlyArray<readonly [string, string]>): string {
  return `{${entries.map(([key, text]) => `${JSON.stringify(key)}:${text}`).join(',')}}`
}

/** The canonical record's text, with the named top-level fields replaced. */
function dataText(replace: Partial<Record<keyof RecordData, string>> = {}): string {
  const keys = Object.keys(CANONICAL) as Array<keyof RecordData>
  return objectText(keys.map((key) => [key, replace[key] ?? JSON.stringify(CANONICAL[key])]))
}

function envelopeText(data: string = dataText(), schema: string = String(SCHEMA_VERSION)): string {
  return objectText([
    ['schema', schema],
    ['savedAt', JSON.stringify(SAVED_AT)],
    ['data', data],
  ])
}

function sheetsText(entries: ReadonlyArray<readonly [string, unknown]>): string {
  return objectText(entries.map(([slug, sheet]) => [slug, JSON.stringify(sheet)]))
}

/** `alpha/first` canonical, plus one entry under test, in the For Engineers map or the For Everyone one. */
function withSheet(slug: string, sheet: unknown, map: 'sheets' | 'everyoneSheets' = 'sheets'): string {
  const entries = sheetsText([['alpha/first', SIGNED_SHEET], [slug, sheet]])
  return envelopeText(dataText({ [map]: entries }))
}

/** The canonical record's text without one top-level field, as a record written before it existed. */
function dataTextWithout(key: keyof RecordData): string {
  const keys = (Object.keys(CANONICAL) as Array<keyof RecordData>).filter((one) => one !== key)
  return objectText(keys.map((one) => [one, JSON.stringify(CANONICAL[one])]))
}

function withSignedOff(value: unknown): string {
  return envelopeText(
    dataText({ sheets: sheetsText([['alpha/first', { ...SIGNED_SHEET, signedOff: value }]]) }),
  )
}

const ENCODER = new TextEncoder()

/** `text` as UTF-8 with `bytes` spliced in where `marker` stood, which must occur once. */
function bytesWith(text: string, marker: string, bytes: number[]): Uint8Array {
  const at = text.indexOf(marker)
  if (at === -1 || text.indexOf(marker, at + 1) !== -1) {
    throw new Error(`conformance: marker ${marker} must occur exactly once in ${text}`)
  }
  const before = ENCODER.encode(text.slice(0, at))
  const after = ENCODER.encode(text.slice(at + marker.length))
  return Uint8Array.from([...before, ...bytes, ...after])
}

// ---------------------------------------------------------------------------
// parse[]
// ---------------------------------------------------------------------------

type ParseCase = { name: string } & ({ input: string } | { inputBase64: string })

interface ParseAnswer {
  kind: 'ok' | 'empty' | 'quarantine'
  reason?: 'newer' | 'malformed'
  reads?: { signed: Record<string, string>; everyoneSigned: Record<string, string>; days: string[] }
}

function textOf(item: ParseCase): string {
  if ('input' in item) return item.input
  return new TextDecoder().decode(Buffer.from(item.inputBase64, 'base64'))
}

function parseAnswer(item: ParseCase): ParseAnswer {
  const result = parseEnvelope(envelopeTextFrom(textOf(item)))
  if (result.kind === 'empty') return { kind: 'empty' }
  if (result.kind === 'quarantine') return { kind: 'quarantine', reason: result.reason }
  const signedIn = (map: Record<string, SheetRecord>) => {
    const signed: Record<string, string> = {}
    for (const [slug, sheet] of Object.entries(map)) {
      if (sheet.signedOff !== null) signed[slug] = sheet.signedOff
    }
    return signed
  }
  return {
    kind: 'ok',
    reads: { signed: signedIn(result.data.sheets), everyoneSigned: signedIn(result.data.everyoneSheets), days: result.data.days },
  }
}

const BOM = [0xef, 0xbb, 0xbf]
const BAD_BYTE = 'BAD_BYTE'

const ENVELOPE_CASES: ParseCase[] = [
  { name: 'envelope: canonical', input: envelopeText() },
  { name: 'envelope: empty', input: '' },
  { name: 'envelope: whitespace', input: ' \n\t ' },
  { name: 'envelope: broken JSON', input: envelopeText().slice(0, -1) },
  { name: 'envelope: an array', input: `[${envelopeText()}]` },
  { name: 'envelope: schema "1"', input: envelopeText(dataText(), '"1"') },
  { name: 'envelope: schema 0', input: envelopeText(dataText(), '0') },
  { name: 'envelope: schema 1.5', input: envelopeText(dataText(), '1.5') },
  { name: 'envelope: schema 1.0', input: envelopeText(dataText(), '1.0') },
  { name: 'envelope: schema 2', input: envelopeText(dataText(), '2') },
  { name: 'envelope: schema 1e400', input: envelopeText(dataText(), '1e400') },
  {
    name: 'envelope: data missing',
    input: objectText([
      ['schema', String(SCHEMA_VERSION)],
      ['savedAt', JSON.stringify(SAVED_AT)],
    ]),
  },
  { name: 'envelope: data an array', input: envelopeText('[]') },
  { name: 'envelope: data a string', input: envelopeText('"data"') },
  {
    name: 'envelope: an html page around the record carries no record',
    input: `<!doctype html><html><body><script id="hl-record" type="application/json">${envelopeText()}</script></body></html>`,
  },
  {
    name: 'envelope: a leading BOM in bytes',
    inputBase64: Buffer.from(Uint8Array.from([...BOM, ...ENCODER.encode(envelopeText())])).toString(
      'base64',
    ),
  },
  {
    name: 'envelope: invalid UTF-8 inside a string',
    inputBase64: Buffer.from(
      bytesWith(
        withSheet(`alpha/second${BAD_BYTE}`, SIGNED_SHEET),
        BAD_BYTE,
        [0xff],
      ),
    ).toString('base64'),
  },
  {
    name: 'envelope: invalid UTF-8 between tokens',
    inputBase64: Buffer.from(
      bytesWith(envelopeText().replace('"savedAt"', `${BAD_BYTE}"savedAt"`), BAD_BYTE, [0xff]),
    ).toString('base64'),
  },
]

const SHEET_MAP_CASES: ParseCase[] = [
  { name: 'sheets: a __proto__ slug', input: withSheet('__proto__', SIGNED_SHEET) },
  { name: 'sheets: a constructor slug', input: withSheet('constructor', SIGNED_SHEET) },
  { name: 'sheets: a prototype slug', input: withSheet('prototype', SIGNED_SHEET) },
  { name: 'sheets: a 201-character slug', input: withSheet('a'.repeat(201), SIGNED_SHEET) },
  { name: 'sheets: a 200-character slug', input: withSheet('a'.repeat(200), SIGNED_SHEET) },
  { name: 'sheets: a slug "42"', input: withSheet('42', SIGNED_SHEET) },
  { name: 'sheets: an entry that is not an object', input: withSheet('alpha/second', 'signed') },
  { name: 'sheets: an entry {}', input: withSheet('alpha/second', {}) },
  { name: 'sheets: an entry with only unknown keys', input: withSheet('alpha/second', { colour: 'red' }) },
  {
    name: 'sheets: an entry whose only field is an invalid signedOff',
    input: withSheet('alpha/second', { signedOff: 'yesterday' }),
  },
]

const EVERYONE_MAP_CASES: ParseCase[] = [
  { name: 'everyoneSheets: missing, as a record written before the tracks', input: envelopeText(dataTextWithout('everyoneSheets')) },
  { name: 'everyoneSheets: a signed entry', input: withSheet('alpha/second', SIGNED_SHEET, 'everyoneSheets') },
  { name: 'everyoneSheets: a __proto__ slug', input: withSheet('__proto__', SIGNED_SHEET, 'everyoneSheets') },
  { name: 'everyoneSheets: an entry {}', input: withSheet('alpha/second', {}, 'everyoneSheets') },
  { name: 'everyoneSheets: an array', input: envelopeText(dataText({ everyoneSheets: '[]' })) },
]

const SEPARATORS = ['T', ' ']
const TIMES = ['09:26', '09:26:53', ...[1, 2, 3, 4, 5, 6].map((digits) => `09:26:53.${'589123'.slice(0, digits)}`)]
const OFFSETS = ['', 'Z', '+03:00', '-05:30', '+0300']

const SIGNED_OFF_CASES: ParseCase[] = [
  ...SEPARATORS.flatMap((separator) =>
    TIMES.flatMap((time) =>
      OFFSETS.map((offset) => {
        const value = `${DAY}${separator}${time}${offset}`
        return { name: `signedOff: ${JSON.stringify(value)}`, input: withSignedOff(value) }
      }),
    ),
  ),
  ...[
    `${DAY}T24:00`,
    `${DAY}T24:00:01`,
    `${DAY}T25:00`,
    '2026-02-31T09:26:53.589Z',
    DAY,
    `${DAY}T--:--`,
    'yesterday',
  ].map((value) => ({ name: `signedOff: ${JSON.stringify(value)}`, input: withSignedOff(value) })),
  { name: 'signedOff: a number', input: withSignedOff(Date.parse(NOW)) },
]

const DAYS_CASES: ParseCase[] = [
  { name: 'days: unsorted', input: envelopeText(dataText({ days: JSON.stringify([DAY, '2026-03-01']) })) },
  { name: 'days: duplicated', input: envelopeText(dataText({ days: JSON.stringify([DAY, DAY]) })) },
  { name: 'days: an invalid day', input: envelopeText(dataText({ days: JSON.stringify([DAY, '2026-02-31']) })) },
  { name: 'days: a non-string element', input: envelopeText(dataText({ days: JSON.stringify([DAY, 20260301]) })) },
]

const PARSE_CASES = [...ENVELOPE_CASES, ...SHEET_MAP_CASES, ...EVERYONE_MAP_CASES, ...SIGNED_OFF_CASES, ...DAYS_CASES]

// ---------------------------------------------------------------------------
// reduce[]
// ---------------------------------------------------------------------------

type Step =
  | { op: 'signOff'; slug: string; revision: string | null; now: string; track?: Track }
  | { op: 'unsign'; slug: string; now: string; track?: Track }
  | { op: 'markActivity'; now: string }
  | { op: 'markExported'; now: string }
  | { op: 'erase'; now: string }

interface ReduceCase {
  name: string
  before: RecordData
  steps: Step[]
}

function apply(data: RecordData, step: Step): RecordData {
  switch (step.op) {
    case 'signOff':
      return signOff(data, step.slug, step.revision, step.now, step.track)
    case 'unsign':
      return unsign(data, step.slug, step.track)
    case 'markActivity':
      return markActivity(data, step.now)
    case 'markExported':
      return markExported(data, step.now)
    case 'erase':
      return erasedRecord(data)
  }
}

function reduceAnswer(item: ReduceCase): { bytes: string; unchanged: number[] } {
  if (item.steps.length === 0) throw new Error(`conformance: reduce case ${item.name} has no steps`)
  let data = item.before
  const unchanged: number[] = []
  item.steps.forEach((step, index) => {
    const next = apply(data, step)
    if (next === data) unchanged.push(index)
    data = next
  })
  return { bytes: serialise(data, item.steps[item.steps.length - 1].now, false), unchanged }
}

const EMPTY = canonical()

const REDUCE_CASES: ReduceCase[] = [
  {
    name: 'signOff on the empty record',
    before: EMPTY,
    steps: [{ op: 'signOff', slug: 'alpha/second', revision: REVISION, now: LATER }],
  },
  {
    name: 'signOff with no revision',
    before: EMPTY,
    steps: [{ op: 'signOff', slug: 'alpha/second', revision: null, now: LATER }],
  },
  {
    name: 'signOff on a signed sheet is a no-op',
    before: CANONICAL,
    steps: [{ op: 'signOff', slug: 'alpha/first', revision: 'ffff', now: LATER }],
  },
  {
    name: 'signOff refuses an unsafe slug',
    before: CANONICAL,
    steps: [{ op: 'signOff', slug: '__proto__', revision: REVISION, now: LATER }],
  },
  {
    name: 'unsign leaves an empty sheet and stamps no day',
    before: CANONICAL,
    steps: [{ op: 'unsign', slug: 'alpha/first', now: LATER }],
  },
  {
    name: 'unsign on an unsigned sheet is a no-op',
    before: CANONICAL,
    steps: [{ op: 'unsign', slug: 'alpha/second', now: LATER }],
  },
  {
    name: 'signOff in For Everyone writes its own map and leaves For Engineers alone',
    before: CANONICAL,
    steps: [{ op: 'signOff', slug: 'alpha/first', revision: REVISION, now: LATER, track: 'everyone' }],
  },
  {
    name: 'unsign in For Everyone leaves the For Engineers sign-off',
    before: canonical({ sheets: { 'alpha/first': SIGNED_SHEET }, everyoneSheets: { 'alpha/first': SIGNED_SHEET }, days: [DAY] }),
    steps: [{ op: 'unsign', slug: 'alpha/first', now: LATER, track: 'everyone' }],
  },
  {
    name: 'erase clears both tracks',
    before: canonical({ sheets: { 'alpha/first': SIGNED_SHEET }, everyoneSheets: { 'beta/first': SIGNED_SHEET }, days: [DAY] }),
    steps: [{ op: 'erase', now: LATER }],
  },
  {
    name: 'markActivity stamps a new day once',
    before: CANONICAL,
    steps: [
      { op: 'markActivity', now: LATER },
      { op: 'markActivity', now: LATER },
    ],
  },
  {
    name: 'markActivity keeps days sorted',
    before: CANONICAL,
    steps: [{ op: 'markActivity', now: '2026-03-01T12:00:00.000Z' }],
  },
  {
    name: 'markActivity with an impossible day stamps nothing',
    before: CANONICAL,
    steps: [{ op: 'markActivity', now: '2026-02-31T12:00:00.000Z' }],
  },
  {
    name: 'markExported, then again at the same now',
    before: CANONICAL,
    steps: [
      { op: 'markExported', now: LATER },
      { op: 'markExported', now: LATER },
    ],
  },
  {
    name: 'erase',
    before: CANONICAL,
    steps: [{ op: 'erase', now: LATER }],
  },
]

// ---------------------------------------------------------------------------
// export[]
// ---------------------------------------------------------------------------

interface ExportCase {
  name: string
  input: string
  at: string
}

function exportAnswer(item: ExportCase): { bytes: string; filename: string } {
  const result = parseEnvelope(envelopeTextFrom(item.input))
  if (result.kind !== 'ok') throw new Error(`conformance: export case ${item.name} read as ${result.kind}`)
  const data = markActivity(result.data, item.at)
  return { bytes: exportJson(data, item.at), filename: exportFilename(item.at) }
}

const TICKED_SHEET = { ...SIGNED_SHEET, checklist: { '10': true, '2': true } }

/** The checklist's `"10"` before its `"2"`, and sheet slugs `"10"`, `"2"` and `"42"` after a named one. */
const OUT_OF_ORDER = envelopeText(
  dataText({
    sheets: objectText([
      ['beta/second', JSON.stringify(TICKED_SHEET)],
      ['10', JSON.stringify(SIGNED_SHEET)],
      ['alpha/first', JSON.stringify(SIGNED_SHEET)],
      ['2', JSON.stringify(SIGNED_SHEET)],
      ['42', JSON.stringify(SIGNED_SHEET)],
    ]),
  }),
)

const EXPORT_CASES: ExportCase[] = [
  { name: 'keys out of order', input: OUT_OF_ORDER, at: LATER },
  { name: 'the empty record', input: envelopeText(JSON.stringify(EMPTY)), at: LATER },
]

// ---------------------------------------------------------------------------
// derive[]
// ---------------------------------------------------------------------------

/** Shaped like the bundle's `Index` fields, so the app can build the same input. */
interface SyntheticIndex {
  levels: Array<{ slug: string; total: number }>
  modules: Array<{ key: string; level: string; number: number; tracks: Record<Track, { drawn: boolean }> }>
}

interface DeriveCase {
  name: string
  index: SyntheticIndex
  record: RecordData
}

function factsOf(index: SyntheticIndex, track: Track): CurriculumFacts {
  return {
    sheets: index.modules.map((module) => ({
      slug: module.key,
      module: module.number,
      category: module.level,
      drawn: module.tracks[track].drawn,
      hasQuickCheck: false,
      checklistItems: 0,
      duration: 0,
    })),
    categories: index.levels.map((level) => ({ slug: level.slug, total: level.total })),
    traces: 0,
  }
}

function trackAnswer(item: DeriveCase, track: Track) {
  const facts = factsOf(item.index, track)
  const record = trackView(item.record, track)
  return {
    isSigned: Object.fromEntries(facts.sheets.map((fact) => [fact.slug, isSigned(record, fact)])),
    categoryProgress: categoryProgress(record, facts),
    nextUnsigned: nextUnsigned(record, facts),
    signedCount: signedCount(record, facts),
  }
}

function deriveAnswer(item: DeriveCase) {
  return {
    tracks: Object.fromEntries(TRACK_IDS.map((track) => [track, trackAnswer(item, track)])),
    carriesNothing: carriesNothing(item.record),
    tally: tally(item.record),
  }
}

function drawnIn(engineers: boolean, everyone: boolean): Record<Track, { drawn: boolean }> {
  return { engineers: { drawn: engineers }, everyone: { drawn: everyone } }
}

/** Listed out of number order, so `nextUnsigned`'s sort is pinned too. */
const INDEX: SyntheticIndex = {
  levels: [
    { slug: 'alpha', total: 3 },
    { slug: 'beta', total: 2 },
  ],
  modules: [
    { key: 'alpha/second', level: 'alpha', number: 2, tracks: drawnIn(true, false) },
    { key: 'alpha/first', level: 'alpha', number: 1, tracks: drawnIn(true, true) },
    { key: 'alpha/third', level: 'alpha', number: 3, tracks: drawnIn(false, true) },
    { key: 'beta/first', level: 'beta', number: 4, tracks: drawnIn(true, false) },
    { key: 'beta/second', level: 'beta', number: 5, tracks: drawnIn(false, false) },
  ],
}

function signedSheets(...slugs: string[]): Record<string, SheetRecord> {
  return Object.fromEntries(slugs.map((slug) => [slug, SIGNED_SHEET]))
}

const DERIVE_CASES: DeriveCase[] = [
  { name: 'the empty record', index: INDEX, record: EMPTY },
  {
    name: 'one signed module',
    index: INDEX,
    record: canonical({ sheets: signedSheets('alpha/first'), days: [DAY] }),
  },
  {
    name: 'a signed draft counts for nothing',
    index: INDEX,
    record: canonical({ sheets: signedSheets('alpha/first', 'alpha/third'), days: [DAY] }),
  },
  {
    name: 'every drawn module signed',
    index: INDEX,
    record: canonical({ sheets: signedSheets('alpha/first', 'alpha/second', 'beta/first'), days: [DAY] }),
  },
  {
    name: 'a sign-off for a slug the curriculum does not list',
    index: INDEX,
    record: canonical({ sheets: signedSheets('alpha/first', 'gamma/gone'), days: [DAY] }),
  },
  {
    name: 'a module whose level no level declares',
    index: {
      levels: INDEX.levels,
      modules: [...INDEX.modules, { key: 'gamma/first', level: 'gamma', number: 6, tracks: drawnIn(true, true) }],
    },
    record: canonical({ sheets: signedSheets('gamma/first'), days: [DAY] }),
  },
  {
    name: 'a For Everyone sign-off counts in For Everyone only',
    index: INDEX,
    record: canonical({ everyoneSheets: signedSheets('alpha/first', 'alpha/third'), days: [DAY] }),
  },
  {
    name: 'a For Everyone sign-off on a module written only for engineers counts for nothing',
    index: INDEX,
    record: canonical({ sheets: signedSheets('alpha/second'), everyoneSheets: signedSheets('alpha/second'), days: [DAY] }),
  },
]

// ---------------------------------------------------------------------------
// The fixture
// ---------------------------------------------------------------------------

function buildFixture() {
  return {
    constants: {
      SCHEMA_VERSION,
      SOFT_CAP_BYTES,
      ISO_TIME: ISO_TIME.source,
      ISO_DAY: ISO_DAY.source,
      INSTANT_DAY: INSTANT_DAY.source,
      EMPTY_SHEET: emptySheetRecord(),
      EMPTY_RECORD,
    },
    parse: PARSE_CASES.map((item) => ({ ...item, expect: parseAnswer(item) })),
    reduce: REDUCE_CASES.map((item) => ({ ...item, expect: reduceAnswer(item) })),
    export: EXPORT_CASES.map((item) => ({ ...item, expect: exportAnswer(item) })),
    derive: DERIVE_CASES.map((item) => ({ ...item, expect: deriveAnswer(item) })),
  }
}

describe('the record conformance fixture', () => {
  it('pins the answers it pinned last time', async () => {
    await expect(JSON.stringify(buildFixture(), null, 2) + '\n').toMatchFileSnapshot(
      './__snapshots__/record-conformance.v1.json',
    )
  })

  it('carries no vocabulary list', () => {
    const fixture = buildFixture()
    expect(Object.keys(fixture)).toEqual(['constants', 'parse', 'reduce', 'export', 'derive'])
    expect(Object.keys(fixture.constants)).toEqual([
      'SCHEMA_VERSION',
      'SOFT_CAP_BYTES',
      'ISO_TIME',
      'ISO_DAY',
      'INSTANT_DAY',
      'EMPTY_SHEET',
      'EMPTY_RECORD',
    ])
  })

  it('gives every case a distinct name', () => {
    const fixture = buildFixture()
    for (const section of [fixture.parse, fixture.reduce, fixture.export, fixture.derive]) {
      const names = section.map((item) => item.name)
      expect(new Set(names).size).toBe(names.length)
    }
  })

  it('starts every reduce and derive case from a canonical record', () => {
    const records = [...REDUCE_CASES.map((item) => item.before), ...DERIVE_CASES.map((item) => item.record)]
    for (const record of records) {
      const result = parseEnvelope(serialise(record, SAVED_AT, false))
      if (result.kind !== 'ok') throw new Error(`conformance: a canonical record read as ${result.kind}`)
      expect(result.data).toEqual(record)
    }
  })
})
