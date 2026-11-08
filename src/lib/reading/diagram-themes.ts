/**
 * The themes a reader can draw the diagrams in: Mermaid's own, by Mermaid's own names.
 *
 * The author, 2026-11-08: the diagram colours were bland, box fills and backgrounds were
 * not contrastive enough, and the reader should be able to choose any of Mermaid's official
 * themes, with `default` as the default everywhere. This replaces the three palettes
 * (Night, Paper, Blueprint) that the diagrams used to share with the code blocks; the code
 * keeps those three (`palettes.ts`), and the two choices are now unrelated.
 *
 * **Mermaid draws; the site no longer repaints.** Until now every diagram was `theme: 'base'`
 * with a stylesheet that repainted every node from the site's tokens, so a diagram could only
 * ever look like the site. Now Mermaid's own theme paints the nodes, edges and labels, and the
 * site adds two things only: the four semantic edge colours the corpus asks for (`fault`,
 * `verify`, `info`, `caution`, in `mermaid-config.ts`) and the frame's ground (below).
 * The price is that a theme change re-renders the diagrams, which the old token switch did
 * not need; `MermaidFigure` does it, in the frame the reader chooses.
 *
 * **The reader's pick applies as it is, on a light site and on a dark one.** The figure is
 * a frame with its own ground, as it always was, so each theme carries a `tone`, and the
 * frame takes a light ground for a light theme and a dark one for a dark theme. Rejected:
 * pairing a light theme with its dark variant when the site is dark. A reader who picked
 * `forest` would be given `dark` on one page and `forest` on the next, from a switch that is
 * somewhere else, and `forest` has no dark variant to pair with in the first place. The
 * dark themes are one choice away for a reader who wants a dark diagram on a dark page.
 *
 * **Channel A, like the code palette.** The choice is a `prefs` field written through
 * `store.ts`, `boot.ts` stamps it on `<html>` as `data-hl-diagram` before first paint, and
 * the stylesheet picks the frame's ground from it, so a reader who chose a dark theme never
 * sees a light frame first. A reader who has never chosen has no stamp and gets `default`,
 * and a stored value that is not in this list (the retired `figurePalette`, a hand-edited
 * record) is not stamped and gets `default` too.
 */
export const DIAGRAM_THEME_IDS = [
  'default',
  'redux-color',
  'redux-dark-color',
  'redux',
  'redux-dark',
  'neutral',
  'dark',
  'forest',
  'neo',
  'neo-dark',
] as const

export type DiagramThemeId = (typeof DIAGRAM_THEME_IDS)[number]

export interface DiagramTheme {
  id: DiagramThemeId
  /** The words in the menu. */
  name: string
  /** Which ground the frame takes. A light theme on a dark ground is unreadable, and the reverse. */
  tone: 'light' | 'dark'
  /** Mermaid's `look`, for the themes that are paired with one. */
  look?: 'neo'
  /** Mermaid's `darkMode` theme variable, which the dark themes are written for. */
  darkMode?: true
}

export const DIAGRAM_THEMES: readonly DiagramTheme[] = [
  { id: 'default', name: 'Default', tone: 'light' },
  { id: 'redux-color', name: 'Redux color', tone: 'light' },
  { id: 'redux-dark-color', name: 'Redux dark color', tone: 'dark', darkMode: true },
  { id: 'redux', name: 'Redux', tone: 'light' },
  { id: 'redux-dark', name: 'Redux dark', tone: 'dark', darkMode: true },
  { id: 'neutral', name: 'Neutral', tone: 'light' },
  { id: 'dark', name: 'Dark', tone: 'dark', darkMode: true },
  { id: 'forest', name: 'Forest', tone: 'light' },
  { id: 'neo', name: 'Neo', tone: 'light', look: 'neo' },
  { id: 'neo-dark', name: 'Neo dark', tone: 'dark', look: 'neo', darkMode: true },
]

/** What a reader who has never chosen gets: Mermaid's own default, everywhere. */
export const DEFAULT_DIAGRAM_THEME: DiagramThemeId = 'default'

/** The attribute `boot.ts` and `ReadingOptions` stamp on `<html>`, which CSS and `MermaidFigure` read. */
export const DIAGRAM_THEME_ATTRIBUTE = 'data-hl-diagram'

export const DIAGRAM_MENU_LABEL = 'Diagram theme'

export function isDiagramThemeId(value: unknown): value is DiagramThemeId {
  return typeof value === 'string' && (DIAGRAM_THEME_IDS as readonly string[]).includes(value)
}

/** The theme a stamped value names, or the default for anything else. */
export function diagramThemeOf(value: unknown): DiagramTheme {
  return DIAGRAM_THEMES.find((theme) => theme.id === value)
    ?? DIAGRAM_THEMES.find((theme) => theme.id === DEFAULT_DIAGRAM_THEME)!
}
