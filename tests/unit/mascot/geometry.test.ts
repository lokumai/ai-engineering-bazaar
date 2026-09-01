import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '@/lib/content/categories'
import {
  EDGES,
  FACES,
  HIDDEN_DASH,
  OUTLINE,
  POINTS,
  SUGAR,
  SUGAR_R,
  VIEW_BOX,
  edgeStateOf,
  faceStateFor,
  faceStatesFor,
  hatchSpec,
  progressLabel,
  type FaceId,
  type FaceState,
} from '@/components/mascot/geometry'

/** §8.1 reproduced verbatim, so the test fails if a coordinate is ever nudged. */
const SPEC = {
  viewBox: '0 0 32 32',
  outline: 'M16 5 L25.53 10.5 L25.53 21.5 L16 27 L6.47 21.5 L6.47 10.5 Z',
  visibleY: ['M16 16 L6.47 10.5', 'M16 16 L25.53 10.5', 'M16 16 L16 27'],
  hiddenY: ['M16 16 L16 5', 'M16 16 L6.47 21.5', 'M16 16 L25.53 21.5'],
  faces: {
    F1: 'M16 5 L25.53 10.5 L16 16 L6.47 10.5 Z',
    F2: 'M6.47 10.5 L16 16 L16 27 L6.47 21.5 Z',
    F3: 'M16 16 L25.53 10.5 L25.53 21.5 L16 27 Z',
    F4: 'M16 5 L16 16 L6.47 21.5 L6.47 10.5 Z',
    F5: 'M16 5 L25.53 10.5 L25.53 21.5 L16 16 Z',
    F6: 'M6.47 21.5 L16 16 L25.53 21.5 L16 27 Z',
  } as Record<FaceId, string>,
  sugar: [
    [13.2, 9.1], [18.4, 8.4], [15.1, 11.6], [20.1, 11.2],
    [11.9, 11.9], [17.2, 13.4], [14.0, 13.0],
  ],
}

describe('the seven points (§8.1)', () => {
  it('is drawn on a 0 0 32 32 viewBox', () => {
    expect(VIEW_BOX).toBe(SPEC.viewBox)
  })

  it('places every vertex at its stated coordinate', () => {
    expect(POINTS).toEqual({
      T: [16, 5],
      R: [25.53, 10.5],
      Rp: [25.53, 21.5],
      Bp: [16, 27],
      Lp: [6.47, 21.5],
      L: [6.47, 10.5],
      C: [16, 16],
    })
  })

  it('projects an edge length of 11 at 30°: dx = 9.53, dy = 5.5', () => {
    // R is one projected edge from T. Rounded to the two decimals the spec uses.
    expect(POINTS.R[0] - POINTS.T[0]).toBeCloseTo(9.53, 2)
    expect(POINTS.R[1] - POINTS.T[1]).toBeCloseTo(5.5, 2)
    // ...and the true values the spec derived those from.
    expect(11 * Math.cos(Math.PI / 6)).toBeCloseTo(9.53, 2)
    expect(11 * Math.sin(Math.PI / 6)).toBeCloseTo(5.5, 2)
  })
})

describe('the six faces (§8.1)', () => {
  it('draws every rhombus on the exact path the spec gives', () => {
    const paths = Object.fromEntries(FACES.map((f) => [f.id, f.path]))
    expect(paths).toEqual(SPEC.faces)
  })

  it('maps the six faces to the six categories in order', () => {
    expect(FACES.map((f) => f.category)).toEqual([
      'fundamentals', 'intermediate', 'expert', 'ecosystem', 'protocols', 'optional',
    ])
  })

  it('covers every category exactly once — a cube has six faces and so has this curriculum', () => {
    expect(new Set(FACES.map((f) => f.category)).size).toBe(CATEGORIES.length)
    expect(FACES).toHaveLength(6)
  })

  it('shows three faces and hides three', () => {
    expect(FACES.filter((f) => f.visible).map((f) => f.id)).toEqual(['F1', 'F2', 'F3'])
    expect(FACES.filter((f) => !f.visible).map((f) => f.id)).toEqual(['F4', 'F5', 'F6'])
  })
})

