/**
 * One fence rule, in one place.
 *
 * Three things read structure out of raw markdown — the schedule of parts
 * (§4.5), the section titles behind the `TOPICS` column (§4.9) and the
 * category introduction (§4.9) — and every one of them is wrong the moment it
 * mistakes a line inside a fenced code block for content. The corpus contains
 * 44 tagged code blocks, several of them markdown, so `## I. Heading` really
 * does appear inside a fence.
 */

/** A fence, of either marker, at any indent. */
const FENCE = /^[ \t]*(`{3,}|~{3,})/

/** The source's lines, with everything inside a fenced code block dropped. */
export function unfenced(markdown: string): string[] {
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
