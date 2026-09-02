import { describe, expect, it } from 'vitest'
import { RECORD_BOOT_SCRIPT, recordBootScript } from '@/lib/record/boot'
import { coerceRecordData } from '@/lib/record/validate'
import {
  EMPTY_RECORD,
  RECORD_STORAGE_KEY,
  SCHEMA_VERSION,
  carriesNothing,
  emptySheetRecord,
  type RecordData,
  type SheetRecord,
} from '@/lib/record/schema'

/** The corpus's six categories, as a layout would pass them in. */
const TOTALS = { fundamentals: 7, intermediate: 8, expert: 9, ecosystem: 5, protocols: 1, optional: 2 }
const MODULES = {
  'fundamentals/llms': 1,
  'fundamentals/training': 2,
  'fundamentals/rag': 3,
  'fundamentals/tools': 4,
  'fundamentals/memory': 5,
  'fundamentals/agents': 6,
  'fundamentals/multi-agent': 7,
  'intermediate/security': 13,
}

interface Stamped {
  classes: Set<string>
  attributes: Map<string, string>
}

/** Runs the emitted script with every global it touches stubbed out. */
function run(
  script: string,
  options: { stored?: string | null; getterThrows?: boolean; getItemThrows?: boolean } = {},
  into?: Stamped,
): Stamped {
  const stamped: Stamped = into ?? { classes: new Set<string>(), attributes: new Map<string, string>() }
  const documentElement = {
    classList: { add: (token: string) => { stamped.classes.add(token) } },
    setAttribute: (name: string, value: string) => { stamped.attributes.set(name, value) },
  }
  const window = {
    get localStorage() {
      if (options.getterThrows) throw Object.assign(new Error('denied'), { name: 'SecurityError' })
      return {
        getItem: (key: string) => {
          if (options.getItemThrows) throw Object.assign(new Error('denied'), { name: 'SecurityError' })
          return key === RECORD_STORAGE_KEY ? options.stored ?? null : null
        },
      }
    },
  }
  new Function('window', 'document', script)(window, { documentElement })
  return stamped
}

const envelope = (data: unknown, schema = SCHEMA_VERSION) =>
  JSON.stringify({ schema, savedAt: '2026-08-31T09:00:00.000Z', data })

const signedSheets = (...slugs: string[]) => ({
  sheets: Object.fromEntries(slugs.map((slug) => [slug, { signedOff: '2026-08-14T09:00:00.000Z' }])),
})

describe('the emitted script is safe to inline', () => {
  const script = recordBootScript(TOTALS, MODULES)

  it('contains no closing script tag, in any casing', () => {
    expect(script.toLowerCase()).not.toContain('</script')
    expect(script).not.toContain('<!--')
  })

  it('parses as JavaScript', () => {
    expect(() => new Function('window', 'document', script)).not.toThrow()
  })

  it('is ES5-safe, because it runs before anything has decided the bundle target', () => {
    expect(script).not.toMatch(/=>|\blet\b|\bconst\b|\bclass\b|\.\.\./)
  })

  it('names the same key the store writes', () => {
    expect(script).toContain(RECORD_STORAGE_KEY)
  })

  it('embeds the build-time facts as JSON with < escaped out', () => {
    const hostile = recordBootScript({ '<script>': 1 }, { '</script>': 1 })
    expect(hostile.toLowerCase()).not.toContain('</script')
    expect(hostile).toContain('\\u003c')
    expect(() => new Function('window', 'document', hostile)).not.toThrow()
  })

  it('is one self-contained expression statement, like THEME_BOOT_SCRIPT', () => {
    expect(script.startsWith('(function()')).toBe(true)
    expect(script.trimEnd().endsWith('})();')).toBe(true)
    expect(script).toContain('try')
    expect(script).toContain('catch')
  })
})

describe('data-hl-storage — what tells empty state 4 from empty state 1 (§12.13)', () => {
  const script = recordBootScript(TOTALS, MODULES)

  it('is ok when storage answers, even with nothing in it', () => {
    const stamped = run(script)
    expect(stamped.attributes.get('data-hl-storage')).toBe('ok')
    expect(stamped.attributes.has('data-hl-record')).toBe(false)
    expect(stamped.classes.size).toBe(0)
  })

  it('is blocked when the property access throws', () => {
    const stamped = run(script, { getterThrows: true })
    expect(stamped.attributes.get('data-hl-storage')).toBe('blocked')
    expect(stamped.attributes.has('data-hl-record')).toBe(false)
  })

  it('is blocked when the read throws', () => {
    expect(run(script, { getItemThrows: true }).attributes.get('data-hl-storage')).toBe('blocked')
  })
})

