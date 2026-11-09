/**
 * Stall 1's place, held until the author picks its scene (M90, D115).
 *
 * He liked 1B, "The treaty", and asked for three three.js alternatives to it, which are being drawn;
 * whichever he picks replaces this one component, at the same position in `AboutStory`'s scene list.
 * Until then this says plainly that a drawing is coming, in the stall's own glaze, and like every
 * scene on the page it has no box: a pool of light on the ground and one quiet line.
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
