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

  it('drops every unknown key at every level', () => {
    const data = ok(
      wrap({
        identity: { name: 'A', evil: 1 },
        prefs: { charKeys: false, theme: 'dark' },
        meta: { lastExport: null, persisted: null, tokens: 'nope' },
        nope: 2,
      }),
    )
    expect(Object.keys(data).sort()).toEqual(['days', 'identity', 'meta', 'prefs', 'sheets'])
    expect(Object.keys(data.identity).sort()).toEqual(['mark', 'markSeed', 'name', 'role'])
    expect(Object.keys(data.prefs)).toEqual(['charKeys'])
    expect(Object.keys(data.meta).sort()).toEqual(['lastExport', 'persisted'])
  })
})

describe('coercion — identity', () => {
  it('keeps a name exactly as typed and never truncates it (§12.3.4)', () => {
    const long = 'İlker '.repeat(40)
    expect(ok(wrap({ identity: { name: long } })).identity.name).toBe(long)
  })

  it('coerces a non-string name to null rather than to a placeholder person', () => {
    for (const name of [42, true, {}, [], null]) {
      expect(ok(wrap({ identity: { name } })).identity.name).toBeNull()
    }
  })

  it('accepts only 8 lowercase hex characters as a markSeed', () => {
    expect(ok(wrap({ identity: { markSeed: 'a1b2c3d4' } })).identity.markSeed).toBe('a1b2c3d4')
    for (const seed of ['A1B2C3D4', 'a1b2c3d', 'a1b2c3d45', 'a1b2c3dg', 12345678, '']) {
      expect(ok(wrap({ identity: { markSeed: seed } })).identity.markSeed).toBeNull()
    }
  })

  it('accepts only the marks the geometry can draw', () => {
    // The vocabulary is lib/identity/mark.ts's, and it is lowercase: an id the
    // geometry cannot draw would leave the stamp silently blank, so an unknown
    // one becomes null and the reader falls back to the seeded pattern.
    for (const mark of ['weld', 'hex', 'datum', 'section', 'finish', 'centre', 'seeded']) {
      expect(ok(wrap({ identity: { mark } })).identity.mark).toBe(mark)
    }
    for (const mark of ['WELD', 'Weld', 'BOGUS', 7, null, {}, []]) {
      expect(ok(wrap({ identity: { mark } })).identity.mark).toBeNull()
    }
  })

  it('accepts only the nine frozen §13.3 role ids', () => {
    for (const role of ['software-engineer', 'devops', 'data-engineer', 'data-analyst',
      'analyst', 'qa', 'project-manager', 'dba', 'pre-sales']) {
      expect(ok(wrap({ identity: { role } })).identity.role).toBe(role)
    }
    for (const role of ['QA', 'Qa', 'business-analyst', 'sre', '', 7, true, null, {}, []]) {
      expect(ok(wrap({ identity: { role } })).identity.role).toBeNull()
    }
  })

  it('reads an unknown role as ABSENT and never as the nearest one', () => {
    // A hand-edited import and a retired id arrive by the same door, and the
    // honest reading of both is that the reader has not said — which draws the
    // §13.4.3 picker. Repairing `business-analyst` into `analyst` would print a
    // job title the reader never chose and draw somebody else's path.
    const data = ok(wrap({ identity: { name: 'A', role: 'business-analyst' } }))
    expect(data.identity.role).toBeNull()
    expect(data.identity.name).toBe('A')
  })

  it('omits the role entirely for a record that never carried one', () => {
    expect(ok(wrap({ identity: { name: 'A' } })).identity.role).toBeNull()
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

describe('coercion — the sheets map', () => {
  it('coerces a sheets array to an empty map: a slug-keyed map is never an array', () => {
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

  it('drops a sheet record that holds nothing at all (§11.25 absent, not empty)', () => {
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

describe('coercion — the quiz', () => {
  it('keeps an answer with its assessment', () => {
    const quiz = ok(
      wrap({ sheets: { 'a/b': { quiz: { answer: 'a guess', assessed: 'missed', at: '2026-08-31T10:00:00.000Z' } } } }),
    ).sheets['a/b'].quiz
    expect(quiz).toEqual({ answer: 'a guess', assessed: 'missed', at: '2026-08-31T10:00:00.000Z' })
  })

  it('coerces an unknown assessment to unknown — never to a third state (§12.4.2)', () => {
    for (const assessed of ['passed', 'MATCHED', true, 1]) {
      const quiz = ok(wrap({ sheets: { 'a/b': { quiz: { answer: 'x', assessed } } } })).sheets['a/b'].quiz
      expect(quiz?.assessed).toBeNull()
    }
  })

  it('drops a quiz record that holds neither an answer nor an assessment', () => {
    expect(ok(wrap({ sheets: { 'a/b': { quiz: {}, reachedEnd: true } } })).sheets['a/b'].quiz).toBeNull()
    expect(ok(wrap({ sheets: { 'a/b': { quiz: [], reachedEnd: true } } })).sheets['a/b'].quiz).toBeNull()
    expect(ok(wrap({ sheets: { 'a/b': { quiz: 'matched', reachedEnd: true } } })).sheets['a/b'].quiz).toBeNull()
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

describe('coercion — sources', () => {
  it('keeps distinct http(s) URLs in the order they were opened', () => {
    const data = ok(
      wrap({
        sheets: {
          'a/b': {
            sources: ['https://a.example/x', 'http://b.example/', 'https://a.example/x'],
          },
        },
      }),
    )
    expect(data.sheets['a/b'].sources).toEqual(['https://a.example/x', 'http://b.example/'])
  })

  it('drops a javascript: URL, so it can never reach an href in the exported record', () => {
    const data = ok(
      wrap({
        sheets: {
          'a/b': {
            reachedEnd: true,
            sources: ['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', '//evil.example', 7],
          },
        },
      }),
    )
    expect(data.sheets['a/b'].sources).toEqual([])
  })
})

describe('coercion — submittals', () => {
  const submittal = (owner: string, repo: string, extra: Record<string, unknown> = {}) => ({
    owner, repo, url: 'https://evil.example/pwn', commit: null, note: 'n', at: '2026-08-31T10:00:00.000Z', ...extra,
  })

  it('caps a hostile 500-entry array at three (§12.9.1)', () => {
    const many = Array.from({ length: 500 }, (_, i) => submittal('o' + i, 'r' + i))
    const kept = ok(wrap({ sheets: { 'a/b': { submittals: many } } })).sheets['a/b'].submittals
    expect(kept).toHaveLength(3)
    expect(kept.map((s) => s.owner)).toEqual(['o0', 'o1', 'o2'])
  })

  it('rebuilds the url from owner and repo, discarding whatever was stored (§12.9.2)', () => {
    const kept = ok(wrap({ sheets: { 'a/b': { submittals: [submittal('lokumai', 'ai-minicourses')] } } }))
      .sheets['a/b'].submittals
    expect(kept[0].url).toBe('https://github.com/lokumai/ai-minicourses')
  })

  it('drops an entry whose owner or repo is not a GitHub segment', () => {
    const kept = ok(
      wrap({
        sheets: {
          'a/b': {
            reachedEnd: true,
            submittals: [
              submittal('own er', 'repo'),
              submittal('owner', 're/po'),
              submittal('', 'repo'),
              submittal('o'.repeat(101), 'repo'),
              submittal('owner', 'repo'),
            ],
          },
        },
      }),
    ).sheets['a/b'].submittals
    expect(kept.map((s) => s.url)).toEqual(['https://github.com/owner/repo'])
  })

  it('drops a duplicate owner/repo on the same sheet, case-insensitively', () => {
    const kept = ok(
      wrap({ sheets: { 'a/b': { submittals: [submittal('Own', 'Repo'), submittal('own', 'repo')] } } }),
    ).sheets['a/b'].submittals
    expect(kept).toHaveLength(1)
    expect(kept[0].owner).toBe('Own')
  })

  it('keeps a commit hash only in the documented shape (§12.9.3)', () => {
    const commitOf = (commit: unknown) =>
      ok(wrap({ sheets: { 'a/b': { submittals: [submittal('o', 'r', { commit })] } } }))
        .sheets['a/b'].submittals[0].commit
    expect(commitOf('a1b2c3d')).toBe('a1b2c3d')
    expect(commitOf('f'.repeat(40))).toBe('f'.repeat(40))
    expect(commitOf('A1B2C3D')).toBeNull()
    expect(commitOf('a1b2c3')).toBeNull()
    expect(commitOf('f'.repeat(41))).toBeNull()
    expect(commitOf('zzzzzzz')).toBeNull()
    expect(commitOf(1234567)).toBeNull()
  })

  it('keeps the note as text and coerces a non-string to empty', () => {
    const noteOf = (note: unknown) =>
      ok(wrap({ sheets: { 'a/b': { submittals: [submittal('o', 'r', { note })] } } }))
        .sheets['a/b'].submittals[0].note
    expect(noteOf('built the retry loop')).toBe('built the retry loop')
    expect(noteOf('</script><img src=x onerror=1>')).toBe('</script><img src=x onerror=1>')
    expect(noteOf(42)).toBe('')
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

  it('lifts the payload out of a RECORD OF WORK document', () => {
    const html = [
      '<!doctype html><html lang="en"><head><title>RECORD OF WORK</title></head><body>',
      '<script type="application/json" id="hl-record">{"schema":1,"data":{"days":["2026-08-31"]}}</script>',
      '</body></html>',
    ].join('\n')
    const text = envelopeTextFrom(html)
    expect(text).not.toBeNull()
    expect(JSON.parse(text as string).data.days).toEqual(['2026-08-31'])
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
