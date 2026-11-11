import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { isAnimatedImage } from '@/lib/content/animated'
import { imageBaseFor, imagePathFor } from '@/lib/content/images'
import { TRANSLATED_LANGS, type ReadingLang } from '@/lib/content/languages'
import { loadAllModules, loadModuleIn } from '@/lib/content/loader'
import { CONTENT_ROOT } from '@/lib/content/paths'
import { renderTree } from '@/lib/content/render'
import { TRACK_IDS } from '@/lib/tracks'

/**
 * D136: an image figure carries `data-hl-animated` exactly when the file it shows is animated,
 * in every module, language and track. The file is read here by the byte rule the build uses, so
 * the test holds for any content and names no image, module or count. The markup is what the
 * replay control hangs on, so a figure marked wrongly is a still with a dead button or a
 * recording with none.
 */
const FIGURE = /<figure\b([^>]*\bbz-image\b[^>]*)>[\s\S]*?<img\b[^>]*\bsrc="([^"]+)"/g

describe('the animated mark on an image figure', () => {
  it('is on the figure of every animated file and on no other', async () => {
    const langs: ReadingLang[] = ['en', ...TRANSLATED_LANGS]
    for (const module of loadAllModules()) {
      for (const lang of langs) for (const track of TRACK_IDS) {
        const sheet = loadModuleIn(module.slug, lang, track)
        if (!sheet) continue
        const options = {
          imageBase: imageBaseFor(sheet.category.slug),
          imagePath: imagePathFor(sheet.category.slug),
          sheet: sheet.frontmatter.module,
        }
        const { html } = await renderTree(sheet.body, options)
        for (const [, attrs, src] of html.matchAll(FIGURE)) {
          const file = path.join(CONTENT_ROOT, sheet.category.dir, 'images', path.basename(src))
          const animated = fs.existsSync(file) && isAnimatedImage(fs.readFileSync(file))
          expect(attrs.includes('data-hl-animated'), `${module.slug} ${lang} ${track} ${src}`).toBe(animated)
        }
      }
    }
  })
})
