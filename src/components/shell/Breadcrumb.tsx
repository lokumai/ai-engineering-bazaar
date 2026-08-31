'use client'

import Link from 'next/link'
import { usePathname, useSelectedLayoutSegment } from 'next/navigation'
import { breadcrumbFor } from '@/lib/route-labels'

/**
 * The header trail (spec §5.1): `INDEX / INTERMEDIATE / AI SECURITY`, mono,
 * muted, with the current segment in full ink. It is also the page's primary
 * navigation landmark (§10.2).
 *
 * The trail is derived from the route, which is a fact this component holds.
 * A module's sheet number is not — that lives in the content — so it is
 * absent here rather than guessed at.
 *
 * The route is the pathname on every page but one. `404.html` is prerendered
 * at `/_not-found` and served at every address that is not a sheet, so there
 * the pathname is whatever was asked for and names nothing; the layout segment
 * is what both the export and the browser agree on. See `NOT_FOUND_SEGMENT`.
 *
 * Below 768px only the current segment shows: the landmark stays, the 56px
 * header does not overflow (§11.10).
 */
export function Breadcrumb() {
  const crumbs = breadcrumbFor(usePathname() ?? '/', useSelectedLayoutSegment())

  return (
    <nav aria-label="Drawing set" className="min-w-0">
      {/* display:flex drops the implicit list role in some engines; keep it. */}
      <ol role="list" className="flex items-center font-mono text-meta uppercase tracking-[0.06em]">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1
          return (
            <li
              key={crumb.href ?? crumb.label}
              className={`flex min-w-0 items-center ${last ? '' : 'hidden md:flex'}`}
            >
              {i > 0 && (
                <span aria-hidden="true" className="px-2 text-ink-faint">
                  /
                </span>
              )}
              {crumb.href === null ? (
                <span aria-current="page" className="truncate text-ink">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="truncate text-ink-muted hover:text-ink">
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
