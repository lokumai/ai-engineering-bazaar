'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { TickGauge, gaugeWidth, type TickState } from '@/components/sheet/TickGauge'
import { nextUnsigned, type CurriculumFacts } from '@/lib/record/derive'
import { Readout } from './Readout'
import {
  HEADER_TEXT_X,
  NODE_HEIGHT,
  NODE_WIDTH,
  STACKED_ROW_PITCH,
  bandEdgeLines,
  diagramLayout,
  rovingTarget,
  type DiagramLayout,
  type LayoutBand,
  type LayoutEdgeInput,
  type LayoutFacts,
  type LayoutNode,
  type RovingKey,
} from '@/lib/record/layout'
import { useRecord } from '@/lib/record/store'
import type { RecordData } from '@/lib/record/schema'
import { href } from '@/lib/url'

/**
 * §4.10 / §12.10 — the dashboard's single-line diagram, and the two other views
 * of the same graph.
 *
 * **One data structure, three views.** `rows` below is computed once and drives
 * the SVG, the mandatory table equivalent and the below-1024px stacked form.
 * §12.10.3 is explicit about why: three views computed twice start disagreeing,
 * and the one nobody looks at is the one that goes wrong first.
 *
 * **The geometry is not here.** `lib/record/layout.ts` owns every coordinate,
 * is pure, and is asserted for byte-identity in a node test. This file owns
 * only what the record adds — which node is in which state — and the
 * interaction model.
 *
 * ---------------------------------------------------------------------------
 * §12.10.1 — THE ACCESSIBILITY CONTRACT, WHICH OVERRIDES §10.1.
 *
 * §10.1 gave this SVG `role="img"`. That is wrong and it is not a small wrong:
 * under ARIA 1.2 `role="img"` has **presentational children**, so user agents
 * should not expose an `img` element's descendants through the platform
 * accessibility API — which would erase all 32 node labels and leave a screen
 * reader with one unlabelled picture where the whole drawing set was. The
 * corrected structure is the SVG Graphics Module's own, and the Graphics Module
 * names this exact case for `graphics-document`: "charts, maps, diagrams,
 * technical drawing, blue prints".
 *
 *   root <svg>   graphics-document, named by a real <title> and described by a
 *                real <desc>, both referenced explicitly
 *   each band    graphics-object, `Subsystem 02 — Intermediate — 3 of 8 …`
 *   each node    graphics-symbol, `Sheet 13 — Security — signed off … `
 *
 * **Every node is named from `aria-label`, never from its visible `<text>`.**
 * SVG text does not compute into the accessible name, so the module number a
 * sighted reader sees is not available to anybody else; the label carries the
 * number, the title, the state and the prerequisites as words.
 *
 * The rails and traces are `aria-hidden`. They are not decoration — line type
 * is the primary carrier of state (§12.10.4) — but everything they say is said
 * again in each node's label and a third time in the table, and 45 unreachable
 * graphics in the accessibility tree would bury the 32 that matter.
 * ---------------------------------------------------------------------------
 * §12.10.2 — ONE TAB STOP, ROVING TABINDEX.
 *
 * 32 tab stops is the wrong answer. The current node holds `tabindex="0"` and
 * every other holds `-1`; the arithmetic is `rovingTarget` in `layout.ts`, so it
 * is node-testable and this file only moves focus and pushes a route.
 *
 * The focus ring is drawn INSIDE the SVG, via `.hl-node-focus`, because the UA
 * outline on a `<g>` is unreliable. It is a `<path>` rather than a `<rect>` on
 * purpose: `.hl-node[data-state="draft"] rect` sets `stroke-dasharray: 3 2`,
 * and a dashed focus ring would fail the AAA numbers §12.10.2 asks for. At a
 * 3px offset the ring is 50 × 32 at 2px, which is 328px² of indicator against
 * the 280px² a 2px perimeter of the unfocused node would give.
 *
 * **A node cannot be a link, and that is forced rather than chosen.**
 * `graphics-symbol` takes its superclass from `img`, so its children are
 * presentational: an `<a>` inside the node `<g>` would be erased from the
 * accessibility tree by exactly the mechanism §12.10.1 corrected §10.1 for. So
 * the `<g>` is the activation target, as §12.10.2 says it is, and Enter or
 * Space performs a scripted navigation through `lib/url`'s `href` — the
 * documented path for a URL the router does not touch. It costs the client-side
 * transition and "open in new tab" on a node; the table equivalent below
 * carries a real prefetched link for every sheet in the set, which §12.10.3
 * already requires to be in the DOM at all times.
 * ---------------------------------------------------------------------------
 */

