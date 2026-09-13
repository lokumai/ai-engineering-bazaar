'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { INDEX_ROUTE, INDEX_TITLE, levelRoute, type CategoryLabel } from '@/lib/route-labels'

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
 * ## Two things `<details>` does not do for us
 *
 * **Close on navigation**, and close when the pointer leaves. The first is
 * below; the second is M20's and its three conditions are on `leave`.
 *
 * ### Close on navigation
 *
 * `open` is DOM state on an element the layout keeps across a client
 * navigation, so choosing a level left the panel hanging open over the page it
 * had just opened — measured, not reasoned about. A route change is not an
 * interaction with this element at all, so the first effect in this file closes
 * it when the path changes. It writes the attribute through a ref rather than
 * making `open` controlled state, because a controlled disclosure has to
 * re-implement Enter, Space and the summary's own toggle, and those three do
 * already work.
 *
 * **This paragraph used to name two ways out that do not exist**, and M20
 * measured both in Chrome 153 against the built site.
 *
 * It said Chrome closes the panel on Escape natively — **it does not**, with
 * the summary focused or with a menu link focused. `keyDown` below supplies
 * the behaviour the claim had promised.
 *
 * It said an outside click is "answered by the reader clicking something
 * else" — **a click on empty page ground leaves the panel open**; what looked
 * like an outside click closing it was the route-change effect firing after
 * the reader clicked a LINK. That one is corrected rather than implemented: a
 * document-level listener is new global mechanism, and the case is covered —
 * on a pointer device by `leave`, and on a touch screen by tapping the summary
 * again, which is what every `<details>` on the web does. So the ways out are
 * the summary, Escape, a route change, and the pointer leaving where there is
 * a pointer to leave.
 *
 * ## Why this is a client island at all
 *
 * Only to mark the current route. `usePathname()` needs the browser, and the
 * level titles are content, so they arrive as props from `SiteHeader` — the
 * same arrangement `Breadcrumb` has, and §12.2's import direction: nothing that
 * reaches `node:fs` may be imported here.
 *
 * The current route is marked on the ROOT it belongs to, not only on an exact
 * match: a module page at `/courses/fundamentals/rag/` lights `Catalog`, and
 * the level inside the dropdown too, because a reader deep in the course
 * should be able to see where they are without reading the URL.
 *
 * **M17 made that two trees rather than one.** The catalog owns `/sheets/` and
 * `/courses/` both — the first is every listing of the course, the second is
 * every module in it — because the milestone moved the listings and
 * deliberately left the modules where every existing bookmark expects them.
 */

interface Destination {
  href: string
  label: string
  /** Every route this destination owns, so a child page still lights it. */
  owns: readonly string[]
}

/**
 * M17 — the module tree. It is NOT a destination in this bar any more, and it
 * is still owned: a reader on `/courses/expert/agents/` is inside the course,
 * so the catalog lights up and the level inside its dropdown does too.
 */
const MODULES = '/courses/'

const DESTINATIONS: readonly Destination[] = [
  { href: '/', label: 'Home', owns: [] },
  /**
   * M17 — ONE list, with the dropdown that used to hang off `Curriculum`.
   *
   * There were two entries here and they opened two renderings of the same
   * thirty-three modules. `/courses/` is a forwarding stub now, so the entry
   * naming it went and its dropdown moved onto the entry that survived — which
   * is the author's own framing of the milestone: *"lets only have a single
   * catalog page which has everything there and people can filter there."*
   */
  { href: INDEX_ROUTE, label: INDEX_TITLE, owns: [INDEX_ROUTE, MODULES] },
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

/**
 * The level a pathname is inside, or null.
 *
 * Two trees carry one: `/sheets/<level>/` is the level's own page and
 * `/courses/<level>/<module>/` is a module in it. Both name the level in the
 * same position, which is the only reason this is a segment read and not a
 * table.
 */
function levelOf(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean)
  if (segments[0] === 'sheets' && segments.length === 2) return segments[1]
  if (segments[0] === 'courses' && segments.length >= 2) return segments[1]
  return null
}

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
      className="bz-bar-chevron"
    >
      <path d="M2.5 4.5L6 8l3.5-3.5" />
    </svg>
  )
}

/**
 * M20 — how long the menu waits after the pointer leaves before it closes.
 *
 * Long enough to cross the gap between the summary and the panel, or between
 * two rows, without the menu shutting under the pointer; short enough that a
 * reader who has moved on does not find it still open. It is a grace period
 * and not an animation, so it is not in the motion scale.
 */
const CLOSE_DELAY_MS = 260

