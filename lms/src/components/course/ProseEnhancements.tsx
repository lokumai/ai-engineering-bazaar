'use client'

import { useEffect } from 'react'
import { COPIED_MS, overflowState } from '@/lib/prose-affordance'

/**
 * The two §6 behaviours CSS cannot express: the `COPY` control on a code block
 * (§6.7) and the right-edge overflow fade on a scrolling table or diagram
 * (§6.5).
 *
 * Both are enhancements on markup the build already emitted, so this mounts
 * once per document and works on prose that arrived as a string. Neither is
 * load-bearing: with JavaScript off the table still scrolls and the code is
 * still selectable, and §10.4 forbids either from being the only carrier of
 * anything.
 */

const SCROLLERS = '[data-hl-prose] .table-scroll, [data-hl-prose] .hl-diagram-body'
const COPY = '[data-hl-prose] [data-hl-copy]'

/** One enhancer per document: two would copy a block twice on a single click. */
let instances = 0

async function copyBlock(button: HTMLButtonElement): Promise<void> {
  const code = button.closest('.hl-code')?.querySelector('pre')
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

export function ProseEnhancements() {
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
      const button = target.closest('[data-hl-copy]')
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

    for (const box of scrollers) {
      mark(box)
      box.addEventListener('scroll', () => mark(box), { passive: true })
      observer.observe(box)
    }

    document.addEventListener('click', onClick)

    return () => {
      instances -= 1
      observer.disconnect()
      document.removeEventListener('click', onClick)
    }
  }, [])

  return null
}

/** Exported for the unit test; the selectors are the contract with render.ts. */
export const PROSE_SELECTORS = { SCROLLERS, COPY }
