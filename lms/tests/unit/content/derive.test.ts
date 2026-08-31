import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '@/lib/content/categories'
import {
  A0_MIN_EXTENT,
  LANG_DISPLAY,
  TRANSLATION_RATIO,
  countDiagrams,
  countFigures,
  countImages,
  countSources,
  countTables,
  extent,
  externalLinks,
  langCoverage,
  langFromExtents,
  sheetFormat,
} from '@/lib/content/derive'
import { loadAllModules } from '@/lib/content/loader'
import { CONTENT_ROOT } from '@/lib/content/paths'
import { stripBuildFurniture } from '@/lib/content/strip'

const modules = loadAllModules()
const byNumber = new Map(modules.map((m) => [m.frontmatter.module, m]))
const numbers = (predicate: (n: number) => boolean) =>
  modules.map((m) => m.frontmatter.module).filter(predicate)

/** The English body of a module, exactly as the loader now serves it. */
function body(moduleNumber: number): string {
  return byNumber.get(moduleNumber)!.body
}

describe('extent', () => {
  it('counts nothing in an empty body', () => {
    expect(extent('')).toBe(0)
    expect(extent('   \n\n  ')).toBe(0)
  })

  it('counts whitespace-separated words', () => {
    expect(extent('one two  three\nfour')).toBe(4)
  })

  it('counts module 1 at its measured extent', () => {
    expect(extent(body(1))).toBe(1122)
  })

  it('puts the eight long-form modules above the A0 threshold', () => {
    for (const n of numbers((n) => n >= 8 && n <= 15)) {
      expect(extent(body(n)), `module ${n}`).toBeGreaterThanOrEqual(A0_MIN_EXTENT)
    }
  })

  it('puts the seven short ready modules below the A0 threshold', () => {
    for (const n of numbers((n) => n <= 7)) {
      const words = extent(body(n))
      expect(words, `module ${n}`).toBeGreaterThan(0)
      expect(words, `module ${n}`).toBeLessThan(A0_MIN_EXTENT)
    }
  })

  it('leaves every stub under 200 words', () => {
    for (const n of numbers((n) => n >= 16)) {
      expect(extent(body(n)), `module ${n}`).toBeLessThan(200)
    }
  })

  it('reproduces the measured band ranges', () => {
    const range = (lo: number, hi: number) => {
      const words = numbers((n) => n >= lo && n <= hi).map((n) => extent(body(n)))
      return [Math.min(...words), Math.max(...words)]
    }
    expect(range(1, 7)).toEqual([621, 1629])
    expect(range(8, 15)).toEqual([3835, 4883])
    expect(range(16, 32)).toEqual([53, 74])
  })
})

