import { MARK_VIEW_BOX, type MarkId, markPaths } from '@/lib/identity/mark'

/**
 * §12.3.5 — the drafter's stamp. Not an avatar: a monochrome hairline approval
 * mark, 24 × 24, zero radius, `currentColor`, stroke-only.
 *
 * **Server-safe, and deliberately hook-free.** The geometry is a pure function
 * of two values the caller already holds, so this renders identically on the
 * server and in the browser and there is nothing here to hydrate. That is what
 * lets the profile sheet, the title block and the exported record document all
 * draw the same mark from one component, on either side of §12.2's boundary.
 *
 * **`aria-hidden` is unconditional.** §12.3.5 hides the mark wherever adjacent
 * real text names the reader, which is every call site in this slice — the
 * stamp never stands alone next to nothing. Making it conditional would put an
 * accessible name on a channel-B value and let it flip between the prerender
 * and the hydrated render, which is the mistake §12.2 corrected on the mascot.
 * Nothing is lost: a pattern minted from four random bytes has no meaning a
 * screen reader could convey, and the record's own text carries the identity.
 *
 * Empty geometry renders **nothing at all** (§11.25). `markPaths` returns an
 * empty array before the seed is minted, for a seed this code did not write,
 * and for an id it does not know; a substitute glyph there would assert an
 * identity that does not exist — §12.3.4 refuses `?` and the silhouette for
 * exactly that reason.
 */
export function DrafterStamp({
  mark,
  seed,
  size = 24,
}: {
  /** The reader's override. `null` means "use the minted seed" (§12.1.3). */
  mark: MarkId | null
  /** 8 lowercase hex, minted once at the first sign-off. */
  seed: string | null
  /** record.css fixes the class at 24px; a caller wanting another size says so. */
  size?: number
}) {
  const paths = markPaths(mark ?? 'seeded', seed)
  if (paths.length === 0) return null

  return (
    // The dimensions are inline on both boxes because `.hl-mark-stamp` and
    // `.hl-mark-stamp svg` both hard-code 24px, and a stylesheet beats an
    // attribute. At the default they restate what the class already says.
    <span className="hl-mark-stamp" style={{ width: size, height: size }}>
      <svg
        viewBox={MARK_VIEW_BOX}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        {/* Keyed by position: the array is canonically ordered by the seed
            alone, so an index is stable across renders of the same mark. */}
        {paths.map((d, index) => (
          <path key={index} d={d} />
        ))}
      </svg>
    </span>
  )
}
