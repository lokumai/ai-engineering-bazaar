/**
 * The site is served from a sub-path on GitHub Pages, so a hardcoded
 * `/fundamentals/llms/` URL is a 404 in production and works fine locally —
 * the worst kind of bug. Anything that resolves a URL the Next router does
 * not touch goes through here: plain `<a href>`, `<img src>`, `fetch`, a
 * manifest entry, a file under `public/`.
 *
 * NOT `next/link`. `basePath` in next.config.mjs makes the router prepend the
 * base path to every `<Link href>` and `router.push` itself, so passing an
 * already-prefixed value doubles it — a base-path build emits
 * `/lms/lms/` and every internal link 404s. `<Link>` takes the app-relative
 * path as written.
 *
 * `NEXT_PUBLIC_LMS_BASE_PATH` is inlined by next.config.mjs at build time, so
 * this is safe in both server and client components.
 */

/** Absolute URL, protocol-relative URL, or bare fragment — never our route. */
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i

export function href(path: string): string {
  if (EXTERNAL.test(path)) return path

  const basePath = process.env.NEXT_PUBLIC_LMS_BASE_PATH ?? ''
  const normalised = path.startsWith('/') ? path : `/${path}`
  if (!basePath) return normalised

  // Callers sometimes pass a value that has already been through here (a link
  // read back out of the DOM, say). Prefixing twice would 404.
  const alreadyPrefixed =
    normalised === basePath || normalised.startsWith(`${basePath}/`)

  return alreadyPrefixed ? normalised : `${basePath}${normalised}`
}
