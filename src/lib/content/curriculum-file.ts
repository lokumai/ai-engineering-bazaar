import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import { z } from 'zod'
import { CATEGORY_DIRS, CATEGORY_SLUGS, type CategorySlug } from './categories'
import { CONTENT_ROOT } from './paths'

/**
 * `mini-courses/curriculum.yaml`, read once and checked hard.
 *
 * **The number is a position, and this is the only place it is produced.**
 * Category order and module order are file order in the yaml; `module` below is
 * the 1-based index across the whole curriculum. Nothing anywhere else in the
 * repository computes it, writes it down, or parses it out of a filename, which
 * is what makes a reorder a one-line change instead of a script.
 *
 * **The merged shape is deliberately the one that already existed.** `loader.ts`
 * folds these fields into `ModuleFrontmatter`, so every `frontmatter.module` and
 * `frontmatter.title` reader in the app compiles unchanged. The config moved;
 * the app's vocabulary did not.
 *
 * **`z.strictObject` throughout, not `z.object`.** A typo like `minute: 25`
 * would otherwise be stripped silently and the module would report 0 minutes,
 * which is exactly the class of failure a central config exists to remove.
 *
 * **`yaml.safeLoad`, not `yaml.load`.** In js-yaml v3, which is the copy
 * gray-matter already pulls in, `load` enables custom types and `safeLoad` does
 * not. This file reads a file out of the repository, so the difference is small,
 * but a parser with fewer powers is the right one to point at content.
 *
 * Seven rules below are cross-file and zod cannot express any of them. Each
 * throws naming the offending module, because a validator whose message does not
 * say which line is wrong sends the reader looking through 33 of them.
 */

const RAW_MODULE = z.strictObject({
  name: z.string().min(1).regex(/^[a-z0-9_]+$/, 'a name is lowercase, digits and underscores'),
  title: z.string().min(1),
  status: z.enum(['ready', 'draft']).default('draft'),
  minutes: z.number().int().nonnegative().default(0),
  needs: z.array(z.string().min(1)).default([]),
  notes: z.string().min(1).nullable().default(null),
})

const RAW_CATEGORY = z.strictObject({
  slug: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(['ready', 'draft']).default('draft'),
  blurb: z.string().min(1),
  modules: z.array(RAW_MODULE).min(1),
})

const RAW_FILE = z.strictObject({
  categories: z.array(RAW_CATEGORY).min(1),
})

/** One module, with its position resolved. `module` is that position. */
export interface CurriculumModule {
  /** The file stem, and the source of the URL slug. The identity. */
  name: string
  title: string
  status: 'ready' | 'draft'
  /** The declared estimate. 0 where nobody has estimated one. */
  minutes: number
  /** Prerequisites, by `name`. Every one resolves and sits earlier. */
  needs: readonly string[]
  /** The author's planning note. Read by nothing that ships. */
  notes: string | null
  /** 1-based position across the whole curriculum: the module number. */
  module: number
  category: CategorySlug
}

export interface Category {
  slug: CategorySlug
  /** Directory name under mini-courses/ */
  dir: string
  title: string
  /** 1-based position in the yaml. */
  order: number
  status: 'ready' | 'draft'
  blurb: string
  modules: readonly CurriculumModule[]
}

export const CURRICULUM_FILE = path.join(CONTENT_ROOT, 'curriculum.yaml')

function fail(rule: string, detail: string): never {
  throw new Error(`curriculum.yaml: ${rule}\n  ${detail}`)
}

/**
 * A module file's name, as the yaml would spell it.
 *
 * **The numeric prefix is optional here on purpose, and only for now.** The
 * corpus still carries `1_llms.md` at this commit and will carry `llms.md`
 * after the corpus pass, so both have to resolve to `llms` in between or the
 * build cannot stay green across the two commits. Once the prefixes are gone,
 * drop the optional group and a stray `1_llms.md` becomes a file nobody listed,
 * which rule 6 refuses.
 */
const MODULE_FILE = /^(?:\d+_)?([a-z0-9_]+)\.md$/

/** The names a category directory actually holds, English files only. */
function namesOnDisk(dir: string): Set<string> {
  const found = new Set<string>()
  for (const filename of fs.readdirSync(path.join(CONTENT_ROOT, dir))) {
    if (filename.endsWith('_tr.md')) continue
    const parts = MODULE_FILE.exec(filename)
    if (parts) found.add(parts[1])
  }
  return found
}

/** True where the Turkish sibling of `name` exists, under either spelling. */
function hasTurkish(dir: string, name: string): boolean {
  const here = path.join(CONTENT_ROOT, dir)
  return fs.readdirSync(here).some((filename) => {
    const parts = /^(?:\d+_)?([a-z0-9_]+)_tr\.md$/.exec(filename)
    return parts?.[1] === name
  })
}

function sorted(values: Iterable<string>): string {
  return [...values].sort().join(', ')
}

