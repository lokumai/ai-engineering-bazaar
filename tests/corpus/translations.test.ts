import { describe, expect, it } from 'vitest'
import { TRANSLATED_LANGS } from '@/lib/content/languages'
import { loadAllModules } from '@/lib/content/loader'
import { quickCheckOf, summarySection } from '@/lib/content/quickcheck'

/**
 * M28 — every matcher that reads a module's body finds the same things in a
 * translation that it finds in the English.
 *
 * `quickcheck.ts` recognises the quick check and the summary by their
 * heading's WORDS, and a matcher written in one language silently deletes a
 * capability in another wherever "absent" is a valid answer: M19 met it twice
 * with Turkish, and nothing failed either time. Persian is the third language,
 * so the rule is stated once over all of them.
 *
 * It holds for any content: it never says which modules have a summary, only
 * that a translation has one exactly where its English does.
 */

const modules = loadAllModules()

describe.each(TRANSLATED_LANGS)('a translation into %s', (lang) => {
  const translated = modules.filter((module) => module.translations[lang] !== null)

  it('exists, so the rules below are about something', () => {
    expect(translated.length).toBeGreaterThan(0)
  })

  it('has a quick check exactly where its English does', () => {
    // Non-vacuity: with no English quick check anywhere, this compares nothing.
    expect(translated.filter((module) => quickCheckOf(module.body) !== null).length)
      .toBeGreaterThan(0)
    const disagree = translated
      .filter((module) =>
        (quickCheckOf(module.body) === null) !== (quickCheckOf(module.translations[lang]!) === null))
      .map((module) => module.slug)
    expect(disagree, 'a translation whose quick check the matcher cannot find').toEqual([])
  })

  it('has a summary exactly where its English does', () => {
    expect(translated.filter((module) => summarySection(module.body) !== null).length)
      .toBeGreaterThan(0)
    const disagree = translated
      .filter((module) =>
        (summarySection(module.body) === null) !== (summarySection(module.translations[lang]!) === null))
      .map((module) => module.slug)
    expect(disagree, 'a translation whose summary the matcher cannot find').toEqual([])
  })

  it('opens on its own title, not the English one', () => {
    for (const module of translated) {
      const first = module.translations[lang]!.split('\n').find((line) => line.trim() !== '')
      expect(first, module.slug).toMatch(/^# \S/)
    }
  })
})
