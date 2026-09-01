/**
 * §12.12 — the facts the `RECORD OF WORK` reprints.
 *
 * These assertions are about the real corpus, not a fixture, because the whole
 * value of the document is that a reviewer can hold it beside the curriculum
 * and find the same words. A drifted objective or a missing question is a
 * document that misquotes the thing it is a record of.
 */

import { describe, expect, it } from 'vitest'
import { CRITERIA_PATH, reportFacts } from '@/lib/content/report-facts'
import { SIGN_OFF_ASSERTION } from '@/lib/content/criteria'
import { loadAllModules } from '@/lib/content/loader'
import { quickCheckOf } from '@/lib/content/quickcheck'
import { checklistOf } from '@/lib/content/checklist'

const ORIGIN = 'https://lokumai.github.io'
const facts = reportFacts(ORIGIN)
const modules = loadAllModules()

describe('the sheet list', () => {
  it('covers the whole set, in sheet order', () => {
    expect(facts.sheets).toHaveLength(modules.length)
    expect(facts.sheets.map((s) => s.module))
      .toEqual(modules.map((m) => m.frontmatter.module))
  })

  it('keys on the slug, because the set has been renumbered before', () => {
    expect(facts.sheets.map((s) => s.slug)).toEqual(modules.map((m) => m.slug))
    expect(facts.sheets.every((s) => s.slug.includes('/'))).toBe(true)
  })

})

describe('the text the document reprints', () => {
  it('quotes the objectives verbatim from the frontmatter', () => {
    for (const module of modules) {
      const sheet = facts.sheets.find((s) => s.slug === module.slug)!
      expect(sheet.objectives).toEqual(module.frontmatter.objectives)
    }
  })

  it('hands over a copy, so one page cannot edit what another prints', () => {
    const module = modules[0]
    const sheet = facts.sheets.find((s) => s.slug === module.slug)!
    expect(sheet.objectives).not.toBe(module.frontmatter.objectives)
  })

  it('reproduces checklist item TEXT, not a count (§12.7)', () => {
    const withItems = facts.sheets.filter((s) => s.checklistItems.length > 0)
    expect(withItems).toHaveLength(1)
    expect(withItems[0].checklistItems).toHaveLength(8)
    // Real authored text, not indices.
    expect(withItems[0].checklistItems.every((text) => text.trim().length > 4)).toBe(true)
    const module = modules.find((m) => m.slug === withItems[0].slug)!
    expect(withItems[0].checklistItems).toEqual(checklistOf(module.body).map((i) => i.text))
  })

  it('names every subsystem with its own title and order', () => {
    const bands = new Map(facts.sheets.map((s) => [s.categorySlug, s]))
    expect([...bands.keys()])
      .toEqual(['fundamentals', 'intermediate', 'expert', 'ecosystem', 'protocols', 'optional'])
    expect([...bands.values()].map((s) => s.categoryOrder)).toEqual([1, 2, 3, 4, 5, 6])
    expect(bands.get('protocols')!.categoryTitle).toBe('Protocols & Specs')
  })
})

describe('the criteria URL', () => {
  it('is absolute, because the document is opened from file://', () => {
    expect(facts.criteriaUrl.startsWith('https://')).toBe(true)
    expect(facts.criteriaUrl.endsWith(CRITERIA_PATH)).toBe(true)
  })

  it('goes through href(), so a sub-path deploy resolves', () => {
    // With no base path set in this environment the path is unprefixed; the
    // point is that the value is built rather than typed, so the deployed build
    // picks up `/ai-engineering-bazaar` without another edit.
    expect(facts.criteriaUrl).toBe(`${ORIGIN}${CRITERIA_PATH}`)
  })
})

describe('the assertion', () => {
  it('is the one criteria.ts owns — not a second copy', () => {
    expect(facts.assertion).toBe(SIGN_OFF_ASSERTION)
  })

  it('obeys the §12.14.1 copy register, because an employer reads it', () => {
    expect(facts.assertion).not.toContain('!')
    for (const banned of [/\bplease\b/i, /\bsorry\b/i, /\bjust\b/i, /\bsimply\b/i, /\beasy\b/i, /\bI\b/]) {
      expect(facts.assertion).not.toMatch(banned)
    }
  })
})