function build(): readonly Category[] {
  const parsed = RAW_FILE.safeParse(
    yaml.safeLoad(fs.readFileSync(CURRICULUM_FILE, 'utf8')),
  )
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid curriculum.yaml:\n${detail}`)
  }
  const raw = parsed.data

  // ---- rule 1: the categories, in the union's order ----------------------
  // `CATEGORY_DIRS` is total over `CategorySlug` by type. Checking the yaml
  // against the same list is what makes the cast below safe and what stops a
  // category appearing here that the app has no directory or hue for.
  const declared = raw.categories.map((category) => category.slug)
  if (declared.join(',') !== CATEGORY_SLUGS.join(',')) {
    fail(
      'rule 1, the categories must be listed in the order CategorySlug declares them',
      `listed [${declared.join(', ')}], expected [${CATEGORY_SLUGS.join(', ')}]`,
    )
  }

  // ---- rule 2: every name is unique across the whole curriculum ----------
  // The name is the URL slug and the record's key, so two modules sharing one
  // would be two sheets at one route.
  const seen = new Map<string, string>()
  for (const category of raw.categories) {
    for (const module of category.modules) {
      const first = seen.get(module.name)
      if (first !== undefined) {
        fail(
          'rule 2, every module name must be unique',
          `"${module.name}" is listed under ${first} and again under ${category.slug}`,
        )
      }
      seen.set(module.name, category.slug)
    }
  }

  // The positions, which is the whole point of the file. Assigned before the
  // remaining rules because rule 4 compares them.
  const position = new Map<string, number>()
  let next = 0
  const categories: Category[] = raw.categories.map((category, index) => {
    const slug = category.slug as CategorySlug
    return {
      slug,
      dir: CATEGORY_DIRS[slug],
      title: category.title,
      order: index + 1,
      status: category.status,
      blurb: category.blurb,
      modules: category.modules.map((module) => {
        next += 1
        position.set(module.name, next)
        return { ...module, module: next, category: slug }
      }),
    }
  })

  for (const category of categories) {
    for (const module of category.modules) {
      // ---- rule 3: every prerequisite names a module that exists ---------
      // An unknown prerequisite number used to be dropped in silence when the
      // graph was built, so a typo cost the sheet an edge and said nothing.
      for (const need of module.needs) {
        if (!position.has(need)) {
          fail(
            'rule 3, every needs entry must name a module in this file',
            `"${module.name}" needs "${need}", which is not a module`,
          )
        }
        // ---- rule 4: a prerequisite comes earlier ------------------------
        // Otherwise the curriculum tells the reader to read two sheets in an
        // order it also says is wrong.
        const at = position.get(need) as number
        const here = position.get(module.name) as number
        if (at >= here) {
          fail(
            'rule 4, a needs entry must sit earlier in the file than the module naming it',
            `"${module.name}" is ${here} and needs "${need}", which is ${at}`,
          )
        }
      }

      // ---- rule 5: ready implies a real estimate -------------------------
      // A sheet prints its own extent in minutes, and `0 MIN` on a finished
      // sheet is a number nobody took.
      if (module.status === 'ready' && module.minutes <= 0) {
        fail(
          'rule 5, a ready module needs minutes above zero',
          `"${module.name}" is ready and declares ${module.minutes}`,
        )
      }
    }

    // ---- rule 6: the listing and the directory are the same set ----------
    // Both directions, and this is the single most valuable check in the file:
    // a module listed with no markdown behind it, and a markdown file nobody
    // listed and so nobody ships, are the two ways this config can be wrong
    // while everything else still passes.
    const listed = new Set(category.modules.map((module) => module.name))
    const onDisk = namesOnDisk(category.dir)
    const missing = [...listed].filter((name) => !onDisk.has(name))
    if (missing.length > 0) {
      fail(
        `rule 6, every module listed under ${category.slug} needs a file in ${category.dir}/`,
        `no file for: ${sorted(missing)}`,
      )
    }
    const unlisted = [...onDisk].filter((name) => !listed.has(name))
    if (unlisted.length > 0) {
      fail(
        `rule 6, every file in ${category.dir}/ must be listed under ${category.slug}`,
        `on disk and not listed: ${sorted(unlisted)}`,
      )
    }

    // ---- rule 7: the Turkish sibling exists ------------------------------
    // Every module is written in English and then translated once, so a module
    // with no `_tr.md` at all is a file somebody forgot to create rather than a
    // translation choice. Whether the Turkish is a real translation or a stub
    // is a different question, and `langCoverage` answers that one.
    const untranslated = category.modules
      .map((module) => module.name)
      .filter((name) => !hasTurkish(category.dir, name))
    if (untranslated.length > 0) {
      fail(
        `rule 7, every module needs a Turkish sibling in ${category.dir}/`,
        `no _tr.md for: ${sorted(untranslated)}`,
      )
    }
  }

  return categories
}

/**
 * The six categories, in order, each with its modules and their numbers.
 *
 * Built at import time rather than behind a memoised call, deliberately. It
 * keeps the name and the shape `categories.ts` used to export, so moving the
 * import path is the whole of the change at every call site. And it means the
 * seven rules run in any process that touches the content layer at all, so a
 * broken config fails the first thing that loads rather than the first thing
 * that happens to ask.
 */
export const CATEGORIES: readonly Category[] = build()

/** Every module, in curriculum order. `module` is the position, 1-based. */
export const CURRICULUM_MODULES: readonly CurriculumModule[] =
  CATEGORIES.flatMap((category) => category.modules)

export function categoryByDir(dir: string): Category | undefined {
  return CATEGORIES.find((category) => category.dir === dir)
}

export function categoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((category) => category.slug === slug)
}

export function moduleByName(name: string): CurriculumModule | undefined {
  return CURRICULUM_MODULES.find((module) => module.name === name)
}
