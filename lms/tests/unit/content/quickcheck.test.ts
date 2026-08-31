import { describe, expect, it } from 'vitest'
import { loadAllModules } from '@/lib/content/loader'
import { quickCheckOf, summarySection } from '@/lib/content/quickcheck'

/**
 * §12.6 — the Quick Check, and the `## Summary` section that stands in for the
 * model answer the corpus does not contain.
 *
 * The corpus numbers are the point of this file. §12.5.1 derives the XP
 * ceiling from the number of sheets that ask a question, and a count that
 * drifts turns `2,440 ATTAINABLE TODAY` into a lie the reader cannot check.
 */

const modules = loadAllModules()
const byNumber = new Map(modules.map((m) => [m.frontmatter.module, m]))

function body(moduleNumber: number): string {
  return byNumber.get(moduleNumber)!.body
}

const withQuickCheck = modules.filter((m) => quickCheckOf(m.body) !== null)

describe('quickCheckOf', () => {
  it('reads the question off a bold inline run at the start of a paragraph', () => {
    expect(quickCheckOf('**Quick Check**: Why do LLMs need tools?\n'))
      .toEqual({ question: 'Why do LLMs need tools?' })
  })

  it('returns null where the sheet asks nothing', () => {
    expect(quickCheckOf('## Summary\n\nNothing to ask here.\n')).toBeNull()
  })

  it('keeps the inline markdown the question is written in', () => {
    // Module 9 emphasises *unrelated*; dropping the emphasis changes what is
    // being asked, so the source run is handed on as written.
    expect(quickCheckOf('**Quick Check**: work that is *unrelated* to the last hour?\n'))
      .toEqual({ question: 'work that is *unrelated* to the last hour?' })
  })

  it('joins a question hard-wrapped across the paragraph', () => {
    expect(quickCheckOf('**Quick Check**: Why do LLMs\nneed tools?\n\nNext.\n'))
      .toEqual({ question: 'Why do LLMs need tools?' })
  })

  it('stops at the list a hard-wrapped question runs into', () => {
    // A list interrupts a paragraph in markdown, so it is not part of the
    // question and must not be joined onto it.
    expect(quickCheckOf('**Quick Check**: Which legs\nare present?\n- a\n- b\n'))
      .toEqual({ question: 'Which legs are present?' })
  })

  it('does not read a **Quick Check** run inside a fenced code block', () => {
    // The corpus has 44 tagged code blocks, several of them markdown.
    const md = '```markdown\n**Quick Check**: a sample question?\n```\n'
    expect(quickCheckOf(md)).toBeNull()
  })

  it('does not read a run that opens no paragraph', () => {
    expect(quickCheckOf('A sentence, and then\n**Quick Check**: mid-paragraph?\n')).toBeNull()
  })

  it('is not fooled by the `## Quick Check` heading form, which no sheet uses', () => {
    expect(quickCheckOf('## Quick Check\n\nWhy do LLMs need tools?\n')).toBeNull()
  })

  it('takes the first Quick Check and no later one', () => {
    expect(quickCheckOf('**Quick Check**: first?\n\n**Quick Check**: second?\n'))
      .toEqual({ question: 'first?' })
  })

  it('finds a self-check on exactly 15 of the 32 sheets', () => {
    expect(withQuickCheck).toHaveLength(15)
    expect(modules).toHaveLength(32)
  })

  it('finds it on sheets 2-15 — every drawn sheet but the first', () => {
    expect(withQuickCheck.map((m) => m.frontmatter.module))
      .toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
  })

  it('finds none on any undrawn sheet, and keys on the question not the status', () => {
    // §12.6's trap, still the trap: the component keys on the extractor
    // returning non-null, never on `status === "ready"`. It happens that all 15
    // drawn sheets ask something and none of the 17 drafts does, but that is a
    // measurement of the corpus today, not a rule the component may assume.
    for (const module of [16, 20, 25, 30, 32]) {
      expect(byNumber.get(module)!.frontmatter.status).toBe('draft')
      expect(quickCheckOf(body(module))).toBeNull()
    }
  })

  it('reads sheet 1\'s question, which is labelled **Quiz Yourself**', () => {
    // Sheet 1 ends with `**Quiz Yourself**: What is a context window? …` — the
    // same shape, in the same place, doing the same job under a name the author
    // typed differently. Keying on one label would leave the first drawn sheet
    // the only one without a self-check, which is a gap a reader would notice
    // and could not explain.
    expect(body(1)).toContain('**Quiz Yourself**')
    const found = quickCheckOf(body(1))
    expect(found).not.toBeNull()
    expect(found!.question).toContain('context window')
  })

  it('finds none on any of the seventeen undrawn sheets', () => {
    for (const m of modules.filter((c) => c.frontmatter.status === 'draft')) {
      expect(quickCheckOf(m.body), m.slug).toBeNull()
    }
  })

  it('reads the question verbatim off two sheets', () => {
    expect(quickCheckOf(body(6))).toEqual({ question: "What's the agent loop?" })
    expect(quickCheckOf(body(3))).toEqual({
      question:
        'Name the 3 RAG steps. Why are embeddings useful? '
        + 'Why is updating RAG usually cheaper than fine-tuning?',
    })
  })

  it('never returns an empty question', () => {
    for (const m of withQuickCheck) {
      expect(quickCheckOf(m.body)!.question.length, m.slug).toBeGreaterThan(10)
      expect(quickCheckOf(m.body)!.question, m.slug).not.toContain('Quick Check')
    }
  })

  it('works on the raw file, rail and sequence links included', () => {
    // Callers hand this the loader's stripped body; a caller that does not
    // must still get the same answer.
    for (const m of withQuickCheck) {
      const raw = `## Tutorial Progress\n\n\`\`\`mermaid\ngraph LR\n A --> B\n\`\`\`\n\n${m.body}`
      expect(quickCheckOf(raw), m.slug).toEqual(quickCheckOf(m.body))
    }
  })

  it('carries no authored model answer to reveal — there is none in the corpus', () => {
    // Greps for `**Answer`, `Model answer`, `Cevap` and `<details>` return
    // nothing across the 32 English sheets, which is why §12.6 withdraws
    // §5.10's `REVEAL MODEL ANSWER` and there is no field for one here.
    for (const m of modules) {
      expect(m.body, m.slug).not.toMatch(/\*\*Answer|Model answer|<details>/i)
    }
    expect(Object.keys(quickCheckOf(body(3))!)).toEqual(['question'])
  })
})

