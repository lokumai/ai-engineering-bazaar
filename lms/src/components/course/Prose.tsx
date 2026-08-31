import { ProseEnhancements } from './ProseEnhancements'

/**
 * The prose column (§6). Everything the pipeline produced is styled by
 * `prose.css` against this one class, so a page hands it the rendered HTML and
 * nothing else — no per-page overrides, no second set of type rules.
 *
 * `--hl-measure`, `--hl-break-left` and `--hl-break-right` are the three
 * variables a sheet layout sets — on this element or any ancestor: the measure
 * it is giving the column, and how much room a width-classed figure may use to
 * either side of it (§6.5). Unset, no figure breaks out and the page cannot
 * scroll horizontally.
 */
export function Prose({ html, className }: { html: string; className?: string }) {
  return (
    <>
      <div
        data-hl-prose=""
        className={className === undefined ? 'prose' : `prose ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <ProseEnhancements />
    </>
  )
}
