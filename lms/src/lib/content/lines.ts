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

/**
 * The authoring artifact `## Mermaid Diagram: LLM Workflow` — an h2 whose only
 * job is to introduce the fence under it.
 *
 * Two things read it and they have to read it the same way. `render.ts` strips
 * the prefix to get the section label a `FIG. n.n — …` caption prints, and
 * `topics.ts` skips such a heading when it collects the `TOPICS` column, so a
 * copy of this regex drifting in either file changes what a caption says or
 * what a listing lists. It lives here for the same reason `unfenced` does.
 *
 * Note what it does *not* do: the heading itself still renders on the sheet and
 * still appears in the section spine. Nothing in the spec asks for it to be
 * deleted — Appendix B has no such transform and §5.6 already renders a
 * non-Roman h2 with no numeral — so removing it would be a design decision, and
 * one that belongs in Appendix B before it belongs in code.
 */
export const DIAGRAM_HEADING = /^Mermaid Diagram:\s*/i

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
