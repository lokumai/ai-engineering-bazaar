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

/**
 * The series map: an h2 most written modules close with, holding a small
 * mermaid chart of the course with this module highlighted.
 *
 * **It stays in the markdown and leaves the site**, on the author's word: *"it
 * should remain in case someone wants to continue from raw markdown, but it
 * should be removed and not shown in the website or UI."* A reader of a raw
 * file on GitHub has no rail and no breadcrumb, and the chart is how they see
 * where they are; a reader of the site has both, so the chart said a third
 * time what the chrome already says twice.
 *
 * **Every language, and the list is the whole mechanism.** A matcher written
 * in English silently keeps the section on every Turkish page — the failure
 * M19 met twice, in silence, with the quick check and the summary. So both
 * headings are here, in the one place `render.ts` (which drops the section)
 * and `topics.ts` (which must not list it) both read, and
 * `tests/corpus/series-section.test.ts` fails a translation that names the
 * section in a way this list does not know.
 */
export const SERIES_HEADINGS: readonly string[] = [
  'Where this fits in the series',
  'Bu serinin neresindeyiz',
  // M28 — Persian. Fixed in the translators' brief so all nineteen `_fa.md`
  // files say it the same way, and held by the same corpus test.
  'کجای این مجموعه هستیم',
]

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
