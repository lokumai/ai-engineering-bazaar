import { describe, expect, it } from 'vitest'
import { parseFrontmatter } from '@/lib/content/schema'

const ready = {
  module: 1,
  title: 'LLM Fundamentals',
  category: 'fundamentals',
  status: 'ready',
  duration: 25,
  summary: 'What a language model does and how to control it.',
  objectives: ['Explain the context window', 'Choose a temperature'],
  prerequisites: [],
}

describe('parseFrontmatter', () => {
  it('accepts a complete ready module', () => {
    const result = parseFrontmatter(ready, '1_llms.md')
    expect(result.module).toBe(1)
    expect(result.objectives).toHaveLength(2)
  })

  it('accepts a draft module without summary or objectives', () => {
    const result = parseFrontmatter(
      { module: 16, title: 'Advanced UI', category: 'expert', status: 'draft' },
      '16_advanced_ui.md',
    )
    expect(result.summary).toBeNull()
    expect(result.objectives).toEqual([])
    expect(result.duration).toBe(0)
  })

  it('rejects a ready module with no summary', () => {
    const { summary, ...rest } = ready
    expect(() => parseFrontmatter(rest, '1_llms.md'))
      .toThrow(/1_llms\.md.*summary/s)
  })

  it('rejects a ready module with fewer than two objectives', () => {
    expect(() => parseFrontmatter({ ...ready, objectives: ['only one'] }, '1_llms.md'))
      .toThrow(/1_llms\.md.*objectives/s)
  })

  it('rejects an unknown category', () => {
    expect(() => parseFrontmatter({ ...ready, category: 'wizardry' }, '1_llms.md'))
      .toThrow(/1_llms\.md/)
  })

  it('rejects a non-integer module number', () => {
    expect(() => parseFrontmatter({ ...ready, module: 1.5 }, '1_llms.md'))
      .toThrow(/1_llms\.md/)
  })

  it('rejects a ready module with zero duration', () => {
    expect(() => parseFrontmatter({ ...ready, duration: 0 }, '1_llms.md'))
      .toThrow(/1_llms\.md.*duration/s)
  })

  it('names the file in every error, so a build failure is actionable', () => {
    expect(() => parseFrontmatter({}, '9_context_engineering.md'))
      .toThrow(/9_context_engineering\.md/)
  })
})
