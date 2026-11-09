'use client'

import { useEffect } from 'react'
import { setCodePalette, setDiagramTheme } from '@/lib/record/events'
import { update } from '@/lib/record/store'
import { DIAGRAM_THEME_ATTRIBUTE, isDiagramThemeId } from '@/lib/reading/diagram-themes'
import { PALETTE_SUBJECTS, isPaletteId } from '@/lib/reading/palettes'

/**
 * The two option menus' behaviour, once per document — the arrangement
 * `Affordances` has for the copy control and the scroll fade, and for the same
 * reason: the menus are build-time markup in every figure and every code block
 * (`src/lib/content/tools.ts`), so one delegated listener serves them all and
 * no block needs an island of its own.
 *
 * ## Choosing a palette, or a diagram theme
 *
 * Written through `store.ts`, the only writer of learner state
 * (`kia-context/specs/ARCHITECTURE.md` §5), and stamped on `<html>` in the same
 * breath — exactly what the catalog's view toggle does, because the boot script
 * only stamps on a load and every navigation here is a client transition. The
 * stamp is what recolours every block on the page and moves the check in every
 * menu; nothing here touches a block.
 *
 * ## What a disclosure does not do on its own
 *
 * A `<details>` opens and closes on its summary and does nothing else. A
 * dropdown is expected to close on Escape (Chrome never closes a `<details>` on
 * Escape), on a press anywhere outside it, and once a choice is made — and to
 * hand focus back to the button that opened it, or a keyboard reader is left
 * on an element that just disappeared.
 *
 * ## The panel is a popover in the top layer, and the browser does not clip it
 *
 * The panel is an absolutely positioned child of its block. A code slab is
 * `overflow: hidden` (`.bz-slab`, the rounded corners), so MEASURED on a two-line
 * block the panel's 440px was cut to the block's 95px: only the first option
 * answered a hit test. A diagram's panel sits outside its scroller and was not
 * cut, but it still hung off the bottom of the window whenever the figure sat
 * low in it. Both want the same thing: a menu that is above everything and
 * inside the window.
 *
 * So on opening, the panel is made a `popover="manual"` and shown. The top layer
 * is not clipped by any ancestor's overflow, and a fixed box is placed in the
 * window's own coordinates, which `place` computes from the button: below it, or
 * above it when there is no room below, slid up if neither fits, and scrolling
 * inside itself only when the window is shorter than the menu. `manual`, because
 * the dismissal above is already written and `auto` would add a second one.
 *
 * Rejected: `overflow: clip` / `visible` on the slab, which loses the corner
 * rounding of the head and still hangs off the window; CSS anchor positioning,
 * which Firefox does not ship; and a `popover` attribute in the markup
 * `tools.ts` emits, because the tool strip is part of the published bundle
 * (`blocks.ts`) and the attribute is a behaviour, not content. It is set here,
 * so a browser without the Popover API keeps the in-block panel it had.
 */

const MENU = '.bz-optmenu'
const OPTION = '[data-hl-palette], [data-hl-theme]'

/** One enhancer per document: two would write every choice twice. */
let instances = 0

/** The gap under the button, and the margin the panel keeps from the window's edges. */
const GAP = 6
const EDGE = 8

const PANEL = '.bz-optmenu-panel'

/** The Popover API, whole: a browser with half of it keeps the panel inside its block. */
function canPopover(): boolean {
  return typeof HTMLElement.prototype.showPopover === 'function' && CSS.supports('selector(:popover-open)')
}

/**
 * Puts an open menu's panel beside its button, inside the window. The numbers go to three
 * custom properties the language reads (`bazaar.css`, `.bz-optmenu-panel[popover]`); a fixed
 * box needs no ancestor's coordinates.
 */
function place(menu: HTMLDetailsElement): void {
  const panel = menu.querySelector<HTMLElement>(PANEL)
  const button = menu.querySelector<HTMLElement>('summary')
  if (!panel || !button || !panel.matches(':popover-open')) return

  // Measured at its natural height, so a menu that was squeezed once can grow again.
  panel.style.removeProperty('--bz-menu-max')
  const width = panel.offsetWidth
  const height = panel.offsetHeight
  const view = document.documentElement
  const room = { width: view.clientWidth, height: view.clientHeight }
  const at = button.getBoundingClientRect()

  const below = room.height - at.bottom - GAP - EDGE
  const above = at.top - GAP - EDGE
  let top: number
  let max: number | null = null
  if (height <= below) top = at.bottom + GAP
  else if (height <= above) top = at.top - GAP - height
  else if (height <= room.height - 2 * EDGE) top = Math.max(EDGE, room.height - EDGE - height)
  else {
    top = EDGE
    max = room.height - 2 * EDGE
  }
  // Hung from the button's trailing edge, as it was in the block, then kept in the window.
  const left = Math.min(Math.max(at.right - width, EDGE), Math.max(EDGE, room.width - EDGE - width))

  panel.style.setProperty('--bz-menu-x', `${Math.round(left)}px`)
  panel.style.setProperty('--bz-menu-y', `${Math.round(top)}px`)
  if (max !== null) panel.style.setProperty('--bz-menu-max', `${max}px`)
}

