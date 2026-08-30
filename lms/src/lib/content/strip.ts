/**
 * Requirement B1 — the build-time strip.
 *
 * Every module in `mini-courses/` ends with two pieces of navigation furniture
 * that the LMS renders itself, from data, and must therefore not render twice:
 *
 *   1. a `## Tutorial Progress` / `## Eğitim İlerlemesi` section whose only
 *      content is a mermaid rail with a baked-in `fill:#90EE90` "done" colour —
 *      i.e. a progress claim about a reader the file has never met (§1, §5.8);
 *   2. trailing `**Previous Module:** …` / `**Next Module:** …` lines, which
 *      §5.7 draws from the manifest instead.
 *
 * The transformation happens here, on the markdown string, at load time.
 * `mini-courses/` is read-only: MkDocs still serves those files verbatim.
 */

/** Section headings that introduce the progress rail, English and Turkish. */
const PROGRESS_HEADING = /^##[ \t]+(Tutorial Progress|Eğitim İlerlemesi)[ \t]*$/
/** Any h1 or h2 — where a stripped section stops. */
const SECTION_BREAK = /^#{1,2}[ \t]/
/** The trailing sequence links, in both languages, module and category forms. */
const SEQUENCE_LINK =
  /^\*\*(Previous|Next) (Module|Category):\*\*|^\*\*(Önceki|Sonraki) (Modül|Kategori):\*\*/

/** Collapse the blank run a removal leaves behind at the end of the file. */
function tidyTail(lines: string[]): string {
  return `${lines.join('\n').replace(/\s+$/, '')}\n`
}

/**
 * Drop the progress-rail section: its h2 through to just before the next
 * heading, or to the end of the file.
 */
export function stripProgressSection(markdown: string): string {
  const lines = markdown.split('\n')
  const kept: string[] = []
  let inRail = false

  for (const line of lines) {
    if (PROGRESS_HEADING.test(line)) {
      inRail = true
      continue
    }
    if (inRail) {
      if (!SECTION_BREAK.test(line)) continue
      inRail = false
    }
    kept.push(line)
  }

  return tidyTail(kept)
}

/** Drop the `**Previous Module:** …` / `**Next Module:** …` furniture lines. */
export function stripSequenceLinks(markdown: string): string {
  return tidyTail(markdown.split('\n').filter((line) => !SEQUENCE_LINK.test(line)))
}

/**
 * The whole of B1, in the order the loader applies it. Idempotent: running it
 * on an already-stripped body returns that body unchanged.
 */
export function stripBuildFurniture(markdown: string): string {
  return stripSequenceLinks(stripProgressSection(markdown))
}
