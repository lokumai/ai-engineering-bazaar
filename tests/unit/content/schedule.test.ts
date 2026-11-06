import { describe, expect, it } from 'vitest'
import { loadAllModules } from '@/lib/content/loader'
import { scheduleOfParts, summarySentence, writtenSections } from '@/lib/content/schedule'

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

describe('every draft module in the corpus', () => {
  const drafts = loadAllModules().filter((m) => m.sheetFormat === 'A4')

  it('has a summary sentence that is not the dek and not the placeholder note', () => {
    for (const draft of drafts) {
      const summary = summarySentence(draft.body)
      expect(summary, draft.slug).toBeTruthy()
      expect(summary, draft.slug).not.toMatch(/^\*|Placeholder module|^Category:/)
    }
  })
})

describe('writtenSections (D102)', () => {
  it('is null for a stub that is only a sentence and a schedule', () => {
    expect(writtenSections(STUB)).toBeNull()
  })

  it('returns everything from the first h2 on', () => {
    const text = `${STUB}\n## Agent Teams\n\nA paragraph.\n\n### A Detail\n\nMore.\n`
    expect(writtenSections(text)).toBe('## Agent Teams\n\nA paragraph.\n\n### A Detail\n\nMore.')
  })

  it('does not take an h2 inside a code block for a section', () => {
    const text = `${STUB}\n\`\`\`markdown\n## not a section\n\`\`\`\n`
    expect(writtenSections(text)).toBeNull()
  })
})

describe('a planned module, as the sheet draws it', () => {
  // The sheet prints the lead sentence and the schedule as plain text, so any
  // markdown in them reaches the page as literal brackets and asterisks.
  const MARKUP = /\]\(|\*\*|`/
  const drafts = loadAllModules().filter((module) => module.sheetFormat === 'A4')

  it('has drafts to check', () => {
    expect(drafts.length).toBeGreaterThan(0)
  })

  it('keeps its lead sentence and its schedule of parts free of markdown', () => {
    const offending = drafts.flatMap((module) => {
      const lines = [summarySentence(module.body) ?? '', ...scheduleOfParts(module.body)]
      return lines.filter((line) => MARKUP.test(line)).map((line) => `${module.name}: ${line}`)
    })
    expect(offending).toEqual([])
  })
})
