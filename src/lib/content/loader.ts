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
  translationOf,
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
  /**
   * M19 — the Turkish body, or `null` where there is not a usable one.
   *
   * **It is `null` on exactly the modules `lang` calls `EN`, and that is one
   * rule rather than two.** `langCoverage` already decides whether a `_tr.md`
   * sibling is a real translation or a stub translated from a stub, and it
   * decides it by extent (§7.6, a 0.4 ratio). A second opinion here would
   * eventually let the catalog say a module is bilingual while the route that
   * serves it has nothing to serve — so the body is read only when that
   * function has already said yes.
   *
   * **MEASURED across the corpus on 2026-09-13:** 33 modules, **19 `EN·TR` and
   * 14 `EN`, and not one written module is `EN`.** Every one of the fourteen is
   * a draft, which §7.6 forces to `EN` unconditionally — their `_tr.md` files
   * exist at a 0.9 to 1.0 ratio and are stubs translated from stubs. So the
   * null case is real and reachable only through a draft today; it is handled
   * because a module written tomorrow can be `EN` before anyone translates it,
   * not because anything is currently in that state.
   */
  translation: string | null
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
        //
        // **Sorted, and the sort is the fix for a real disagreement.** This
        // list used to be hand-written in the frontmatter and happened to be
        // ascending everywhere, so nothing noticed that `edges.ts` and
        // `title-block.ts` both sort it while this did not. Resolving from
        // `needs` made the author's listing order visible: swapping two
        // adjacent modules in the yaml left `personal_agents` reporting
        // `[13, 12]` here and `[12, 13]` on its own sheet. A prerequisite list
        // is a set, so it gets one order, and it gets it once.
        prerequisites: entry.needs
          .map((need) => (moduleByName(need) as { module: number }).module)
          .sort((a, b) => a - b),
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
        // Read only where `lang` has already said there is one to read — see
        // `translation` above for why that is one rule and not two. The same
        // `stripBuildFurniture` and `trimStart` the English body gets, because
        // the two are rendered by the same pipeline and a difference here would
        // show up as a difference in the prose.
        translation: langCoverage(filePath, entry.status) === 'EN·TR'
          ? stripBuildFurniture(matter(fs.readFileSync(translationOf(filePath), 'utf8')).content)
            .trimStart()
          : null,
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

/**
 * M19 — the same module, READ IN ONE LANGUAGE.
 *
 * **The whole of the second language is this function**, and that is the point
 * of doing it here rather than in the page. A module's page derives everything
 * from `body`: the quick check, the authored summary, the figure sequence, the
 * external sources, the word count. Swapping the body at the loader means every
 * one of those derivations runs against the Turkish text with no page code
 * knowing a second language exists — and a derivation that was correct in
 * English cannot be wrong in Turkish, because it is the same derivation.
 *
 * The alternative was to thread a `lang` through the page and pick per
 * reading, which is the same choice made eight times in one file and eventually
 * made seven.
 *
 * **What is NOT re-derived, and why.** `lang`, `revision`, `filePath` and
 * `source` stay the English module's: they are facts about the drawing and
 * about the repository, not about which body a reader is looking at — and
 * `revision` in particular is the English file's commit, which is what §5.5
 * means by the sheet's revision. `extent` and `figures` ARE re-derived, because
 * they are measurements OF the words on the page and the words on the page are
 * Turkish.
 *
 * Returns `undefined` for a module that has no usable translation, which the
 * route turns into a 404 rather than quietly serving English at a Turkish
 * address — the `EN` half of §7.6 is a real state and a reader who asked for
 * Turkish must not be handed English without being told.
 */
export function loadModuleIn(slug: string, lang: 'en' | 'tr'): CourseModule | undefined {
  const english = loadModule(slug)
  if (!english || lang === 'en') return english
  if (english.translation === null) return undefined

  const body = english.translation
  return {
    ...english,
    body,
    frontmatter: {
      ...english.frontmatter,
      // **MEASURED: a `_tr.md` carries NO frontmatter at all** — the files open
      // straight on their `# ` heading. So the translated title is in the body
      // and nowhere else, and `render.ts` drops that heading from the tree
      // (B6.1) exactly so the page can print it itself.
      title: headingOf(body) ?? english.frontmatter.title,
      // `summary` and `objectives` stay ENGLISH and the page says so with a
      // `lang` attribute, because there is no Turkish for them anywhere in the
      // corpus. Dropping them would take a capability off the Turkish page;
      // printing them unmarked would have a screen reader read English in a
      // Turkish voice. Marked English is the honest third answer, and it is
      // visible to the author as the next thing to translate.
    },
    extent: extent(stripLeadIn(body)),
    figures: countFigures(body),
    sources: countSources(body),
  }
}

/**
 * The first `# ` heading of a body, or `null`. Fenced lines are skipped, so a
 * `#` comment inside a shell block is not mistaken for the module's name.
 */
function headingOf(body: string): string | null {
  let fenced = false
  for (const line of body.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
    if (fenced) continue
    const heading = /^#[ \t]+(.+?)[ \t]*$/.exec(line)
    if (heading) return heading[1]
  }
  return null
}

export function loadCategoryIntro(slug: CategorySlug): string | null {
  const category = categoryBySlug(slug)
  if (!category) return null
  const readme = path.join(CONTENT_ROOT, category.dir, 'README.md')
  if (!fs.existsSync(readme)) return null
  return matter(fs.readFileSync(readme, 'utf8')).content.trimStart()
}
