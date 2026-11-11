import { describe, expect, it } from 'vitest'
import { PAGE_COPY, type PageCopy } from '@/lib/content/page-copy'
import { TRANSLATED_LANGS, type ReadingLang } from '@/lib/content/languages'
import { thousands } from '@/lib/content/title-block'

/**
 * D133 — the table of a module page's own words.
 *
 * `tsc` already fails a missing key (the table is `Record<ReadingLang, PageCopy>`), so what this
 * holds is what a type cannot: that a translation is not the English left in place, that every
 * language's strings keep the copy register, and that the numbers are written the way each
 * language writes them.
 */
const LANGS = Object.keys(PAGE_COPY) as ReadingLang[]

/** Every string a language's table can print, with the functions called on sample arguments. */
function leaves(copy: PageCopy): string[] {
  const out: string[] = []
  const walk = (value: unknown, key = ''): void => {
    if (typeof value === 'string') out.push(value)
    else if (typeof value === 'function') {
      const args = key === 'date' ? ['2026-10-11'] : [3, 5, 'C']
      const made = (value as (...args: never[]) => unknown)(...(args as never[]))
      const pieces = Array.isArray(made) ? made : [made]
      for (const piece of pieces) walk(piece)
    } else if (value !== null && typeof value === 'object') Object.entries(value).forEach(([name, one]) => walk(one, name))
  }
  walk(copy)
  return out
}

/** The shape of a table, with every string reduced to a marker, so two languages can be compared. */
function shape(value: unknown): unknown {
  if (typeof value === 'string') return 's'
  if (typeof value === 'function') return 'f'
  return Object.fromEntries(Object.entries(value as object).map(([key, one]) => [key, shape(one)]))
}

describe('the module page copy', () => {
  it('has a table for every reading language, and the same keys in each', () => {
    expect(LANGS.sort()).toEqual(['en', ...TRANSLATED_LANGS].sort())
    for (const lang of TRANSLATED_LANGS) expect(shape(PAGE_COPY[lang]), lang).toEqual(shape(PAGE_COPY.en))
  })

  it('is translated: no Turkish or Persian string is the English one left in place', () => {
    const english = new Set(leaves(PAGE_COPY.en))
    for (const lang of TRANSLATED_LANGS) {
      const same = leaves(PAGE_COPY[lang]).filter((text) => english.has(text) && /[A-Za-z]{3}/.test(text))
      expect(same, `${lang} strings identical to English`).toEqual([])
    }
  })

  /* The copy register (`copy-register.test.ts`) scans the English strings; these are the words
     the same rules ban in Turkish and Persian. */
  const BANS: Record<'tr' | 'fa', RegExp[]> = {
    tr: [/\bsadece\b/i, /\byalnızca\b/i, /\bbasitçe\b/i, /\bkolay/i, /\bhızlı/i, /\blütfen\b/i, /\bözür\b/i,
      /\büzgünüm\b/i, /\bharika\b/i, /\bmükemmel\b/i, /\btebrik/i, /\baferin\b/i],
    fa: [/فقط/, /ساده/, /آسان/, /راحت/, /سریع/, /لطفا/, /لطفاً/, /ببخشید/, /متاسفم/, /عالی/, /آفرین/, /تبریک/, /دمت گرم/],
  }
  for (const lang of LANGS) {
    it(`${lang}: no exclamation mark, no praise, no apology, no "just" or "easy"`, () => {
      for (const text of leaves(PAGE_COPY[lang])) {
        expect(text, text).not.toMatch(/[!！]/)
        if (lang !== 'en') for (const ban of BANS[lang]) expect(text, `${ban} in ${text}`).not.toMatch(ban)
      }
    })
  }

  it('Persian keeps ASCII digits, no tatweel, and no zero-width joiner before a suffix on a Latin word', () => {
    for (const text of leaves(PAGE_COPY.fa)) {
      expect(text, text).not.toMatch(/[۰-۹٠-٩]/)
      expect(text, text).not.toMatch(/ـ/)
      expect(text, text).not.toMatch(/[A-Za-z]‌/)
    }
  })

  it('writes a number the way each language does', () => {
    expect(PAGE_COPY.en.readingTime(30, 2931)).toBe(`30 min · ${thousands(2931)} words`)
    expect(PAGE_COPY.tr.readingTime(30, 2931)).toBe('30 dk · 2.931 kelime')
    expect(PAGE_COPY.fa.readingTime(30, 2931)).toBe('30 دقیقه مطالعه · 2,931 کلمه')
    expect(PAGE_COPY.tr.readingTime(5, 931)).toBe('5 dk · 931 kelime')
    for (const lang of LANGS) expect(PAGE_COPY[lang].quiz.progress(1, 5), lang).toMatch(/1.*5/)
  })

  it('writes a date from a table, one answer in every language, and returns a non-date as it came', () => {
    expect(PAGE_COPY.en.date('2026-10-11T08:00:00.000Z')).toBe('11 Oct 2026')
    expect(PAGE_COPY.tr.date('2026-10-11')).toBe('11 Eki 2026')
    expect(PAGE_COPY.fa.date('2026-10-11')).toBe('11 اکتبر 2026')
    for (const lang of LANGS) expect(PAGE_COPY[lang].date('not a date'), lang).toBe('not a date')
  })
})
