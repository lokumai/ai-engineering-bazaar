'use client'

import { setRailFolded } from '@/lib/record/events'
import { update } from '@/lib/record/store'

/**
 * M10 — the fold, and the tab that brings the rail back.
 *
 * The author's words: *"the left sidebar should be collapsible using a proper
 * smooth animation that feels snappy."* It folds in 200ms on
 * `cubic-bezier(.22,.61,.36,1)` (`kia-context/specs/DESIGN.md`, `motion.fold`),
 * and the global `prefers-reduced-motion` rule in `globals.css` collapses that
 * to instant.
 *
 * ## Three things here are load-bearing
 *
 * **1. The state lives on `<html>`, not in React.** `data-bz-rail="folded"` is
 * stamped by the pre-paint boot script (§12.2 channel A), so a reader who
 * folded the rail last week gets a folded rail in frame one — no flash of an
 * open column, no hydration, no layout shift. CSS does the rest. That is also
 * why neither button renders any state: their labels name the action they
 * perform, so the server's HTML and the first client render agree by
 * construction and there is nothing to reconcile.
 *
 * **2. The preference is written through the record store and nowhere else.**
 * `store.ts` is the only writer of learner state
 * (`kia-context/specs/ARCHITECTURE.md` §5). A second `localStorage` key beside
 * the record would be a second writer, and it would also be invisible to the
 * export, the erase dialog and the account merge — three surfaces that are
 * supposed to account for everything this site remembers about a reader.
 *
 * **3. Focus follows the control that is on screen.** Folding hides the button
 * that did the folding, and `visibility: hidden` removes an element from the
 * tab order — which is exactly the property this design wants, because the
 * folded rail's 33 links must not be tabbable. But it means focus would be
 * dropped on the floor, so each control hands focus to its counterpart. That
 * hand-off is asserted by pressing the key rather than by calling `.focus()`,
 * which is the correction recorded in `kia-context/logs/BRAINSTORM.md` D17.
 *
 * ## Why two buttons and not one with `aria-expanded`
 *
 * A disclosure has one trigger; this has two, because the trigger has to be
 * reachable in both states and the rail is 262px of the window in one of them
 * and nothing in the other. Two buttons, each labelled with what it does, is
 * unambiguous without anyone claiming an ARIA state by hand — the same call
 * `MainNav` makes about `<details>`. A single `aria-expanded` button shared
 * between two positions would have to be state-rendered, which puts it back on
 * channel B and reintroduces the first-frame flash that point 1 exists to
 * remove.
 */

const ATTRIBUTE = 'data-bz-rail'
const FOLDED = 'folded'

/** The counterpart control, so focus is never dropped on the floor. */
const HIDE = '[data-bz-rail-hide]'
const RESTORE = '[data-bz-rail-restore]'

function setFold(folded: boolean): void {
  const root = document.documentElement
  if (folded) root.setAttribute(ATTRIBUTE, FOLDED)
  else root.removeAttribute(ATTRIBUTE)

  update((data) => setRailFolded(data, folded))

  // Next frame, not this one: the element about to take focus is the one the
  // attribute has just revealed, and a `focus()` on an element still computing
  // `visibility: hidden` does nothing at all.
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(folded ? RESTORE : HIDE)?.focus()
  })
}

/** In the rail's own head. Only ever on screen while the rail is open. */
export function RailFoldButton() {
  return (
    <button
      type="button"
      data-bz-rail-hide=""
      className="bz-rail-fold"
      /* The mockup's fold control is a 28px square holding a glyph and
         nothing else, so the word that used to sit beside it becomes the
         button's accessible name. It says the ACTION, not the state: a single
         `aria-expanded` trigger would have to be state-rendered, which puts a
         mark a reader meets in frame one on channel B. */
      aria-label="Hide the curriculum"
      onClick={() => setFold(true)}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <path d="M7.5 2.5L4 6l3.5 3.5" />
        <path d="M1.5 1.5v9" />
      </svg>
    </button>
  )
}

/**
 * The tab pinned to the left edge, vertically centred. Only ever on screen
 * while the rail is folded.
 *
 * **Vertically centred rather than under the bar, and that is a fix.** The
 * first version of this tab was fixed at `top: 88px`, directly under a sticky
 * header at `z-index: 40`, and could not be clicked at all — found by driving
 * it in a browser, not by reading the CSS (D15). Centred, it cannot collide
 * with the bar whatever the bar's height becomes.
 */
export function RailRestoreTab() {
  return (
    <button
      type="button"
      data-bz-rail-restore=""
      className="bz-rail-restore"
      aria-label="Show the curriculum"
      onClick={() => setFold(false)}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <path d="M4.5 2.5L8 6l-3.5 3.5" />
        <path d="M10.5 1.5v9" />
      </svg>
    </button>
  )
}