describe('the twelve edges', () => {
  it('draws the hexagon outline as the spec writes it', () => {
    expect(OUTLINE).toBe(SPEC.outline)
  })

  it('has twelve edges, as a cube does', () => {
    expect(EDGES).toHaveLength(12)
  })

  it('reproduces the visible Y exactly', () => {
    const visibleY = EDGES.filter((e) => e.kind === 'visible-y').map((e) => e.path)
    expect(visibleY).toEqual(SPEC.visibleY)
  })

  it('reproduces the hidden Y exactly', () => {
    const hiddenY = EDGES.filter((e) => e.kind === 'hidden-y').map((e) => e.path)
    expect(hiddenY).toEqual(SPEC.hiddenY)
  })

  it('walks the outline segment by segment in the order the outline path does', () => {
    const outline = EDGES.filter((e) => e.kind === 'outline').map((e) => e.path)
    expect(outline).toEqual([
      'M16 5 L25.53 10.5',
      'M25.53 10.5 L25.53 21.5',
      'M25.53 21.5 L16 27',
      'M16 27 L6.47 21.5',
      'M6.47 21.5 L6.47 10.5',
      'M6.47 10.5 L16 5',
    ])
  })

  it('bounds every edge with exactly two faces', () => {
    for (const edge of EDGES) expect(edge.faces).toHaveLength(2)
  })

  it('bounds every face with exactly four edges', () => {
    for (const face of FACES) {
      const bounding = EDGES.filter((e) => e.faces.includes(face.id))
      expect(bounding, face.id).toHaveLength(4)
    }
  })

  it('dashes an edge only where both of its faces are hidden — §8.2', () => {
    const hiddenFaces = new Set(FACES.filter((f) => !f.visible).map((f) => f.id))
    for (const edge of EDGES) {
      const bothHidden = edge.faces.every((id) => hiddenFaces.has(id))
      expect(edge.kind === 'hidden-y', edge.id).toBe(bothHidden)
    }
  })

  it('dashes the hidden edges 2 2, per §8.1', () => {
    expect(HIDDEN_DASH).toBe('2 2')
  })
})

describe('faceStateFor — §8.2', () => {
  it('is dormant with nothing approved', () => {
    expect(faceStateFor({ approved: 0, total: 7 })).toBe('dormant')
  })

  it('is started with at least one approved and not all', () => {
    expect(faceStateFor({ approved: 1, total: 7 })).toBe('started')
    expect(faceStateFor({ approved: 6, total: 7 })).toBe('started')
  })

  it('is complete only when every sheet in the category is approved', () => {
    expect(faceStateFor({ approved: 7, total: 7 })).toBe('complete')
  })

  it('is dormant for a category with no sheets to approve', () => {
    // Four of six categories contain no drawn sheets today. A face that cannot
    // be worked must never read as finished.
    expect(faceStateFor({ approved: 0, total: 0 })).toBe('dormant')
    expect(faceStateFor({ approved: 3, total: 0 })).toBe('dormant')
  })

  it('is dormant when no count was supplied at all', () => {
    expect(faceStateFor(undefined)).toBe('dormant')
  })
})

describe('faceStatesFor', () => {
  it('reads 0 as the honest zero state on all six faces', () => {
    expect(faceStatesFor(0)).toEqual({
      F1: 'dormant', F2: 'dormant', F3: 'dormant',
      F4: 'dormant', F5: 'dormant', F6: 'dormant',
    })
  })

  it('keys counts by category and resolves each face independently', () => {
    const states = faceStatesFor({
      fundamentals: { approved: 7, total: 7 },
      intermediate: { approved: 3, total: 8 },
    })
    expect(states.F1).toBe('complete')
    expect(states.F2).toBe('started')
    expect(states.F3).toBe('dormant')
  })
})

