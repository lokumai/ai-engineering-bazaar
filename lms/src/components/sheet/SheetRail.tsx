import type { TocEntry } from '@/lib/content/render'
import { DependencyBlock, type DependencyRelation } from './DependencyBlock'
import { SectionSpine } from './SectionSpine'

/**
 * §4.6 — the left rail, in the three parts the spec gives it and in its order:
 * the section spine, a hairline rule 24px clear either side, and the
 * dependency block.
 *
 * The costume budget (§4.3) allows this region exactly one motif — the spine
 * and its dependency lines. No registration marks, no stamps, no hatching.
 *
 * The same component fills the drawer below 1024px (§4.7). Only one copy is
 * ever in the accessibility tree: the in-flow rail is `display: none` at those
 * widths, and the drawer's copy exists only while the drawer is open.
 */
export function SheetRail({
  toc,
  relations,
}: {
  toc: readonly TocEntry[]
  relations: readonly DependencyRelation[]
}) {
  return (
    <>
      <SectionSpine entries={toc} />
      {toc.length > 0 && <hr className="hl-rail-rule" aria-hidden="true" />}
      <DependencyBlock relations={relations} />
    </>
  )
}
