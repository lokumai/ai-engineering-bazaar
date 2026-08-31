import {
  EXPLODED,
  EXPLODED_ORIGIN,
  EXPLODED_VIEW_BOX,
  HIDDEN_DASH,
  SUGAR,
  SUGAR_R,
} from './geometry'

/**
 * LKM-01, exploded (spec §8.4) — the assembly drawn disassembled.
 *
 * §8.4 grants this drawing exactly two moments: the 404 page and the state
 * where all thirty-two sheets are approved. Both are still images; like every
 * other appearance of the mark it never animates and never speaks (§8.5, §9).
 *
 * It is a drawing of the assembly, not a readout of anybody's progress, so it
 * is inked at §8.1's reference weights rather than run through §8.2's face
 * states — there is no reader state on a 404. What §8.2 does govern here is
 * the line *type*, which it fixes "in every state": the three visible faces
 * keep solid edges and the three hidden ones keep their `2 2` dashes, which is
 * how a reader can still tell the cube's front from its back once the faces no
 * longer touch.
 *
 * The caption is the accessible content — it is real text beside the drawing,
 * in the words §8.4 fixes — so the SVG itself is decorative and hidden (T5).
 * §13.2 keeps it that way at every size: an accessible name that flips between
 * the prerender and the hydrated render is itself a mismatch (§12.2, §12.18).
 *
 * **What §13.2 changed here, and what it did not.** §13.2 granted the mark
 * colour, and this variant is the one place it cannot use it: the exploded
 * drawing reports nobody's progress, so there is no category state for a hue to
 * state and a hue with nothing behind it would be a page claiming something
 * (§1). It stays ink on paper, and everything §8.5 forbids stays forbidden — no
 * face, no eyes, no mouth, no limbs, no gradient, no voice, and no animation or
 * transition at any size (§9.1). The two sanctioned moments now sit at two
 * different sizes (§8.3 as amended): 96 on the 404 and the RECORD OF WORK
 * cover, 160 in the all-32-approved state.
 */

/**
 * §8.3 — the exploded variant's default. 96 is the 404 and the RECORD OF WORK
 * cover; the all-32-approved state passes 160 (§13.2's four sizes).
 */
const EXPLODED_SIZE = 96

export interface Lkm01ExplodedProps {
  /** §8.4 fixes the wording; the two sanctioned uses each have their own. */
  caption: string
  /** §8.3, as §13.2 amends it: 96 on the 404 and the report cover, 160 when
      the whole set is approved. Every weight and the stipple are in viewBox
      units, so the drawing enlarges rather than being re-tuned per size. */
  size?: number
  className?: string
}

export function Lkm01Exploded({
  caption,
  size = EXPLODED_SIZE,
  className,
}: Lkm01ExplodedProps) {
  return (
    <div className={className}>
      <svg
        width={size}
        height={size}
        viewBox={EXPLODED_VIEW_BOX}
        aria-hidden="true"
        focusable="false"
      >
        <g transform={`translate(${EXPLODED_ORIGIN[0]},${EXPLODED_ORIGIN[1]})`}>
          {/* §8.4 — the leader lines, drawn under the faces so a face edge is
              never broken by the line pointing at it. */}
          <g
            fill="none"
            stroke="var(--color-line-strong)"
            strokeWidth="var(--stroke-hair)"
            strokeDasharray={HIDDEN_DASH}
          >
            {EXPLODED.map(({ face, leader }) => (
              <path key={face.id} data-leader={face.id} d={leader} />
            ))}
          </g>

          {EXPLODED.map(({ face, offset }) => (
            <g key={face.id} transform={`translate(${offset[0]},${offset[1]})`}>
              <path
                data-face={face.id}
                d={face.path}
                fill="none"
                stroke={face.visible ? 'var(--color-ink)' : 'var(--color-line-strong)'}
                strokeWidth={face.visible ? 'var(--stroke-struct)' : 'var(--stroke-hair)'}
                strokeDasharray={face.visible ? undefined : HIDDEN_DASH}
              />

              {/* §8.1 — the powdered sugar belongs to the top face, so it
                  travels with it rather than staying behind on the board.

                  It is NOT given §13.2's `.hl-sugar`, and that is the one
                  deliberate departure in this file: that class paints the
                  stipple `--color-paper`, which is correct over a face filled
                  with its flavour and invisible over an unfilled one, and no
                  face in this variant is ever filled. Sugar on the board reads
                  as sugar only if it is drawn in ink here. */}
              {face.id === 'F1' && SUGAR.map(([cx, cy]) => (
                <circle key={`${cx},${cy}`} cx={cx} cy={cy} r={SUGAR_R} fill="var(--color-ink-faint)" />
              ))}
            </g>
          ))}
        </g>
      </svg>

      {/* §8.4 — `text-mark` mono in `--color-ink-muted`, and left to wrap: it
          is a sentence about the drawing, not a machine-derived value (§3.4). */}
      <p className="hl-mark mt-3 max-w-[var(--width-prose)] text-ink-muted">{caption}</p>
    </div>
  )
}
