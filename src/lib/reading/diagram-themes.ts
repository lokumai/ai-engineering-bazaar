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
 * **Each theme sits on its own Mermaid background** (revised 2026-11-08, D107). The first
 * version gave a light theme the site's Paper ground and a dark theme its Night ground, and
 * the author said that is wrong: a theme should look the way Mermaid itself shows it. So each
 * theme carries Mermaid's own `background` (white for the light ones, `#333` for the dark
 * ones, the value `themeVariables.background` holds), and `diagramGroundCss` writes it as a
 * custom property per theme, which the frame, its tools and the expand view paint. The
 * values are theme data and so live here, as the tone does: the stylesheets may not hold a
 * colour the mockups do not, and a Mermaid colour is not one of the site's.
 *
 * **`redux` and `redux-color`, `redux-dark` and `redux-dark-color` look the same on most
 * diagrams, and that is Mermaid's, not this file's** (the author, 2026-11-08: "duplicate").
 * The config hands Mermaid each theme's own name, and a mind map proves it (`mermaid.spec.ts`:
 * the `-color` theme paints it in more colours). What a `-color` theme adds is a colour per
 * *group*: the branches of a mind map, the subgraphs of a flowchart, the entities of an ER
 * diagram. A flowchart of plain nodes has no group, so Mermaid paints it identically in both
 * twins. Measured by comparing every painted fill, stroke and ink of the course's 104 unique
 * flowcharts and mind maps (every `.md` under `mini-courses/`, `style … fill:` lines dropped),
 * in Mermaid 11.17.2: the 92 flowcharts without a subgraph are identical in both pairs; the
 * 6 with a subgraph differ in the light pair (the group's tint) and not in the dark pair; the
 * 6 mind maps differ in both pairs. Mermaid 12.2.0 changes only that the dark pair also
 * differs on a subgraph, and it draws every theme with `look: neo` unless told otherwise, so
 * the upgrade was not taken for six diagrams. **Kept as four entries, not merged**, because
 * the pairs are not identical for every type the course draws (mind maps, subgraphs); merging
 * would drop Mermaid's own colour from those, and painting colour onto plain flowchart nodes
 * ourselves would be inventing a palette Mermaid does not apply there. A merge, if the author
 * prefers one, is two rows removed from `DIAGRAM_THEME_IDS` and this table.
 *
 * **The reader's pick applies as it is, on a light site and on a dark one.** The figure is
 * a frame with its own ground, as it always was, so each theme carries a `tone`, which picks
 * the semantic edge hues and the ink of the tools over the ground. Rejected:
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
  /** Whether the theme is drawn for a light ground or a dark one: it picks the semantic edge hues and the tools' ink. */
  tone: 'light' | 'dark'
  /**
   * The ground the frame takes: Mermaid's own `background` for this theme, written as Mermaid
   * writes it (`white` and `#ffffff` are both in its source). It is what
   * `mermaid.mermaidAPI.getConfig().themeVariables.background` answers after `initialize` with
   * the theme, and a unit test compares the two, so a Mermaid release that moves a theme's
   * ground fails there instead of leaving the frame on the old one.
   */
  background: string
  /** Mermaid's `look`, for the themes that are paired with one. */
  look?: 'neo'
  /** Mermaid's `darkMode` theme variable, which the dark themes are written for. */
  darkMode?: true
  /**
   * The smallest `themeVariables` override that brings the theme to the site's floors: 4.5:1
   * for a label and 3:1 for a node's edge and an arrow, measured off the painted pixels by
   * `mermaid.spec.ts`. Empty for a theme that clears them as Mermaid draws it, and each entry
   * records the ratio it started from, so the next reader knows what the override is for.
   */
  variables?: Readonly<Record<string, string>>
}

export const DIAGRAM_THEMES: readonly DiagramTheme[] = [
  { id: 'default', name: 'Default', tone: 'light', background: 'white' },
  { id: 'redux-color', name: 'Redux color', tone: 'light', background: '#ffffff' },
  { id: 'redux-dark-color', name: 'Redux dark color', tone: 'dark', background: '#333', darkMode: true },
  { id: 'redux', name: 'Redux', tone: 'light', background: '#ffffff' },
  { id: 'redux-dark', name: 'Redux dark', tone: 'dark', background: '#333', darkMode: true },
  // A node's edge was 2.46:1 on its own fill (#999999 on #eeeeee); #767676 makes it 3.9:1.
  { id: 'neutral', name: 'Neutral', tone: 'light', background: '#ffffff', variables: { nodeBorder: '#767676' } },
  // An edge label was 4.43:1 (#cccccc on #585858); on #444444 it is 6.1:1.
  { id: 'dark', name: 'Dark', tone: 'dark', background: '#333', darkMode: true, variables: { edgeLabelBackground: '#444444' } },
  { id: 'forest', name: 'Forest', tone: 'light', background: 'white' },
  { id: 'neo', name: 'Neo', tone: 'light', background: '#ffffff', look: 'neo' },
  // The edge's blue end was 2.25:1 on a node's fill (#0042eb on #2a2020); #4d7dff makes it 4.3:1.
  // Its red end was 2.77:1 on Mermaid's own ground (#eb0042 on #333); #ff3366 makes it 3.56:1.
  { id: 'neo-dark', name: 'Neo dark', tone: 'dark', background: '#333', look: 'neo', darkMode: true, variables: { gradientStart: '#4d7dff', gradientStop: '#ff3366' } },
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

/** The custom property the frame, its tools and the expand view paint their ground from. */
export const DIAGRAM_GROUND_PROPERTY = '--bz-diagram-ground'

/**
 * The stylesheet that gives the property its value per theme, emitted into `<head>` by the
 * layout. It is generated from the table so a theme's ground is written once, and it is plain
 * CSS keyed on the `data-hl-diagram` stamp, so a reader who chose a theme gets its ground in
 * the first frame with no script of its own (channel A: `boot.ts` already stamps the
 * attribute). The unstamped page is the default theme.
 */
export function diagramGroundCss(): string {
  const root = diagramThemeOf(DEFAULT_DIAGRAM_THEME)
  return [
    `:root{${DIAGRAM_GROUND_PROPERTY}:${root.background}}`,
    ...DIAGRAM_THEMES.map(
      (theme) => `html[${DIAGRAM_THEME_ATTRIBUTE}="${theme.id}"]{${DIAGRAM_GROUND_PROPERTY}:${theme.background}}`,
    ),
  ].join('\n')
}
