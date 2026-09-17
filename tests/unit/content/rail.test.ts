import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '@/lib/content/curriculum-file'
import { curriculumFacts } from '@/lib/content/facts'
import { railLevels } from '@/lib/content/rail'

/**
 * M10 — the curriculum, shaped for the rail.
 *
 * Every assertion here is a RULE that holds for any curriculum, never a fact
 * about this one (`tests/README.md`). No level count, no module count, no title
 * and no number is written down: each one is compared against the config or
 * against `curriculumFacts()`, which is the same corpus read by a different
 * path. That cross-check is the point — a rail built from a second traversal of
 * the same files can disagree with the one every page already trusts, and this
 * is where it would.
 */
describe('railLevels', () => {
  const levels = railLevels()
  const facts = curriculumFacts()

  it('is every level in the config, in the config’s order', () => {
    expect(levels.map((level) => level.slug)).toEqual(CATEGORIES.map((c) => c.slug))
    expect(levels.map((level) => level.order)).toEqual(CATEGORIES.map((c) => c.order))
    expect(levels.map((level) => level.title)).toEqual(CATEGORIES.map((c) => c.title))
  })

  it('holds every module exactly once, and no others', () => {
    const railed = levels.flatMap((level) => level.modules.map((module) => module.slug))
    expect([...railed].sort()).toEqual(facts.sheets.map((sheet) => sheet.slug).sort())
    // A slug listed twice would pass the set comparison silently.
    expect(railed.length).toBe(facts.sheets.length)
  })

  it('agrees with the facts every other page is built from', () => {
    const byFacts = new Map(facts.sheets.map((sheet) => [sheet.slug, sheet]))
    for (const level of levels) {
      for (const module of level.modules) {
        const fact = byFacts.get(module.slug)
        expect(fact, `${module.slug} is in the rail and not in the facts`).toBeDefined()
        expect(module.module, module.slug).toBe(fact!.module)
        expect(module.title, module.slug).toBe(fact!.title)
        expect(module.drawn, module.slug).toBe(fact!.drawn)
      }
    }
  })

  it('files each module under the level its own slug names', () => {
    for (const level of levels) {
      for (const module of level.modules) {
        expect(module.slug.split('/')[0], module.slug).toBe(level.slug)
      }
    }
  })

  it('walks each level in curriculum order, ascending', () => {
    for (const level of levels) {
      const numbers = level.modules.map((module) => module.module)
      expect(numbers, level.slug).toEqual([...numbers].sort((a, b) => a - b))
    }
  })

  it('gives every module a route that ends in a slash, per trailingSlash', () => {
    for (const level of levels) {
      for (const module of level.modules) {
        expect(module.path, module.slug).toBe(`/courses/${module.slug}/`)
      }
    }
  })

  it('is cached, so a static export renders every page from one traversal', () => {
    expect(railLevels()).toBe(levels)
  })

  /**
   * A level with nothing written still appears, with its own count. The shape
   * of the course is information, and a rail that dropped its empty levels
   * would tell a reader the course was shorter than it is. Stated as a rule
   * over whatever the config holds today rather than as a claim that some level
   * is empty.
   */
  it('keeps a level the config declares even when it holds nothing', () => {
    expect(levels.length).toBe(CATEGORIES.length)
    for (const level of levels) {
      expect(level.modules.length).toBe(
        facts.sheets.filter((sheet) => sheet.category === level.slug).length,
      )
    }
  })
})
