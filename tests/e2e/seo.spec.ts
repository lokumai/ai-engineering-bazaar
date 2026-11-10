import { expect, test } from '@playwright/test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { TRANSLATED_LANGS, type ReadingLang } from '@/lib/content/languages'
import { SITE_ORIGIN } from '@/lib/site'
import { THEME_BOOT_SCRIPT } from '@/lib/theme'

/**
 * D119 — what a search engine reads off the export: the page's language, its
 * canonical, its language alternates, the sitemap and `robots.txt`.
 *
 * It reads `out/` and opens no page, like `bundle.spec.ts`: the `webServer` build is
 * what produced the files. Every claim is a rule for any content. The set of pages and
 * the languages each one exists in are MEASURED from the export (a page is a file, and
 * says `noindex` or does not), so the checks do not share a source with the code that
 * writes the alternates and the sitemap: a language version that exists and is not
 * named, or is named and does not exist, fails here whichever side is wrong.
 *
 * `SEO_OUT` points the spec at another export. It exists so each check can be shown
 * failing against a copy of `out/` with one thing broken; nothing else sets it.
 */

const OUT = process.env.SEO_OUT ?? join(process.cwd(), 'out')

const LANGS: readonly ReadingLang[] = ['en', ...TRANSLATED_LANGS]

interface Page {
  /** `/tr/courses/fundamentals/llms/`, from where the file is. */
  route: string
  html: string
  /** The language the address says it is in. */
  lang: ReadingLang
  /** The address with the language prefix taken off. */
  bare: string
  noindex: boolean
}

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '_next' ? [] : htmlFiles(full)
    return entry.name.endsWith('.html') ? [full] : []
  })
}

function languageOf(route: string): { lang: ReadingLang; bare: string } {
  for (const lang of TRANSLATED_LANGS) {
    if (route === `/${lang}/`) return { lang, bare: '/' }
    if (route.startsWith(`/${lang}/`)) return { lang, bare: route.slice(lang.length + 1) }
  }
  return { lang: 'en', bare: route }
}

const attr = (tag: string, name: string): string | undefined =>
  new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag)?.[1]

const head = (html: string) => html.split('</head>')[0]

const links = (html: string, rel: string): string[] =>
  (head(html).match(/<link\b[^>]*>/gi) ?? []).filter((tag) => attr(tag, 'rel') === rel)

/** Every page in the export. `404.html` and `404/index.html` are pages too: they say `noindex`. */
function readPages(): Page[] {
  return htmlFiles(OUT).map((file) => {
    const path = relative(OUT, file).split(sep).join('/')
    const route = path === 'index.html' ? '/' : path.endsWith('/index.html') ? `/${path.slice(0, -'index.html'.length)}` : `/${path}`
    const html = readFileSync(file, 'utf8')
    const robots = (head(html).match(/<meta\b[^>]*>/gi) ?? []).find((tag) => attr(tag, 'name') === 'robots')
    return { route, html, ...languageOf(route), noindex: /noindex/i.test(attr(robots ?? '', 'content') ?? '') }
  })
}

const pages = readPages()
const indexable = pages.filter((page) => !page.noindex)
const byRoute = new Map(indexable.map((page) => [page.route, page]))
const absolute = (route: string) => `${SITE_ORIGIN}${route}`

/** The language versions of `page` that exist in the export, English first. */
function siblings(page: Page): Map<string, string> {
  const found = new Map<string, string>()
  for (const lang of LANGS) {
    const route = lang === 'en' ? page.bare : `/${lang}${page.bare}`
    if (byRoute.has(route)) found.set(lang, absolute(route))
  }
  return found
}

/** What the page's own `<link rel="alternate" hreflang>` say, as `hreflang -> href`. */
function declared(page: Page): Map<string, string> {
  return new Map(
    links(page.html, 'alternate').flatMap((tag): [string, string][] => {
      const lang = attr(tag, 'hreflang')
      const url = attr(tag, 'href')
      return lang && url ? [[lang, url]] : []
    }),
  )
}

