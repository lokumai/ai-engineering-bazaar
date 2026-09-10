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

    expect(facts(agents.slug).tables).toBe(tables)
  })

  /*
    The same claim over every ready module, which is what makes it a rule about
    the counter rather than a fact about one module's prose. It used to compare
    a rendered `n DIAG · m TBL` row; that row went with the instrument panel in
    stage 5, and the counter it was reading is what mattered.
  */
  it('counts diagrams and tables separately for every ready module', () => {
    for (const module of loadAllModules().filter((m) => m.frontmatter.status === 'ready')) {
      expect(facts(module.slug).diagrams, module.slug).toBe(countDiagrams(module.body))
      expect(facts(module.slug).tables, module.slug).toBe(countTables(module.body))
    }
  })

  /*
    A draft module declares no reading time, and the counters say so rather
    than inventing one.

    THIS USED TO CLAIM MORE, and the more was a rendering rule rather than a
    fact: the retired strip printed an em dash for LENGTH, FIGURES and SOURCES
    on every A4 module whatever the counters held. Re-expressing it against the
    counters caught that — a draft measured 4 sources, because a draft may
    perfectly well cite something. The suppression went with the strip; what is
    left is the part the curriculum validator also enforces, from the other
    side, by refusing a `ready` module with a duration of zero.
  */
  it('leaves every draft module with no reading time to report', () => {
    for (const module of loadAllModules().filter((m) => m.sheetFormat === 'A4')) {
      expect(facts(module.slug).duration, module.slug).toBe(0)
    }
  })
})
