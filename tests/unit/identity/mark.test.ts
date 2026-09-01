import { describe, expect, it } from 'vitest'
import { MARKS, MARK_VIEW_BOX, markPaths, seedFrom, type MarkId } from '@/lib/identity/mark'
import { POINTS } from '@/components/mascot/geometry'

/**
 * The vocabulary, written out rather than imported, so that this file is the
 * place a change to it has to be argued. §13.14 amends §12.3.5 from seven ids
 * to eight; `lokum` is APPENDED, and the position matters — the picker renders
 * this order, so a glyph inserted mid-list moves every mark after it under a
 * reader who had already chosen one.
 */
const IDS: readonly MarkId[] = [
  'seeded', 'datum', 'section', 'weld', 'finish', 'centre', 'hex', 'lokum',
]
const NAMED: readonly MarkId[] = [
  'datum', 'section', 'weld', 'finish', 'centre', 'hex', 'lokum',
]

/** One lattice unit, in user units, on the 24 × 24 board (§12.3.5's 7 × 7 grid). */
const UNIT = 3

interface Seg {
  x1: number
  y1: number
  x2: number
  y2: number
}

const LINE = /^M(-?[\d.]+) (-?[\d.]+) L(-?[\d.]+) (-?[\d.]+)$/

function asSegment(d: string): Seg {
  const m = LINE.exec(d)
  if (m === null) throw new Error(`not a two-point line: ${d}`)
  return { x1: Number(m[1]), y1: Number(m[2]), x2: Number(m[3]), y2: Number(m[4]) }
}

function numbersIn(d: string): number[] {
  return (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)
}

function seedAt(n: number): string {
  return n.toString(16).padStart(8, '0')
}

/** True when the two axis-aligned segments share at least one point. */
function touches(a: Seg, b: Seg): boolean {
  const ax = [Math.min(a.x1, a.x2), Math.max(a.x1, a.x2)]
  const ay = [Math.min(a.y1, a.y2), Math.max(a.y1, a.y2)]
  const bx = [Math.min(b.x1, b.x2), Math.max(b.x1, b.x2)]
  const by = [Math.min(b.y1, b.y2), Math.max(b.y1, b.y2)]
  return ax[0] <= bx[1] && bx[0] <= ax[1] && ay[0] <= by[1] && by[0] <= ay[1]
}

/** Length of the shared run when the two segments lie on the same line. */
function overlapLength(a: Seg, b: Seg): number {
  const aHorizontal = a.y1 === a.y2
  const bHorizontal = b.y1 === b.y2
  if (aHorizontal !== bHorizontal) return 0
  if (aHorizontal) {
    if (a.y1 !== b.y1) return 0
    const lo = Math.max(Math.min(a.x1, a.x2), Math.min(b.x1, b.x2))
    const hi = Math.min(Math.max(a.x1, a.x2), Math.max(b.x1, b.x2))
    return Math.max(0, hi - lo)
  }
  if (a.x1 !== b.x1) return 0
  const lo = Math.max(Math.min(a.y1, a.y2), Math.min(b.y1, b.y2))
  const hi = Math.min(Math.max(a.y1, a.y2), Math.max(b.y1, b.y2))
  return Math.max(0, hi - lo)
}

function pointToSegment(px: number, py: number, s: Seg): number {
  const dx = s.x2 - s.x1
  const dy = s.y2 - s.y1
  const lengthSquared = dx * dx + dy * dy
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - s.x1) * dx + (py - s.y1) * dy) / lengthSquared))
  return Math.hypot(px - (s.x1 + t * dx), py - (s.y1 + t * dy))
}

/** 0 when they meet; otherwise the closest approach. */
function distance(a: Seg, b: Seg): number {
  if (touches(a, b)) return 0
  return Math.min(
    pointToSegment(a.x1, a.y1, b),
    pointToSegment(a.x2, a.y2, b),
    pointToSegment(b.x1, b.y1, a),
    pointToSegment(b.x2, b.y2, a),
  )
}

describe('MARK_VIEW_BOX', () => {
  it('is §12.3.5’s 24 × 24 board', () => {
    expect(MARK_VIEW_BOX).toBe('0 0 24 24')
  })
})

