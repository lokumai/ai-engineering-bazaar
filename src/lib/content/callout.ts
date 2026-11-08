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

/** `[!IMPORTANT]` at the start of a quote's first paragraph, with the line break after it. */
export const CALLOUT_MARKER = new RegExp(`^\\[!(${CALLOUT_KINDS.join('|')})\\][ \\t]*\\r?\\n?`, 'i')

/** The text with every marker taken out, for a reader of the words alone (the search index). */
export function withoutCalloutMarkers(text: string): string {
  return text.replace(new RegExp(CALLOUT_MARKER.source.replace(/^\^/, ''), 'gi'), ' ')
}

/** The kind a text opens with, or `null` when it is not a call-out. */
export function calloutKindOf(text: string): CalloutKind | null {
  const hit = CALLOUT_MARKER.exec(text)
  return hit === null ? null : (hit[1].toLowerCase() as CalloutKind)
}
