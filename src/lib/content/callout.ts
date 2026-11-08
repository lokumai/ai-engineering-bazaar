/**
 * A call-out, written the way GitHub writes one.
 *
 * The corpus is read in two places: on this site and on GitHub, where the same files are
 * browsed as they stand. A GitHub alert is the one call-out both can show without raw
 * HTML, which the renderer strips (`mini-courses/CLAUDE.md`, "Images and captions"):
 *
 * ```markdown
 * > [!IMPORTANT]
 * > **Title line**
 * >
 * > Body.
 * >
 * > **[Link text](https://example.com)**
 * ```
 *
 * GitHub draws that as a tinted box with an icon and the word "Important". Here the
 * marker is removed, the box becomes a centred card, and a last paragraph that is only a
 * link becomes a button (`rehypeBlockquotes`). Rejected: a custom `:::card` fence, which
 * GitHub prints as literal colons, and `<div align="center">`, which this renderer drops
 * and which would leave the site with a plain quote.
 *
 * The five words are GitHub's. The marker names a KIND, not copy: the card's wording is
 * the author's, in the file, in each language, so nothing here needs a translation.
 */
export const CALLOUT_KINDS = ['note', 'tip', 'important', 'warning', 'caution'] as const
export type CalloutKind = (typeof CALLOUT_KINDS)[number]

/**
 * `[!IMPORTANT]` alone on the first line of a quote, as GitHub reads it: the marker, then the end of
 * its line. `> [!NOTE] Title` on one line is not an alert there, so it is not a call-out here either;
 * it stays a quote with the marker in it, which the corpus check refuses to let reach a page.
 */
export const CALLOUT_MARKER = new RegExp(`^\\[!(${CALLOUT_KINDS.join('|')})\\][ \\t]*(?:\\r?\\n|$)`, 'i')

/** The text with every marker taken out, for a reader of the words alone (the search index). */
export function withoutCalloutMarkers(text: string): string {
  // Anywhere, and without the line end: text read out of a tree has lost the line break, or has
  // a hard break in its place, and the marker is not a word for a reader to search for.
  return text.replace(new RegExp(`\\[!(?:${CALLOUT_KINDS.join('|')})\\]`, 'gi'), ' ')
}

/** The kind a text opens with, or `null` when it is not a call-out. */
export function calloutKindOf(text: string): CalloutKind | null {
  const hit = CALLOUT_MARKER.exec(text)
  return hit === null ? null : (hit[1].toLowerCase() as CalloutKind)
}
