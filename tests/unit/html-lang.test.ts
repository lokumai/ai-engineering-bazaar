import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TRANSLATED_LANGS, languageOfPath } from '@/lib/content/languages'
import { recordBootScript } from '@/lib/record/boot'
import { setHtmlLang } from '../../scripts/lib/html-lang.mjs'

/**
 * D119 — `<html lang>` has three writers, and they must give one answer: the finaliser in
 * the exported HTML, the pre-paint script on every load and `languageOfPath` after a client
 * navigation. Every claim is a rule over the registry; no language is typed in.
 */

/** The addresses a reader can be at, one family per language in the registry plus English. */
const PATHS = [
  '/',
  '/sheets/',
  '/courses/fundamentals/llms/',
  '/everyone/sheets/',
  ...TRANSLATED_LANGS.flatMap((lang) => [`/${lang}/`, `/${lang}/courses/fundamentals/llms/`, `/${lang}/everyone/courses/fundamentals/llms/`]),
]

/** Runs the boot script as a browser would, at `pathname`, and returns what it set on `<html>`. */
function bootLang(pathname: string, basePath = ''): string | undefined {
  const attributes = new Map<string, string>()
  const documentElement = {
    classList: { add: () => {} },
    setAttribute: (name: string, value: string) => { attributes.set(name, value) },
    style: { setProperty: () => {}, removeProperty: () => {} },
  }
  const window = {
    location: { pathname: `${basePath}${pathname}` },
    localStorage: { getItem: () => null },
    sessionStorage: { getItem: () => null },
  }
  new Function('window', 'document', recordBootScript({}, {}, basePath))(window, { documentElement })
  return attributes.get('lang')
}

describe('the address decides the language', () => {
  it('is the translation whose segment opens the address, and English otherwise', () => {
    for (const lang of TRANSLATED_LANGS) {
      expect(languageOfPath(`/${lang}/`)).toBe(lang)
      expect(languageOfPath(`/${lang}/courses/x/y/`)).toBe(lang)
    }
    expect(languageOfPath('/')).toBe('en')
    expect(languageOfPath('/sheets/')).toBe('en')
    // a segment that only starts with a language code is not that language
    expect(languageOfPath(`/${TRANSLATED_LANGS[0]}x/`)).toBe('en')
    // and a language code deeper in the path is not either
    expect(languageOfPath(`/courses/${TRANSLATED_LANGS[0]}/`)).toBe('en')
  })

  it('is the same answer in the boot script as in languageOfPath, with and without a base path', () => {
    for (const path of PATHS) {
      expect(bootLang(path), path).toBe(languageOfPath(path))
      expect(bootLang(path, '/some-base'), `/some-base${path}`).toBe(languageOfPath(path))
    }
  })
})

describe('the finaliser sets the language of the exported pages', () => {
  const page = (lang: string) => `<!DOCTYPE html><html lang="${lang}"><head><title>x</title></head><body></body></html>`
  const make = (pages: Record<string, string>) => {
    const dir = mkdtempSync(join(tmpdir(), 'html-lang-'))
    for (const [path, html] of Object.entries(pages)) {
      mkdirSync(join(dir, path, '..'), { recursive: true })
      writeFileSync(join(dir, path), html)
    }
    return dir
  }

  it('rewrites every page under a translation to that language and leaves every other page alone', () => {
    const pages: Record<string, string> = { 'index.html': page('en'), 'sheets/index.html': page('en'), '404.html': page('en') }
    for (const lang of TRANSLATED_LANGS) {
      pages[`${lang}/index.html`] = page('en')
      pages[`${lang}/courses/a/b/index.html`] = page('en')
    }
    const dir = make(pages)
    const counts = setHtmlLang(dir, TRANSLATED_LANGS)
    for (const lang of TRANSLATED_LANGS) {
      expect(counts[lang]).toBe(2)
      expect(readFileSync(join(dir, lang, 'index.html'), 'utf8')).toBe(page(lang))
      expect(readFileSync(join(dir, lang, 'courses/a/b/index.html'), 'utf8')).toBe(page(lang))
    }
    for (const path of ['index.html', 'sheets/index.html', '404.html']) expect(readFileSync(join(dir, path), 'utf8'), path).toBe(page('en'))
  })

  it('adds no direction and changes nothing but the attribute', () => {
    const dir = make({ [`${TRANSLATED_LANGS[0]}/index.html`]: page('en') })
    setHtmlLang(dir, TRANSLATED_LANGS)
    const html = readFileSync(join(dir, TRANSLATED_LANGS[0], 'index.html'), 'utf8')
    expect(html).not.toContain('dir=')
    expect(html.replace(`lang="${TRANSLATED_LANGS[0]}"`, 'lang="en"')).toBe(page('en'))
  })

  it('refuses a page that does not open on the English attribute, rather than skip it', () => {
    const dir = make({ [`${TRANSLATED_LANGS[0]}/index.html`]: '<!DOCTYPE html><html><head></head></html>' })
    expect(() => setHtmlLang(dir, TRANSLATED_LANGS)).toThrow(/does not open on/)
  })
})
