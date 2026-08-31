'use client'

import { usePathname } from 'next/navigation'
import { markTokens, sheetLabelFor } from '@/lib/route-labels'

/**
 * The left cell of footer row 1 (spec §5.2): `SHEET 13 OF 32` on a module
 * sheet, the page's own name everywhere else. Words take `--color-ink-muted`,
 * machine-derived values take `--color-ink`.
 *
 * `sheet` is the override a module page passes once it knows its number; with
 * nothing passed, the label is derived from the route, and a route that cannot
 * name itself renders nothing rather than a number nobody counted.
 *
 * The not-found route is the reason `sheet` is not optional *there*: its URL
 * is whatever was asked for, so it has to be told its own name. See
 * `NOT_FOUND_SEGMENT`.
 */
export function SheetLabel({ sheet }: { sheet?: string | null }) {
  const pathname = usePathname() ?? '/'
  const label = sheet ?? sheetLabelFor(pathname)
  if (!label) return null

  return (
    // §3.4 — a machine-derived value never wraps: at 390px `SHEET 13 OF 32`
    // broken after the number reads as two facts instead of one.
    <span className="hl-mark whitespace-nowrap text-ink-muted">
      {markTokens(label).map((token, i) => (
        <span key={i} className={token.value ? 'text-ink' : undefined}>
          {token.text}
        </span>
      ))}
    </span>
  )
}
