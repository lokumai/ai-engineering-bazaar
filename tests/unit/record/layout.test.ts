import { describe, expect, it } from 'vitest'
import { moduleGraph } from '@/lib/content/edges'
import { curriculumFacts } from '@/lib/content/facts'
import {
  BAND_BOTTOM_PADDING,
  BAND_HEADER_WIDTH,
  BUS_X,
  CORNER_RADIUS,
  DIAGRAM_WIDTH,
  FIRST_LANE_CLEAR,
  HEADER_TEXT_X,
  INTER_BAND_GAP,
  LANE_CLEARANCE,
  LANE_PITCH,
  MAX_CHANNEL_LANES,
  NODE_FIELD_X,
  NODE_HEIGHT,
  NODE_PITCH,
  NODE_WIDTH,
  STACKED_ROW_PITCH,
  bandEdgeLines,
  channelHeight,
  diagramLayout,
  orderColumns,
  orthogonalPath,
  packLanes,
  rovingTarget,
  validateGraph,
  type LayoutEdgeInput,
  type LayoutFacts,
} from '@/lib/record/layout'

/**
 * §4.10 / §12.10 — the diagram's geometry.
 *
 * Two fixtures, on purpose. A small hand-built curriculum pins the constants,
 * the packing and the throws, where the arithmetic is checkable by eye; the
 * real corpus pins the two things a fixture cannot claim — that the content's
 * own prerequisite graph is a DAG, and that laying it out twice produces the
 * same bytes.
 */

function sheet(module: number, category: string, drawn = true) {
  return {
    slug: `${category}/sheet-${module}`,
    module,
    title: `Sheet ${module}`,
    category,
    drawn,
  }
}

/** Two bands: three sheets, then two. Every number below is countable by hand. */
const FIXTURE: LayoutFacts = {
  sheets: [
    sheet(1, 'alpha'),
    sheet(2, 'alpha'),
    sheet(3, 'alpha'),
    sheet(4, 'beta'),
    sheet(5, 'beta', false),
  ],
  categories: [
    { slug: 'alpha', title: 'Alpha', order: 1, total: 3 },
    { slug: 'beta', title: 'Beta', order: 2, total: 2 },
  ],
}

const NO_EDGES: readonly LayoutEdgeInput[] = []