describe('edgeStateOf', () => {
  const started = faceStatesFor({ fundamentals: { approved: 1, total: 7 } })

  it('gives a shared edge the higher of its two faces', () => {
    // T-R bounds F1 (started) and F5 (dormant).
    const tr = EDGES.find((e) => e.id === 'T-R')!
    expect(edgeStateOf(started, tr)).toBe('started')
  })

  it('leaves an edge dormant while both its faces are', () => {
    const rrp = EDGES.find((e) => e.id === 'R-Rp')!
    expect(edgeStateOf(started, rrp)).toBe('dormant')
  })

  it('lets complete outrank started', () => {
    const states = faceStatesFor({
      fundamentals: { approved: 7, total: 7 },
      intermediate: { approved: 1, total: 8 },
    })
    const cl = EDGES.find((e) => e.id === 'C-L')! // bounds F1 and F2
    expect(edgeStateOf(states, cl)).toBe('complete')
  })
})

describe('progressLabel — §8.3', () => {
  it('states the zero case without dressing it up', () => {
    expect(progressLabel(faceStatesFor(0))).toBe('Progress: 0 of 6 subsystems started')
  })

  it('counts the started subsystems, in the form §8.3 gives', () => {
    const states = faceStatesFor({
      fundamentals: { approved: 7, total: 7 },
      intermediate: { approved: 1, total: 8 },
    })
    expect(progressLabel(states)).toBe('Progress: 2 of 6 subsystems started')
  })

  it('counts all six when the whole set is approved', () => {
    const every = Object.fromEntries(
      FACES.map((f) => [f.category, { approved: 1, total: 1 }]),
    )
    expect(progressLabel(faceStatesFor(every))).toBe('Progress: 6 of 6 subsystems started')
  })
})

describe('hatchSpec — §8.2', () => {
  it('uses pitch 3 and stroke 0.5 at or below 32px', () => {
    expect(hatchSpec(28)).toEqual({ pitch: 3, stroke: 0.5 })
    expect(hatchSpec(32)).toEqual({ pitch: 3, stroke: 0.5 })
  })

  it('opens to pitch 4 and stroke 0.75 above 32px', () => {
    expect(hatchSpec(33)).toEqual({ pitch: 4, stroke: 0.75 })
    expect(hatchSpec(96)).toEqual({ pitch: 4, stroke: 0.75 })
  })
})

describe('powdered sugar — §8.1', () => {
  it('stipples seven dots at the stated coordinates', () => {
    expect(SUGAR.map((d) => [...d])).toEqual(SPEC.sugar)
  })

  it('draws them at r = 0.45', () => {
    expect(SUGAR_R).toBe(0.45)
  })

  it('keeps every dot inside the top face', () => {
    // The top face is the rhombus T-R-C-L; a stipple outside it is a smudge.
    const [T, R, C, L] = [POINTS.T, POINTS.R, POINTS.C, POINTS.L]
    for (const [x, y] of SUGAR) {
      expect(inRhombus([x, y], [T, R, C, L]), `${x},${y}`).toBe(true)
    }
  })
})

describe('FaceState', () => {
  it('has exactly the three states §8.2 defines', () => {
    const states: FaceState[] = ['dormant', 'started', 'complete']
    expect(states).toHaveLength(3)
  })
})

/** Winding test: the point is inside iff it is on the same side of all four edges. */
function inRhombus(p: readonly [number, number], poly: ReadonlyArray<readonly [number, number]>) {
  const side = (a: readonly [number, number], b: readonly [number, number]) =>
    (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
  const signs = poly.map((a, i) => Math.sign(side(a, poly[(i + 1) % poly.length])))
  return signs.every((s) => s >= 0) || signs.every((s) => s <= 0)
}
