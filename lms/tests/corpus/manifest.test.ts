import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '@/lib/content/categories'
import { sheetPath } from '@/lib/content/curriculum'
import { loadAllModules } from '@/lib/content/loader'
import {
  categoryEyebrow,
  categoryRows,
  categorySummary,
  setSummary,
  sheetRows,
} from '@/lib/content/manifest'

/**
 * The manifest, against the whole drawing set. A row model that works on a
 * fixture and lies about the corpus is the failure this file exists to catch.
 */

const modules = loadAllModules()
const rows = sheetRows()

describe('§4.8 — the index table lists the set, and only the set', () => {
  it('has one row per module file, at that module\'s own route', () => {
    expect(rows).toHaveLength(modules.length)
    for (const sheet of modules) {
      const row = rows.find((candidate) => candidate.module === sheet.frontmatter.module)
      expect(row?.path, sheet.slug).toBe(sheetPath(sheet))
      expect(row?.title, sheet.slug).toBe(sheet.frontmatter.title)
    }
  })

  it('dashes exactly the seventeen sheets that are not drawn', () => {
    const dashed = rows.filter((row) => !row.drawn)
    expect(dashed.map((row) => row.module)).toEqual(
      Array.from({ length: 17 }, (_, i) => i + 16),
    )
    for (const row of dashed) expect(row.status, row.title).toBe('NOT DRAWN')
  })

  it('states an extent for every drawn sheet and for no other', () => {
    for (const row of rows) {
      if (row.drawn) expect(row.extent, row.title).toMatch(/^[\d,]+ W · \d+ MIN$/)
      else expect(row.extent, row.title).toBe('—')
    }
  })

  it('never prints a zero where it means "nobody counted this"', () => {
    for (const row of rows) {
      expect(row.sources, row.title).not.toBe('0')
      expect(row.requires, row.title).not.toBe('')
    }
  })

  it('agrees with the frontmatter about every prerequisite it prints', () => {
    for (const sheet of modules) {
      const row = rows.find((r) => r.module === sheet.frontmatter.module)!
      const declared = [...sheet.frontmatter.prerequisites].sort((a, b) => a - b)
      expect(row.requires, sheet.slug)
        .toBe(declared.length === 0 ? '—' : declared.join(', '))
    }
  })

  it('counts the set from the set: fifteen of thirty-two drawn', () => {
    expect(setSummary()).toEqual({ sheets: 32, drawn: 15, notDrawn: 17, minutes: 400 })
  })
})

describe('§4.9 — every subsystem states its own coverage', () => {
  it('partitions the set: every sheet in exactly one subsystem', () => {
    const listed = CATEGORIES.flatMap((category) => categoryRows(category))
    expect(listed.map((row) => row.module).sort((a, b) => a - b))
      .toEqual(rows.map((row) => row.module))
  })

  it('counts each subsystem against Appendix A', () => {
    const sizes = CATEGORIES.map((category) => categorySummary(category).sheets)
    expect(sizes).toEqual([7, 8, 9, 5, 1, 2])
  })

  it('writes an eyebrow that names the subsystem and its coverage', () => {
    for (const category of CATEGORIES) {
      expect(categoryEyebrow(category), category.slug)
        .toMatch(/^SUBSYSTEM \d\d · \d+ SHEETS? · \d+ DRAWN/)
    }
  })

  it('gives every sheet in the set something to print in TOPICS', () => {
    // A drawn sheet has Roman-numeral sections; a stub has a schedule of
    // parts. There is no sheet in this corpus with neither, so the column
    // never falls back to an empty cell.
    for (const row of rows) {
      expect(row.topics.length, `${row.number} ${row.title}`).toBeGreaterThan(0)
      expect(row.topics.length, `${row.number} ${row.title}`).toBeLessThanOrEqual(3)
    }
  })
})
