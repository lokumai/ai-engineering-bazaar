'use client'

import { useEffect } from 'react'
import { setChecklistItem } from '@/lib/record/events'
import { nowIso, snapshot, subscribe, update } from '@/lib/record/store'

/**
 * §12.7 — the checklist, made live where it already stands.
 *
 * Sheet 13's eight `- [ ]` items are the one place in this curriculum where the
 * content is a tool rather than a reading: a list an architect runs against
 * their own repository. §7.2's own note is that this is worth more than every
 * XP point on the site, so the items have to persist.
 *
 * **Why an island rather than a component.** The list sits in the middle of
 * section VI, inside the prose, immediately under the paragraphs that explain
 * what each item means. A React component rendered after `<Prose>` would have
 * had to lift those eight items out of the argument they belong to and stack
 * them at the bottom of the sheet — which is a worse sheet, not a more modern
 * one. So this follows the codebase's DOM-enhancement pattern instead (read
 * `shell/Affordances.tsx`): the server emits the list, one island upgrades it
 * after mount, and the component returns `null`.
 *
 * **The no-JS fallback** (§10.4). Without this island the boxes stay exactly as
 * `render.ts` emits them: `disabled` and `aria-hidden`, painted but inert and
 * silent. Nothing is claimed and nothing is lost — the item text is the content
 * and it is untouched. That is also the pre-hydration frame, which is honest for
 * the same reason (§12.2): the build genuinely does not know what this reader
 * has ticked.
 *
 * **The accessible name.** §6.4 could not give these inputs a name because the
 * item's text is a *sibling* of the checkbox, not its content, so the box
 * contributed nothing to the tree and was hidden rather than announced as one of
 * eight nameless checkboxes. Once a box is real it needs a real name, so the
 * island takes the item's own text — the thing the reader is ticking — and sets
 * it as `aria-label`.
 */

/** The contract `render.ts` emits and this island reads. Pinned by a unit test. */
export const CHECKLIST_SELECTORS = {
  /** `<li class="task-list-item" data-hl-check="0">` — index within the sheet. */
  item: '[data-hl-check]',
  box: 'input[type="checkbox"]',
  /** The attribute the ticked styling in record.css keys off. */
  ticked: 'data-ticked',
} as const

/** A module-scope guard, so a second mount is a no-op (the Affordances rule). */
let instances = 0

export function ChecklistIsland({ slug }: { slug: string }) {
  useEffect(() => {
    if (instances > 0) return undefined
    instances += 1

    const items = Array.from(
      document.querySelectorAll<HTMLElement>(CHECKLIST_SELECTORS.item),
    )
    if (items.length === 0) {
      instances -= 1
      return undefined
    }

    // The index is emitted by the build rather than counted here, so the key a
    // tick is stored under is the same one `checklistOf` reported and the two
    // cannot drift apart if the markup ever gains a nested list (§12.7).
    const boxes = items.map((item) => ({
      index: Number(item.dataset.hlCheck),
      item,
      box: item.querySelector<HTMLInputElement>(CHECKLIST_SELECTORS.box),
    })).filter((entry): entry is { index: number; item: HTMLElement; box: HTMLInputElement } =>
      entry.box !== null && Number.isInteger(entry.index))

    for (const { item, box } of boxes) {
      box.disabled = false
      box.removeAttribute('aria-hidden')
      // The item's text, less the box itself, is what the reader is ticking.
      const label = (item.textContent ?? '').trim()
      if (label !== '') box.setAttribute('aria-label', label)
    }

    function paint(): void {
      const sheet = snapshot().sheets[slug]
      for (const { index, item, box } of boxes) {
        const ticked = sheet?.checklist[String(index)] === true
        box.checked = ticked
        item.setAttribute(CHECKLIST_SELECTORS.ticked, ticked ? 'true' : 'false')
      }
    }

    function onChange(event: Event): void {
      const box = event.target
      if (!(box instanceof HTMLInputElement)) return
      const entry = boxes.find((candidate) => candidate.box === box)
      if (entry === undefined) return
      update((data) => setChecklistItem(data, slug, entry.index, box.checked, nowIso()))
    }

    paint()
    // One listener on the document rather than eight on the boxes: the same
    // delegation `Affordances` uses, and it needs no per-box teardown.
    document.addEventListener('change', onChange)
    // Another tab ticking an item repaints this one (§12.1.5).
    const unsubscribe = subscribe(paint)

    return () => {
      document.removeEventListener('change', onChange)
      unsubscribe()
      for (const { item, box } of boxes) {
        // Left as the server emitted it, so a remount starts from the same
        // honest state rather than from whatever the last mount painted.
        box.disabled = true
        box.setAttribute('aria-hidden', 'true')
        box.removeAttribute('aria-label')
        item.removeAttribute(CHECKLIST_SELECTORS.ticked)
      }
      instances -= 1
    }
  }, [slug])

  return null
}
