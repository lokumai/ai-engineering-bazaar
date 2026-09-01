import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '@/lib/content/categories'
import {
  LANG_DISPLAY,
  TRANSLATION_RATIO,
  countDiagrams,
  countFigures,
  countImages,
  countSources,
  countTables,
  distinctExternalLinks,
  extent,
  externalLinks,
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

/** The extent that module's sheet actually prints. */
function measured(moduleNumber: number): number {
  return byNumber.get(moduleNumber)!.extent
}

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

  it('leaves out the h1 and the dek, which the sheet never renders', () => {
    // §5.5: words "after stripping frontmatter, the dek, and the deleted
    // progress rail". Every file in the corpus opens with an h1, so the
    // printed extent is strictly below a naive count of the served body.
    for (const m of modules) {
      expect(m.extent, m.slug).toBe(extent(stripLeadIn(m.body)))
      expect(m.extent, m.slug).toBeLessThan(extent(m.body))
    }
  })

  /**
   * The 2,500-word threshold is gone with the A2 format (see `SheetFormat`), so
   * this no longer gates a layout. The two bands are still a real fact about the
   * corpus and worth pinning: the long-form modules are 3–6× the short ones, and
   * the day that stops being true the reader's estimated durations are wrong too.
   */
  it('keeps the long-form modules an order of magnitude above the short ones', () => {
    const short = numbers((n) => n <= 7).map(measured)
    const long = numbers((n) => n >= 8 && n <= 15).map(measured)
    expect(Math.min(...short)).toBeGreaterThan(0)
    expect(Math.max(...short)).toBeLessThan(Math.min(...long))
  })

  it('leaves every stub under 200 words', () => {
    for (const n of numbers((n) => n >= 16)) {
      expect(measured(n), `module ${n}`).toBeLessThan(200)
    }
  })

})

describe('sheetFormat', () => {
  /**
   * §4.4 is two anatomies now, and `SheetFormat`'s docblock carries the whole
   * argument: A2 differed from A0 in where the metadata sat and nowhere else,
   * which moved the prose 132px between two sheets of one curriculum, and the
   * single rule that outlived the shared panel — a 720px measure below 1280 —
   * measured 82 characters per line against the 68–72 that 656px was chosen for.
   */
  it('gives every drawn module the same anatomy, whatever its extent', () => {
    expect(sheetFormat({ status: 'ready' }, 12)).toBe('A0')
    expect(sheetFormat({ status: 'ready' }, 2_499)).toBe('A0')
    expect(sheetFormat({ status: 'ready' }, 9_999)).toBe('A0')
  })

  it('gives a draft module the A4 detail sheet whatever its extent', () => {
    expect(sheetFormat({ status: 'draft' }, 12)).toBe('A4')
    expect(sheetFormat({ status: 'draft' }, 9999)).toBe('A4')
  })

  it('sizes the drawing set at 15 drawn sheets and 17 drafts', () => {
    const tally = { A0: 0, A4: 0 }
    for (const m of modules) tally[m.sheetFormat] += 1
    expect(tally).toEqual({ A0: 15, A4: 17 })
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

  it('does not absorb module 6\'s four images into its one diagram', () => {
    expect(countDiagrams(body(6))).toBe(1)
    expect(countImages(body(6))).toBe(4)
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

  it('counts only the openable links on the three sheets that quoted URLs', () => {
    // The three modules where the old regex and the rendered page disagreed.
    expect(countSources(body(10))).toBe(30)
    expect(countSources(body(11))).toBe(15)
    expect(countSources(body(15))).toBe(16)
  })
})

describe('distinctExternalLinks', () => {
  it('keeps one entry per URL, in first-appearance order', () => {
    const md = '[a](https://b.example) [b](https://a.example) [c](https://b.example)'
    expect(distinctExternalLinks(md)).toEqual(['https://b.example', 'https://a.example'])
  })

  it('is empty where the body cites nothing openable', () => {
    expect(distinctExternalLinks('[a](../1_fundamentals/1_llms.md) [b](#section)')).toEqual([])
  })

  it('sees exactly what `externalLinks` sees, and nothing a scraper would add', () => {
    // §12.8 forbids a second URL scraper. Delegating is what keeps the list
    // and the printed count answering the same question: a `curl` target in a
    // fence and a host in backticks are in neither.
    const md = 'Run `curl https://a.example`\n\n```bash\ncurl https://b.example\n```\n\n'
      + '[c](https://c.example) and https://c.example again.'
    expect(distinctExternalLinks(md)).toEqual(['https://c.example'])
  })

  it('is the occurrence list with the repeats removed, on every sheet', () => {
    for (const m of modules) {
      expect(distinctExternalLinks(m.body), m.slug).toEqual([...new Set(externalLinks(m.body))])
      expect(distinctExternalLinks(m.body).length, m.slug)
        .toBeLessThanOrEqual(externalLinks(m.body).length)
    }
  })

  it('agrees with `countSources` sheet by sheet', () => {
    // §12.8: the list a reader is shown and the number beside it must dedupe
    // identically, or the sheet contradicts itself.
    for (const m of modules) {
      expect(distinctExternalLinks(m.body).length, m.slug).toBe(countSources(m.body))
      expect(distinctExternalLinks(m.body).length, m.slug).toBe(m.sources)
    }
  })

  it('cites nothing at all on any of the seventeen undrawn sheets', () => {
    for (const n of numbers((n) => n >= 16)) {
      expect(distinctExternalLinks(body(n)), `module ${n}`).toEqual([])
    }
  })

  it('returns absolute http(s) URLs only, ready to print in full', () => {
    // §12.12.2 prints the full URL so it survives print; nothing here may be
    // a fragment or a relative path.
    for (const m of modules) {
      for (const url of distinctExternalLinks(m.body)) {
        expect(url, `${m.slug}: ${url}`).toMatch(/^https?:\/\/\S+$/)
      }
    }
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
    'marks the draft stubs 16-32 English-only, even though the Turkish stub ' +
    'really is a complete translation of the English one',
    () => {
      // The ratio alone would badge all seventeen: both sides of those pairs
      // are stubs, so the Turkish one clears 40% easily. §4.5 item 4 prints
      // `LANG EN` on the draft strip, §7.6 calls those files placeholders and
      // states the outcome as EN on sheets 8-32, and §11.27 reserves the badge
      // for a real translation. A schedule of parts is not bilingual: there is
      // no drawing yet, in either language.
      for (const n of numbers((n) => n >= 16)) {
        expect(byNumber.get(n)!.frontmatter.status, `module ${n}`).toBe('draft')
        expect(langFromExtents(extent(body(n)), trExtent(n)), `module ${n}`).toBe('EN·TR')
        expect(langCoverage(byNumber.get(n)!.slug), `module ${n}`).toBe('EN')
      }
    },
  )

  it('leaves exactly the seven sheets §7.6 names bilingual', () => {
    expect(modules.filter((m) => m.lang === 'EN·TR').map((m) => m.frontmatter.module))
      .toEqual([1, 2, 3, 4, 5, 6, 7])
  })

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
