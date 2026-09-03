/**
 * §4.10 / §12.10 — the dashboard's single-line diagram, laid out.
 *
 * This module is the whole of the diagram's geometry, and it is pure: given the
 * same curriculum and the same edge list it returns byte-identical integers,
 * for ever. That is not an aesthetic preference. §12.10 requires the emitted
 * SVG to be reproducible so it diffs cleanly and so the record document can be
 * regenerated and compared, which rules out `Math.random`, `Date`, and
 * floating-point coordinates — a `0.5` in a path is a value that can round
 * differently on another engine, and the emitted geometry stops being a fact.
 * `assertIntegral` enforces the last of those at the point of emission rather
 * than trusting arithmetic to have stayed whole.
 *
 * It is also fs-free, and it imports nothing at all. `lib/content/facts.ts`
 * reaches `node:fs` through the loader, and `Diagram.tsx` is a client leaf; a
 * single value imported across that line pulls `node:fs` into the browser
 * bundle and the build stops (§12.2). So the corpus arrives as plain data
 * through `LayoutFacts`, which `curriculumFacts()` satisfies structurally, and
 * the edge list through `LayoutEdgeInput`, which `ModuleEdge` satisfies the
 * same way. Neither type is imported; both are declared here.
 *
 * The record is deliberately ABSENT from this file. Node state is a fact about
 * a reader and arrives on channel B post-mount (§12.2); geometry is a fact
 * about the drawing set and is known at build time. Keeping them apart is what
 * lets the layout be asserted for byte-identity in a node test with no browser
 * and no store.
 *
 * ---------------------------------------------------------------------------
 * THE STANDARD VOCABULARY (§12.10), and where each step lives:
 *
 *   VALIDATE          `validateGraph` — the prerequisite graph must be a DAG
 *                     and every cross-band edge must go forward. A cycle is a
 *                     content bug and fails the build; it is never repaired
 *                     silently, because a repaired cycle is a page lying about
 *                     which sheet depends on which.
 *   LAYER = BAND      one layer per subsystem, in the curriculum's own order.
 *   ORDERING          crossing minimisation by a median sweep over the
 *                     cross-band edges, with MODULE NUMBER as the tie-breaker
 *                     (`orderColumns`).
 *   PLACEMENT         `NODE_FIELD_X + column × NODE_PITCH`, snapped to
 *                     integers by construction.
 *   ROUTING           orthogonal only, never a bézier: trunks in assigned
 *                     lanes, branches as the vertical stubs into the nodes,
 *                     and one vertical bus at `x = 160` for the cross-band
 *                     edges. Lanes come from greedy interval packing
 *                     (`packLanes`) at 8px clearance, and a channel that needs
 *                     more lanes than the reserved tracks THROWS.
 * ---------------------------------------------------------------------------
 */

// ---------------------------------------------------------------------------
// §4.10's geometry. Every number below is the spec's, not a preference.
// ---------------------------------------------------------------------------

/** §4.10 — one `1152 × auto` SVG. 1152 is `--width-box`, the content box. */
export const DIAGRAM_WIDTH = 1152

/** The band header column, right-aligned to the node field. */
export const BAND_HEADER_WIDTH = 176

/** Node field origin x. Identical to the header width by construction. */
export const NODE_FIELD_X = 176

/** §4.10 / §5.8 — the node: `44 × 26`, zero radius. */
export const NODE_WIDTH = 44
export const NODE_HEIGHT = 26

/** 44 node + 20 gap. */
export const NODE_PITCH = 64

/** Channel lane pitch, and the clearance the first lane keeps from the nodes. */
export const LANE_PITCH = 7
export const FIRST_LANE_CLEAR = 8

/** Band bottom padding (gauge + label), and the gap between two bands. */
export const BAND_BOTTOM_PADDING = 20
export const INTER_BAND_GAP = 16

/** The vertical bus, between the header column and the node field. */
export const BUS_X = 160

/**
 * §4.10 — 3px on every turn, and the only non-zero radius in the system. Drawn
 * as a circular arc, because §4.10's other half of that sentence is **never
 * béziers**: curves are organic, traces are engineered.
 */
export const CORNER_RADIUS = 3

/** §4.10 rule 5 — two trunks may share a lane only 8px clear of each other. */
export const LANE_CLEARANCE = 8

/** §4.10.5 — the below-1024px stacked list's row pitch. */
export const STACKED_ROW_PITCH = 52

/**
 * Where the band header's text ends: `LANE_CLEARANCE` clear of the bus.
 *
 * §4.10 right-aligns the 176px header column to the node field, and the bus at
 * `x = 160` runs vertically through exactly that gap — through the node row of
 * one band and the upper channel of another. Ending the text at 152 keeps the
 * header off the only trace that has to cross it, at the same 8px the lane
 * packer keeps between two trunks.
 */
