/**
 * §7.5 — the discrete tick gauge. N hairline vertical ticks where N is the
 * sheet count, and nothing else: no percentage, no rounded bar, no ring, no
 * donut (§11.35). Five of eight ticks tells you something; a 63%-full pill
 * does not.
 *
 * **Hook-free, and it has to stay that way.** This renders inside `SheetIndex`
 * and `CategoryBlock`, and those run in two regimes at once: `Catalog` is
 * `'use client'` and imports `SheetIndex`, so on `/` this component is already
 * in the browser, while the level pages under `/sheets/` render the
 * identical components **server-only**. A hook added here works on `/` and
 * fails the static export of the other two (§12.2, "where hooks may not go").
 *
 * So the third state arrives as data, never as a subscription. `approved` is a
 * fact about a reader, and the callers that know one — the dashboard's band
 * headers, inside `Diagram`'s client island — pass it in. The listing pages,
 * which are prerendered once for everybody, pass `drawn` and `not-drawn`, which
 * are facts about the drawing set and true in every frame.
 *
 * Each tick also carries `data-state`, so the state is in the markup and not
 * only in a fill: it is what a Playwright assertion reads, what a channel-A
 * rule can select on if the sign-off marks ever move to CSS, and the reason the
 * gauge is not a colour-only signal (§12.10.4). The not-drawn tick keeps the
 * ISO 128 `3 2` dash as its primary carrier either way.
 */

export type TickState = 'approved' | 'drawn' | 'not-drawn'

/** §7.5 — `4px` wide × `12px` tall, `3px` gap. */
const TICK = 4
const GAP = 3
const HEIGHT = 12
const PITCH = TICK + GAP

/** The strip's width at a given tick count. Exported so no caller re-derives it. */
export function gaugeWidth(count: number): number {
  return count <= 0 ? 0 : count * PITCH - GAP
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

  const width = gaugeWidth(ticks.length)

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
            data-state={tick}
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
            data-state={tick}
            x={i * PITCH}
            y={0}
            width={TICK}
            height={HEIGHT}
            fill={
              tick === 'approved'
                ? 'var(--color-primary)'
                : 'var(--color-line-strong)'
            }
          />
        ),
      )}
    </svg>
  )
}
