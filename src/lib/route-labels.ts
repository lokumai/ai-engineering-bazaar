/**
 * The header breadcrumb and the footer's sheet label are the only two pieces
 * of the shell that change per page, and the header is rendered once in the
 * root layout — where no page data is in scope. So they are derived from the
 * route itself, which is a fact, rather than guessed at.
 *
 * What a route cannot tell us, these functions refuse to invent: a module's
 * sheet number lives in the content, so `sheetLabelFor` returns null on a
 * module page and the module page passes the real number to `PageShell`, which
 * hands it to the footer (spec §5.2).
 *
 * **The category labels arrive as an argument, and that is a constraint rather
 * than a style.** A subsystem's title and its position live in
 * `mini-courses/curriculum.yaml`, which only `node:fs` can read, and the two
 * components that call these functions are client islands (§12.2). So their
 * server parents measure the labels once and hand them down, the same way every
 * other build-time fact crosses that line. This module still imports nothing.
 */

/** What the chrome needs to know about one subsystem. */
export interface CategoryLabel {
  slug: string
  title: string
  /** 1-based position in the curriculum, for `SUBSYSTEM 02`. */
  order: number
}

export interface Crumb {
  label: string
  /** App-relative path, or null when this crumb is the current page. */
  href: string | null
}

/**
 * Next's own segment for the not-found boundary, and the one route whose URL
 * is not a fact about the page.
 *
 * `404.html` is prerendered once, at `/_not-found`, and a static host then
 * serves that same document at every address that is not a sheet. Anything in
 * the shell derived from `usePathname()` therefore renders one string on the
 * server and a different one in the browser — the header trail read `_NOT
 * FOUND` in the export and `404` on the page — and React answers a text
 * mismatch by re-rendering the whole document from scratch. That threw away
 * §2.5's boot script class with it, so a reader whose theme is dark got a 404
 * in light. It was the only page on the site logging a hydration error.
 *
 * `useSelectedLayoutSegment()` reads the router tree, which is embedded in the
 * document, so both sides see this constant and agree.
 */
export const NOT_FOUND_SEGMENT = '/_not-found'

/**
 * What that route calls itself, in the trail (§5.1), in the footer's sheet
 * slot (§5.2) and as the page title. It is not a sheet in the set, and the
 * one honest thing it can say is that no such sheet exists — never the URL
 * that was asked for, which names nothing.
 */
export const NOT_FOUND_TITLE = 'No such sheet'

/**
 * The same name in the case chrome labels are written in (§3.4). The footer
 * takes it as `PageShell`'s `sheet` override rather than reading the route:
 * `SheetLabel` sits below the page boundary, where the layout segment is the
 * page's own and no longer names the not-found route.
 */
export const NOT_FOUND_SHEET_LABEL = NOT_FOUND_TITLE.toUpperCase()

function segmentsOf(pathname: string): string[] {
  return pathname.split('/').filter(Boolean)
}

/**
 * The one route segment that is a real page but not a category: `/courses/`
 * is the drawing set, listed by subsystem. Without this it would trail as the
 * literal URL segment, which names a directory rather than a page.
 */
const SET_SEGMENT = 'courses'

const ROUTE_TITLES: Record<string, string> = { [SET_SEGMENT]: 'Drawing set' }

function titleFor(segment: string, categories: readonly CategoryLabel[]): string {
  return ROUTE_TITLES[segment]
    ?? categories.find((category) => category.slug === segment)?.title
    ?? segment.replaceAll('-', ' ')
}

function subsystemLabel(slug: string, categories: readonly CategoryLabel[]): string {
  const category = categories.find((candidate) => candidate.slug === slug)
  return category
    ? `SUBSYSTEM ${String(category.order).padStart(2, '0')}`
    : titleFor(slug, categories).toUpperCase()
}

/**
 * `segment` is `useSelectedLayoutSegment()`. It is only ever consulted to
 * recognise the not-found route, where the pathname is not the page's.
 */
export function breadcrumbFor(
  pathname: string,
  categories: readonly CategoryLabel[],
  segment: string | null = null,
): Crumb[] {
  if (segment === NOT_FOUND_SEGMENT) {
    return [{ label: 'Index', href: '/' }, { label: NOT_FOUND_TITLE, href: null }]
  }

  const segments = segmentsOf(pathname)
  if (segments.length === 0) return [{ label: 'Index', href: null }]

  const crumbs: Crumb[] = [{ label: 'Index', href: '/' }]
  segments.forEach((segment, i) => {
    const last = i === segments.length - 1
    crumbs.push({
      label: titleFor(segment, categories),
      href: last ? null : `/${segments.slice(0, i + 1).join('/')}/`,
    })
  })
  return crumbs
}

export function sheetLabelFor(
  pathname: string,
  categories: readonly CategoryLabel[],
): string | null {
  const segments = segmentsOf(pathname)
  if (segments.length === 0) return 'INDEX SHEET'

  if (segments[0] === SET_SEGMENT) {
    const rest = segments.slice(1)
    if (rest.length === 0) return titleFor(SET_SEGMENT, categories).toUpperCase()
    // Two segments past `/courses/` is a module sheet, and its number is a
    // fact about the content, not about the route.
    return rest.length === 1 ? subsystemLabel(rest[0], categories) : null
  }

  if (segments.length > 1) return null
  return subsystemLabel(segments[0], categories)
}

/** A chrome label split into its words and its machine-derived values. */
export interface MarkToken {
  text: string
  value: boolean
}

/** Digits and the punctuation that holds a value together: 11/32, 1,240. */
const VALUE = /(\d[\d,./:-]*)/

/**
 * Spec §5.2 gives a footer label two inks: `--color-ink-muted` for the words,
 * `--color-ink` for the values. Splitting is the only way to paint both from
 * one string.
 */
export function markTokens(label: string): MarkToken[] {
  return label
    .split(VALUE)
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, value: VALUE.test(part) }))
}
