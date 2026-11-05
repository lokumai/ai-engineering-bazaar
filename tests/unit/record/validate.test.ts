import { describe, expect, it } from 'vitest'
import { EMPTY_RECORD, type RecordData } from '@/lib/record/schema'
import { coerceRecordData, envelopeTextFrom, parseEnvelope } from '@/lib/record/validate'

const NOW_ISO = '2026-08-31T10:00:00.000Z'

/** An envelope around whatever `data` an individual case is probing. */
function wrap(data: unknown, schema = 1): string {
  return JSON.stringify({ schema, savedAt: '2026-08-31T10:00:00.000Z', data })
}

function ok(raw: string): RecordData {
  const result = parseEnvelope(raw)
  if (result.kind !== 'ok') throw new Error(`expected ok, got ${result.kind}`)
  return result.data
}

function reasonOf(raw: string | null): string {
  const result = parseEnvelope(raw)
  return result.kind === 'quarantine' ? `quarantine/${result.reason}` : result.kind
}

describe('parseEnvelope — nothing stored', () => {
  it('reads an absent key as empty, not as a failure', () => {
    expect(parseEnvelope(null)).toEqual({ kind: 'empty' })
  })

  it('reads an empty or whitespace-only value as empty', () => {
    expect(parseEnvelope('')).toEqual({ kind: 'empty' })
    expect(parseEnvelope('   \n')).toEqual({ kind: 'empty' })
  })
})

describe('parseEnvelope — a newer schema is preserved, never migrated, never discarded', () => {
  it('quarantines a schema above the running version (§12.1.2)', () => {
    const result = parseEnvelope(wrap({ sheets: {} }, 99))
    expect(result.kind).toBe('quarantine')
    if (result.kind !== 'quarantine') return
    expect(result.reason).toBe('newer')
  })

  it('hands back the raw text byte for byte, whitespace and unknown fields intact', () => {
    const raw = '{\n  "schema": 2,\n  "savedAt": "later",\n  "data": {"sheets":{}},\n  "future": [1,2]\n}'
    const result = parseEnvelope(raw)
    expect(result.kind).toBe('quarantine')
    if (result.kind !== 'quarantine') return
    expect(result.reason).toBe('newer')
    expect(result.raw).toBe(raw)
    expect(result.raw.length).toBe(raw.length)
  })

  it('never lets a newer payload reach the record', () => {
    const result = parseEnvelope(wrap({ identity: { name: 'From the future' } }, 2))
    expect(result.kind).toBe('quarantine')
    expect(JSON.stringify(result)).not.toContain('"identity"')
  })
})

describe('parseEnvelope — a malformed envelope quarantines rather than resetting', () => {
  it('quarantines every shape that is not an envelope', () => {
    expect(reasonOf('{')).toBe('quarantine/malformed')
    expect(reasonOf('[]')).toBe('quarantine/malformed')
    expect(reasonOf('null')).toBe('quarantine/malformed')
    expect(reasonOf('"str"')).toBe('quarantine/malformed')
    expect(reasonOf('42')).toBe('quarantine/malformed')
    expect(reasonOf('true')).toBe('quarantine/malformed')
    expect(reasonOf('[{"schema":1,"data":{}}]')).toBe('quarantine/malformed')
  })

  it('quarantines a schema that is not a positive integer', () => {
    expect(reasonOf('{"schema":"1","data":{}}')).toBe('quarantine/malformed')
    expect(reasonOf('{"schema":1.5,"data":{}}')).toBe('quarantine/malformed')
    expect(reasonOf('{"schema":0,"data":{}}')).toBe('quarantine/malformed')
    expect(reasonOf('{"schema":-1,"data":{}}')).toBe('quarantine/malformed')
    expect(reasonOf('{"data":{}}')).toBe('quarantine/malformed')
  })

  it('quarantines an envelope whose data is not an object — the file is not understood', () => {
    expect(reasonOf('{"schema":1}')).toBe('quarantine/malformed')
    expect(reasonOf('{"schema":1,"data":null}')).toBe('quarantine/malformed')
    expect(reasonOf('{"schema":1,"data":[]}')).toBe('quarantine/malformed')
    expect(reasonOf('{"schema":1,"data":"x"}')).toBe('quarantine/malformed')
  })

  it('keeps the raw text for every malformed case too', () => {
    const raw = '{"schema":1,"data":'
    const result = parseEnvelope(raw)
    expect(result.kind).toBe('quarantine')
    if (result.kind !== 'quarantine') return
    expect(result.raw).toBe(raw)
  })
})

