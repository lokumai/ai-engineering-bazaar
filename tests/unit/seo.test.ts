import { describe, expect, it } from 'vitest'
import { homeMetadata } from '@/components/home/HomeStreet'
import { sheetMetadata } from '@/components/sheet/ModuleSheet'
import { movedMetadata } from '@/components/shell/Moved'
import { metadata as caravanMetadata } from '@/app/caravan/page'
import { metadata as profileMetadata } from '@/app/profile/page'
import { TRANSLATED_LANGS, type ReadingLang } from '@/lib/content/languages'
import { loadAllModules, loadModuleIn } from '@/lib/content/loader'
import { showsSample } from '@/lib/content/caravan'
import { MOVED_LEVELS, MOVED_MODULES } from '@/lib/content/moved'
import {
  alternatesOf,
  canonicalOf,
  indexablePages,
  isIndexableModule,
  moduleLanguageRoutes,
  sitemapEntry,
} from '@/lib/content/seo'
import { HOME_COPY } from '@/lib/home-copy'
import { SITE_NAME, SITE_ORIGIN, absoluteUrl } from '@/lib/site'
import { TRACK_IDS } from '@/lib/tracks'

/**
 * D119 — the language alternates, the sitemap's page list and the site's one address.
 *
 * Every claim is a rule for any content: the lists are walked and compared with the
 * loader's own answer, and no module, language count or address of a module is typed
 * in. The built pages are held to the same rules in `tests/e2e/seo.spec.ts`, which
 * reads `out/`.
 */

describe('alternatesOf', () => {
  it('names every version, x-default is the English one, and canonical is the page itself', () => {
    const routes = { en: '/a/', tr: '/tr/a/', fa: '/fa/a/' }
    for (const lang of ['en', 'tr', 'fa'] as ReadingLang[]) {
      const alternates = alternatesOf(routes, lang)
      expect(alternates.canonical).toBe(routes[lang])
      expect(alternates.languages).toEqual({ ...routes, 'x-default': '/a/' })
    }
  })

  it('names only the versions that exist', () => {
    const alternates = alternatesOf({ en: '/a/', tr: '/tr/a/' }, 'tr')
    expect(Object.keys(alternates.languages ?? {}).sort()).toEqual(['en', 'tr', 'x-default'])
  })

  it('says only where a one-language page is, with no hreflang to nothing', () => {
    expect(alternatesOf({ en: '/a/' }, 'en')).toEqual({ canonical: '/a/' })
    expect(canonicalOf('/a/')).toEqual({ canonical: '/a/' })
  })

  it('refuses to describe a version the page does not have', () => {
    expect(() => alternatesOf({ en: '/a/' }, 'fa')).toThrow()
  })
})

describe('the languages a module page exists in', () => {
  it('are exactly the written pages the loader serves, in both tracks', () => {
    const modules = loadAllModules()
    expect(modules.length, 'the corpus is empty, so every check below is vacuous').toBeGreaterThan(0)
    for (const sheet of modules) {
      for (const track of TRACK_IDS) {
        const routes = moduleLanguageRoutes(sheet.slug, track)
        for (const lang of ['en', ...TRANSLATED_LANGS] as ReadingLang[]) {
          expect(
            routes[lang] !== undefined,
            `${sheet.slug} (${track}) in ${lang}: the list and the loader disagree`,
          ).toBe(isIndexableModule(loadModuleIn(sheet.slug, lang, track)))
        }
      }
    }
  })

  it('include a translated page at the language prefix, and none where nothing is translated', () => {
    const translated = loadAllModules().filter((sheet) => TRANSLATED_LANGS.some((lang) => sheet.translations[lang] !== null))
    expect(translated.length, 'no module has a translation, so the prefix is never checked').toBeGreaterThan(0)
    for (const sheet of translated) {
      const routes = moduleLanguageRoutes(sheet.slug, 'engineers')
      for (const lang of TRANSLATED_LANGS) {
        if (routes[lang] !== undefined) expect(routes[lang]).toMatch(new RegExp(`^/${lang}/`))
      }
    }
  })
})

