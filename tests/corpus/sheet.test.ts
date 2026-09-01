import { describe, expect, it } from 'vitest'
import { moduleGraph } from '@/lib/content/edges'
import {
  curriculum,
  moduleByNumber,
  neighbours,
  positionOf,
  sheetCount,
  sheetPath,
} from '@/lib/content/curriculum'
import { loadAllModules } from '@/lib/content/loader'
import { scheduleOfParts, summarySentence } from '@/lib/content/schedule'
import {
  eyebrow,
  sheetFacts,
  titleBlockRows,
  titleStripRows,
} from '@/lib/content/title-block'

/**
 * The sheet, across the whole drawing set. A transform that works on a fixture
 * and fails on the content is the failure this file exists to catch.
 */

const modules = loadAllModules()
const graph = moduleGraph()
const sheets = sheetCount()

function factsFor(slug: string) {
  const module = modules.find((m) => m.slug === slug)
  if (!module) throw new Error(`no module ${slug}`)
  const position = positionOf(slug)
  if (!position) throw new Error(`no position for ${slug}`)
  return sheetFacts(module, {
    position,
    sheets,
    requires: graph.requires(module.frontmatter.module),
    feeds: graph.feeds(module.frontmatter.module),
  })
}

describe('§4.4 — the format each sheet is drawn on', () => {

  it('follows from status alone, never from extent and never from a hand override', () => {
    for (const m of modules) {
      // Extent is deliberately not consulted. It was, and the threshold it fed
      // is gone; asserting against it here would resurrect the split in a test.
      const expected = m.frontmatter.status === 'draft' ? 'A4' : 'A0'
      expect(m.sheetFormat, m.slug).toBe(expected)
    }
  })
})

describe('§5.5 — the header block, on all thirty-two sheets', () => {
  it('prints a value in every row, and never an empty one', () => {
    for (const m of modules) {
      for (const row of titleBlockRows(factsFor(m.slug))) {
        expect(row.value.trim(), `${m.slug} / ${row.label}`).not.toBe('')
      }
    }
  })

  it('gives every drawn sheet a real extent and every draft an em dash', () => {
    for (const m of modules) {
      const extent = titleBlockRows(factsFor(m.slug))
        .find((r) => r.label === 'EXTENT')?.value
      if (m.frontmatter.status === 'draft') expect(extent, m.slug).toBe('—')
      else expect(extent, m.slug).toMatch(/^[\d,]+ W · \d+ MIN$/)
    }
  })

  it('states the subsystem, the band and the sheet in every eyebrow', () => {
    for (const m of modules) {
      expect(eyebrow(factsFor(m.slug)), m.slug).toMatch(
        new RegExp(`^SUBSYSTEM \\d{2} · [A-Z &]+ · SHEET ${m.frontmatter.module} OF ${sheetCount()}$`),
      )
    }
  })

  it('cuts the draft strip to the six rows §4.5 names', () => {
    for (const m of modules.filter((x) => x.sheetFormat === 'A4')) {
      expect(titleStripRows(factsFor(m.slug)).map((r) => r.label), m.slug).toEqual(
        ['EXTENT', 'FIGURES', 'SOURCES', 'REQUIRES', 'LANG', 'REVISION'],
      )
    }
  })
})

describe('§4.6 — the dependency block resolves', () => {
  it('can link every edge it prints', () => {
    for (const m of modules) {
      const n = m.frontmatter.module
      for (const edge of [...graph.requires(n), ...graph.feeds(n), ...graph.seeAlso(n)]) {
        const target = moduleByNumber(edge)
        expect(target, `${m.slug} -> ${edge}`).toBeDefined()
        expect(sheetPath(target!)).toMatch(/^\/courses\/[a-z-]+\/[a-z0-9-]+\/$/)
      }
    }
  })

})

describe('§5.7 — the chain', () => {
  it('walks all thirty-two sheets, crossing every category boundary', () => {
    const order: number[] = []
    const bands: string[] = []
    let current = curriculum()[0].modules[0]
    for (;;) {
      order.push(current.frontmatter.module)
      if (bands.at(-1) !== current.category.slug) bands.push(current.category.slug)
      const next = neighbours(current.slug).next
      if (!next) break
      current = next
    }
    expect(order).toEqual(Array.from({ length: sheetCount() }, (_, i) => i + 1))
    expect(bands).toEqual([
      'fundamentals', 'intermediate', 'expert', 'ecosystem', 'protocols', 'optional',
    ])
  })

  it('ends the set at both ends rather than wrapping', () => {
    expect(neighbours('fundamentals/llms').previous).toBeNull()
    expect(neighbours('optional/runtime').next).toBeNull()
  })
})