test('the export has pages to check, in every language, and some that forward', () => {
  expect(indexable.length, 'no indexable page was read').toBeGreaterThan(10)
  for (const lang of LANGS) {
    expect(indexable.some((page) => page.lang === lang), `no indexable ${lang} page`).toBe(true)
  }
  expect(pages.some((page) => page.noindex), 'nothing says noindex, so the exclusions are untested').toBe(true)
})

test('html[lang] is the language of the address, the layout is never mirrored, and the chrome says it is English', () => {
  for (const page of pages) {
    const tag = (name: string) => new RegExp(`<${name}\\b[^>]*>`, 'i').exec(page.html)?.[0] ?? ''
    const html = tag('html')
    expect(attr(html, 'lang'), `${page.route}: <html lang>`).toBe(page.lang)
    expect(attr(html, 'dir'), `${page.route}: <html dir>`).toBeUndefined()
    // One root layout: the interface is English on every page (D113), and says so itself.
    for (const name of ['header', 'main', 'footer']) {
      expect(attr(tag(name), 'lang'), `${page.route}: <${name} lang>`).toBe('en')
      expect(attr(tag(name), 'dir'), `${page.route}: <${name} dir>`).toBeUndefined()
    }
    expect(attr(tag('body'), 'lang'), `${page.route}: <body lang>`).toBeUndefined()
    expect(attr(tag('body'), 'dir'), `${page.route}: <body dir>`).toBeUndefined()
  }
})