describe('the marks CSS draws from (§12.2 Channel A)', () => {
  const script = recordBootScript(TOTALS, MODULES)

  it('stamps one class per signed-off module number', () => {
    const stamped = run(script, { stored: envelope(signedSheets('fundamentals/llms', 'intermediate/security')) })
    expect(stamped.attributes.get('data-hl-record')).toBe('1')
    expect([...stamped.classes].sort()).toEqual([
      'hl-cat-fundamentals-started',
      'hl-cat-intermediate-started',
      'hl-signed-1',
      'hl-signed-13',
    ])
  })

  it('marks a category complete only when every sheet in it is signed', () => {
    const all = Object.keys(MODULES).filter((slug) => slug.startsWith('fundamentals/'))
    const stamped = run(script, { stored: envelope(signedSheets(...all)) })
    expect(stamped.classes.has('hl-cat-fundamentals-complete')).toBe(true)
    expect(stamped.classes.has('hl-cat-fundamentals-started')).toBe(false)
  })

  it('ignores a sheet that is present but not signed off', () => {
    const stored = envelope({ sheets: { 'fundamentals/llms': { signedOff: null, reachedEnd: true } } })
    const stamped = run(script, { stored })
    expect(stamped.attributes.get('data-hl-record')).toBe('1')
    expect(stamped.classes.size).toBe(0)
  })

  it('tallies a category from the slug even when the module number is unknown', () => {
    const stamped = run(script, { stored: envelope(signedSheets('fundamentals/renamed')) })
    expect(stamped.classes.has('hl-cat-fundamentals-started')).toBe(true)
    expect([...stamped.classes].some((token) => token.startsWith('hl-signed-'))).toBe(false)
  })

  it('draws nothing for a slug with no category segment', () => {
    const stamped = run(script, { stored: envelope(signedSheets('orphan')) })
    expect(stamped.classes.size).toBe(0)
  })

  it('draws nothing from a record written by a newer version (§12.1.2)', () => {
    const stored = envelope(signedSheets('fundamentals/llms'), SCHEMA_VERSION + 1)
    const stamped = run(script, { stored })
    expect(stamped.classes.size).toBe(0)
    expect(stamped.attributes.has('data-hl-record')).toBe(false)
    expect(stamped.attributes.get('data-hl-storage')).toBe('ok')
  })

  it('does nothing at all on a malformed payload, and does not throw', () => {
    for (const stored of ['{', 'null', '[]', '"x"', '{"schema":1}', '{"schema":1,"data":[]}', '']) {
      const stamped = run(script, { stored })
      expect(stamped.classes.size).toBe(0)
      expect(stamped.attributes.get('data-hl-storage')).toBe('ok')
    }
  })

  it('survives a hostile sheets map', () => {
    const stored = envelope({ sheets: [{ signedOff: 'x' }] })
    expect(run(script, { stored }).classes.size).toBe(0)
    const polluting = envelope({ sheets: { __proto__: { signedOff: 'x' } } })
    expect(run(script, { stored: polluting }).classes.size).toBe(0)
  })

  it('is idempotent: running it twice stamps exactly the same thing', () => {
    const stored = envelope(signedSheets('fundamentals/llms', 'fundamentals/training'))
    const once = run(script, { stored })
    const twice = run(script, { stored })
    run(script, { stored }, twice)
    expect([...twice.classes].sort()).toEqual([...once.classes].sort())
    expect([...twice.attributes.entries()].sort()).toEqual([...once.attributes.entries()].sort())
  })

  it('needs no category totals to be useful, which is what the bare constant is', () => {
    const stamped = run(RECORD_BOOT_SCRIPT, { stored: envelope(signedSheets('fundamentals/llms')) })
    expect(stamped.attributes.get('data-hl-record')).toBe('1')
    expect(stamped.attributes.get('data-hl-storage')).toBe('ok')
    // No module map, so no sign-off marks; the category still reads as started.
    expect([...stamped.classes]).toEqual(['hl-cat-fundamentals-started'])
  })
})

