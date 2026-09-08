import { describe, expect, it } from 'vitest'
import { countDiagrams, countImages, countTables } from '@/lib/content/derive'
import { loadAllModules, loadModule } from '@/lib/content/loader'
import { moduleGraph } from '@/lib/content/edges'
import { positionOf, sheetCount } from '@/lib/content/curriculum'
import {
  type SheetFacts,
  eyebrow,
  sheetFacts,
  sheetLabel,
  thousands,
  titleBlockRows,
  titleStripRows,
} from '@/lib/content/title-block'

const DRAWN: SheetFacts = {
  module: 13,
  categoryOrder: 2,
  categoryTitle: 'Intermediate',
  position: { index: 6, of: 8 },
  sheets: 32,
  status: 'ready',
  extent: 4912,
  duration: 30,
  diagrams: 3,
  tables: 2,
  sources: 41,
  requires: [12],
  feeds: [14],
  revision: { hash: 'b7225f8', date: '2026-08-31' },
  lang: 'EN',
}

const NOT_DRAWN: SheetFacts = {
  ...DRAWN,
  module: 20,
  categoryOrder: 3,
  categoryTitle: 'Expert',
  position: { index: 5, of: 9 },
  status: 'draft',
  extent: 92,
  duration: 0,
  diagrams: 0,
  tables: 0,
  sources: 0,
  requires: [],
  feeds: [],
  lang: 'EN',
}

function value(rows: ReturnType<typeof titleBlockRows>, label: string): string | undefined {
  return rows.find((r) => r.label === label)?.value
}

describe('thousands', () => {
  it('groups a four-figure word count', () => {
    expect(thousands(5008)).toBe('5,008')
  })

  it('leaves three figures alone', () => {
    expect(thousands(746)).toBe('746')
  })

  it('does not depend on the machine locale', () => {
    expect(thousands(1234567)).toBe('1,234,567')
  })
})

describe('eyebrow and module label', () => {
  it('states the level, the band and the module in the set', () => {
    expect(eyebrow(DRAWN)).toBe('LEVEL 02 · INTERMEDIATE · MODULE 13 OF 32')
  })

  it('zero-pads the level number', () => {
    expect(eyebrow(NOT_DRAWN)).toBe('LEVEL 03 · EXPERT · MODULE 20 OF 32')
  })

  it('gives the footer its own short form', () => {
    expect(sheetLabel(DRAWN)).toBe('MODULE 13 OF 32')
  })
})

describe('titleBlockRows — the ready module', () => {
  const rows = titleBlockRows(DRAWN)

  it('prints the twelve rows §5.5 names, in order', () => {
    expect(rows.map((r) => r.label)).toEqual([
      'DRAWING', 'LEVEL', 'POSITION', 'LENGTH', 'FIGURES', 'SOURCES',
      'REQUIREMENTS', 'UNLOCKS', 'REVISION', 'DATE', 'LANG', 'MARKED BY',
    ])
  })

  it('zero-pads the drawing number', () => {
    expect(value(rows, 'DRAWING')).toBe('13')
  })

  it('names the level by number and title', () => {
    expect(value(rows, 'LEVEL')).toBe('02 · INTERMEDIATE')
  })

  it('places the module inside its own category', () => {
    expect(value(rows, 'POSITION')).toBe('6 OF 8')
  })

  it('prints extent as measured words and the declared duration', () => {
    expect(value(rows, 'LENGTH')).toBe('4,912 W · 30 MIN')
  })

  it('separates diagrams from tables', () => {
    expect(value(rows, 'FIGURES')).toBe('3 DIAG · 2 TBL')
  })

  it('prints the source count', () => {
    expect(value(rows, 'SOURCES')).toBe('41')
  })

  it('lists dependency edges as module numbers', () => {
    expect(value(rows, 'REQUIREMENTS')).toBe('12')
    expect(value(rows, 'UNLOCKS')).toBe('14')
  })

  it('prints the file revision, not repo HEAD, and its date', () => {
    expect(value(rows, 'REVISION')).toBe('b7225f8')
    expect(value(rows, 'DATE')).toBe('2026-08-31')
  })

  it('keeps the hash in its own case, since .hl-mark uppercases', () => {
    expect(rows.find((r) => r.label === 'REVISION')?.preserveCase).toBe(true)
    expect(rows.find((r) => r.label === 'LENGTH')?.preserveCase).toBeUndefined()
  })

  it('spaces the bilingual value and credits the draughtsman', () => {
    expect(value(titleBlockRows({ ...DRAWN, lang: 'EN·TR' }), 'LANG')).toBe('EN · TR')
    expect(value(rows, 'MARKED BY')).toBe('LKM-01')
  })
})

describe('titleBlockRows — a ready module that cites nothing', () => {
  // Modules 2, 4 and 5 are `status: ready` and carry no external link at all.
  const rows = titleBlockRows({ ...DRAWN, sources: 0, diagrams: 1, tables: 0 })

  it('prints the zero it counted, not the dash that means "nobody counted"', () => {
    expect(value(rows, 'SOURCES')).toBe('0')
  })

  it('prints a figures row with a zero term in it for the same reason', () => {
    expect(value(rows, 'FIGURES')).toBe('1 DIAG · 0 TBL')
  })
})

