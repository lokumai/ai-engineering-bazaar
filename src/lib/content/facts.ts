import { CATEGORIES } from './categories'
import { checklistOf } from './checklist'
import { moduleGraph } from './edges'
import { loadAllModules } from './loader'
import { quickCheckOf } from './quickcheck'

/**
 * §12.2 — the bridge between the file-system-bound content layer and the
 * browser.
 *
 * Everything the record needs to know about the corpus, as one plain
 * serialisable object. It runs at **build time only** and reaches the client as
 * serialised props, never by import: `derive.ts`, `loader.ts`, `revision.ts`
 * and `paths.ts` all reach `node:fs`, and §12.2's import rule is that a single
 * value imported across that line pulls `node:fs` into the browser bundle and
 * the build stops. `lib/record/` therefore imports nothing at all, and this is
 * the module that hands it its facts — the mirror image of `rows.ts`, which
 * imports nothing so that a client island may import it.
 *
 * **It is deliberately small.** §12.2 / D11 serialise it into every page, so it
 * carries counts, not content: no body text, no section spines, no source URL
 * lists, no checklist item text. Anything a single sheet's page needs — the
 * question, the item texts, the URLs — the sheet's own page derives for itself
 * from `quickCheckOf`, `checklistOf` and `distinctExternalLinks`.
 *
 * **Every field is derived or absent (§11.25).** Nothing here is typed by hand,
 * including the four numbers §12.5.1 multiplies into `2,380 ATTAINABLE TODAY`.
 * `revision` is `null` on a checkout where git cannot tell us, which is the one
 * honest answer; §11.25's dash gate is on `status`, not on zero, so a sheet
 * nobody has drawn reports `0` sources and `0` checklist items rather than a
 * dash — the count was taken, and it came to zero.
 */

export interface SheetFact {
  /** §12.1.3 — the identity. The set has been renumbered before. */
  slug: string
  /** The label, for `SHEET 13` and for ordering. */
  module: number
  title: string
  /** The subsystem's slug, which is its identity too. */
  category: string
  /** `status: ready` — the geometry is on the sheet, so it can be signed off. */
  drawn: boolean
  /**
   * §12.6 — whether this sheet asks a self-check. All 15 drawn sheets do and no
   * draft does, but that is a measurement, not a rule: a consumer keys on this
   * flag, never on `drawn`.
   */
  hasQuickCheck: boolean
  /** §12.7 — how many `- [ ]` items. 8 on one sheet, 0 on the other 31. */
  checklistItems: number
  /** §12.8 / §5.5 `SOURCES` — distinct external links. */
  sources: number
  /** §12.4.3 — the REV short hash a sign-off is recorded against, or null. */
  revision: string | null
}

export interface CategoryFact {
  slug: string
  title: string
  order: number
  /** Sheets in this subsystem — the denominator of its stamp (§12.5.3). */
  total: number
}

/**
 * §12.5.1 — the XP ceiling's three multiplicands, and only those. The awards
 * themselves (100 / 60 / 40, flat) belong to `lib/record/`, which is what does
 * the awarding; keeping a second copy of them here would be two places for
 * them to disagree.
 */
export interface AttainableCounts {
  /** Drawn sheets: 15. A draft has no sign-off control at all (§12.4.1). */
  signOff: number
  /** Drawn sheets that ask a self-check: 15. */
  quiz: number
  /** Drawn sheets with at least one checklist item: 1. */
  checklist: number
}

export interface CurriculumFacts {
  sheets: readonly SheetFact[]
  categories: readonly CategoryFact[]
  /** §5.8 / §12.5.2 — the REQUIRES + SEE ALSO edge count. The `TRACES` total. */
  traces: number
  attainable: AttainableCounts
}

let cache: CurriculumFacts | null = null

/**
 * The corpus spine, built once per build. Cached in a module-level `let` like
 * every other derive in this directory, because the loader, the graph and the
 * per-sheet extractors are all walked here and a static export renders every
 * page in one process.
 */
export function curriculumFacts(): CurriculumFacts {
  if (cache) return cache

  const modules = loadAllModules()

  const sheets: SheetFact[] = modules.map((m) => ({
    slug: m.slug,
    module: m.frontmatter.module,
    title: m.frontmatter.title,
    category: m.category.slug,
    drawn: m.frontmatter.status === 'ready',
    hasQuickCheck: quickCheckOf(m.body) !== null,
    checklistItems: checklistOf(m.body).length,
    sources: m.sources,
    revision: m.revision?.hash ?? null,
  }))

  const drawn = sheets.filter((sheet) => sheet.drawn)

  cache = {
    sheets,
    categories: CATEGORIES.map((category) => ({
      slug: category.slug,
      title: category.title,
      order: category.order,
      total: sheets.filter((sheet) => sheet.category === category.slug).length,
    })),
    traces: moduleGraph().edges.length,
    attainable: {
      signOff: drawn.length,
      quiz: drawn.filter((sheet) => sheet.hasQuickCheck).length,
      checklist: drawn.filter((sheet) => sheet.checklistItems > 0).length,
    },
  }
  return cache
}