describe('summarySection', () => {
  it('returns the section body without its heading', () => {
    expect(summarySection('## Summary\n\nThe short of it.\n\n## References\n\n- a\n'))
      .toBe('The short of it.')
  })

  it('returns null where the sheet authored no summary', () => {
    expect(summarySection('## I. Something\n\nProse.\n')).toBeNull()
  })

  it('drops the Quick Check paragraph, which the sheet prints inside Summary', () => {
    // All 14 Quick Checks sit inside the `## Summary` section. Reprinting the
    // question underneath the reader's own answer is §12.6's other trap.
    expect(summarySection('## Summary\n\nThe short of it.\n\n**Quick Check**: why?\n'))
      .toBe('The short of it.')
  })

  it('keeps content the removed Quick Check paragraph ran into', () => {
    // Only the paragraph goes. A list that interrupted it is the sheet's own
    // content and stays.
    expect(summarySection('## Summary\n\nThe short of it.\n\n**Quick Check**: why?\n- a\n'))
      .toBe('The short of it.\n\n- a')
  })

  it('ignores a `## Summary` heading inside a fenced code block', () => {
    expect(summarySection('```markdown\n## Summary\n\nfake\n```\n')).toBeNull()
  })

  it('stops at the next heading of any level', () => {
    expect(summarySection('## Summary\n\nOne.\n\n### Sub\n\nTwo.\n')).toBe('One.')
  })

  it('exists on all 15 drawn sheets and on none of the 17 undrawn ones', () => {
    for (const m of modules) {
      const drawn = m.frontmatter.status === 'ready'
      expect(summarySection(m.body) === null, m.slug).toBe(!drawn)
    }
    expect(modules.filter((m) => summarySection(m.body) !== null)).toHaveLength(15)
  })

  it('never hands back the question the reader was just asked', () => {
    for (const m of withQuickCheck) {
      expect(summarySection(m.body), m.slug).not.toContain('Quick Check')
      expect(summarySection(m.body), m.slug)
        .not.toContain(quickCheckOf(m.body)!.question)
    }
  })

  it('never hands back a heading or the sequence-link furniture', () => {
    for (const m of modules.filter((c) => c.frontmatter.status === 'ready')) {
      expect(summarySection(m.body), m.slug).not.toMatch(/^#{1,6}[ \t]/m)
      expect(summarySection(m.body), m.slug).not.toContain('**Next Module:**')
      expect(summarySection(m.body), m.slug).not.toContain('**Previous Module:**')
    }
  })

  it('reproduces sheet 3\'s summary verbatim, encouragement and all', () => {
    // The trailing `Keep going! 🚀` is the author's, not the site's: §12.14.1
    // governs new UI copy, and this string is quoted content that already
    // renders in `<Prose>` further up the same sheet.
    expect(summarySection(body(3))).toBe(
      'RAG boosts LLMs with your code and document knowledge. You now know '
      + 'embeddings, DBs, and the steps. Try ChromaDB for practice!\n\nKeep going! 🚀',
    )
  })

  it('works on the raw file, sequence links included', () => {
    // On sheets 2-7 the Summary is the last section, so the raw file's
    // `**Next Module:**` lines fall inside it.
    for (const m of modules) {
      const raw = `${m.body}\n**Previous Module:** [x](1_llms.md)\n**Next Module:** [y](3_rag.md)\n`
      expect(summarySection(raw), m.slug).toBe(summarySection(m.body))
    }
  })
})
