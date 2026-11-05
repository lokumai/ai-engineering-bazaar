import { expect, test } from '@playwright/test'
import { CATEGORY_PATHS, INDEX_SHEET, LEVEL_STUB_PATHS } from './sheets'

/**
 * There is no server to answer with a 301. The site is `output: 'export'`
 * served from GitHub Pages, so `next.config`'s `redirects` are never applied
 * and a page's own `redirect()` throws at build time. What ships is the
 * document, and it moves the reader three ways: an inline script, a
 * `<meta http-equiv="refresh">` for a reader with scripting off, and a visible
 * link. `MovedTo` carries the reasoning.
 *
 * M14's three forwards (`/dashboard/`, `/report/`, `/path/`) were removed in
 * M40 with the features they pointed at.
 */

/**
 * M17 — the six addresses the curriculum fold retired, and what a bookmark to
 * one of them does.
 *
 * `/courses/` and the five `/courses/<level>/` pages listed the course a second
 * and third time; the catalog lists it once, with the level as a filter that is
 * also an address. The fold is only honest if every one of the six lands the
 * reader on the SAME level they asked for — a forward that dumps all five
 * levels on the catalog's front page costs the reader the click it saved.
 *
 * **Nothing here names a level's title.** A test may check a rule that holds
 * for any content and may never write down a fact about it (`tests/README.md`),
 * so the claim is a relationship: the stub's heading is the destination's
 * heading, whatever the author calls it.
 */
const FOLDED: readonly [string, string][] = [
  ['/courses/', INDEX_SHEET],
  ...LEVEL_STUB_PATHS.map(
    (stub, i) => [stub, CATEGORY_PATHS[i]] as [string, string],
  ),
]

for (const [from, to] of FOLDED) {
  test(`${from} lands the reader on ${to}`, async ({ page }) => {
    const response = await page.goto(from)
    // The document itself is a 200: a static host has no other answer, and a
    // 404 is exactly what this fold exists to avoid.
    expect(response?.status(), from).toBe(200)
    await expect(page).toHaveURL(new RegExp(`${to}$`))
  })

  test(`${from} says where it went, with no JavaScript at all`, async ({ page }) => {
    await page.route('**/*.js', (route) => route.abort())
    const served = await (await page.request.get(from)).text()

    expect(served).toContain('http-equiv="refresh"')
    expect(served).toContain(`0; url=${to}`)
    expect(served, `${from} is indexable`).toMatch(
      /<meta name="robots" content="noindex[^"]*"/,
    )
    // The visible way out, for anyone the first two did not move.
    expect(served).toMatch(new RegExp(`href="${to}?"`))
  })
}

/**
 * The stub and its destination agree on what the destination is CALLED, and
 * neither this test nor the stub knows what that is.
 *
 * It is the one thing a level forward can get wrong silently: five stubs, five
 * destinations, and a `generateStaticParams` that hands each the wrong slug
 * would still produce five pages that load, forward and pass every check above.
 */
const HEADING = /<h1[^>]*>([^<]+)<\/h1>/

for (const [from, to] of FOLDED) {
  test(`${from} names the page it forwards to`, async ({ page }) => {
    /* Both sides read as SERVED HTML rather than one of them through a
       locator. A level whose title holds an ampersand is `&amp;` in the
       document and `&` in the accessibility tree, so comparing a parsed
       heading against a scraped one fails on the content rather than on the
       claim — which is the failure this test produced on its first run. */
    const stub = await (await page.request.get(from)).text()
    const destination = await (await page.request.get(to)).text()

    const stubHeading = HEADING.exec(stub)?.[1]
    expect(stubHeading, `${from} has no heading`).toBeTruthy()
    expect(HEADING.exec(destination)?.[1], `${to} has no heading`).toBe(stubHeading)

    const text = stub.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
    expect(text).toContain(`moved to ${stubHeading}`)
  })
}
