import { describe, expect, it } from 'vitest'
import { sectionTitles, topicsFor } from '@/lib/content/topics'

/**
 * §4.9 — the `TOPICS` column: the first three h2 section titles on a drawn
 * sheet, the first three schedule-of-parts items on one that is not.
 */

const DRAWN = `Some lead paragraph.

## I. What is actually different about an agent

Prose.

## II. The vocabulary, pinned down

Prose.

### A sub-heading that is not a section

## Mermaid Diagram: where each defense sits

\`\`\`mermaid
graph LR
\`\`\`

## III. Prompt injection: the unsolved one

Prose.

## Quick Check

A question.
`

const DRAFT = `*Category: Expert*

Advanced UI patterns for agent applications.

**Topics this module will cover**:

- Streaming interfaces
- Approval flows
- Diff review surfaces
- Terminal-style output
`

describe('sectionTitles — the h2s a drawn sheet is made of (§5.6)', () => {
  it('lists the sections in document order', () => {
    expect(sectionTitles(DRAWN)).toEqual([
      'What is actually different about an agent',
      'The vocabulary, pinned down',
      'Prompt injection: the unsolved one',
      'Quick Check',
    ])
  })

  it('splits the Roman numeral off, exactly as the section spine does', () => {
    expect(sectionTitles('## VII. Guardrails, honestly rated')).toEqual([
      'Guardrails, honestly rated',
    ])
  })

  it('leaves a non-Roman heading whole rather than inventing a numeral', () => {
    expect(sectionTitles('## References & Further Reading')).toEqual([
      'References & Further Reading',
    ])
  })

  it('skips the heading that exists only to introduce a diagram', () => {
    expect(sectionTitles('## Mermaid Diagram: LLM Workflow')).toEqual([])
  })

  it('counts neither h1 nor h3 as a section', () => {
    expect(sectionTitles('# Title\n\n### Sub\n\n## II. Real')).toEqual(['Real'])
  })

  it('never reads a heading out of a fenced code block', () => {
    expect(sectionTitles('```\n## I. Not a heading\n```\n\n## II. A heading')).toEqual([
      'A heading',
    ])
  })

  it('returns nothing for a body with no sections', () => {
    expect(sectionTitles(DRAFT)).toEqual([])
  })
})

describe('topicsFor — what the category page prints per sheet (§4.9)', () => {
  it('takes the first three sections of a drawn sheet', () => {
    expect(topicsFor({ status: 'ready', body: DRAWN })).toEqual([
      'What is actually different about an agent',
      'The vocabulary, pinned down',
      'Prompt injection: the unsolved one',
    ])
  })

  it('takes the first three scheduled parts of a sheet that is not drawn', () => {
    expect(topicsFor({ status: 'draft', body: DRAFT })).toEqual([
      'Streaming interfaces',
      'Approval flows',
      'Diff review surfaces',
    ])
  })

  it('prints what is there when there are fewer than three', () => {
    expect(topicsFor({ status: 'ready', body: '## I. One' })).toEqual(['One'])
  })

  it('returns nothing rather than a placeholder when the sheet says nothing', () => {
    expect(topicsFor({ status: 'draft', body: 'Just a sentence.' })).toEqual([])
  })
})
