import type { CategorySlug } from '@/lib/content/categories'

/**
 * LKM-01 — the geometry and the state arithmetic (spec §8.1, §8.2).
 *
 * A single 1-unit cube in 30° isometric projection. Its construction rule is
 * the design system's rule: what is built is solid, what is not yet built is
 * dashed. No face, no eyes, no limbs, no gradient, no voice — ever (§8.5).
 *
 * **§13.2 granted the mark exactly one thing §8.5 used to deny it: colour.** A
 * face may now carry its category's flat hue, on channel A, and nothing else
 * moved — no face, no eyes, no mouth, no limbs, no gradient, no voice, and no
 * animation or transition at any size in any variant (§9.1). A state change
 * here is a repaint, not a tween.
 *
 * A cube has six faces and this curriculum has six categories, so the mark is
 * not a logo standing next to a progress indicator; it *is* the indicator.
 * Everything a caller needs to decide what is drawn lives here, in plain data,
 * so it can be tested without a renderer.
 */

type Point = readonly [number, number]

export const VIEW_BOX = '0 0 32 32'

/**
 * §8.1 — the seven points. Edge length a = 11, horizontal projection
 * dx = a·cos30° = 9.53, vertical dy = a·sin30° = 5.5. `Rp`/`Bp`/`Lp` are the
 * spec's R′/B′/L′. `C` is the Y junction: the front vertex and the hidden back
 * vertex, coincident in projection.
 */
export const POINTS = {
  T: [16, 5],
  R: [25.53, 10.5],
  Rp: [25.53, 21.5],
  Bp: [16, 27],
  Lp: [6.47, 21.5],
  L: [6.47, 10.5],
  C: [16, 16],
} as const satisfies Record<string, Point>

type PointName = keyof typeof POINTS

const at = (name: PointName): Point => POINTS[name]

/** `M16 5 L25.53 10.5 …` — one decimal place, exactly as §8.1 writes it. */
function polyline(names: readonly PointName[], close: boolean): string {
  const d = names
    .map((name, i) => `${i === 0 ? 'M' : 'L'}${at(name)[0]} ${at(name)[1]}`)
    .join(' ')
  return close ? `${d} Z` : d
}

/** The hexagon silhouette. Always solid — the line type never changes (§8.2). */
export const OUTLINE = polyline(['T', 'R', 'Rp', 'Bp', 'Lp', 'L'], true)

export type FaceId = 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6'

export interface Face {
  id: FaceId
  /** The face's position on the cube, as §8.1 names it. */
  name: string
  /** The category this face is the meter for. */
  category: CategorySlug
  /** Its four vertices, in the order §8.1's path walks them. */
  points: readonly PointName[]
  path: string
  /** An isometric cube shows three faces; the other three are hidden geometry. */
  visible: boolean
}

function defineFace(
  id: FaceId,
  name: string,
  category: CategorySlug,
  visible: boolean,
  points: readonly PointName[],
): Face {
  return { id, name, category, visible, points, path: polyline(points, true) }
}

/** §8.1 — six rhombi, mapped to the six categories in order. */
export const FACES: readonly Face[] = [
  defineFace('F1', 'TOP', 'fundamentals', true, ['T', 'R', 'C', 'L']),
  defineFace('F2', 'LEFT', 'intermediate', true, ['L', 'C', 'Bp', 'Lp']),
  defineFace('F3', 'RIGHT', 'expert', true, ['C', 'R', 'Rp', 'Bp']),
  defineFace('F4', 'BACK-LEFT', 'ecosystem', false, ['T', 'C', 'Lp', 'L']),
  defineFace('F5', 'BACK-RIGHT', 'protocols', false, ['T', 'R', 'Rp', 'C']),
  defineFace('F6', 'BOTTOM', 'optional', false, ['Lp', 'C', 'Rp', 'Bp']),
]

/**
 * §13.1.1, §13.9 — the six flavour names, in the same order as the faces.
 *
 * Held UPPERCASE as literals so no locale-dependent casing ever runs over
 * them. Turkish casing is the trap: `toLocaleUpperCase('tr')` turns `i` into
 * `İ`, and a name cased at render time is cased in whatever locale the
 * renderer happened to be handed. Stored this way the question never arises.
 * FISTIK is spelled correctly — the lower-case form is `fıstık`, and the
 * uppercase of a dotless ı is the same glyph as an English capital I.
 *
 * They are proper nouns for colours, the way a paint chart names its colours,
 * so §13.9 requires the English category title printed beside every one of
 * them. `FaceLegend` is where that pairing happens.
 */
export const FLAVOURS = {
  fundamentals: 'GÜL',
  intermediate: 'FISTIK',
  expert: 'LAVANTA',
  ecosystem: 'NANE',
  protocols: 'KAHVE',
  optional: 'KAYMAK',
} as const satisfies Record<CategorySlug, string>

