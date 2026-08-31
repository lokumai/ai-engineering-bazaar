import { describe, expect, it } from 'vitest'
import { categoryBySlug } from '@/lib/content/categories'
import {
  categoryEyebrow,
  categorySummary,
  durationLabel,
  indexStatement,
  numberWord,
  setEyebrow,
  setSummary,
  sheetRows,
} from '@/lib/content/manifest'
import { FILTERS, applyFilter } from '@/lib/content/rows'

/**
 * §4.8 and §4.9 — the manifest behind the index table, and every number the
 * two pages state about the set.
 */

const rows = sheetRows()

describe('sheetRows — one row per sheet in the set (§4.8)', () => {
  it('covers the whole drawing set, in sheet order', () => {
    expect(rows.map((row) => row.module)).toEqual(
      Array.from({ length: 32 }, (_, i) => i + 1),
    )
  })

  it('numbers the drawing column the way the title block does', () => {
    expect(rows[0].number).toBe('01')
    expect(rows[31].number).toBe('32')
  })

  it('addresses each sheet at its own route', () => {
    expect(rows[0].path).toBe('/courses/fundamentals/llms/')
    expect(rows[12].path).toBe('/courses/intermediate/security/')
  })

  it('states extent as words and declared minutes on a drawn sheet', () => {
    expect(rows[12].extent).toBe('4,868 W · 30 MIN')
  })

  it('prints an em dash for the extent of a sheet that is not drawn', () => {
    // Its words are the schedule of parts and its duration is undeclared; a
    // reading time for a drawing that does not exist would be an estimate.
    expect(rows[16].extent).toBe('—')
  })

  it('counts sources, and dashes only the sheets nobody counted', () => {
    // Module 13 cites 23; module 2 is drawn and cites nothing, which is `0`,
    // not the dash that means the count was never taken; module 17 is a stub.
    expect(rows[12].sources).toBe('23')
    expect(rows[1].sources).toBe('0')
    expect(rows[16].sources).toBe('—')
  })

  it('prints the language coverage the corpus actually has', () => {
    expect(rows[0].lang).toBe('EN · TR')
    expect(rows[12].lang).toBe('EN')
  })

  it('says in words which sheets are drawn', () => {
    expect(rows[12].status).toBe('READY')
    expect(rows[16].status).toBe('NOT DRAWN')
    expect(rows.filter((row) => row.drawn)).toHaveLength(15)
    expect(rows.filter((row) => !row.drawn)).toHaveLength(17)
  })

  it('carries the declared prerequisites, and an em dash where there are none', () => {
    expect(rows[14].requires).toBe('13, 14')
    expect(rows[0].requires).toBe('—')
  })

  it('names the subsystem each sheet belongs to, and links to it', () => {
    expect(rows[12].subsystem).toEqual({
      order: 2,
      title: 'Intermediate',
      path: '/courses/intermediate/',
    })
  })

  it('takes at most three topics from the sheet itself', () => {
    expect(rows[12].topics[0]).toBe('What is actually different about an agent')
    for (const row of rows) expect(row.topics.length, row.title).toBeLessThanOrEqual(3)
  })

  it('claims nothing about a reader: no progress, no completion, no score', () => {
    const serialised = JSON.stringify(rows)
    expect(serialised)
      .not.toMatch(/completed|completion|progress|approved|percent|\bxp\b/i)
  })
})

describe('the filter chips (§4.8 item 5)', () => {
  it('offers exactly the four the spec names, in its order', () => {
    expect(FILTERS.map((filter) => filter.label))
      .toEqual(['ALL', 'READY', 'NOT DRAWN', 'EN · TR'])
  })

  it('selects on facts about the sheet, never on reader state', () => {
    expect(applyFilter(rows, 'all')).toHaveLength(32)
    expect(applyFilter(rows, 'ready')).toHaveLength(15)
    expect(applyFilter(rows, 'not-drawn')).toHaveLength(17)
    // §7.6: the seven sheets whose Turkish is a real translation.
    expect(applyFilter(rows, 'bilingual')).toHaveLength(7)
  })

  it('keeps the set in sheet order — filtering never re-sorts', () => {
    const drawn = applyFilter(rows, 'ready').map((row) => row.module)
    expect(drawn).toEqual([...drawn].sort((a, b) => a - b))
  })

  it('falls back to the whole set for an id it does not know', () => {
    expect(applyFilter(rows, 'nonsense')).toHaveLength(32)
  })
})