export const HEADER_TEXT_X = BUS_X - LANE_CLEARANCE

/**
 * The reserved tracks per channel (§12.10). A channel that needs more throws,
 * because silent overlap is a page lying about which module depends on which.
 *
 * **This is a stated budget, not a derived one, and saying so matters.** The
 * derivable figure is the structural bound: in a band of `n` nodes at most
 * `⌊n²/4⌋` edges can cross any single vertical cut, which is 20 for the
 * nine-sheet Expert band. A limit that can never be reached is a check that can
 * never fire, and §12.10 asks for a build failure, not for theatre.
 *
 * MEASURED, which is what fixes the number: the Intermediate band's lower
 * channel carries all 13 SEE ALSO edges and needs **11** lanes. That is not a
 * packing artefact — the interval graph's maximum overlap depth at 8px
 * clearance is also 11, so 11 lanes is optimal and the density is real. 16
 * leaves five lanes of headroom above the densest channel in the set and caps a
 * channel at `16 × 7 + 8 = 120px`; a band with both channels full would stand
 * at 286px and six of them at 1,796px, against §4.10's stated typical height of
 * about 520px for the whole drawing. Past that the thing to fix is the
 * dependency graph, not the packer.
 */
export const MAX_CHANNEL_LANES = 16

// ---------------------------------------------------------------------------
// Input — plain data, structurally satisfied by the content layer
// ---------------------------------------------------------------------------

/** Satisfied by `SheetFact` from `lib/content/facts.ts`. */
export interface LayoutSheetFact {
  /** §12.1.3 — the identity. The set has been renumbered before. */
  slug: string
  /** The label, and the sweep's tie-breaker. */
  module: number
  title: string
  category: string
  /** `status: ready` — the geometry is on the sheet. */
  drawn: boolean
}

/** Satisfied by `CategoryFact` from `lib/content/facts.ts`. */
export interface LayoutCategoryFact {
  slug: string
  title: string
  /** `SUBSYSTEM 0n`. Declared by the curriculum, never the array index. */
  order: number
  total: number
}

export interface LayoutFacts {
  sheets: readonly LayoutSheetFact[]
  categories: readonly LayoutCategoryFact[]
}

