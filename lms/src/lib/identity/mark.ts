/**
 * §12.3.5, amended by §13.6 — the drafter's stamp. Not an avatar: a monochrome
 * hairline approval mark, 24 × 24, zero radius, `currentColor`, stroke-only
 * geometry on a 7 × 7 unit grid. The same visual grammar as §5.9's approval
 * stamp, so identity and achievement share one vocabulary.
 *
 * §13.6 adds an eighth id, `lokum`, and changes nothing else: the mark is still
 * stroke-only and still uncoloured, and §13.1's category hues do not reach it,
 * because a category hue on a person's mark would say the person is a
 * subsystem.
 *
 * What this module deliberately does NOT do, and why. §12.3.5 evaluated and
 * rejected `boring-avatars` (colour-palette-driven by construction), DiceBear
 * (cartoons, and 14 styles carry a CC-BY obligation that would have to travel
 * inside the exported record file) and Jdenticon / GitHub identicons (filled
 * shapes with a hash-derived hue). All three collide with T1, where the accent
 * means only "signed off". So: no fill, no colour, no gradient, no hue from a
 * hash, no library. `markPaths` returns nothing but `d` strings, which is what
 * makes a fill impossible rather than merely discouraged — there is no
 * attribute here for one to hide in.
 *
 * The caller renders them with `fill="none"`, `stroke="currentColor"` and
 * `stroke-linecap="round"`; the round cap is what makes CENTRE's chain dots
 * read as dots rather than disappear.
 *
 * This module imports nothing — §12.2's import direction. The HEX mark reuses
 * `src/components/mascot/geometry.ts`'s construction rule rather than importing
 * it, because a client island holds this file.
 */

/** The board every path below is drawn on. */
export const MARK_VIEW_BOX = '0 0 24 24'

/**
 * §12.3.5's 7 × 7 grid, placed on the 24-unit board: 7 lattice points at a
 * pitch of 3, inset by 3, so the lattice spans 3 … 21 and a hairline at the
 * outermost line still has clear space around it.
 */
const LATTICE_POINTS = 7
const UNIT = 3
const ORIGIN = 3
const CENTRE = 12

/** Where lattice column/row `i` sits in user units. */
function at(i: number): number {
  return ORIGIN + i * UNIT
}

/**
 * Three decimals is enough for a 24-unit board and stops the HEX ratios
 * printing float noise; `Number()` then drops the trailing zeros, so `12` stays
 * `12` rather than becoming `12.000`.
 */
function fmt(value: number): string {
  return String(Number(value.toFixed(3)))
}

