import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { CATEGORIES, type Category, type CategorySlug, categoryBySlug } from './categories'
import { CONTENT_ROOT } from './paths'
import { type ModuleFrontmatter, parseFrontmatter } from './schema'
import { fullSlug, moduleSlugFromFilename } from './slugs'

export interface CourseModule {
  /** `fundamentals/llms` — the identifier used across the app */
  slug: string
  /** `llms` — the last URL segment */
  moduleSlug: string
  category: Category
  frontmatter: ModuleFrontmatter
  /** Markdown body with the frontmatter removed */
  body: string
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
      modules.push({
        slug: fullSlug(category.slug, moduleSlug),
        moduleSlug,
        category,
        frontmatter,
        body: parsed.content.trimStart(),
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
