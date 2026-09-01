import { describe, expect, it } from 'vitest'
import { aliasFromEmail } from '@/lib/identity/alias-offer'
import { MAX_NAME_GRAPHEMES } from '@/lib/identity/name'
import { EMPTY_RECORD, carriesNothing, type RecordData } from '@/lib/record/schema'
import { coerceRecordData } from '@/lib/record/validate'
import { noteAliasNamed, setCharKeys } from '@/lib/record/events'

/**
 * §16.3. Three modules are under test here rather than one, and that is
 * deliberate: `aliasFromEmail`, `prefs.aliasNamedFor` and `noteAliasNamed` are
 * one decision cut across three files, and the widening is only safe if all
 * three are asserted together. The record suite's own files
 * (`tests/unit/record/*`) belong to the task that rewrites them for the
 * redesign, so the widening's assertions live beside the function that motivated
 * it instead of being split across an owner boundary.
 *
 * Every non-ASCII string is written as an explicit escape so this file's own
 * normalisation form cannot decide whether a test passes.
 */

/** U+202E RIGHT-TO-LEFT OVERRIDE, which `sanitiseName` removes. */
const RLO = '\u202E'
/** E + U+0301 COMBINING ACUTE, then `lodie` — seven code units, six graphemes. */
const NFD_ELODIE = 'E\u0301lodie'
/** One grapheme: three emoji joined by two U+200D, eight code units. */
const ZWJ_FAMILY = '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}'

describe('aliasFromEmail — the local part, offered as a name (§16.3)', () => {
  it('takes the local part and never the domain', () => {
    expect(aliasFromEmail('ada@example.com')).toBe('ada')
  })

  it('keeps a dotted local part exactly as it was typed', () => {
    // Dots are not turned into spaces. A dotted local part is a plausible
    // rendering of a name, and inventing `Ada Lovelace` from `ada.lovelace`
    // would be a second guess layered on the first.
    expect(aliasFromEmail('ada.lovelace@x.co')).toBe('ada.lovelace')
  })

  it('keeps the case as typed', () => {
    // §12.3.4 forbids re-casing a reader's name: `'ilker'.toUpperCase()` is a
    // dotless I where a Turkish reader expects İ.
    expect(aliasFromEmail('Ada@x.co')).toBe('Ada')
  })

  it('drops a plus tag, which is mail routing rather than a name', () => {
    expect(aliasFromEmail('Ada+notes@x.co')).toBe('Ada')
    expect(aliasFromEmail('ada+@x.co')).toBe('ada')
  })

  it('returns null when the plus tag is all there is', () => {
    expect(aliasFromEmail('+notes@x.co')).toBeNull()
  })

  it('splits at the last @, so no domain fragment can survive', () => {
    expect(aliasFromEmail('a@b@example.com')).toBe('a@b')
  })

  it('returns null for an address with no @', () => {
    expect(aliasFromEmail('ada.example.com')).toBeNull()
  })

  it('returns null for an empty local part', () => {
    expect(aliasFromEmail('@x.co')).toBeNull()
    expect(aliasFromEmail('   @x.co')).toBeNull()
  })

  it('returns null for null, undefined and the empty string', () => {
    expect(aliasFromEmail(null)).toBeNull()
    expect(aliasFromEmail(undefined)).toBeNull()
    expect(aliasFromEmail('')).toBeNull()
  })

  it('returns null when the local part sanitises to nothing', () => {
    expect(aliasFromEmail(`${RLO}@x.co`)).toBeNull()
  })

  it('strips a bidi override through sanitiseName, not through new code', () => {
    expect(aliasFromEmail(`ada${RLO}@x.co`)).toBe('ada')
  })

  it('normalises to NFC, as sanitiseName does', () => {
    expect(aliasFromEmail(`${NFD_ELODIE}@x.co`)).toBe(NFD_ELODIE.normalize('NFC'))
  })

  it('offers nothing rather than a truncated name past the grapheme cap', () => {
    const long = 'a'.repeat(MAX_NAME_GRAPHEMES + 1)
    expect(aliasFromEmail(`${long}@x.co`)).toBeNull()
    expect(aliasFromEmail(`${'a'.repeat(MAX_NAME_GRAPHEMES)}@x.co`)).toBe(
      'a'.repeat(MAX_NAME_GRAPHEMES),
    )
  })

  it('counts the cap in graphemes, not UTF-16 units', () => {
    // Eighty joined-family emoji are 640 code units and eighty graphemes, so a
    // `.length` cap would refuse a local part the grapheme cap accepts.
    const eighty = ZWJ_FAMILY.repeat(MAX_NAME_GRAPHEMES)
    expect(eighty.length).toBeGreaterThan(MAX_NAME_GRAPHEMES)
    expect(aliasFromEmail(`${eighty}@x.co`)).toBe(eighty)
  })

  it('is pure: the same input answers the same twice, and the result is stable', () => {
    const first = aliasFromEmail('ada@example.com')
    expect(aliasFromEmail('ada@example.com')).toBe(first)
    // Idempotent through the sanitiser, which the record store relies on when
    // it re-validates a payload read back out of storage.
    expect(aliasFromEmail(`${first}@example.com`)).toBe(first)
  })
})

