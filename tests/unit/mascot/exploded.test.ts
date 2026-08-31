import { describe, expect, it } from 'vitest'
import {
  EXPLODED,
  EXPLODED_OFFSETS,
  EXPLODED_ORIGIN,
  EXPLODED_VIEW_BOX,
  FACES,
  POINTS,
  centroidOf,
  type FaceId,
} from '@/components/mascot/geometry'

/** §8.4 reproduced verbatim, so the test fails if a coordinate is ever nudged. */
const SPEC = {
  viewBox: '0 0 56 56',
  origin: [12, 12],
  offsets: {
    F1: [0, -7],
    F6: [0, 7],
    F3: [6.06, 3.5],
    F2: [-6.06, 3.5],
    F5: [6.06, -3.5],
    F4: [-6.06, -3.5],
  } as Record<FaceId, [number, number]>,
  /** §8.4's centroids at rest, before the origin translate, printed to 2dp. */
  centroids: {
    F1: [16, 10.5],
    F2: [11.24, 18.75],
    F3: [20.77, 18.75],
    F4: [11.24, 13.25],
    F5: [20.77, 13.25],
    F6: [16, 21.5],
  } as Record<FaceId, [number, number]>,
}

/**
 * §8.4 prints its centroids to two decimals; the code derives the exact mean,
 * and two of the six land on a half-step — the mean of face F2's vertices is
 * 11.235, which the spec's table shows as 11.24. So the comparison is against
 * the spec's own rounding rather than a tolerance either side of it, and the
 * nudge is what stops a double's 11.234999999999999 rounding the other way.
 */
function printed(value: number): number {
  return Math.round(value * 100 + 1e-9) / 100
}

describe('the exploded board (§8.4)', () => {
  it('is drawn on a 0 0 56 56 viewBox', () => {
    expect(EXPLODED_VIEW_BOX).toBe(SPEC.viewBox)
  })

  it('sets the untouched 0 0 32 32 geometry at (12, 12)', () => {
    expect([...EXPLODED_ORIGIN]).toEqual(SPEC.origin)
  })

  it('keeps every displaced vertex on the board, with room for its stroke', () => {
    // This is what the larger board and the (12, 12) origin are *for*: the
    // widest face reaches 43.59 across and the lowest 46 down.
    for (const { face, offset } of EXPLODED) {
      for (const name of face.points) {
        const [x, y] = POINTS[name]
        expect(x + EXPLODED_ORIGIN[0] + offset[0], `${face.id} ${name} x`)
          .toBeGreaterThan(1)
        expect(x + EXPLODED_ORIGIN[0] + offset[0], `${face.id} ${name} x`)
          .toBeLessThan(55)
        expect(y + EXPLODED_ORIGIN[1] + offset[1], `${face.id} ${name} y`)
          .toBeGreaterThan(1)
        expect(y + EXPLODED_ORIGIN[1] + offset[1], `${face.id} ${name} y`)
          .toBeLessThan(55)
      }
    }
  })
})

describe('the six displacements (§8.4)', () => {
  it('translates each face exactly as the spec\'s table does', () => {
    const offsets = Object.fromEntries(
      Object.entries(EXPLODED_OFFSETS).map(([id, offset]) => [id, [...offset]]),
    )
    expect(offsets).toEqual(SPEC.offsets)
  })

  it('moves every face the same distance, along its own normal', () => {
    // 7 whole units on the vertical axis; 7·cos30° by 7·sin30° on the four
    // isometric diagonals — the projection the cube itself is drawn in.
    for (const face of FACES) {
      const [dx, dy] = EXPLODED_OFFSETS[face.id]
      expect(Math.hypot(dx, dy), face.id).toBeCloseTo(7, 1)
    }
    expect(SPEC.offsets.F3[0]).toBeCloseTo(7 * Math.cos(Math.PI / 6), 2)
    expect(SPEC.offsets.F3[1]).toBeCloseTo(7 * Math.sin(Math.PI / 6), 2)
  })

  it('pushes each face away from the cube, never into it', () => {
    // A face's normal points away from the centre C, so the displaced centroid
    // must be further from C than the one at rest. An offset with a flipped
    // sign passes every other test in this file and draws an implosion.
    for (const { face, offset } of EXPLODED) {
      const [cx, cy] = centroidOf(face)
      const rest = Math.hypot(cx - POINTS.C[0], cy - POINTS.C[1])
      const moved = Math.hypot(cx + offset[0] - POINTS.C[0], cy + offset[1] - POINTS.C[1])
      expect(moved, face.id).toBeGreaterThan(rest)
    }
  })

  it('displaces all six faces, each exactly once', () => {
    expect(EXPLODED.map((e) => e.face.id)).toEqual(['F1', 'F2', 'F3', 'F4', 'F5', 'F6'])
  })
})

describe('centroidOf — where §8.4\'s leader lines start', () => {
  it('lands on every centroid the spec prints', () => {
    const derived = Object.fromEntries(
      FACES.map((face) => [face.id, centroidOf(face).map(printed)]),
    )
    expect(derived).toEqual(SPEC.centroids)
  })

  it('is the mean of the face\'s four vertices, not a transcribed table', () => {
    // The centroid of the top face is the mean of T, R, C and L. Deriving it is
    // what keeps §8.4's table and §8.1's coordinates from drifting apart.
    const top = FACES.find((f) => f.id === 'F1')!
    expect(centroidOf(top)).toEqual([
      (POINTS.T[0] + POINTS.R[0] + POINTS.C[0] + POINTS.L[0]) / 4,
      (POINTS.T[1] + POINTS.R[1] + POINTS.C[1] + POINTS.L[1]) / 4,
    ])
  })
})

describe('the leader lines (§8.4)', () => {
  it('runs each one from the centroid at rest to the displaced centroid', () => {
    for (const { face, offset, leader } of EXPLODED) {
      const [cx, cy] = centroidOf(face)
      const numbers = [...leader.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]))
      expect(numbers, face.id).toHaveLength(4)
      expect(numbers[0], `${face.id} start x`).toBeCloseTo(cx, 3)
      expect(numbers[1], `${face.id} start y`).toBeCloseTo(cy, 3)
      expect(numbers[2], `${face.id} end x`).toBeCloseTo(cx + offset[0], 3)
      expect(numbers[3], `${face.id} end y`).toBeCloseTo(cy + offset[1], 3)
    }
  })

  it('prints coordinates without float noise', () => {
    // (6.47 + 16 + 16 + 6.47) / 4 is 11.234999999999999 in a double, and an SVG
    // path attribute is not the place to show that.
    for (const { face, leader } of EXPLODED) {
      expect(leader, face.id).not.toMatch(/\d{5,}/)
    }
  })

  it('draws one leader per face', () => {
    expect(new Set(EXPLODED.map((e) => e.leader)).size).toBe(6)
  })
})
