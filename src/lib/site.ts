import { href } from '@/lib/url'

/** Constants the shell needs in more than one place. */

export const SITE_NAME = 'AI Engineering Bazaar'

/**
 * Where the site is served from (D92), the ONE place its address is written.
 *
 * Three things need an absolute URL and read it from here: `metadataBase` in the
 * root layouts (which turns every relative `canonical` and `hreflang` into one), the
 * sitemap, and `robots.txt`. No trailing slash; a path is appended to it.
 */
export const SITE_ORIGIN = 'https://ai-bazaar.lokum.dev'

/** An app route as the absolute URL a crawler is told: base path included (`href`), origin in front. */
export function absoluteUrl(route: string): string {
  return `${SITE_ORIGIN}${href(route)}`
}

export const SITE_DESCRIPTION =
  'A short course on becoming an AI-powered software engineer.'

export const REPO_URL = 'https://github.com/lokumai/ai-engineering-bazaar'

export const LICENCE_URL = `${REPO_URL}/blob/main/LICENSE`

export const LICENCE_LABEL = 'MIT licence'

/**
 * Who publishes this site, and what that organisation belongs to.
 *
 * One array, consumed twice: the footer prints the names on every page and
 * `/legend/`'s colophon prints the same chain with its labels. Two hand-kept
 * lists would be free to disagree about the order, and the order IS the claim —
 * `LokumAI · Intellica · PIA Group` reads as containment, and reversing it
 * states something false about three real companies (§4, §1).
 *
 * `role` is the label the colophon prints. It is deliberately a relationship
 * rather than a slogan: this file's strings end up in reader-visible chrome, and
 * §12.14.1's register admits attribution but not promotion.
 */
export interface Affiliate {
  /** As the organisation writes it. */
  name: string
  url: string
  /** The colophon's row label. */
  role: string
}

export const AFFILIATION: readonly Affiliate[] = [
  { name: 'LokumAI', url: 'https://lokumai.github.io', role: 'Published by' },
  { name: 'Intellica', url: 'https://intellica.net', role: 'Part of' },
  { name: 'PIA Group', url: 'https://www.pia-group.net/', role: 'Group' },
]
