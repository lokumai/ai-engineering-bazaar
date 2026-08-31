/**
 * §12.12 — the one absolute origin the exported record document prints.
 *
 * A static export has no request-time server, so nothing can read
 * `window.location` at build time and no header can carry the deployed host
 * into the HTML. That is why `reportFacts(origin)` takes the origin as an
 * argument rather than finding it, and this is the value both of its callers
 * pass: `/report/`, which builds the reader's own document in the browser, and
 * `/legend/specimen/`, which builds the specimen at build time. Two callers
 * passing two different strings would print two different criteria URLs for one
 * site — and `reportFacts` caches on the origin it was first handed, so the
 * divergence would be silent rather than loud.
 *
 * **Derived, not typed** (§11.25). GitHub Pages serves a project site at
 * `https://<owner>.github.io/<repo>/`; `REPO_URL` already names the owner, and
 * `lib/url.ts` already owns the `<repo>` half through `basePath`. So the origin
 * follows the repository when it is moved or renamed, and exactly one string in
 * the codebase says who publishes this site.
 *
 * Why absolute at all: the criteria URL is printed inside a file that is opened
 * from `file://` on somebody else's machine months later, where a site-relative
 * path resolves against their filesystem and reaches nothing (§12.12.7).
 *
 * The one deployment this does not describe is a custom domain, which this
 * project does not have. If it ever gets one, this constant is the only place
 * that changes.
 */

import { REPO_URL } from './site'

/**
 * `https://lokumai.github.io` — scheme and host, no path, because an origin is
 * a scheme/host/port tuple and excludes the path (§12.1.1). Lower-cased: a host
 * is case-insensitive and GitHub renders it lower-case, while an owner name is
 * not obliged to be.
 */
const OWNER = new URL(REPO_URL).pathname.split('/').filter(Boolean)[0]

export const SITE_ORIGIN = OWNER === undefined ? '' : `https://${OWNER.toLowerCase()}.github.io`
