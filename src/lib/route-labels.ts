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

/**
 * §15.1 — the flat manifest's own segment. `/` is the home screen now, and the
 * thirty-two-row register moved here, so the trail needs a name for it or it
 * prints the bare directory `sheets`.
 */
const INDEX_SEGMENT = 'sheets'

const ROUTE_TITLES: Record<string, string> = {
  [SET_SEGMENT]: 'Drawing set',
  [INDEX_SEGMENT]: 'Sheet index',
}

/**
 * The register's route and its name, for the pages that link to it in prose.
 *
 * §15.1 moved the manifest and left `not-found.tsx` pointing a link labelled
 * `Index` at `/`, one line under a sentence promising the index — so the 404's
 * one way out opened the home screen instead. The export link gate cannot see
 * that class of defect: `/` resolves, and a link to the wrong existing page is
 * indistinguishable from a link to the right one. The only defence is that the
 * href and the label have a single author, which is what these two are.
 */
export const INDEX_ROUTE = `/${INDEX_SEGMENT}/`
export const INDEX_TITLE = ROUTE_TITLES[INDEX_SEGMENT]

/**
 * Ancestor paths that exist in the URL but were never exported as a page.
 *
 * **MEASURED, by `scripts/check-links-out.mjs` on its first run:** exactly one
 * internal link in the whole export pointed at nothing — `href="/auth/"`, on
 * the callback page. The trail gives every ancestor segment an href, and
 * `/auth/` is a directory holding `callback/` with no page of its own, so the
 * one crumb above a reader mid-sign-in led to a 404. (The denominator moves
 * with the corpus and is not restated here: that run saw 54 documents, and the
 * export this section finished with carries 2408 internal links across 56. A
 * number written into a comment is a measurement of a tree that no longer
 * exists.)
 *
 * The alternative was to drop the segment from the trail entirely. It is
 * rejected because the label is doing real work: a reader landing on the
 * callback page should see where they are. A crumb with no href is exactly the
 * shape this module already uses for "this is the current page" — it reads as
 * position, not as a link that failed.
 *
 * A set of paths and not a heuristic: guessing which segments have pages from
 * the URL is how the defect arrived. Each entry is a claim about the router
 * tree, and the link gate cannot check it in either direction — an un-linked
 * crumb emits no href, so there is nothing in the export for the gate to
 * follow. Both directions fail silently on their own: an entry deleted while
 * `/auth/` still has no page puts the 404 back, and an entry left here after a
 * page is added at `/auth/` costs a reader a crumb that no longer navigates.
 *
 * So the claim is checked against the filesystem instead.
 * `tests/unit/route-labels.test.ts` globs `src/app/**` and fails if any path in
 * this set has a `page.tsx` — which is why the set is exported. It reads the
 * router tree rather than the trail, because a test that only asserts
 * `breadcrumbFor`'s output agrees with whatever this set happens to say.
 */
export const WITHOUT_A_PAGE: ReadonlySet<string> = new Set(['/auth/'])

/**
 * What `/` is called in the trail. §15.1 renamed it: the root of every path on
 * this site used to be the index sheet, and the trail said so; the register
 * moved to `/sheets/` and `/` became the home screen, so the first crumb had to
 * follow or it would name a page that is one click further on.
 */
const ROOT_CRUMB = 'Home'

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
    return [{ label: ROOT_CRUMB, href: '/' }, { label: NOT_FOUND_TITLE, href: null }]
  }

  const segments = segmentsOf(pathname)
  if (segments.length === 0) return [{ label: ROOT_CRUMB, href: null }]

  const crumbs: Crumb[] = [{ label: ROOT_CRUMB, href: '/' }]
  segments.forEach((segment, i) => {
    const last = i === segments.length - 1
    const path = `/${segments.slice(0, i + 1).join('/')}/`
    crumbs.push({
      label: titleFor(segment, categories),
      href: last || WITHOUT_A_PAGE.has(path) ? null : path,
    })
  })
  return crumbs
}

export function sheetLabelFor(
  pathname: string,
  categories: readonly CategoryLabel[],
): string | null {
  const segments = segmentsOf(pathname)
  // §15.1 — `/` is the home screen. `INDEX SHEET` moved with the register it
  // named, to `/sheets/`, where the last branch of this function derives it
  // from `ROUTE_TITLES`.
  if (segments.length === 0) return 'HOME'

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
