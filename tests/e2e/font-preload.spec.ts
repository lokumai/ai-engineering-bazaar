import { expect, test } from '@playwright/test'

/**
 * M109, D132 — a page preloads only the faces it draws.
 *
 * `next/font` preloads the files of every face a route asks for, and Turbopack shares a font module
 * between routes that request it identically, carrying the other faces of the sharing route with it.
 * MEASURED on the build: the English home page preloaded Caveat (the About page's hand) and, once
 * `/fa/about/` existed, both Vazirmatn files. Nothing else notices, because the page still looks right.
 *
 * The rule, for any page that loads a downloaded face: every preloaded file is a face the browser
 * actually drew with. A file is matched to its `@font-face` rule by its content hash, and the rule to
 * the document's `FontFace` by family and unicode range; that face has to have LOADED once the page's
 * fonts are ready. Naming a family is not drawing with it: every Persian label (the language menu's
 * own "فارسی", closed) names Vazirmatn in its stack, which is why a check on computed `font-family`
 * passed with the leak in place (mutation-tested, M109).
 */

const PAGES = ['/', '/tr/', '/fa/', '/about/', '/tr/about/', '/fa/about/']

for (const route of PAGES) {
  test(`${route} preloads only the faces it draws`, async ({ page }) => {
    // The preloads are read from the document the server sent, not from the live DOM: once loaded, Next
    // prefetches the pages this one links to and adds THEIR font preloads, which are not this page's.
    const html = await (await page.request.get(route)).text()
    const sent = [...html.matchAll(/<link rel="preload" href="([^"]+)" as="font"/g)].map((m) => m[1])
    await page.goto(route)
    // A subset file loads only once a glyph in its range is laid out, which can be after `fonts.ready` first
    // settles: wait for the page's requests to finish before reading which faces loaded (flaked on `/tr/`).
    await page.waitForLoadState('networkidle')
    const { preloaded, unused } = await page.evaluate(async (sent) => {
      await document.fonts.ready
      const norm = (value: string) => value.replace(/["'\s]/g, '').toLowerCase()
      // A file is named by its content hash; the preload and the @font-face rule may spell the rest of
      // the name differently (a `-s` for a subset preloaded), so the hash is the key.
      const key = (url: string) => new URL(url, location.href).pathname.split('/').pop()!.split(/[-.]/)[0]
      const faces = new Map<string, string>()
      for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList
        try {
          rules = sheet.cssRules
        } catch {
          continue
        }
        for (const rule of Array.from(rules)) {
          if (!(rule instanceof CSSFontFaceRule)) continue
          const face = `${norm(rule.style.getPropertyValue('font-family'))}|${norm(rule.style.getPropertyValue('unicode-range') || 'U+0-10FFFF')}`
          for (const [, url] of rule.style.getPropertyValue('src').matchAll(/url\(["']?([^"')]+)["']?\)/g)) faces.set(key(url), face)
        }
      }
      const drawn = new Set(
        Array.from(document.fonts)
          .filter((font) => font.status === 'loaded')
          .map((font) => `${norm(font.family)}|${norm(font.unicodeRange)}`),
      )
      const hrefs = sent.map((href) => new URL(href, location.href).href)
      return {
        preloaded: hrefs.length,
        unused: hrefs.filter((href) => !drawn.has(faces.get(key(href)) ?? '')).map((href) => `${faces.get(key(href)) ?? '?'} ${href}`),
      }
    }, sent)
    expect(preloaded, 'every page listed here draws a downloaded face, so it preloads one').toBeGreaterThan(0)
    expect(unused, 'a preloaded font file the page never drew with').toEqual([])
  })
}