test('every page, in every language, carries the theme and record boot scripts', () => {
  const inline = (html: string) =>
    [...head(html).matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((one) => one[1])
  const home = pages.find((page) => page.route === '/')!
  const expected = inline(home.html).filter((body) => body !== THEME_BOOT_SCRIPT)
  expect(inline(home.html), 'the home page lost the theme boot script').toContain(THEME_BOOT_SCRIPT)
  expect(expected.length, 'the home page has no record boot script').toBeGreaterThan(0)
  for (const page of pages) {
    const scripts = inline(page.html)
    expect(scripts, `${page.route}: theme boot script`).toContain(THEME_BOOT_SCRIPT)
    for (const body of expected) expect(scripts, `${page.route}: a boot script is missing`).toContain(body)
  }
})

test('every indexable page names itself as canonical, with an absolute URL', () => {
  for (const page of indexable) {
    const canonical = links(page.html, 'canonical')
    expect(canonical.length, `${page.route}: canonical links`).toBe(1)
    expect(attr(canonical[0], 'href'), page.route).toBe(absolute(page.route))
  }
})

test('every page with a translation names all its versions and x-default, and a page with one says nothing', () => {
  for (const page of indexable) {
    const versions = siblings(page)
    const alternates = declared(page)
    if (versions.size < 2) {
      expect(alternates.size, `${page.route} has no other language but declares alternates`).toBe(0)
      continue
    }
    const expected = new Map([...versions, ['x-default', versions.get('en')!]])
    expect(Object.fromEntries(alternates), page.route).toEqual(Object.fromEntries(expected))
  }
})

test('every hreflang in the export is absolute and resolves to an indexable page that names it back', () => {
  let checked = 0
  for (const page of indexable) {
    const mine = absolute(page.route)
    for (const [lang, url] of declared(page)) {
      checked += 1
      expect(url, `${page.route}: hreflang ${lang}`).toMatch(new RegExp(`^${SITE_ORIGIN}/`))
      const target = byRoute.get(url.slice(SITE_ORIGIN.length))
      expect(target, `${page.route}: hreflang ${lang} points at ${url}, which is no indexable page`).toBeDefined()
      expect([...declared(target!).values()], `${url} does not name ${mine} back`).toContain(mine)
    }
  }
  expect(checked, 'no alternate was checked').toBeGreaterThan(0)
})

test('the translated home pages have a title of their own', () => {
  const english = /<title>([^<]*)<\/title>/.exec(pages.find((page) => page.route === '/')!.html)?.[1]
  for (const lang of TRANSLATED_LANGS) {
    const home = pages.find((page) => page.route === `/${lang}/`)
    expect(home, `no /${lang}/ page`).toBeDefined()
    const title = /<title>([^<]*)<\/title>/.exec(home!.html)?.[1]
    expect(title, `/${lang}/ is titled like /`).not.toBe(english)
  }
})

test('no page that says noindex is in the sitemap or in any hreflang list', () => {
  const excluded = new Set(pages.filter((page) => page.noindex).map((page) => absolute(page.route)))
  expect(excluded.size, 'nothing says noindex').toBeGreaterThan(0)
  for (const entry of sitemap()) {
    expect(excluded.has(entry.loc), `${entry.loc} says noindex and is in the sitemap`).toBe(false)
    for (const url of entry.alternates.values()) expect(excluded.has(url), `${entry.loc}: sitemap alternate ${url} says noindex`).toBe(false)
  }
  for (const page of pages) {
    for (const [lang, url] of declared(page)) expect(excluded.has(url), `${page.route}: hreflang ${lang} points at ${url}, which says noindex`).toBe(false)
  }
})

function sitemap() {
  const xml = readFileSync(join(OUT, 'sitemap.xml'), 'utf8')
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((one) => ({
    loc: /<loc>([^<]*)<\/loc>/.exec(one[1])![1],
    alternates: new Map(
      [...one[1].matchAll(/<xhtml:link\b[^>]*>/g)].flatMap((tag): [string, string][] => {
        const lang = attr(tag[0], 'hreflang')
        const url = attr(tag[0], 'href')
        return lang && url ? [[lang, url]] : []
      }),
    ),
  }))
}

test('the sitemap lists exactly the indexable pages, once, and every one resolves', () => {
  const entries = sitemap()
  const listed = entries.map((entry) => entry.loc)
  expect(new Set(listed).size, 'a URL is listed twice').toBe(listed.length)
  expect(listed.sort()).toEqual(indexable.map((page) => absolute(page.route)).sort())
  for (const url of listed) {
    expect(url).toMatch(new RegExp(`^${SITE_ORIGIN}/`))
    expect(byRoute.has(url.slice(SITE_ORIGIN.length)), `${url} is in the sitemap and is no indexable page`).toBe(true)
  }
  for (const page of pages.filter((one) => one.noindex)) {
    expect(listed, `${page.route} says noindex and is in the sitemap`).not.toContain(absolute(page.route))
  }
  expect(listed.filter((url) => url.includes('/api/')), 'the API is in the sitemap').toEqual([])
})

test('each sitemap entry carries the same alternates as its page', () => {
  for (const entry of sitemap()) {
    const page = byRoute.get(entry.loc.slice(SITE_ORIGIN.length))!
    expect(Object.fromEntries(entry.alternates), entry.loc).toEqual(Object.fromEntries(declared(page)))
  }
})

test('robots.txt allows everything and points at a sitemap that exists', () => {
  const robots = readFileSync(join(OUT, 'robots.txt'), 'utf8')
  expect(robots).toMatch(/^User-Agent: \*$/im)
  expect(robots).toMatch(/^Allow: \/$/m)
  expect(robots, 'a Disallow would shut part of the site').not.toMatch(/^Disallow: ./m)
  const pointer = /^Sitemap: (\S+)$/m.exec(robots)?.[1]
  expect(pointer, 'robots.txt names no sitemap').toBeDefined()
  expect(pointer).toMatch(new RegExp(`^${SITE_ORIGIN}/`))
  expect(existsSync(join(OUT, pointer!.slice(SITE_ORIGIN.length))), `${pointer} is not in the export`).toBe(true)
})
