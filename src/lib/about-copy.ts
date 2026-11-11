/**
 * M109, D132 — the About page's own name, per language.
 *
 * On the English page the h1 is the crumb's label (`ABOUT_TITLE`, chrome, and chrome stays
 * English). On a translated page the h1 is content, so it takes the page's name in that language
 * from this row, the way `home-copy.ts` holds the home page's headline. It is the one string the
 * story files do not carry: STORY.md's `#` title is "Our Story", a different thing from the page's
 * name. The names are the conventional page names of each language's sites (`Hakkımızda`, `درباره‌ی ما`), not a literal "About the Bazaar" (the author's rule for every translation).
 *
 * Plain data with no `node:` import, so a component may read it.
 */
import type { ReadingLang } from '@/lib/content/languages'
import { ABOUT_TITLE } from '@/lib/route-labels'

export const ABOUT_TITLES: Readonly<Record<ReadingLang, string>> = {
  en: ABOUT_TITLE,
  tr: 'Hakkımızda',
  fa: 'درباره‌ی ما',
}

/** The About page's address in `lang`: `/about/`, `/tr/about/`, `/fa/about/`. */
export function aboutRoute(lang: ReadingLang): string {
  return lang === 'en' ? '/about/' : `/${lang}/about/`
}
