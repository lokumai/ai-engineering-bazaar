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
/** A fence, so nothing inside a code block is mistaken for content. */
const FENCE = /^[ \t]*(`{3,}|~{3,})/

/** The source's lines, with everything inside a fenced code block dropped. */
function unfenced(markdown: string): string[] {
  const out: string[] = []
  let fence: string | null = null

  for (const line of markdown.split('\n')) {
    const match = FENCE.exec(line)
    if (match) {
      const marker = match[1][0]
      if (fence === null) fence = marker
      else if (fence === marker) fence = null
      continue
    }
    if (fence === null) out.push(line)
  }

  return out
}

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