describe('§4.10 — the geometry is the spec\'s, to the pixel', () => {
  it('states every measured constant', () => {
    expect(DIAGRAM_WIDTH).toBe(1152)
    expect(NODE_FIELD_X).toBe(176)
    expect(BAND_HEADER_WIDTH).toBe(176)
    expect(HEADER_TEXT_X).toBe(152)
    expect(STACKED_ROW_PITCH).toBe(52)
    expect(NODE_WIDTH).toBe(44)
    expect(NODE_HEIGHT).toBe(26)
    expect(NODE_PITCH).toBe(64)
    expect(NODE_PITCH).toBe(NODE_WIDTH + 20)
    expect(LANE_PITCH).toBe(7)
    expect(FIRST_LANE_CLEAR).toBe(8)
    expect(BAND_BOTTOM_PADDING).toBe(20)
    expect(INTER_BAND_GAP).toBe(16)
    expect(BUS_X).toBe(160)
    expect(CORNER_RADIUS).toBe(3)
    expect(LANE_CLEARANCE).toBe(8)
  })

  it('places nodes at the field origin, on the node pitch', () => {
    const layout = diagramLayout(FIXTURE, NO_EDGES)
    const alpha = layout.bands[0]
    expect(alpha.nodes.map((node) => node.x)).toEqual([176, 240, 304])
    expect(alpha.nodes.map((node) => node.cx)).toEqual([198, 262, 326])
  })

  it('sizes a channel at lanes × 7 + 8', () => {
    expect(channelHeight(0)).toBe(8)
    expect(channelHeight(1)).toBe(15)
    expect(channelHeight(3)).toBe(29)
  })

  it('stacks bands with a 16px gap and 20px of bottom padding', () => {
    const layout = diagramLayout(FIXTURE, NO_EDGES)
    const [alpha, beta] = layout.bands
    // Two empty channels, a node row, and the padding.
    expect(alpha.height).toBe(8 + NODE_HEIGHT + 8 + BAND_BOTTOM_PADDING)
    expect(alpha.y).toBe(0)
    expect(alpha.nodeY).toBe(8)
    expect(beta.y).toBe(alpha.height + INTER_BAND_GAP)
    expect(layout.height).toBe(alpha.height + INTER_BAND_GAP + beta.height)
    expect(layout.width).toBe(DIAGRAM_WIDTH)
  })

  it('draws the REQUIRES channel above the node row and SEE ALSO below', () => {
    const layout = diagramLayout(FIXTURE, [
      { from: 1, to: 3, kind: 'requires' },
      { from: 1, to: 3, kind: 'see-also' },
    ])
    const band = layout.bands[0]
    const requires = layout.traces.find((trace) => trace.kind === 'requires')
    const seeAlso = layout.traces.find((trace) => trace.kind === 'see-also')

    // Lane 0 of the upper channel sits 8px clear of the node row's top edge …
    expect(requires?.path).toContain(`M 198 ${band.nodeY}`)
    expect(requires?.path).toContain(`${band.nodeY - FIRST_LANE_CLEAR}`)
    // … and lane 0 of the lower channel 8px clear of its bottom edge.
    const bottom = band.nodeY + NODE_HEIGHT
    expect(seeAlso?.path).toContain(`M 198 ${bottom}`)
    expect(seeAlso?.path).toContain(`${bottom + FIRST_LANE_CLEAR}`)
  })

  it('draws a sequence rail between column-adjacent nodes only', () => {
    const layout = diagramLayout(FIXTURE, NO_EDGES)
    // 5 sheets in 2 bands: 2 rails in the first, 1 in the second.
    expect(layout.rails).toHaveLength(3)
    expect(layout.rails[0]).toEqual({
      id: 'rail-1-2',
      x1: 176 + NODE_WIDTH,
      y1: layout.bands[0].centreY,
      x2: 240,
      y2: layout.bands[0].centreY,
    })
  })

  it('routes a cross-band REQUIRES down the bus at x = 160', () => {
    const layout = diagramLayout(FIXTURE, [{ from: 1, to: 4, kind: 'requires' }])
    const trace = layout.traces[0]
    expect(trace.crossBand).toBe(true)
    // Five segments: up, left to the bus, down the bus, right, down into 4.
    expect(trace.path).toContain(`${BUS_X} `)
    expect(trace.path.match(/A /g)).toHaveLength(4)
    // The trunk leaves the source band's channel ABOVE every in-band lane.
    expect(layout.bands[0].upperLanes).toBe(1)
    expect(layout.bands[1].upperLanes).toBe(1)
  })
})

describe('§12.10 — determinism, and only integers', () => {
  it('emits identical geometry when the real corpus is laid out twice', () => {
    const facts = curriculumFacts()
    const edges = moduleGraph().edges
    const first = diagramLayout(facts, edges)
    const second = diagramLayout(facts, edges)
    expect(second).toEqual(first)
    // Byte-identity, not just structural equality: the emitted SVG has to diff
    // cleanly and the record document has to be reproducible (§12.10).
    expect(JSON.stringify(second)).toBe(JSON.stringify(first))
  })

  it('emits no fractional coordinate anywhere', () => {
    const layout = diagramLayout(curriculumFacts(), moduleGraph().edges)
    expect(Number.isInteger(layout.height)).toBe(true)
    for (const node of layout.nodes) {
      expect([node.x, node.y, node.cx, node.cy].every(Number.isInteger)).toBe(true)
    }
    for (const band of layout.bands) {
      expect([band.y, band.height, band.nodeY, band.centreY].every(Number.isInteger)).toBe(true)
    }
    for (const rail of layout.rails) {
      expect([rail.x1, rail.y1, rail.x2, rail.y2].every(Number.isInteger)).toBe(true)
    }
    for (const trace of layout.traces) {
      expect(trace.path).not.toMatch(/\d\.\d/)
    }
  })

  it('keeps every channel inside its reserved tracks on the real corpus', () => {
    const layout = diagramLayout(curriculumFacts(), moduleGraph().edges)
    for (const band of layout.bands) {
      expect(band.upperLanes).toBeLessThanOrEqual(MAX_CHANNEL_LANES)
      expect(band.lowerLanes).toBeLessThanOrEqual(MAX_CHANNEL_LANES)
    }
    // The busiest band's exact lane count is a measurement of the corpus, and
    // it moves whenever a module's cross-references change, so it is not
    // asserted here. What must hold is the reserve, above, and the overflow
    // behaviour when it is exceeded, which has its own test below.
  })
})

