import { describe, expect, it } from 'vitest'
import { CURRICULUM_MODULES } from '@/lib/content/curriculum-file'
import { curriculumFacts } from '@/lib/content/facts'
import { PATHS, drawnCount, isDrawnStep } from '@/lib/path/paths'
import { ROLES, ROLE_IDS } from '@/lib/path/roles'

/**
 * §13.4.2 — the honesty of a learning path, checked mechanically.
 *
 * This file was specified before the paths were written, not after, because
 * §13.4.2 is the section most likely to be implemented sloppily: **including a
 * draft sheet in a path is the natural thing to do, and excluding it from the
 * denominator is the unnatural one.** Most of the sheets hold a topic list and
 * nothing else. A path that counts them tells a reader to finish work nobody
 * has written.
 *
 * It has already earned its place. Nine research agents wrote these paths by
 * reading the sheets, and three independent auditors then checked every claim
 * against the files. Between them they caught seven real problems — an
 * unsupported claim about retrieval-correctness content that does not exist, a
 * blurb promising vector-store operations the corpus never covers, a first-
 * person `our` that would have failed the copy register, and a lighter role
 * handed a heavier curriculum than the role above it. Then **this test found
 * two more that all twelve of them had passed**: draft steps tiered
 * `supporting`, which claims a sheet with no content can materially help.
 *
 * Everything here is derived from the corpus (§11.25). Nothing is transcribed:
 * the drawn set and the slugs come from `curriculumFacts()`, and the prerequisite
 * graph is parsed from the sheets' own frontmatter — so a renumber or a
 * newly-written sheet moves this test's expectations on its own.
 */

const facts = curriculumFacts()
const bySlug = new Map(facts.sheets.map((sheet) => [sheet.slug, sheet]))

/**
 * §13.4.2's own rule, stated once: a sheet is drawn or it is not, and the
 * corpus is the authority. This is the set `isDrawnStep` is given, so nothing
 * here can drift from the frontmatter: it IS the frontmatter.
 */
const DRAWN: ReadonlySet<string> = new Set(
  facts.sheets.filter((sheet) => sheet.drawn).map((sheet) => sheet.slug),
)

function corpusSaysDrawn(slug: string): boolean {
  const sheet = bySlug.get(slug)
  if (sheet === undefined) throw new Error(`path: ${slug} is not in the corpus`)
  return sheet.drawn
}

/** The module number the corpus gives a slug. A step no longer carries one. */
function moduleOf(slug: string): number {
  const sheet = bySlug.get(slug)
  if (sheet === undefined) throw new Error(`path: ${slug} is not in the corpus`)
  return sheet.module
}

/**
 * The prerequisite graph, by module number, read from the curriculum itself.
 *
 * `SheetFact` does not carry prerequisites, and it should not: §12.2 keeps it
 * small because it is serialised into every page. So this reads the declaration
 * instead, and reading it is the point: the graph the ordering test enforces is
 * the one the curriculum actually declares, not a copy of it kept here.
 *
 * It used to parse `module:` and `prerequisites:` out of 33 frontmatter blocks
 * with two regexes, including a comment about `_tr.md` versus `_tr` because the
 * loose form had twice swallowed a drawn sheet. `curriculum.yaml` names its
 * prerequisites, so the numbers are resolved by position and there is nothing
 * left to parse. The "read a prerequisite list for every drawn sheet" case
 * below still fails loudly if this ever falls short, so the ordering test
 * cannot pass vacuously.
 */
function prerequisiteGraph(): Map<number, number[]> {
  const byName = new Map(CURRICULUM_MODULES.map((module) => [module.name, module.module]))
  return new Map(
    CURRICULUM_MODULES.map((module) => [
      module.module,
      module.needs.map((need) => byName.get(need) as number),
    ]),
  )
}

const graph = prerequisiteGraph()