const wrap = (data: unknown) => ({ schema: 1, savedAt: null, data })

describe('prefs.aliasNamedFor — the schema slot (§16.3)', () => {
  it('is null in EMPTY_RECORD, because no account has named anything', () => {
    expect(EMPTY_RECORD.prefs.aliasNamedFor).toBeNull()
  })

  it('coerces a string through and anything else to null', () => {
    expect(coerceRecordData({ prefs: { aliasNamedFor: 'user-1' } }).prefs.aliasNamedFor).toBe(
      'user-1',
    )
    for (const junk of [42, true, null, undefined, {}, [], '']) {
      expect(coerceRecordData({ prefs: { aliasNamedFor: junk } }).prefs.aliasNamedFor).toBeNull()
    }
  })

  it('loads a record written before the widening', () => {
    // The exact v1 shape, as a literal fixture: `migrate.ts` requires a
    // widening to be readable without a rung, so this must not be built by
    // calling today's helpers.
    const before = wrap({
      identity: { name: 'Ada', markSeed: '4f9c2a17', mark: null, role: null },
      sheets: {},
      days: ['2026-08-01'],
      prefs: { charKeys: false },
      meta: { lastExport: null, persisted: null },
    })
    const data = coerceRecordData(before.data)
    expect(data.prefs).toEqual({ charKeys: false, aliasNamedFor: null })
    expect(data.identity.name).toBe('Ada')
    expect(data.days).toEqual(['2026-08-01'])
  })

  it('drops an unknown pref key, as the permissive coercer always has', () => {
    const data = coerceRecordData({ prefs: { charKeys: false, theme: 'dark' } })
    expect(Object.keys(data.prefs).sort()).toEqual(['aliasNamedFor', 'charKeys'])
  })
})

describe('carriesNothing still ignores prefs (schema.ts, §16.3)', () => {
  const flagged: RecordData = {
    ...EMPTY_RECORD,
    prefs: { charKeys: true, aliasNamedFor: 'user-1' },
  }

  it('an erased record is not resurrected by the naming flag', () => {
    // The flag is written from an account, and the cross-tab path uses
    // `carriesNothing` to decide whether an envelope is worth pushing. If the
    // flag counted as content, a tab that had nothing to do with an erase could
    // push an otherwise-empty record back over the account-side delete.
    expect(carriesNothing(flagged)).toBe(true)
  })

  it('and the same holds for the keyboard preference it sits beside', () => {
    expect(carriesNothing(setCharKeys(EMPTY_RECORD, false))).toBe(true)
  })

  it('a record that carries something the reader made still says so', () => {
    expect(carriesNothing({ ...flagged, identity: { ...flagged.identity, name: 'Ada' } })).toBe(
      false,
    )
  })
})

describe('noteAliasNamed — the only writer of the flag (§16.3)', () => {
  const NOW = '2026-09-02T10:00:00.000Z'

  it('writes the account id and stamps the day, without touching anything else', () => {
    const next = noteAliasNamed(EMPTY_RECORD, 'user-1', NOW)
    expect(next.prefs.aliasNamedFor).toBe('user-1')
    expect(next.days).toEqual(['2026-09-02'])
    expect(next.identity).toEqual(EMPTY_RECORD.identity)
    expect(next.prefs.charKeys).toBe(EMPTY_RECORD.prefs.charKeys)
    expect(next.meta).toEqual(EMPTY_RECORD.meta)
  })

  it('does not mutate the record it was given', () => {
    const before: RecordData = { ...EMPTY_RECORD, prefs: { ...EMPTY_RECORD.prefs } }
    noteAliasNamed(before, 'user-1', NOW)
    expect(before.prefs.aliasNamedFor).toBeNull()
  })

  it('returns the same object when the flag already names that account', () => {
    const once = noteAliasNamed(EMPTY_RECORD, 'user-1', NOW)
    expect(noteAliasNamed(once, 'user-1', '2026-09-03T10:00:00.000Z')).toBe(once)
  })

  it('re-points the flag when a different account names the alias', () => {
    const once = noteAliasNamed(EMPTY_RECORD, 'user-1', NOW)
    expect(noteAliasNamed(once, 'user-2', NOW).prefs.aliasNamedFor).toBe('user-2')
  })

  it('refuses a blank id, which would compare unequal to every account for ever', () => {
    expect(noteAliasNamed(EMPTY_RECORD, '', NOW)).toBe(EMPTY_RECORD)
    expect(noteAliasNamed(EMPTY_RECORD, '   ', NOW)).toBe(EMPTY_RECORD)
  })

  it('writes only the flag; the name stays setIdentity\'s to write', () => {
    const next = noteAliasNamed({ ...EMPTY_RECORD, identity: { ...EMPTY_RECORD.identity } }, 'u', NOW)
    expect(next.identity.name).toBeNull()
  })
})
