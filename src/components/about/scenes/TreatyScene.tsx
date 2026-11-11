import { ASK_IN_STILL, STALL1, STILL_AT, frame, tallyWords, treatyMarkup } from './treaty'

/**
 * Stall 1, "Down the table, revised" (1B6), as the server draws it: the still picture of
 * `frame(STILL_AT)`, the treaty's last page found, the page that says yes held up beside her, and the
 * coffee raised, with her question still standing above her as a smaller bubble so the still tells
 * the whole joke. The island moves the same nodes (`treaty-motion.ts`).
 *
 * Un-boxed (D115): the drawing is wider than the slot and fades out in an ellipse, its top and bottom
 * melt into stall 1's own ground, and the bubbles and the tally float on it with no card under them
 * but their own small fill.
 */
export function TreatyScene({ display, displayClass }: { display: string; displayClass: string }) {
  const f = frame(STILL_AT)
  const tally = tallyWords(f.tally.page)
  return (
    <div className="scene scene-treaty" data-scene="treaty">
      <div
        className="t-stage"
        role="img"
        aria-label="The Hall of Mirrors in 1919: five diplomats in frock coats at a short green table pass a long treaty down to a woman with auburn braids, a small gold crown and a crimson kaftan, who asked whether the coffee is ready. She falls asleep holding an empty cup; on page 412 she holds the treaty's last page, which says yes, and raises a steaming cup."
      >
        <svg viewBox="0 0 1000 1000" aria-hidden="true" dangerouslySetInnerHTML={{ __html: treatyMarkup(f, display) }} />
        {/* In the still both halves of the joke show: the question as an earlier, smaller bubble. */}
        <div className={`t-bubble t-earlier ${displayClass}`} data-t="ask" aria-hidden="true" style={{ left: `${ASK_IN_STILL.left}%`, top: `${ASK_IN_STILL.top}%`, opacity: 1 }}>
          {STALL1.QUESTION}
        </div>
        <div className="t-tally" data-t="tally" aria-hidden="true" style={{ opacity: f.tally.on ? 1 : 0 }}>
          <span className={`t-title ${displayClass}`}>{STALL1.TITLE}</span>
          {tally.before}
          <b>{tally.page}</b>
          {tally.after}
        </div>
      </div>
    </div>
  )
}
