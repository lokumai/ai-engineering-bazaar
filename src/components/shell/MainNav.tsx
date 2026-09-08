'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { INDEX_ROUTE, INDEX_TITLE, type CategoryLabel } from '@/lib/route-labels'

/**
 * M10 — the navbar. One row, on every route, with a dropdown per level.
 *
 * This is the answer to the first of the thirteen flaws
 * (`kia-context/logs/BRAINSTORM.md` D10): *"no active, unified navbar."* Before
 * this the header carried a breadcrumb and four icon buttons, so a reader could
 * see where they were and could not see where else they could go — every
 * destination was reachable only from the page they happened to be on.
 *
 * ## Four destinations, and why exactly these
 *
 * `Home`, `Curriculum`, `Catalog`, `My progress`. They are the four things a
 * reader arrives wanting: the front door, the course in its levels, the flat
 * list to search, and their own state. Nothing else earns a top-level slot —
 * `/path/`, `/dashboard/`, `/report/`, `/legend/` and `/team/` are all reached
 * from those four, and a navbar that lists nine things is the menu problem
 * again in a different shape.
 *
 * ## The dropdown has no JavaScript
 *
 * It opens on `:hover` and on `:focus-within`, in CSS. That is not a
 * simplification, it is the only version that is correct before hydration: the
 * export is static, a reader can click a link in the first frame, and a menu
 * that needs `useState` to open is a menu that does nothing for as long as the
 * bundle takes to arrive. `:focus-within` is what makes it keyboard-reachable —
 * tab into `Curriculum`, the panel opens, tab again and you are on the first
 * level. No `aria-expanded` is claimed, because nothing here toggles state; the
 * trigger is a link to `/courses/` and the panel is a list of links, which is
 * what a reader gets either way.
 *
 * ## Why this is a client island at all
 *
 * Only to mark the current route. `usePathname()` needs the browser, and the
 * level titles are content, so they arrive as props from `SiteHeader` — the
 * same arrangement `Breadcrumb` has, and §12.2's import direction: nothing that
 * reaches `node:fs` may be imported here.
 *
 * The current route is marked on the ROOT it belongs to, not only on an exact
 * match: a module page at `/courses/fundamentals/rag/` lights `Curriculum`, and
 * the level inside the dropdown too, because a reader deep in the course
 * should be able to see where they are without reading the URL.
 */

interface Destination {
  href: string
  label: string
  /** Every route this destination owns, so a child page still lights it. */
  owns: readonly string[]
}

const CURRICULUM = '/courses/'

const DESTINATIONS: readonly Destination[] = [
  { href: '/', label: 'Home', owns: [] },
  { href: CURRICULUM, label: 'Curriculum', owns: [CURRICULUM] },
  { href: INDEX_ROUTE, label: INDEX_TITLE, owns: [INDEX_ROUTE] },
  {
    href: '/profile/',
    label: 'My progress',
    // The four routes that report on the reader. M14 folds them into one; until
    // then they are one destination in the navbar rather than four, because a
    // reader has one question and the split is ours, not theirs.
    owns: ['/profile/', '/report/', '/dashboard/', '/path/'],
  },
]

/** `/` is only current when it is the whole path; everything else owns a tree. */
function isCurrent(destination: Destination, pathname: string): boolean {
  if (destination.href === '/') return pathname === '/'
  return destination.owns.some((route) => pathname.startsWith(route))
}

function Chevron() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
      className="hl-nav-chevron"
    >
      <path d="M2.5 4.5L6 8l3.5-3.5" />
    </svg>
  )
}

export function MainNav({ categories }: { categories: readonly CategoryLabel[] }) {
  const pathname = usePathname() ?? '/'

  return (
    <nav aria-label="Main" className="hl-nav">
      <ul role="list" className="hl-nav-row">
        {DESTINATIONS.map((destination) => {
          const current = isCurrent(destination, pathname)
          const isCurriculum = destination.href === CURRICULUM

          return (
            <li key={destination.href} className="hl-nav-item">
              <Link
                href={destination.href}
                className="hl-nav-link"
                aria-current={current ? 'page' : undefined}
              >
                {destination.label}
                {isCurriculum && <Chevron />}
              </Link>

              {isCurriculum && (
                <div className="hl-nav-menu">
                  <ul role="list">
                    {categories.map((category) => {
                      const href = `${CURRICULUM}${category.slug}/`
                      return (
                        <li key={category.slug}>
                          <Link
                            href={href}
                            className="hl-nav-menu-link"
                            data-cat={category.slug}
                            aria-current={pathname.startsWith(href) ? 'page' : undefined}
                          >
                            {/* The level's own colour, and its number beside
                                it: the hue is never the only carrier
                                (§13.1.4). */}
                            <span aria-hidden="true" className="hl-nav-menu-key" />
                            <span className="hl-nav-menu-order">
                              {String(category.order).padStart(2, '0')}
                            </span>
                            <span className="hl-nav-menu-title">{category.title}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