describe('§13.4 — every path is over sheets that exist', () => {
  it.each(PATHS)('$role names only real slugs', (path) => {
    const unknown = path.steps.map((step) => step.slug).filter((slug) => !bySlug.has(slug))
    expect(unknown).toEqual([])
  })

  it.each(PATHS)('$role lists no sheet twice', (path) => {
    const slugs = path.steps.map((step) => step.slug)
    expect(slugs).toHaveLength(new Set(slugs).size)
  })

})

describe('§13.4.2 — a draft sheet is never promised as a lesson', () => {
  /**
   * The rule that caught two steps twelve agents had passed. A sheet with no
   * content cannot be `core` and cannot be `supporting`, because both claim it
   * helps — and there is nothing there to help with.
   */
  it('tiers every draft step as context, in all nine paths', () => {
    const wrong = PATHS.flatMap((path) =>
      path.steps
        .filter((step) => !corpusSaysDrawn(step.slug) && step.tier !== 'context')
        .map((step) => `${path.role}: ${step.slug} tiered ${step.tier}`),
    )
    expect(wrong).toEqual([])
  })

  it('reads drawn off the corpus for every step', () => {
    // Not a cross-check of two sources any more: `isDrawnStep` is handed the
    // corpus's own set, so this asserts the wiring rather than the agreement.
    const disagree = PATHS.flatMap((path) =>
      path.steps
        .filter((step) => isDrawnStep(step, DRAWN) !== corpusSaysDrawn(step.slug))
        .map((step) => `${path.role}: ${step.slug}`),
    )
    expect(disagree).toEqual([])
  })
})

describe('§13.4.2 — the denominator counts drawn steps only', () => {
  it.each(PATHS)('$role counts only what a reader can sign off', (path) => {
    const drawn = path.steps.filter((step) => corpusSaysDrawn(step.slug)).length
    expect(drawnCount(path, DRAWN)).toBe(drawn)
    // The whole point: the denominator is smaller than the list whenever a path
    // carries a roadmap marker, and every path here carries at least one.
    expect(drawnCount(path, DRAWN)).toBeLessThan(path.steps.length)
  })

  it('never reports a denominator of zero', () => {
    // A path whose drawn count is zero would print `n of 0`, which cannot be
    // true of anybody. Every role must have something to read today.
    for (const path of PATHS) {
      expect(drawnCount(path, DRAWN), path.role).toBeGreaterThan(0)
    }
  })
})

describe('§13.4.1 — order respects the prerequisite graph', () => {
  /**
   * A step may sit before a sheet it depends on ONLY when that sheet is absent
   * from the path — a role that does not need module 2 need not read it before
   * module 3. What must never happen is both present and in the wrong order,
   * because then the path itself tells the reader to read them backwards.
   */
  it('read a prerequisite list for every drawn sheet', () => {
    // If this fails the parse above is broken and the ordering test below is
    // vacuously passing, which is worse than failing.
    const drawn = facts.sheets.filter((sheet) => sheet.drawn).map((sheet) => sheet.module)
    for (const module of drawn) {
      expect(graph.has(module), `module ${module}`).toBe(true)
    }
  })

  it.each(PATHS)('$role places no sheet before a prerequisite it also lists', (path) => {
    const position = new Map(path.steps.map((step, index) => [moduleOf(step.slug), index]))
    const backwards: string[] = []
    for (const step of path.steps) {
      const module = moduleOf(step.slug)
      for (const required of graph.get(module) ?? []) {
        const at = position.get(required)
        if (at !== undefined && at > (position.get(module) ?? 0)) {
          backwards.push(`module ${module} before its prerequisite ${required}`)
        }
      }
    }
    expect(backwards).toEqual([])
  })
})

describe('§13.3 — the roles themselves', () => {
  it('gives every role a path and every path a role', () => {
    expect(ROLES.map((role) => role.id).sort()).toEqual(PATHS.map((path) => path.role).sort())
  })

  it('names a home category that the corpus has', () => {
    const slugs = new Set(facts.categories.map((category) => category.slug))
    for (const role of ROLES) {
      expect(slugs.has(role.homeCategory), `${role.id} → ${role.homeCategory}`).toBe(true)
    }
  })

})