type NodeState = 'draft' | 'unread' | 'started' | 'signed'

interface NodeView {
  node: LayoutNode
  state: NodeState
  /** The instant the reader asserted it, for the label and the table. */
  signedOn: string | null
}

/**
 * §5.8's four node states, and the only place the record touches the drawing.
 *
 * `started` is §5.8's "ready, in progress", and it is deliberately generous:
 * anything the record holds for the sheet counts, because every one of those is
 * something the reader actually did. It is an observation printed as evidence,
 * and it gates nothing (§12.4.4).
 *
 * A draft sheet is `draft` whatever the record says. §11.28 and §12.4.1: a
 * sheet nobody has drawn awards nothing and cannot be signed, and an imported
 * record can legitimately carry a sign-off for a sheet that has since been
 * un-drawn — which no control on this site could have produced.
 */
function viewOf(node: LayoutNode, record: RecordData): NodeView {
  if (!node.drawn) return { node, state: 'draft', signedOn: null }
  const sheet = record.sheets[node.slug]
  if (sheet?.signedOff) return { node, state: 'signed', signedOn: sheet.signedOff }
  const touched =
    sheet !== undefined
    && (sheet.reachedEnd
      || sheet.dwellSeconds > 0
      || sheet.quiz !== null
      || Object.keys(sheet.checklist).length > 0
      || sheet.sources.length > 0
      || sheet.submittals.length > 0)
  return { node, state: touched ? 'started' : 'unread', signedOn: null }
}

/** §12.14.1 — a status readout: a key, a value, and no terminal period. */
const STATE_TEXT: Record<NodeState, string> = {
  draft: 'NOT DRAWN',
  unread: 'NOT SIGNED OFF',
  started: 'IN PROGRESS · NOT SIGNED OFF',
  signed: 'SIGNED OFF',
}

function stateText(view: NodeView): string {
  if (view.state === 'signed' && view.signedOn !== null) {
    return `SIGNED OFF ${view.signedOn.slice(0, 10)}`
  }
  return STATE_TEXT[view.state]
}

/**
 * §12.10.1's node name, as words. The em-dash separated form is the spec's own,
 * and the state clause is what makes the label worth reading twice: it is the
 * only place a screen-reader user learns that this node is signed off, because
 * the accent fill and the solid outline are not in the accessibility tree.
 */
function nodeLabel(view: NodeView): string {
  const parts = [`Sheet ${view.node.module}`, view.node.title, stateLabel(view)]
  if (view.node.requires.length > 0) {
    parts.push(`requires ${view.node.requires.join(', ')}`)
  }
  return parts.join(' — ')
}

function stateLabel(view: NodeView): string {
  switch (view.state) {
    case 'draft':
      return 'not drawn'
    case 'unread':
      return 'not signed off'
    case 'started':
      return 'in progress, not signed off'
    case 'signed':
      return view.signedOn === null
        ? 'signed off'
        : `signed off ${view.signedOn.slice(0, 10)}`
  }
}

/** §12.10.1's band name. Both numbers are counted, never typed (§11.25). */
function bandLabel(band: LayoutBand, signed: number): string {
  return `Subsystem ${band.ordinal} — ${band.title} — ${signed} of ${band.total} signed off`
}

/** A DOM handle, from the identity rather than the number (§12.1.3). */
function nodeId(node: LayoutNode): string {
  return `hl-node-${node.slug.replace(/\//g, '-')}`
}

const ROVING: ReadonlySet<string> = new Set<RovingKey>([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
])

const TITLE_ID = 'hl-diagram-name'
const DESC_ID = 'hl-diagram-desc'

