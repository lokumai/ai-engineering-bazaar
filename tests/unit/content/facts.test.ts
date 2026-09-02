import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '@/lib/content/categories'
import { checklistOf } from '@/lib/content/checklist'
import { curriculumFacts } from '@/lib/content/facts'
import { loadAllModules } from '@/lib/content/loader'
import { quickCheckOf } from '@/lib/content/quickcheck'
import { sheetCount } from '@/lib/content/curriculum'

/**
 * §12.6–§12.8 and §12.5.1 — the client-safe curriculum spine.
 *
 * Every number in `CurriculumFacts` is serialised into every page (§12.2), and
 * a page cannot correct a number it was handed. So the assertions here are the
 * corpus itself: 32 sheets, 15 drawn, 15 self-checks, 8 checklist items on one
 * sheet, 209 distinct sources, 32 traces, and the 2,440 XP ceiling those four
 * facts derive.
 */

const facts = curriculumFacts()
const modules = loadAllModules()

describe('curriculumFacts — the sheets', () => {
  it('carries one fact per sheet, in module order', () => {
    expect(facts.sheets).toHaveLength(sheetCount())
    expect(facts.sheets.map((s) => s.module))
      .toEqual(Array.from({ length: sheetCount() }, (_, i) => i + 1))
  })

  it('identifies a sheet by its slug, never by its number', () => {
    // §12.1.3: the set has been renumbered before. A number is a label.
    for (const sheet of facts.sheets) {
      expect(sheet.slug, `module ${sheet.module}`).toMatch(/^[a-z-]+\/[a-z0-9-]+$/)
    }
    expect(new Set(facts.sheets.map((s) => s.slug)).size).toBe(sheetCount())
    // Which number sits on which slug is the curriculum's business, so the
    // pairing is read off the loader rather than written down here.
    for (const module of modules) {
      expect(facts.sheets.find((s) => s.module === module.frontmatter.module)?.slug)
        .toBe(module.slug)
    }
  })

  it('agrees with the loader on title, category, status and sources', () => {
    for (const m of modules) {
      const sheet = facts.sheets.find((s) => s.slug === m.slug)!
      expect(sheet.title, m.slug).toBe(m.frontmatter.title)
      expect(sheet.category, m.slug).toBe(m.category.slug)
      expect(sheet.drawn, m.slug).toBe(m.frontmatter.status === 'ready')
      expect(sheet.sources, m.slug).toBe(m.sources)
      expect(sheet.revision, m.slug).toBe(m.revision?.hash ?? null)
    }
  })

  it('counts each sheet\'s checklist items the way the sheet writes them', () => {
    for (const sheet of facts.sheets) {
      const module = modules.find((m) => m.slug === sheet.slug)!
      expect(sheet.checklistItems, sheet.slug).toBe(checklistOf(module.body).length)
    }
  })

})

describe('curriculumFacts — the categories', () => {
  it('lists the six subsystems in their declared order', () => {
    expect(facts.categories.map((c) => c.slug))
      .toEqual(CATEGORIES.map((c) => c.slug))
    expect(facts.categories.map((c) => c.order)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('carries the subsystem title, so a page needs no second lookup', () => {
    for (const category of CATEGORIES) {
      expect(facts.categories.find((c) => c.slug === category.slug)?.title)
        .toBe(category.title)
    }
  })
})

describe('curriculumFacts — the §12.5.1 XP ceiling', () => {
  it('counts sign-off against drawn sheets only', () => {
    // §12.4.1: an A4 draft has no sign-off control at all, which is what keeps
    // every denominator on the site honest.
    expect(facts.attainable.signOff).toBe(facts.sheets.filter((s) => s.drawn).length)
  })

  it('counts a quiz only where a drawn sheet actually asks something', () => {
    const eligible = modules.filter(
      (m) => m.frontmatter.status === 'ready' && quickCheckOf(m.body) !== null,
    )
    expect(facts.attainable.quiz).toBe(eligible.length)
  })

  it('counts a checklist only where a drawn sheet has at least one item', () => {
    const eligible = modules.filter(
      (m) => m.frontmatter.status === 'ready' && checklistOf(m.body).length > 0,
    )
    expect(facts.attainable.checklist).toBe(eligible.length)
  })

  it('carries exactly the three events §12.5.1 pays for', () => {
    // §12.5.1 removes §7.2's `READ` dwell award and its `SOURCES` award, so
    // there are three counts here and there can be no fourth.
    expect(Object.keys(facts.attainable)).toHaveLength(3)
  })

  it('withdraws §7.2\'s full-set ceiling by not deriving one', () => {
    // §12.5.1: 17 sheets are unwritten, so their Quick Checks and checklists
    // do not exist and their contribution is not derivable. There is no field
    // here to hold 7,200.
    expect(Object.keys(facts.attainable).sort()).toEqual(['checklist', 'quiz', 'signOff'])
  })
})

describe('curriculumFacts — what it may not carry', () => {
  it('is the same object on every call — one derive per build', () => {
    expect(curriculumFacts()).toBe(facts)
  })

  it('carries no body text and no source URLs', () => {
    // §12.2 / D11: this object is serialised into every page.
    const json = JSON.stringify(facts)
    expect(json).not.toContain('http')
    expect(json.length).toBeLessThan(8000)
  })

  it('is plain, serialisable data with no functions and no cycles', () => {
    expect(JSON.parse(JSON.stringify(facts))).toEqual(facts)
  })

  it('holds exactly the nine fields §12.6 declares for a sheet', () => {
    for (const sheet of facts.sheets) {
      expect(Object.keys(sheet).sort(), sheet.slug).toEqual([
        'category', 'checklistItems', 'drawn', 'hasQuickCheck',
        'module', 'revision', 'slug', 'sources', 'title',
      ])
    }
  })
})