describe('numberWord — so no count in the copy is hand-maintained (§11.25)', () => {
  it('writes out the numbers the statement needs', () => {
    expect(numberWord(15)).toBe('fifteen')
    expect(numberWord(17)).toBe('seventeen')
    expect(numberWord(32)).toBe('thirty-two')
  })

  it('writes out the round tens', () => {
    expect(numberWord(20)).toBe('twenty')
    expect(numberWord(90)).toBe('ninety')
  })

  it('falls back to digits past the point where words help', () => {
    expect(numberWord(100)).toBe('100')
  })
})

describe('indexStatement — §4.8 item 2, with its counts derived', () => {
  const lines = indexStatement()

  it('is four lines', () => {
    expect(lines).toHaveLength(4)
  })

  it('reads exactly as the spec writes it, for the set as it stands today', () => {
    expect(lines[0]).toBe(
      'Thirty-two sheets on becoming an AI-powered software engineer.',
    )
    expect(lines[1]).toBe(
      'Fifteen are drawn. Seventeen are dashed — the geometry exists in the '
      + 'model, the lines do not.',
    )
    expect(lines[2]).toBe(
      'Every claim is fetched from a primary source and dated. Nothing is '
      + 'cited from memory.',
    )
    expect(lines[3]).toBe('Read in any order the dependency graph allows.')
  })
})

describe('durationLabel — hours and minutes, never a bare estimate', () => {
  it('states hours and minutes together', () => {
    expect(durationLabel(235)).toBe('~3 H 55 MIN')
  })

  it('drops the minutes on a whole hour', () => {
    expect(durationLabel(120)).toBe('~2 H')
  })

  it('drops the hours below one', () => {
    expect(durationLabel(45)).toBe('~45 MIN')
  })

  it('says nothing at all when no sheet declares a duration', () => {
    expect(durationLabel(0)).toBeNull()
  })
})

describe('the counts each page states about itself', () => {
  it('summarises the set from the set', () => {
    expect(setSummary()).toEqual({ sheets: 32, drawn: 15, notDrawn: 17, minutes: 400 })
  })

  it('summarises a subsystem from its own sheets', () => {
    expect(categorySummary(categoryBySlug('intermediate')!))
      .toEqual({ sheets: 8, drawn: 8, notDrawn: 0, minutes: 235 })
    expect(categorySummary(categoryBySlug('expert')!))
      .toEqual({ sheets: 9, drawn: 0, notDrawn: 9, minutes: 0 })
  })

  it('writes the subsystem eyebrow §4.9 item 1 asks for', () => {
    expect(categoryEyebrow(categoryBySlug('intermediate')!))
      .toBe('SUBSYSTEM 02 · 8 SHEETS · 8 DRAWN · ~3 H 55 MIN')
  })

  it('omits a duration nothing in the subsystem declares', () => {
    expect(categoryEyebrow(categoryBySlug('expert')!))
      .toBe('SUBSYSTEM 03 · 9 SHEETS · 0 DRAWN')
  })

  it('counts a subsystem of one in the singular', () => {
    expect(categoryEyebrow(categoryBySlug('protocols')!))
      .toBe('SUBSYSTEM 05 · 1 SHEET · 0 DRAWN')
  })

  it('writes the set eyebrow the same way', () => {
    expect(setEyebrow()).toBe('32 SHEETS · 15 DRAWN · ~6 H 40 MIN')
  })
})
