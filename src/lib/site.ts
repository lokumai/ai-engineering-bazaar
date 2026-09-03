/** Constants the shell needs in more than one place. */

export const SITE_NAME = 'AI Engineering Bazaar'

export const SITE_DESCRIPTION =
  'Thirty-two sheets on becoming an AI-powered software engineer.'

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