describe('parseEnvelope — an understood envelope', () => {
  it('returns the schema it was found at and the savedAt it carried', () => {
    const result = parseEnvelope(wrap({}))
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.schema).toBe(1)
    expect(result.savedAt).toBe('2026-08-31T10:00:00.000Z')
  })

  it('defaults a missing savedAt to null rather than inventing a time', () => {
    const result = parseEnvelope('{"schema":1,"data":{}}')
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.savedAt).toBeNull()
  })

  it('reads an empty data object as the empty record', () => {
    expect(ok(wrap({}))).toEqual(EMPTY_RECORD)
  })

  it('never returns the frozen singleton itself, so a reducer cannot be handed one', () => {
    const data = ok(wrap({}))
    expect(data).not.toBe(EMPTY_RECORD)
    expect(Object.isFrozen(data)).toBe(false)
  })

})

describe('coercion — prototype pollution', () => {
  it('drops a __proto__ key in the sheets map and pollutes nothing', () => {
    const data = ok(wrap({ sheets: { __proto__: { signedOff: '2026-08-14T00:00:00.000Z' } } }))
    expect(Object.keys(data.sheets)).toEqual([])
    expect(Object.getPrototypeOf(data.sheets)).toBe(Object.prototype)
    expect((({} as Record<string, unknown>).signedOff)).toBeUndefined()
  })

  it('drops __proto__, constructor and prototype keys wherever they appear', () => {
    const data = ok(
      wrap({
        __proto__: { polluted: 1 },
        sheets: {
          constructor: { signedOff: '2026-08-14T00:00:00.000Z' },
          prototype: { reachedEnd: true },
          'fundamentals/llms': { reachedEnd: true, checklist: { __proto__: true, '0': true } },
        },
      }),
    )
    expect(Object.keys(data.sheets)).toEqual(['fundamentals/llms'])
    expect(Object.keys(data.sheets['fundamentals/llms'].checklist)).toEqual(['0'])
    expect((({} as Record<string, unknown>).polluted)).toBeUndefined()
    expect((({} as Record<string, unknown>).reachedEnd)).toBeUndefined()
  })
})

describe('coercion — the modules map', () => {
  it('coerces a modules array to an empty map: a slug-keyed map is never an array', () => {
    expect(ok(wrap({ sheets: [{ signedOff: '2026-08-14T00:00:00.000Z' }] })).sheets).toEqual({})
  })

  it('drops an entry that is an array, a string or a number', () => {
    const data = ok(
      wrap({
        sheets: {
          'a/b': ['2026-08-14'],
          'c/d': 'signed',
          'e/f': 7,
          'g/h': null,
          'i/j': { reachedEnd: true },
        },
      }),
    )
    expect(Object.keys(data.sheets)).toEqual(['i/j'])
  })

  it('drops a module record that holds nothing at all (§11.25 absent, not empty)', () => {
    expect(ok(wrap({ sheets: { 'a/b': {} } })).sheets).toEqual({})
    expect(ok(wrap({ sheets: { 'a/b': { dwellSeconds: 0, reachedEnd: false } } })).sheets).toEqual({})
  })

  it('drops an absurdly long key but keeps every plausible slug', () => {
    const data = ok(
      wrap({
        sheets: {
          ['x'.repeat(400)]: { reachedEnd: true },
          'fundamentals/llms': { reachedEnd: true },
          '': { reachedEnd: true },
        },
      }),
    )
    expect(Object.keys(data.sheets)).toEqual(['fundamentals/llms'])
  })
})

