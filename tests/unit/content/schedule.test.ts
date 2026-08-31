import { describe, expect, it } from 'vitest'
import { loadAllModules } from '@/lib/content/loader'
import { scheduleOfParts, summarySentence } from '@/lib/content/schedule'

const STUB = `# Module 20: Advanced Multi-Agent

*Category: Expert — Module 20 (5 of 9 in this category)*

*(Placeholder module — a short overview for now; full lesson content is coming soon.)*

Agent-to-Agent protocols and coordination patterns beyond the Manager-Worker setup from Module 7.

**Topics this module will cover**:
- A2A
- Context delegation vs. subagent context delegation vs. messaging pool
`

describe('scheduleOfParts', () => {
  it('reads the topics list as the bill of materials', () => {
    expect(scheduleOfParts(STUB)).toEqual([
      'A2A',
      'Context delegation vs. subagent context delegation vs. messaging pool',
    ])
  })

  it('stops at the first line that is not an item', () => {
    expect(scheduleOfParts(`${STUB}\n## Another section\n- not an item\n`)).toHaveLength(2)
  })

  it('reads the Turkish heading too', () => {
    const tr = '**Bu modülde işlenecek konular**:\n- Interrupt\n- Steering\n'
    expect(scheduleOfParts(tr)).toEqual(['Interrupt', 'Steering'])
  })

  it('accepts the other bullet markers markdown allows', () => {
    expect(scheduleOfParts('**Topics this module will cover**:\n* A\n+ B\n')).toEqual(['A', 'B'])
  })

  it('returns nothing when there is no schedule', () => {
    expect(scheduleOfParts('# Module 13: Security\n\nProse.\n')).toEqual([])
  })

  it('never returns an item inside a code fence', () => {
    const fenced = '```text\n**Topics this module will cover**:\n- Not a part\n```\n'
    expect(scheduleOfParts(fenced)).toEqual([])
  })
})

describe('summarySentence', () => {
  it('takes the descriptive sentence, not the h1 or the dek', () => {
    expect(summarySentence(STUB)).toBe(
      'Agent-to-Agent protocols and coordination patterns beyond the ' +
      'Manager-Worker setup from Module 7.',
    )
  })

  it('joins a summary that wraps across two source lines', () => {
    const wrapped = '# Module 1\n\n*(Placeholder module — soon.)*\n\nOne line\nand its tail.\n\n**Topics this module will cover**:\n- A\n'
    expect(summarySentence(wrapped)).toBe('One line and its tail.')
  })

  it('returns null when the source has no paragraph before the schedule', () => {
    expect(summarySentence('# Module 1\n\n**Topics this module will cover**:\n- A\n')).toBeNull()
  })
})

describe('every draft sheet in the corpus', () => {
  const drafts = loadAllModules().filter((m) => m.sheetFormat === 'A4')

  it('is all seventeen of them', () => {
    expect(drafts).toHaveLength(17)
  })

  it('has a schedule of parts, because that is the sheet', () => {
    for (const draft of drafts) {
      expect(scheduleOfParts(draft.body).length, draft.slug).toBeGreaterThan(0)
    }
  })

  it('has a summary sentence that is not the dek and not the placeholder note', () => {
    for (const draft of drafts) {
      const summary = summarySentence(draft.body)
      expect(summary, draft.slug).toBeTruthy()
      expect(summary, draft.slug).not.toMatch(/^\*|Placeholder module|^Category:/)
    }
  })
})
