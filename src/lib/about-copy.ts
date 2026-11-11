/**
 * M109, D132 — the About page's own name, per language.
 *
 * On the English page the h1 is the crumb's label (`ABOUT_TITLE`, chrome, and chrome stays
 * English). On a translated page the h1 is content, so it takes the page's name in that language
 * from this row, the way `home-copy.ts` holds the home page's headline. It is the one string the
 * story files do not carry: STORY.md's `#` title is "Our Story", a different thing from the page's
 * name. The names say what the English one says, the page about the Bazaar (`Pazar Hakkında`,
 * `درباره‌ی بازار`); `Hakkımızda` ("about us") was tried and the author rejected it, because it changes
 * what the page is about (M114).
 *
 * Plain data with no `node:` import, so a component may read it.
 */
import type { ReadingLang } from '@/lib/content/languages'
import { ABOUT_TITLE } from '@/lib/route-labels'

export const ABOUT_TITLES: Readonly<Record<ReadingLang, string>> = {
  en: ABOUT_TITLE,
  tr: 'Pazar Hakkında',
  fa: 'درباره‌ی بازار',
}

/** The About page's address in `lang`: `/about/`, `/tr/about/`, `/fa/about/`. */
export function aboutRoute(lang: ReadingLang): string {
  return lang === 'en' ? '/about/' : `/${lang}/about/`
}