describe('sheetFormat', () => {
  it('gives a long ready module the A0 assembly sheet', () => {
    expect(sheetFormat({ status: 'ready' }, A0_MIN_EXTENT)).toBe('A0')
  })

  it('gives a short ready module the A2 part sheet', () => {
    expect(sheetFormat({ status: 'ready' }, A0_MIN_EXTENT - 1)).toBe('A2')
  })

  it('gives a draft module the A4 detail sheet whatever its extent', () => {
    expect(sheetFormat({ status: 'draft' }, 12)).toBe('A4')
    expect(sheetFormat({ status: 'draft' }, 9999)).toBe('A4')
  })

  it('sizes the drawing set at 8 A0, 7 A2 and 17 A4 sheets', () => {
    const tally = { A0: 0, A2: 0, A4: 0 }
    for (const m of modules) tally[m.sheetFormat] += 1
    expect(tally).toEqual({ A0: 8, A2: 7, A4: 17 })
  })

  it('draws modules 8-15 at A0, 1-7 at A2 and 16-32 at A4', () => {
    for (const m of modules) {
      const n = m.frontmatter.module
      const expected = n <= 7 ? 'A2' : n <= 15 ? 'A0' : 'A4'
      expect(m.sheetFormat, `module ${n}`).toBe(expected)
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

  it('finds 21 real figures across the English corpus', () => {
    const total = modules.reduce((sum, m) => sum + countDiagrams(m.body), 0)
    expect(total).toBe(21)
  })
})

describe('countImages', () => {
  it('counts markdown images', () => {
    expect(countImages('![a](a.png)\n\ntext ![b](b.png)\n')).toBe(2)
  })

  it('does not count a plain link', () => {
    expect(countImages('[not an image](a.png)\n')).toBe(0)
  })

  it('finds the corpus 8 images', () => {
    const total = modules.reduce((sum, m) => sum + countImages(m.body), 0)
    expect(total).toBe(8)
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

  it('finds tables in exactly 11 modules', () => {
    const withTables = modules.filter((m) => countTables(m.body) > 0)
    expect(withTables).toHaveLength(11)
  })
})

describe('countFigures', () => {
  it('is the real diagrams plus the images', () => {
    for (const m of modules) {
      expect(countFigures(m.body), m.slug)
        .toBe(countDiagrams(m.body) + countImages(m.body))
    }
  })

  it('counts no figures on any draft stub', () => {
    for (const n of numbers((n) => n >= 16)) {
      expect(countFigures(body(n)), `module ${n}`).toBe(0)
    }
  })

  it('excludes the rail even when handed an unstripped file', () => {
    const raw = fs.readFileSync(
      path.join(CONTENT_ROOT, '1_fundamentals', '1_llms.md'),
      'utf8',
    )
    expect(countFigures(raw)).toBe(countFigures(body(1)))
  })
})

describe('externalLinks / countSources', () => {
  it('finds http and https links', () => {
    expect(externalLinks('see [a](https://a.example) and http://b.example here'))
      .toEqual(['https://a.example', 'http://b.example'])
  })

  it('drops the sentence punctuation a bare link picks up', () => {
    expect(externalLinks('see https://a.example.')).toEqual(['https://a.example'])
  })

  it('ignores relative and anchor links', () => {
    expect(externalLinks('[a](../1_fundamentals/1_llms.md) [b](#section)')).toEqual([])
  })

  it('counts distinct links only', () => {
    expect(countSources('[a](https://x.example) [b](https://x.example)')).toBe(1)
  })

  it('does not count a URL inside a fenced code block', () => {
    // 15_personal_agents.md:107 pipes `curl https://openclaw.ai/install.sh`
    // through a ```bash fence. An install command is not a cited source and
    // there is nothing on the page to click.
    const md = 'Run it:\n\n```bash\ncurl -fsSL https://openclaw.ai/install.sh | sh\n```\n'
    expect(externalLinks(md)).toEqual([])
  })

  it('does not count a URL inside an inline code span', () => {
    // 10_coding_agents_landscape.md:59 writes the installer host in
    // backticks; `unfenced()` would still have counted it, which is why this
    // reads anchors off the parsed tree rather than lines of markdown.
    expect(externalLinks('the host is `https://hermes-agent.example/install.sh`')).toEqual([])
  })

  it('counts the same links the renderer will mark with the external glyph', () => {
    const md = 'A [link](https://a.example), `https://b.example`, and https://c.example.'
    expect(externalLinks(md)).toEqual(['https://a.example', 'https://c.example'])
  })

  it('reproduces the 397 measured link occurrences, 379 of them in modules 8-15', () => {
    const occurrences = (ns: number[]) =>
      ns.reduce((sum, n) => sum + externalLinks(body(n)).length, 0)
    expect(occurrences(numbers(() => true))).toBe(397)
    expect(occurrences(numbers((n) => n >= 8 && n <= 15))).toBe(379)
    expect(occurrences(numbers((n) => n >= 16))).toBe(0)
  })

  it('reproduces 209 distinct sources across the corpus', () => {
    const total = modules.reduce((sum, m) => sum + countSources(m.body), 0)
    expect(total).toBe(209)
  })

  it('counts only the openable links on the three sheets that quoted URLs', () => {
    // The three modules where the old regex and the rendered page disagreed.
    expect(countSources(body(10))).toBe(30)
    expect(countSources(body(11))).toBe(15)
    expect(countSources(body(15))).toBe(16)
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

  it('prints EN · TR spaced, per the title block', () => {
    expect(LANG_DISPLAY['EN·TR']).toBe('EN · TR')
    expect(LANG_DISPLAY.EN).toBe('EN')
    expect(TRANSLATION_RATIO).toBe(0.4)
  })
})

describe('langCoverage', () => {
  it('marks modules 1-7 bilingual — their Turkish is a real translation', () => {
    for (const n of numbers((n) => n <= 7)) {
      expect(langCoverage(byNumber.get(n)!.slug), `module ${n}`).toBe('EN·TR')
    }
  })

  it('marks modules 8-15 English-only — their Turkish is a 50-90 word placeholder', () => {
    for (const n of numbers((n) => n >= 8 && n <= 15)) {
      expect(langCoverage(byNumber.get(n)!.slug), `module ${n}`).toBe('EN')
    }
  })

  it(
    'marks the draft stubs 16-32 bilingual, because their Turkish stubs really are ' +
    'complete translations of a stub — Appendix A says EN here and is wrong',
    () => {
      for (const n of numbers((n) => n >= 16)) {
        const en = extent(body(n))
        const tr = extent(
          stripBuildFurniture(
            fs.readFileSync(
              byNumber.get(n)!.filePath.replace(/\.md$/, '_tr.md'),
              'utf8',
            ).replace(/^---\n[\s\S]*?\n---\n/, ''),
          ),
        )
        expect(tr / en, `module ${n}`).toBeGreaterThanOrEqual(TRANSLATION_RATIO)
        expect(langCoverage(byNumber.get(n)!.slug), `module ${n}`).toBe('EN·TR')
      }
    },
  )

  it('returns EN for a slug no module claims', () => {
    expect(langCoverage('fundamentals/nope')).toBe('EN')
  })

  it('agrees with the value the loader bakes into every module', () => {
    for (const m of modules) expect(m.lang, m.slug).toBe(langCoverage(m.slug))
  })
})

describe('the corpus every derived number is measured from', () => {
  it('still holds 32 English modules and 32 Turkish siblings', () => {
    let en = 0
    let tr = 0
    for (const category of CATEGORIES) {
      for (const f of fs.readdirSync(path.join(CONTENT_ROOT, category.dir))) {
        if (!/^\d+_.+\.md$/.test(f)) continue
        if (f.endsWith('_tr.md')) tr += 1
        else en += 1
      }
    }
    expect({ en, tr }).toEqual({ en: 32, tr: 32 })
  })

  it('still splits 15 ready / 17 draft', () => {
    const ready = modules.filter((m) => m.frontmatter.status === 'ready')
    expect(ready).toHaveLength(15)
    expect(modules).toHaveLength(32)
  })
})