describe('MARKS', () => {
  it('is the seeded mark plus the seven named ones, in its order', () => {
    // §13.14 amends §12.3.5's vocabulary from seven ids to eight: `lokum` is
    // appended, never inserted, so a reader who chose the sixth glyph still
    // finds it sixth. `IDS` is the shared literal, so this stays one edit.
    expect(MARKS.map((mark) => mark.id)).toEqual(IDS)
  })

  it('gives every mark a label and a description', () => {
    for (const mark of MARKS) {
      expect(mark.label.length).toBeGreaterThan(0)
      expect(mark.description.length).toBeGreaterThan(0)
    }
  })

  it('labels in the uppercase register the readouts use (§12.14.1)', () => {
    for (const mark of MARKS) {
      expect(mark.label).toBe(mark.label.toUpperCase())
    }
  })

  it('keeps the descriptions inside the §12.14.1 copy register', () => {
    const banned = [
      '!',
      'easy',
      'just',
      'simply',
      'quick',
      'please',
      'sorry',
      'valid',
      'invalid',
      'oops',
      'great',
      'awesome',
      'nice',
    ]
    for (const mark of MARKS) {
      const lower = mark.description.toLowerCase()
      for (const word of banned) expect(lower).not.toContain(word)
    }
  })

  it('never says the seeded mark comes from the name (§12.3.5)', () => {
    const seeded = MARKS.find((mark) => mark.id === 'seeded')
    expect(seeded?.description.toLowerCase()).toContain('not')
    expect(seeded?.description.toLowerCase()).toContain('name')
  })
})

