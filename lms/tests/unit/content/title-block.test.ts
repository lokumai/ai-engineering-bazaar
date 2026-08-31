import { describe, expect, it } from 'vitest'
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
  lang: 'EN·TR',
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

describe('eyebrow and sheet label', () => {
  it('states the subsystem, the band and the sheet in the set', () => {
    expect(eyebrow(DRAWN)).toBe('SUBSYSTEM 02 · INTERMEDIATE · SHEET 13 OF 32')
  })

  it('zero-pads the subsystem number', () => {
    expect(eyebrow(NOT_DRAWN)).toBe('SUBSYSTEM 03 · EXPERT · SHEET 20 OF 32')
  })

  it('gives the footer its own short form', () => {
    expect(sheetLabel(DRAWN)).toBe('SHEET 13 OF 32')
  })
})

describe('titleBlockRows — the drawn sheet', () => {
  const rows = titleBlockRows(DRAWN)

  it('prints the twelve rows §5.5 names, in order', () => {
    expect(rows.map((r) => r.label)).toEqual([
      'DRAWING', 'SUBSYSTEM', 'POSITION', 'EXTENT', 'FIGURES', 'SOURCES',
      'REQUIRES', 'FEEDS', 'REVISION', 'DATE', 'LANG', 'DRAWN BY',
    ])
  })

  it('zero-pads the drawing number', () => {
    expect(value(rows, 'DRAWING')).toBe('13')
  })

  it('names the subsystem by number and title', () => {
    expect(value(rows, 'SUBSYSTEM')).toBe('02 · INTERMEDIATE')
  })

  it('places the sheet inside its own category', () => {
    expect(value(rows, 'POSITION')).toBe('6 OF 8')
  })

  it('prints extent as measured words and the declared duration', () => {
    expect(value(rows, 'EXTENT')).toBe('4,912 W · 30 MIN')
  })

  it('separates diagrams from tables', () => {
    expect(value(rows, 'FIGURES')).toBe('3 DIAG · 2 TBL')
  })

  it('prints the source count', () => {
    expect(value(rows, 'SOURCES')).toBe('41')
  })

  it('lists dependency edges as module numbers', () => {
    expect(value(rows, 'REQUIRES')).toBe('12')
    expect(value(rows, 'FEEDS')).toBe('14')
  })

  it('prints the file revision, not repo HEAD, and its date', () => {
    expect(value(rows, 'REVISION')).toBe('b7225f8')
    expect(value(rows, 'DATE')).toBe('2026-08-31')
  })

  it('keeps the hash in its own case, since .hl-mark uppercases', () => {
    expect(rows.find((r) => r.label === 'REVISION')?.preserveCase).toBe(true)
    expect(rows.find((r) => r.label === 'EXTENT')?.preserveCase).toBeUndefined()
  })

  it('spaces the bilingual value and credits the draughtsman', () => {
    expect(value(titleBlockRows({ ...DRAWN, lang: 'EN·TR' }), 'LANG')).toBe('EN · TR')
    expect(value(rows, 'DRAWN BY')).toBe('LKM-01')
  })
})

describe('titleBlockRows — the sheet that is not drawn', () => {
  const rows = titleBlockRows(NOT_DRAWN)

  it('has no extent, because there is no drawing to measure', () => {
    expect(value(rows, 'EXTENT')).toBe('—')
  })

  it('prints an em dash for every count that is zero', () => {
    expect(value(rows, 'FIGURES')).toBe('—')
    expect(value(rows, 'SOURCES')).toBe('—')
    expect(value(rows, 'REQUIRES')).toBe('—')
    expect(value(rows, 'FEEDS')).toBe('—')
  })

  it('still prints the language it really has', () => {
    expect(value(rows, 'LANG')).toBe('EN · TR')
  })
})

describe('titleStripRows', () => {
  it('carries the same rows as the block on a drawn sheet', () => {
    expect(titleStripRows(DRAWN)).toEqual(titleBlockRows(DRAWN))
  })

  it('carries the six §4.5 names on a draft sheet, in that order', () => {
    expect(titleStripRows(NOT_DRAWN).map((r) => r.label)).toEqual([
      'EXTENT', 'FIGURES', 'SOURCES', 'REQUIRES', 'LANG', 'REVISION',
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

describe('sheetFacts, over the real corpus', () => {
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
    const security = facts('intermediate/security')
    expect(security.module).toBe(13)
    expect(security.categoryOrder).toBe(2)
    expect(security.status).toBe('ready')
    expect(security.extent).toBeGreaterThan(2500)
    expect(security.sources).toBeGreaterThan(0)
    expect(security.requires).toEqual([12])
  })

  it('counts tables separately from diagrams', () => {
    const security = facts('intermediate/security')
    expect(security.tables).toBeGreaterThan(0)
    expect(security.diagrams).toBe(loadModule('intermediate/security')?.figures)
  })

  it('leaves every draft sheet with nothing to print but its revision', () => {
    for (const module of loadAllModules().filter((m) => m.sheetFormat === 'A4')) {
      const rows = titleStripRows(facts(module.slug))
      const printed = Object.fromEntries(rows.map((r) => [r.label, r.value]))
      expect(printed.EXTENT, module.slug).toBe('—')
      expect(printed.FIGURES, module.slug).toBe('—')
      expect(printed.SOURCES, module.slug).toBe('—')
    }
  })
})
