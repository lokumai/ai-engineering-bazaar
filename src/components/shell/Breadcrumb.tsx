'use client'

import Link from 'next/link'
import { usePathname, useSelectedLayoutSegment } from 'next/navigation'
import { breadcrumbFor, type CategoryLabel } from '@/lib/route-labels'

/**
 * The trail: `Curriculum / Fundamentals / RAG & Embeddings`. It is also the
 * page's primary navigation landmark (§10.2).
 *
 * ## M16 moved it, and shortened it
 *
 * It had a second 32px row of its own under the header, in mono uppercase with
 * the current segment in full ink. The mockup puts `nav.crumb` **inside the
 * reading column**, above the display heading, at the muted meta size in the
 * one sans family — so it is `PageShell` that renders it now, and the styling
 * is `bz-crumb`'s rather than four utilities of its own.
 *
 * Its separator is the mockup's too: a bare `/` between links, and no chevron.
 *
 * The trail is derived from the route, which is a fact this component holds.
 * A module's sheet number is not — that lives in the content — so it is absent
 * here rather than guessed at.
 *
 * The level titles are content too, so they arrive as a prop from `PageShell`,
 * which is a server component and may read the corpus (§12.2).
 *
 * The route is the pathname on every page but one. `404.html` is prerendered
 * at `/_not-found` and served at every address that is not a sheet, so there
 * the pathname is whatever was asked for and names nothing; the layout segment
 * is what both the export and the browser agree on. See `NOT_FOUND_SEGMENT`.
 *
 * Below 768px only the current segment shows: the landmark stays and a long
 * trail cannot push the column sideways (§4.7).
 */
export function Breadcrumb({ categories }: { categories: readonly CategoryLabel[] }) {
  const crumbs = breadcrumbFor(usePathname() ?? '/', categories, useSelectedLayoutSegment())

  return (
    <nav aria-label="Curriculum" className="bz-crumb">
      {/* display:flex drops the implicit list role in some engines; keep it. */}
      <ol role="list" className="flex min-w-0 items-center">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1
          return (
            <li
              key={crumb.href ?? crumb.label}
              className={`flex min-w-0 items-center ${last ? '' : 'hidden md:flex'}`}
            >
              {i > 0 && (
                <span aria-hidden="true" className="px-2">
                  /
                </span>
              )}
              {crumb.href === null ? (
                <span aria-current="page" className="truncate">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="truncate">
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
