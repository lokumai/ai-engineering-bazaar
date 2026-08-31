'use client'

import * as Dialog from '@radix-ui/react-dialog'
import type { Mermaid } from 'mermaid'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  expandRenderId,
  figureRenderId,
  mermaidConfig,
} from '@/lib/figure/mermaid-config'
import { widthForNaturalWidth } from '@/lib/figure/width'
import {
  RESET_VIEW,
  type View,
  panBy,
  transformOf,
  wheelFactor,
  zoomBy,
  zoomIn,
  zoomIntent,
  zoomOut,
} from '@/lib/figure/zoom'

/**
 * §6.10 — the diagram island.
 *
 * The build already emitted the whole figure: the `<figure>`, the scroll
 * region, the caption strip and the `EXPAND` control (`render.ts`), with the
 * remapped source (B2) parked in `data-mermaid`. Mermaid needs a DOM, so the
 * only thing left for the browser is turning that source into an SVG.
 *
 * Three properties this component exists to hold:
 *
 * 1. **A page with no figures downloads no mermaid.** The import is dynamic
 *    and it is behind the marker count, so seventeen of the thirty-two sheets —
 *    and every listing page — never fetch the 500kB chunk. The check has to
 *    happen before the `await`, which is why it reads the DOM rather than
 *    taking a prop.
 * 2. **A theme switch costs 0ms and never re-renders (§9.2).** Nothing here
 *    reads `.dark`, subscribes to it, or re-runs on it. The SVG's colours are
 *    `var(--color-…)` references that cascade in from `<html>` (B4), so the
 *    diagram re-themes in the same frame as the rest of the page, and this
 *    effect runs exactly once per document.
 * 3. **A malformed diagram never blanks the sheet.** It falls back to the
 *    source, which is what the reader would have seen in a plain markdown
 *    viewer, and the figure stays unready so `EXPAND` never appears offering to
 *    magnify something that does not exist.
 */

/** The markers `render.ts` emits, scoped the way `ProseEnhancements` scopes. */
const SOURCES = '[data-hl-prose] .mermaid-source[data-mermaid]'
/** §6.10 B5's control, in the caption strip. */
const EXPAND = '[data-hl-prose] [data-hl-expand]'

/** One island per document: two would render every diagram twice. */
let instances = 0

interface Expanded {
  svg: string
  /** `FIG. 13.2 — WHERE EACH DEFENSE ACTUALLY SITS`, read off the strip. */
  label: string
}

/**
 * The caption strip's own text, without the `EXPAND` button's. The strip is a
 * `figcaption` holding a text node and a button (§10.2), so the text nodes are
 * the caption.
 */
function captionOf(figure: Element): string {
  const strip = figure.querySelector('.hl-cap')
  if (!strip) return 'Figure'
  return [...strip.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? '')
    .join('')
    .trim()
}

/**
 * B5 — the natural width mermaid drew at, which decides the width class. The
 * viewBox is the drawing's own coordinate space and is what mermaid sizes the
 * element from; the bounding box is the fallback for a diagram type that emits
 * none.
 */
function naturalWidth(svg: SVGSVGElement): number {
  const box = svg.viewBox.baseVal.width
  return box > 0 ? box : svg.getBoundingClientRect().width
}

/**
 * Mermaid's default is to shrink a drawing to its container. A 1,200px
 * `graph LR` — and **MEASURED:** 38 of the 53 English diagrams are `graph LR` —
 * would then arrive with 13px labels set at seven. §6.10 B5 says the opposite:
 * measure the natural width, class the figure by it, and let the rest scroll
 * inside the figure's own container. So the drawing is pinned at natural size.
 */
function pinToNaturalSize(svg: SVGSVGElement, width: number): void {
  svg.setAttribute('width', String(width))
  svg.removeAttribute('height')
  svg.style.width = `${width}px`
  svg.style.maxWidth = 'none'
}

/** The fallback: the source, as the reader would have met it in the file. */
function showSource(node: HTMLElement, source: string): void {
  const pre = document.createElement('pre')
  pre.className = 'hl-diagram-fallback'
  pre.textContent = source
  node.replaceChildren(pre)
}

/**
 * Mermaid parks a temporary element under the id it was handed. With
 * `suppressErrorRendering` it cleans up after itself, but a throw from deeper
 * in the renderer can still leave one behind, and an orphan `<svg>` in the body
 * is a stray drawing on the page.
 */
function sweep(id: string): void {
  document.getElementById(id)?.remove()
  document.getElementById(`d${id}`)?.remove()
}

