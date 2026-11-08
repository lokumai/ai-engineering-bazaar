import type { Element, ElementContent } from 'hast'
import { DIAGRAM_MENU_LABEL, DIAGRAM_THEMES } from '../reading/diagram-themes'
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

/** The menu's own markup, which the two menus share: a disclosure, a named group of plain buttons. */
function optionMenu(subject: 'figures' | PaletteSubject, label: string, items: Element[]): Element {
  return el('details', { className: ['bz-optmenu'], 'data-hl-options': subject }, [
    el('summary', { className: ['bz-tool'], 'aria-label': label, title: label }, [icon('palette')]),
    // A short list of choices, not an application menu, so it does not take
    // `role="menu"` and the arrow-key contract that role would oblige.
    el('div', { className: ['bz-optmenu-panel'], role: 'group', 'aria-label': label }, items),
  ])
}

function optionItem(attribute: string, id: string, swatch: string, name: string): Element {
  return el('button', { type: 'button', className: ['bz-optmenu-item'], [attribute]: id }, [
    el('span', { className: ['bz-swatch'], 'data-swatch': swatch, ariaHidden: 'true' }),
    { type: 'text', value: name },
    el('span', { className: ['sr-only', 'bz-optmenu-said'] }, [{ type: 'text', value: ', current' }]),
    icon('check', 12, 'bz-optmenu-check'),
  ])
}

/** The three-palette menu for the code blocks. */
export function paletteMenu(subject: PaletteSubject): Element {
  return optionMenu(subject, PALETTE_SUBJECTS[subject].label, PALETTES.map((palette) =>
    optionItem('data-hl-palette', palette.id, palette.id, palette.name)))
}

/**
 * The diagram theme menu: Mermaid's own themes, in two groups by the ground their frame takes
 * (`diagram-themes.ts`), headed Light and Dark. The headings are the second thing that tells
 * `Redux`, `Redux color`, `Neo` and `Forest` apart: their names alone say nothing about what
 * they look like, and a reader choosing between ten of them is helped by knowing which half
 * of the list is dark before opening one. Each group is a named `group` of plain buttons, so
 * a screen reader says "Dark themes" on entering it, and the heading is not a stop of its
 * own. No ids: the menu is emitted into every figure, and an id would repeat on the page.
 * Each row's swatch is the frame's ground, Paper's for a light theme and Night's for a dark
 * one, not what Mermaid will paint on it, because the site has no business holding
 * Mermaid's colours.
 */
export function diagramThemeMenu(): Element {
  const group = (tone: 'light' | 'dark', heading: string): Element => el(
    'div',
    { className: ['bz-optmenu-group'], role: 'group', 'aria-label': `${heading} themes` },
    [
      el('p', { className: ['bz-optmenu-head'], ariaHidden: 'true' }, [{ type: 'text', value: heading }]),
      ...DIAGRAM_THEMES.filter((theme) => theme.tone === tone).map((theme) =>
        optionItem('data-hl-theme', theme.id, tone === 'dark' ? 'night' : 'paper', theme.name)),
    ],
  )
  return optionMenu('figures', DIAGRAM_MENU_LABEL, [group('light', 'Light'), group('dark', 'Dark')])
}
