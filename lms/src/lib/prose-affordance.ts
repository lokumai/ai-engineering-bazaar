/**
 * The two behaviours §6 asks of the prose column that CSS cannot express.
 *
 * Both are affordances, not information: with JavaScript off the table still
 * scrolls and the code is still selectable and copyable by hand. Nothing here
 * is allowed to be the sole carrier of anything (§10.4).
 */

/** §6.7 — `COPY` switches to `COPIED` for 1200ms, then back. */
export const COPIED_MS = 1200

/** Sub-pixel slack: a zoomed or fractionally-scaled browser never hits 0 exactly. */
const END_EPSILON = 1

export type OverflowState = 'none' | 'right'

/**
 * §6.5 — the 24px right-edge fade, present "only while `scrollWidth >
 * clientWidth`" and removed at the right end. Anything else and the fade is
 * lying about there being more table.
 */
export function overflowState(box: {
  scrollLeft: number
  scrollWidth: number
  clientWidth: number
}): OverflowState {
  const remaining = box.scrollWidth - box.clientWidth - box.scrollLeft
  return remaining > END_EPSILON ? 'right' : 'none'
}
