import type { CatalogViewId } from '@/lib/catalog/views'

/**
 * M12 — one 14px glyph per catalog view.
 *
 * The author asked for it by name: *"each in the toggle having their own visual
 * aid such as icon."* It is a `<svg aria-hidden>` beside the view's word rather
 * than instead of it — an icon-only toggle is three unlabelled squares, and
 * `kia-context/specs/DESIGN.md` requires a level, a state and a view to be told
 * apart by something that is not a shape or a hue alone.
 *
 * Each glyph draws the shape of the view it opens, at the same 14px box and the
 * same 1.5 stroke as the chevron in `MainNav`: three stacked bands for the
 * levels of the overview, four boxes for the cards, a ruled header and three
 * rows for the table. `currentColor`, so the button's own ink carries it and a
 * forced-colours theme keeps it.
 */
export function ViewIcon({ id }: { id: CatalogViewId }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden="true"
      className="bz-view-icon"
    >
      {id === 'overview' && (
        <>
          <rect x="1.5" y="1.5" width="11" height="3" />
          <rect x="1.5" y="6.5" width="11" height="3" />
          <path d="M1.5 12.5h7" />
        </>
      )}
      {id === 'cards' && (
        <>
          <rect x="1.5" y="1.5" width="4.5" height="4.5" />
          <rect x="8" y="1.5" width="4.5" height="4.5" />
          <rect x="1.5" y="8" width="4.5" height="4.5" />
          <rect x="8" y="8" width="4.5" height="4.5" />
        </>
      )}
      {id === 'table' && (
        <>
          <path d="M1.5 3.5h11" />
          <path d="M1.5 7h11" />
          <path d="M1.5 10.5h11" />
          <path d="M5 3.5v7" />
        </>
      )}
    </svg>
  )
}
