import { categoryBySlug } from './content/categories'

/**
 * The header breadcrumb and the footer's sheet label are the only two pieces
 * of the shell that change per page, and the shell is rendered once in the
 * root layout — where no page data is in scope. So they are derived from the
 * route itself, which is a fact, rather than guessed at.
 *
 * What a route cannot tell us, these functions refuse to invent: a module's
 * sheet number lives in the content, so `sheetLabelFor` returns null on a
 * module page and the module page passes the real number in (spec §5.2).
 */

export interface Crumb {
  label: string
  /** App-relative path, or null when this crumb is the current page. */
  href: string | null
}

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

function titleFor(segment: string): string {
  return ROUTE_TITLES[segment]
    ?? categoryBySlug(segment)?.title
    ?? segment.replaceAll('-', ' ')
}

function subsystemLabel(slug: string): string {
  const category = categoryBySlug(slug)
  return category
    ? `SUBSYSTEM ${String(category.order).padStart(2, '0')}`
    : titleFor(slug).toUpperCase()
}

export function breadcrumbFor(pathname: string): Crumb[] {
  const segments = segmentsOf(pathname)
  if (segments.length === 0) return [{ label: 'Index', href: null }]

  const crumbs: Crumb[] = [{ label: 'Index', href: '/' }]
  segments.forEach((segment, i) => {
    const last = i === segments.length - 1
    crumbs.push({
      label: titleFor(segment),
      href: last ? null : `/${segments.slice(0, i + 1).join('/')}/`,
    })
  })
  return crumbs
}

export function sheetLabelFor(pathname: string): string | null {
  const segments = segmentsOf(pathname)
  if (segments.length === 0) return 'INDEX SHEET'

  if (segments[0] === SET_SEGMENT) {
    const rest = segments.slice(1)
    if (rest.length === 0) return titleFor(SET_SEGMENT).toUpperCase()
    // Two segments past `/courses/` is a module sheet, and its number is a
    // fact about the content, not about the route.
    return rest.length === 1 ? subsystemLabel(rest[0]) : null
  }

  if (segments.length > 1) return null
  return subsystemLabel(segments[0])
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
