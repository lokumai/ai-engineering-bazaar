import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { describe, expect, it } from 'vitest'
import { writtenSections } from '@/lib/content/schedule'
import { CATEGORIES } from '@/lib/content/curriculum-file'
import {
  LANG_DISPLAY,
  TRANSLATION_RATIO,
  countDiagrams,
  countFigures,
  countImages,
  countTables,
  extent,
  langCoverage,
  langFromExtents,
  sheetFormat,
} from '@/lib/content/derive'
import { loadAllModules } from '@/lib/content/loader'
import { CONTENT_ROOT } from '@/lib/content/paths'
import { stripBuildFurniture, stripLeadIn } from '@/lib/content/strip'

const modules = loadAllModules()
const byNumber = new Map(modules.map((m) => [m.frontmatter.module, m]))
const numbers = (predicate: (n: number) => boolean) =>
  modules.map((m) => m.frontmatter.module).filter(predicate)

/** The English body of a module, exactly as the loader now serves it. */
function body(moduleNumber: number): string {
  return byNumber.get(moduleNumber)!.body
}

/**
 * Every module the config calls a draft, by number.
 *
 * These three cases used to say `n >= 16`, which was true right up until the
 * Ecosystem sheets were written and modules 25 to 29 stopped being stubs. The
 * number was never the fact being tested; `status` was.
 */
const draftNumbers = () =>
  modules.filter((m) => m.frontmatter.status === 'draft').map((m) => m.frontmatter.module)

/** The Turkish sibling's extent, measured the way the loader measures the English. */
function trExtent(moduleNumber: number): number {
  const file = byNumber.get(moduleNumber)!.filePath.replace(/\.md$/, '_tr.md')
  return extent(stripLeadIn(stripBuildFurniture(matter(fs.readFileSync(file, 'utf8')).content)))
}

describe('extent', () => {
  it('counts nothing in an empty body', () => {
    expect(extent('')).toBe(0)
    expect(extent('   \n\n  ')).toBe(0)
  })

  it('counts whitespace-separated words', () => {
    expect(extent('one two  three\nfour')).toBe(4)
  })

  it('leaves out the h1 and the dek, which the module never renders', () => {
    // §5.5: words "after stripping frontmatter, the dek, and the deleted
    // progress rail". Every file in the corpus opens with an h1, so the
    // printed extent is strictly below a naive count of the served body.
    for (const m of modules) {
      expect(m.extent, m.slug).toBe(extent(stripLeadIn(m.body)))
      expect(m.extent, m.slug).toBeLessThan(extent(m.body))
    }
  })

  /*
   * Removed: "keeps the long-form modules an order of magnitude above the short
   * ones", which asserted max(extent of modules 1-7) < min(extent of the ready
   * modules from 8 up. Its own comment called the two bands "a real fact about
   * the corpus and worth pinning", which is the one thing a test here may not do
   * (`tests/README.md`). It went red when Harness Engineering was written at
   * 2,216 words against a Fundamentals module at 2,468: no defect, just a corpus
   * that no longer sorts into two bands. It also keyed off module numbers, which
   * `curriculum.yaml` now owns.
   */

  /*
   * Removed: "leaves every stub under 200 words". A stub carrying a reference
   * list is still a stub, and `advanced_training.md` had already established
   * that pattern, so the threshold was really measuring how many links an
   * unwritten module happens to cite. It went red when Advanced UI gained
   * thirteen of them at 231 words: no defect, and `CLAUDE.md` names a word
   * count as the first thing an assertion here may not state. What it was
   * reaching for is enforced where it belongs, in `curriculum-file.ts`: a
   * `ready` module needs a summary and minutes above zero, and a draft has
   * neither, so no word count is load-bearing in telling the two apart.
   */

})

describe('sheetFormat', () => {
  /**
   * §4.4 is two anatomies now, and `SheetFormat`'s docblock carries the whole
   * argument: A2 differed from A0 in where the metadata sat and nowhere else,
   * which moved the prose 132px between two sheets of one curriculum, and the
   * single rule that outlived the shared panel — a 720px measure below 1280 —
   * measured 82 characters per line against the 68–72 that 656px was chosen for.
   */
  it('gives every ready module the same anatomy, whatever its extent', () => {
    expect(sheetFormat({ status: 'ready' }, 12)).toBe('A0')
    expect(sheetFormat({ status: 'ready' }, 2_499)).toBe('A0')
    expect(sheetFormat({ status: 'ready' }, 9_999)).toBe('A0')
  })

  it('gives a draft module the A4 detail module whatever its extent', () => {
    expect(sheetFormat({ status: 'draft' }, 12)).toBe('A4')
    expect(sheetFormat({ status: 'draft' }, 9999)).toBe('A4')
  })

  it('follows status and nothing else', () => {
    for (const m of modules) {
      const expected = m.frontmatter.status === 'ready' ? 'A0' : 'A4'
      expect(m.sheetFormat, `module ${m.frontmatter.module}`).toBe(expected)
    }
  })
})

