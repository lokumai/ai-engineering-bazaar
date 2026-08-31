import {
  FACES,
  HIDDEN_DASH,
  SUGAR,
  SUGAR_R,
  VIEW_BOX,
  hatchSpec,
  type Face,
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
 * **The markup is state-INDEPENDENT, and that is required rather than merely
 * nicer (§12.2).** A static export prerenders this header once, for every
 * reader, so reader state can only arrive on one of two channels. This mark is
 * channel A: the pre-paint boot script (`lib/record/boot.ts`) stamps
 * `hl-cat-<slug>-started` / `-complete` on `<html>`, and the twelve rules in
 * `record.css` draw the faces from it. Zero React, zero hydration, correct in
 * frame one.
 *
 * What that buys, precisely. The earlier version re-sorted `EDGES` by state and
 * emitted `<defs>` only when some face was complete, so its child list depended
 * on state; React 19 answers a *structural* hydration mismatch by discarding
 * and re-rendering the subtree, which is a logged recoverable error and a
 * visible repaint of the header on every single load. So both hatch patterns
 * are always in `<defs>`, the faces are always all six, and their order is
 * fixed.
 *
 * **The order is by visibility, not by state, and it carries §8.2's one
 * invariant.** An edge belongs to two faces; the three hidden faces are painted
 * first and the three visible ones over them, so every hexagon edge — each of
 * which divides a visible face from a hidden one — ends up drawn by its visible
 * face and stays solid, while the hidden Y, whose two faces are both behind the
 * cube, keeps its `2 2` dashes. That is §8.1's line types in every state, which
 * is what §8.2 fixes. What it gives up is the old arbitration where a shared
 * edge took the *higher* of its two faces' states: with state in CSS there is
 * no expression that can compare two faces, and the hatch fill — not a 1px
 * shared edge at 28px — is what actually reports a completed subsystem.
 *
 * **It is `aria-hidden` in every state (§12.2, §12.18).** An accessible name
 * that flips between the prerender and the hydrated render is itself a
 * mismatch, and §10.4 forbids an island being the sole carrier of anything: the
 * readout (§7.1) prints the same facts as real text, so nothing is lost.
 *
 * Every stroke and fill is a `var(--…)` token or comes from `record.css`, never
 * a hex value: a theme switch is a custom-property swap and costs 0ms (§9.2).
 * It animates never, at any size, in any variant (§9.1), and it has no voice
 * (§8.5).
 */

/**
 * §8.2's line types, laid down hidden-first. Fixed at module scope so it is
 * plainly a property of the geometry rather than something a render decides.
 */
const PAINT_ORDER: readonly Face[] = [
  ...FACES.filter((face) => !face.visible),
  ...FACES.filter((face) => face.visible),
]

export interface Lkm01Props {
  /**
   * Retained for the callers §8.3 names — the 96px dashboard empty state and
   * the header mark — and deliberately not drawn from.
   *
   * Face state moved to channel A when §12.2 made this markup
   * state-independent, so nothing here reads this value: the same six faces are
   * emitted for every progress reading, and `record.css` decides what each one
   * looks like from the classes the boot script stamped. A caller that has a
   * reading and wants it drawn has already got it — the stamp is on `<html>`
   * before this component renders.
   */
  progress?: Lkm01Progress
  /** Rendered size in px. §8.3: 28 in the header, 96 on the dashboard. */
  size?: number
  /** Scopes the hatch pattern ids when a page carries more than one mark. */
  idPrefix?: string
  className?: string
}

export function Lkm01({ size = 28, idPrefix = 'lkm01', className }: Lkm01Props) {
  const hatch = hatchSpec(size)
  /**
   * The size is in the id as well as the prefix. §8.2 opens the hatch pitch
   * above 32px, so a page holding the 28px header mark and a 96px mark would
   * otherwise have two `<pattern id="lkm01-hatch-visible">` in one document and
   * every reference would resolve to whichever came first.
   */
  const hatchId = (visible: boolean) =>
    `${idPrefix}-${size}-hatch-${visible ? 'visible' : 'hidden'}`

  return (
    <svg
      width={size}
      height={size}
      viewBox={VIEW_BOX}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {/*
        §8.2 — 45° hairline section hatching, opposed between visible and
        hidden faces. That is real drafting practice for adjacent sectioned
        parts, it keeps the overlapping projection regions legible, and it is
        why a fully approved set crosshatches where the faces overlap. Both
        patterns are emitted whatever the reader has signed off: an unused
        `<pattern>` paints nothing, and a conditional one paints a hydration
        mismatch (§12.2).
      */}
      <defs>
        <Hatch id={hatchId(true)} angle={45} spec={hatch} />
        <Hatch id={hatchId(false)} angle={-45} spec={hatch} />
      </defs>

      {/* The fills, under the outlines. `.hl-face-hatch` is `display: none`
          until the subsystem's every sheet is signed off. */}
      {PAINT_ORDER.map((face) => (
        <path
          key={`hatch-${face.id}`}
          className="hl-face-hatch"
          data-cat={face.category}
          data-hatch={face.id}
          d={face.path}
          fill={`url(#${hatchId(face.visible)})`}
          fillOpacity={0.88}
        />
      ))}

      {/* The outlines. No `stroke` and no `stroke-width` here on purpose: those
          are the state, and the state is channel A's (§12.2). `fill="none"` is
          not — an SVG path fills black by default, and the mark must not be six
          black rhombi in the frame before a stylesheet arrives. */}
      {PAINT_ORDER.map((face) => (
        <path
          key={face.id}
          className="hl-face"
          data-cat={face.category}
          data-face={face.id}
          d={face.path}
          fill="none"
          strokeDasharray={face.visible ? undefined : HIDDEN_DASH}
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
