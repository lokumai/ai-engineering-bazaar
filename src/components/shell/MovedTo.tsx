import Link from 'next/link'
import { href } from '@/lib/url'

/**
 * M14 — a redirect, in the only form a static export can ship one.
 *
 * `/dashboard/`, `/report/` and `/path/` folded into `/profile/`, and an old
 * bookmark to any of them has to land somewhere useful rather than on a 404.
 * There is no server to answer a 301 with: the site is `output: 'export'` on
 * GitHub Pages, so `next.config`'s `redirects` are never applied and a page's
 * own `redirect()` throws at build time. **What ships is the document itself,
 * and it moves the reader three ways in decreasing order of speed:**
 *
 * 1. **An inline script**, first in the body, replacing the location before the
 *    parser reaches anything else. It is the only one of the three that can
 *    carry the FRAGMENT — `/report/#claim` keeps its `#claim` — because
 *    `location.hash` is only knowable in the browser, and it uses `replace`
 *    rather than `assign` so the retired address does not become a trap in the
 *    reader's Back button.
 * 2. **`<meta http-equiv="refresh" content="0; url=…">`**, for a reader with
 *    scripting off. It cannot carry the fragment, which is why the script goes
 *    first.
 * 3. **A visible sentence with a link**, for anyone the first two did not move —
 *    a text browser, a reader-mode extension, a crawler. It is not a fallback
 *    the way a `<noscript>` is: it is always rendered, and it is what the page
 *    says while the redirect is happening.
 *
 * **The URL goes through `href()`**, and that is not optional: the site is
 * served from `/ai-engineering-bazaar` on GitHub Pages and `basePath` only
 * rewrites what the router touches. A hardcoded `/profile/` here would work
 * locally and 404 in production, which `lib/url.ts` exists because of.
 *
 * **`robots: noindex` is on each stub's own `metadata`**, not here: a redirect
 * that a search engine indexes is a search result that spends a reader's click
 * on a page with no content.
 */
export function MovedTo({
  to,
  name,
  what,
}: {
  /** App-relative, as `<Link href>` takes it. `href()` adds the base path. */
  to: string
  /** What the destination is called, in the words the destination uses. */
  name: string
  /** What this address used to hold, so the sentence is about the reader's own bookmark. */
  what: string
}) {
  const target = href(to)

  return (
    <>
      {/*
        Written with `dangerouslySetInnerHTML` because that is the only way to
        emit an inline script React will not try to hydrate. It runs once, on
        the served document; a client transition into this route never executes
        it, which costs nothing — every in-tree link was repointed at the
        destination, so the only way to arrive here is from outside.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: `location.replace(${JSON.stringify(target)}+location.hash)`,
        }}
      />
      <meta httpEquiv="refresh" content={`0; url=${target}`} />

      <h1 className="bz-display">{name}</h1>

      <p className="bz-lead">
        {what} is part of {name} now, at one address instead of four. This page
        forwards there; if it has not, the link below does.
      </p>

      <p>
        <Link className="bz-btn" href={to}>
          {name}
        </Link>
      </p>
    </>
  )
}
