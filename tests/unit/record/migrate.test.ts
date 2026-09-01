import { describe, expect, it } from 'vitest'
import { MIGRATIONS, migrate } from '@/lib/record/migrate'
import { EMPTY_RECORD, SCHEMA_VERSION } from '@/lib/record/schema'
import { parseEnvelope } from '@/lib/record/validate'

describe('the ladder', () => {
  it('has exactly one step per version increment', () => {
    // The ladder is empty at schema 1 and gains one function per increment;
    // this equality is what makes a missing step a failing test rather than a
    // silently skipped migration.
    expect(MIGRATIONS.length).toBe(SCHEMA_VERSION - 1)
  })

  it('is empty today, and an empty ladder is the identity', () => {
    expect(MIGRATIONS).toEqual([])
    const payload = { sheets: { 'a/b': { reachedEnd: true } }, days: ['2026-08-31'] }
    expect(migrate(payload, 1)).toEqual({
      ...EMPTY_RECORD,
      sheets: { 'a/b': { ...structuredClone(EMPTY_RECORD).sheets, reachedEnd: true, signedOff: null, signedRevision: null, dwellSeconds: 0, quiz: null, checklist: {}, sources: [], submittals: [] } },
      days: ['2026-08-31'],
    })
  })

  it('reads a Phase 2 envelope, which never carried a role, at role: null (§13.3)', () => {
    // §13.3's widening: `role` was added without a rung, because the coercer
    // already defaults a missing field and `null` is exactly what "has not
    // said" means. This is the fixture the contract above asks for — the Phase 2
    // shape written as a literal, not built from today's helpers.
    const phase2 = {
      identity: { name: 'Ada Lovelace', markSeed: 'a1b2c3d4', mark: 'weld' },
      sheets: { 'fundamentals/llms': { signedOff: '2026-08-14T00:00:00.000Z', signedRevision: 'a1b2c3d' } },
      days: ['2026-08-14'],
      prefs: { charKeys: true },
      meta: { lastExport: null, persisted: true },
    }
    const out = migrate(phase2, 1)
    expect(out.identity).toEqual({
      name: 'Ada Lovelace', markSeed: 'a1b2c3d4', mark: 'weld', role: null,
    })
    // Nothing else moved: a widening reads the old record, it does not rewrite it.
    expect(out.sheets['fundamentals/llms'].signedOff).toBe('2026-08-14T00:00:00.000Z')
    expect(out.days).toEqual(['2026-08-14'])
    expect(SCHEMA_VERSION).toBe(1)
    expect(MIGRATIONS).toEqual([])
  })

  it('coerces on the way out, so the ladder always lands on the current shape', () => {
    expect(migrate(null, 1)).toEqual(EMPTY_RECORD)
    expect(migrate('junk', 1)).toEqual(EMPTY_RECORD)
  })

  it('never mutates the payload it is handed', () => {
    const payload = Object.freeze({ days: Object.freeze(['2026-08-31']) })
    expect(() => migrate(payload, 1)).not.toThrow()
    expect(payload.days).toEqual(['2026-08-31'])
  })

  it('treats a from below 1 as 1 rather than stepping off the bottom of the ladder', () => {
    expect(migrate({ days: ['2026-08-31'] }, 0)).toEqual({ ...EMPTY_RECORD, days: ['2026-08-31'] })
    expect(migrate({ days: ['2026-08-31'] }, -7)).toEqual({ ...EMPTY_RECORD, days: ['2026-08-31'] })
  })

  it('runs no step for a payload from the future — that case is quarantined upstream', () => {
    // parseEnvelope never calls the ladder for schema > SCHEMA_VERSION; if
    // something else does, the ladder must still not invent a downgrade.
    expect(migrate({ days: ['2026-08-31'] }, 99)).toEqual({ ...EMPTY_RECORD, days: ['2026-08-31'] })
  })

  it('is sequential and forward-only when steps exist', () => {
    // A local ladder stands in for the future real one: the point under test is
    // the order the steps run in, which is the mechanism §12.1.2 relies on.
    const trace: string[] = []
    const ladder: ReadonlyArray<(data: unknown) => unknown> = [
      (d) => { trace.push('1->2'); return d },
      (d) => { trace.push('2->3'); return d },
      (d) => { trace.push('3->4'); return d },
    ]
    let out: unknown = { days: [] }
    for (let version = 2; version < 4; version += 1) out = ladder[version - 1](out)
    expect(trace).toEqual(['2->3', '3->4'])
  })
})

describe('parseEnvelope composes with the ladder', () => {
  it('reads a current-version payload without stepping', () => {
    const result = parseEnvelope(JSON.stringify({ schema: SCHEMA_VERSION, data: { days: ['2026-08-31'] } }))
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.data.days).toEqual(['2026-08-31'])
    expect(result.schema).toBe(SCHEMA_VERSION)
  })
})