describe('§12.10 — validate: a cycle is a content bug', () => {
  const bandOf = new Map([
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 1],
  ])

  it('accepts an acyclic graph', () => {
    expect(() =>
      validateGraph(
        [
          { from: 1, to: 2, kind: 'requires' },
          { from: 2, to: 3, kind: 'requires' },
          { from: 1, to: 3, kind: 'see-also' },
        ],
        bandOf,
      ),
    ).not.toThrow()
  })

  it('throws on a cycle and names the ring', () => {
    expect(() =>
      validateGraph(
        [
          { from: 1, to: 2, kind: 'requires' },
          { from: 2, to: 3, kind: 'requires' },
          { from: 3, to: 1, kind: 'requires' },
        ],
        bandOf,
      ),
    ).toThrow(/cycle — 1 → 2 → 3 → 1/)
  })

  it('throws on a self-edge', () => {
    expect(() =>
      validateGraph([{ from: 2, to: 2, kind: 'requires' }], bandOf),
    ).toThrow(/names itself/)
  })

  it('throws on a cross-band REQUIRES that runs backwards', () => {
    expect(() =>
      validateGraph([{ from: 4, to: 1, kind: 'requires' }], bandOf),
    ).toThrow(/runs backwards/)
  })

  it('throws on a cross-band SEE ALSO, which has no lane to sit in', () => {
    expect(() =>
      validateGraph([{ from: 1, to: 4, kind: 'see-also' }], bandOf),
    ).toThrow(/crosses bands/)
  })

  it('throws on an edge naming a module the set does not hold', () => {
    expect(() =>
      validateGraph([{ from: 1, to: 99, kind: 'requires' }], bandOf),
    ).toThrow(/not in the set/)
  })

  it('holds on the real prerequisite graph', () => {
    expect(() => diagramLayout(curriculumFacts(), moduleGraph().edges)).not.toThrow()
  })
})

describe('§4.10 rule 5 — greedy interval packing at 8px clearance', () => {
  it('shares a lane when two trunks are 8px or more clear', () => {
    expect(packLanes([{ a: 0, b: 100 }, { a: 108, b: 200 }])).toEqual([0, 0])
  })

  it('adds a lane when the gap is under 8px', () => {
    expect(packLanes([{ a: 0, b: 100 }, { a: 107, b: 200 }])).toEqual([0, 1])
  })

  it('adds a lane for an overlap, and reuses lane 0 when it clears again', () => {
    expect(
      packLanes([
        { a: 0, b: 100 },
        { a: 50, b: 150 },
        { a: 200, b: 260 },
      ]),
    ).toEqual([0, 1, 0])
  })

  it('reserves the low lanes when told to', () => {
    expect(packLanes([{ a: 0, b: 100 }], 3)).toEqual([3])
  })
})

describe('§12.10 — the reserved tracks are a build failure, not an overlap', () => {
  /**
   * Seventeen mutually overlapping SEE ALSO trunks in one band, which needs 17
   * lanes against the 16 reserved. Built rather than measured: the corpus's
   * densest channel is 11, and a check that only fires on content nobody has
   * written yet is a check nobody has run.
   */
  it('throws when a channel needs more lanes than are reserved', () => {
    const nodes = 20
    const facts: LayoutFacts = {
      sheets: Array.from({ length: nodes }, (_, index) => sheet(index + 1, 'alpha')),
      categories: [{ slug: 'alpha', title: 'Alpha', order: 1, total: nodes }],
    }
    const edges: LayoutEdgeInput[] = Array.from(
      { length: MAX_CHANNEL_LANES + 1 },
      (_, index) => ({ from: index + 1, to: nodes - index, kind: 'see-also' as const }),
    )
    expect(() => diagramLayout(facts, edges)).toThrow(
      /SEE ALSO channel of subsystem alpha needs 17 lanes and 16 are reserved/,
    )
  })
})

