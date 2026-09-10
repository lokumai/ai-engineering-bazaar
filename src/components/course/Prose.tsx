import { MermaidFigure } from '@/components/figure/MermaidFigure'

/**
 * The prose column (§6). Everything the pipeline produced is styled against
 * this one class, so a page hands it the rendered HTML and nothing else — no
 * per-page overrides, no second set of type rules.
 *
 * `bz-prose` is the language's own name for it: the paragraph, link, list and
 * emphasis rules are `01`'s, transcribed in `src/design/bazaar.css`, and
 * `src/app/prose.css` adds only what the corpus has and the mockup's one
 * sample of prose does not — a table, a blockquote, a caption, a code slab, a
 * heading anchor.
 *
 * ## The three variables that used to be documented here are gone
 *
 * `--hl-measure`, `--hl-break-left` and `--hl-break-right` were described as
 * "the three variables a sheet layout sets". **Nothing ever set them and no
 * stylesheet ever read them** — they existed in this docblock alone, which is
 * why `containment.spec.ts` was passing vacuously against an anchor
 * (`.hl-column`) that no component emitted either.
 *
 * What replaced them is simpler and is what the language already says: a
 * figure is capped at the measure and **scrolls inside its own box**. `04` has
 * a `.bleed` utility for a figure allowed past the text; the ratified shell
 * deliberately does not, and `01` draws no figure wider than its column. So
 * `data-hl-width` stays as the renderer's CLASSIFICATION of a figure — it is
 * what `title-block` counts and what a later stage would need to widen one —
 * and the design spends nothing on it yet. Recorded rather than removed,
 * because removing it would throw away the measurement.
 */
export function Prose({
  html,
  className,
  opening,
}: {
  html: string
  className?: string
  /**
   * Rendered as the FIRST child of the prose, before the corpus's own HTML.
   * `01` puts the objectives card exactly there — `.goals` is `.prose`'s first
   * element — and `dangerouslySetInnerHTML` cannot share an element with
   * children, so the corpus gets an inner box and the slot sits beside it.
   */
  opening?: React.ReactNode
}) {
  return (
    <>
      <div data-hl-prose="" className={className === undefined ? 'bz-prose' : `bz-prose ${className}`}>
        {opening}
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      {/* §6.10 — the diagram island. It reads the page before it imports
          anything, so prose with no figures never fetches mermaid. */}
      <MermaidFigure />
    </>
  )
}
