import { categoryBySlug } from './categories'
import { unfenced } from './lines'
import { loadCategoryIntro } from './loader'

/**
 * §4.9 — the subsystem README, prepared for the prose pipeline.
 *
 * Every category README opens with a heading and a paragraph or two of real
 * prose, then repeats itself as a `## Modules` manifest of markdown-file
 * links, then signs off with a back-link into the MkDocs site. The prose is
 * the only part of that a category page can use:
 *
 *   - the h1 is the category title, which the page already prints from
 *     `CATEGORIES` at `text-h1`;
 *   - the manifest is the index table §4.9 puts below it, with none of the
 *     extent, source, language or status the table adds;
 *   - the back-link and every link in the manifest address `*.md` files, which
 *     are routes on the MkDocs site and 404s here.
 *
 * The transformation happens here, on the markdown string, at load time.
 * `mini-courses/` is read-only: MkDocs still serves those files verbatim.
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
  let seenH1 = false
  let inManifest = false

  for (const line of unfenced(markdown)) {
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