describe('coercion — sign-off and revision', () => {
  it('keeps an ISO instant and rejects anything unparseable', () => {
    expect(ok(wrap({ sheets: { 'a/b': { signedOff: '2026-08-14T09:30:00.000Z' } } })).sheets['a/b'].signedOff)
      .toBe('2026-08-14T09:30:00.000Z')
    for (const at of ['yesterday', '2026-13-45', 42, true, '']) {
      expect(ok(wrap({ sheets: { 'a/b': { signedOff: at, reachedEnd: true } } })).sheets['a/b'].signedOff)
        .toBeNull()
    }
  })

  it('keeps a git short hash as the signed revision and rejects a lookalike', () => {
    const keep = ok(wrap({ sheets: { 'a/b': { signedRevision: 'a1b2c3d' } } })).sheets['a/b']
    expect(keep.signedRevision).toBe('a1b2c3d')
    for (const rev of ['A1B2C3D', 'zzz', 'a1b', '', 7, 'a1b2c3d '.repeat(8)]) {
      const got = ok(wrap({ sheets: { 'a/b': { signedRevision: rev, reachedEnd: true } } })).sheets['a/b']
      expect(got.signedRevision).toBeNull()
    }
  })
})

describe('coercion — dwell is clamped, never trusted', () => {
  it('clamps a negative and an absurd value into 0..3600 (§12.4.4)', () => {
    const of = (v: unknown) => ok(wrap({ sheets: { 'a/b': { dwellSeconds: v, reachedEnd: true } } })).sheets['a/b'].dwellSeconds
    expect(of(-5)).toBe(0)
    expect(of(1e9)).toBe(3600)
    expect(of(3600)).toBe(3600)
    expect(of(12.6)).toBe(13)
    expect(of('60')).toBe(0)
    expect(of(null)).toBe(0)
  })

  it('coerces NaN and Infinity to the default, since neither is a duration', () => {
    // JSON cannot express either; coerceRecordData is also the import path.
    const data = coerceRecordData({ sheets: { 'a/b': { dwellSeconds: Number.NaN, reachedEnd: true } } })
    expect(data.sheets['a/b'].dwellSeconds).toBe(0)
    const inf = coerceRecordData({ sheets: { 'a/b': { dwellSeconds: Number.POSITIVE_INFINITY, reachedEnd: true } } })
    expect(inf.sheets['a/b'].dwellSeconds).toBe(0)
  })
})

describe('coercion — days', () => {
  it('keeps only real ISO dates, deduped and sorted', () => {
    const data = ok(
      wrap({
        days: ['2026-08-31', 7, null, {}, ['2026-08-30'], '2026-08-30', '2026-08-31', 'today'],
      }),
    )
    expect(data.days).toEqual(['2026-08-30', '2026-08-31'])
  })

  it('rejects an impossible date and an instant', () => {
    expect(ok(wrap({ days: ['2026-02-31', '2026-13-01', '2026-08-31T10:00:00Z', '26-08-31'] })).days)
      .toEqual([])
  })

  it('coerces a non-array days to an empty list', () => {
    expect(ok(wrap({ days: '2026-08-31' })).days).toEqual([])
    expect(ok(wrap({ days: { 0: '2026-08-31' } })).days).toEqual([])
  })
})

describe('coercion — the checklist', () => {
  it('keeps only ticked integer indices', () => {
    const data = ok(
      wrap({
        sheets: {
          'a/b': { checklist: { '0': true, '1': false, '2': 'yes', x: true, '-1': true, '3.5': true, '7': true } },
        },
      }),
    )
    expect(data.sheets['a/b'].checklist).toEqual({ '0': true, '7': true })
  })

  it('coerces a checklist array to an empty map', () => {
    expect(ok(wrap({ sheets: { 'a/b': { checklist: [true, true], reachedEnd: true } } })).sheets['a/b'].checklist)
      .toEqual({})
  })
})

