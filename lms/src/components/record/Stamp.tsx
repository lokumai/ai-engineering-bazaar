import type { Stamp as StampRecord } from '@/lib/record/derive'

/**
 * §5.9 / §12.5.4 — the approval stamp.
 *
 * **Server-safe and hook-free.** Everything it draws is a pure function of the
 * `Stamp` it is handed, so it renders identically either side of §12.2's
 * boundary: the title block's 2×2 grid renders it on the server, the dashboard
 * shelf renders it inside a client island, and the exported record document
 * renders it again from the same shape. One component, three surfaces, no
 * divergence.
 *
 * **The wording is the whole design, not the rectangle.** §12.5.4 keeps §7.4's
 * thirteen stamps and §5.9's treatment on one condition: every locked stamp
 * always states its exact threshold and its current count. That single rule is
 * what converts a badge from controlling to informational — informationally
 * administered feedback measures d = +0.66 against d = −0.44 for controllingly
 * administered — and it is why there is never a padlock, a silhouette or a
 * mystery here.
 *
 * There is a real tension underneath it, managed rather than hidden: publishing
 * a threshold makes the stamp EXPECTED, and expected rewards undermine
 * (d = −0.36) where unexpected ones do not (d = 0.01). §12.5.4 resolves it in
 * the wording rather than the mechanics, so every string below reads as a
 * completed inspection record — `APPROVED 2026-08-14`, `18 OF 25` — and never
 * as a prize, a congratulation, or a reason to go and do something. Thirteen
 * stamps are thirteen trophies unless the language says otherwise.
 *
 * A met stamp with no date on record prints that, rather than inventing one:
 * the SOURCES stamp records no per-URL instant (§11.25, and `derive.ts` says so
 * where `earned` is declared a date and not a boolean).
 *
 * Line type and text carry the state before colour does (§12.10.4): the empty
 * slot is a `2 2` dashed rectangle and the earned one is solid and rotated, so
 * the distinction survives `forced-colors` and a black-and-white printer.
 */
export function Stamp({
  stamp,
  size,
}: {
  stamp: StampRecord
  /** §5.9's two sizes: `114 × 34` in a title block, `168 × 44` on the shelf. */
  size: 'slot' | 'set'
}) {
  // §12.5.4 — `earned` carries the instant, so the test for "met" is the count
  // against the threshold. A stamp can be met with no date behind it.
  const met = stamp.threshold > 0 && stamp.current >= stamp.threshold

  return (
    <div
      className={`hl-stamp ${size === 'set' ? 'hl-stamp-set' : 'hl-stamp-slot'}`}
      data-earned={met ? 'true' : 'false'}
      data-attainable={stamp.attainable ? 'true' : 'false'}
    >
      <span className="hl-stamp-name">{stamp.label}</span>
      {met ? (
        <span className="hl-stamp-cond">
          {stamp.earned === null
            ? 'APPROVED · DATE NOT ON RECORD'
            : `APPROVED ${stamp.earned.slice(0, 10)}`}
        </span>
      ) : (
        <>
          {/* The rule, in five characters: threshold and live count, always. */}
          <span className="hl-stamp-cond">
            {stamp.current} OF {stamp.threshold}
          </span>
          {/* §5.9 — unattainable because the curriculum is unwritten, not
              because the reader is behind. Honest, and never hidden. */}
          {!stamp.attainable && stamp.reason !== null && (
            <span className="hl-stamp-cond">LOCKED · {stamp.reason}</span>
          )}
        </>
      )}
    </div>
  )
}
