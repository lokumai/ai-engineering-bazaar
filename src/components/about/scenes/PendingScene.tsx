/**
 * The place of a stall whose scene is not drawn yet (M90, D115): a `##` section added to STORY.md
 * after the five the art covers. Stall 1 stood here until the author picked 1B6 (`TreatyScene`).
 * It says plainly that a drawing is coming, in the stall's own glaze, and like every scene on the
 * page it has no box: a pool of light on the ground and one quiet line.
 */
export function PendingScene() {
  return (
    <div className="scene scene-pending" data-scene="pending" role="img" aria-label="The drawing for this stall is still being made.">
      <span className="pending-pool" aria-hidden="true" />
      <span className="pending-mark" aria-hidden="true" />
      <span className="pending-note" aria-hidden="true">
        Drawing in progress
      </span>
    </div>
  )
}
