import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { CATEGORIES, type Category, type CategorySlug, categoryBySlug } from './categories'
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
import { fullSlug, moduleSlugFromFilename } from './slugs'
import { stripBuildFurniture, stripLeadIn } from './strip'

export interface CourseModule {
  /** `fundamentals/llms` — the identifier used across the app */
  slug: string
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
}

const MODULE_FILE = /^\d+_.+\.md$/

/**
 * A module's declared category must agree with the directory it sits in.
 * Nothing downstream re-checks this: the loader trusts `category.slug` for the
 * URL and the frontmatter for filtering, so a disagreement would silently file
 * a module under one category and link it under another.
 */
export function assertCategoryMatchesDirectory(
  declared: string,
  category: Category,
  source: string,
): void {
  if (declared === category.slug) return
  throw new Error(
    `${source} declares category "${declared}" ` +
    `but lives in the "${category.slug}" directory`,
  )
}

let cache: CourseModule[] | null = null

export function loadAllModules(): CourseModule[] {
  if (cache) return cache

  const modules: CourseModule[] = []
  for (const category of CATEGORIES) {
    const dir = path.join(CONTENT_ROOT, category.dir)
    for (const filename of fs.readdirSync(dir).sort()) {
      if (!MODULE_FILE.test(filename)) continue
      if (filename.endsWith('_tr.md')) continue

      const filePath = path.join(dir, filename)
      const parsed = matter(fs.readFileSync(filePath, 'utf8'))
      const frontmatter = parseFrontmatter(
        parsed.data,
        `${category.dir}/${filename}`,
      )
      assertCategoryMatchesDirectory(
        frontmatter.category,
        category,
        `${category.dir}/${filename}`,
      )
      const moduleSlug = moduleSlugFromFilename(filename)
      const slug = fullSlug(category.slug, moduleSlug)
      const body = stripBuildFurniture(parsed.content).trimStart()
      // The body keeps its h1 and its dek — `render.ts` drops them from the
      // tree (B6.1, B6.2) — so the measurement drops them here rather than
      // counting two lines the sheet never prints (§5.5).
      const words = extent(stripLeadIn(body))
      modules.push({
        slug,
        moduleSlug,
        category,
        frontmatter,
        body,
        extent: words,
        sheetFormat: sheetFormat(frontmatter, words),
        figures: countFigures(body),
        sources: countSources(body),
        lang: langCoverage(slug),
        revision: revisionFor(filePath),
        filePath,
      })
    }
  }

  modules.sort((a, b) => a.frontmatter.module - b.frontmatter.module)
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