describe('countDiagrams', () => {
  it('counts a mermaid fence', () => {
    expect(countDiagrams('```mermaid\ngraph LR\n  A --> B\n```\n')).toBe(1)
  })

  it('does not count a fence that only mentions mermaid in its body', () => {
    expect(countDiagrams('```text\nmermaid\n```\n')).toBe(0)
  })

  it('does not count the progress rail, which the build deletes', () => {
    const raw = '## Tutorial Progress\n\n```mermaid\ngraph LR\n  A --> B\n```\n'
    expect(countDiagrams(raw)).toBe(0)
  })

  it('counts images and diagrams separately, never summing them', () => {
    // The counts themselves are facts about today's prose, so they are derived.
    // What is asserted is the behaviour the bug had wrong: adding an image must
    // not move the diagram count. Module 6 is the sheet that carries several
    // images alongside its diagrams, so it is the one worth measuring on.
    const raw = body(6)
    const diagrams = countDiagrams(raw)
    expect(countImages(raw)).toBeGreaterThan(0)
    expect(diagrams).toBeGreaterThan(0)
    expect(countDiagrams(`${raw}\n![an extra image](extra.png)\n`)).toBe(diagrams)
  })
})

describe('countImages', () => {
  it('counts markdown images', () => {
    expect(countImages('![a](a.png)\n\ntext ![b](b.png)\n')).toBe(2)
  })

  it('does not count a plain link', () => {
    expect(countImages('[not an image](a.png)\n')).toBe(0)
  })

})

describe('countTables', () => {
  it('counts a pipe table once, not once per row', () => {
    const md = '| a | b |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n'
    expect(countTables(md)).toBe(1)
  })

  it('ignores a delimiter-shaped line inside a code fence', () => {
    expect(countTables('```\n| a | b |\n|---|---|\n```\n')).toBe(0)
  })

})

describe('countFigures', () => {
  it('is the real diagrams plus the images', () => {
    for (const m of modules) {
      expect(countFigures(m.body), m.slug)
        .toBe(countDiagrams(m.body) + countImages(m.body))
    }
  })

  it('counts no figures on a draft stub that has no written sections', () => {
    // D102: a draft may carry sections a written module gave it, and those
    // render with their figures; a bare stub is a sentence and a schedule.
    const stubs = draftNumbers().filter((n) => writtenSections(body(n)) === null)
    expect(stubs.length).toBeGreaterThan(0)
    for (const n of stubs) {
      expect(countFigures(body(n)), `module ${n}`).toBe(0)
    }
  })

  it('excludes the rail even when handed an unstripped file', () => {
    const raw = fs.readFileSync(
      path.join(CONTENT_ROOT, '1_fundamentals', 'llms.md'),
      'utf8',
    )
    expect(countFigures(raw)).toBe(countFigures(body(1)))
  })
})

describe('langFromExtents', () => {
  it('calls a translation real at the 40% threshold', () => {
    expect(langFromExtents(1000, 400)).toBe('EN·TR')
    expect(langFromExtents(1000, 399)).toBe('EN')
  })

  it('calls a missing translation EN', () => {
    expect(langFromExtents(1000, 0)).toBe('EN')
  })

  it('never divides by zero', () => {
    expect(langFromExtents(0, 0)).toBe('EN')
  })

  it('prints EN · TR spaced, per the module info', () => {
    expect(LANG_DISPLAY['EN·TR']).toBe('EN · TR')
    expect(LANG_DISPLAY.EN).toBe('EN')
    expect(TRANSLATION_RATIO).toBe(0.4)
  })
})

describe('langCoverage', () => {
  it('badges a ready module bilingual exactly when its Turkish is a real translation', () => {
    // Which sheets are translated moves every time one of them is, so the set
    // is not listed here. The rule is: a real translation earns the badge and a
    // placeholder does not, and the extents are measured off the files in this
    // file rather than taken from the module.
    for (const n of numbers((n) => byNumber.get(n)!.frontmatter.status === 'ready')) {
      const sheet = byNumber.get(n)!
      expect(langCoverage(sheet.filePath, sheet.frontmatter.status), `module ${n}`)
        .toBe(langFromExtents(extent(body(n)), trExtent(n)))
    }
  })

  it(
    'marks the draft stubs 16-32 English-only, even though the Turkish stub ' +
    'really is a complete translation of the English one',
    () => {
      // The ratio alone would badge all seventeen: both sides of those pairs
      // are stubs, so the Turkish one clears 40% easily. §4.5 item 4 prints
      // `LANG EN` on the draft strip, §7.6 calls those files placeholders and
      // states the outcome as EN on sheets 8-32, and §11.27 reserves the badge
      // for a real translation. A schedule of parts is not bilingual: there is
      // no drawing yet, in either language.
      for (const n of draftNumbers()) {
        expect(langFromExtents(extent(body(n)), trExtent(n)), `module ${n}`).toBe('EN·TR')
        expect(
          langCoverage(byNumber.get(n)!.filePath, 'draft'),
          `module ${n}`,
        ).toBe('EN')
      }
    },
  )

  it('leaves every draft module English-only, however its Turkish measures', () => {
    // The general form of the 16-32 case above: a schedule of parts is not a
    // drawing in either language, so no draft sheet may carry the badge.
    for (const m of modules.filter((sheet) => sheet.lang === 'EN·TR')) {
      expect(m.frontmatter.status, m.slug).toBe('ready')
    }
  })

  it('returns EN for a file that is not there', () => {
    // A file with no words has no ratio, and refusing the badge is the honest
    // answer. It takes a status now, so this can no longer be reached with a
    // slug nothing claims.
    expect(langCoverage('/nowhere/nope.md', 'ready')).toBe('EN')
  })

  it('agrees with the value the loader bakes into every module', () => {
    for (const m of modules) {
      expect(m.lang, m.slug).toBe(langCoverage(m.filePath, m.frontmatter.status))
    }
  })
})

