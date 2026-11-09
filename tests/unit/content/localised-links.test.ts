import { afterEach, describe, expect, it } from 'vitest'
import { sheetPath } from '@/lib/content/curriculum'
import { loadAllModules } from '@/lib/content/loader'
import { renderMarkdown } from '@/lib/content/render'

/**
 * A cross-reference on a translated page lands on the translated page, on the
 * deployed build as well as locally.
 *
 * The route was localised after `href()` had already prepended the base path,
 * so the caller's lookup of a prefixed string in a set of bare routes never
 * matched on GitHub Pages, and every Turkish and Persian prose link fell back
 * to English. A fragment broke the same lookup with no base path at all. Both
 * cases are rendered here, under a base path and without one.
 *
 * The module is chosen from the loader at run time, so the test holds for any
 * corpus with one translated module; the body links to the target from its own
 * file, which makes the relative path always `<name>.md`.
 */

const target = loadAllModules().find((m) => m.translations.tr !== null)
if (!target) throw new Error('precondition: the loader yields no module with a Turkish translation')
const route = sheetPath(target)
const localise = (r: string) => (r === route ? `/tr${r}` : r)

describe('a localised cross-reference', () => {
  const original = process.env.NEXT_PUBLIC_SITE_BASE_PATH
  afterEach(() => { process.env.NEXT_PUBLIC_SITE_BASE_PATH = original })

  for (const base of ['/ai-engineering-bazaar', '']) {
    it(`puts the base path before the language, and the fragment last (base "${base}")`, async () => {
      process.env.NEXT_PUBLIC_SITE_BASE_PATH = base
      const { html } = await renderMarkdown(`[a](${target.name}.md) [b](${target.name}.md#part)`, {
        sheet: target.frontmatter.module,
        localiseRoute: localise,
      })
      expect(html).toContain(`href="${base}/tr${route}"`)
      expect(html).toContain(`href="${base}/tr${route}#part"`)
    })
  }
})
