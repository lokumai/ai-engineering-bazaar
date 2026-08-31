/**
 * Requirement B1 — the build-time strip.
 *
 * Every module in `mini-courses/` ends with two pieces of navigation furniture
 * that the app renders itself, from data, and must therefore not render twice:
 *
 *   1. a `## Tutorial Progress` / `## Eğitim İlerlemesi` section whose only
 *      content is a mermaid rail with a baked-in `fill:#90EE90` "done" colour —
 *      i.e. a progress claim about a reader the file has never met (§1, §5.8);
 *   2. trailing `**Previous Module:** …` / `**Next Module:** …` lines, which
 *      §5.7 draws from the manifest instead.
 *
 * The transformation happens here, on the markdown string, at load time:
 * `mini-courses/` is the authored corpus and stays as its authors wrote it.
 * Note that a sequence link surviving the strip would not be a dead link —
 * `links.ts` rewrites internal `.md` links into real routes — it would be a
 * second, hand-maintained copy of the navigation §5.7 already draws from the
 * manifest, which is the thing worth removing.
 */

/** Section headings that introduce the progress rail, English and Turkish. */
const PROGRESS_HEADING = /^##[ \t]+(Tutorial Progress|Eğitim İlerlemesi)[ \t]*$/
/** Any h1 or h2 — where a stripped section stops. */
const SECTION_BREAK = /^#{1,2}[ \t]/
/** The trailing sequence links, in both languages, module and category forms. */
const SEQUENCE_LINK =
  /^\*\*(Previous|Next) (Module|Category):\*\*|^\*\*(Önceki|Sonraki) (Modül|Kategori):\*\*/
/** B6.1 — the leading h1 the sheet renders from frontmatter instead. */
const LEAD_H1 = /^#[ \t]+\S/
/** B6.2 — the italic dek, in both languages the corpus is written in. */
const LEAD_DEK = /^\*(Category|Kategori):\s.*\*$/

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
 * B6.1 / B6.2 on the markdown — the two lines `rehypeDropFirstH1` and
 * `rehypeDropDek` delete from the rendered tree, so that a count taken here
 * measures the same document the reader is shown.
 *
 * This is for **measurement only**. The body the loader serves keeps both
 * lines and the removal happens once, at render time, on the AST: doing it
 * twice would be two chances to disagree. §5.5 makes the distinction
 * explicit — `EXTENT` is "words counted from the AST after stripping
 * frontmatter, the dek, and the deleted progress rail" — and without this the
 * printed extent counts 5–18 words no sheet ever puts on the page.
 */
export function stripLeadIn(markdown: string): string {
  const lines = markdown.split('\n')
  let at = 0
  const nextContentLine = () => {
    while (at < lines.length && lines[at].trim() === '') at += 1
  }

  nextContentLine()
  if (at < lines.length && LEAD_H1.test(lines[at])) lines.splice(at, 1)
  nextContentLine()
  if (at < lines.length && LEAD_DEK.test(lines[at].trim())) lines.splice(at, 1)

  return lines.join('\n')
}

/**
 * The whole of B1, in the order the loader applies it. Idempotent: running it
 * on an already-stripped body returns that body unchanged.
 */
export function stripBuildFurniture(markdown: string): string {
  return stripSequenceLinks(stripProgressSection(markdown))
}