describe('titleBlockRows — the module that is planned', () => {
  const rows = titleBlockRows(NOT_DRAWN)

  it('has no extent, because there is no drawing to measure', () => {
    expect(value(rows, 'LENGTH')).toBe('—')
  })

  it('dashes every row §4.5 dashes on the draft strip', () => {
    expect(value(rows, 'FIGURES')).toBe('—')
    expect(value(rows, 'SOURCES')).toBe('—')
    expect(value(rows, 'REQUIREMENTS')).toBe('—')
    expect(value(rows, 'UNLOCKS')).toBe('—')
  })

  it('dashes them on status, not on a zero that happens to coincide', () => {
    const counted = titleBlockRows({ ...NOT_DRAWN, diagrams: 2, tables: 1, sources: 9 })
    expect(value(counted, 'FIGURES')).toBe('—')
    expect(value(counted, 'SOURCES')).toBe('—')
  })

  it('prints LANG EN, the value §4.5 item 4 spells out', () => {
    expect(value(rows, 'LANG')).toBe('EN')
  })
})

describe('titleStripRows', () => {
  it('carries the same rows as the block on a ready module', () => {
    expect(titleStripRows(DRAWN)).toEqual(titleBlockRows(DRAWN))
  })

  it('carries the six §4.5 names on a draft module, in that order', () => {
    expect(titleStripRows(NOT_DRAWN).map((r) => r.label)).toEqual([
      'LENGTH', 'FIGURES', 'SOURCES', 'REQUIREMENTS', 'LANG', 'REVISION',
    ])
  })
})

describe('a missing revision', () => {
  it('prints an em dash rather than inventing a commit', () => {
    const rows = titleBlockRows({ ...DRAWN, revision: null })
    expect(value(rows, 'REVISION')).toBe('—')
    expect(value(rows, 'DATE')).toBe('—')
  })
})

describe('moduleFacts, over the real corpus', () => {
  const graph = moduleGraph()
  const facts = (slug: string) => {
    const module = loadModule(slug)
    if (!module) throw new Error(`no module ${slug}`)
    return sheetFacts(module, {
      position: positionOf(slug) ?? { index: 0, of: 0 },
      sheets: sheetCount(),
      requires: graph.requires(module.frontmatter.module),
      feeds: graph.feeds(module.frontmatter.module),
    })
  }

  it('reads every value off the module the loader derived', () => {
    // Against the loader, sheet by sheet, rather than against one sheet's
    // numbers written down here: those move whenever the corpus does.
    for (const sheet of loadAllModules()) {
      const derived = facts(sheet.slug)
      expect(derived.module, sheet.slug).toBe(sheet.frontmatter.module)
      expect(derived.status, sheet.slug).toBe(sheet.frontmatter.status)
      expect(derived.requires, sheet.slug).toEqual(sheet.frontmatter.prerequisites)
      if (sheet.frontmatter.status === 'ready') {
        expect(derived.extent, sheet.slug).toBeGreaterThan(0)
      }
    }
  })

  it('counts tables separately from diagrams', () => {
    const security = loadModule('intermediate/security')!
    expect(facts(security.slug).tables).toBe(countTables(security.body))
    expect(facts(security.slug).diagrams).toBe(countDiagrams(security.body))
  })

  it('keeps images out of the DIAG term §5.5 spells out', () => {
    // Module 6 carries images alongside its diagrams, which is what makes it the
    // sheet worth measuring on. The totals are derived, because they are facts
    // about today's prose; the claim is that the DIAG term counts diagrams only,
    // where the bug reported diagrams plus images under that label.
    const agents = loadModule('fundamentals/agents')!
    const diagrams = countDiagrams(agents.body)
    const tables = countTables(agents.body)
    expect(countImages(agents.body)).toBeGreaterThan(0)
    expect(facts(agents.slug).diagrams).toBe(diagrams)

    const row = titleBlockRows(facts(agents.slug)).find((r) => r.label === 'FIGURES')
    expect(row?.value).toBe(`${diagrams} DIAG · ${tables} TBL`)
  })

  it('prints a FIGURES row no ready module can inflate', () => {
    for (const module of loadAllModules().filter((m) => m.frontmatter.status === 'ready')) {
      const row = titleBlockRows(facts(module.slug)).find((r) => r.label === 'FIGURES')
      expect(row?.value, module.slug)
        .toBe(`${countDiagrams(module.body)} DIAG · ${countTables(module.body)} TBL`)
    }
  })

  it('leaves every draft module with nothing to print but its revision', () => {
    for (const module of loadAllModules().filter((m) => m.sheetFormat === 'A4')) {
      const rows = titleStripRows(facts(module.slug))
      const printed = Object.fromEntries(rows.map((r) => [r.label, r.value]))
      expect(printed.LENGTH, module.slug).toBe('—')
      expect(printed.FIGURES, module.slug).toBe('—')
      expect(printed.SOURCES, module.slug).toBe('—')
    }
  })
})