/** Satisfied by `ModuleEdge` from `lib/content/edges.ts`. */
export interface LayoutEdgeInput {
  from: number
  to: number
  kind: 'requires' | 'see-also'
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

export interface LayoutNode {
  slug: string
  module: number
  /** As the node prints it: zero-padded, like the `#` column of §4.8. */
  label: string
  title: string
  category: string
  drawn: boolean
  /** The sheet's route. Built from the slug, which IS the category plus name. */
  path: string
  /** Which band, and which column inside it — the roving-focus coordinates. */
  band: number
  column: number
  x: number
  y: number
  /** The node's own centre, where every branch meets it. */
  cx: number
  cy: number
  /** Module numbers, ascending. `feeds` is the reverse index, not a relation. */
  requires: readonly number[]
  feeds: readonly number[]
  seeAlso: readonly number[]
}

export interface LayoutBand {
  index: number
  slug: string
  title: string
  /** `02` — from the category's declared order. */
  ordinal: string
  y: number
  height: number
  /** The node row's top edge, and the centre line every rail runs along. */
  nodeY: number
  centreY: number
  upperLanes: number
  lowerLanes: number
  nodes: readonly LayoutNode[]
  total: number
  drawn: number
}

export interface LayoutTrace {
  id: string
  kind: 'requires' | 'see-also'
  from: number
  to: number
  crossBand: boolean
  /** The lane its trunk was packed into, in the source band's channel. */
  lane: number
  /** The `d` attribute. Orthogonal, 3px corners, arcs — never a bézier. */
  path: string
}

/** §4.10 rule 1 — the band's spine. Always drawn, never energized. */
export interface LayoutRail {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface DiagramLayout {
  width: number
  height: number
  bands: readonly LayoutBand[]
  /** Flat, in roving order: band order, then column order (§12.10.2). */
  nodes: readonly LayoutNode[]
  rails: readonly LayoutRail[]
  traces: readonly LayoutTrace[]
}

// ---------------------------------------------------------------------------
// VALIDATE (§12.10) — a cycle is a content bug and fails the build
// ---------------------------------------------------------------------------

function ascending(a: number, b: number): number {
  return a - b
}

/** Append to a map of lists, creating the list on first use. */
function push(map: Map<number, number[]>, key: number, value: number): void {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

/**
 * Asserts the three things the routing cannot recover from.
 *
 * 1. Every endpoint names a sheet in the set. An edge drawn to a sheet that
 *    does not exist is a dependency claim with nothing behind it.
 * 2. The `requires` relation is acyclic. Reported with the cycle spelled out,
 *    because the fix is in the frontmatter and the author needs the ring.
 * 3. Every cross-band `requires` edge goes FORWARD — source band before target
 *    band. §4.10 rule 4 routes it down the bus from the source band's channel
 *    to the target's; a backward edge would draw a prerequisite as though the
 *    curriculum taught it later than the sheet that needs it.
 *
 * A cross-band `see-also` is refused for a fourth reason: §4.10 routes SEE ALSO
 * in a band's lower channel only, so a cross-band one has no lane to sit in,
 * and `lib/content/edges.ts` already declines to emit one. If one ever arrives
 * the graph and the drawing disagree, and the drawing must not guess.
 */
export function validateGraph(
  edges: readonly LayoutEdgeInput[],
  bandOf: ReadonlyMap<number, number>,
): void {
  for (const edge of edges) {
    if (!bandOf.has(edge.from) || !bandOf.has(edge.to)) {
      throw new Error(
        `diagram layout: edge ${edge.from} → ${edge.to} (${edge.kind}) names a `
          + 'module that is not in the set',
      )
    }
    if (edge.from === edge.to) {
      throw new Error(`diagram layout: module ${edge.from} names itself as ${edge.kind}`)
    }
  }

  for (const edge of edges) {
    const from = bandOf.get(edge.from) as number
    const to = bandOf.get(edge.to) as number
    if (from === to) continue
    if (edge.kind === 'see-also') {
      throw new Error(
        `diagram layout: SEE ALSO ${edge.from} → ${edge.to} crosses bands, and `
          + '§4.10 gives a cross-band cross-reference no lane to sit in',
      )
    }
    if (from > to) {
      throw new Error(
        `diagram layout: REQUIRES ${edge.from} → ${edge.to} runs backwards `
          + `(band ${from} → band ${to})`,
      )
    }
  }

  // Iterative three-colour DFS. Recursive would be fine at 33 nodes; iterative
  // is what keeps the reported cycle in traversal order rather than in reverse.
  const out = new Map<number, number[]>()
  for (const edge of edges) {
    if (edge.kind !== 'requires') continue
    const list = out.get(edge.from)
    if (list) list.push(edge.to)
    else out.set(edge.from, [edge.to])
  }

  const OPEN = 1
  const DONE = 2
  const state = new Map<number, number>()
  const trail: number[] = []

  for (const root of [...bandOf.keys()].sort(ascending)) {
    if (state.get(root) === DONE) continue
    const stack: Array<{ node: number; next: number }> = [{ node: root, next: 0 }]
    state.set(root, OPEN)
    trail.push(root)

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]
      const children = out.get(frame.node) ?? []
      if (frame.next >= children.length) {
        state.set(frame.node, DONE)
        stack.pop()
        trail.pop()
        continue
      }
      const child = children[frame.next]
      frame.next += 1
      const seen = state.get(child)
      if (seen === OPEN) {
        const ring = trail.slice(trail.indexOf(child))
        throw new Error(
          'diagram layout: the prerequisite graph has a cycle — '
            + `${[...ring, child].join(' → ')}`,
        )
      }
      if (seen === DONE) continue
      state.set(child, OPEN)
      trail.push(child)
      stack.push({ node: child, next: 0 })
    }
  }
}

// ---------------------------------------------------------------------------
// ORDERING — crossing minimisation, module number as the tie-breaker
// ---------------------------------------------------------------------------

/** Crossings among the cross-band edges, given a column index per module. */
function countCrossings(
  crossBand: readonly LayoutEdgeInput[],
  column: ReadonlyMap<number, number>,
): number {
  let total = 0
  for (let i = 0; i < crossBand.length; i += 1) {
    for (let j = i + 1; j < crossBand.length; j += 1) {
      const a = crossBand[i]
      const b = crossBand[j]
      const dSource = (column.get(a.from) as number) - (column.get(b.from) as number)
      const dTarget = (column.get(a.to) as number) - (column.get(b.to) as number)
      if (dSource * dTarget < 0) total += 1
    }
  }
  return total
}

function columnsOf(bands: readonly number[][]): Map<number, number> {
  const column = new Map<number, number>()
  for (const band of bands) band.forEach((module, index) => column.set(module, index))
  return column
}

/**
 * One median pass over a band, against the band it is being aligned to.
 *
 * A node with no cross-band edge to the reference band has no median, so it is
 * PINNED: it keeps its position, and only the nodes that do have a median are
 * re-seated among the positions they collectively hold. That is the standard
 * fixed-vertex variant, and here it is also the honest one — moving a node no
 * cross-band edge touches would reorder a numbered set for nothing.
 *
 * Ties break on module number, which is what §12.10 asks for and is the reason
 * the pass is deterministic without a stable-sort assumption.
 */
function medianPass(
  band: readonly number[],
  reference: readonly number[],
  neighbours: ReadonlyMap<number, number[]>,
): number[] {
  const referenceColumn = new Map<number, number>()
  reference.forEach((module, index) => referenceColumn.set(module, index))

  const movable: Array<{ module: number; median: number; slot: number }> = []
  band.forEach((module, slot) => {
    const columns = (neighbours.get(module) ?? [])
      .map((other) => referenceColumn.get(other))
      .filter((value): value is number => value !== undefined)
      .sort(ascending)
    if (columns.length === 0) return
    movable.push({ module, median: columns[(columns.length - 1) >> 1], slot })
  })
  if (movable.length < 2) return [...band]

  const slots = movable.map((entry) => entry.slot)
  const seated = [...movable].sort(
    (a, b) => a.median - b.median || a.module - b.module,
  )
  const next = [...band]
  slots.forEach((slot, index) => {
    next[slot] = seated[index].module
  })
  return next
}

/**
 * The sweep. Down the layers, then up, twice — a fixed number of passes, so
 * there is no convergence test and no iteration count that could differ
 * between two builds.
 *
 * **The result is kept only if it strictly reduces crossings.** §4.10 rule 1
 * draws a sequence rail between horizontally adjacent nodes and calls it the
 * band's spine; in a numbered set that spine is a claim about the numbering, so
 * reordering the columns has to earn itself. On this corpus it does not: the
 * three cross-band edges (1→8, 5→9, 6→10) are already monotone in module
 * order, so the sweep runs, finds nothing, and module order stands.
 */
export function orderColumns(
  bandModules: readonly number[][],
  edges: readonly LayoutEdgeInput[],
  bandOf: ReadonlyMap<number, number>,
): number[][] {
  const base = bandModules.map((band) => [...band].sort(ascending))
  const crossBand = edges.filter(
    (edge) => bandOf.get(edge.from) !== bandOf.get(edge.to),
  )
  if (crossBand.length < 2) return base

  const up = new Map<number, number[]>()
  const down = new Map<number, number[]>()
  for (const edge of crossBand) {
    push(down, edge.from, edge.to)
    push(up, edge.to, edge.from)
  }

  let working = base.map((band) => [...band])
  for (let pass = 0; pass < 2; pass += 1) {
    for (let index = 1; index < working.length; index += 1) {
      working[index] = medianPass(working[index], working[index - 1], up)
    }
    for (let index = working.length - 2; index >= 0; index -= 1) {
      working[index] = medianPass(working[index], working[index + 1], down)
    }
  }

  const before = countCrossings(crossBand, columnsOf(base))
  const after = countCrossings(crossBand, columnsOf(working))
  return after < before ? working : base
}

// ---------------------------------------------------------------------------
// ROUTING — greedy interval packing, then orthogonal trunks and branches
// ---------------------------------------------------------------------------

export interface LaneInterval {
  /** Inclusive x-interval the trunk occupies, lowest first. */
  a: number
  b: number
}

/**
 * §4.10 rule 5 — greedy interval packing, of the left-edge family: for each
 * trunk in turn, the lowest lane index whose trunks are all at least
 * `LANE_CLEARANCE` clear of it, adding a lane when none fits.
 *
 * The caller supplies the order. §4.10 fixes it at **span ascending, then
 * source ascending**, which is not the left-endpoint order the algorithm is
 * named after, so this pass carries no optimality guarantee — which is exactly
 * why `MAX_CHANNEL_LANES` is checked rather than assumed. MEASURED: on today's
 * corpus it happens to match the optimum anyway, 11 lanes for the Intermediate
 * band's 13 SEE ALSO edges against a maximum overlap depth of 11.
 *
 * `minLane` reserves the low lanes for somebody else. It is what puts a
 * cross-band trunk above every in-band trunk in the same channel, per §4.10
 * rule 4's "its band's topmost upper lane".
 */
export function packLanes(
  intervals: readonly LaneInterval[],
  minLane = 0,
): number[] {
  const lanes: LaneInterval[][] = []
  const assigned: number[] = []

  for (const interval of intervals) {
    let lane = minLane
    for (; ; lane += 1) {
      const held = lanes[lane]
      if (!held) {
        lanes[lane] = [interval]
        break
      }
      const clear = held.every(
        (other) =>
          other.b + LANE_CLEARANCE <= interval.a
          || interval.b + LANE_CLEARANCE <= other.a,
      )
      if (clear) {
        held.push(interval)
        break
      }
    }
    assigned.push(lane)
  }
  return assigned
}

/**
 * An orthogonal polyline with 3px arc corners.
 *
 * Arcs, not béziers (§4.10). The radius is clamped to half of each adjoining
 * segment so two corners on one segment cannot overrun each other, and it is
 * floored to an integer so nothing fractional reaches the `d` attribute. The
 * sweep flag comes from the turn's sign: in SVG's y-down space a positive cross
 * product is a clockwise turn, which is `sweep-flag: 1`.
 */
export function orthogonalPath(
  points: ReadonlyArray<{ x: number; y: number }>,
  radius = CORNER_RADIUS,
): string {
  if (points.length === 0) return ''
  for (const point of points) assertIntegral(point.x, point.y)

  const out = [`M ${points[0].x} ${points[0].y}`]

  for (let i = 1; i < points.length - 1; i += 1) {
    const previous = points[i - 1]
    const corner = points[i]
    const next = points[i + 1]

    const inX = Math.sign(corner.x - previous.x)
    const inY = Math.sign(corner.y - previous.y)
    const outX = Math.sign(next.x - corner.x)
    const outY = Math.sign(next.y - corner.y)

    const lengthIn = Math.abs(corner.x - previous.x) + Math.abs(corner.y - previous.y)
    const lengthOut = Math.abs(next.x - corner.x) + Math.abs(next.y - corner.y)
    const r = Math.min(
      radius,
      Math.floor(lengthIn / 2),
      Math.floor(lengthOut / 2),
    )

    // A straight-through point, or a corner with no room: a plain vertex.
    if (r <= 0 || (inX === outX && inY === outY)) {
      out.push(`L ${corner.x} ${corner.y}`)
      continue
    }

    const entryX = corner.x - inX * r
    const entryY = corner.y - inY * r
    const exitX = corner.x + outX * r
    const exitY = corner.y + outY * r
    const sweep = inX * outY - inY * outX > 0 ? 1 : 0

    out.push(`L ${entryX} ${entryY}`)
    out.push(`A ${r} ${r} 0 0 ${sweep} ${exitX} ${exitY}`)
  }

  const last = points[points.length - 1]
  out.push(`L ${last.x} ${last.y}`)
  return out.join(' ')
}

/**
 * §12.10 — no floating-point coordinates in the output. Asserted at emission
 * rather than assumed of the arithmetic: a fractional coordinate rounds
 * differently on another engine, and the geometry stops being reproducible.
 */
function assertIntegral(...values: number[]): void {
  for (const value of values) {
    if (!Number.isInteger(value)) {
      throw new Error(`diagram layout: ${value} is not an integer coordinate`)
    }
  }
}

// ---------------------------------------------------------------------------
// The layout
// ---------------------------------------------------------------------------

function nodeX(column: number): number {
  return NODE_FIELD_X + column * NODE_PITCH
}

/** §4.10 rule 5 — `lanes × 7 + 8`, whether or not the channel carries any. */
export function channelHeight(lanes: number): number {
  return lanes * LANE_PITCH + FIRST_LANE_CLEAR
}

function relations(
  edges: readonly LayoutEdgeInput[],
): {
  requires: Map<number, number[]>
  feeds: Map<number, number[]>
  seeAlso: Map<number, number[]>
} {
  const requires = new Map<number, number[]>()
  const feeds = new Map<number, number[]>()
  const seeAlso = new Map<number, number[]>()
  for (const edge of edges) {
    if (edge.kind === 'requires') {
      push(requires, edge.to, edge.from)
      push(feeds, edge.from, edge.to)
    } else {
      push(seeAlso, edge.from, edge.to)
    }
  }
  for (const map of [requires, feeds, seeAlso]) {
    for (const list of map.values()) list.sort(ascending)
  }
  return { requires, feeds, seeAlso }
}

/**
 * §4.10 — the whole drawing, as integers.
 *
 * The order of work is forced by the geometry: a band's vertical position
 * depends on the height of every channel above it, a channel's height depends
 * on how many lanes it needs, and a cross-band lane depends on how many in-band
 * lanes its two bands already hold. So columns first, then lanes, then y, then
 * paths — and nothing is drawn until every lane count is final.
 */
export function diagramLayout(
  facts: LayoutFacts,
  edges: readonly LayoutEdgeInput[],
): DiagramLayout {
  const categories = [...facts.categories].sort((a, b) => a.order - b.order)
  const bandIndex = new Map<string, number>()
  categories.forEach((category, index) => bandIndex.set(category.slug, index))

  // A sheet in a category the category list does not declare has no band to
  // sit in. Dropping it silently would leave a hole in the set; §11.25 says the
  // count was either taken or it was not, so this is a build failure.
  for (const sheet of facts.sheets) {
    if (!bandIndex.has(sheet.category)) {
      throw new Error(
        `diagram layout: sheet ${sheet.slug} is in category "${sheet.category}", `
          + 'which the curriculum does not declare',
      )
    }
  }

  const bandOf = new Map<number, number>()
  for (const sheet of facts.sheets) {
    bandOf.set(sheet.module, bandIndex.get(sheet.category) as number)
  }
  validateGraph(edges, bandOf)

  const sheetOf = new Map<number, LayoutSheetFact>()
  for (const sheet of facts.sheets) sheetOf.set(sheet.module, sheet)

  const columns = orderColumns(
    categories.map((category) =>
      facts.sheets
        .filter((sheet) => sheet.category === category.slug)
        .map((sheet) => sheet.module),
    ),
    edges,
    bandOf,
  )
  const columnOf = columnsOf(columns)
  const centreX = (module: number) =>
    nodeX(columnOf.get(module) as number) + NODE_WIDTH / 2

  // ---- lanes ------------------------------------------------------------
  //
  // §4.10's sort, applied to every channel: span ascending, then source
  // ascending. `span` is the trunk's own width, so the short hops settle into
  // the low lanes nearest their nodes and the long ones ride above them.

  const inBand = edges.filter(
    (edge) => bandOf.get(edge.from) === bandOf.get(edge.to),
  )
  const crossBand = edges.filter(
    (edge) => bandOf.get(edge.from) !== bandOf.get(edge.to),
  )

  const trunk = (edge: LayoutEdgeInput): LaneInterval => {
    const from = centreX(edge.from)
    const to = centreX(edge.to)
    return { a: Math.min(from, to), b: Math.max(from, to) }
  }
  const bySpanThenSource = (a: LayoutEdgeInput, b: LayoutEdgeInput) => {
    const spanA = Math.abs(centreX(a.to) - centreX(a.from))
    const spanB = Math.abs(centreX(b.to) - centreX(b.from))
    return spanA - spanB || a.from - b.from || a.to - b.to
  }

  const laneOf = new Map<LayoutEdgeInput, number>()
  const busLaneOf = new Map<LayoutEdgeInput, number>()
  const upperLanes: number[] = categories.map(() => 0)
  const lowerLanes: number[] = categories.map(() => 0)

  for (let index = 0; index < categories.length; index += 1) {
    for (const kind of ['requires', 'see-also'] as const) {
      const channel = inBand
        .filter((edge) => edge.kind === kind && bandOf.get(edge.from) === index)
        .sort(bySpanThenSource)
      const assigned = packLanes(channel.map(trunk))
      channel.forEach((edge, at) => laneOf.set(edge, assigned[at]))
      const used = assigned.length === 0 ? 0 : Math.max(...assigned) + 1
      if (kind === 'requires') upperLanes[index] = used
      else lowerLanes[index] = used
    }
  }

  // §4.10 rule 4 — a cross-band trunk runs in ITS band's topmost upper lane at
  // both ends, so it is packed into two channels at once: `[bus, source]` in
  // the source band and `[bus, target]` in the target band, both above every
  // in-band lane those channels already hold.
  const crossOrder = [...crossBand].sort((a, b) => {
    const reachA = centreX(a.from) - BUS_X + (centreX(a.to) - BUS_X)
    const reachB = centreX(b.from) - BUS_X + (centreX(b.to) - BUS_X)
    return reachA - reachB || a.from - b.from || a.to - b.to
  })
  const held = new Map<number, LaneInterval[][]>()
  const reserve = (band: number, interval: LaneInterval, minLane: number): number => {
    let lanes = held.get(band)
    if (!lanes) {
      lanes = []
      held.set(band, lanes)
    }
    let lane = minLane
    for (; ; lane += 1) {
      const row = lanes[lane]
      if (!row) {
        lanes[lane] = [interval]
        break
      }
      const clear = row.every(
        (other) =>
          other.b + LANE_CLEARANCE <= interval.a
          || interval.b + LANE_CLEARANCE <= other.a,
      )
      if (clear) {
        row.push(interval)
        break
      }
    }
    return lane
  }

  for (const edge of crossOrder) {
    const source = bandOf.get(edge.from) as number
    const target = bandOf.get(edge.to) as number
    const sourceLane = reserve(
      source,
      { a: BUS_X, b: centreX(edge.from) },
      upperLanes[source],
    )
    const targetLane = reserve(
      target,
      { a: BUS_X, b: centreX(edge.to) },
      upperLanes[target],
    )
    laneOf.set(edge, sourceLane)
    busLaneOf.set(edge, targetLane)
    upperLanes[source] = Math.max(upperLanes[source], sourceLane + 1)
    upperLanes[target] = Math.max(upperLanes[target], targetLane + 1)
  }

  categories.forEach((category, index) => {
    for (const [lanes, channel] of [
      [upperLanes[index], 'REQUIRES'],
      [lowerLanes[index], 'SEE ALSO'],
    ] as const) {
      if (lanes > MAX_CHANNEL_LANES) {
        throw new Error(
          `diagram layout: the ${channel} channel of subsystem ${category.slug} `
            + `needs ${lanes} lanes and ${MAX_CHANNEL_LANES} are reserved`,
        )
      }
    }
  })

  // ---- vertical placement ------------------------------------------------

  const { requires, feeds, seeAlso } = relations(edges)
  const bands: LayoutBand[] = []
  const nodes: LayoutNode[] = []
  const rails: LayoutRail[] = []
  let cursor = 0

  categories.forEach((category, index) => {
    const upper = channelHeight(upperLanes[index])
    const lower = channelHeight(lowerLanes[index])
    const nodeY = cursor + upper
    const centreY = nodeY + NODE_HEIGHT / 2
    const height = upper + NODE_HEIGHT + lower + BAND_BOTTOM_PADDING
    const members: LayoutNode[] = []

    columns[index].forEach((module, column) => {
      const sheet = sheetOf.get(module) as LayoutSheetFact
      const x = nodeX(column)
      assertIntegral(x, nodeY, centreY, x + NODE_WIDTH / 2)
      members.push({
        slug: sheet.slug,
        module,
        label: String(module).padStart(2, '0'),
        title: sheet.title,
        category: sheet.category,
        drawn: sheet.drawn,
        path: `/courses/${sheet.slug}/`,
        band: index,
        column,
        x,
        y: nodeY,
        cx: x + NODE_WIDTH / 2,
        cy: centreY,
        requires: requires.get(module) ?? [],
        feeds: feeds.get(module) ?? [],
        seeAlso: seeAlso.get(module) ?? [],
      })
    })

    // §4.10 rule 1 — the sequence rail, right edge to next left edge, on the
    // node's own centre line. Always drawn, never energized, never accent: it
    // is the band's spine and it states nothing about a dependency.
    for (let at = 0; at + 1 < members.length; at += 1) {
      rails.push({
        id: `rail-${members[at].module}-${members[at + 1].module}`,
        x1: members[at].x + NODE_WIDTH,
        y1: centreY,
        x2: members[at + 1].x,
        y2: centreY,
      })
    }

    bands.push({
      index,
      slug: category.slug,
      title: category.title,
      ordinal: String(category.order).padStart(2, '0'),
      y: cursor,
      height,
      nodeY,
      centreY,
      upperLanes: upperLanes[index],
      lowerLanes: lowerLanes[index],
      nodes: members,
      total: members.length,
      drawn: members.filter((node) => node.drawn).length,
    })
    nodes.push(...members)
    cursor += height + INTER_BAND_GAP
  })

  // ---- trunks and branches -----------------------------------------------

  const bandAt = (index: number) => bands[index]
  const upperLaneY = (index: number, lane: number) =>
    bandAt(index).nodeY - FIRST_LANE_CLEAR - lane * LANE_PITCH
  const lowerLaneY = (index: number, lane: number) =>
    bandAt(index).nodeY + NODE_HEIGHT + FIRST_LANE_CLEAR + lane * LANE_PITCH

  const traces: LayoutTrace[] = []

  for (const edge of edges) {
    const source = bandOf.get(edge.from) as number
    const target = bandOf.get(edge.to) as number
    const lane = laneOf.get(edge) as number
    const fromX = centreX(edge.from)
    const toX = centreX(edge.to)

    if (source === target) {
      // Rules 2 and 3 — a three-segment trunk-and-two-branches, in the upper
      // channel for a dependency and the lower one for a suggestion.
      const y =
        edge.kind === 'requires'
          ? upperLaneY(source, lane)
          : lowerLaneY(source, lane)
      const attach =
        edge.kind === 'requires'
          ? bandAt(source).nodeY
          : bandAt(source).nodeY + NODE_HEIGHT
      traces.push({
        id: `${edge.kind}-${edge.from}-${edge.to}`,
        kind: edge.kind,
        from: edge.from,
        to: edge.to,
        crossBand: false,
        lane,
        path: orthogonalPath([
          { x: fromX, y: attach },
          { x: fromX, y },
          { x: toX, y },
          { x: toX, y: attach },
        ]),
      })
      continue
    }

    // Rule 4 — five segments: up into the source band's topmost upper lane,
    // left to the bus, down the bus to the target band's topmost upper lane,
    // right, and down into the target node.
    const busLane = busLaneOf.get(edge) as number
    const sourceY = upperLaneY(source, lane)
    const targetY = upperLaneY(target, busLane)
    traces.push({
      id: `${edge.kind}-${edge.from}-${edge.to}`,
      kind: edge.kind,
      from: edge.from,
      to: edge.to,
      crossBand: true,
      lane,
      path: orthogonalPath([
        { x: fromX, y: bandAt(source).nodeY },
        { x: fromX, y: sourceY },
        { x: BUS_X, y: sourceY },
        { x: BUS_X, y: targetY },
        { x: toX, y: targetY },
        { x: toX, y: bandAt(target).nodeY },
      ]),
    })
  }

  const height = Math.max(0, cursor - INTER_BAND_GAP)
  assertIntegral(height)

  return { width: DIAGRAM_WIDTH, height, bands, nodes, rails, traces }
}

// ---------------------------------------------------------------------------
// §12.10.2 — the roving-focus arithmetic
// ---------------------------------------------------------------------------

export type RovingKey =
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'Home'
  | 'End'

/**
 * §12.10.2 — where focus goes. The diagram is ONE tab stop: the current node
 * holds `tabindex="0"` and every other holds `-1`, so this is the whole of the
 * navigation model and it is arithmetic over the flat node list.
 *
 * Left/Right walk the band and STOP at its ends rather than wrapping — Home and
 * End are what the spec gives for reaching an end, and a wrap would move the
 * reader to a different subsystem on a keypress that reads as "one along".
 * Up/Down move to the adjacent band, to the node whose centre is nearest the
 * one being left, so a column of sheets tracks down the drawing even where the
 * bands hold 7, 8, 9, 5, 1 and 2 nodes. Ctrl+Home / Ctrl+End reach the set.
 *
 * An impossible move returns the index it was given. Nothing throws: a key at
 * the edge of the drawing is not an error, and moving focus somewhere arbitrary
 * would be worse than not moving it.
 */
export function rovingTarget(
  nodes: readonly LayoutNode[],
  from: number,
  key: RovingKey,
  ctrl = false,
): number {
  if (nodes.length === 0) return from
  if (from < 0 || from >= nodes.length) return 0

  const current = nodes[from]
  const bandStart = from - current.column
  const bandEnd = (() => {
    let at = from
    while (at + 1 < nodes.length && nodes[at + 1].band === current.band) at += 1
    return at
  })()

  switch (key) {
    case 'ArrowLeft':
      return Math.max(bandStart, from - 1)
    case 'ArrowRight':
      return Math.min(bandEnd, from + 1)
    case 'Home':
      return ctrl ? 0 : bandStart
    case 'End':
      return ctrl ? nodes.length - 1 : bandEnd
    case 'ArrowUp':
    case 'ArrowDown': {
      const wanted = current.band + (key === 'ArrowUp' ? -1 : 1)
      let best = from
      let distance = Number.POSITIVE_INFINITY
      nodes.forEach((node, index) => {
        if (node.band !== wanted) return
        const gap = Math.abs(node.cx - current.cx)
        if (gap < distance) {
          distance = gap
          best = index
        }
      })
      return best
    }
  }
}

// ---------------------------------------------------------------------------
// §4.10.5 — the below-1024px form
// ---------------------------------------------------------------------------

/**
 * §4.10.5 — a band's edges as plain text, one line per sheet that has any:
 * `13 REQUIRES 12 · SEE ALSO 12, 14`.
 *
 * This is the same data structure the SVG and the §12.10.3 table are drawn
 * from, printed a third way. Three views computed twice start disagreeing, and
 * the one below 1024px is the one nobody checks.
 */
export function bandEdgeLines(band: LayoutBand): string[] {
  const lines: string[] = []
  for (const node of band.nodes) {
    const parts: string[] = []
    if (node.requires.length > 0) parts.push(`REQUIRES ${node.requires.join(', ')}`)
    if (node.seeAlso.length > 0) parts.push(`SEE ALSO ${node.seeAlso.join(', ')}`)
    if (parts.length > 0) lines.push(`${node.module} ${parts.join(' · ')}`)
  }
  return lines
}
