import { describe, expect, it } from 'vitest'
import { parseFrontmatter } from '@/lib/content/schema'

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
  it('accepts a complete ready sheet', () => {
    const result = parseFrontmatter(ready, 'llms.md', 'ready')
    expect(result.summary).toBe(ready.summary)
    expect(result.objectives).toHaveLength(2)
  })

  it('accepts a draft sheet with no frontmatter at all', () => {
    const result = parseFrontmatter({}, 'advanced_ui.md', 'draft')
    expect(result.summary).toBeNull()
    expect(result.objectives).toEqual([])
  })

  it('rejects a ready sheet with no summary', () => {
    const { summary, ...rest } = ready
    void summary
    expect(() => parseFrontmatter(rest, 'llms.md', 'ready'))
      .toThrow(/llms\.md.*summary/s)
  })

  it('rejects a ready sheet with fewer than two objectives', () => {
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
