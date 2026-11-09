import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { STORY_FILE, loadStory, parseStory } from '@/lib/content/story'

/**
 * M90, D115 — the About page renders `mini-courses/STORY.md` and restates none of it.
 *
 * Every assertion is a rule that holds for any story: the file is read independently here, with a
 * plain line scan rather than the parser under test, and the two are compared. No heading, no
 * sentence and no count is written into this file (tests/README.md).
 */

const raw = readFileSync(STORY_FILE, 'utf8')
/** The `##` headings, by the simplest possible reading of the file. */
const headings = raw.split('\n').filter((line) => /^## /.test(line)).map((line) => line.slice(3).trim())
/** The file's last non-blank line. */
const lastLine = raw.trim().split('\n').at(-1)!.trim()

describe('STORY.md becomes the About page', () => {
  const story = loadStory()

  it('reads a story with headings at all', () => {
    expect(headings.length, 'STORY.md has no ## heading; is the file still there?').toBeGreaterThan(1)
  })

  it('makes every ## section one stall, in file order', () => {
    expect(story.stalls.map((stall) => stall.heading)).toEqual(headings)
  })

  it('gives every stall the text under its heading', () => {
    for (const stall of story.stalls) {
      expect(stall.paragraphs.length, stall.heading).toBeGreaterThan(0)
      for (const paragraph of stall.paragraphs) {
        expect(raw.replace(/\s+/g, ' '), 'a paragraph the file does not contain').toContain(paragraph)
      }
    }
  })

  it('takes the motto from the closing line and from nowhere else', () => {
    expect(story.motto, 'the closing line is a lead and a bold quotation, and no motto was read').not.toBeNull()
    const { lead, lines } = story.motto!
    expect(lastLine.startsWith(`${lead}:`)).toBe(true)
    // The quotation's words, with the curly marks put back to straight ones, are the line's words.
    const words = lines.join(' ').replace(/[“”]/g, '"')
    expect(lastLine).toContain(words)
    // And it belongs to no stall.
    for (const stall of story.stalls) expect(stall.paragraphs.join(' ')).not.toContain(lines[0])
  })
})

describe('the parser, on any story', () => {
  it('keeps a stall per heading, drops text before the first, and leaves the motto out of the stalls', () => {
    const story = parseStory(
      ['# A title', '', 'Preamble.', '', '## One', '', 'First.', '', 'Second', 'wrapped.', '', '## Two', 'Under it.', '',
        'Lead: **"Alpha beta. Gamma?"**', ''].join('\n'),
    )
    expect(story.title).toBe('A title')
    expect(story.stalls).toEqual([
      { heading: 'One', paragraphs: ['First.', 'Second wrapped.'] },
      { heading: 'Two', paragraphs: ['Under it.'] },
    ])
    expect(story.motto).toEqual({ lead: 'Lead', lines: ['“Alpha beta.', 'Gamma?”'] })
  })

  it('reads no motto when the story does not end on one', () => {
    const story = parseStory('## One\n\nA closing paragraph: with a colon.\n')
    expect(story.motto).toBeNull()
    expect(story.stalls[0].paragraphs).toEqual(['A closing paragraph: with a colon.'])
  })

  it('drops inline marks to their text', () => {
    const story = parseStory('## **Bold** heading\n\nSome *emphasis* and `code`.\n')
    expect(story.stalls[0]).toEqual({ heading: 'Bold heading', paragraphs: ['Some emphasis and code.'] })
  })
})
