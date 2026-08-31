import {
  EDGES,
  FACES,
  HIDDEN_DASH,
  SUGAR,
  SUGAR_R,
  VIEW_BOX,
  byState,
  edgeStateOf,
  faceStatesFor,
  hatchSpec,
  isTracked,
  progressLabel,
  type FaceState,
  type HatchSpec,
  type Lkm01Progress,
} from './geometry'

/**
 * LKM-01 — the mascot (spec §8), hand-authored inline SVG.
 *
 * Six faces, six categories, one meter. The mark is not a logo standing beside
 * a progress indicator; it *is* the progress indicator, so a category that has
 * not been worked is drawn but unenergized, and a finished one is inked in the
 * annotation pen and section-hatched. Because an isometric cube shows three
 * faces at once, the other three are drawn as hidden geometry — correct ISO 128
 * practice, and the reason all six read simultaneously.
 *
 * Every stroke and fill is a `var(--…)` token, never a hex value: a theme
 * switch is a custom-property swap and costs 0ms (§9.2). It animates never, at
 * any size, in any variant (§9.1), and it has no voice (§8.5).
 *
 * Where §8.1 and §8.2 meet, §8.2 governs. §8.1 fixes the geometry, the line
 * types and the reference rendering; §8.2 is explicit that a face's weight and
 * colour answer to its state while its solid/dashed treatment never changes.
 * So the ink named in §8.1 is what the cube looks like once a subsystem is
 * under way, and an untouched cube is the same drawing at hairline weight —
 * the "unenergized" cube §8.3 asks for on the empty state.
 *
 * **The name it takes depends on whether it has a state to report.** Given a
 * real reading it is `role="img"` named in §8.3's form, so nothing is lost to a
 * reader who cannot see it (§10.4). Given `0` there is no progress store to
 * read, every face is dormant for that reason alone, and the mark conveys
 * nothing a reader could act on — so it paints and carries `aria-hidden`,
 * rather than telling assistive technology about an empty progress record the
 * site cannot keep. That is the same resolution §7.2 reaches for the inert task
 * lists: an element that cannot yet back its state still draws, it just stops
 * announcing itself. §1 forbids the alternative, and the header already applies
 * it by withholding the search trigger and the language toggle.
 */

/** §8.2 — the three face states, and the two things that answer to them. */
const EDGE_INK: Record<FaceState, { stroke: string; width: string }> = {
  dormant: { stroke: 'var(--color-line)', width: 'var(--stroke-hair)' },
  started: { stroke: 'var(--color-ink)', width: 'var(--stroke-struct)' },
  complete: { stroke: 'var(--color-accent)', width: 'var(--stroke-struct)' },
}

export interface Lkm01Props {
  /**
   * Approved sheets per category, or `0` for a reader with none. The mark
   * claims nothing this value does not say (§1): four of six categories
   * contain no drawn sheets today and read as dormant for that reason alone.
   */
  progress: Lkm01Progress
  /** Rendered size in px. §8.3: 28 in the header, 96 on the dashboard. */
  size?: number
  /** Scopes the hatch pattern ids when a page carries more than one mark. */
  idPrefix?: string
  className?: string
}

export function Lkm01({ progress, size = 28, idPrefix = 'lkm01', className }: Lkm01Props) {
  const states = faceStatesFor(progress)
  const hatch = hatchSpec(size)
  const tracked = isTracked(progress)

  const approved = FACES.filter((face) => states[face.id] === 'complete')
  const hatchVisible = approved.some((face) => face.visible)
  const hatchHidden = approved.some((face) => !face.visible)
  const hatchId = (visible: boolean) => `${idPrefix}-hatch-${visible ? 'visible' : 'hidden'}`

  // Ascending by state, so where a dormant edge meets an energized one the
  // energized stroke is laid last and owns the vertex.
  const edges = EDGES.map((edge) => ({ edge, state: edgeStateOf(states, edge) }))
    .sort((a, b) => byState(a.state, b.state))

  return (
    <svg
      width={size}
      height={size}
      viewBox={VIEW_BOX}
      {...(tracked
        ? { role: 'img' as const, 'aria-label': progressLabel(states) }
        : { 'aria-hidden': true })}
      className={className}
    >
      {(hatchVisible || hatchHidden) && (
        <defs>
          {/*
            §8.2 — 45° hairline section hatching, opposed between visible and
            hidden faces. That is real drafting practice for adjacent sectioned
            parts, it keeps the overlapping projection regions legible, and it
            is why a fully approved set crosshatches where the faces overlap.
          */}
          {hatchVisible && <Hatch id={hatchId(true)} angle={45} spec={hatch} />}
          {hatchHidden && <Hatch id={hatchId(false)} angle={-45} spec={hatch} />}
        </defs>
      )}

      {approved.map((face) => (
        <path
          key={face.id}
          data-face={face.id}
          d={face.path}
          fill={`url(#${hatchId(face.visible)})`}
          fillOpacity={0.88}
        />
      ))}

      {edges.map(({ edge, state }) => (
        <path
          key={edge.id}
          data-edge={edge.id}
          data-state={state}
          d={edge.path}
          fill="none"
          stroke={EDGE_INK[state].stroke}
          strokeWidth={EDGE_INK[state].width}
          strokeDasharray={edge.kind === 'hidden-y' ? HIDDEN_DASH : undefined}
        />
      ))}

      {/* §8.1 — powdered sugar: a drafting stipple on the top face, decorative
          and nothing more, so it is hidden from assistive technology (T5). */}
      <g aria-hidden="true">
        {SUGAR.map(([cx, cy]) => (
          <circle key={`${cx},${cy}`} cx={cx} cy={cy} r={SUGAR_R} fill="var(--color-ink-faint)" />
        ))}
      </g>
    </svg>
  )
}

function Hatch({ id, angle, spec }: { id: string; angle: number; spec: HatchSpec }) {
  return (
    <pattern
      id={id}
      patternUnits="userSpaceOnUse"
      width={spec.pitch}
      height={spec.pitch}
      patternTransform={`rotate(${angle})`}
    >
      {/* Half a pitch in, so the tile never clips half the line off. */}
      <line
        x1={spec.pitch / 2}
        y1={0}
        x2={spec.pitch / 2}
        y2={spec.pitch}
        stroke="var(--color-accent)"
        strokeWidth={spec.stroke}
      />
    </pattern>
  )
}
