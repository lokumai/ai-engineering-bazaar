import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import type { CategorySlug } from '@/lib/content/categories'
import { CATEGORIES } from '@/lib/content/curriculum-file'
import { TRANSLATED_LANGS } from '@/lib/content/languages'
import {
  fileFor,
  loadAllModules,
  loadCategoryIntro,
  loadModule,
  loadModuleIn,
  readTranslationFile,
} from '@/lib/content/loader'
import {
  countDiagrams,
  countImages,
  extent,
} from '@/lib/content/derive'
import { CONTENT_ROOT } from '@/lib/content/paths'
import { HASH_WIDTH } from '@/lib/content/revision'
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

  it('marks some modules ready, and every one of them is really written', () => {
    // This used to require the ready modules to be a run from 1 with no holes,
    // on the assumption that the course gets written front to back. It does
    // not: Ecosystem was written while Expert was still stubs, so 1-14 and
    // 25-29 are ready with a gap between. The position was never the point.
    //
    // What does have to hold is the pair of rules either side of `status`: a
    // stub stays under 200 words (`derive.test.ts`), and anything calling
    // itself ready is past that, so the flag and the file cannot disagree.
    const ready = modules.filter((m) => m.frontmatter.status === 'ready')
    expect(ready.length).toBeGreaterThan(0)
    for (const m of ready) {
      expect(m.extent, `${m.slug} claims ready`).toBeGreaterThan(200)
    }
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

  it('ignores Persian translations, too: a translation is never a module of its own', () => {
    expect(modules.some((m) => m.filePath.endsWith('_fa.md'))).toBe(false)
  })

  /**
   * M28 — `translation` is Turkish's own name and `translations.tr` is the same
   * body; two fields that could disagree would be two rules.
   */
  it('reads Turkish once, under both names', () => {
    for (const m of modules) expect(m.translations.tr, m.slug).toBe(m.translation)
  })

  it('has no translation of a draft in any language', () => {
    for (const m of modules.filter((one) => one.frontmatter.status === 'draft')) {
      for (const [lang, body] of Object.entries(m.translations)) expect(body, `${m.slug} ${lang}`).toBeNull()
    }
  })

  it('serves a translated module in its language, titled from its own body, and no other', () => {
    for (const lang of TRANSLATED_LANGS) {
      const translated = modules.filter((m) => m.translations[lang] !== null)
      expect(translated.length, lang).toBeGreaterThan(0)
      for (const m of modules) {
        const read = loadModuleIn(m.slug, lang)
        if (m.translations[lang] === null) {
          expect(read, `${m.slug} ${lang}`).toBeUndefined()
          continue
        }
        expect(read!.body, `${m.slug} ${lang}`).toBe(m.translations[lang])
        expect(`# ${read!.frontmatter.title}`, `${m.slug} ${lang}`)
          .toBe(read!.body.split('\n')[0])
      }
    }
  })

  it('serves a body with the progress rail and the prev/next furniture gone', () => {
    for (const m of modules) {
      expect(m.body, m.slug).not.toMatch(/^##\s+Tutorial Progress/m)
      expect(m.body, m.slug).not.toMatch(/^\*\*(Previous|Next) Module:\*\*/m)
    }
  })

  it('derives an extent, a module format, figures and a language for each', () => {
    // Every one of these bakes in what `derive` computes, so every one is
    // asserted against `derive` computing it: `figures >= 0`, a length sum,
    // could never have gone red.
    for (const m of modules) {
      expect(m.extent, m.slug).toBe(extent(stripLeadIn(m.body)))
      expect(['A0', 'A2', 'A4'], m.slug).toContain(m.sheetFormat)
      expect(m.figures, m.slug).toBe(countDiagrams(m.body) + countImages(m.body))
      expect(['EN', 'EN·TR'], m.slug).toContain(m.lang)
    }
  })

  it('takes that commit from the file itself, not from repo HEAD', () => {
    const m = loadModule('fundamentals/llms')!
    const git = (args: string[]) =>
      execFileSync('git', ['-C', CONTENT_ROOT, ...args], { encoding: 'utf8' }).trim()
    expect(m.revision!.hash).toBe(git(['log', '-1', '--format=%H', '--', m.filePath]).slice(0, HASH_WIDTH))
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

/**
 * A translation's `objectives` frontmatter, through the loader's own read of a
 * translation file. The files are written to a temp directory and are made up;
 * the corpus checks below hold for any content.
 */
describe('readTranslationFile', () => {
  const english = ['One', 'Two']
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bazaar-objectives-'))
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }))
  const write = (name: string, text: string) => {
    const file = path.join(dir, name)
    fs.writeFileSync(file, text)
    return file
  }

  it('reads the objectives out of the frontmatter and leaves the body without it', () => {
    const file = write('a_tr.md', '---\nobjectives:\n  - "Bir"\n  - "İki"\n---\n\n# Başlık\n\nMetin.\n')
    const read = readTranslationFile(file, 'a_tr.md', english)!
    expect(read.objectives).toEqual(['Bir', 'İki'])
    expect(read.text.startsWith('# Başlık')).toBe(true)
  })

  it('falls back to no objectives when the file has no frontmatter', () => {
    const read = readTranslationFile(write('b_tr.md', '# Başlık\n\nMetin.\n'), 'b_tr.md', english)!
    expect(read.objectives).toBeNull()
    expect(read.text.startsWith('# Başlık')).toBe(true)
  })

  it('is null for a file that is not there', () => {
    expect(readTranslationFile(path.join(dir, 'none_tr.md'), 'none_tr.md', english)).toBeNull()
  })

  it('rejects another key, whatever the extent of the file', () => {
    const file = write('c_tr.md', '---\nsummary: "Özet"\nobjectives:\n  - "Bir"\n  - "İki"\n---\n\n# Başlık\n')
    expect(() => readTranslationFile(file, 'c_tr.md', english)).toThrow(/c_tr\.md[\s\S]*summary/)
  })

  it('rejects a count that differs from the English file\'s', () => {
    const file = write('d_fa.md', '---\nobjectives:\n  - "یک"\n---\n\n# عنوان\n')
    expect(() => readTranslationFile(file, 'd_fa.md', english)).toThrow(/d_fa\.md[\s\S]*has 1/)
  })
})

describe('translated objectives, across the corpus', () => {
  const modules = loadAllModules()

  it('are the same count as the English list wherever a translation declares them', () => {
    for (const m of modules) {
      for (const lang of TRANSLATED_LANGS) {
        const own = m.objectivesIn[lang]
        if (own !== null) expect(own.length, `${m.slug} ${lang}`).toBe(m.frontmatter.objectives.length)
      }
    }
  })

  it('are what a translated page reads, marked with its language, and the English list is the fallback marked en', () => {
    let translated = 0
    let fallback = 0
    for (const m of modules) {
      for (const lang of TRANSLATED_LANGS) {
        const read = loadModuleIn(m.slug, lang)
        if (read === undefined) continue
        const own = m.objectivesIn[lang]
        if (own === null) {
          fallback++
          expect(read.frontmatter.objectives, `${m.slug} ${lang}`).toEqual(m.frontmatter.objectives)
          expect(read.objectivesLang, `${m.slug} ${lang}`).toBe('en')
        } else {
          translated++
          expect(read.frontmatter.objectives, `${m.slug} ${lang}`).toEqual(own)
          expect(read.objectivesLang, `${m.slug} ${lang}`).toBe(lang)
        }
      }
    }
    // Non-vacuity of the pair: some page is checked on at least one branch.
    expect(translated + fallback).toBeGreaterThan(0)
  })

  it('leave the English page and the summary alone', () => {
    for (const m of modules) {
      expect(loadModuleIn(m.slug, 'en')!.objectivesLang).toBe('en')
      for (const lang of TRANSLATED_LANGS) {
        const read = loadModuleIn(m.slug, lang)
        if (read) expect(read.frontmatter.summary, `${m.slug} ${lang}`).toBe(m.frontmatter.summary)
      }
    }
  })

  it('holds for the For Everyone track too', () => {
    for (const m of modules) {
      if (m.everyone === null) continue
      for (const lang of TRANSLATED_LANGS) {
        const own = m.everyone.objectivesIn[lang]
        if (own !== null) expect(own.length, `${m.slug} everyone ${lang}`).toBe(m.everyone.objectives.length)
        const read = loadModuleIn(m.slug, lang, 'everyone')
        if (!read) continue
        expect(read.frontmatter.objectives, `${m.slug} everyone ${lang}`).toEqual(own ?? m.everyone.objectives)
        expect(read.objectivesLang, `${m.slug} everyone ${lang}`).toBe(own === null ? 'en' : lang)
      }
    }
  })
})
