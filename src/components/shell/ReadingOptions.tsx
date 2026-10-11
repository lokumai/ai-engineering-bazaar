'use client'

import { useEffect } from 'react'
import { setCodePalette, setFigurePalette } from '@/lib/record/events'
import { update } from '@/lib/record/store'
import { PALETTE_SUBJECTS, isPaletteId, type PaletteSubject } from '@/lib/reading/palettes'

/**
 * The palette menus' behaviour, once per document — the arrangement
 * `Affordances` has for the copy control and the scroll fade, and for the same
 * reason: the menus are build-time markup in every figure and every code block
 * (`src/lib/content/tools.ts`), so one delegated listener serves them all and
 * no block needs an island of its own.
 *
 * ## Choosing a palette
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
 */

const MENU = '.bz-optmenu'
const OPTION = '[data-hl-palette]'

/** One enhancer per document: two would write every choice twice. */
let instances = 0

const WRITERS: Record<PaletteSubject, typeof setFigurePalette> = {
  figures: setFigurePalette,
  code: setCodePalette,
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
      const palette = option.dataset.hlPalette
      if (subject !== 'figures' && subject !== 'code') return
      if (!isPaletteId(palette)) return

      document.documentElement.setAttribute(PALETTE_SUBJECTS[subject].attribute, palette)
      update((data) => WRITERS[subject](data, palette))
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

    return () => {
      instances -= 1
      document.removeEventListener('click', onClick)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return null
}

/** The contract with `tools.ts`; exported so a test can pin it. */
export const READING_OPTION_SELECTORS = { MENU, OPTION }
