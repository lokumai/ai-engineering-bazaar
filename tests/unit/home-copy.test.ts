import { describe, expect, it } from 'vitest'
import { CAST } from '@/components/home/street/cast'
import { TRANSLATED_LANGS } from '@/lib/content/languages'
import { HOME_COPY } from '@/lib/home-copy'

/**
 * The home page's words, in every language the registry lists.
 *
 * Every claim is a rule for any wording: the table is walked, and no sentence is
 * typed in here. The English row is the shape; a language is complete when it
 * has every string the English has, at the same place, written in its own
 * script. Each claim was seen failing under a named mutation (the report of the
 * commit that added this file lists them).
 */

/** Every string in a row, by its path: `cast.mihri.story`, `mottos.sieve.sub`. */
function leaves(value: unknown, path = ''): Map<string, string> {
  const out = new Map<string, string>()
  if (typeof value === 'string') return out.set(path, value)
  if (value !== null && typeof value === 'object') {
    for (const [key, inner] of Object.entries(value)) {
      for (const [at, text] of leaves(inner, path === '' ? key : `${path}.${key}`)) out.set(at, text)
    }
  }
  return out
}

const ENGLISH = leaves(HOME_COPY.en)
const OTHERS = TRANSLATED_LANGS.map((lang) => [lang, leaves(HOME_COPY[lang])] as const)

const ARABIC_SCRIPT = /[؀-ۿ]/
const LATIN_LETTER = /[A-Za-zÀ-ɏ]/

describe('the home page copy table', () => {
  it('has a row for English and for every language the registry lists, and no other', () => {
    expect(Object.keys(HOME_COPY).sort()).toEqual(['en', ...TRANSLATED_LANGS].sort())
    // The vacuity floor: every test below walks these, and an empty table passes them all.
    expect(ENGLISH.size, 'the English row is empty').toBeGreaterThan(20)
    expect(OTHERS.length, 'the registry lists no translation').toBeGreaterThan(0)
  })

  it.each(OTHERS)('%s has every string the English has, at the same place, and nothing more', (lang, row) => {
    expect([...row.keys()].sort(), `${lang} and English hold different strings`).toEqual([...ENGLISH.keys()].sort())
    const blank = [...row].filter(([, text]) => text.trim() === '').map(([at]) => at)
    expect(blank, `${lang} has an empty string`).toEqual([])
  })

  it.each(OTHERS)('%s translates every string: none is the English left in place', (lang, row) => {
    const same = [...row].filter(([at, text]) => text === ENGLISH.get(at)).map(([at]) => at)
    expect(same, `${lang} still says what the English says`).toEqual([])
  })

  it.each(OTHERS)('%s has a trade and a story for every person at the gate, and for no one else', (lang) => {
    expect(Object.keys(HOME_COPY[lang].cast).sort()).toEqual(CAST.map((one) => one.id).sort())
  })

  it('is written in the language it is filed under', () => {
    // A row filed under `fa` that is Turkish, or the reverse, is the copy-and-forget mistake.
    for (const [lang, row] of OTHERS) {
      const wrongScript = [...row].filter(([, text]) => (lang === 'fa' ? !ARABIC_SCRIPT.test(text) : ARABIC_SCRIPT.test(text) || !LATIN_LETTER.test(text)))
      expect(wrongScript.map(([at]) => at), `${lang} holds a string in the wrong script`).toEqual([])
    }
  })

  it('keeps the copy register in every language', () => {
    // `copy-register.test.ts` bans these in English, and scans folders this table is not in
    // (the English is the author's own words, D79). What holds in every language is checked here.
    const BANNED: ReadonlyArray<readonly [string, RegExp]> = [
      ['an exclamation mark', /[!！¡]/],
      ['a polite filler (en)', /\b(?:please|sorry)\b/i],
      ['a polite filler (tr)', /\b(?:lütfen|özür)/i],
      ['a polite filler (fa)', /لطفاً?|ببخشید|متأسف/],
    ]
    for (const [lang, row] of [['en', ENGLISH] as const, ...OTHERS]) {
      for (const [at, text] of row) {
        for (const [what, pattern] of BANNED) {
          if (lang === 'en' && what.startsWith('a polite filler (')) continue
          expect(pattern.test(text), `${lang} ${at} has ${what}`).toBe(false)
        }
      }
    }
  })

  it('writes Persian as the corpus does: ASCII digits, no tatweel, Persian letters, no stray joiner', () => {
    const persian = leaves(HOME_COPY.fa)
    for (const [at, text] of persian) {
      expect(/ـ/.test(text), `fa ${at} has a tatweel`).toBe(false)
      expect(/[٠-٩۰-۹]/.test(text), `fa ${at} has a non-ASCII digit`).toBe(false)
      // The Arabic yeh and kaf are the usual keyboard mistake: Persian has its own letters.
      expect(/[يك]/.test(text), `fa ${at} has an Arabic yeh or kaf`).toBe(false)
      // A zero-width non-joiner joins a suffix to a word; beside a space or another one it is a slip.
      expect(/‌\s|\s‌|‌‌|^‌|‌$/.test(text), `fa ${at} has a stray ZWNJ`).toBe(false)
    }
  })

  it('keeps every character a name: the names are in the cast, not in the table', () => {
    // A name is written as it is written. The table holds no row for one, so a translation
    // cannot rename a character (the stories may use the name, in Latin letters).
    for (const person of CAST) {
      for (const [lang, row] of OTHERS) {
        const story = row.get(`cast.${person.id}.story`) ?? ''
        const named = new RegExp(`(^|[^\\p{L}])${person.name}([^\\p{L}]|$)`, 'u')
        expect(story, `${lang}: ${person.id}'s story does not name them as written`).toMatch(named)
      }
    }
  })

  it.each(OTHERS)('%s keeps the tellers named as written', (lang, row) => {
    const tellers = [...row].filter(([at]) => at.includes('teller') && at.endsWith('story')).map(([, text]) => text).join(' ')
    for (const name of ['Sipahi', 'Bezirgân']) expect(tellers, `${lang} renamed ${name}`).toContain(name)
  })
})
