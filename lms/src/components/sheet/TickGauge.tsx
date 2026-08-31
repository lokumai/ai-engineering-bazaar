/**
 * §7.5 — the discrete tick gauge. N hairline vertical ticks where N is the
 * sheet count, and nothing else: no percentage, no rounded bar, no ring, no
 * donut (§11.35). Five of eight ticks tells you something; a 63%-full pill
 * does not.
 *
 * Today every tick is either `drawn` or `not-drawn`, because those are facts
 * about the drawing set. `approved` is a fact about a reader and there is no
 * reader state in this slice, so nothing on this site emits it yet — the state
 * exists here because §7.5 gives the gauge three states and the accent is what
 * the third one means (T1), not because anything currently claims it.
 */

export type TickState = 'approved' | 'drawn' | 'not-drawn'

/** §7.5 — `4px` wide × `12px` tall, `3px` gap. */
const TICK = 4
const GAP = 3
const HEIGHT = 12
const PITCH = TICK + GAP

/** The one mapping the listing pages need, kept where the states live. */
export function ticksFrom(rows: readonly { drawn: boolean }[]): TickState[] {
  return rows.map((row) => (row.drawn ? 'drawn' : 'not-drawn'))
}

export function TickGauge({
  ticks,
  label,
  className,
}: {
  ticks: readonly TickState[]
  /**
   * What the gauge reads, in words. Given, the gauge is an image with that
   * label; omitted, it is decoration — which is only honest where the page
   * states the same count in text beside it (§10.4).
   */
  label?: string
  className?: string
}) {
  if (ticks.length === 0) return null

  const width = ticks.length * PITCH - GAP

  return (
    <svg
      className={className}
      width={width}
      height={HEIGHT}
      viewBox={`0 0 ${width} ${HEIGHT}`}
      shapeRendering="crispEdges"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {ticks.map((tick, i) =>
        tick === 'not-drawn' ? (
          // A hidden line: this sheet exists in the model and is not drawn.
          // 1px, dashed 3 2 — a hairline, never an empty box.
          <line
            key={i}
            x1={i * PITCH + TICK / 2}
            y1={0}
            x2={i * PITCH + TICK / 2}
            y2={HEIGHT}
            stroke="var(--color-line-strong)"
            strokeWidth="1"
            strokeDasharray="3 2"
          />
        ) : (
          <rect
            key={i}
            x={i * PITCH}
            y={0}
            width={TICK}
            height={HEIGHT}
            fill={
              tick === 'approved'
                ? 'var(--color-accent)'
                : 'var(--color-line-strong)'
            }
          />
        ),
      )}
    </svg>
  )
}
