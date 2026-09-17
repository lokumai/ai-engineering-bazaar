import { DependencyBlock, type DependencyRelation } from './DependencyBlock'

/**
 * The module's relations, behind the quiet button `01` draws — M16 stage 5.
 *
 * Reference: `playground/01-theme-T4-ground-G3-powder.html`'s action row,
 * whose second control is `<button class="btn g">Requirements (2)</button>`.
 * The mockup supplies the label, the count and the shape, and what it implies
 * is the thing worth noticing: **the dependency list is a disclosure, not a
 * column.** It used to be the bottom half of the right rail — a permanent
 * `Around this module` block of module numbers beside the prose — and a reader
 * consults it once, when deciding whether they can start.
 *
 * A native `<details>`, for the reason `MainNav` gives at length: it works
 * before any bundle arrives, its contents are genuinely inert when closed so
 * nothing leaks into the tab order, and `<summary>` carries the expanded state
 * to a screen reader without anyone re-implementing it. The summary takes the
 * language's quiet-button primitive, which is what the mockup's `.btn.g` is.
 *
 * **The count is the first relation's, not all three.** `01` says
 * `Requirements (2)` and requirements are what gate a reader; `Unlocks` and
 * `See also` are in the panel but do not belong in a number that answers "can
 * I start this yet". Zero relations of any kind means no disclosure at all —
 * a control that opens an empty panel is the claim §1 forbids.
 */
export function Requirements({ relations }: { relations: readonly DependencyRelation[] }) {
  const carried = relations.filter((relation) => relation.targets.length > 0)
  if (carried.length === 0) return null

  const requirements = relations.find((relation) => relation.label === 'Requirements')
  const count = requirements?.targets.length ?? 0

  return (
    <details className="bz-requires">
      <summary className="bz-btn bz-btn-quiet">Requirements ({count})</summary>
      <div className="bz-requires-body">
        <DependencyBlock relations={relations} />
      </div>
    </details>
  )
}