/**
 * An edge belongs to two faces, so it is drawn once and takes the higher of
 * their two states (`edgeStateOf`). Drawing each face as its own closed
 * rhombus instead would paint one hidden face's dashes over a shared solid
 * outline edge, and §8.2 is explicit that solid stays solid.
 */
export type EdgeKind = 'outline' | 'visible-y' | 'hidden-y'

export interface Edge {
  id: string
  path: string
  kind: EdgeKind
  faces: readonly [FaceId, FaceId]
}

function defineEdge(a: PointName, b: PointName, kind: EdgeKind, faces: readonly [FaceId, FaceId]): Edge {
  return { id: `${a}-${b}`, path: polyline([a, b], false), kind, faces }
}

/**
 * The twelve edges of the cube: six on the hexagon, three on the visible Y,
 * three on the hidden Y. Every hexagon edge divides a visible face from a
 * hidden one, so it stays solid; only the hidden Y — where both faces are
 * behind the cube — is dashed.
 */
export const EDGES: readonly Edge[] = [
  defineEdge('T', 'R', 'outline', ['F1', 'F5']),
  defineEdge('R', 'Rp', 'outline', ['F3', 'F5']),
  defineEdge('Rp', 'Bp', 'outline', ['F3', 'F6']),
  defineEdge('Bp', 'Lp', 'outline', ['F2', 'F6']),
  defineEdge('Lp', 'L', 'outline', ['F2', 'F4']),
  defineEdge('L', 'T', 'outline', ['F1', 'F4']),

  defineEdge('C', 'L', 'visible-y', ['F1', 'F2']),
  defineEdge('C', 'R', 'visible-y', ['F1', 'F3']),
  defineEdge('C', 'Bp', 'visible-y', ['F2', 'F3']),

  defineEdge('C', 'T', 'hidden-y', ['F4', 'F5']),
  defineEdge('C', 'Lp', 'hidden-y', ['F4', 'F6']),
  defineEdge('C', 'Rp', 'hidden-y', ['F5', 'F6']),
]

/**
 * ISO 128 hidden line, at the pitch §8.1 fixes for this mark.
 *
 * In user units, so it scales with the drawing across §13.2's four sizes
 * rather than being a second constant per size. That is deliberate and it is
 * what ISO 128 asks for: a hidden line's dash length is a multiple of its line
 * width, the line width here is also in user units, and both are enlarged
 * together when the mark is. Pinning the pitch to device pixels instead would
 * put thirty-one dashes on an 11-unit edge at 160px, which reads as a fine
 * dotted line and no longer says "hidden geometry".
 */
export const HIDDEN_DASH = '2 2'

/**
 * §8.1 — seven dots on the top face only. A drafting stipple, not a cute
 * detail: decorative, `aria-hidden`, and never the carrier of anything (T5).
 */
export const SUGAR: ReadonlyArray<Point> = [
  [13.2, 9.1], [18.4, 8.4], [15.1, 11.6], [20.1, 11.2],
  [11.9, 11.9], [17.2, 13.4], [14.0, 13.0],
]

/** In user units, and so scaled from `size` by the viewBox — see HIDDEN_DASH. */
export const SUGAR_R = 0.45

/** §8.2 — three states, and only three. */
export type FaceState = 'dormant' | 'started' | 'complete'

export interface CategoryProgress {
  /** Sheets in this category the reader has had approved. */
  approved: number
  /**
   * Sheets that exist in this category. Derived from the corpus at build time
   * and never hand-maintained (§11.25) — four of six categories contain no
   * drawn sheets today, and the mark has to be able to say so.
   */
  total: number
}

/**
 * Approved counts per category. `0` is the whole zero state, spelled the way a
 * reader with no approved sheets actually stands — which is every reader until
 * the progress store lands. Never a percentage (§11.35): these are counts.
 */
export type Lkm01Progress = 0 | Readonly<Partial<Record<CategorySlug, CategoryProgress>>>

export function faceStateFor(entry: CategoryProgress | undefined): FaceState {
  if (!entry || entry.total <= 0 || entry.approved <= 0) return 'dormant'
  return entry.approved >= entry.total ? 'complete' : 'started'
}

export type FaceStates = Readonly<Record<FaceId, FaceState>>

export function faceStatesFor(progress: Lkm01Progress): FaceStates {
  const counts: Readonly<Partial<Record<CategorySlug, CategoryProgress>>> =
    progress === 0 ? {} : progress
  return Object.fromEntries(
    FACES.map((face) => [face.id, faceStateFor(counts[face.category])]),
  ) as Record<FaceId, FaceState>
}

const RANK: Record<FaceState, number> = { dormant: 0, started: 1, complete: 2 }

/** Ascending, so the more energized edge is drawn last and owns the vertex. */
export function byState(a: FaceState, b: FaceState): number {
  return RANK[a] - RANK[b]
}

