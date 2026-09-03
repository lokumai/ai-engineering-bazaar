import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import type { CategorySlug } from './categories'
import {
  CATEGORIES,
  type Category,
  categoryBySlug,
  moduleByName,
} from './curriculum-file'
import {
  type Lang,
  type SheetFormat,
  countFigures,
  countSources,
  extent,
  langCoverage,
  sheetFormat,
} from './derive'
import { CONTENT_ROOT } from './paths'
import { type Revision, revisionFor } from './revision'
import { type ModuleFrontmatter, parseFrontmatter } from './schema'
import { fullSlug, moduleSlugFromName } from './slugs'
import { stripBuildFurniture, stripLeadIn } from './strip'

export interface CourseModule {
  /** `fundamentals/llms` — the identifier used across the app */
  slug: string
  /** `llms` — the module's name in `curriculum.yaml`, and its file stem */
  name: string
  /** `llms` — the last URL segment */
  moduleSlug: string
  category: Category
  frontmatter: ModuleFrontmatter
  /**
   * Markdown body with the frontmatter removed and the B1 furniture — the
   * progress rail and the prev/next lines — already stripped. Every derived
   * value below is measured from this string, never from the raw file.
   */
  body: string
  /** §5.5 `EXTENT` — words in the body, less the h1 and dek the sheet drops */
  extent: number
  /** §4.4 — which of the three sheet formats this module is drawn on */
  sheetFormat: SheetFormat
  /** §5.5 `FIGURES` — real mermaid diagrams plus images */
  figures: number
  /** §5.5 `SOURCES` — distinct external http(s) links */
  sources: number
  /** §7.6 `LANG` — `EN·TR` only where the Turkish is a real translation */
  lang: Lang
  /** §5.5 `REVISION` / `DATE` — this file's last-touching commit, or null */
  revision: Revision | null
  /** Absolute path, for diagnostics */
  filePath: string
  /** `2_intermediate/security.md` — what an error message and a link resolver name */
  source: string
}

/**
 * The file a module's name resolves to.
 *
 * The name IS the file stem, so this is a join and not a search. It was briefly
 * a search, while the corpus carried `security.md` and the yaml said
 * `security`; there is nothing left to search for.
 *
 * `curriculum-file.ts`'s rule 6 has already established that the file exists
 * before anything calls this, so the throw is a guard rather than a live path.
 */
export function fileFor(dir: string, name: string): string {
  const file = path.join(CONTENT_ROOT, dir, `${name}.md`)
  if (!fs.existsSync(file)) throw new Error(`No markdown file for "${name}" in ${dir}/`)
  return file
}

let cache: CourseModule[] | null = null

/**
 * Every module, in curriculum order.
 *
 * **The yaml is walked, not the directory.** It used to be
 * `readdirSync().sort()` followed by a sort on `frontmatter.module`, which is
 * two orderings imposed on a set that already had one: the order the course is
 * written in. Both sorts are gone, because file order in `curriculum.yaml` IS
 * the order, and `curriculum-file.ts`'s rule 6 has already checked that the
 * listing and the directory hold the same set of files. A module in a directory
 * that nobody listed no longer loads silently; it fails the build.
 *
 * The merge happens before anything derived is computed, which is the ordering
 * that matters: `sheetFormat` and `langCoverage` both need `status`, and
 * `status` is now the yaml's.
 */
export function loadAllModules(): CourseModule[] {
  if (cache) return cache

  const modules: CourseModule[] = []
  for (const category of CATEGORIES) {
    for (const entry of category.modules) {
      const filePath = fileFor(category.dir, entry.name)
      const source = `${category.dir}/${path.basename(filePath)}`
      const parsed = matter(fs.readFileSync(filePath, 'utf8'))
      const sheet = parseFrontmatter(parsed.data, source, entry.status)

      const frontmatter: ModuleFrontmatter = {
        module: entry.module,
        title: entry.title,
        category: category.slug,
        status: entry.status,
        duration: entry.minutes,
        summary: sheet.summary,
        objectives: sheet.objectives,
        // The yaml names prerequisites; the app numbers them. Rule 3 has
        // already established that every name resolves, so this cannot be
        // partial and an unknown prerequisite is no longer dropped in silence.
        prerequisites: entry.needs.map((need) => (moduleByName(need) as { module: number }).module),
      }

      const moduleSlug = moduleSlugFromName(entry.name)
      const body = stripBuildFurniture(parsed.content).trimStart()
      // The body keeps its h1 and its dek — `render.ts` drops them from the
      // tree (B6.1, B6.2) — so the measurement drops them here rather than
      // counting two lines the sheet never prints (§5.5).
      const words = extent(stripLeadIn(body))
      modules.push({
        slug: fullSlug(category.slug, moduleSlug),
        name: entry.name,
        moduleSlug,
        category,
        frontmatter,
        body,
        extent: words,
        sheetFormat: sheetFormat(frontmatter, words),
        figures: countFigures(body),
        sources: countSources(body),
        // The status is handed over rather than read a second time. Reading it
        // again out of the file is what made this call order load-bearing and
        // silent: with `status` gone from the frontmatter, a second `matter()`
        // would see `undefined`, the draft guard would stop firing, and all 19
        // draft sheets would claim `LANG EN · TR` on the strength of their stub
        // translations sitting at a 0.83 to 1.00 ratio.
        lang: langCoverage(filePath, entry.status),
        revision: revisionFor(filePath),
        filePath,
        source,
      })
    }
  }

  cache = modules
  return modules
}

export function loadModule(slug: string): CourseModule | undefined {
  return loadAllModules().find((m) => m.slug === slug)
}

export function loadCategoryIntro(slug: CategorySlug): string | null {
  const category = categoryBySlug(slug)
  if (!category) return null
  const readme = path.join(CONTENT_ROOT, category.dir, 'README.md')
  if (!fs.existsSync(readme)) return null
  return matter(fs.readFileSync(readme, 'utf8')).content.trimStart()
}
