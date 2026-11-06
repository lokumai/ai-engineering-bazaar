/**
 * M59 (D95) — the one text normaliser search runs on both sides: on every word when the
 * index is built, and on every word of a query. Measured in the round-4 playground
 * (`playground/2026-11-round-4/O-search-engine.html`): no library shipped handles Turkish
 * or Persian as a reader types them, and these rules found all 25 test words in each
 * language. Pure and dependency-free, so the build and the browser run the same code.
 *
 * - English: lower-case.
 * - Turkish: lower-case with the Turkish rules (I to ı, İ to i), then fold ı ğ ş ç ö ü â î
 *   û to plain letters, so a reader on an English keyboard finds "görev" by typing "gorev".
 * - Persian: the Arabic yeh and kaf become the Persian forms, the zero-width non-joiner, the
 *   short-vowel marks and the stretching mark go, and Persian and Arabic digits become
 *   ASCII ones; a Latin word inside the text is lower-cased.
 */

export type SearchLang = 'en' | 'tr' | 'fa'

const TURKISH_FOLD: Readonly<Record<string, string>> = {
  ı: 'i',
  ğ: 'g',
  ş: 's',
  ç: 'c',
  ö: 'o',
  ü: 'u',
  â: 'a',
  î: 'i',
  û: 'u',
}

/* Arabic yeh and alef maksura to Persian yeh; Arabic kaf to Persian keheh. */
const PERSIAN_LETTERS: Readonly<Record<string, string>> = { 'ي': 'ی', 'ى': 'ی', 'ك': 'ک' }
/* The zero-width non-joiner, the tatweel, and the harakat with the superscript alef. */
const PERSIAN_DROP = /[‌ـً-ْٰ]/g
const PERSIAN_DIGIT = /[۰-۹٠-٩]/g

export function normalise(term: string, lang: SearchLang): string {
  if (lang === 'tr') return term.toLocaleLowerCase('tr').replace(/[ığşçöüâîû]/g, (c) => TURKISH_FOLD[c])
  if (lang === 'fa') {
    return term
      .replace(/[يىك]/g, (c) => PERSIAN_LETTERS[c])
      .replace(PERSIAN_DROP, '')
      .replace(PERSIAN_DIGIT, (d) => String((d.charCodeAt(0) - (d >= '۰' ? 0x06f0 : 0x0660))))
      .toLowerCase()
  }
  return term.toLowerCase()
}

/** The languages search covers, in the order a merged list breaks ties. */
export const SEARCH_LANGS: readonly SearchLang[] = ['en', 'tr', 'fa']

/* MiniSearch's own word boundaries: white space and punctuation. */
const SPACE_OR_PUNCTUATION = /[\n\r\p{Z}\p{P}]+/u
/* Where a Latin word meets an Arabic-script one, with or without the non-joiner between them. */
const SCRIPT_SEAM = /(?<=[A-Za-z0-9])\u200c?(?=[\u0600-\u06ff])|(?<=[\u0600-\u06ff])\u200c?(?=[A-Za-z0-9])/g

/**
 * Words, split also where a Latin word meets a Persian one: the Persian text writes an
 * English term with a Persian suffix (\`hyperparameter‌های\`, the term and the plural joined
 * by a non-joiner), and a reader searches for the term.
 *
 * A Persian word written with a non-joiner (\`محدودیت‌ها\`, a word and its plural) is kept
 * three ways: each part, and the whole (which \`normalise\` joins), because a reader types
 * it with the non-joiner, without it, or with a space. Both found by the index's own test.
 */
export function tokenize(text: string): string[] {
  return text
    .replace(SCRIPT_SEAM, ' ')
    .split(SPACE_OR_PUNCTUATION)
    .flatMap((w) => w.split(' '))
    .filter(Boolean)
    .flatMap((w) => (w.includes('\u200c') ? [...w.split('\u200c').filter(Boolean), w] : [w]))
}

/** The options the index is built with and read back with: both sides must agree. */
export function searchOptions(lang: SearchLang) {
  return {
    fields: ['title', 'section', 'text'],
    tokenize,
    storeFields: ['module', 'section', 'url', 'level', 'track', 'kind', 'ready', 'excerpt', 'lang'],
    processTerm: (term: string) => {
      const out = normalise(term, lang)
      return out.length < 2 ? null : out
    },
    searchOptions: { boost: { title: 4, section: 2 }, prefix: true, fuzzy: 0.15, combineWith: 'AND' as const },
  }
}
