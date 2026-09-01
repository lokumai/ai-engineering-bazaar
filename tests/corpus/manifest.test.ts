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

  it('states an extent for every drawn sheet and for no other', () => {
    for (const row of rows) {
      if (row.drawn) expect(row.extent, row.title).toMatch(/^[\d,]+ W · \d+ MIN$/)
      else expect(row.extent, row.title).toBe('—')
    }
  })

  it('marks exactly the seven sheets §7.6 names as bilingual', () => {
    // The chip filters on this. Before the draft gate it selected 24 rows —
    // the 17 undrawn sheets advertised as bilingual and the 8 finished ones as
    // English-only, which is the claim inverted.
    expect(rows.filter((row) => row.bilingual).map((row) => row.module))
      .toEqual([1, 2, 3, 4, 5, 6, 7])
    for (const row of rows) {
      expect(row.lang, row.title).toBe(row.bilingual ? 'EN · TR' : 'EN')
      if (!row.drawn) expect(row.lang, row.title).toBe('EN')
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

})

describe('§4.9 — every subsystem states its own coverage', () => {
  it('partitions the set: every sheet in exactly one subsystem', () => {
    const listed = CATEGORIES.flatMap((category) => categoryRows(category))
    expect(listed.map((row) => row.module).sort((a, b) => a - b))
      .toEqual(rows.map((row) => row.module))
  })

  it('writes an eyebrow that names the subsystem and its coverage', () => {
    for (const category of CATEGORIES) {
      expect(categoryEyebrow(category), category.slug)
        .toMatch(/^SUBSYSTEM \d\d · \d+ SHEETS? · \d+ DRAWN/)
    }
  })

})
