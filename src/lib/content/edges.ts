import type { CategorySlug } from './categories'
import { corpusTargetOf } from './links'
import { loadAllModules } from './loader'

/**
 * Requirement B7 — the edge set behind §4.6's dependency block and §4.10's
 * single-line diagram. Three relations, all derived:
 *
 *   REQUIRES  — declared in `prerequisites` frontmatter, drawn source to target.
 *   FEEDS     — the reverse index of the same edges. Not a second relation.
 *   SEE ALSO  — non-adjacent in-prose links between modules of the same band.
 *
 * Two exclusions carry weight, and both come from the drawing, not from taste.
 * Adjacent modules are already joined by §4.10's sequence rail, so a link to
 * the next module states nothing the rail does not. And §4.10 routes SEE ALSO
 * in a band's lower channel only: a cross-band suggestion has no lane to sit
 * in, and inventing one would put a fourth motif on the dashboard (§4.3).
 */

export type EdgeKind = 'requires' | 'see-also'

export interface ModuleEdge {
  /** Module number the edge leaves: the prerequisite, or the citing module. */
  from: number
  /** Module number the edge enters: the dependent, or the cited module. */
  to: number
  kind: EdgeKind
  /** True when the two modules sit in different categories (§4.10 rule 4). */
  crossBand: boolean
}

/** The slice of a module the graph reads. `CourseModule` is mapped onto it. */
export interface GraphModule {
  module: number
  category: CategorySlug
  prerequisites: readonly number[]
  /** The body after the B1 strip, so the deleted rail cannot cite anything. */
  body: string
  /** The corpus file it was read from, which is what resolves its links. */
  source: string
}

/**
 * How an in-prose href becomes the module it names, or null for one that names
 * nothing.
 *
 * **Injected rather than imported, because this file used to own a second copy
 * of it.** The pattern here scraped the NUMBER out of a link target with its own
 * regex, while the render path scraped the directory and the name with a
 * different one, over the same corpus: two resolvers, two behaviours, one set of
 * files. And the number it was reading is exactly what leaves the filename in
 * the corpus pass. `moduleGraph` passes `links.ts`'s resolver, which is now the
 * only one; a caller with a body it invented passes whatever answers for it,
 * which is what keeps the graph's own rules testable without a corpus.
 */
export type LinkResolver = (rawHref: string, source: string) => number | null

export interface ModuleGraph {
  readonly edges: readonly ModuleEdge[]
  /** Prerequisites of a module, ascending. */
  requires(module: number): number[]
  /** Modules that name this one as a prerequisite, ascending. */
  feeds(module: number): number[]
  /** Non-adjacent same-band modules this one links to in prose, ascending. */
  seeAlso(module: number): number[]
}

/** A markdown link whose target is a markdown file, e.g. `security.md#tools`. */
const MODULE_LINK = /\]\(\s*([^)\s]+\.md)(?:#[^)\s]*)?\s*(?:"[^"]*")?\)/g

/**
 * The markdown-file hrefs this body links to, each reported once, in
 * first-mention order, exactly as the author wrote them.
 *
 * It resolves nothing. Turning an href into a module is the resolver's job, and
 * keeping the two apart is what took the filename pattern out of this file.
 */
export function inProseLinkTargets(body: string): string[] {
  const found: string[] = []
  for (const match of body.matchAll(MODULE_LINK)) {
    if (!found.includes(match[1])) found.push(match[1])
  }
  return found
}

/**
 * Module numbers this body links to, each reported once, ascending. Self-links
 * and links that name no module are not links between modules.
 */
function linkedModules(m: GraphModule, resolve: LinkResolver): number[] {
  const found: number[] = []
  for (const href of inProseLinkTargets(m.body)) {
    const target = resolve(href, m.source)
    if (target === null || target === m.module) continue
    if (!found.includes(target)) found.push(target)
  }
  return found.sort(ascending)
}

function ascending(a: number, b: number): number {
  return a - b
}

export function buildGraph(
  modules: readonly GraphModule[],
  resolve: LinkResolver,
): ModuleGraph {
  const band = new Map<number, CategorySlug>(
    modules.map((m) => [m.module, m.category]),
  )
  const ordered = [...modules].sort((a, b) => ascending(a.module, b.module))

  const requiresEdges: ModuleEdge[] = []
  const seeAlsoEdges: ModuleEdge[] = []

  for (const m of ordered) {
    for (const prerequisite of [...m.prerequisites].sort(ascending)) {
      const source = band.get(prerequisite)
      if (source === undefined) continue
      requiresEdges.push({
        from: prerequisite,
        to: m.module,
        kind: 'requires',
        crossBand: source !== m.category,
      })
    }

    for (const target of linkedModules(m, resolve)) {
      if (band.get(target) !== m.category) continue
      if (Math.abs(target - m.module) <= 1) continue
      seeAlsoEdges.push({
        from: m.module,
        to: target,
        kind: 'see-also',
        crossBand: false,
      })
    }
  }

  const edges: readonly ModuleEdge[] = [...requiresEdges, ...seeAlsoEdges]

  const targets = (kind: EdgeKind, from: number) =>
    edges.filter((e) => e.kind === kind && e.from === from)
      .map((e) => e.to)
      .sort(ascending)

  return {
    edges,
    requires: (module) =>
      edges.filter((e) => e.kind === 'requires' && e.to === module)
        .map((e) => e.from)
        .sort(ascending),
    feeds: (module) => targets('requires', module),
    seeAlso: (module) => targets('see-also', module),
  }
}

let cache: ModuleGraph | null = null

/** The curriculum's own graph, built once from the loaded modules. */
export function moduleGraph(): ModuleGraph {
  cache ??= buildGraph(
    loadAllModules().map((m) => ({
      module: m.frontmatter.module,
      category: m.category.slug,
      prerequisites: m.frontmatter.prerequisites,
      body: m.body,
      source: m.source,
    })),
    (rawHref, source) => corpusTargetOf(rawHref, source)?.frontmatter.module ?? null,
  )
  return cache
}
