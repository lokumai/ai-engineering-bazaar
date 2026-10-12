/**
 * M28 — the languages a module can be READ in besides English, named once.
 *
 * M19 built the second language as Turkish, and Turkish was spelled inline in
 * eleven places: the sibling's suffix, the route segment, the menu's two
 * entries, the quiz schema, the `lang` attributes. Persian is the third
 * language, and a third copy of each of those is how one of them ends up
 * pointing at a file that is not there. So the list lives here, and everything
 * that used to say `'tr'` asks it.
 *
 * Plain data with no `node:` import, because the bar's language menu is a
 * client component and reads it too.
 *
 * ## Why the two entries differ in more than their names
 *
 * - **`dir`.** Persian is the first right-to-left language in the course. The
 *   direction goes on exactly the elements that hold Persian, the same ones that
 *   carry the `lang` attribute, because the page around them (the bar, the
 *   rails, the objectives card) is still English and still left-to-right.
 * - **`required`.** `curriculum-file.ts` rule 7 makes every module carry a
 *   `_tr.md` sibling, stub or not, because each module was translated into
 *   Turkish once its English was final. Persian arrived after nineteen modules
 *   were written and fourteen were not, so a `_fa.md` exists only where there is
 *   a real translation, and a missing one is the honest absence and not a
 *   forgotten file.
 */
export type TranslatedLang = 'tr' | 'fa'

/** The language a module page is read in: English, or one of the translations. */
export type ReadingLang = 'en' | TranslatedLang

export interface Translation {
  id: TranslatedLang
  /** The language's name in itself, as the menu prints it. */
  label: string
  dir: 'ltr' | 'rtl'
  /** Whether every module must carry this sibling (rule 7), stub or not. */
  required: boolean
}

export const TRANSLATIONS: readonly Translation[] = [
  { id: 'tr', label: 'Türkçe', dir: 'ltr', required: true },
  { id: 'fa', label: 'فارسی', dir: 'rtl', required: false },
]

export const TRANSLATED_LANGS: readonly TranslatedLang[] = TRANSLATIONS.map((one) => one.id)

/** `llms.md` → `llms_fa.md`: the one spelling of a sibling's file name. */
export function siblingSuffix(lang: TranslatedLang): string {
  return `_${lang}.md`
}

/**
 * The `dir` attribute an element holding `lang` text takes: `rtl` for a
 * right-to-left language and nothing otherwise, because an attribute restating
 * the document's own direction is noise (the same reason `lang` is omitted on
 * the English tree).
 */
export function dirOf(lang: ReadingLang | undefined): 'rtl' | undefined {
  return TRANSLATIONS.find((one) => one.id === lang)?.dir === 'rtl' ? 'rtl' : undefined
}

/** The `lang` attribute for content in `lang`: nothing on the English tree. */
export function langAttr(lang: ReadingLang): TranslatedLang | undefined {
  return lang === 'en' ? undefined : lang
}
