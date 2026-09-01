import { execFileSync } from 'node:child_process'
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
import {
  countDiagrams,
  countImages,
  extent,
  externalLinks,
} from '@/lib/content/derive'
import { CONTENT_ROOT } from '@/lib/content/paths'
import { stripLeadIn } from '@/lib/content/strip'

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

  it('serves a body with the progress rail and the prev/next furniture gone', () => {
    for (const m of modules) {
      expect(m.body, m.slug).not.toMatch(/^##\s+Tutorial Progress/m)
      expect(m.body, m.slug).not.toMatch(/^\*\*(Previous|Next) Module:\*\*/m)
    }
  })

  it('derives an extent, a sheet format, figures, sources and a language for each', () => {
    // Every one of these bakes in what `derive` computes, so every one is
    // asserted against `derive` computing it. `figures >= 0` and
    // `sources >= 0` — a length sum and a Set size — could never have gone
    // red, and left the two rows the title block prints unverified here.
    for (const m of modules) {
      expect(m.extent, m.slug).toBe(extent(stripLeadIn(m.body)))
      expect(['A0', 'A2', 'A4'], m.slug).toContain(m.sheetFormat)
      expect(m.figures, m.slug).toBe(countDiagrams(m.body) + countImages(m.body))
      expect(m.sources, m.slug).toBe(new Set(externalLinks(m.body)).size)
      expect(['EN', 'EN·TR'], m.slug).toContain(m.lang)
    }
  })

  it('stamps each module with the commit that last touched its own file', () => {
    for (const m of modules) {
      expect(m.revision, m.slug).not.toBeNull()
      expect(m.revision!.hash, m.slug).toMatch(/^[0-9a-f]{7,}$/)
      expect(m.revision!.date, m.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('takes that commit from the file itself, not from repo HEAD', () => {
    const m = loadModule('fundamentals/llms')!
    const git = (args: string[]) =>
      execFileSync('git', ['-C', CONTENT_ROOT, ...args], { encoding: 'utf8' }).trim()
    expect(m.revision!.hash).toBe(git(['log', '-1', '--format=%h', '--', m.filePath]))
    expect(m.revision!.date).toBe(
      git(['log', '-1', '--format=%ad', '--date=short', '--', m.filePath]),
    )
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
