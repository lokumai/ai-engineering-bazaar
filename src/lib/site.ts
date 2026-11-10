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

/**
 * Who owns this site, in law (M94, D118). The one place these facts are written; the footer prints
 * them on every route and `/legend/`'s Legal section prints them again, both from this object.
 *
 * Every value was read from a page fetched on 2026-11-10, and a value that was not found is
 * absent, never guessed:
 *
 * - `tradeName`, `mersis`, `address`: the Legal Entity Identifier record of the company, whose
 *   registration authority is MERSIS (the Central Registry Number System of the Ministry of Trade,
 *   `RA000560`) and whose `registeredAs` field is the company's MERSIS number, `FULLY_CORROBORATED`
 *   against it. https://api.gleif.org/api/v1/lei-records/78900098TSC1PV615354 (the same record is
 *   shown at https://lei.bloomberg.com/leis/view/78900098TSC1PV615354) and
 *   https://api.gleif.org/api/v1/registration-authorities/RA000560. The address is the registry's;
 *   https://intellica.net/contact prints the same office as "Gardenya 1 Plaza, Floor 1, Atatürk
 *   Mah. Turgut Özal Blv., Ataşehir".
 * - `email`, `phone`: https://intellica.net/contact, the company's own contact page, which prints
 *   both and is where its footer links. `info@` is the company's generic address, never a person's.
 *
 * Not found, so not written: the tax office and tax number, and the KEP (registered electronic
 * mail) address. No page of intellica.net or pia-group.net publishes them. They are added here, and
 * nowhere else, when the author supplies them from the company's own records; the footer and the
 * Legal section print whichever of them is present.
 */
export interface SiteOwner {
  /** As registered, with the legal form. */
  tradeName: string
  /** The MERSIS number, 16 digits. */
  mersis: string
  /** One line: the registry's words and order, its commas and "Kat .1" tidied to "Kat 1". */
  address: string
  email: string
  phone: string
  kep?: string
  taxOffice?: string
  taxNumber?: string
}

export const SITE_OWNER: SiteOwner = {
  tradeName: 'İŞ ZEKASI YAZILIM DANIŞMANLIK HİZMETLERİ TİCARET ANONİM ŞİRKETİ',
  mersis: '0481058685800001',
  address: 'Atatürk Mah Turgut Özal Bulvarı Gardenya 1 İş Merkezi No:42/b, Kat 1, Ataşehir, 34758 İstanbul, Türkiye',
  email: 'info@intellica.net',
  phone: '+90 216 688 45 46',
}

/**
 * The two pages that say what GitHub Pages does with a visitor, under the titles GitHub gives
 * them (read 2026-11-10). The first is the host's own sentence: "When a GitHub Pages site is
 * visited, the visitor's IP address is logged and stored for security purposes, regardless of
 * whether the visitor has signed into GitHub or not." The general statement does not mention
 * Pages, so the claim cites the page that does.
 */
export const GITHUB_PAGES_URL =
  'https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages'
export const GITHUB_PAGES_LABEL = 'What is GitHub Pages?'
export const GITHUB_PRIVACY_URL =
  'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement'
export const GITHUB_PRIVACY_LABEL = 'GitHub General Privacy Statement'

/** The footer's two anchors into `/legend/`; the ids sit on the headings of the same names. */
export const PRIVACY_ROUTE = '/legend/#privacy'
export const LEGAL_ROUTE = '/legend/#legal'
