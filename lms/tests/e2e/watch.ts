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
 * What is not the product's fault.
 *
 * `next dev` streams a websocket for fast refresh and tears it down on
 * navigation. That says nothing about the shipped site.
 *
 * Nothing else is filtered. `/favicon.ico` was, for as long as the app shipped
 * no icon file and Chrome's automatic request for one 404'd on every page; that
 * filter is gone with the gap, so a missing icon now fails every page check
 * here as well as `favicon.spec.ts`.
 */
const HARNESS_NOISE = [
  /\/_next\/webpack-hmr/,
  /^ws:\/\//,
  /^wss:\/\//,
]

function ignored(url: string): boolean {
  return HARNESS_NOISE.some((pattern) => pattern.test(url))
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