export function Diagram({
  facts,
  edges,
}: {
  /** Measured at build time and passed as data: `lib/content/` reads `fs`. */
  facts: LayoutFacts
  edges: readonly LayoutEdgeInput[]
}) {
  const record = useRecord()
  const layout = useMemo(() => diagramLayout(facts, edges), [facts, edges])
  const rows = useMemo(
    () => layout.nodes.map((node) => viewOf(node, record)),
    [layout, record],
  )

  /**
   * The roving index. `0` is a constant the server computes identically, which
   * §12.2 requires of every initial state; seeding it from the record would
   * make the first client render disagree with the prerender. The reader's own
   * next sheet is reachable from `CONTINUE` above the graph, which is where a
   * claim about the reader belongs.
   */
  const [current, setCurrent] = useState(0)

  const signedByModule = new Map(rows.map((row) => [row.node.module, row.state === 'signed']))
  const viewBySlug = new Map(rows.map((row) => [row.node.slug, row]))
  // The roving model is arithmetic over the flat list, so every node needs its
  // position in it; looked up once rather than searched per node per render.
  const indexBySlug = new Map(layout.nodes.map((node, index) => [node.slug, index]))

  /** §12.10.2 — Enter or Space opens the sheet. See the note on `<a>` above. */
  function openSheet(node: LayoutNode): void {
    window.location.assign(href(node.path))
  }

  function move(index: number, key: RovingKey, ctrl: boolean): void {
    const target = rovingTarget(layout.nodes, index, key, ctrl)
    if (target === index) return
    setCurrent(target)
    document.getElementById(nodeId(layout.nodes[target]))?.focus()
  }

  function onKeyDown(event: React.KeyboardEvent<SVGGElement>, index: number): void {
    if (event.key === 'Enter' || event.key === ' ') {
      // Space would otherwise scroll the page out from under the drawing.
      event.preventDefault()
      openSheet(layout.nodes[index])
      return
    }
    if (!ROVING.has(event.key)) return
    // §12.16's guard: a browser shortcut keeps its key. Ctrl is the exception
    // here and only here, because §12.10.2 assigns Ctrl+Home / Ctrl+End itself.
    if (event.altKey || event.metaKey) return
    if (event.ctrlKey && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    move(index, event.key as RovingKey, event.ctrlKey)
  }

  return (
    <figure className="m-0">
      <figcaption className="hl-diagram-title">
        Single-line diagram · {layout.nodes.length} sheets ·{' '}
        {layout.bands.length} subsystems · {layout.traces.length} traces
      </figcaption>

      {/* §4.10.5 — below 1024px the graph degrades to six stacked blocks, not
          to a pan/zoom of the full diagram. Pan/zoom on a phone is a way of
          shipping something you already know does not work. */}
      <div className="mt-3 max-lg:hidden">
        <svg
          className="hl-diagram"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width={layout.width}
          height={layout.height}
          role="graphics-document"
          aria-labelledby={TITLE_ID}
          aria-describedby={DESC_ID}
        >
          {/* A template string, not interpolated children: React refuses an
              array of children on <title> and renders it EMPTY, which would
              leave `aria-labelledby` pointing at nothing and the drawing
              nameless. */}
          <title id={TITLE_ID}>
            {`Drawing set — ${layout.nodes.length} sheets in ${layout.bands.length} subsystems`}
          </title>
          <desc id={DESC_ID}>
            One horizontal band per subsystem, each holding its sheets as
            numbered nodes in sheet order. Traces above a band are prerequisites;
            traces below it are cross-references. A solid outline is a sheet
            that has been drawn, a dashed outline is a sheet not yet drawn, and
            an accent outline with a wash is a sheet this browser records as
            signed off. The same graph is listed as a table below the diagram.
          </desc>

          {/* Rails and traces first, so the node rects paint over them; and
              hidden from the accessibility tree, for the reason at the top of
              this file. */}
          <g aria-hidden="true">
            {layout.rails.map((rail) => (
              <line
                key={rail.id}
                className="hl-rail"
                x1={rail.x1}
                y1={rail.y1}
                x2={rail.x2}
                y2={rail.y2}
              />
            ))}
            {layout.traces.map((trace) => (
              <path
                key={trace.id}
                className="hl-trace"
                d={trace.path}
                data-kind={trace.kind}
                // §5.8 — live means BOTH endpoints are signed off. A trace with
                // one signed end is not energized: the dependency has not been
                // satisfied end to end.
                data-live={
                  signedByModule.get(trace.from) && signedByModule.get(trace.to)
                    ? 'true'
                    : undefined
                }
              />
            ))}
          </g>

          {layout.bands.map((band) => {
            const members = band.nodes.map(
              (node) => viewBySlug.get(node.slug) as NodeView,
            )
            const signed = members.filter((row) => row.state === 'signed').length
            const gauge = members.map(tickOf)

            return (
              <g
                key={band.slug}
                role="graphics-object"
                aria-label={bandLabel(band, signed)}
              >
                {/* §4.10 / §5.4 — the band header, right-aligned in its 176px
                    column and kept clear of the bus, which runs vertically
                    through this region. */}
                <text
                  className="hl-mark"
                  x={HEADER_TEXT_X}
                  y={band.nodeY + 9}
                  textAnchor="end"
                  fill="var(--color-ink-muted)"
                  aria-hidden="true"
                >
                  Subsystem {band.ordinal}
                </text>
                <text
                  x={HEADER_TEXT_X}
                  y={band.nodeY + 23}
                  textAnchor="end"
                  fill="var(--color-ink)"
                  fontFamily="var(--font-display)"
                  fontSize="12"
                  fontWeight={600}
                  aria-hidden="true"
                >
                  {band.title}
                </text>
                {/* Line 3 of §5.4's header: the discrete tick gauge, in the
                    band's own 20px bottom padding. A nested viewport, so the
                    one gauge component serves the diagram and the listing
                    pages alike rather than a second copy of §7.5 living here. */}
                <g
                  transform={`translate(${HEADER_TEXT_X - gaugeWidth(gauge.length)} ${band.nodeY + NODE_HEIGHT + 4})`}
                  aria-hidden="true"
                >
                  <TickGauge ticks={gauge} />
                </g>

                {band.nodes.map((node) => {
                  const view = viewBySlug.get(node.slug) as NodeView
                  const index = indexBySlug.get(node.slug) as number
                  return (
                    <g
                      key={node.slug}
                      id={nodeId(node)}
                      className="hl-node cursor-pointer"
                      data-state={view.state}
                      role="graphics-symbol"
                      aria-label={nodeLabel(view)}
                      tabIndex={index === current ? 0 : -1}
                      onFocus={() => setCurrent(index)}
                      onKeyDown={(event) => onKeyDown(event, index)}
                      onClick={() => openSheet(node)}
                    >
                      <rect
                        x={node.x}
                        y={node.y}
                        width={NODE_WIDTH}
                        height={NODE_HEIGHT}
                      />
                      {/* §5.8 — the 2px accent left edge of an approved node. */}
                      {view.state === 'signed' && (
                        <line
                          className="hl-node-edge"
                          x1={node.x}
                          y1={node.y}
                          x2={node.x}
                          y2={node.y + NODE_HEIGHT}
                        />
                      )}
                      <text
                        x={node.cx}
                        y={node.cy}
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        {node.label}
                      </text>
                      <path
                        className="hl-node-focus"
                        d={`M ${node.x - 3} ${node.y - 3} h ${NODE_WIDTH + 6} v ${NODE_HEIGHT + 6} h ${-(NODE_WIDTH + 6)} z`}
                      />
                    </g>
                  )
                })}
              </g>
            )
          })}
        </svg>
      </div>

      <StackedBands layout={layout} rows={rows} />

      <Legend />

      <DiagramTable layout={layout} rows={rows} />
    </figure>
  )
}

/** §7.5 — the gauge's three states, from the same rows the drawing uses. */
function tickOf(view: NodeView): TickState {
  if (view.state === 'signed') return 'approved'
  return view.node.drawn ? 'drawn' : 'not-drawn'
}

/**
 * §4.10.5 — the below-1024px form, kept verbatim: six stacked per-category
 * blocks, each the band header, then its sheets as a vertical list of `44 × 26`
 * nodes at 52px row pitch with their titles, then that band's edges as
 * `text-meta` plain text.
 *
 * Its nodes reuse `.hl-node` so the line types and the four states are the same
 * markup and the same CSS as the wide drawing, and they carry no `id`: two
 * copies of the graph are in the DOM at all times and only one is displayed, so
 * a shared id would be a duplicate id in every document.
 *
 * Here the sheets are real links. There is no roving model to preserve at this
 * width and no reason to reinvent an anchor.
 */
function StackedBands({
  layout,
  rows,
}: {
  layout: DiagramLayout
  rows: readonly NodeView[]
}) {
  const bySlug = new Map(rows.map((row) => [row.node.slug, row]))

  return (
    <div className="mt-3 lg:hidden">
      {layout.bands.map((band) => {
        const members = band.nodes.map((node) => bySlug.get(node.slug) as NodeView)
        const signed = members.filter((row) => row.state === 'signed').length

        return (
          <section
            key={band.slug}
            className="mb-6"
            aria-label={bandLabel(band, signed)}
          >
            <p className="hl-mark m-0 text-ink-muted">Subsystem {band.ordinal}</p>
            <p className="m-0 font-display text-micro font-semibold text-ink">
              {band.title}
            </p>
            {/* §10.4 — the count is stated in text beside the gauge, which is
                what lets the gauge itself be decoration rather than a second
                announcement of the same number. */}
            <p className="hl-mark m-0 text-ink-faint">
              {band.total} sheets · {signed} signed off
            </p>
            <TickGauge className="mt-1" ticks={members.map(tickOf)} />

            <ul className="m-0 mt-2 list-none p-0">
              {members.map((view) => (
                <li
                  key={view.node.slug}
                  className="flex items-center gap-3"
                  style={{ height: STACKED_ROW_PITCH }}
                >
                  {/* The half-pixel inset is a rendering inset, not geometry:
                      a 1px stroke on the viewBox edge is clipped in half. */}
                  <svg
                    className="hl-node shrink-0"
                    data-state={view.state}
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    viewBox={`0 0 ${NODE_WIDTH} ${NODE_HEIGHT}`}
                    aria-hidden="true"
                  >
                    <rect
                      x={0.5}
                      y={0.5}
                      width={NODE_WIDTH - 1}
                      height={NODE_HEIGHT - 1}
                    />
                    <text
                      x={NODE_WIDTH / 2}
                      y={NODE_HEIGHT / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {view.node.label}
                    </text>
                  </svg>
                  <Link href={view.node.path} className="hl-link text-meta">
                    {view.node.title}
                  </Link>
                  <span className="hl-mark ml-auto shrink-0 text-ink-faint">
                    {stateText(view)}
                  </span>
                </li>
              ))}
            </ul>

            {bandEdgeLines(band).length > 0 && (
              <ul className="m-0 list-none p-0 font-mono text-meta text-ink-muted">
                {bandEdgeLines(band).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}

/**
 * §12.10.4 — state is never carried by colour alone, and the literal drawing
 * legend is what makes that checkable rather than asserted. Line type carries
 * the state first, the accent is redundant reinforcement, and this list spells
 * out both — which is also the `forced-colors` and print insurance policy
 * (§12.17), because when the accent is deleted the legend still reads.
 */
function Legend() {
  return (
    <div className="hl-diagram-legend mt-4">
      <p className="m-0 mb-2">Legend</p>
      <dl className="hl-defs">
        <dt>Solid outline</dt>
        <dd>Sheet drawn</dd>
        <dt>Dashed outline</dt>
        <dd>Sheet not yet drawn</dd>
        <dt>Accent outline, wash, 2px left edge</dt>
        <dd>Signed off in this browser</dd>
        <dt>Hairline between nodes</dt>
        <dd>Sequence, not a dependency</dd>
        <dt>Solid trace above a band</dt>
        <dd>Requires</dd>
        <dt>Dashed trace below a band</dt>
        <dd>See also</dd>
        <dt>Accent trace</dt>
        <dd>Both ends signed off</dd>
      </dl>
    </div>
  )
}

/**
 * §12.10.3 — the table equivalent, which is mandatory and not optional.
 *
 * **Always in the DOM**, revealed by a labelled `<details>`, and forced visible
 * in print by record.css. Never `display: none` when collapsed, because it is
 * the only form in which a reader can actually *verify* a dependency claim —
 * the SVG can be read but not checked — and it is what serialises straight into
 * the record document.
 *
 * Every row is a real link, which is also where the roving model's one cost is
 * paid back (see the note at the top of this file).
 */
function DiagramTable({
  layout,
  rows,
}: {
  layout: DiagramLayout
  rows: readonly NodeView[]
}) {
  const title = new Map(layout.bands.map((band) => [band.slug, band.title]))

  return (
    <details className="hl-diagram-table">
      <summary>The same graph as a table · {rows.length} sheets</summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-left font-mono text-mark tabular-nums">
          <caption className="hl-mark mb-2 text-left text-ink-muted">
            Every sheet in the set, the state this browser records for it, and
            the sheets it requires and feeds
          </caption>
          <thead>
            <tr className="border-b border-line-strong text-ink-muted uppercase">
              <th scope="col" className="py-1 pr-3 font-medium">#</th>
              <th scope="col" className="py-1 pr-3 font-medium">Sheet</th>
              <th scope="col" className="py-1 pr-3 font-medium">Subsystem</th>
              <th scope="col" className="py-1 pr-3 font-medium">State</th>
              <th scope="col" className="py-1 pr-3 font-medium">Requires</th>
              <th scope="col" className="py-1 font-medium">Feeds</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((view) => (
              <tr key={view.node.slug} className="border-b border-line">
                <td className="py-1 pr-3 text-ink-muted">{view.node.label}</td>
                <th scope="row" className="py-1 pr-3 font-normal text-ink">
                  <Link href={view.node.path} className="hl-link">
                    {view.node.title}
                  </Link>
                </th>
                <td className="py-1 pr-3 text-ink-muted uppercase">
                  {title.get(view.node.category) ?? view.node.category}
                </td>
                <td className="py-1 pr-3 text-ink-muted uppercase">
                  {stateText(view)}
                </td>
                {/* §11.25 — a dash where there is nothing, never a zero. */}
                <td className="py-1 pr-3 text-ink-muted">
                  {view.node.requires.length > 0 ? view.node.requires.join(', ') : '—'}
                </td>
                <td className="py-1 text-ink-muted">
                  {view.node.feeds.length > 0 ? view.node.feeds.join(', ') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

/**
 * §12.10.6 `CONTINUE` — one line above the graph: the next ready sheet that is
 * not signed off, as a link. **Absent when there is none**, which is the whole
 * design: it is cheap, and its absence is the first thing a returning senior
 * engineer notices.
 *
 * It lives beside the diagram because §12.10.6 is the diagram's own section,
 * and it is a separate island because it is the only thing on the dashboard
 * above the graph that is a claim about the reader.
 *
 * On the server and in the first client render the record is empty, so this
 * resolves to the first drawn sheet — sheet 01, which is true of a reader who
 * has signed off nothing and is exactly what §12.13's class 1 offers as its one
 * path. Nothing about that frame is a lie.
 */
/**
 * Both shapes at once, because both are needed and both are the same object:
 * `nextUnsigned` reads the record's view of the corpus, and the line prints the
 * sheet's own title. Narrowing the member rather than intersecting the two
 * interfaces is what keeps `sheets.find` returning one element type instead of
 * an intersection of two array types. `curriculumFacts()` satisfies it.
 */
interface ContinueFacts extends CurriculumFacts {
  sheets: ReadonlyArray<CurriculumFacts['sheets'][number] & { title: string }>
}

export function ContinueLine({ facts }: { facts: ContinueFacts }) {
  const record = useRecord()
  const slug = nextUnsigned(record, facts)
  if (slug === null) return null

  const sheet = facts.sheets.find((candidate) => candidate.slug === slug)
  if (!sheet) return null

  return (
    <p className="hl-mark m-0 text-ink-muted">
      Continue{' '}
      <Link href={`/courses/${slug}/`} className="hl-link">
        Sheet {String(sheet.module).padStart(2, '0')} · {sheet.title}
      </Link>
    </p>
  )
}

/**
 * §7.1 / §5.8 — the full readout strip, with the one value only this page can
 * supply.
 *
 * `TRACES n/32` counts the edges with **both** endpoints signed off, and §5.8 is
 * exact about that: a trace with one signed end is not energized, because the
 * dependency has not been satisfied end to end. The record's facts carry the
 * denominator (19 REQUIRES + 13 SEE ALSO) but not the graph, so the dashboard is
 * the only surface that can count the numerator — which is why `Readout` takes
 * it as a prop and prints the cell only where it was actually counted (§11.25).
 *
 * The strip itself is `Readout`'s, unchanged and unduplicated: one
 * implementation of §7.1 for the dashboard and the footer both, because two
 * places for the same number is two places for it to disagree.
 */
export function DiagramReadout({
  facts,
  edges,
}: {
  facts: CurriculumFacts
  edges: readonly LayoutEdgeInput[]
}) {
  const record = useRecord()

  const signed = new Set<number>()
  for (const sheet of facts.sheets) {
    if (sheet.drawn && record.sheets[sheet.slug]?.signedOff) signed.add(sheet.module)
  }
  const live = edges.filter(
    (edge) => signed.has(edge.from) && signed.has(edge.to),
  ).length

  return <Readout variant="full" facts={facts} traces={live} />
}
