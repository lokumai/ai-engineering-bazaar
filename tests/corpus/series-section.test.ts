import { describe, expect, it } from 'vitest'
import { imageBaseFor } from '@/lib/content/images'
import { SERIES_HEADINGS, unfenced } from '@/lib/content/lines'
import { loadAllModules } from '@/lib/content/loader'
import { renderMarkdown } from '@/lib/content/render'

/**
 * The series map stays in the markdown and leaves the site (`SERIES_HEADINGS`
 * carries the author's words and the reason).
 *
 * Two rules, and both hold for any content — neither names a module, counts
 * one, or says which modules have the section:
 *
 * 1. **Every translation names the section in a way the list knows.** A module
 *    whose English carries the map and whose Turkish does not — by the list's
 *    reckoning — is a translation that renamed the heading, and on the site
 *    that is the map silently surviving on every Turkish page. The failure M19
 *    met twice, with the quick check and the summary, and could not see.
 * 2. **Exactly one section leaves each page.** The rendered page has one `h2`
 *    fewer than its file: zero fewer means the section stayed, two fewer means
 *    the removal ran on into the next section and took it too.
 */

/** An h2, and only an h2, outside a fence — `topics.ts`'s own reading. */
const H2 = /^##[ \t]+(.+?)[ \t]*$/

function headings(markdown: string): string[] {
  return unfenced(markdown)
    .map((line) => H2.exec(line)?.[1]?.trim())
    .filter((text): text is string => text !== undefined)
}

const hasSeries = (markdown: string) =>
  headings(markdown).some((text) => SERIES_HEADINGS.includes(text))

const modules = loadAllModules()

/** Every body the site renders, English and Turkish, as one list. */
const bodies = modules.flatMap((module) => [
  { slug: module.slug, lang: 'en', body: module.body, module },
  ...(module.translation === null
    ? []
    : [{ slug: module.slug, lang: 'tr', body: module.translation, module }]),
])

describe('the series map', () => {
  it('is named in a way the list knows, in both languages', () => {
    const translated = modules.filter((module) => module.translation !== null)
    // Non-vacuity: with no module carrying the map, the comparison below is
    // over nothing and passes.
    expect(translated.filter((module) => hasSeries(module.body)).length).toBeGreaterThan(0)

    const disagree = translated
      .filter((module) => hasSeries(module.body) !== hasSeries(module.translation!))
      .map((module) => module.slug)
    expect(disagree, 'a translation names the series map in a way the list does not know')
      .toEqual([])
  })

  it('leaves the page, and takes nothing with it', async () => {
    const carrying = bodies.filter((one) => hasSeries(one.body))
    expect(carrying.length).toBeGreaterThan(0)

    for (const one of carrying) {
      const { html, toc } = await renderMarkdown(one.body, {
        imageBase: imageBaseFor(one.module.category.slug),
        sheet: one.module.frontmatter.module,
      })
      const where = `${one.slug} (${one.lang})`

      expect((html.match(/<h2[\s>]/g) ?? []).length, where).toBe(headings(one.body).length - 1)
      expect(toc.filter((entry) => SERIES_HEADINGS.includes(entry.text)), where).toEqual([])
    }
  })
})