describe('the indexable pages', () => {
  const pages = indexablePages()

  it('are listed once each, every one of them with a trailing slash', () => {
    expect(pages.length).toBeGreaterThan(10)
    expect(new Set(pages.map((page) => page.route)).size).toBe(pages.length)
    for (const page of pages) expect(page.route).toMatch(/^\/.*\/$|^\/$/)
  })

  it('know their own address among their language versions, and always an English one', () => {
    for (const page of pages) {
      expect(page.languages[page.lang], page.route).toBe(page.route)
      expect(page.languages.en, `${page.route} has no English version to be x-default`).toBeDefined()
    }
  })

  it('never list a forward the curriculum retired', () => {
    const retired = [
      ...Object.keys(MOVED_MODULES).flatMap((key) => [`/courses/${key}/`, `/everyone/courses/${key}/`]),
      ...Object.keys(MOVED_LEVELS).flatMap((level) => [`/sheets/${level}/`, `/everyone/sheets/${level}/`]),
    ]
    expect(retired.length).toBeGreaterThan(0)
    const listed = new Set(pages.map((page) => page.route))
    for (const route of retired) expect(listed.has(route), `${route} is a forward and is indexable`).toBe(false)
  })

  it('never list the API, the 404 or a page that forwards', () => {
    for (const page of pages) {
      expect(page.route).not.toMatch(/^\/(api|404|_not-found)\b/)
      expect(page.route).not.toBe('/courses/')
    }
  })

  it('give each page a sitemap entry in absolute URLs, with alternates only where there are some', () => {
    for (const page of pages) {
      const entry = sitemapEntry(page)
      expect(entry.url).toBe(`${SITE_ORIGIN}${page.route}`)
      const languages = entry.alternates?.languages
      if (Object.keys(page.languages).length < 2) {
        expect(languages, page.route).toBeUndefined()
        continue
      }
      expect(languages?.['x-default'], page.route).toBe(absoluteUrl(page.languages.en!))
      for (const url of Object.values(languages ?? {})) expect(url).toMatch(/^https:\/\//)
      expect(Object.values(languages ?? {})).toContain(entry.url)
    }
  })
})

describe('the site address', () => {
  it('is one https origin with no trailing slash, and every absolute URL starts with it', () => {
    expect(SITE_ORIGIN).toMatch(/^https:\/\/[^/]+$/)
    expect(absoluteUrl('/a/')).toBe(`${SITE_ORIGIN}/a/`)
  })
})

describe('what is kept out of search (D120)', () => {
  const listed = new Set(indexablePages().map((page) => page.route))
  const robotsOf = async (slug: string, lang: ReadingLang, track: 'engineers' | 'everyone') => {
    const [category, module] = slug.split('/')
    return (await sheetMetadata(Promise.resolve({ category, module }), lang, track)).robots
  }

  it('keeps every planned (draft) module out of the sitemap and marks its page noindex', async () => {
    const drafts = loadAllModules().filter((sheet) => sheet.frontmatter.status === 'draft')
    expect(drafts.length, 'no draft module, so the rule is untested').toBeGreaterThan(0)
    for (const sheet of drafts) {
      expect(listed.has(`/courses/${sheet.slug}/`), `${sheet.slug} is a draft and is in the sitemap`).toBe(false)
      expect(await robotsOf(sheet.slug, 'en', 'engineers'), sheet.slug).toMatchObject({ index: false })
    }
  })

  it('marks no written module noindex, and lists it', async () => {
    const written = loadAllModules().filter((sheet) => sheet.frontmatter.status !== 'draft')
    expect(written.length).toBeGreaterThan(0)
    for (const sheet of written) {
      expect(listed.has(`/courses/${sheet.slug}/`), sheet.slug).toBe(true)
      expect(await robotsOf(sheet.slug, 'en', 'engineers'), sheet.slug).toBeUndefined()
    }
  })

  it('marks every unwritten For Everyone page noindex, and lists none', async () => {
    const unwritten = loadAllModules().filter((sheet) => sheet.everyone === null)
    expect(unwritten.length).toBeGreaterThan(0)
    for (const sheet of unwritten) {
      expect(listed.has(`/everyone/courses/${sheet.slug}/`), sheet.slug).toBe(false)
      expect(await robotsOf(sheet.slug, 'en', 'everyone'), sheet.slug).toMatchObject({ index: false })
    }
  })

  it('lists no page whose own metadata says noindex: the profile, and the caravan while it draws its sample', () => {
    expect(profileMetadata.robots).toMatchObject({ index: false })
    expect(listed.has('/profile/')).toBe(false)
    const sample = caravanMetadata.robots !== undefined
    expect(listed.has('/caravan/'), 'the caravan is listed exactly when it is not the sample').toBe(!sample)
  })

  it('calls the caravan a sample exactly when no trend is written', () => {
    expect(showsSample({ trends: [] } as never)).toBe(true)
    expect(showsSample({ trends: [{}] } as never)).toBe(false)
  })

  it('lists the About and Legend pages', () => {
    expect(listed.has('/about/')).toBe(true)
    expect(listed.has('/legend/')).toBe(true)
  })

  it('has a forward name its destination as canonical, and stay noindex', () => {
    const forward = movedMetadata('A', '/somewhere/')
    expect(forward.robots).toMatchObject({ index: false })
    expect(forward.alternates?.canonical).toBe('/somewhere/')
  })
})

describe('the home page head', () => {
  it('says each translation in its own words and keeps the site name', () => {
    const english = homeMetadata('en').title
    for (const lang of TRANSLATED_LANGS) {
      const title = homeMetadata(lang).title
      expect(title).not.toEqual(english)
      const absolute = (title as { absolute: string }).absolute
      expect(absolute).toContain(HOME_COPY[lang].hero.first)
      expect(absolute).toContain(SITE_NAME)
    }
  })

  it('names all three addresses and is the canonical of each', () => {
    for (const lang of ['en', ...TRANSLATED_LANGS] as ReadingLang[]) {
      const { alternates } = homeMetadata(lang)
      expect(Object.keys(alternates?.languages ?? {}).sort()).toEqual(['en', 'fa', 'tr', 'x-default'])
      expect(alternates?.canonical).toBe(alternates?.languages?.[lang])
    }
  })
})
