import type { Page, Request, Response } from '@playwright/test'

/**
 * The two things every page in this suite is checked for, collected once and
 * asserted at the end of a test: did the page log an error, and did anything
 * it asked for fail to arrive.
 *
 * Both are nearly free to watch and they catch the class of breakage that no
 * targeted assertion will — a hydration mismatch, a chunk that 404s under a
 * base path, an island that throws after the DOM already looks right. A sheet
 * can render its h1 perfectly and still be broken.
 */

export interface PageProblems {
  /** `console.error` and anything that reached `window.onerror`. */
  consoleErrors: string[]
  /** Requests that failed outright, plus any response of 400 or worse. */
  failedRequests: string[]
}

/**
 * What is not the product's fault, and one thing that is.
 *
 * `next dev` streams a websocket for fast refresh and tears it down on
 * navigation. That says nothing about the shipped site.
 *
 * `/favicon.ico` is different: it is a real 404, on every page, and it is the
 * only one the site has. The app directory ships no `icon` file, so Chrome's
 * automatic request for the tab icon misses and every page logs a console
 * error for it. It is filtered here rather than left to fail all forty-odd
 * page checks with the same message — it is reported as a product bug, and
 * `favicon.spec.ts` is the one test that states it. Delete both the moment an
 * icon lands.
 */
const HARNESS_NOISE = [
  /\/_next\/webpack-hmr/,
  /^ws:\/\//,
  /^wss:\/\//,
]

/** The known product gap, tracked by its own test. */
const KNOWN_GAP = [/\/favicon\.ico$/]

function ignored(url: string): boolean {
  return [...HARNESS_NOISE, ...KNOWN_GAP].some((pattern) => pattern.test(url))
}

/**
 * A cancelled request is not a failed one.
 *
 * The App Router prefetches every `<Link>` that comes into view and aborts
 * those it no longer needs, so `net::ERR_ABORTED` is the router working, not
 * a resource that failed to arrive. Everything else — a refused connection, a
 * DNS failure, a chunk that 404s — still counts.
 */
const ABORTED = 'net::ERR_ABORTED'

/** Starts watching. Call before `page.goto`; read the object afterwards. */
export function watchPage(page: Page): PageProblems {
  const problems: PageProblems = { consoleErrors: [], failedRequests: [] }

  page.on('console', (message) => {
    if (message.type() !== 'error') return
    // A console error raised *by* a request carries that request's URL in its
    // location, which is the only way to tell "the favicon 404'd" from "the
    // page threw".
    if (ignored(message.location().url)) return
    problems.consoleErrors.push(`console.error: ${message.text()}`)
  })

  page.on('pageerror', (error) => {
    problems.consoleErrors.push(`uncaught: ${error.message}`)
  })

  page.on('requestfailed', (request: Request) => {
    const url = request.url()
    const reason = request.failure()?.errorText ?? 'failed'
    if (ignored(url) || reason === ABORTED) return
    problems.failedRequests.push(`${reason} ${url}`)
  })

  page.on('response', (response: Response) => {
    const url = response.url()
    if (ignored(url) || response.status() < 400) return
    problems.failedRequests.push(`HTTP ${response.status()} ${url}`)
  })

  return problems
}
