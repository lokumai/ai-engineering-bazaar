/**
 * D119 — which pages the site has, in which languages, for a search engine.
 *
 * Three readers ask the same question: a page's `<link rel="alternate" hreflang>`
 * (`sheetMetadata`, `homeMetadata`), the sitemap (`app/sitemap.ts`) and the tests that
 * hold both to `out/`. So the answer is computed once, here, from the content, and
 * nothing in this file names a module or counts one.
 *
 * ## One rule decides "this page exists in that language"
 *
 * `loadModuleIn(slug, lang, track)`, the function the route itself renders from. It
 * returns nothing for a module with no usable `_fa.md`, and for a For Everyone page
 * that is not written, and those are exactly the pages a route prerenders as a 404 or
 * as `NotWritten` with `noindex`. A list written beside it (`if (lang === 'fa') …`)
 * would drift from the route the day a module gains a translation; this cannot,
 * because it is the route's own test.
 *
 * ## What is not here, on purpose
 *
 * Forwards (`moved.ts`, the `/courses/<level>/` stubs), the unwritten For Everyone
 * pages and the 404 carry `noindex` and are in no list. The catalog, the level pages
 * and the handful of single pages are listed by route, not by content, because a route
 * is not content: a page added without being added here is caught by
 * `tests/e2e/seo.spec.ts`, which compares this list with every page `out/` holds that
 * does not say `noindex`.
 *
 * Reaches `node:fs` through the loader: server components and `app/*.ts` only.
 */
import type { Metadata } from 'next'
import { CATEGORIES } from './curriculum-file'
import { loadAllModules, loadModuleIn } from './loader'
import { type ReadingLang, TRANSLATED_LANGS, homeRoute } from './languages'
import { type Track, TRACK_IDS, catalogRoute, moduleRoute } from '../tracks'
import { absoluteUrl } from '../site'
import { href } from '../url'

/** A page's address in each language it exists in. English is always one of them. */
export type LanguageRoutes = Partial<Record<ReadingLang, string>>

const ALL_LANGS: readonly ReadingLang[] = ['en', ...TRANSLATED_LANGS]

/** Where a module's page in `track` exists, by language. */
export function moduleLanguageRoutes(slug: string, track: Track): LanguageRoutes {
  return Object.fromEntries(
    ALL_LANGS.filter((lang) => loadModuleIn(slug, lang, track) !== undefined).map((lang) => [
      lang,
      moduleRoute(slug, track, lang),
    ]),
  )
}

/** The front door's three addresses: the one page translated whole. */
export function homeLanguageRoutes(): LanguageRoutes {
  return Object.fromEntries(ALL_LANGS.map((lang) => [lang, homeRoute(lang)]))
}

/**
 * `alternates` for a page read in `lang`: the page's own `canonical`, and, where it
 * exists in more than one language, `hreflang` for each and `x-default` (the English
 * one, what a reader with no preference is sent to). Every address goes through
 * `href()` because Next applies `basePath` to links and not to a string in
 * `alternates`; `metadataBase` (`shellMetadata`) then makes each one absolute.
 *
 * Emitted on every version and naming every version: an alternate declared in one
 * direction only is the half a crawler ignores.
 */
export function alternatesOf(routes: LanguageRoutes, lang: ReadingLang): NonNullable<Metadata['alternates']> {
  const self = routes[lang]
  if (self === undefined) throw new Error(`no ${lang} version in ${JSON.stringify(routes)}`)
  const present = ALL_LANGS.filter((one) => routes[one] !== undefined)
  if (present.length < 2) return { canonical: href(self) }
  return {
    canonical: href(self),
    languages: {
      ...Object.fromEntries(present.map((one) => [one, href(routes[one]!)])),
      ...(routes.en === undefined ? {} : { 'x-default': href(routes.en) }),
    },
  }
}

/** The metadata `alternates` of a page that has one address and says so. */
export function canonicalOf(route: string): NonNullable<Metadata['alternates']> {
  return { canonical: href(route) }
}

export interface IndexablePage {
  lang: ReadingLang
  /** App-relative, with the trailing slash. */
  route: string
  /** Every language version of this page, this one included. */
  languages: LanguageRoutes
}

/** The pages with one address. They are routes, not content (see the header). */
const SINGLE_PAGES: readonly string[] = ['/about/', '/caravan/', '/legend/', '/profile/']

/** Every page a search engine should index, once per language it is written in. */
export function indexablePages(): IndexablePage[] {
  const pages: IndexablePage[] = []
  const add = (languages: LanguageRoutes) => {
    for (const lang of ALL_LANGS) {
      const route = languages[lang]
      if (route !== undefined) pages.push({ lang, route, languages })
    }
  }

  add(homeLanguageRoutes())
  for (const route of SINGLE_PAGES) add({ en: route })
  for (const track of TRACK_IDS) {
    add({ en: catalogRoute(track) })
    for (const category of CATEGORIES) add({ en: catalogRoute(track, category.slug) })
  }
  for (const sheet of loadAllModules()) {
    for (const track of TRACK_IDS) add(moduleLanguageRoutes(sheet.slug, track))
  }
  return pages
}

/** The sitemap's `<loc>` and its alternates for one page. */
export function sitemapEntry(page: IndexablePage): {
  url: string
  alternates?: { languages: Record<string, string> }
} {
  const url = absoluteUrl(page.route)
  const present = ALL_LANGS.filter((one) => page.languages[one] !== undefined)
  if (present.length < 2) return { url }
  return {
    url,
    alternates: {
      languages: {
        ...Object.fromEntries(present.map((one) => [one, absoluteUrl(page.languages[one]!)])),
        ...(page.languages.en === undefined ? {} : { 'x-default': absoluteUrl(page.languages.en) }),
      },
    },
  }
}
