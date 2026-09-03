import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CategorySlug } from '@/lib/content/categories'
import { CATEGORIES } from '@/lib/content/curriculum-file'
import { fileFor, loadAllModules, loadCategoryIntro, loadModule } from '@/lib/content/loader'
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

  it('places each module in the category the curriculum lists it under', () => {
    for (const m of modules) {
      expect(m.frontmatter.category).toBe(m.category.slug)
    }
  })

  it('numbers the modules from one, in curriculum order, with no gaps', () => {
    // The number is the position, produced in one place. This is the assertion
    // that says so: it cannot hold if anything else is also computing it.
    expect(modules.map((m) => m.frontmatter.module))
      .toEqual(modules.map((_, index) => index + 1))
  })

  it('marks a leading run of modules ready, and nothing after it', () => {
    // How far the drawn run reaches moves as sheets are written, so the run is
    // measured rather than pinned: what must hold is that it has no holes.
    const ready = modules.filter((m) => m.frontmatter.status === 'ready')
      .map((m) => m.frontmatter.module)
    expect(ready.length).toBeGreaterThan(0)
    expect(ready).toEqual(Array.from({ length: ready.length }, (_, i) => i + 1))
  })

  it('references only real modules in prerequisites', () => {
    const known = new Set(modules.map((m) => m.frontmatter.module))
    for (const m of modules) {
      for (const p of m.frontmatter.prerequisites) {
        expect(known.has(p), `${m.slug} requires missing module ${p}`).toBe(true)
      }
    }
  })

  it('lists prerequisites ascending, whatever order the yaml names them in', () => {
    // `curriculum.yaml` names prerequisites, and an author writes the names in
    // whatever order reads best. Everything downstream treats the numbers as a
    // sorted set (`edges.ts` sorts them, `title-block.ts` sorts them), so this
    // is the one place the order is settled. Reordering two adjacent modules in
    // the yaml is what surfaced the disagreement.
    for (const m of modules) {
      expect([...m.frontmatter.prerequisites], m.slug)
        .toEqual([...m.frontmatter.prerequisites].sort((a, b) => a - b))
    }
  })

  it('never lists a prerequisite that comes later in the curriculum', () => {
    for (const m of modules) {
      for (const p of m.frontmatter.prerequisites) {
        expect(p).toBeLessThan(m.frontmatter.module)
      }
    }
  })

  it('strips frontmatter out of the body, leaving the h1 first', () => {
    // The h1 is the title alone now: the number is the position and lives in
    // `curriculum.yaml`. So this checks the shape rather than the words, which
    // is what makes it survive a retitle.
    for (const m of modules) {
      expect(m.body.startsWith('---'), m.slug).toBe(false)
      expect(m.body.split('\n')[0], m.slug).toMatch(/^# \S/)
      expect(m.body.split('\n')[0], m.slug).not.toMatch(/^# (?:Module|Modül) \d/)
    }
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
    const sheet = loadModule('intermediate/loop-engineering')
    expect(sheet?.slug).toBe('intermediate/loop-engineering')
    expect(sheet?.frontmatter.module).toBeGreaterThan(0)
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

/**
 * `assertCategoryMatchesDirectory` is gone, and so is the pair of cases that
 * covered it. It checked that a module's declared `category` agreed with the
 * directory it sat in; the category is now the yaml section a module is listed
 * under, so the disagreement it guarded against is no longer expressible.
 */
describe('fileFor', () => {
  it('finds the file for every module the curriculum lists', () => {
    for (const category of CATEGORIES) {
      for (const module of category.modules) {
        expect(fs.existsSync(fileFor(category.dir, module.name)), module.name).toBe(true)
      }
    }
  })

  it('throws for a name no file answers to, naming both the name and the directory', () => {
    expect(() => fileFor('1_fundamentals', 'wizardry')).toThrow(/wizardry.*1_fundamentals/s)
  })
})