describe('§4.10 — orthogonal paths with 3px corners, never a bézier', () => {
  it('turns with a circular arc and no curve command', () => {
    const path = orthogonalPath([
      { x: 0, y: 100 },
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ])
    expect(path).toBe(
      'M 0 100 L 0 3 A 3 3 0 0 1 3 0 L 97 0 A 3 3 0 0 1 100 3 L 100 100',
    )
    expect(path).not.toMatch(/[CcSsQqTt]/)
  })

  it('turns the other way with the other sweep flag', () => {
    const path = orthogonalPath([
      { x: 100, y: 100 },
      { x: 100, y: 0 },
      { x: 0, y: 0 },
    ])
    expect(path).toContain('A 3 3 0 0 0 97 0')
  })

  it('drops the corner rather than overrun a segment shorter than 6px', () => {
    const path = orthogonalPath([
      { x: 0, y: 4 },
      { x: 0, y: 0 },
      { x: 4, y: 0 },
    ])
    expect(path).toBe('M 0 4 L 0 2 A 2 2 0 0 1 2 0 L 4 0')
  })

  it('refuses a fractional coordinate outright', () => {
    expect(() => orthogonalPath([{ x: 0, y: 0 }, { x: 0.5, y: 0 }])).toThrow(
      /not an integer coordinate/,
    )
  })
})

describe('§12.10 — the median sweep, with module number as the tie-breaker', () => {
  const bandOf = new Map([
    [1, 0],
    [2, 0],
    [3, 0],
    [8, 1],
    [9, 1],
    [10, 1],
  ])

  it('orders by module number when there is nothing to minimise', () => {
    expect(orderColumns([[3, 1, 2], [10, 8]], [], bandOf)).toEqual([[1, 2, 3], [8, 10]])
  })

  it('leaves the numbered order alone when it is already crossing-free', () => {
    // The corpus's own shape: 1→8, 5→9, 6→10 is monotone, so the sweep finds
    // nothing and the sequence rail keeps meaning what it says.
    expect(
      orderColumns(
        [[1, 2, 3], [8, 9, 10]],
        [
          { from: 1, to: 8, kind: 'requires' },
          { from: 2, to: 9, kind: 'requires' },
          { from: 3, to: 10, kind: 'requires' },
        ],
        bandOf,
      ),
    ).toEqual([[1, 2, 3], [8, 9, 10]])
  })

  it('reorders a band only when that strictly reduces crossings', () => {
    const swept = orderColumns(
      [[1, 2, 3], [8, 9, 10]],
      [
        { from: 1, to: 10, kind: 'requires' },
        { from: 2, to: 9, kind: 'requires' },
        { from: 3, to: 8, kind: 'requires' },
      ],
      bandOf,
    )
    expect(swept[0]).toEqual([1, 2, 3])
    expect(swept[1]).toEqual([10, 9, 8])
  })

  it('is a no-op on the real corpus, which is numbered', () => {
    const layout = diagramLayout(curriculumFacts(), moduleGraph().edges)
    for (const band of layout.bands) {
      const numbers = band.nodes.map((node) => node.module)
      expect(numbers).toEqual([...numbers].sort((a, b) => a - b))
    }
  })
})

