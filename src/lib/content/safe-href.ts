/**
 * Which addresses a link in rendered markdown may carry.
 *
 * The renderer turns `[text](url)` into `<a href="url">` and puts nothing between: remark
 * does not judge the scheme, and `rehype-stringify` writes `javascript:` as it finds it. The
 * corpus is written by the author, but it is also edited by colleagues, by agents and by
 * pull requests, and a call-out turns a link into a button, which makes a hostile one
 * easier to press. So one rule holds for every link on every page, and a link outside it
 * keeps its text and loses its address (`rehypeSafeLinks`).
 *
 * **An allowlist, never a blocklist:** `https:`, `http:`, `mailto:`, a bare `#fragment`, and
 * an address with no scheme at all, which is a relative path or a course link
 * (`rehypeCourseLinks` resolves those). Every other scheme is out, including the ones nobody
 * has thought of yet. Rejected: refusing `javascript:`, `data:` and `vbscript:` by name,
 * which is the list a browser's next scheme walks round.
 *
 * Browsers ignore tabs, newlines and other control characters inside a scheme, so
 * `java<TAB>script:` runs, and the scheme is read with them removed.
 */

const SCHEME = /^([a-z][a-z0-9+.-]*):/i
const ALLOWED_SCHEMES: ReadonlySet<string> = new Set(['http', 'https', 'mailto'])

export function isSafeHref(href: string): boolean {
  // eslint-disable-next-line no-control-regex
  const bare = href.replace(/[\u0000- \u007f-\u009f]/g, '')
  const scheme = SCHEME.exec(bare)?.[1]
  return scheme === undefined || ALLOWED_SCHEMES.has(scheme.toLowerCase())
}
