/**
 * Requirement B4 — the mermaid configuration, as it is since the reader may choose
 * Mermaid's own theme (2026-11-08, `lib/reading/diagram-themes.ts`).
 *
 * **Before:** every diagram was `theme: 'base'` and a stylesheet repainted every node, edge
 * and label from the site's tokens, so a diagram could only look like the site and the
 * theme switch cost nothing. The author found the result bland (box fills and backgrounds
 * not contrastive enough) and asked for Mermaid's official themes, `default` first.
 *
 * **Now:** Mermaid's theme paints. What this file still adds is only what the corpus needs
 * and no theme knows: the four semantic edges (`fault`, `verify`, `info`, `caution`, the
 * only colour a diagram's author may ask for, `mermaid.ts`), drawn in the site's tokens so
 * they are right on whichever ground the frame has, and one family and size of type so a
 * module reads the same whichever theme it is in. Rejected: keeping the token repaint
 * as a theme of its own beside the ten. It would be an eleventh look that no reader asked
 * for and that Mermaid does not ship, and it would have to be kept in step with every
 * diagram type Mermaid adds.
 *
 * Dropped with the repaint, because each one fought a theme: the straight-edge curve, the
 * zero corner radius, and every fill, label and arrowhead colour. A theme that is chosen
 * should look like itself.
 *
 * **A theme change draws the diagrams again** (`MermaidFigure` watches `data-hl-diagram`),
 * which the token switch never had to. It is the price of letting Mermaid choose the colours:
 * they are written into the SVG when it is drawn.
 */

import type { MermaidConfig } from 'mermaid'
import { DEFAULT_DIAGRAM_THEME, diagramThemeOf } from '../reading/diagram-themes'

/**
 * The semantic classes' edges, bound to tokens. The source B2 emits binds a node to a
 * semantic *class* and nothing else, because mermaid's `classDef` grammar cannot hold a
 * `var()`: so the class is declared in the source and painted here.
 *
 * Only the EDGE, and never a fill (BRAINSTORM D33): the fill stays the theme's own, so a
 * semantic node is a node of the chosen theme with a heavier edge in one of four hues.
 * The 2px weight is not decoration. A hue must never be the only carrier of meaning, and
 * a weight is the one second signal available inside a shape mermaid draws.
 *
 * A diagram can class a *subgraph* as well as a node, and a subgraph is a cluster, not a
 * node, so each class has a `.cluster` rule too. No diagram in the corpus classes either today
 * (the semantic classes survive only in the progress rails the build strips), so these rules
 * are held by the unit test on this string and by `mermaid.spec.ts`, which measures the four
 * hues on both frames; no drawing of them has been looked at. The tokens are rebound by the
 * frame to the ground the theme's tone gives it (`bazaar.css`), which is why one rule serves
 * all ten themes.
 */
export const MERMAID_THEME_CSS = `
  .node.fault rect, .node.fault polygon, .node.fault path,
  .node.verify rect, .node.verify polygon, .node.verify path,
  .node.info rect, .node.info polygon, .node.info path,
  .node.caution rect, .node.caution polygon, .node.caution path,
  .cluster.fault rect, .cluster.verify rect,
  .cluster.info rect, .cluster.caution rect {
    stroke-width: 2px;
  }
  .node.fault rect, .node.fault polygon, .node.fault path,
  .cluster.fault rect {
    stroke: var(--color-category-5);
  }
  .node.verify rect, .node.verify polygon, .node.verify path,
  .cluster.verify rect {
    stroke: var(--color-success);
  }
  .node.info rect, .node.info polygon, .node.info path,
  .cluster.info rect {
    stroke: var(--color-primary);
  }
  .node.caution rect, .node.caution polygon, .node.caution path,
  .cluster.caution rect {
    stroke: var(--color-caution);
  }
`

/**
 * Mermaid writes the render id into `url(#id)` marker references, so two
 * diagrams sharing an id would share arrowheads — and a copy of a diagram in
 * the EXPAND overlay would silently steal the page copy's markers. Every
 * render gets its own.
 */
export function figureRenderId(index: number): string {
  return `hl-fig-${index}`
}

/** The overlay renders its own copy, at its own id, for the same reason. */
export function expandRenderId(index: number): string {
  return `hl-fig-${index}-expanded`
}

/**
 * The configuration for one theme, by id. An id that is not in the list, or none at all,
 * is `default`: this is where "the default is Mermaid's own default" is held, so a stamp
 * that is missing, stale or hand-edited cannot reach `mermaid.initialize` as anything else.
 */
export function mermaidConfig(themeId: unknown = DEFAULT_DIAGRAM_THEME): MermaidConfig {
  const theme = diagramThemeOf(themeId)
  return {
    startOnLoad: false,
    theme: theme.id,
    ...(theme.look ? { look: theme.look } : {}),
    securityLevel: 'strict',
    // A diagram that fails to parse throws to the caller, which falls back to
    // the source (§6.10's "must never blank the sheet"). Without this mermaid
    // paints its own error graphic into the page instead — a cartoon bomb, in
    // its own colours, in the middle of a technical drawing.
    suppressErrorRendering: true,
    flowchart: {
      htmlLabels: false,
      padding: 12,
      nodeSpacing: 40,
      rankSpacing: 48,
    },
    themeVariables: {
      fontFamily: 'var(--font-sans)',
      fontSize: '13px',
      ...(theme.darkMode ? { darkMode: true } : {}),
      ...theme.variables,
    },
    themeCSS: MERMAID_THEME_CSS,
  }
}
