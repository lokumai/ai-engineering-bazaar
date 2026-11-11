'use client'

import { useEffect } from 'react'
import { COPIED_MS, overflowState } from '@/lib/affordance'
import { PAGE_COPY } from '@/lib/content/page-copy'
import { TRANSLATED_LANGS, type ReadingLang } from '@/lib/content/languages'

/**
 * The two behaviours §6 asks for that CSS cannot express: the `COPY` control on
 * a code block (§6.7) and on a diagram (which copies its Mermaid source), and the right-edge overflow fade on anything that scrolls
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
const ANIMATED = 'figure[data-hl-animated]'
const REPLAY = '[data-hl-replay]'

/** One enhancer per document: two would copy a block twice on a single click. */
let instances = 0

/**
 * What the control copies: a code block's text, or a diagram's Mermaid source. Never the
 * drawing, which is an SVG nobody can paste into a Mermaid editor. The diagram's source is
 * the one the island draws from, which is the markdown's own text except where the build
 * turned a `style X fill:#…` line into a semantic class (`mermaid.ts`, B2): the pastel hex
 * is the one thing that does not travel, because B3 forbids a colour literal anywhere in
 * the emitted HTML, an attribute included, and the site does not draw it either.
 */
function textToCopy(button: HTMLElement): string | null {
  const code = button.closest('.bz-slab')?.querySelector('pre')
  if (code) return code.textContent ?? ''
  return button.closest('.bz-fig')?.querySelector<HTMLElement>('.mermaid-source[data-mermaid]')?.dataset.mermaid ?? null
}

async function copyBlock(button: HTMLButtonElement): Promise<void> {
  const text = textToCopy(button)
  if (text === null) return

  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // No clipboard (insecure context, or the user refused). Say nothing rather
    // than claim a copy that did not happen.
    return
  }

  /* The control is an icon now, so the glyph swaps to a check by attribute
     (`prose.css`) and the WORD goes to the hidden live region inside it: an
     icon changing shape is not something a screen reader hears. The text is
     cleared afterwards so the next copy is announced again. */
  const said = button.querySelector<HTMLElement>('[data-hl-copy-said]')
  button.setAttribute('data-hl-copied', '')
  if (said) said.textContent = 'Copied'
  window.setTimeout(() => {
    button.removeAttribute('data-hl-copied')
    if (said) said.textContent = ''
  }, COPIED_MS)
}

/**
 * M115 (D136) — the replay control on an animated recording.
 *
 * `render.ts` marks a figure whose image is animated (`data-hl-animated`, read from the file's
 * bytes); the button is added HERE and not in the markup, so with JavaScript off there is no
 * button that does nothing, and the bundle's markup is untouched. It is a `.bz-tool` in the
 * figure's top-right corner, its glyph the codebase's 16-unit stroke idiom (`tools.ts`, D53) and
 * its name `aria-label`, in the language of the text it sits in: the nearest `[lang]` ancestor,
 * which on a module page is the prose's own (`ModuleSheet`).
 *
 * RESTART. A browser keeps an animated image's playhead with the decoded resource, so setting
 * `src` to the value it already has, or inserting a second `<img>` of the same URL, resumes
 * where the animation was. What restarts it from frame 0 is a resource nobody has played: the
 * file is fetched once, on the first press, and every press gives the image a new object URL
 * for the same bytes. See `tests/e2e/replay.spec.ts` for the measurement.
 */
const REPLAY_GLYPH = [
  'M13.25 8a5.25 5.25 0 1 1-1.54-3.71',
  'M13.25 2.75v2.75h-2.75',
]

function replayLang(figure: Element): ReadingLang {
  const found = figure.closest('[lang]')?.getAttribute('lang')
  return TRANSLATED_LANGS.find((lang) => lang === found) ?? 'en'
}

function addReplay(figure: HTMLElement): void {
  const img = figure.querySelector('img')
  if (!img || figure.querySelector(REPLAY)) return
  const lang = replayLang(figure)
  const label = PAGE_COPY[lang].replay
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'bz-tool bz-replay'
  button.setAttribute('data-hl-replay', '')
  button.setAttribute('aria-label', label)
  button.title = label
  if (lang !== 'en') button.lang = lang
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  for (const [name, value] of Object.entries({
    width: '16', height: '16', viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor',
    'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'aria-hidden': 'true', focusable: 'false',
  })) svg.setAttribute(name, value)
  for (const d of REPLAY_GLYPH) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', d)
    svg.append(path)
  }
  button.append(svg)
  img.after(button)
}

/** The bytes of each recording already fetched, by URL: one request per file however often it is replayed. */
const fetched = new Map<string, Promise<Blob>>()
const objectUrls = new WeakMap<HTMLImageElement, string>()

async function replay(button: HTMLButtonElement): Promise<void> {
  const img = button.closest(ANIMATED)?.querySelector('img')
  if (!img) return
  const source = img.currentSrc || img.src
  let blob = fetched.get(source)
  if (blob === undefined) {
    blob = fetch(source).then((response) => response.blob())
    fetched.set(source, blob)
  }
  let bytes: Blob
  try {
    bytes = await blob
  } catch {
    fetched.delete(source)
    return
  }
  const url = URL.createObjectURL(bytes)
  const previous = objectUrls.get(img)
  img.src = url
  img.removeAttribute('srcset')
  objectUrls.set(img, url)
  if (previous) URL.revokeObjectURL(previous)
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
      const again = target.closest(REPLAY)
      if (again instanceof HTMLButtonElement) void replay(again)
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

    const watched = new WeakSet<HTMLElement>()
    const watch = (box: HTMLElement) => {
      if (watched.has(box)) return
      watched.add(box)
      mark(box)
      box.addEventListener('scroll', () => mark(box), { passive: true })
      observer.observe(box)
      grew.observe(box, { childList: true, subtree: true })
    }
    for (const box of scrollers) watch(box)
    for (const figure of document.querySelectorAll<HTMLElement>(ANIMATED)) addReplay(figure)

    /*
      A THIRD OBSERVER, for scrollers that arrive after this effect ran. This island lives in the root
      layout and mounts once, so the list above is the first page's: a code block on the next module,
      reached by a client-side link, was never measured and never faded. And on a slow machine a scroller
      can land after the first measurement (CI's 390px run of `responsive.spec.ts` failed on an unmarked
      `bz-slab-code`, on main as well as on M110's branch). So the document is watched for added nodes,
      and any scroller among them is measured and observed like the first page's.
    */
    const arrived = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (!(node instanceof HTMLElement)) continue
          if (node.matches(SCROLLERS)) watch(node)
          for (const box of Array.from(node.querySelectorAll<HTMLElement>(SCROLLERS))) watch(box)
          if (node.matches(ANIMATED)) addReplay(node)
          for (const figure of Array.from(node.querySelectorAll<HTMLElement>(ANIMATED))) addReplay(figure)
        }
      }
    })
    arrived.observe(document.body, { childList: true, subtree: true })

    document.addEventListener('click', onClick)

    return () => {
      instances -= 1
      observer.disconnect()
      grew.disconnect()
      arrived.disconnect()
      document.removeEventListener('click', onClick)
    }
  }, [])

  return null
}

/** The contract with `render.ts` and `SheetIndex`; exported so a test can pin it. */
export const AFFORDANCE_SELECTORS = { SCROLLERS, COPY, ANIMATED, REPLAY }
