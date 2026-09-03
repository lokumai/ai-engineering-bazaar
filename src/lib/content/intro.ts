import { categoryBySlug } from './curriculum-file'
import { loadCategoryIntro } from './loader'

/**
 * §4.9 — the subsystem README, prepared for the prose pipeline.
 *
 * Every category README opens with a heading and a paragraph or two of real
 * prose, then repeats itself as a `## Modules` manifest of markdown-file
 * links, then signs off with a `[← Back to overview]` link to `../index.md`.
 * The prose is the only part of that a category page can use:
 *
 *   - the h1 is the category title, which the page already prints from
 *     `CATEGORIES` at `text-h1`;
 *   - the manifest is the index table §4.9 puts below it, with none of the
 *     extent, source, language or status the table adds;
 *   - the back-link and every link in the manifest address `*.md` files, and
 *     a file path is not a route. `rehypeCourseLinks` translates such a link
 *     into the route it means, but it needs to know which corpus file the href
 *     was written in, and a sheet number is how a caller says so. A category
 *     README has no sheet number, so a surviving one of these links does not
 *     degrade into a 404 to be found later — it **fails the build**, by design.
 *     Stripping them here is what keeps that throw pointed at real defects.
 *
 * The transformation happens here, on the markdown string, at load time:
 * `mini-courses/` is the authored corpus and stays as its authors wrote it.
 */

/** The manifest heading. The corpus writes it in English in all six READMEs. */
const MANIFEST_HEADING = /^##[ \t]+Modules[ \t]*$/i
/** An ordered-list item — the shape every manifest entry takes. */
const LIST_ITEM = /^[ \t]*(?:\d+\.|[-*+])[ \t]+/
/** A wrapped or nested continuation of one: indented, and not a new block. */
const CONTINUATION = /^[ \t]+\S/
/** A line that is nothing but a link into a markdown file. */
const FILE_LINK_LINE = /^\[[^\]]*\]\([^)]*\.md[^)]*\)[ \t]*$/
/** The leading h1. */
const H1 = /^#[ \t]+\S/
/**
 * A fence, of either marker, at any indent. `lines.ts`'s `unfenced` knows the
 * same rule but *drops* what it finds, which is right for a scanner reading
 * structure out of markdown and wrong here: this is the only caller that
 * renders its output, so a fenced block is content to keep, verbatim.
 */
const FENCE = /^[ \t]*(`{3,}|~{3,})/

/** The marker character an opening or closing fence uses, or null. */
function fenceMarker(line: string): string | null {
  return FENCE.exec(line)?.[1][0] ?? null
}

/** Collapse the blank runs a removal leaves behind. */
function tidy(lines: string[]): string {
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * The README's prose, with the manifest and the back-link removed. Returns an
 * empty string when there is nothing else in the file — an empty introduction
 * renders as no introduction, never as a box with a heading and no content
 * (§11.30).
 */
export function stripCategoryManifest(markdown: string): string {
  const kept: string[] = []
  let fence: string | null = null
  let seenH1 = false
  let inManifest = false

  for (const line of markdown.split('\n')) {
    // Inside a fenced block nothing is markup: a `## Modules` line there is a
    // code sample about a README, not this README's manifest.
    if (fence !== null) {
      kept.push(line)
      if (fenceMarker(line) === fence) fence = null
      continue
    }

    if (!seenH1 && H1.test(line)) {
      seenH1 = true
      continue
    }

    if (MANIFEST_HEADING.test(line)) {
      inManifest = true
      continue
    }

    if (inManifest) {
      // The list, its wrapped continuations, and the blank lines between them.
      // Anything else ends the manifest and is kept: the Fundamentals README
      // closes with a sentence that sits after its list.
      if (line.trim() === '' || LIST_ITEM.test(line) || CONTINUATION.test(line)) continue
      inManifest = false
    }

    if (FILE_LINK_LINE.test(line)) continue

    fence = fenceMarker(line)
    kept.push(line)
  }

  return tidy(kept)
}

/**
 * A category's introduction, ready to render, or null where there is none.
 * Unknown slugs return null rather than throwing: a route that does not exist
 * is `notFound()`'s problem, not this function's.
 */
export function categoryIntro(slug: string): string | null {
  const category = categoryBySlug(slug)
  if (!category) return null

  const readme = loadCategoryIntro(category.slug)
  if (readme === null) return null

  const intro = stripCategoryManifest(readme)
  return intro === '' ? null : intro
}
