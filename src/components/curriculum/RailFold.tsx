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
 * ## M21 — ONE control, and how it keeps its label on channel A
 *
 * There were two: a 28px square in the rail's head, and this tab. The author
 * wants the tab to do both jobs and the head's button gone.
 *
 * **The reason there were two is real and it is not the reason it looked
 * like.** It was never about ARIA. A trigger has to be reachable in both
 * states, and the old tab lived at `left: 0` and existed only while folded —
 * so making it the toggle means giving it a resting place while the rail is
 * OPEN, at the rail's trailing edge rather than the window's. That is the
 * whole of the work; deleting the head's button is one line.
 *
 * **And the label still cannot be React state.** Point 1 above is why: a
 * reader who folded the rail last week meets a folded rail in frame one, so a
 * control whose words are rendered from state would say the wrong thing until
 * hydration. So BOTH labels are in the markup and CSS reveals one, keyed off
 * the same `<html>` attribute everything else here reads — the arrangement the
 * catalog's view toggle already uses for its `Showing` mark. The hidden face is
 * `display: none`, which takes it out of the accessible name computation too,
 * so the button is announced with exactly one name.
 *
 * **Point 3 above is retired with the second button.** Focus was handed from
 * each control to its counterpart because folding hid the one that did the
 * folding. One control that stays on screen needs no hand-off — and that
 * hand-off was the mechanism that latched the rail's scroll offset, which is
 * the bug this milestone also fixes (`bazaar.css`, `.bz-rail`).
 */

const ATTRIBUTE = 'data-bz-rail'
const FOLDED = 'folded'

function setFold(folded: boolean): void {
  const root = document.documentElement
  if (folded) root.setAttribute(ATTRIBUTE, FOLDED)
  else root.removeAttribute(ATTRIBUTE)

  update((data) => setRailFolded(data, folded))
}

/** Points the way the press will move the rail. Mirrored for the other face. */
function Chevron({ back }: { back: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      {back ? <path d="M7.5 2.5L4 6l3.5 3.5" /> : <path d="M4.5 2.5L8 6l-3.5 3.5" />}
      <path d={back ? 'M1.5 1.5v9' : 'M10.5 1.5v9'} />
    </svg>
  )
}

/**
 * The tab on the rail's edge — the ONE fold control (M21).
 *
 * **Vertically centred rather than under the bar, and that is a fix that
 * predates this milestone.** The first version was fixed at `top: 88px`,
 * directly under a sticky header at `z-index: 40`, and could not be clicked at
 * all — found by driving it in a browser, not by reading the CSS (D15).
 * Centred, it cannot collide with the bar whatever the bar's height becomes.
 *
 * It rides the rail's trailing edge when the rail is open and the window's
 * edge when it is folded, moving between the two on the same duration the
 * shell's own columns take, so the tab and the column arrive together.
 *
 * **It carries no `aria-expanded`.** The two faces below name the ACTION the
 * press performs, and exactly one of them is in the accessible tree at a time —
 * so the state a reader is told is the state CSS is drawing, and no React
 * render is a second author of it.
 */
export function RailTab() {
  return (
    <button
      type="button"
      data-bz-rail-toggle=""
      className="bz-rail-tab"
      onClick={() => {
        setFold(!document.documentElement.hasAttribute(ATTRIBUTE))
      }}
    >
      {/* Both faces always render. Which one is in the document's accessible
          tree is CSS's answer, keyed off the `<html>` attribute the boot script
          stamps before first paint — so a reader who folded the rail last week
          meets a tab that says `Show the curriculum` in frame one. */}
      <span className="bz-rail-tab-face" data-when="open">
        <Chevron back />
        <span className="sr-only">Hide the curriculum</span>
      </span>
      <span className="bz-rail-tab-face" data-when="folded">
        <Chevron back={false} />
        <span className="sr-only">Show the curriculum</span>
      </span>
    </button>
  )
}
