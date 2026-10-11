import type { Element, ElementContent } from 'hast'
import { PALETTES, PALETTE_SUBJECTS, type PaletteSubject } from '../reading/palettes'

/**
 * The controls a diagram and a code block carry in their top-right corner, as
 * build-time markup. `render.ts` emits them into every figure and every slab;
 * `ReadingOptions` and `Affordances` are the islands that make them act.
 *
 * The author, 2026-10-11: a square icon button that opens three colouring
 * options for the diagrams, the same for code *"using a dropdown-like
 * component that is industry standard"*, the expand control as *"a transparent
 * button on top-right corner using a proper icon without any text"*, and
 * *"instead of "Copy" button on code, we should use the icon of it"*.
 *
 * ## Icons on the codebase's own idiom
 *
 * A 16-unit viewBox, `fill="none"`, `stroke="currentColor"` at 1.5 — the box
 * every other glyph here uses (**D53**) — and `aria-hidden`, because each
 * control is named by `aria-label` and the glyph is decoration on top of the
 * name. An icon-only control is only acceptable WITH that name; a glyph with no
 * name is a control a screen reader announces as "button".
 *
 * ## The menu is a disclosure, and its state is channel A
 *
 * A native `<details>` opens with no script; what the island adds is the
 * choosing, Escape, and a press outside. The check beside the chosen palette
 * and the word `current` a screen reader hears are both revealed by the same
 * `<html>` attribute that recolours the blocks (`bazaar.css`), so the menu
 * cannot disagree with the page — the arrangement the catalog's view toggle
 * uses, and for the same reason no item carries `aria-pressed`.
 */

type IconName = 'palette' | 'expand' | 'copy' | 'check'

/** Each glyph's paths, on the 16-unit box. Circles are paths so one shape fits all. */
const GLYPHS: Record<IconName, readonly { d: string; fill?: true }[]> = {
  // An artist's palette with three wells.
  palette: [
    { d: 'M8 1.75a6.25 6.25 0 1 0 0 12.5c.85 0 1.35-.55 1.35-1.25 0-.4-.2-.7-.4-1-.2-.3-.4-.6-.4-1 0-.75.6-1.25 1.35-1.25h1.65A2.9 2.9 0 0 0 14.25 6.9C14.25 4 11.45 1.75 8 1.75Z' },
    { d: 'M4.6 7.4a.9.9 0 1 0 1.8 0a.9.9 0 1 0-1.8 0Z', fill: true },
    { d: 'M6.3 4.7a.9.9 0 1 0 1.8 0a.9.9 0 1 0-1.8 0Z', fill: true },
    { d: 'M9.4 4.5a.9.9 0 1 0 1.8 0a.9.9 0 1 0-1.8 0Z', fill: true },
  ],
  // Four corners pulled outwards: "make this bigger".
  expand: [
    { d: 'M2.75 6.25v-3.5h3.5' },
    { d: 'M9.75 2.75h3.5v3.5' },
    { d: 'M13.25 9.75v3.5h-3.5' },
    { d: 'M6.25 13.25h-3.5v-3.5' },
  ],
  // Two sheets, the front one whole.
  copy: [
    { d: 'M6.75 5.25h5.5a1.5 1.5 0 0 1 1.5 1.5v5.5a1.5 1.5 0 0 1-1.5 1.5h-5.5a1.5 1.5 0 0 1-1.5-1.5v-5.5a1.5 1.5 0 0 1 1.5-1.5Z' },
    { d: 'M10.75 5.25v-1.5a1.5 1.5 0 0 0-1.5-1.5h-5.5a1.5 1.5 0 0 0-1.5 1.5v5.5a1.5 1.5 0 0 0 1.5 1.5h1.5' },
  ],
  check: [{ d: 'M3 8.5l3.2 3.2L13 4.8' }],
}

export function icon(name: IconName, size = 16, className?: string): Element {
  return {
    type: 'element',
    tagName: 'svg',
    properties: {
      width: String(size),
      height: String(size),
      viewBox: '0 0 16 16',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: name === 'check' ? '2' : '1.5',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      ariaHidden: 'true',
      focusable: 'false',
      ...(className ? { className: [className] } : {}),
    },
    children: GLYPHS[name].map((glyph) => ({
      type: 'element',
      tagName: 'path',
      properties: glyph.fill ? { d: glyph.d, fill: 'currentColor', stroke: 'none' } : { d: glyph.d },
      children: [],
    })),
  }
}

function el(tagName: string, properties: Element['properties'], children: ElementContent[] = []): Element {
  return { type: 'element', tagName, properties, children }
}

/**
 * The three-palette menu for `subject`. The panel is a named `group` of plain
 * buttons — a short list of choices, not an application menu, so it does not
 * take `role="menu"` and the arrow-key contract that role would oblige.
 */
export function paletteMenu(subject: PaletteSubject): Element {
  const { label } = PALETTE_SUBJECTS[subject]
  return el('details', { className: ['bz-optmenu'], 'data-hl-options': subject }, [
    el('summary', { className: ['bz-tool'], 'aria-label': label, title: label }, [icon('palette')]),
    el(
      'div',
      { className: ['bz-optmenu-panel'], role: 'group', 'aria-label': label },
      PALETTES.map((palette) =>
        el('button', { type: 'button', className: ['bz-optmenu-item'], 'data-hl-palette': palette.id }, [
          el('span', { className: ['bz-swatch'], 'data-swatch': palette.id, ariaHidden: 'true' }),
          { type: 'text', value: palette.name },
          el('span', { className: ['sr-only', 'bz-optmenu-said'] }, [{ type: 'text', value: ', current' }]),
          icon('check', 12, 'bz-optmenu-check'),
        ]),
      ),
    ),
  ])
}
