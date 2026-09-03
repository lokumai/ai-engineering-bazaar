import { CATEGORIES, type Category } from './curriculum-file'
import { type CourseModule, loadAllModules } from './loader'

/**
 * The drawing set as an ordered whole (§4.4, §4.9, §5.7).
 *
 * `loadAllModules` already sorts by module number, which is the curriculum's
 * own order and the order §5.7's prev/next chain walks: sheet 7 is followed by
 * sheet 8 even though they sit in different categories, because the set is one
 * assembly of thirty-two sheets and the category boundary is a subsystem
 * label, not a stop.
 */

export interface CategoryWithModules {
  category: Category
  modules: CourseModule[]
}

export function curriculum(): CategoryWithModules[] {
  const modules = loadAllModules()
  return CATEGORIES.map((category) => ({
    category,
    modules: modules.filter((m) => m.category.slug === category.slug),
  }))
}

/**
 * Sheets in the set. Counted, never typed: `SHEET 13 OF 33` is a claim about
 * the repository and it stops being true the day a thirty-third file lands
 * (§11.25).
 */
export function sheetCount(): number {
  return loadAllModules().length
}

/** §5.5 `POSITION` — `6 OF 8`, this sheet's place within its own category. */
export interface SheetPosition {
  index: number
  of: number
}

export function positionOf(slug: string): SheetPosition | null {
  const modules = loadAllModules()
  const module = modules.find((m) => m.slug === slug)
  if (!module) return null

  const siblings = modules.filter((m) => m.category.slug === module.category.slug)
  return { index: siblings.indexOf(module) + 1, of: siblings.length }
}

export interface Neighbours {
  previous: CourseModule | null
  next: CourseModule | null
}

/**
 * §5.7 — the sheets either side of this one in the set. Both ends return
 * `null` rather than wrapping: the component renders `— END OF SET` there,
 * because a set that loops has no first sheet and no last.
 */
export function neighbours(slug: string): Neighbours {
  const modules = loadAllModules()
  const index = modules.findIndex((m) => m.slug === slug)
  if (index === -1) return { previous: null, next: null }
  return {
    previous: modules[index - 1] ?? null,
    next: modules[index + 1] ?? null,
  }
}

/**
 * The sheet's route. `trailingSlash: true` in next.config.mjs makes the slashed
 * form canonical, and `<Link>` takes the app-relative path as written — the
 * base path is the router's job, never ours (see `lib/url.ts`).
 */
export function sheetPath(module: CourseModule): string {
  return `/courses/${module.category.slug}/${module.moduleSlug}/`
}

/** The subsystem's own page. Same rule as `sheetPath`: app-relative, slashed. */
export function categoryPath(category: Category): string {
  return `/courses/${category.slug}/`
}

/** The sheet a dependency edge names. Edges carry numbers, not slugs. */
export function moduleByNumber(module: number): CourseModule | undefined {
  return loadAllModules().find((m) => m.frontmatter.module === module)
}