describe('markPaths — every mark is stroke-only geometry (§12.3.5)', () => {
  it('emits no closepath and no arc-free fill hint for any mark', () => {
    for (const id of IDS) {
      const paths = markPaths(id, 'deadbeef')
      expect(paths.length).toBeGreaterThan(0)
      for (const d of paths) {
        expect(d).not.toMatch(/[Zz]/)
        expect(d).not.toContain('fill')
        expect(d).not.toContain('#')
        expect(d.startsWith('M')).toBe(true)
      }
    }
  })

  it('stays inside the 24 × 24 board', () => {
    for (const id of IDS) {
      for (const d of markPaths(id, 'deadbeef')) {
        for (const value of numbersIn(d)) {
          expect(value).toBeGreaterThanOrEqual(0)
          expect(value).toBeLessThanOrEqual(24)
        }
      }
    }
  })

  it('never emits a hue, a gradient or an opacity — the mark is currentColor', () => {
    for (const id of IDS) {
      const joined = markPaths(id, 'deadbeef').join(' ').toLowerCase()
      expect(joined).not.toMatch(/rgb|hsl|url\(|gradient|opacity/)
    }
  })
})

describe('markPaths — the named drafting glyphs are fixed (§12.3.5)', () => {
  it('ignores the seed entirely', () => {
    for (const id of NAMED) {
      const withoutSeed = markPaths(id, null)
      expect(markPaths(id, 'deadbeef')).toEqual(withoutSeed)
      expect(markPaths(id, '00000000')).toEqual(withoutSeed)
      // Garbage that markPaths('seeded', …) would refuse changes nothing here.
      expect(markPaths(id, 'not-a-seed')).toEqual(withoutSeed)
    }
  })

  it('draws DATUM as a circled cross', () => {
    expect(markPaths('datum', null)).toEqual([
      'M6 12 A6 6 0 0 1 18 12',
      'M18 12 A6 6 0 0 1 6 12',
      'M3 12 L21 12',
      'M12 3 L12 21',
    ])
  })

  it('draws SECTION as a pair of arrows pointing the same way', () => {
    // Shaft with its tail, then the open head, twice: the ISO cutting-plane
    // arrows at the two ends of a cut, both looking the same way.
    expect(markPaths('section', null)).toEqual([
      'M3 3 L3 6 L18 6',
      'M15 4.5 L18 6 L15 7.5',
      'M3 21 L3 18 L18 18',
      'M15 16.5 L18 18 L15 19.5',
    ])
  })

  it('draws WELD as a triangle standing on a reference line', () => {
    const paths = markPaths('weld', null)
    // The reference line carries the triangle's base, which is why the triangle
    // needs no closepath to read as a triangle.
    expect(paths[0]).toBe('M3 15 L21 15')
    expect(paths[1]).toBe('M9 15 L12 9 L15 15')
    expect(paths).toHaveLength(3)
  })

  it('draws FINISH as a surface tick with the extended bar', () => {
    expect(markPaths('finish', null)).toEqual(['M3 15 L6 18 L18 6', 'M18 6 L21 6'])
  })

  it('draws CENTRE as a long-dash-dot cross, symmetric about the centre', () => {
    const paths = markPaths('centre', null)
    expect(paths).toHaveLength(2)
    for (const d of paths) {
      // Five subpaths: dash, dot, long dash, dot, dash.
      expect(d.match(/M/g)).toHaveLength(5)
      const values = numbersIn(d)
      // Every subpath is symmetric about 12 on its varying axis.
      const varying = values.filter((v) => v !== 12)
      const mirrored = varying.map((v) => 24 - v).sort((a, b) => a - b)
      expect(mirrored).toEqual([...varying].sort((a, b) => a - b))
    }
  })

  it('draws HEX on the LKM-01 ratios, scaled from the 32-unit board', () => {
    const paths = markPaths('hex', null)
    expect(paths).toHaveLength(4)

    const scale = 24 / 32
    const outline = numbersIn(paths[0])
    // Seven points: the hexagon walked from T and closed by returning to T,
    // never by a Z that would read as a fill.
    expect(outline).toHaveLength(14)
    expect(outline.slice(0, 2)).toEqual(outline.slice(12, 14))

    const expected = [POINTS.T, POINTS.R, POINTS.Rp, POINTS.Bp, POINTS.Lp, POINTS.L, POINTS.T]
    for (const [index, point] of expected.entries()) {
      // geometry.ts rounds dx at a = 11 on a 32 board and this file rounds it
      // at a = 8.25 on a 24 board, so the two agree to well under 0.01 units —
      // exact symmetry about x = 12 is worth more than matching a rounding.
      expect(Math.abs(outline[index * 2] - point[0] * scale)).toBeLessThan(0.01)
      expect(Math.abs(outline[index * 2 + 1] - point[1] * scale)).toBeLessThan(0.01)
    }

    // The visible Y: three legs from the centre, exactly as EDGES draws them.
    expect(paths.slice(1)).toEqual([
      'M12 12 L4.86 7.875',
      'M12 12 L19.14 7.875',
      'M12 12 L12 20.25',
    ])
  })
})

describe('markPaths — the seeded pattern (§12.3.5)', () => {
  it('is deterministic for a given seed', () => {
    for (const n of [0, 1, 42, 0xdeadbeef, 0xffffffff]) {
      const seed = seedAt(n)
      expect(markPaths('seeded', seed)).toEqual(markPaths('seeded', seed))
    }
  })

  it('emits nothing but two-point lattice lines', () => {
    for (let n = 0; n < 200; n += 1) {
      for (const d of markPaths('seeded', seedAt(n))) {
        const segment = asSegment(d)
        // Axis-aligned: a diagonal on this lattice can pass within 1/√2 of a
        // parallel neighbour, which breaks the separation rule below.
        expect(segment.x1 === segment.x2 || segment.y1 === segment.y2).toBe(true)
        for (const value of [segment.x1, segment.y1, segment.x2, segment.y2]) {
          expect(value % UNIT).toBe(0)
          expect(value).toBeGreaterThanOrEqual(3)
          expect(value).toBeLessThanOrEqual(21)
        }
        const length = Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1)
        expect(length).toBeGreaterThanOrEqual(2 * UNIT)
        expect(length).toBeLessThanOrEqual(3 * UNIT)
      }
    }
  })

  it('caps the segment count so the mark stays legible at 24px', () => {
    for (let n = 0; n < 1000; n += 1) {
      const paths = markPaths('seeded', seedAt(n))
      expect(paths.length).toBeGreaterThanOrEqual(1)
      expect(paths.length).toBeLessThanOrEqual(10)
    }
  })

  it('never places two segments closer than one lattice unit without meeting', () => {
    for (let n = 0; n < 1000; n += 1) {
      const segments = markPaths('seeded', seedAt(n)).map(asSegment)
      for (let i = 0; i < segments.length; i += 1) {
        for (let j = i + 1; j < segments.length; j += 1) {
          const a = segments[i]
          const b = segments[j]
          // Collinear overlap would draw one line twice and read as a heavier
          // stroke, so it is forbidden outright.
          expect(overlapLength(a, b)).toBe(0)
          const gap = distance(a, b)
          if (gap > 0) expect(gap).toBeGreaterThanOrEqual(UNIT)
        }
      }
    }
  })

  it('is mirror-symmetric about the vertical centre line', () => {
    /** Endpoint order removed, so a flipped segment compares to a drawn one. */
    const key = (s: Seg) => {
      const ends = [
        [s.x1, s.y1],
        [s.x2, s.y2],
      ].sort((a, b) => a[1] - b[1] || a[0] - b[0])
      return ends.flat().join(',')
    }
    for (let n = 0; n < 200; n += 1) {
      const segments = markPaths('seeded', seedAt(n)).map(asSegment)
      const drawn = new Set(segments.map(key))
      const flipped = new Set(
        segments.map((s) => key({ x1: 24 - s.x1, y1: s.y1, x2: 24 - s.x2, y2: s.y2 })),
      )
      expect([...flipped].sort()).toEqual([...drawn].sort())
    }
  })

  it('is distinct across a thousand sequential seeds', () => {
    const seen = new Set<string>()
    for (let n = 0; n < 1000; n += 1) seen.add(markPaths('seeded', seedAt(n)).join('|'))
    // Sequential seeds are the hostile case for a weak mixer: the record mints
    // one seed per reader, but a test that only sampled random values would not
    // notice a hash that ignores the low bits.
    expect(seen.size / 1000).toBeGreaterThanOrEqual(0.99)
  })

  it('draws nothing at all rather than inventing geometry from a bad seed', () => {
    // A record read back out of storage is untrusted input (§12.1.3): a seed
    // that is not 8 lowercase hex characters is absent, not repairable, and
    // §11.25 says absent prints nothing.
    for (const seed of [null, '', 'DEADBEEF', 'deadbee', 'deadbeeff', 'zzzzzzzz', 'dead bee']) {
      expect(markPaths('seeded', seed)).toEqual([])
    }
  })

  it('draws nothing for an id no version of this code ever wrote', () => {
    expect(markPaths('silhouette' as MarkId, 'deadbeef')).toEqual([])
  })
})

