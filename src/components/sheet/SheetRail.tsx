import type { TocEntry } from '@/lib/content/render'
import { DependencyBlock, type DependencyRelation } from './DependencyBlock'
import { SectionSpine } from './SectionSpine'

/**
 * M11 — the RIGHT rail: what is on this page, and what this page depends on.
 *
 * It used to be the left rail, and the swap is the point. The left side now
 * holds the curriculum (`CurriculumRail`), because the thing a reader reaches
 * for most on a course page is another page of the course. What is on the page
 * you are already reading is a within-page aid, and it goes on the side you
 * scan back to. See `kia-context/logs/PROGRESS.md` M10/M11.
 *
 * ## What was cut, and where it went
 *
 * The rail used to be the module's instrument panel: twelve rows of metadata,
 * the reader's own `CHECKED BY` field, the registered-repository count and the
 * stamp grid, all in 240px beside the prose. Every one of those still exists
 * and every one of them moved **into the column**, into `TitleStrip` — which
 * already rendered exactly that set as the narrow-window variant, so nothing
 * new had to be built and nothing was dropped. What changed is that the strip
 * is now the only place it lives, at every width, instead of the fallback for
 * one. Nothing lost its home, so nothing went to
 * `kia-context/logs/BRAINSTORM.md` O2.
 *
 * What is left is the two things a reader uses while reading: the sections of
 * this module, and the modules either side of it in the dependency graph.
 *
 * The same component fills the drawer below the breakpoint where the rail goes
 * (§4.7). Only one copy is ever in the accessibility tree: the in-flow rail is
 * `display: none` at those widths, and the drawer's copy exists only while the
 * drawer is open.
 *
 * ## M16 stage 5 — the section index, and nothing else
 *
 * `01`'s aside is *"a `label` heading, then items indented behind a `line` rail
 * that turns `primary` on the current item"*, and that is the whole of it. It
 * carried a second half here — a horizontal rule, an `Around this module`
 * label and the dependency list — and that half moved: `01` puts the module's
 * relations behind the action row's quiet `Requirements (n)` button, which
 * makes them a disclosure a reader opens rather than a permanent column of
 * numbers beside the prose. `04`'s aside kept a facts block; `01` dropped it
 * for the same reason.
 */
export function SheetRail({ toc }: { toc: readonly TocEntry[] }) {
  return (
    <>
      {toc.length > 0 && (
        <b className="bz-aside-label" id="hl-on-this-page">
          On this page
        </b>
      )}
      <SectionSpine entries={toc} />
    </>
  )
}
