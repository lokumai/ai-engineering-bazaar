import { describe, expect, it } from 'vitest'
import {
  dayOf,
  markActivity,
  markExported,
  setCharKeys,
  setChecklistItem,
  setPersisted,
  signOff,
  unsign } from '@/lib/record/events'
import { EMPTY_RECORD, type RecordData } from '@/lib/record/schema'
import { coerceRecordData } from '@/lib/record/validate'

const NOW = '2026-08-31T09:15:00.000Z'
const TODAY = '2026-08-31'
const SLUG = 'fundamentals/llms'

/** Deep-frozen, so any in-place write throws instead of passing quietly. */
function frozen(patch: Partial<RecordData> = {}): RecordData {
  const data: RecordData = structuredClone({ ...EMPTY_RECORD, ...patch })
  const freeze = (value: unknown): void => {
    if (value && typeof value === 'object') {
      for (const inner of Object.values(value)) freeze(inner)
      Object.freeze(value)
    }
  }
  freeze(data)
  return data
}

describe('dayOf', () => {
  it('takes the day off the instant the caller passed, and reads no clock', () => {
    expect(dayOf(NOW)).toBe(TODAY)
    expect(dayOf('2026-01-01T00:00:00.000Z')).toBe('2026-01-01')
  })

  it('returns null rather than guessing when the instant is not one', () => {
    expect(dayOf('')).toBeNull()
    expect(dayOf('yesterday')).toBeNull()
    expect(dayOf('31/08/2026')).toBeNull()
  })
})

describe('the day stamp agrees with the validator', () => {
  it('stamps only days the validator will read back', () => {
    // Two modules judge a calendar day, and a disagreement would show as a
    // tick that vanished on reload.
    const stamped = signOff(frozen(), SLUG, null, NOW)
    expect(coerceRecordData(stamped).days).toEqual([TODAY])
    const impossible = signOff(frozen(), SLUG, null, '2026-02-31T09:00:00.000Z')
    expect(impossible.days).toEqual([])
    expect(coerceRecordData(impossible).days).toEqual([])
  })
})

describe('signOff', () => {
  it('records the assertion, the revision it was made against, and the day', () => {
    const next = signOff(frozen(), SLUG, 'a1b2c3d', NOW)
    expect(next.sheets[SLUG].signedOff).toBe(NOW)
    expect(next.sheets[SLUG].signedRevision).toBe('a1b2c3d')
    expect(next.days).toEqual([TODAY])
  })

  it('records a null revision rather than a plausible one when git gave none', () => {
    expect(signOff(frozen(), SLUG, null, NOW).sheets[SLUG].signedRevision).toBeNull()
  })

  it('leaves an already-signed module exactly as it was recorded', () => {
    const first = signOff(frozen(), SLUG, 'a1b2c3d', NOW)
    const again = signOff(first, SLUG, 'e4f5a6b', '2026-09-02T10:00:00.000Z')
    // A recorded fact is not rewritten: §12.4.3's drift line is the honest
    // answer to a changed revision, and UNSIGN then SIGN OFF is how a reader
    // re-asserts against the new one.
    expect(again).toBe(first)
  })

  it('stamps the day once even when the same day is stamped twice', () => {
    const twice = signOff(signOff(frozen(), SLUG, null, NOW), 'fundamentals/training', null, NOW)
    expect(twice.days).toEqual([TODAY])
  })

  it('keeps days sorted when an older instant arrives after a newer one', () => {
    const later = signOff(frozen(), SLUG, null, '2026-09-02T08:00:00.000Z')
    const earlier = signOff(later, 'fundamentals/training', null, NOW)
    expect(earlier.days).toEqual([TODAY, '2026-09-02'])
  })

})

describe('unsign', () => {
  it('clears the assertion and the revision, and keeps everything else', () => {
    const signed = setChecklistItem(signOff(frozen(), SLUG, 'a1b2c3d', NOW), SLUG, 0, true, NOW)
    const next = unsign(signed, SLUG)
    expect(next.sheets[SLUG].signedOff).toBeNull()
    expect(next.sheets[SLUG].signedRevision).toBeNull()
    expect(next.sheets[SLUG].checklist).toEqual({ '0': true })
    expect(next.days).toEqual([TODAY])
  })

  it('is a no-op on a module nobody signed', () => {
    const data = frozen()
    expect(unsign(data, SLUG)).toBe(data)
  })
})

