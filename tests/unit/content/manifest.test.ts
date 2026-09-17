import { describe, expect, it } from 'vitest'
import { numberWord } from '@/lib/text'
import { categoryBySlug } from '@/lib/content/curriculum-file'
import { LANG_DISPLAY } from '@/lib/content/derive'
import { loadAllModules } from '@/lib/content/loader'
import {
  categoryCoverage,
  categorySummary,
  durationLabel,
  indexStatement,
  setSummary,
  sheetRows,
} from '@/lib/content/manifest'
import { FILTERS, applyFilter } from '@/lib/content/rows'
import { sheetCount } from '@/lib/content/curriculum'

/**
 * §4.8 and §4.9 — the manifest behind the index table, and every number the
 * two pages state about the set.
 */

const rows = sheetRows()

describe('moduleRows — one row per module in the set (§4.8)', () => {
  it('covers the whole curriculum, in module order', () => {
    expect(rows.map((row) => row.module)).toEqual(
      Array.from({ length: sheetCount() }, (_, i) => i + 1),
    )
  })

  it('numbers the drawing column the way the module info does', () => {
    expect(rows[0].number).toBe('01')
    expect(rows[31].number).toBe('32')
  })

  it('addresses each module at its own route', () => {
    for (const sheet of loadAllModules()) {
      const row = rows.find((candidate) => candidate.module === sheet.frontmatter.module)
      expect(row?.path, sheet.slug).toBe(`/courses/${sheet.slug}/`)
    }
  })

  it('states extent as words and declared minutes on a ready module', () => {
    // The shape, not the measurement: the word count moves with every edit.
    for (const row of rows.filter((candidate) => candidate.drawn)) {
      expect(row.extent, row.title).toMatch(/^[\d,]+ W · \d+ MIN$/)
    }
  })

  it('prints an em dash for the extent of a module that is planned', () => {
    // Its words are the schedule of parts and its duration is undeclared; a
    // reading time for a drawing that does not exist would be an estimate.
    expect(rows[16].extent).toBe('—')
  })

  it('prints the language coverage the corpus actually has', () => {
    // Derived per row rather than written down. Which sheets have a Turkish
    // sibling changes every time one is translated, and this used to assert
    // that sheet 13 was English-only: it went red the day Security was
    // translated, having found nothing. What has to hold is that the row
    // prints the coverage the loader computed and does not invent a label.
    const modules = loadAllModules()
    expect(rows.length).toBe(modules.length)
    for (const [i, row] of rows.entries()) {
      expect(row.lang, modules[i].slug).toBe(LANG_DISPLAY[modules[i].lang])
      expect(Object.values(LANG_DISPLAY)).toContain(row.lang)
    }
  })

  it('carries the declared prerequisites, and an em dash where there are none', () => {
    // Was `rows[13].requires` pinned to '12, 13', a fact about whichever sheet
    // sat at 14. Read off the corpus instead, so it holds for any curriculum.
    const modules = loadAllModules()
    for (const [i, row] of rows.entries()) {
      const declared = modules[i].frontmatter.prerequisites
      expect(row.requires, modules[i].slug)
        .toBe(declared.length === 0 ? '—' : declared.join(', '))
    }
    expect(rows.some((row) => row.requires === '—')).toBe(true)
  })

  it('names the level each module belongs to, and links to it', () => {
    expect(rows[12].subsystem).toEqual({
      order: 2,
      title: 'Intermediate',
      // M17 — a level's own page is its entry into the catalog. The MODULE
      // route did not move and is still `/courses/<level>/<module>/`.
      path: '/sheets/intermediate/',
      // M12 — the slug is carried so the catalog's views can address the
      // level's own colour as `[data-cat="<slug>"]`.
      slug: 'intermediate',
    })
  })

  it('takes at most three topics from the module itself', () => {
    for (const row of rows) expect(row.topics.length, row.title).toBeLessThanOrEqual(3)
  })

  it('claims nothing about a reader: no progress, no completion, no score', () => {
    const serialised = JSON.stringify(rows)
    expect(serialised)
      .not.toMatch(/signedOff|reachedEnd|progress|approved|percent|\bxp\b/i)
  })
})

describe('the filter chips (§4.8 item 5)', () => {
  /**
   * M12 — the same six selections, in the same order, in sentence case.
   *
   * `kia-context/specs/DESIGN.md` names a tracked-out all-caps label as the
   * single clearest tell of a generated interface, and `EN · TR` was two of
   * its do-nots at once: caps, and a meta string joined with a middle dot. The
   * ids are untouched, because `DEFAULT_FILTER_ID` and the record chips are
   * addressed by id and a label is not an identity.
   */
  /**
   * M20 — five, not six. `Both languages` left with the table's `Lang` column:
   * it filtered on whether a `_tr.md` file exists, which is a fact about the
   * repository and not about anything the site can serve. Keeping it would
   * also have made `Status:` a lie about its own row.
   */
  it('offers the five selections in order, in the case a reader reads', () => {
    expect(FILTERS.map((filter) => filter.label))
      .toEqual(['All', 'Ready', 'Planned', 'Completed', 'Not completed'])
  })

  /** Every chip is a state now, which is what lets the row be named `Status`. */
  it('states no language, having none to serve', () => {
    expect(FILTERS.map((filter) => filter.id)).not.toContain('bilingual')
  })

  it('keeps the set in module order — filtering never re-sorts', () => {
    const drawn = applyFilter(rows, 'ready').map((row) => row.module)
    expect(drawn).toEqual([...drawn].sort((a, b) => a - b))
  })

  it('falls back to the whole set for an id it does not know', () => {
    expect(applyFilter(rows, 'nonsense')).toHaveLength(sheetCount())
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

})

describe('durationLabel — hours and minutes, never a bare estimate', () => {
  it('states hours and minutes together', () => {
    expect(durationLabel(235)).toBe('~3 h 55 min')
  })

  it('drops the minutes on a whole hour', () => {
    expect(durationLabel(120)).toBe('~2 h')
  })

  it('drops the hours below one', () => {
    expect(durationLabel(45)).toBe('~45 min')
  })

  it('says nothing at all when no module declares a duration', () => {
    expect(durationLabel(0)).toBeNull()
  })
})

describe('the counts each page states about itself', () => {

  it('writes the level eyebrow §4.9 item 1 asks for', () => {
    // The format rather than the counts: a two-digit level number, the plural
    // for a level of more than one, the ready count, and a rounded duration.
    // The counts were written in as `7 SHEETS · 7 DRAWN` and went red the
    // moment Generative UI joined the level.
    //
    // Sentence case since M16: these strings were pre-cased to match a class
    // that applied `text-transform: uppercase`, and the design language has no
    // uppercase at all.
    // M20 cut this line to the modules and the total time and moved it under
    // the heading. `Level 02` is the heading itself, in words; `n ready` is on
    // every row of the table under it and in the board's own rail.
    expect(categoryCoverage(categoryBySlug('intermediate')!))
      .toMatch(/^\d+ modules · ~\d+ h( \d+ min)?$/)
  })

  it('counts a level of one in the singular', () => {
    // No duration either: nothing in this level is written, so nothing
    // declares one and `durationLabel` drops the part rather than saying `~0`.
    expect(categoryCoverage(categoryBySlug('protocols')!))
      .toBe('1 module')
  })

})
