import { href } from '@/lib/url'
import { categoryByDir } from './categories'
import { loadAllModules } from './loader'
import { fullSlug, moduleSlugFromFilename } from './slugs'

/**
 * The corpus cross-references itself in the only notation a folder of markdown
 * files has: a relative path to another file. `[Module 13](13_security.md)`,
 * `[Module 17](../3_expert/17_advanced_architectures.md)`. **MEASURED:** 163
 * such links exist across the 32 English sheets and their Turkish siblings, in
 * exactly two shapes — `NAME.md` inside the same category directory and
 * `../DIR/NAME.md` into another one — and not one of them carries an anchor.
 *
 * A file path is not a route. The sheet at `13_security.md` is served at
 * `/courses/intermediate/security/`, so the browser resolved the href against
 * the *page* URL and asked for `/courses/intermediate/13_security.md`, which is
 * a 404. **MEASURED** in the static export before this module existed: 39 dead
 * links across 8 pages, every one of them in `intermediate`, because that is
 * the category whose prose cross-references its neighbours in the body rather
 * than only in the navigation furniture `strip.ts` removes.
 *
 * So the notation is translated here, at render time, from the corpus itself:
 * `slugs.ts` owns the filename-to-slug rule and `categories.ts` owns the
 * directory-to-category rule, and this module does nothing but compose them and
 * hand the result to `lib/url.ts`. Anything that cannot be translated throws —
 * see `courseLinkFor`.
 */

/** A scheme, a protocol-relative host, or a bare fragment: never our route. */
const OFF_SITE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i

/** The module files the loader reads: a numeric prefix, then the name. */
const MODULE_FILE = /^(\d+_.+?)(_tr)?\.md$/

/**
 * Every route the app actually serves, as `category/module-slug`.
 *
 * The loader is the authority on this, not a directory listing and not a
 * pattern: a file is a module route exactly when `loadAllModules` loaded it,
 * and asking anything else would let the two drift. Memoised because a rehype
 * plugin asks per link and `loadAllModules` builds 32 records.
 */
let routes: ReadonlySet<string> | null = null

function moduleRoutes(): ReadonlySet<string> {
  routes ??= new Set(loadAllModules().map((module) => module.slug))
  return routes
}

/**
 * The corpus file a numbered sheet was loaded from, as `DIR/NAME.md`, or null
 * for a number no sheet carries.
 *
 * `renderMarkdown` is told the sheet number and nothing else about where its
 * markdown came from, and the number is enough: the corpus is the map from one
 * to the other. Deriving the origin rather than adding a second option is what
 * keeps a caller from passing a sheet number and a directory that disagree.
 */
export function sheetSource(sheet: number): string | null {
  const module = loadAllModules().find((m) => m.frontmatter.module === sheet)
  if (!module) return null
  return `${module.category.dir}/${module.filePath.split('/').pop() ?? ''}`
}

/** True for an href written as a path to a markdown file in the corpus. */
export function isCourseLink(rawHref: string): boolean {
  if (OFF_SITE.test(rawHref)) return false
  return targetOf(rawHref).endsWith('.md')
}

/** The path part of an href, with any query and fragment removed. */
function targetOf(rawHref: string): string {
  return rawHref.split('#')[0].split('?')[0]
}

/**
 * Walk `target` from the directory `dir`, POSIX-style, and return the segments
 * it lands on. `2_intermediate` + `../3_expert/17_x.md` is
 * `['3_expert', '17_x.md']`; `1_fundamentals` + `../index.md` is `['index.md']`.
 */
function walk(dir: string, target: string): string[] {
  const segments = dir === '' ? [] : dir.split('/')
  for (const part of target.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      segments.pop()
      continue
    }
    segments.push(part)
  }
  return segments
}

/**
 * The route an internal corpus link should point at, or null when the href is
 * not an internal corpus link at all — an absolute URL, a `mailto:`, a bare
 * `#anchor`, an image, anything whose target is not a `.md` file. Those are
 * left exactly as the author wrote them.
 *
 * `source` is the file the href was written in, relative to `CONTENT_ROOT`
 * (`2_intermediate/12_harness_engineering.md`). It supplies the directory the
 * link resolves against and it is what the error message names, and taking one
 * path rather than a directory plus a name means the two can never disagree.
 *
 * **An internal `.md` link the corpus cannot answer for throws.** Until this
 * module, `mkdocs build --strict` was the only thing in the repository that
 * failed on a dead internal link — breaking one on purpose produced
 * `WARNING - Doc file '1_fundamentals/1_llms.md' contains a link
 * '9_bu_dosya_yok.md', but the target ... is not found among documentation
 * files. Aborted with 1 warnings in strict mode!` MkDocs is deleted, so that
 * gate exists here or it exists nowhere. A throw is the stronger form of it:
 * a warning needs a flag to become fatal, and a flag can be turned off.
 */
export function courseLinkFor(rawHref: string, source: string): string | null {
  if (!isCourseLink(rawHref)) return null

  const target = targetOf(rawHref)
  const fragment = rawHref.slice(target.length)
  const dir = source.includes('/') ? source.slice(0, source.lastIndexOf('/')) : ''
  const segments = walk(dir, target)

  const route = routeFor(segments)
  if (route === null) {
    throw new Error(
      `${source} links to "${rawHref}", which is not a module in mini-courses/. ` +
      'An internal markdown link has to name a file the loader reads, ' +
      'because the site serves routes rather than files.',
    )
  }

  // Every emitted URL goes through `href()`: the site is served from a
  // sub-path on GitHub Pages, and a prose anchor is not a `<Link>`, so the
  // base path is this module's job (see `lib/url.ts`). The trailing slash is
  // not decoration either — `trailingSlash: true` in next.config.mjs makes the
  // slashed form canonical, and the unslashed one costs a redirect.
  return `${href(route)}${fragment}`
}

/** The app-relative route for a resolved corpus path, or null if there is none. */
function routeFor(segments: string[]): string | null {
  // `mini-courses/index.md` — the corpus root file, reached as `../index.md`
  // from a category README. It has no module route because it is not a module:
  // it is the corpus' own table of contents, and the page that does that job
  // here is `/courses/`. Landing the reader on the course index is what the
  // link meant. `strip.ts` and `intro.ts` between them already remove the
  // links that use it, so this branch is a guarantee rather than a live path.
  if (segments.length === 1 && segments[0] === 'index.md') return '/courses/'

  if (segments.length !== 2) return null
  const [dir, filename] = segments

  const category = categoryByDir(dir)
  if (!category) return null

  const parts = MODULE_FILE.exec(filename)
  if (!parts) return null

  // A `_tr.md` target resolves to its English sibling's route, deliberately.
  // The app serves no Turkish route at all — `loader.ts` skips every `_tr.md`
  // file, so no such page exists to link to — and a sheet reports its own
  // language coverage in its title block (§7.6 `LANG`), which is where a reader
  // learns whether a Turkish translation exists. The two alternatives are both
  // worse: pointing at a route that is not built is a 404, and dropping the
  // link takes a cross-reference off the sheet that the author put there.
  const moduleSlug = moduleSlugFromFilename(`${parts[1]}.md`)
  const slug = fullSlug(category.slug, moduleSlug)
  if (!moduleRoutes().has(slug)) return null

  return `/courses/${slug}/`
}