export function MermaidFigure() {
  const [expanded, setExpanded] = useState<Expanded | null>(null)
  const [view, setView] = useState<View>(RESET_VIEW)

  const renderer = useRef<Mermaid | null>(null)
  const trigger = useRef<HTMLElement | null>(null)
  const drag = useRef<{ pointer: number; x: number; y: number } | null>(null)

  const expand = useCallback(async (button: HTMLElement) => {
    const mermaid = renderer.current
    const figure = button.closest('.hl-figure')
    const marker = figure?.querySelector<HTMLElement>('.mermaid-source[data-mermaid]')
    const source = marker?.dataset.mermaid
    if (!mermaid || !figure || !marker || !source) return

    // The overlay draws its own copy at its own id: mermaid writes the id into
    // the `url(#…)` marker references, and two copies sharing one id would
    // share arrowheads (and duplicate every id in the document).
    const id = expandRenderId(Number(marker.dataset.hlFigure ?? '0'))
    try {
      const { svg } = await mermaid.render(id, source)
      trigger.current = button
      setView(RESET_VIEW)
      setExpanded({ svg, label: captionOf(figure) })
    } catch {
      // The page copy rendered, so this cannot normally fail. If it does, the
      // figure the reader already has stays exactly as it is.
      sweep(id)
    }
  }, [])

  useEffect(() => {
    instances += 1
    if (instances > 1) {
      return () => {
        instances -= 1
      }
    }

    const nodes = [...document.querySelectorAll<HTMLElement>(SOURCES)]
    if (nodes.length === 0) {
      // Nothing to draw: no dynamic import, so no mermaid chunk is requested.
      return () => {
        instances -= 1
      }
    }

    let cancelled = false

    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const button = target.closest<HTMLElement>('[data-hl-expand]')
      if (button) void expand(button)
    }

    void (async () => {
      const mermaid = (await import('mermaid')).default
      if (cancelled) return

      mermaid.initialize(mermaidConfig())
      renderer.current = mermaid

      for (const [index, node] of nodes.entries()) {
        const source = node.dataset.mermaid
        if (!source) continue
        node.dataset.hlFigure = String(index)

        const id = figureRenderId(index)
        try {
          const { svg } = await mermaid.render(id, source)
          if (cancelled) return
          node.innerHTML = svg

          const drawing = node.querySelector('svg')
          const figure = node.closest<HTMLElement>('.hl-figure')
          if (drawing && figure) {
            const width = naturalWidth(drawing)
            pinToNaturalSize(drawing, width)
            figure.dataset.hlWidth = widthForNaturalWidth(width)
            // The caption strip's EXPAND is hidden until this is set: a
            // control that cannot do its job must not be drawn (§1).
            figure.dataset.hlReady = ''
          }
        } catch {
          if (cancelled) return
          sweep(id)
          showSource(node, source)
        }
      }
    })()

    document.addEventListener('click', onClick)

    return () => {
      instances -= 1
      cancelled = true
      document.removeEventListener('click', onClick)
    }
  }, [expand])

  /**
   * A callback ref, not an effect: Radix mounts its portal after the render
   * that opened the dialog, so an effect keyed on `expanded` fires while the
   * viewport is still null. This runs exactly when the node attaches, with the
   * SVG already inside it.
   */
  const attachViewport = useCallback((box: HTMLDivElement | null) => {
    if (!box) return

    // §6.10 B5 — "the SVG at natural size". The overlay's copy is a fresh
    // render, so it arrives sized to its container like any other.
    const drawing = box.querySelector('svg')
    if (drawing) pinToNaturalSize(drawing, naturalWidth(drawing))

    // Scroll-to-zoom has to stop the page scrolling underneath it, which a
    // React wheel handler cannot do — React registers wheel passively at the
    // root.
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      setView((current) => zoomBy(current, wheelFactor(event.deltaY)))
    }

    box.addEventListener('wheel', onWheel, { passive: false })
    return () => box.removeEventListener('wheel', onWheel)
  }, [])

  return (
    <Dialog.Root
      open={expanded !== null}
      onOpenChange={(open) => {
        if (!open) setExpanded(null)
      }}
    >
      <Dialog.Portal>
        {/* No description: the content is the figure, whose caption is the
            title. Radix would otherwise warn about one this dialog has no
            honest text for. */}
        <Dialog.Content
          className="hl-expand"
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            // §10.3 — focus returns to the EXPAND control that opened it.
            event.preventDefault()
            trigger.current?.focus()
          }}
          onKeyDown={(event) => {
            const intent = zoomIntent(event.key)
            if (!intent) return
            event.preventDefault()
            setView((current) => (intent === 'in' ? zoomIn(current) : zoomOut(current)))
          }}
        >
          <div className="hl-expand-head">
            <Dialog.Title className="hl-mark">{expanded?.label ?? ''}</Dialog.Title>
            {/* It says what the keyboard does and it is also the button, so a
                reader with no keyboard is not stranded inside the overlay. */}
            <Dialog.Close className="hl-button hl-mark" aria-label="Close figure">
              Esc to close
            </Dialog.Close>
          </div>

          <div
            ref={attachViewport}
            className="hl-expand-view"
            onPointerDown={(event) => {
              if (event.button !== 0) return
              drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY }
              // Capture keeps the drag alive when the pointer leaves the
              // viewport, which it will: the whole point is dragging the
              // drawing past the edge of the screen.
              try {
                event.currentTarget.setPointerCapture(event.pointerId)
              } catch {
                // A pointer id the browser no longer owns. The drag still
                // works, it just stops at the edge.
              }
              event.currentTarget.dataset.hlDragging = ''
            }}
            onPointerMove={(event) => {
              const from = drag.current
              if (!from || from.pointer !== event.pointerId) return
              const dx = event.clientX - from.x
              const dy = event.clientY - from.y
              from.x = event.clientX
              from.y = event.clientY
              setView((current) => panBy(current, dx, dy))
            }}
            onPointerUp={(event) => {
              drag.current = null
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId)
              }
              delete event.currentTarget.dataset.hlDragging
            }}
            onPointerCancel={(event) => {
              drag.current = null
              delete event.currentTarget.dataset.hlDragging
            }}
          >
            <div
              className="hl-expand-paper"
              style={{ transform: transformOf(view) }}
              // The markup is mermaid's own sanitised output (securityLevel
              // 'strict'), re-rendered from the source the build remapped.
              dangerouslySetInnerHTML={{ __html: expanded?.svg ?? '' }}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Exported for the unit test; the selectors are the contract with render.ts. */
export const FIGURE_SELECTORS = { SOURCES, EXPAND }