describe('setChecklistItem', () => {
  it('stores a tick and stamps the day', () => {
    const next = setChecklistItem(frozen(), SLUG, 3, true, NOW)
    expect(next.sheets[SLUG].checklist).toEqual({ '3': true })
    expect(next.days).toEqual([TODAY])
  })

  it('removes the key when the box is unticked, because absence is the default', () => {
    const ticked = setChecklistItem(frozen(), SLUG, 3, true, NOW)
    expect(setChecklistItem(ticked, SLUG, 3, false, NOW).sheets[SLUG].checklist).toEqual({})
  })

  it('is a no-op for an index that is not a whole number in range', () => {
    const data = frozen()
    for (const index of [-1, 1.5, Number.NaN, 10_000]) {
      expect(setChecklistItem(data, SLUG, index, true, NOW)).toBe(data)
    }
  })

  it('is a no-op when the tick is already where it is asked to be', () => {
    const ticked = setChecklistItem(frozen(), SLUG, 0, true, NOW)
    expect(setChecklistItem(ticked, SLUG, 0, true, NOW)).toBe(ticked)
    const untouched = frozen()
    expect(setChecklistItem(untouched, SLUG, 0, false, NOW)).toBe(untouched)
  })
})

describe('prefs and meta', () => {
  it('toggles the character-key shortcuts (§12.16)', () => {
    const off = setCharKeys(frozen(), false)
    expect(off.prefs.charKeys).toBe(false)
    expect(setCharKeys(off, false)).toBe(off)
    expect(setCharKeys(off, true).prefs.charKeys).toBe(true)
  })

  it('records the export and stamps the day', () => {
    const next = markExported(frozen(), NOW)
    expect(next.meta.lastExport).toBe(NOW)
    expect(next.days).toEqual([TODAY])
  })

  it('records the queried persistence answer, including a false one', () => {
    expect(setPersisted(frozen(), true).meta.persisted).toBe(true)
    expect(setPersisted(frozen(), false).meta.persisted).toBe(false)
    expect(setPersisted(setPersisted(frozen(), true), null).meta.persisted).toBeNull()
    // A false result is normal, not an error (§12.1.6), and is not a write of
    // the reader's own doing, so no day is stamped for it.
    expect(setPersisted(frozen(), false).days).toEqual([])
  })
})

describe('every reducer is non-mutating', () => {
  const cases: Array<[string, (data: RecordData) => RecordData]> = [
    ['signOff', (d) => signOff(d, SLUG, 'a1b2c3d', NOW)],
    ['unsign', (d) => unsign(d, SLUG)],
    ['setChecklistItem', (d) => setChecklistItem(d, SLUG, 0, true, NOW)],
    ['setCharKeys', (d) => setCharKeys(d, false)],
    ['markExported', (d) => markExported(d, NOW)],
    ['setPersisted', (d) => setPersisted(d, true)],
  ]

  /** A record with something in every field, so no reducer takes a short path. */
  function populated(): RecordData {
    let data: RecordData = { ...EMPTY_RECORD }
    data = signOff(data, SLUG, 'a1b2c3d', NOW)
    data = setChecklistItem(data, SLUG, 0, true, NOW)
    return data
  }

  for (const [name, run] of cases) {
    it(`${name} leaves a deep-frozen record untouched`, () => {
      const before = frozen(populated())
      const snapshot = structuredClone(before)
      expect(() => run(before)).not.toThrow()
      expect(before).toEqual(snapshot)
    })
  }

})

describe('markActivity / markExported — the export is a backup (§7.3, §12.12.6)', () => {
  const AT = '2026-09-02T09:00:00.000Z'

  it('stamps the day without touching anything else', () => {
    const data = markActivity(EMPTY_RECORD, AT)
    expect(data.days).toEqual(['2026-09-02'])
    expect(data.meta.lastExport).toBeNull()
    expect(data.sheets).toEqual({})
  })

  it('is idempotent, so exporting twice in a day adds one tick', () => {
    const once = markActivity(EMPTY_RECORD, AT)
    expect(markActivity(once, '2026-09-02T18:00:00.000Z').days).toEqual(['2026-09-02'])
  })

  /**
   * The bug this pair exists to prevent, found by driving Chrome: the panel
   * serialised the record and only then called `markExported`, which stamps the
   * day — so the exported file came back one tick short of the record that
   * produced it, and the UPTIME strip understated a day the reader had earned by
   * doing the export.
   *
   * The order is now: stamp the day, freeze the bytes, then record the export.
   * `lastExport` is deliberately absent from the file — a file cannot honestly
   * claim an export that had not happened when it was written — while the DAY is
   * present, because the day is true of the record being written.
   */
  it('puts the day in the exported bytes and keeps lastExport out of them', () => {
    const stamped = markActivity(EMPTY_RECORD, AT)
    const frozen = JSON.parse(JSON.stringify(stamped))
    const after = markExported(stamped, AT)

    expect(frozen.days).toEqual(['2026-09-02'])
    expect(frozen.meta.lastExport).toBeNull()
    expect(after.meta.lastExport).toBe(AT)
    // And the record left behind agrees with the file about the day.
    expect(after.days).toEqual(frozen.days)
  })
})