describe('§12.10.2 — the roving-focus arithmetic', () => {
  const layout = diagramLayout(FIXTURE, NO_EDGES)
  const nodes = layout.nodes

  it('walks a band with Left and Right and stops at its ends', () => {
    expect(rovingTarget(nodes, 0, 'ArrowRight')).toBe(1)
    expect(rovingTarget(nodes, 2, 'ArrowRight')).toBe(2)
    expect(rovingTarget(nodes, 1, 'ArrowLeft')).toBe(0)
    expect(rovingTarget(nodes, 0, 'ArrowLeft')).toBe(0)
  })

  it('sends Home and End to the band\'s ends', () => {
    expect(rovingTarget(nodes, 1, 'Home')).toBe(0)
    expect(rovingTarget(nodes, 1, 'End')).toBe(2)
    expect(rovingTarget(nodes, 4, 'Home')).toBe(3)
    expect(rovingTarget(nodes, 3, 'End')).toBe(4)
  })

  it('sends Ctrl+Home and Ctrl+End to the set\'s ends', () => {
    expect(rovingTarget(nodes, 4, 'Home', true)).toBe(0)
    expect(rovingTarget(nodes, 0, 'End', true)).toBe(nodes.length - 1)
  })

  it('moves between bands to the nearest column', () => {
    // Column 2 of a three-node band has no column 2 below it, so it lands on
    // the nearest centre — column 1 of the two-node band. Coming back up, that
    // column's centre is shared exactly, so focus returns to column 1 and not
    // to where it came from: the nearest column is a property of the geometry,
    // not a remembered history.
    expect(rovingTarget(nodes, 2, 'ArrowDown')).toBe(4)
    expect(rovingTarget(nodes, 4, 'ArrowUp')).toBe(1)
    expect(rovingTarget(nodes, 0, 'ArrowDown')).toBe(3)
  })

  it('stays put at the first and last band', () => {
    expect(rovingTarget(nodes, 0, 'ArrowUp')).toBe(0)
    expect(rovingTarget(nodes, 4, 'ArrowDown')).toBe(4)
  })

  it('recovers from an index no node answers to', () => {
    expect(rovingTarget(nodes, -1, 'ArrowRight')).toBe(0)
    expect(rovingTarget(nodes, 99, 'ArrowRight')).toBe(0)
    expect(rovingTarget([], 0, 'ArrowRight')).toBe(0)
  })
})

describe('§4.10.5 — the below-1024px edge list, from the same structure', () => {
  it('prints a band\'s edges as plain text', () => {
    const layout = diagramLayout(FIXTURE, [
      { from: 1, to: 3, kind: 'requires' },
      { from: 1, to: 3, kind: 'see-also' },
    ])
    expect(bandEdgeLines(layout.bands[0])).toEqual(['1 SEE ALSO 3', '3 REQUIRES 1'])
    expect(bandEdgeLines(layout.bands[1])).toEqual([])
  })

  it('reads the real Intermediate band', () => {
    const layout = diagramLayout(curriculumFacts(), moduleGraph().edges)
    const lines = bandEdgeLines(layout.bands[1])
    // §4.10.5's own example line is illustrative — sheet 13 cross-references
    // nothing — so the assertion is on the shape against what the corpus says.
    expect(lines).toContain('13 REQUIRES 12')
    expect(lines).toContain('14 REQUIRES 12 · SEE ALSO 9, 12')
    expect(lines).toHaveLength(8)
  })
})

describe('the layout carries the identity, never the module number', () => {
  it('keys every node by slug and routes from it', () => {
    const layout = diagramLayout(curriculumFacts(), moduleGraph().edges)
    const node = layout.nodes.find((candidate) => candidate.module === 13)
    expect(node?.slug).toBe('intermediate/security')
    expect(node?.path).toBe('/courses/intermediate/security/')
    expect(node?.label).toBe('13')
    expect(node?.requires).toEqual([12])
  })

  it('zero-pads a single-digit label, like the `#` column', () => {
    const layout = diagramLayout(FIXTURE, NO_EDGES)
    expect(layout.nodes[0].label).toBe('01')
  })

  it('throws on a sheet whose category the curriculum does not declare', () => {
    expect(() =>
      diagramLayout(
        { sheets: [sheet(1, 'ghost')], categories: FIXTURE.categories },
        NO_EDGES,
      ),
    ).toThrow(/does not declare/)
  })
})
