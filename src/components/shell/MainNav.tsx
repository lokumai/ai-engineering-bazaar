'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
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
 * `Home`, `Curriculum`, `Catalog`, `Your progress`. They are the four things a
 * reader arrives wanting: the front door, the course in its levels, the flat
 * list to search, and their own state. Nothing else earns a top-level slot —
 * `/legend/` and `/team/` are reached from those four, and a navbar that lists
 * nine things is the menu problem again in a different shape. M14 removed the
 * question of the other three: `/path/`, `/dashboard/` and `/report/` are the
 * fourth destination now rather than three routes it was standing in for.
 *
 * ## The dropdown is a native disclosure, and the first version was broken
 *
 * It is `<details>` / `<summary>`. No JavaScript, which matters because the
 * export is static and a reader can operate this in the first frame, before
 * any bundle arrives — a menu that needs `useState` to open is a menu that
 * does nothing until it lands.
 *
 * **The first version used `:hover` and `:focus-within` on a
 * `visibility: hidden` panel, and it was keyboard-inaccessible.** The reasoning
 * was that tabbing to the trigger would fire `:focus-within` and open the
 * panel, so the links inside would then be reachable. That is circular, and a
 * browser does not play along: `visibility: hidden` removes an element from the
 * tab order, so focus can never get inside to trigger the rule that would
 * reveal it. **Measured, by pressing Tab forty times in Chrome and printing
 * what had focus** — the five level links never appeared. The check that made
 * it look fine called `.focus()` on the trigger programmatically, which does
 * fire `:focus-within`; a real Tab press cannot.
 *
 * `<details>` has no such problem. Its contents are genuinely inert when
 * closed and genuinely focusable when open, the browser gives Enter and Space
 * for free, and `<summary>` carries the expanded state to a screen reader
 * without anyone claiming `aria-expanded` by hand.
 *
 * The cost is hover-to-open, which CSS cannot do to an `open` attribute. That
 * is an acceptable trade: click and Enter both open it, which is how every
 * disclosure a reader has met behaves, and the panel's first row is a link to
 * the curriculum index — so the destination the trigger used to be is still one
 * click away and is now *named* rather than implied.
 *
 * ## One thing `<details>` does not do for us: close on navigation
 *
 * `open` is DOM state on an element the layout keeps across a client
 * navigation, so choosing a level left the panel hanging open over the page it
 * had just opened — measured, not reasoned about. Chrome closes it on Escape
 * natively, and an outside click is answered by the reader clicking something
 * else, but a route change is not an interaction with this element at all. So
 * the one effect in this file closes it when the path changes. It writes the
 * attribute through a ref rather than making `open` controlled state, because a
 * controlled disclosure has to re-implement Escape, Enter, Space and the
 * summary's own toggle, and all four already work.
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
    // M14 — `Your progress`, which is the name the page itself carries and the
    // one §9 gives this subject. It read `My progress`, and the copy register
    // bans the first person outright: the site does not speak as the reader any
    // more than it speaks as itself.
    label: 'Your progress',
    /**
     * M14 folded the four routes that reported on the reader into `/profile/`,
     * and the three retired ones are still owned here: they are forwarding
     * pages, and for the frame a reader spends on one the navbar should mark
     * the destination they are on their way to rather than nothing at all.
     */
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
  const panel = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    if (panel.current) panel.current.open = false
  }, [pathname])

  return (
    <nav aria-label="Main" className="hl-nav">
      <ul role="list" className="hl-nav-row">
        {DESTINATIONS.map((destination) => {
          const current = isCurrent(destination, pathname)
          const isCurriculum = destination.href === CURRICULUM

          return (
            <li key={destination.href} className="hl-nav-item">
              {isCurriculum ? (
                <details className="hl-nav-details" ref={panel}>
                  {/* `data-current` and NOT `aria-current`. This is a
                      disclosure trigger, not a link, so it is never itself the
                      current page — and a level page would otherwise carry two
                      `aria-current="page"` inside one nav, on the summary and
                      on the level link, which is a contradiction a screen
                      reader has to resolve for the reader. The visual mark is
                      the same either way; only the claim changes. */}
                  <summary
                    className="hl-nav-link"
                    data-current={current ? '' : undefined}
                  >
                    {destination.label}
                    <Chevron />
                  </summary>

                  <div className="hl-nav-menu">
                    <ul role="list">
                      {/* The destination the trigger used to be. A disclosure
                          cannot also be a link, so the whole-curriculum page
                          is named here instead of implied by the label. */}
                      <li>
                        <Link
                          href={CURRICULUM}
                          className="hl-nav-menu-link hl-nav-menu-all"
                          aria-current={pathname === CURRICULUM ? 'page' : undefined}
                        >
                          <span aria-hidden="true" className="hl-nav-menu-key" />
                          <span className="hl-nav-menu-order">All</span>
                          <span className="hl-nav-menu-title">Every level</span>
                        </Link>
                      </li>
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
                </details>
              ) : (
                <Link
                  href={destination.href}
                  className="hl-nav-link"
                  data-current={current ? '' : undefined}
                  aria-current={current ? 'page' : undefined}
                >
                  {destination.label}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
