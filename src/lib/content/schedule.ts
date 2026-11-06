import { unfenced } from './lines'

/**
 * §4.5 — the two pieces of content an A4 detail sheet is made of.
 *
 * **MEASURED:** every one of the seventeen stubs contains exactly one h1, an
 * italic dek, an italic placeholder note, one descriptive sentence, and a
 * `**Topics this module will cover**:` bullet list. That list is a *schedule
 * of parts* — the bill of materials for geometry that is not yet drawn — and
 * §4.5 makes it the sheet's real content rather than something to apologise
 * for. Both values are read out of the source here so the sheet never prints a
 * sentence a human retyped into frontmatter (§11.25).
 */

/** The schedule's heading, in both languages the corpus is written in. */
const SCHEDULE_HEADING =
  /^\*\*(Topics this module will cover|Bu modülde (?:işlenecek|ele alınacak) konular)\*\*\s*:?\s*$/

/** A list item: any of the three bullet markers markdown allows. */
const ITEM = /^[ \t]*[-*+][ \t]+(.+?)[ \t]*$/

/** The italic dek and the italic placeholder note — a whole line in emphasis. */
const ITALIC_LINE = /^\*[^*].*\*$/
/** An ATX heading of any level. */
const HEADING = /^#{1,6}[ \t]/
/**
 * §4.5 item 6 — the topics list, in source order. Empty for a sheet that has
 * no schedule, which is every drawn sheet: this is the draft format's content,
 * not a section every module carries.
 */
export function scheduleOfParts(markdown: string): string[] {
  const lines = unfenced(markdown)
  const start = lines.findIndex((line) => SCHEDULE_HEADING.test(line))
  if (start === -1) return []

  const parts: string[] = []
  for (const line of lines.slice(start + 1)) {
    const item = ITEM.exec(line)
    if (item) {
      parts.push(item[1])
      continue
    }
    // A blank line inside a tight list is tolerated; anything else ends it.
    if (line.trim() === '' && parts.length === 0) continue
    if (line.trim() === '') continue
    break
  }

  return parts
}

/**
 * §4.5 item 5 — the one descriptive sentence, which on a stub is the only
 * prose there is. The h1, the dek and the parenthesised placeholder note are
 * all skipped: the first is rendered from frontmatter (B6.1), the second is
 * redundant with the title block (B6.2), and the third is an apology, not a
 * description. Returns null rather than inventing a sentence.
 */
export function summarySentence(markdown: string): string | null {
  const paragraph: string[] = []

  for (const line of unfenced(markdown)) {
    const text = line.trim()

    if (text === '') {
      if (paragraph.length > 0) break
      continue
    }
    if (SCHEDULE_HEADING.test(text)) break
    if (paragraph.length === 0 && (HEADING.test(text) || ITALIC_LINE.test(text))) continue
    if (ITEM.test(line) && paragraph.length === 0) break

    paragraph.push(text)
  }

  return paragraph.length === 0 ? null : paragraph.join(' ')
}

/** A fence opener or closer, as `lines.ts` reads it. */
const FENCE_LINE = /^[ \t]*(`{3,}|~{3,})/
/** An h2: where a written section starts. */
const H2_LINE = /^##[ \t]/
/**
 * A references list in any of the three languages. A planned module that has
 * only this has nothing written yet: it keeps its old sheet (PR #74 review).
 */
const REFERENCES_H2 = /^##[ \t]+(References|Kaynaklar|منابع)[ \t]*$/

/**
 * The sections a planned module already has written, from its first h2 to the
 * end, as raw markdown; null when it has none (D102).
 *
 * A planned module is a sentence and a schedule of parts, and the sheet draws
 * only those. When a written module gives a section away to a planned one
 * (Loop Engineering's agent teams, dynamic workflows and recursive language
 * models went to Advanced Loop Engineering, #48), the author chose to keep the
 * text readable on the site rather than parked in a scratch file, so the sheet
 * renders these sections as prose under the schedule. Rejected: marking the
 * module `ready`, which would offer a completion mark and a place in the
 * reader's progress for a module that is mostly unwritten.
 *
 * Fences are tracked here rather than through `unfenced`, which drops lines
 * and so cannot say where in the source a heading sits; an `## ` inside a code
 * block is not a section.
 */
export function writtenSections(markdown: string): string | null {
  const lines = markdown.split('\n')
  const fences = fenceTracker()

  for (let index = 0; index < lines.length; index += 1) {
    if (fences.isFenceOrInside(lines[index])) continue
    if (H2_LINE.test(lines[index])) {
      const rest = lines.slice(index).join('\n').trim()
      return hasWrittenSection(rest) ? rest : null
    }
  }

  return null
}

/** True when some h2 outside a fence is a section and not a references list. */
function hasWrittenSection(markdown: string): boolean {
  const fences = fenceTracker()
  for (const line of markdown.split('\n')) {
    if (fences.isFenceOrInside(line)) continue
    if (H2_LINE.test(line) && !REFERENCES_H2.test(line.trim())) return true
  }
  return false
}

/**
 * Reads lines in order and says whether each is a fence or inside one. A fence
 * closes only on the same character, at least as long as the one that opened
 * it, so a ```` block may hold a ``` example (CommonMark's rule).
 */
function fenceTracker(): { isFenceOrInside: (line: string) => boolean } {
  let open: string | null = null
  return {
    isFenceOrInside(line: string): boolean {
      const match = FENCE_LINE.exec(line)
      if (match) {
        const run = match[1]
        if (open === null) open = run
        else if (run[0] === open[0] && run.length >= open.length) open = null
        return true
      }
      return open !== null
    },
  }
}