/**
 * §15.11 — the boot script's rule, cross-tested against the pair that decides
 * what the application actually holds.
 *
 * `data-hl-record` is the whole of the home screen's decision (`app/home.css`),
 * so before this the stamp went on for any parseable envelope: a reader whose
 * record held nothing but `prefs` — which the store writes on a first theme
 * click — was shown "Where you left off" and a continue control for a sheet
 * they had never opened.
 *
 * **The pair matters, and the first version of these cases had it wrong.** They
 * compared the stamp to `carriesNothing(data)` over typed `RecordData`, so every
 * input was already well-shaped and the whole malformed axis went untested — and
 * the boot script's presence checks run on RAW storage, before
 * `coerceRecordData`. Measured: seven shapes stamped while the coercer discarded
 * the value, among them `identity.name` as a number, an unknown `mark`, and
 * `days` as an object. A record read back out of storage is untrusted input
 * (§12.1.3) and the gate was applying weaker rules than the parser it guards.
 *
 * So the invariant is `stamp ⟺ !carriesNothing(coerceRecordData(raw))`, asserted
 * over well-formed AND malformed input, and the malformed half is what the boot
 * script's shape helpers exist for. The rule is still written twice — an inline
 * script has no module graph to import from — and these cases are the only thing
 * keeping the two copies honest.
 */
