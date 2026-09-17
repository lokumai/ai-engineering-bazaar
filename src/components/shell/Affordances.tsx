'use client'

import { useEffect } from 'react'
import { COPIED_MS, overflowState } from '@/lib/affordance'

/**
 * The two behaviours §6 asks for that CSS cannot express: the `COPY` control on
 * a code block (§6.7) and the right-edge overflow fade on anything that scrolls
 * sideways (§6.5).
 *
 * Both are enhancements on markup the build already emitted, so this mounts
 * once per document — from the shell, not from the prose column. Scoping it to
 * `.prose` was the bug: the index sheet's own 1060px manifest table (§4.8) sits
 * outside `[data-hl-prose]`, is the site's primary navigation surface, and at
 * 390px hid `STATUS`, `LANG`, `EXTENT` and `SOURCES` with no cue that it
 * scrolled at all.
 *
 * `[data-hl-scroller]` is the contract, written by `render.ts` on tables,
 * diagrams and code blocks and by `SheetIndex` on the manifest. Neither
 * behaviour is load-bearing: with JavaScript off every one of them still
 * scrolls and the code is still selectable, and §10.4 forbids either from being
 * the only carrier of anything.
 */

const SCROLLERS = '[data-hl-scroller]'
const COPY = '[data-hl-copy]'

/** One enhancer per document: two would copy a block twice on a single click. */
let instances = 0

async function copyBlock(button: HTMLButtonElement): Promise<void> {
  const code = button.closest('.bz-slab')?.querySelector('pre')
  if (!code) return

  try {
    await navigator.clipboard.writeText(code.textContent ?? '')
  } catch {
    // No clipboard (insecure context, or the user refused). Say nothing rather
    // than claim a copy that did not happen.
    return
  }

  button.textContent = 'Copied'
  window.setTimeout(() => {
    button.textContent = 'Copy'
  }, COPIED_MS)
}

export function Affordances() {
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
      const button = target.closest(COPY)
      if (button instanceof HTMLButtonElement) void copyBlock(button)
    }

    const scrollers = [...document.querySelectorAll<HTMLElement>(SCROLLERS)]
    const mark = (box: HTMLElement) => {
      const state = overflowState(box)
      if (state === 'none') box.removeAttribute('data-hl-overflow')
      else box.setAttribute('data-hl-overflow', state)
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) mark(entry.target as HTMLElement)
    })

    /*
      A SECOND OBSERVER, because a `ResizeObserver` on the box cannot see the
      box's CONTENT grow.

      `overflowState` compares `scrollWidth` to `clientWidth`, and only the
      first of those changes when a child arrives. Every diagram on the site is
      injected after this effect runs — `MermaidFigure` renders into
      `.mermaid-source` once mermaid has loaded — so at the moment each figure
      was measured it held a one-line placeholder and did not overflow. The box
      itself never resized afterwards, so the fade never appeared on the one
      kind of scroller that always needs it.

      MEASURED: `responsive.spec.ts` caught it as `bz-figure bz-figure-body
      overflows silently` the moment stage 5 gave the figure a box that
      actually clips.
    */
    const grew = new MutationObserver((records) => {
      for (const record of records) {
        const box = (record.target as Element).closest<HTMLElement>(SCROLLERS)
        if (box !== null) mark(box)
      }
    })

    for (const box of scrollers) {
      mark(box)
      box.addEventListener('scroll', () => mark(box), { passive: true })
      observer.observe(box)
      grew.observe(box, { childList: true, subtree: true })
    }

    document.addEventListener('click', onClick)

    return () => {
      instances -= 1
      observer.disconnect()
      grew.disconnect()
      document.removeEventListener('click', onClick)
    }
  }, [])

  return null
}

/** The contract with `render.ts` and `SheetIndex`; exported so a test can pin it. */
export const AFFORDANCE_SELECTORS = { SCROLLERS, COPY }