describe('seedFrom', () => {
  it('is 8 lowercase hex characters', () => {
    expect(seedFrom(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))).toBe('deadbeef')
    expect(seedFrom(new Uint8Array([0, 0, 0, 0]))).toBe('00000000')
    expect(seedFrom(new Uint8Array([255, 255, 255, 255]))).toBe('ffffffff')
    expect(seedFrom(new Uint8Array([1, 2, 3, 4]))).toBe('01020304')
  })

  it('produces a seed markPaths accepts, for every byte pattern tried', () => {
    for (let n = 0; n < 256; n += 1) {
      const seed = seedFrom(new Uint8Array([n, 255 - n, n, 255 - n]))
      expect(seed).toMatch(/^[0-9a-f]{8}$/)
      expect(markPaths('seeded', seed).length).toBeGreaterThan(0)
    }
  })

  it('uses the first four bytes and ignores the rest', () => {
    expect(seedFrom(new Uint8Array([1, 2, 3, 4, 9, 9, 9, 9]))).toBe('01020304')
  })

  it('refuses fewer than four bytes rather than padding entropy it was not given', () => {
    expect(() => seedFrom(new Uint8Array([1, 2, 3]))).toThrow(RangeError)
    expect(() => seedFrom(new Uint8Array())).toThrow(RangeError)
  })

  it('cannot be derived from the name — neither function takes one (§12.3.5)', () => {
    // A name-derived mark would silently change on every already-signed sheet
    // the moment the reader renamed themselves. The signatures make that
    // impossible: the caller supplies random bytes, and nothing else.
    expect(seedFrom).toHaveLength(1)
    expect(markPaths).toHaveLength(2)
  })
})