/** `M12 3.75 L19.14 7.875 …` — one open polyline, never closed with `Z`. */
function polyline(points: ReadonlyArray<readonly [number, number]>): string {
  return points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${fmt(x)} ${fmt(y)}`)
    .join(' ')
}

export type MarkId =
  | 'seeded'
  | 'datum'
  | 'section'
  | 'weld'
  | 'finish'
  | 'centre'
  | 'hex'
  | 'lokum'

/**
 * The seven the reader may pick, in §12.3.5's order with §13.6's `lokum`
 * APPENDED. The order is a stored contract, not a presentation choice: the
 * picker renders this list, and a reader who chose the sixth mark must still
 * find that glyph in the sixth place. So the new one goes last, never into the
 * middle where the brand would arguably prefer it.
 *
 * `seeded` is excluded because it is not a choice of glyph, it is the absence
 * of one: the record stores
 * `mark: null` for it, and `markPaths('seeded', seed)` draws the minted
 * pattern. Both forms reach the same geometry, so a stored `'seeded'` from an
 * older or hand-edited record is accepted too rather than silently blanking
 * the mark.
 */
export const NAMED_MARK_IDS: readonly MarkId[] = [
  'datum', 'section', 'weld', 'finish', 'centre', 'hex', 'lokum',
]

/** Every id the record will accept on read, including the redundant `seeded`. */
export const STORABLE_MARK_IDS: readonly MarkId[] = ['seeded', ...NAMED_MARK_IDS]

/**
 * The picker list: the seeded mark the record mints, plus §12.3.5's six named
 * drafting glyphs in its order and §13.6's `lokum` after them. Labels are in the
 * uppercase readout register of §12.14.1; the descriptions are sentence-case
 * prose and name the real drafting symbol, because that is the whole reason the
 * six were chosen over shapes. LOKUM is the exception and says so: it names the
 * brand's own construction rather than an ISO symbol.
 */
export const MARKS: ReadonlyArray<{ id: MarkId; label: string; description: string }> = [
  {
    id: 'seeded',
    label: 'SEEDED',
    description:
      'A pattern derived from an 8-character seed minted once with your record. ' +
      'It is not derived from your name, so renaming yourself leaves every ' +
      'signed sheet as it was.',
  },
  {
    id: 'datum',
    label: 'DATUM',
    description: 'A circled cross: the datum point every other dimension is measured from.',
  },
  {
    id: 'section',
    label: 'SECTION',
    description: 'A pair of arrows: the direction a section is viewed from.',
  },
  {
    id: 'weld',
    label: 'WELD',
    description: 'A triangle on a reference line: the fillet weld symbol of ISO 2553.',
  },
  {
    id: 'finish',
    label: 'FINISH',
    description: 'A surface tick: the machined-surface texture symbol of ISO 1302.',
  },
  {
    id: 'centre',
    label: 'CENTRE',
    description: 'A chain-dot cross: the centre line ISO 128 draws through a round feature.',
  },
  {
    id: 'hex',
    label: 'HEX',
    description: 'The LKM-01 face: the isometric cube as a hexagon and the visible Y.',
  },
  {
    id: 'lokum',
    label: 'LOKUM',
    description:
      'Three squares climbing corner to corner: the brand’s three stacked lokums, ' +
      'in outline and without a fill.',
  },
]

// ---------------------------------------------------------------------------
// The five fixed drafting glyphs, plus HEX and LOKUM
// ---------------------------------------------------------------------------

/**
 * Every one of these is open geometry. `Z` is a path command and not a paint
 * instruction, so it would not itself fill anything — but keeping the geometry
 * open makes "stroke-only" a property of what this module emits rather than of
 * the attributes some future caller remembers to set, and it lets one test
 * assert it for all eight marks at once. Where a shape has to close, it closes
 * by returning to its first point (HEX, LOKUM) or by standing on a line that is
 * already drawn (WELD's triangle).
 */

/**
 * DATUM's circle: r = 2 lattice units, drawn as two half-arcs because a single
 * 360-degree arc is a no-op in SVG when its start and end points coincide.
 */
const DATUM_R = 2 * UNIT

function halfArc(fromX: number, toX: number): string {
  return `M${fmt(fromX)} ${CENTRE} A${DATUM_R} ${DATUM_R} 0 0 1 ${fmt(toX)} ${CENTRE}`
}

const DATUM: readonly string[] = [
  halfArc(CENTRE - DATUM_R, CENTRE + DATUM_R),
  halfArc(CENTRE + DATUM_R, CENTRE - DATUM_R),
  // The cross runs the full lattice, so it overshoots the circle by one unit —
  // which is what makes it read as a datum mark and not as a target.
  polyline([[at(0), CENTRE], [at(6), CENTRE]]),
  polyline([[CENTRE, at(0)], [CENTRE, at(6)]]),
]

const SECTION: readonly string[] = [
  // Tail down into the shaft, then the shaft: the ISO cutting-plane arrow.
  polyline([[at(0), at(0)], [at(0), at(1)], [at(5), at(1)]]),
  // An open head, 1 unit long and half a unit either side: a hairline needs a
  // wide included angle to read as an arrow at 24px.
  polyline([[at(4), at(1) - UNIT / 2], [at(5), at(1)], [at(4), at(1) + UNIT / 2]]),
  polyline([[at(0), at(6)], [at(0), at(5)], [at(5), at(5)]]),
  polyline([[at(4), at(5) - UNIT / 2], [at(5), at(5)], [at(4), at(5) + UNIT / 2]]),
]

const WELD: readonly string[] = [
  // The reference line, which doubles as the triangle's base.
  polyline([[at(0), at(4)], [at(6), at(4)]]),
  polyline([[at(2), at(4)], [at(3), at(2)], [at(4), at(4)]]),
  // The arrow line, off the left end of the reference line toward the joint.
  polyline([[at(0), at(4)], [at(1), at(6)]]),
]

const FINISH: readonly string[] = [
  // Short leg, apex, long leg — the ISO 1302 basic symbol.
  polyline([[at(0), at(4)], [at(1), at(5)], [at(5), at(1)]]),
  // The extended bar off the top of the long leg, where a texture value goes.
  polyline([[at(5), at(1)], [at(6), at(1)]]),
]

/**
 * ISO 128's long-dash-dot line, drawn as explicit geometry rather than as a
 * `stroke-dasharray`: `markPaths` returns only `d` strings, so the line type has
 * to be in the path or it cannot be in the drawing at all.
 *
 * dash 3.5 · gap 1 · dot 1 · gap 1 · dash 5 · gap 1 · dot 1 · gap 1 · dash 3.5
 * = 18, the lattice span, and symmetric about the centre. These runs are the
 * only off-lattice numbers in the file: a line TYPE is not lattice geometry.
 */
const CHAIN_RUNS: ReadonlyArray<readonly [number, number]> = [
  [3, 6.5],
  [7.5, 8.5],
  [9.5, 14.5],
  [15.5, 16.5],
  [17.5, 21],
]

const CENTRE_MARK: readonly string[] = [
  CHAIN_RUNS.map(([from, to]) => `M${fmt(from)} ${CENTRE} L${fmt(to)} ${CENTRE}`).join(' '),
  CHAIN_RUNS.map(([from, to]) => `M${CENTRE} ${fmt(from)} L${CENTRE} ${fmt(to)}`).join(' '),
]

/**
 * §12.3.5's HEX — the LKM-01 face, on the mascot's own ratios.
 *
 * `geometry.ts` builds the cube from edge length a = 11 on a 32-unit board in
 * 30° isometric: horizontal projection dx = a·cos30°, vertical dy = a·sin30°,
 * and the top vertex a directly above the centre. Those are the ratios reused
 * here at 24/32 of the size — a = 8.25 — rather than by scaling the spec's
 * already-rounded 9.53, which would round asymmetrically and put the left and
 * right vertices at different distances from the centre line.
 */
const HEX_A = 11 * (24 / 32)
const HEX_DX = Number((HEX_A * Math.cos(Math.PI / 6)).toFixed(2))
const HEX_DY = HEX_A / 2

const HEX_POINTS = {
  T: [CENTRE, CENTRE - HEX_A],
  R: [CENTRE + HEX_DX, CENTRE - HEX_DY],
  Rp: [CENTRE + HEX_DX, CENTRE + HEX_DY],
  Bp: [CENTRE, CENTRE + HEX_A],
  Lp: [CENTRE - HEX_DX, CENTRE + HEX_DY],
  L: [CENTRE - HEX_DX, CENTRE - HEX_DY],
  C: [CENTRE, CENTRE],
} as const satisfies Record<string, readonly [number, number]>

const HEX: readonly string[] = [
  // The hexagon silhouette, closed by returning to T rather than by `Z`.
  polyline([
    HEX_POINTS.T,
    HEX_POINTS.R,
    HEX_POINTS.Rp,
    HEX_POINTS.Bp,
    HEX_POINTS.Lp,
    HEX_POINTS.L,
    HEX_POINTS.T,
  ]),
  // The visible Y only. The hidden Y is a dashed line in §8.2 and a `d` string
  // cannot carry a line type, so drawing it here would state the wrong thing.
  polyline([HEX_POINTS.C, HEX_POINTS.L]),
  polyline([HEX_POINTS.C, HEX_POINTS.R]),
  polyline([HEX_POINTS.C, HEX_POINTS.Bp]),
]

/**
 * §13.6's LOKUM — the brand's three stacked cubes, in outline.
 *
 * `lokumai.github.io` stacks three Turkish delight cubes with a diagonal offset,
 * each dusted with sugar. Two of those three properties survive the trip into a
 * `d` string and one does not, and the honest thing is to draw only what
 * survives:
 *
 *  - **The construction does.** Side 2 lattice units, stepped 2 units right and
 *    2 up, three times: the chain spans the whole 3 … 21 lattice and each square
 *    meets the next at a single corner. 2 units is the only side length that
 *    both centres the stack and keeps the squares apart, because the offset has
 *    to equal the side for corner contact and 2 · offset + side = 6.
 *  - **Touching at a corner does.** Meeting at a point is a junction; a shared
 *    RUN would draw one edge twice and read as a heavier line the drawing never
 *    asked for. Stepping by the full side length is what makes the contact a
 *    point.
 *  - **The sugar does not.** The stipple is a field of dots, and a dot in a
 *    stroke-only `d` string is a zero-length subpath that depends on the
 *    caller's line cap to be visible at all. §11.25's rule is derived or absent,
 *    so the sugar is absent here and the description does not claim it. It is
 *    drawn where it can be drawn: `.hl-sugar` in `lokum.css`.
 *
 * The mark stays uncoloured, and there is no per-square hue. A category hue on a
 * person's mark would say the person is a subsystem (§13.6).
 */
const LOKUM_SIDE = 2

/** Lower-left, middle, upper-right: the stack read from the bottom up. */
const LOKUM_ORIGINS: ReadonlyArray<readonly [number, number]> = [
  [0, 4],
  [2, 2],
  [4, 0],
]

/** One square, closed by returning to its first corner exactly as HEX does. */
function latticeSquare(column: number, row: number, side: number): string {
  const x0 = at(column)
  const y0 = at(row)
  const x1 = at(column + side)
  const y1 = at(row + side)
  return polyline([
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
    [x0, y0],
  ])
}

const LOKUM: readonly string[] = LOKUM_ORIGINS.map(([column, row]) =>
  latticeSquare(column, row, LOKUM_SIDE),
)

const NAMED: Readonly<Record<Exclude<MarkId, 'seeded'>, readonly string[]>> = {
  datum: DATUM,
  section: SECTION,
  weld: WELD,
  finish: FINISH,
  centre: CENTRE_MARK,
  hex: HEX,
  lokum: LOKUM,
}

// ---------------------------------------------------------------------------
// The seeded pattern
// ---------------------------------------------------------------------------

/**
 * §12.3.5 — the seed is 8 lowercase hex characters, minted once. Anything else
 * is a value this code never wrote, and a record read back out of Web Storage
 * is untrusted input (§12.1.3), so it is treated as absent rather than repaired:
 * §11.25's rule is derived or absent, and a mark invented from a garbled seed
 * would be neither.
 */
const SEED = /^[0-9a-f]{8}$/

interface Segment {
  /** Lattice coordinates, 0 … 6, with the first endpoint the smaller one. */
  x1: number
  y1: number
  x2: number
  y2: number
}

/**
 * Legibility, stated as geometry rather than as taste. Two rules, and the
 * candidate set is built so that satisfying them is provable:
 *
 *  - **Axis-aligned only.** A diagonal between adjacent lattice points passes
 *    within 1/√2 of a unit of a parallel neighbour it does not touch, which is
 *    below the one-unit separation §12.3.5 requires. Every disjoint pair of
 *    axis-aligned segments on an integer lattice is at least one unit apart,
 *    so excluding diagonals is what makes the rule hold by construction.
 *  - **Two or three units long.** One unit is 3 user units — 3px at the mark's
 *    natural size, which reads as a dot rather than a line.
 */
const MIN_SPAN = 2
const MAX_SPAN = 3

/** §12.3.5 — the cap that keeps a 24px glyph readable. */
const MAX_SEGMENTS = 10

/** 4 or 5 picks, each mirrored, so 4 … 10 segments are drawn. */
const MIN_PICKS = 4
const PICK_CHOICES = 2

/** Bounded so a pathological seed cannot spin; 126 candidates, ≤ 5 accepted. */
const MAX_ATTEMPTS = 128

/** All 126 axis-aligned lattice segments of 2 or 3 units, in a fixed order. */
const CANDIDATES: readonly Segment[] = (() => {
  const list: Segment[] = []
  const last = LATTICE_POINTS - 1
  for (let span = MIN_SPAN; span <= MAX_SPAN; span += 1) {
    for (let j = 0; j <= last; j += 1) {
      for (let i = 0; i + span <= last; i += 1) {
        list.push({ x1: i, y1: j, x2: i + span, y2: j })
        list.push({ x1: j, y1: i, x2: j, y2: i + span })
      }
    }
  }
  return list
})()

/** x → 6 − x. Endpoints are re-ordered so the smaller one stays first. */
function mirror(s: Segment): Segment {
  const last = LATTICE_POINTS - 1
  const a = { x: last - s.x2, y: s.y2 }
  const b = { x: last - s.x1, y: s.y1 }
  const [first, second] = a.y < b.y || (a.y === b.y && a.x <= b.x) ? [a, b] : [b, a]
  return { x1: first.x, y1: first.y, x2: second.x, y2: second.y }
}

function same(a: Segment, b: Segment): boolean {
  return a.x1 === b.x1 && a.y1 === b.y1 && a.x2 === b.x2 && a.y2 === b.y2
}

/**
 * Identical, or collinear with a shared run of positive length. Meeting at a
 * point is fine — a drafting mark is full of junctions, and two touching
 * collinear segments simply read as one longer line — but an overlap draws the
 * same stroke twice and shows up as a heavier line the seed never asked for.
 */
function collides(a: Segment, b: Segment): boolean {
  if (same(a, b)) return true
  const aHorizontal = a.y1 === a.y2
  if (aHorizontal !== (b.y1 === b.y2)) return false
  if (aHorizontal) {
    if (a.y1 !== b.y1) return false
    return Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1) > 0
  }
  if (a.x1 !== b.x1) return false
  return Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1) > 0
}

/**
 * splitmix32. Chosen because the seeds this has to separate are not random
 * values but whatever `crypto.getRandomValues` produced for one reader, and a
 * mixer with a weak finaliser turns near-identical seeds into near-identical
 * marks. splitmix's finaliser is designed for exactly the sequential-counter
 * case, which is also the hostile case the distinctness test uses.
 */
function splitmix32(seed: number): () => number {
  let state = seed | 0
  return () => {
    state = (state + 0x9e3779b9) | 0
    let z = state ^ (state >>> 16)
    z = Math.imul(z, 0x21f0aaad)
    z = z ^ (z >>> 15)
    z = Math.imul(z, 0x735a2d97)
    return (z ^ (z >>> 15)) >>> 0
  }
}

/**
 * A stable selection of lattice segments, mirrored about the vertical centre
 * line. The mirror is what makes the result read as a stamp somebody cut rather
 * than as scattered noise, and it costs nothing that matters: the choice is
 * still over 126 candidates, and the distinctness test measures the outcome
 * across a thousand sequential seeds rather than trusting the arithmetic.
 */
function seededSegments(seed: string): Segment[] {
  const next = splitmix32(Number.parseInt(seed, 16))
  const target = MIN_PICKS + (next() % PICK_CHOICES)
  const drawn: Segment[] = []
  let picks = 0

  for (let attempt = 0; attempt < MAX_ATTEMPTS && picks < target; attempt += 1) {
    const candidate = CANDIDATES[next() % CANDIDATES.length]
    const reflected = mirror(candidate)
    // A segment on the centre column mirrors onto itself.
    const pair = same(candidate, reflected) ? [candidate] : [candidate, reflected]

    const clashes =
      (pair.length === 2 && collides(pair[0], pair[1])) ||
      pair.some((one) => drawn.some((other) => collides(one, other)))
    if (clashes) continue

    drawn.push(...pair)
    picks += 1
  }

  // Canonical order, so the emitted array depends on the seed alone and not on
  // the order the rejection loop happened to accept things in.
  return drawn
    .sort((a, b) => a.y1 - b.y1 || a.x1 - b.x1 || a.y2 - b.y2 || a.x2 - b.x2)
    .slice(0, MAX_SEGMENTS)
}

/**
 * §12.3.5 — the `d` strings for one mark, on a `0 0 24 24` viewBox.
 *
 * `seed` is consulted for `'seeded'` alone; the seven named glyphs are fixed
 * drawings and ignore it. Returns an EMPTY ARRAY, never a substitute glyph,
 * when there is nothing to draw: no seed yet (it is minted at the first
 * sign-off), a seed this code did not write, or an id it does not know. The
 * caller then prints the reader's initials alone, or `UNSIGNED` — §12.3.4 is
 * explicit that a stamp for someone who has not signed would assert an identity
 * that does not exist.
 */
export function markPaths(id: MarkId, seed: string | null): readonly string[] {
  if (id !== 'seeded') return NAMED[id] ?? []
  if (seed === null || !SEED.test(seed)) return []
  return seededSegments(seed).map((s) =>
    polyline([
      [at(s.x1), at(s.y1)],
      [at(s.x2), at(s.y2)],
    ]),
  )
}

/**
 * §12.3.5 — mint a seed from 4 random bytes.
 *
 * **The caller supplies the bytes**, from `crypto.getRandomValues(new
 * Uint8Array(4))`, which keeps this function pure and therefore testable, and
 * keeps the one Web Crypto call in the module that owns the gesture.
 *
 * **The seed is never derived from the name.** A name-derived mark would
 * silently change on every already-signed sheet the moment the reader renamed
 * themselves, retroactively altering artefacts they had already approved — the
 * same reason GitHub seeds a default avatar from an immutable user id and not
 * from the display name. The signature is the enforcement: there is no
 * parameter here a name could arrive through.
 *
 * Throws on fewer than 4 bytes rather than padding: a seed padded out to 8 hex
 * characters would advertise 32 bits of entropy it does not have, and this
 * module's whole job is to not overstate what it knows.
 */
export function seedFrom(bytes: Uint8Array): string {
  if (bytes.length < 4) {
    throw new RangeError('seedFrom needs at least 4 bytes of randomness')
  }
  let hex = ''
  for (let i = 0; i < 4; i += 1) hex += bytes[i].toString(16).padStart(2, '0')
  return hex
}