export function edgeStateOf(states: FaceStates, edge: Edge): FaceState {
  const [a, b] = edge.faces.map((id) => states[id])
  return RANK[a] >= RANK[b] ? a : b
}

/** §8.3 — the header mark's accessible name, updated from state. */
export function progressLabel(states: FaceStates): string {
  const started = FACES.filter((face) => states[face.id] !== 'dormant').length
  return `Progress: ${started} of ${FACES.length} subsystems started`
}

/**
 * Whether a progress value is a *reading* or the absence of one.
 *
 * `0` is not "this reader has approved nothing" — it is "there is nothing that
 * could record an approval", because the progress store does not exist yet.
 * The two are different facts and only one of them is worth announcing, so the
 * mark asks this before it decides whether it has a state to name (§1).
 */
export function isTracked(progress: Lkm01Progress): boolean {
  return progress !== 0
}

/**
 * §8.3, as §13.2 amends it — four sizes, five homes.
 *
 * | 28 | header | 96 | 404, RECORD OF WORK cover |
 * | 128 | dashboard and path heroes | 160 | profile, and all 32 approved |
 *
 * A list rather than a union on the props type. The union would be enforcing
 * the wrong thing: what matters is that the drawing is resolution-independent
 * at any size — the geometry is in viewBox units and only the hatch pitch
 * answers to the size at all — and a test measures the mark at other sizes to
 * prove exactly that.
 */
export const LKM01_SIZES = [28, 96, 128, 160] as const

/** The header size, and the size every weight in the drawing was drawn at. */
export const LKM01_BASE_SIZE = 28

/** §13.2 — at this size and above the mark is accompanied by `FaceLegend`. */
export const LKM01_LEGEND_FROM = 96

export interface HatchSpec {
  /** Distance between hatch lines, in user units. */
  pitch: number
  /** Hatch line width, in user units. */
  stroke: number
}

/** §8.2 — the hatch opens up above 32px so it does not read as a solid fill. */
export function hatchSpec(size: number): HatchSpec {
  return size <= 32 ? { pitch: 3, stroke: 0.5 } : { pitch: 4, stroke: 0.75 }
}

// ---------------------------------------------------------------------------
// §8.4 — the exploded axonometric
// ---------------------------------------------------------------------------

/**
 * §8.4 — the cube taken apart. Two moments get this drawing and only two, and
 * the 404 page is one of them (§8.5).
 *
 * It is drawn on its own larger board so the six displaced faces still fit:
 * the §8.1 geometry spans 6.47–25.53 across and 5–27 down, which lands inside
 * `0 0 56 56` with room for a ±7 displacement once it is set at (12, 12).
 */
export const EXPLODED_VIEW_BOX = '0 0 56 56'

/** §8.4 — where the untouched `0 0 32 32` geometry sits on that board. */
export const EXPLODED_ORIGIN: Point = [12, 12]

/**
 * §8.4 — each face's displacement along its own normal. Every one is 7 units
 * long: the two along the vertical axis take it whole, the four along the
 * isometric diagonals split it 7·cos30° across by 7·sin30° down, which is the
 * same 30° projection the cube itself is drawn in.
 */
export const EXPLODED_OFFSETS: Readonly<Record<FaceId, Point>> = {
  F1: [0, -7],
  F2: [-6.06, 3.5],
  F3: [6.06, 3.5],
  F4: [-6.06, -3.5],
  F5: [6.06, -3.5],
  F6: [0, 7],
}

/**
 * A face's centroid at rest, before `EXPLODED_ORIGIN` is applied — where its
 * leader line starts (§8.4). Derived from the face rather than transcribed
 * from the spec's table: a rhombus's centroid is the mean of its four
 * vertices, so the table is a rounding of this and not a separate fact.
 */
export function centroidOf(face: Face): Point {
  const points = face.points.map(at)
  const mean = (axis: 0 | 1) =>
    points.reduce((total, point) => total + point[axis], 0) / points.length
  return [mean(0), mean(1)]
}

/** One face of the exploded view: where it is drawn, and the line back to it. */
export interface Explosion {
  face: Face
  /** Its `<g transform="translate(…)">`, in board units. */
  offset: Point
  /** §8.4's leader line, centroid at rest to displaced centroid. */
  leader: string
}

/** §8.4 — the six faces, displaced, each with the line back to where it sat. */
export const EXPLODED: readonly Explosion[] = FACES.map((face) => {
  const offset = EXPLODED_OFFSETS[face.id]
  const [cx, cy] = centroidOf(face)
  return {
    face,
    offset,
    leader: `M${round(cx)} ${round(cy)} L${round(cx + offset[0])} ${round(cy + offset[1])}`,
  }
})

/** Enough precision for a 56-unit board; without it a mean prints float noise. */
function round(value: number): number {
  return Number(value.toFixed(3))
}