describe('coercion — prefs and meta', () => {
  it('defaults charKeys to on and only a real boolean turns it off (§12.16)', () => {
    expect(ok(wrap({})).prefs.charKeys).toBe(true)
    expect(ok(wrap({ prefs: { charKeys: false } })).prefs.charKeys).toBe(false)
    expect(ok(wrap({ prefs: { charKeys: 'false' } })).prefs.charKeys).toBe(true)
    expect(ok(wrap({ prefs: [] })).prefs.charKeys).toBe(true)
  })

  it('keeps persisted tri-state: true, false and not-yet-queried (§12.1.6)', () => {
    expect(ok(wrap({ meta: { persisted: true } })).meta.persisted).toBe(true)
    expect(ok(wrap({ meta: { persisted: false } })).meta.persisted).toBe(false)
    expect(ok(wrap({ meta: { persisted: 'yes' } })).meta.persisted).toBeNull()
    expect(ok(wrap({})).meta.persisted).toBeNull()
  })

  it('keeps lastExport as an instant or null', () => {
    expect(ok(wrap({ meta: { lastExport: '2026-08-30T08:00:00.000Z' } })).meta.lastExport)
      .toBe('2026-08-30T08:00:00.000Z')
    expect(ok(wrap({ meta: { lastExport: 'soon' } })).meta.lastExport).toBeNull()
  })
})

describe('coerceRecordData — total on any input', () => {
  it('returns the empty record for every non-object', () => {
    for (const input of [null, undefined, 7, 'x', true, [], () => 1, Symbol('s')]) {
      expect(coerceRecordData(input)).toEqual(EMPTY_RECORD)
    }
  })

  it('never mutates its input', () => {
    const input = Object.freeze({ sheets: Object.freeze({}), days: Object.freeze(['2026-08-31']) })
    expect(() => coerceRecordData(input)).not.toThrow()
    expect(coerceRecordData(input).days).toEqual(['2026-08-31'])
  })
})

describe('envelopeTextFrom — the importer accepts the report as well as the JSON (§12.12.6)', () => {
  it('passes JSON straight through', () => {
    expect(envelopeTextFrom('  {"schema":1,"data":{}}  ')).toBe('{"schema":1,"data":{}}')
  })

  it('passes an indented export through, which is the shape the file has', () => {
    const pretty = JSON.stringify({ schema: 1, savedAt: NOW_ISO, data: { days: ['2026-08-31'] } }, null, 2)
    const text = envelopeTextFrom(`\n${pretty}\n`)
    expect(text).not.toBeNull()
    const result = parseEnvelope(text)
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.data.days).toEqual(['2026-08-31'])
    expect(result.savedAt).toBe(NOW_ISO)
  })

  it('returns null for a document with no payload', () => {
    expect(envelopeTextFrom('<html><body>no record here</body></html>')).toBeNull()
    expect(envelopeTextFrom('')).toBeNull()
  })
})


/**
 * M40 (2026-11-05) — the author exported their progress and found their old
 * role path ("data analyst") in the file. A record stored before the removal
 * still carries those fields; reading it drops them, so the next write and
 * every export carry only what the site still records.
 */
describe('a record stored before M40 loses the removed fields on read', () => {
  const OLD = {
    identity: { name: 'Ada', markSeed: 'a1b2c3d4', mark: 'datum', role: 'data-analyst' },
    sheets: {
      'fundamentals/llms': {
        signedOff: '2026-07-01T08:00:00.000Z',
        quiz: { answer: 'x', assessed: 'matched', at: '2026-07-01T08:00:00.000Z' },
        sources: ['https://example.com/'],
        submittals: [{ owner: 'o', repo: 'r' }],
      },
    },
    prefs: { aliasNamedFor: 'someone' },
    meta: { lastClaim: { at: '2026-07-01T08:00:00.000Z' } },
  }

  it('keeps the completion and drops every removed field', () => {
    const data = coerceRecordData(OLD)
    expect(data.sheets['fundamentals/llms']?.signedOff).toBe('2026-07-01T08:00:00.000Z')
    const text = JSON.stringify(data)
    for (const gone of ['identity', 'data-analyst', 'quiz', 'sources', 'submittals', 'aliasNamedFor', 'lastClaim']) {
      expect(text, gone).not.toContain(gone)
    }
  })
})
