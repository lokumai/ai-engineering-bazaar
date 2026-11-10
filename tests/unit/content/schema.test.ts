import { describe, expect, it } from 'vitest'
import { parseFrontmatter, parseTranslationFrontmatter } from '@/lib/content/schema'

/**
 * What is left in a module file's frontmatter after the split: a `summary` and
 * `objectives`. The six fields that describe where a module sits in the course
 * are `curriculum.yaml`'s, and the rules about them are checked there, by
 * `curriculum-file.ts`.
 *
 * `status` is passed in rather than declared, so the two conditional rules
 * below are checked against the curriculum's answer and not the file's.
 */
const ready = {
  summary: 'What a language model does and how to control it.',
  objectives: ['Explain the context window', 'Choose a temperature'],
}

describe('parseFrontmatter', () => {
  it('accepts a complete ready module', () => {
    const result = parseFrontmatter(ready, 'llms.md', 'ready')
    expect(result.summary).toBe(ready.summary)
    expect(result.objectives).toHaveLength(2)
  })

  it('accepts a draft module with no frontmatter at all', () => {
    const result = parseFrontmatter({}, 'advanced_ui.md', 'draft')
    expect(result.summary).toBeNull()
    expect(result.objectives).toEqual([])
  })

  it('rejects a ready module with no summary', () => {
    const { summary, ...rest } = ready
    void summary
    expect(() => parseFrontmatter(rest, 'llms.md', 'ready'))
      .toThrow(/llms\.md.*summary/s)
  })

  it('rejects a ready module with fewer than two objectives', () => {
    expect(() => parseFrontmatter({ ...ready, objectives: ['only one'] }, 'llms.md', 'ready'))
      .toThrow(/llms\.md.*objectives/s)
  })

  it('rejects an objective that is an empty string', () => {
    expect(() => parseFrontmatter({ ...ready, objectives: ['', 'ok'] }, 'llms.md', 'ready'))
      .toThrow(/llms\.md/)
  })

  it('rejects a summary that is not a string', () => {
    expect(() => parseFrontmatter({ ...ready, summary: 25 }, 'llms.md', 'ready'))
      .toThrow(/llms\.md/)
  })

  it('names the file in every error, so a build failure is actionable', () => {
    expect(() => parseFrontmatter({}, 'context_engineering.md', 'ready'))
      .toThrow(/context_engineering\.md/)
  })
})

/**
 * A translation file's frontmatter: `objectives`, translated, the same count as
 * the English file's, and nothing else. All the files here are made up; the rule
 * holds for any content.
 */
describe('parseTranslationFrontmatter', () => {
  const english = ['Explain the context window', 'Choose a temperature']
  const translated = ['Bağlam penceresini açıkla', 'Bir sıcaklık seç']

  it('takes the translated objectives when the count matches', () => {
    expect(parseTranslationFrontmatter({ objectives: translated }, 'llms_tr.md', english))
      .toEqual(translated)
  })

  it('returns null for a file with no block, so the page falls back to English', () => {
    expect(parseTranslationFrontmatter({}, 'llms_tr.md', english)).toBeNull()
  })

  it.each(['summary', 'module', 'status', 'title'])('rejects %s, naming the file and the key', (key) => {
    expect(() => parseTranslationFrontmatter({ objectives: translated, [key]: 'x' }, 'llms_tr.md', english))
      .toThrow(new RegExp(`llms_tr\\.md[\\s\\S]*${key}`))
  })

  it('rejects a block with no objectives in it, not a block with other keys read as empty', () => {
    expect(() => parseTranslationFrontmatter({ summary: 'x' }, 'llms_fa.md', english))
      .toThrow(/llms_fa\.md/)
  })

  it('rejects a different count, naming the file and both counts', () => {
    expect(() => parseTranslationFrontmatter({ objectives: [translated[0]] }, 'llms_tr.md', english))
      .toThrow(/llms_tr\.md[\s\S]*has 1[\s\S]*English file has 2/)
    expect(() => parseTranslationFrontmatter({ objectives: [...translated, 'Üçüncü'] }, 'llms_fa.md', english))
      .toThrow(/llms_fa\.md[\s\S]*has 3[\s\S]*English file has 2/)
  })

  it('rejects an empty list and an empty objective', () => {
    expect(() => parseTranslationFrontmatter({ objectives: [] }, 'llms_tr.md', english)).toThrow(/llms_tr\.md/)
    expect(() => parseTranslationFrontmatter({ objectives: ['', 'x'] }, 'llms_tr.md', english))
      .toThrow(/llms_tr\.md/)
  })

  it('rejects an item that is not a string', () => {
    expect(() => parseTranslationFrontmatter({ objectives: [1, 2] }, 'llms_tr.md', english)).toThrow(/llms_tr\.md/)
  })

  it('rejects objectives that are not a list of strings', () => {
    expect(() => parseTranslationFrontmatter({ objectives: 'one' }, 'llms_tr.md', english)).toThrow(/llms_tr\.md/)
  })
})
