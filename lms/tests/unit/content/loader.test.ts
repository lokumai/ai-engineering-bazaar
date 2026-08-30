import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATEGORIES, type CategorySlug, categoryBySlug } from '@/lib/content/categories'
import {
  assertCategoryMatchesDirectory,
  loadAllModules,
  loadCategoryIntro,
  loadModule,
} from '@/lib/content/loader'
import { CONTENT_ROOT } from '@/lib/content/paths'

describe('loadAllModules', () => {
  const modules = loadAllModules()

  it('finds every module in the curriculum', () => {
    expect(modules).toHaveLength(32)
  })

  it('assigns each module a unique full slug', () => {
    const slugs = modules.map((m) => m.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('assigns each module a unique module number', () => {
    const numbers = modules.map((m) => m.frontmatter.module)
    expect(new Set(numbers).size).toBe(numbers.length)
  })

  it('returns modules in curriculum order', () => {
    const numbers = modules.map((m) => m.frontmatter.module)
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b))
  })

  it('places each module in the category its directory implies', () => {
    for (const m of modules) {
      expect(m.frontmatter.category).toBe(m.category.slug)
    }
  })

  it('marks modules 1 through 15 as ready', () => {
    const ready = modules.filter((m) => m.frontmatter.status === 'ready')
    expect(ready.map((m) => m.frontmatter.module)).toEqual(
      Array.from({ length: 15 }, (_, i) => i + 1),
    )
  })

  it('references only real modules in prerequisites', () => {
    const known = new Set(modules.map((m) => m.frontmatter.module))
    for (const m of modules) {
      for (const p of m.frontmatter.prerequisites) {
        expect(known.has(p), `${m.slug} requires missing module ${p}`).toBe(true)
      }
    }
  })

  it('never lists a prerequisite that comes later in the curriculum', () => {
    for (const m of modules) {
      for (const p of m.frontmatter.prerequisites) {
        expect(p).toBeLessThan(m.frontmatter.module)
      }
    }
  })

  it('strips frontmatter out of the body', () => {
    const m = loadModule('fundamentals/llms')!
    expect(m.body.startsWith('---')).toBe(false)
    expect(m.body).toContain('# Module 1')
  })

  it('ignores Turkish translations', () => {
    expect(modules.some((m) => m.filePath.endsWith('_tr.md'))).toBe(false)
  })
})

describe('loadModule', () => {
  it('finds a module by its full slug', () => {
    expect(loadModule('intermediate/loop-engineering')?.frontmatter.module).toBe(14)
  })

  it('returns undefined for an unknown slug', () => {
    expect(loadModule('fundamentals/nope')).toBeUndefined()
  })
})

describe('loadCategoryIntro', () => {
  it('returns each category its own README, not just any README', () => {
    for (const category of CATEGORIES) {
      expect(loadCategoryIntro(category.slug)).toBe(
        fs.readFileSync(
          path.join(CONTENT_ROOT, category.dir, 'README.md'),
          'utf8',
        ).trimStart(),
      )
    }
  })

  it('opens the body with the category heading, not with frontmatter', () => {
    for (const category of CATEGORIES) {
      expect(loadCategoryIntro(category.slug)?.split('\n')[0])
        .toBe(`# ${category.title}`)
    }
  })

  it('returns null for a slug no category claims', () => {
    expect(loadCategoryIntro('wizardry' as CategorySlug)).toBeNull()
  })
})

describe('assertCategoryMatchesDirectory', () => {
  const expert = categoryBySlug('expert')!

  it('accepts a module whose frontmatter agrees with its directory', () => {
    expect(() =>
      assertCategoryMatchesDirectory('expert', expert, '3_expert/16_advanced_ui.md'),
    ).not.toThrow()
  })

  it('rejects a module filed under the wrong directory, naming both sides', () => {
    expect(() =>
      assertCategoryMatchesDirectory('fundamentals', expert, '3_expert/16_advanced_ui.md'),
    ).toThrow(/3_expert\/16_advanced_ui\.md.*"fundamentals".*"expert"/s)
  })
})
