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
 *
 * ## `current`, and why the 404 page has to hand it over
 *
 * `NOT_FOUND_SEGMENT` is how this component recognises the one route whose
 * address names nothing — and recognising it depends on
 * `useSelectedLayoutSegment()`, which answers relative to the nearest layout
 * ABOVE the component. M16 stage 1b moved the trail out of `SiteHeader` in the
 * root layout and into `PageShell`, which a page renders, so the question is
 * being asked from a different place in the tree and the answer changed: the
 * trail on `/404/` printed `Home / 404`, which is the URL segment the test
 * §5.1 exists to forbid.
 *
 * So the page that knows it is the not-found page says so, exactly as it
 * already does for the footer's sheet slot — `not-found.tsx` has passed
 * `NOT_FOUND_SHEET_LABEL` all along, and that half never broke. An explicit
 * name from the one route that cannot derive one beats an inference that is
 * correct only from one position in the component tree.
 */
export function Breadcrumb({
  categories,
  current,
  leaf,
}: {
  categories: readonly CategoryLabel[]
  /** COLLAPSES the trail to the root and this name. See below. */
  current?: string
  /**
   * M21 — renames the LAST crumb and leaves the rest of the trail alone.
   *
   * `breadcrumbFor` labels a segment no route table names by de-hyphenating
   * it, which is right for `/team/assignments/` and wrong for a module: the
   * trail read `Home / Catalog / Fundamentals / llms` under a heading saying
   * `LLM Fundamentals`. Only the page itself knows the title — `route-labels`
   * is a client module and may not reach `node:fs` (§12.2) — so it is passed
   * in, the same arrangement `categories` already has.
   *
   * **Distinct from `current`, which is a different operation**, and using
   * that one here deleted `Fundamentals` from the trail. Since M21 that crumb
   * is what names a module's level in words — the facts strip's level tag is
   * gone — so collapsing the trail would have taken the carrier out with it.
   */
  leaf?: string
}) {
  const derived = breadcrumbFor(usePathname() ?? '/', categories, useSelectedLayoutSegment())
  /* The ROOT and the page's own name, and nothing between them. Overriding
     only the last crumb was not enough: `/courses/fundamentals/no-such-module/`
     kept `Curriculum / Fundamentals` in the middle, so the trail still read
     differently at two addresses that are the same page, and §5.1's promise is
     that the 404 never prints the address it was asked for. This is the shape
     `breadcrumbFor` already produces for `NOT_FOUND_SEGMENT`. */
  const named = current === undefined ? derived : [derived[0], { label: current, href: null }]
  const crumbs = leaf === undefined || named.length === 0
    ? named
    : [...named.slice(0, -1), { ...named[named.length - 1], label: leaf }]

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
