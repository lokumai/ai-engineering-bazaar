import { describe, expect, it } from 'vitest'
import { SIGN_OFF_ASSERTION, signOffCriteria } from '@/lib/content/criteria'
import { loadAllModules } from '@/lib/content/loader'

/**
 * §12.4.1 / §12.12.4 — the criteria the sign-off control sits beside, and the
 * record document reprints.
 *
 * Two things are pinned here. That the criteria are the sheet's own declared
 * objectives, verbatim, so nothing between the frontmatter and the reader
 * paraphrases what signing off means (§11.25). And that the one sentence this
 * module does author obeys §12.14.1 — it is reprinted inside a document handed
 * to an employer, so a stray "Great work" or a claim of competence would be a
 * §12.12.1 violation travelling in a file nobody can recall.
 */

const modules = loadAllModules()
const drawn = modules.filter((m) => m.frontmatter.status === 'ready')

describe('signOffCriteria', () => {
  it('returns the sheet\'s own declared objectives, verbatim and in order', () => {
    const sheet = modules.find((m) => m.slug === 'fundamentals/llms')!
    expect(signOffCriteria('fundamentals/llms').objectives)
      .toEqual(sheet.frontmatter.objectives)
    expect(signOffCriteria('fundamentals/llms').objectives[0])
      .toBe('Explain what an LLM does with a prompt, and why it is a next-token predictor')
  })

  it('states three criteria for every drawn sheet', () => {
    for (const m of drawn) {
      const { objectives } = signOffCriteria(m.slug)
      expect(objectives, m.slug).toEqual(m.frontmatter.objectives)
      expect(objectives.length, m.slug).toBeGreaterThanOrEqual(2)
      for (const objective of objectives) expect(objective.trim(), m.slug).not.toBe('')
    }
    expect(drawn.map((m) => signOffCriteria(m.slug).objectives.length))
      .toEqual(Array.from({ length: 15 }, () => 3))
  })

  it('states no criteria for an undrawn sheet, because it declares none', () => {
    // §12.4.1: an A4 draft has no sign-off control at all — absent, not
    // disabled — so there is nothing for criteria to sit beside. This returns
    // the empty list rather than inventing one for a sheet nobody has drawn.
    for (const m of modules.filter((c) => c.frontmatter.status === 'draft')) {
      expect(signOffCriteria(m.slug).objectives, m.slug).toEqual([])
    }
  })

  it('states no criteria for a slug no sheet claims', () => {
    expect(signOffCriteria('fundamentals/nope').objectives).toEqual([])
    expect(signOffCriteria('').objectives).toEqual([])
  })

  it('hands out a copy, so a caller cannot edit the corpus', () => {
    const sheet = modules.find((m) => m.slug === 'intermediate/security')!
    expect(signOffCriteria(sheet.slug).objectives).not.toBe(sheet.frontmatter.objectives)
    expect(signOffCriteria(sheet.slug).objectives)
      .not.toBe(signOffCriteria(sheet.slug).objectives)
  })

  it('names the reader\'s assertion, and the same one on every sheet', () => {
    for (const m of modules) {
      expect(signOffCriteria(m.slug).assertion, m.slug).toBe(SIGN_OFF_ASSERTION)
    }
    expect(signOffCriteria('fundamentals/nope').assertion).toBe(SIGN_OFF_ASSERTION)
  })
})

describe('SIGN_OFF_ASSERTION — §12.14.1, the copy register', () => {
  it('says who is asserting, and that nobody else assesses it', () => {
    // §12.4.1 / §12.4.2: completion is the reader's own assertion, and there
    // is no assessor anywhere in this system to claim otherwise.
    expect(SIGN_OFF_ASSERTION).toBe(
      'Signing off is your own assertion that you have read this sheet and '
      + 'consider these objectives met. Nobody else assesses it, and you can '
      + 'un-sign it at any time.',
    )
  })

  it('carries no exclamation mark', () => {
    expect(SIGN_OFF_ASSERTION).not.toContain('!')
  })

  it('carries none of the banned words', () => {
    for (const banned of [
      'easy', 'just', 'simply', 'quick', 'please', 'sorry', 'valid', 'invalid',
      'oops', 'you forgot', 'great work', 'all set', 'nice try', 'keep going',
    ]) {
      expect(SIGN_OFF_ASSERTION.toLowerCase(), banned).not.toContain(banned)
    }
  })

  it('never speaks as a person, and never speaks for one', () => {
    // §12.14.1: the page never says "I saved your progress".
    expect(SIGN_OFF_ASSERTION).not.toMatch(/\bI\b|\bwe\b|\bour\b/)
  })

  it('claims nothing §12.12.1 forbids the record document from claiming', () => {
    // This sentence is reprinted inside the exported file (§12.12.4).
    for (const forbidden of [
      'has completed', 'is qualified', 'demonstrated', 'competence', 'passed',
      'certified', 'certificate', 'mastered', 'mastery', 'score', 'grade', '%',
    ]) {
      expect(SIGN_OFF_ASSERTION.toLowerCase(), forbidden).not.toContain(forbidden)
    }
  })

  it('is prose, so it keeps its sentence case and its full stops', () => {
    // §12.14.1 reserves the no-terminal-period form for uppercase status
    // readouts. This is a sentence beside a control, not a readout.
    expect(SIGN_OFF_ASSERTION.endsWith('.')).toBe(true)
    expect(SIGN_OFF_ASSERTION).not.toBe(SIGN_OFF_ASSERTION.toUpperCase())
  })
})