export function MainNav({ categories }: { categories: readonly CategoryLabel[] }) {
  const pathname = usePathname() ?? '/'
  const panel = useRef<HTMLDetailsElement>(null)
  /**
   * The PANEL, not the disclosure — and the difference is the whole of a bug
   * this had on its first build.
   *
   * The grace timer must not fire while a reader has focus in the menu. Asked
   * as `details.contains(document.activeElement)` that is ALWAYS true straight
   * after a click, because clicking a `<summary>` focuses it and the summary
   * is inside its own `<details>` — so the menu never closed on pointer-out at
   * all, which is the thing the author asked for. **MEASURED in a browser; the
   * type checker and a screenshot both saw a correct-looking component.**
   *
   * What the guard is actually protecting is a reader who has moved INTO the
   * list, so the list is what it asks about.
   */
  const menu = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (panel.current) panel.current.open = false
  }, [pathname])

  /* Clearing on unmount, because the timer outlives the component otherwise
     and fires against a detached element. */
  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current)
  }, [])

  /**
   * M20 — the author: *"even when I move cursor out of the boundaries of
   * dropdown, the dropdown is still here while I want it to disappear."*
   *
   * **Closing on `mouseleave` alone would break the two ways this menu is
   * mainly operated**, which is why it is three conditions rather than one.
   *
   * 1. **Only where hover exists.** A finger has no hover, so on a touch
   *    screen `pointerleave` fires at the end of the tap that OPENED the menu
   *    — it would open and close on one touch. `(hover: hover)` is the media
   *    query that tells the two apart, asked at the moment of the event rather
   *    than at render, because the answer changes when a laptop is undocked
   *    and no re-render is coming.
   * 2. **Never while focus is inside the LIST.** A keyboard reader tabs
   *    through the rows; the pointer may be nowhere near, and a stray mouse
   *    movement must not take the panel out from under them. The trigger does
   *    not count — see `menu` above, which is the bug this had.
   * 3. **After a grace delay**, so the diagonal from the summary to the
   *    bottom row does not close it on the way.
   *
   * Escape, an outside click and a route change already close it, and none of
   * those changed. This adds a fourth way in and takes none away.
   */
  function leave(): void {
    const details = panel.current
    if (!details || !details.open) return
    if (!window.matchMedia('(hover: hover)').matches) return

    cancelClose()
    timer.current = setTimeout(() => {
      const current = panel.current
      if (!current) return
      // Re-asked on the way out, not captured on the way in: focus may have
      // moved into the list during the grace period.
      if (menu.current?.contains(document.activeElement)) return
      current.open = false
    }, CLOSE_DELAY_MS)
  }

  function cancelClose(): void {
    if (timer.current === null) return
    clearTimeout(timer.current)
    timer.current = null
  }

  /**
   * M20 — **Escape closes it, and this docblock used to say Chrome did that
   * for us.** It does not.
   *
   * MEASURED in Chrome 153 against the built site: with the summary focused
   * and with a menu link focused, Escape leaves the panel open. The comment
   * above listed Escape among the ways out that "already work", and the M20
   * brief reasoned from the same sentence when it argued that closing on
   * pointer-out takes nothing away from a keyboard reader. It would have —
   * there was no keyboard way out but Enter on the summary, and a reader whose
   * focus is three rows down cannot reach that without tabbing backwards.
   *
   * Focus goes back to the summary, because the element that had it is about
   * to be `display: none` and focus on a hidden element is dropped on the
   * floor — the same hand-off `Catalog`'s `clear()` makes for the same reason.
   */
  function keyDown(event: React.KeyboardEvent<HTMLDetailsElement>): void {
    if (event.key !== 'Escape') return
    const details = panel.current
    if (!details?.open) return
    cancelClose()
    details.open = false
    details.querySelector('summary')?.focus()
  }

  return (
    <nav aria-label="Main" className="bz-bar-nav">
      <ul role="list">
        {DESTINATIONS.map((destination) => {
          const current = isCurrent(destination, pathname)
          const hasMenu = destination.href === INDEX_ROUTE

          return (
            <li key={destination.href}>
              {hasMenu ? (
                <details
                  ref={panel}
                  onPointerLeave={leave}
                  onPointerEnter={cancelClose}
                  onFocus={cancelClose}
                  onKeyDown={keyDown}
                >
                  {/* `data-current` and NOT `aria-current`. This is a
                      disclosure trigger, not a link, so it is never itself the
                      current page — and a level page would otherwise carry two
                      `aria-current="page"` inside one nav, on the summary and
                      on the level link, which is a contradiction a screen
                      reader has to resolve for the reader. The visual mark is
                      the same either way; only the claim changes. */}
                  <summary
                    className="bz-bar-link"
                    data-current={current ? '' : undefined}
                  >
                    {destination.label}
                    <Chevron />
                  </summary>

                  <div className="bz-menu" ref={menu}>
                    <ul role="list">
                      {/* The destination the trigger used to be. A disclosure
                          cannot also be a link, so the whole-curriculum page
                          is named here instead of implied by the label. */}
                      <li>
                        <Link
                          href={INDEX_ROUTE}
                          className="bz-menu-item"
                          aria-current={pathname === INDEX_ROUTE ? 'page' : undefined}
                        >
                          <span aria-hidden="true" className="bz-menu-key" />
                          {/* M20 — the author's own words for this row. It read
                              `Every level`, and the same string is on the
                              catalog's first level chip: two elements, one
                              meaning, so they are renamed together or not at
                              all. */}
                          View Curriculum
                          <span className="bz-menu-count">All</span>
                        </Link>
                      </li>
                      {categories.map((category) => {
                        return (
                          <li key={category.slug}>
                            <Link
                              href={levelRoute(category.slug)}
                              className="bz-menu-item"
                              data-cat={category.slug}
                              /* Not `startsWith`, because M17 left the two
                                 prefixes apart: the level's own page is under
                                 `/sheets/` and its modules are under
                                 `/courses/`, so the level a reader is inside is
                                 a SEGMENT in one of two trees and not a prefix
                                 of one address. */
                              aria-current={
                                levelOf(pathname) === category.slug ? 'page' : undefined
                              }
                            >
                              {/* The level's own colour, and its number beside
                                  it: the hue is never the only carrier
                                  (§13.1.4). */}
                              <span
                                aria-hidden="true"
                                className="bz-menu-key"
                                style={{ background: `var(--color-category-${category.order})` }}
                              />
                              {category.title}
                              <span className="bz-menu-count">{category.total}</span>
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
                  className="bz-bar-link"
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
