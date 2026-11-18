import type { ReactNode, SVGProps } from 'react'

/**
 * The frame every small stroked glyph on the site shares: a square box, no fill, the
 * current text colour as the stroke, and hidden from assistive technology because a
 * glyph here always sits beside the word that names it.
 *
 * The four chevrons (the pager's, the rail fold's, the search field's and the
 * navigation's) had each written this frame out, differing only in size, viewBox and
 * stroke width. Those three are the arguments; the shapes stay with their callers,
 * because a pager arrow, a fold with its bar and a disclosure caret are different
 * drawings and not one drawing turned.
 */
export function StrokeIcon({
  size,
  viewBox,
  strokeWidth,
  children,
  ...rest
}: {
  size: number
  viewBox: string
  strokeWidth: number
  children: ReactNode
} & Omit<SVGProps<SVGSVGElement>, 'width' | 'height' | 'viewBox' | 'strokeWidth' | 'children'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}
