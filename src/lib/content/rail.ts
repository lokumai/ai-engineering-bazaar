import { CATEGORIES } from './curriculum-file'
import { loadAllModules } from './loader'

/**
 * M10 — the curriculum, shaped for the left rail.
 *
 * One level per section, every module of that level under it, in curriculum
 * order. Nothing here is a fact about the content: the titles, the numbers, the
 * order and the totals are all read out of `curriculum.yaml` and the files it
 * lists, which is `MANIFESTO.md`'s derive-never-restate rule applied to a
 * sidebar (`kia-context/specs/ARCHITECTURE.md` §2).
 *
 * **It reaches `node:fs` through the loader, so it is build-time only.** The
 * rail is a server component and takes this whole structure as a prop; §12.2's
 * import direction means no client island may import this file, which is why
 * the fold — the one part that needs the browser — is a separate leaf that
 * takes nothing from here.
 *
 * A module's number is its position in the config and is computed there
 * (`kia-context/logs/BRAINSTORM.md` D5), so this file reads
 * `frontmatter.module` rather than counting.
 */

export interface RailModule {
  /** The identity, `intermediate/security`. */
  slug: string
  /** The label, and the key channel A matches on (`hl-signed-<n>`). */
  module: number
  title: string
  path: string
  /** `status: ready`. A draft cannot be completed, so it can carry no tick. */
  drawn: boolean
}

export interface RailLevel {
  slug: string
  title: string
  order: number
  modules: readonly RailModule[]
}

let cache: readonly RailLevel[] | null = null

/**
 * Every level with its modules, cached per process like every other derive in
 * this directory: a static export renders 33 module pages and each one asks for
 * the whole rail.
 *
 * The levels come from `CATEGORIES` rather than from the modules, so a level
 * with no written module still appears with a count of zero rather than
 * vanishing — the shape of the course is information, and a rail that hid the
 * empty levels would tell a reader the course was shorter than it is.
 */
export function railLevels(): readonly RailLevel[] {
  if (cache) return cache

  const modules = loadAllModules()

  cache = CATEGORIES.map((category) => ({
    slug: category.slug,
    title: category.title,
    order: category.order,
    modules: modules
      .filter((module) => module.category.slug === category.slug)
      .map((module) => ({
        slug: module.slug,
        module: module.frontmatter.module,
        title: module.frontmatter.title,
        path: `/courses/${module.category.slug}/${module.moduleSlug}/`,
        drawn: module.frontmatter.status === 'ready',
      })),
  }))

  return cache
}
