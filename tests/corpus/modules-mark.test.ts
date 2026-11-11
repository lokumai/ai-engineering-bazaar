import { describe, expect, it } from 'vitest'
import { imageBaseFor } from '@/lib/content/images'
import { TRANSLATED_LANGS, type ReadingLang } from '@/lib/content/languages'
import { loadAllModules, loadModuleIn } from '@/lib/content/loader'
import { renderTree } from '@/lib/content/render'
import { TRACK_IDS } from '@/lib/tracks'

/**
 * D135: the References' Modules subsection is headed by the LokumAI mark on the
 * site and by the corpus' own 🧭 everywhere else.
 *
 * A rule over any content: in the HTML of every module in every language, a
 * subsection whose markdown heading starts with 🧭 draws the mark and no 🧭;
 * the other subsections keep their emoji; and the tree the bundle is built from
 * still carries the 🧭, so the published content does not change. It names no
 * module, count or title.
 */

const H3 = /<h3\b[^>]*>([\s\S]*?)<\/h3>/g

const headings = (html: string) => [...html.matchAll(H3)].map((m) => m[1])

describe('the Modules subsection heading', () => {
  it('shows the LokumAI mark and no compass in the HTML, in every language', async () => {
    const langs: ReadingLang[] = ['en', ...TRANSLATED_LANGS]
    let seen = 0
    for (const module of loadAllModules()) {
      for (const lang of langs) for (const track of TRACK_IDS) {
        const sheet = loadModuleIn(module.slug, lang, track)
        if (!sheet) continue
        const options = { imageBase: imageBaseFor(sheet.category.slug), sheet: sheet.frontmatter.module }
        const { html, tree } = await renderTree(sheet.body, options)
        const wanted = sheet.body.split('\n').filter((l) => /^### 🧭/.test(l)).length
        const compass = headings(html).filter((h) => h.includes('🧭'))
        const marked = headings(html).filter((h) => h.includes('bz-heading-mark'))
        const label = `${module.slug} ${lang} ${track}`
        expect(compass, label).toEqual([])
        expect(marked.length, label).toBe(wanted)
        for (const h of marked) {
          expect(h, label).toMatch(/<img[^>]*alt=""[^>]*aria-hidden="true"[^>]*lokum-logo\.svg|<img[^>]*lokum-logo\.svg[^>]*alt=""/)
        }
        // The tree, which the bundle reads, is the corpus' own text.
        expect(JSON.stringify(tree).includes('🧭'), label).toBe(wanted > 0)
        // Every other subsection keeps its emoji.
        const others = sheet.body.split('\n').filter((l) => /^### \p{Extended_Pictographic}/u.test(l) && !/^### 🧭/.test(l))
        for (const line of others) {
          const emoji = /^### (\p{Extended_Pictographic})/u.exec(line)?.[1] as string
          expect(html, label).toContain(emoji)
        }
        seen += wanted
      }
    }
    expect(seen).toBeGreaterThan(0)
  })
})