describe('data-hl-record only goes on a record that carries something (§15.11)', () => {
  const script = recordBootScript(TOTALS, MODULES)

  const withSheet = (sheet: Partial<SheetRecord>): RecordData => ({
    ...EMPTY_RECORD,
    sheets: { 'fundamentals/llms': { ...emptySheetRecord(), ...sheet } },
  })

  const CASES: ReadonlyArray<[string, RecordData]> = [
    ['a freshly minted record, which is what a migration stamp leaves behind', EMPTY_RECORD],
    [
      'a record holding only a preference',
      { ...EMPTY_RECORD, prefs: { charKeys: false, aliasNamedFor: null } },
    ],
    ['a record holding only an empty sheet entry', withSheet({})],
    ['a name the reader typed', { ...EMPTY_RECORD, identity: { ...EMPTY_RECORD.identity, name: 'Ada' } }],
    ['a mark seed', { ...EMPTY_RECORD, identity: { ...EMPTY_RECORD.identity, markSeed: 'a1b2c3d4' } }],
    ['a role the reader chose', { ...EMPTY_RECORD, identity: { ...EMPTY_RECORD.identity, role: 'qa' } }],
    ['a day on which something was written', { ...EMPTY_RECORD, days: ['2026-08-31'] }],
    ['an export the reader took', { ...EMPTY_RECORD, meta: { lastExport: '2026-08-31T09:00:00.000Z', persisted: null } }],
    ['a sheet reached the end of', withSheet({ reachedEnd: true })],
    ['dwell on a sheet and nothing else', withSheet({ dwellSeconds: 41 })],
    ['one checklist box', withSheet({ checklist: { '7': true } })],
    ['one source opened', withSheet({ sources: ['https://example.invalid/paper'] })],
    ['a sheet signed off', withSheet({ signedOff: '2026-08-14T09:00:00.000Z' })],
  ]

  /**
   * The malformed half: raw payloads the store could never have written, which
   * is exactly what a hand-edited `localStorage` value is. Typed as `unknown`
   * because that is what the boot script receives; every expectation comes from
   * `coerceRecordData`, so none of them is hand-written.
   */
  const MALFORMED: ReadonlyArray<[string, unknown]> = [
    ['a name that is a number', { identity: { name: 7 } }],
    ['a name that is the empty string, which the coercer keeps', { identity: { name: '' } }],
    ['a mark seed of the wrong shape', { identity: { markSeed: 'not-a-seed!!' } }],
    ['a mark outside the stored vocabulary', { identity: { mark: 'banana' } }],
    ['a role outside the nine', { identity: { role: 'wizard' } }],
    ['days as an object rather than an array', { days: { nope: 1 } }],
    ['days holding a date that never happened', { days: ['2026-02-31'] }],
    ['days holding one real day among rubbish', { days: [null, 'x', '2026-08-31'] }],
    ['lastExport that is not a date', { meta: { lastExport: 'yesterday' } }],
    ['lastExport on an impossible day', { meta: { lastExport: '2026-02-31T09:00:00.000Z' } }],
    ['dwell as a string', { sheets: { 'fundamentals/llms': { dwellSeconds: 'lots' } } }],
    ['dwell that rounds to nothing', { sheets: { 'fundamentals/llms': { dwellSeconds: 0.2 } } }],
    ['dwell that rounds to a second', { sheets: { 'fundamentals/llms': { dwellSeconds: 0.7 } } }],
    ['reachedEnd as a truthy string', { sheets: { 'fundamentals/llms': { reachedEnd: 'yes' } } }],
    ['a checklist key that is not an index', { sheets: { 'fundamentals/llms': { checklist: { 'a-1': true } } } }],
    ['a checklist index stored false', { sheets: { 'fundamentals/llms': { checklist: { '7': false } } } }],
    ['a source that is not a URL', { sheets: { 'fundamentals/llms': { sources: ['ftp://x/y'] } } }],
    ['sources as an object', { sheets: { 'fundamentals/llms': { sources: { '0': 'https://x/y' } } } }],
    ['a submittal with no repo', { sheets: { 'fundamentals/llms': { submittals: [{ owner: 'a' }] } } }],
    ['a submittal with both segments', { sheets: { 'fundamentals/llms': { submittals: [{ owner: 'a', repo: 'b' }] } } }],
    ['a quiz holding neither an answer nor an assessment', { sheets: { 'fundamentals/llms': { quiz: { answer: '  ' } } } }],
    ['a quiz holding an assessment', { sheets: { 'fundamentals/llms': { quiz: { assessed: 'missed' } } } }],
    ['a signedRevision too short to be a hash', { sheets: { 'fundamentals/llms': { signedRevision: 'abc' } } }],
    ['a sheet key over the safe length', { sheets: { ['f/' + 'x'.repeat(250)]: { reachedEnd: true } } }],
    ['sheets as an array', { sheets: [{ reachedEnd: true }] }],
  ]

  const both: ReadonlyArray<[string, unknown]> = [...CASES, ...MALFORMED]

  for (const [name, data] of both) {
    it(`agrees with the coercer for: ${name}`, () => {
      const stamped = run(script, { stored: envelope(data) })
      expect(stamped.attributes.get('data-hl-storage')).toBe('ok')
      expect(stamped.attributes.has('data-hl-record'))
        .toBe(!carriesNothing(coerceRecordData(data)))
    })
  }

  /**
   * Non-vacuity for the block above: a case list that happened to be all-`false`
   * would pass against a gate that never stamps, and all-`true` against one that
   * always does. Both answers have to appear, on both halves of the list.
   */
  it('has cases on both sides of the answer, well-formed and malformed alike', () => {
    const kept = (data: unknown) => !carriesNothing(coerceRecordData(data))
    for (const half of [CASES, MALFORMED]) {
      const answers = half.map(([, data]) => kept(data))
      expect(answers).toContain(true)
      expect(answers).toContain(false)
    }
  })

  it('still tells empty state 1 from 4 when the record carries nothing (§12.13)', () => {
    // The storage stamp is not conditional on the record: a reader whose
    // storage is blocked must be told so even with nothing recorded.
    const blocked = run(script, { stored: envelope(EMPTY_RECORD), getterThrows: true })
    expect(blocked.attributes.get('data-hl-storage')).toBe('blocked')
    expect(blocked.attributes.has('data-hl-record')).toBe(false)
  })

  it('draws no class for a role on a record that carries nothing else, but does stamp it', () => {
    const data: RecordData = { ...EMPTY_RECORD, identity: { ...EMPTY_RECORD.identity, role: 'qa' } }
    const stamped = run(script, { stored: envelope(data) })
    expect(stamped.attributes.get('data-hl-record')).toBe('1')
    expect([...stamped.classes]).toEqual(['hl-role-qa'])
  })

  it('does not throw on a hand-edited record whose fields are the wrong shape', () => {
    for (const data of [
      { days: 'today', identity: 'me', meta: 7, sheets: { 'fundamentals/llms': 'signed' } },
      { days: {}, identity: {}, meta: {}, sheets: {} },
      { sheets: { 'fundamentals/llms': { checklist: 'yes', sources: 3, submittals: null } } },
    ]) {
      const stamped = run(script, { stored: envelope(data) })
      expect(stamped.attributes.get('data-hl-storage')).toBe('ok')
      expect(stamped.attributes.has('data-hl-record')).toBe(false)
    }
  })
})
