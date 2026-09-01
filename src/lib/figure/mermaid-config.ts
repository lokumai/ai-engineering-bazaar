/**
 * Requirement B4 — the mermaid configuration, and why every value in it is the
 * value §6.10 chose.
 *
 * The whole point is that mermaid emits **zero inline colours**. `theme: 'base'`
 * is the only built-in theme whose generated CSS `themeCSS` can override
 * wholesale, and every declaration below resolves to a `var(--color-…)`. CSS
 * custom properties cascade into inline SVG, so flipping `.dark` on `<html>`
 * re-themes all thirty diagrams with no re-render, no re-parse and no
 * JavaScript — which is the 0ms theme switch §9.2 demands, and the reason this
 * file may not contain a single colour literal.
 *
 * `curve: 'linear'` and `rx/ry: 0` (T7) are what make an embedded figure look
 * like it came from the same draughtsman as the site chrome.
 */

import type { MermaidConfig } from 'mermaid'

/**
 * §6.10 B4's block, with every selector bound to a token. This is the whole of
 * the diagram palette: the source B2 emits binds a node to a semantic *class*
 * and nothing else, because mermaid's `classDef` grammar cannot hold a `var()`.
 *
 * `stroke-width` is `1px` throughout: §2.2 quantises line weight to three
 * values and a diagram edge is a hairline, the same weight as every other rule
 * on the sheet.
 *
 * Three additions to the spec's block, each one a colour that would otherwise
 * survive into the drawing and be wrong in dark mode:
 *
 * - `.cluster.<class>` — **MEASURED:** figure 13.1 classes four *subgraphs*
 *   (untrusted content, agent loop, private data, egress), and a subgraph is a
 *   cluster, not a node. Without it the one diagram in the corpus that draws
 *   the lethal trifecta loses its trifecta.
 * - `.cluster-label text` / `.cluster text` — mermaid publishes its generated
 *   CSS at the render id (`#hl-fig-0 .cluster-label text`), which outranks a
 *   bare `text` selector at the same id. A subgraph title would stay near-black
 *   on the dark ground: §10.1's exact failure mode.
 * - `.edgeLabel` grounds — mermaid paints an edge label's box in a computed
 *   `hsl()` at `opacity: 0.5`. **MEASURED:** module 6's agent loop labels its
 *   branch edges `Yes` / `No`.
 */
export const MERMAID_THEME_CSS = `
  .node rect, .node polygon, .node circle, .node ellipse, .node path {
    fill: var(--color-cleared);
    stroke: var(--color-line-strong);
    stroke-width: 1px;
    rx: 0;
    ry: 0;
  }
  .cluster rect {
    fill: var(--color-paper);
    stroke: var(--color-line-strong);
    stroke-width: 1px;
    rx: 0;
    ry: 0;
  }
  .node.fault rect, .node.fault polygon, .node.fault path,
  .cluster.fault rect {
    fill: var(--color-fault-wash);
    stroke: var(--color-fault);
  }
  .node.verify rect, .node.verify polygon, .node.verify path,
  .cluster.verify rect {
    fill: var(--color-verify-wash);
    stroke: var(--color-verify);
  }
  .node.info rect, .node.info polygon, .node.info path,
  .cluster.info rect {
    fill: var(--color-info-wash);
    stroke: var(--color-info);
  }
  .node.caution rect, .node.caution polygon, .node.caution path,
  .cluster.caution rect {
    fill: var(--color-caution-wash);
    stroke: var(--color-caution);
  }
  .nodeLabel, .edgeLabel, .cluster-label, .label, .label text, text,
  .nodeLabel p, .edgeLabel p, .cluster-label span,
  .cluster-label text, .cluster text {
    color: var(--color-ink);
    fill: var(--color-ink);
  }
  .edgeLabel, .edgeLabel p, .edgeLabel span {
    background-color: var(--color-paper);
  }
  .edgeLabel rect, .labelBkg, .edgeLabel .label-container {
    fill: var(--color-paper);
    stroke: none;
    opacity: 1;
  }
  .edgePath path, .flowchart-link {
    stroke: var(--color-line-strong);
    stroke-width: 1px;
  }
  marker path, marker polygon {
    fill: var(--color-line-strong);
    stroke: none;
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

/** §6.10 B4, verbatim. */
export function mermaidConfig(): MermaidConfig {
  return {
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'strict',
    // A diagram that fails to parse throws to the caller, which falls back to
    // the source (§6.10's "must never blank the sheet"). Without this mermaid
    // paints its own error graphic into the page instead — a cartoon bomb, in
    // its own colours, in the middle of a technical drawing.
    suppressErrorRendering: true,
    flowchart: {
      curve: 'linear',
      htmlLabels: false,
      padding: 12,
      nodeSpacing: 40,
      rankSpacing: 48,
    },
    themeVariables: {
      fontFamily: 'var(--font-display)',
      fontSize: '13px',
    },
    themeCSS: MERMAID_THEME_CSS,
  }
}
