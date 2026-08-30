import type { CategorySlug } from '@/lib/content/categories'

/**
 * LKM-01 — the geometry and the state arithmetic (spec §8.1, §8.2).
 *
 * A single 1-unit cube in 30° isometric projection. Its construction rule is
 * the design system's rule: what is built is solid, what is not yet built is
 * dashed. No face, no eyes, no limbs, no gradient, no voice — ever (§8.5).
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
  path: string
  /** An isometric cube shows three faces; the other three are hidden geometry. */
  visible: boolean
}

/** §8.1 — six rhombi, mapped to the six categories in order. */
export const FACES: readonly Face[] = [
  { id: 'F1', name: 'TOP', category: 'fundamentals', visible: true, path: polyline(['T', 'R', 'C', 'L'], true) },
  { id: 'F2', name: 'LEFT', category: 'intermediate', visible: true, path: polyline(['L', 'C', 'Bp', 'Lp'], true) },
  { id: 'F3', name: 'RIGHT', category: 'expert', visible: true, path: polyline(['C', 'R', 'Rp', 'Bp'], true) },
  { id: 'F4', name: 'BACK-LEFT', category: 'ecosystem', visible: false, path: polyline(['T', 'C', 'Lp', 'L'], true) },
  { id: 'F5', name: 'BACK-RIGHT', category: 'protocols', visible: false, path: polyline(['T', 'R', 'Rp', 'C'], true) },
  { id: 'F6', name: 'BOTTOM', category: 'optional', visible: false, path: polyline(['Lp', 'C', 'Rp', 'Bp'], true) },
]

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

/** ISO 128 hidden line, at the pitch §8.1 fixes for this mark. */
export const HIDDEN_DASH = '2 2'

/**
 * §8.1 — seven dots on the top face only. A drafting stipple, not a cute
 * detail: decorative, `aria-hidden`, and never the carrier of anything (T5).
 */
export const SUGAR: ReadonlyArray<Point> = [
  [13.2, 9.1], [18.4, 8.4], [15.1, 11.6], [20.1, 11.2],
  [11.9, 11.9], [17.2, 13.4], [14.0, 13.0],
]

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