/** The panel follows its menu's `open`: shown in the top layer while open, withdrawn when not. */
function sync(menu: HTMLDetailsElement): void {
  const panel = menu.querySelector<HTMLElement>(PANEL)
  if (!panel) return
  if (!menu.open) {
    if (panel.matches(':popover-open')) panel.hidePopover()
    return
  }
  if (!panel.hasAttribute('popover')) panel.setAttribute('popover', 'manual')
  if (!panel.matches(':popover-open')) panel.showPopover()
  place(menu)
}

function close(menu: HTMLDetailsElement, refocus: boolean): void {
  menu.open = false
  if (refocus) menu.querySelector<HTMLElement>('summary')?.focus()
}

function openMenus(): HTMLDetailsElement[] {
  return [...document.querySelectorAll<HTMLDetailsElement>(`${MENU}[open]`)]
}

export function ReadingOptions() {
  useEffect(() => {
    instances += 1
    if (instances > 1) {
      return () => {
        instances -= 1
      }
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const option = target.closest<HTMLElement>(OPTION)
      const menu = option?.closest<HTMLDetailsElement>(MENU)
      if (!option || !menu) return

      const subject = menu.dataset.hlOptions
      if (subject === 'figures') {
        // The diagrams: a Mermaid theme. `MermaidFigure` watches this attribute and
        // draws every diagram again, so nothing here touches one.
        const theme = option.dataset.hlTheme
        if (!isDiagramThemeId(theme)) return
        // Only a change is stamped: `MermaidFigure` watches the attribute, and setting it to the
        // value it has would still wake the watcher.
        if (document.documentElement.getAttribute(DIAGRAM_THEME_ATTRIBUTE) !== theme) {
          document.documentElement.setAttribute(DIAGRAM_THEME_ATTRIBUTE, theme)
        }
        update((data) => setDiagramTheme(data, theme))
      } else if (subject === 'code') {
        const palette = option.dataset.hlPalette
        if (!isPaletteId(palette)) return
        document.documentElement.setAttribute(PALETTE_SUBJECTS.code.attribute, palette)
        update((data) => setCodePalette(data, palette))
      } else return
      close(menu, true)
    }

    // A press outside every open menu closes them. `pointerdown`, so the menu
    // is gone before whatever was pressed reacts.
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      for (const menu of openMenus()) {
        if (target instanceof Node && menu.contains(target)) continue
        close(menu, false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const menus = openMenus()
      if (menus.length === 0) return
      // Only the menu focus is in gets focus back; any other open one simply
      // closes.
      for (const menu of menus) close(menu, menu.contains(document.activeElement))
    }

    document.addEventListener('click', onClick)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    // `open` is watched rather than the `toggle` event: a mutation observer's callback runs
    // before the next paint and `toggle` is queued after it, so the panel would show for a
    // frame inside its block, clipped, before it moved.
    let follow: (() => void) | null = null
    let frame = 0
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        const menu = (record.target as Element).closest<HTMLDetailsElement>(MENU)
        if (menu && record.target === menu) sync(menu)
      }
    })
    if (canPopover()) {
      observer.observe(document.body, { attributes: true, attributeFilter: ['open'], subtree: true })
      // The button moves when the page scrolls or the window changes, and the panel stays beside it.
      follow = () => {
        if (frame !== 0) return
        frame = requestAnimationFrame(() => {
          frame = 0
          for (const menu of openMenus()) place(menu)
        })
      }
      window.addEventListener('scroll', follow, { capture: true, passive: true })
      window.addEventListener('resize', follow)
    }

    return () => {
      instances -= 1
      observer.disconnect()
      if (follow) {
        window.removeEventListener('scroll', follow, { capture: true })
        window.removeEventListener('resize', follow)
      }
      cancelAnimationFrame(frame)
      document.removeEventListener('click', onClick)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return null
}

/** The contract with `tools.ts`; exported so a test can pin it. */
export const READING_OPTION_SELECTORS = { MENU, OPTION }
