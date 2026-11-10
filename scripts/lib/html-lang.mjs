/**
 * D119 — `<html lang>` in the exported pages of each translation.
 *
 * The site has one root layout, so every page is rendered with `<html lang="en">`; a
 * crawler that does not run scripts reads that on a Turkish or Persian page. The export
 * is where the address of every page is known, so this sets the attribute in the files
 * under `out/<lang>/`, to that language and nothing else: no `dir`, because the layout
 * is never mirrored (D80). It runs in `scripts/finalize-bundle.mjs`, the one step that
 * already rewrites `out/`.
 *
 * What the pages do after they load is not this file's job: `recordBootScript` sets the
 * same value before first paint and `RecordStateSync` after a client navigation, from
 * `languageOfPath` in `src/lib/content/languages.ts`. Three writers of one attribute, and
 * `tests/unit/html-lang.test.ts` holds them to the same answer.
 *
 * A file that does not open on `<html lang="en"` is an error, not a skip: it means the
 * layout changed under this step, and a silent skip would ship the wrong attribute.
 *
 * Plain `.mjs` importing only `node:` (the scripts cannot import the TypeScript list of
 * languages; the finaliser reads it from the bundle's own index).
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ENGLISH = '<html lang="en"'

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return htmlFiles(full)
    return entry.name.endsWith('.html') ? [full] : []
  })
}

/**
 * @param {string} outDir the export
 * @param {readonly string[]} languages the translations' route segments (`tr`, `fa`)
 * @returns {Record<string, number>} pages rewritten, by language
 */
export function setHtmlLang(outDir, languages) {
  const counts = {}
  for (const lang of languages) {
    const dir = join(outDir, lang)
    counts[lang] = 0
    if (!existsSync(dir)) continue
    for (const file of htmlFiles(dir)) {
      const html = readFileSync(file, 'utf8')
      if (!html.includes(ENGLISH)) throw new Error(`${file} does not open on ${ENGLISH}; the root layout changed, so ${lang} cannot be set here`)
      writeFileSync(file, html.replace(ENGLISH, `<html lang="${lang}"`))
      counts[lang] += 1
    }
  }
  return counts
}
