import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CATEGORY_PATHS, INDEX_SHEET, LEVEL_STUB_PATHS } from './sheets'

/**
 * M14 — the three retired routes, and what an old bookmark to one of them does.
 *
 * `/dashboard/`, `/report/` and `/path/` folded into `/profile/`. M14's
 * acceptance criterion is that an old bookmark lands somewhere useful rather
 * than on a 404, and this is where that is checked — in a browser, because a
 * redirect is a thing that happens rather than a thing a file says.
 *
 * **There is no server to answer with a 301.** The site is `output: 'export'`
 * served from GitHub Pages, so `next.config`'s `redirects` are never applied
 * and a page's own `redirect()` throws at build time. What ships is the
 * document, and it moves the reader three ways: an inline script (the only one
 * that can carry a fragment), a `<meta http-equiv="refresh">` for a reader with
 * scripting off, and a visible link for anyone the first two did not move.
 * `MovedTo` carries the reasoning; this file measures all three.
 */

const MOVED: readonly [string, string][] = [
  ['/dashboard/', 'The dashboard'],
  ['/report/', 'The record of work'],
  ['/path/', 'The learning path'],
]

const PROGRESS = '/profile/'

for (const [from, what] of MOVED) {
  test(`${from} lands the reader on ${PROGRESS}`, async ({ page }) => {
    const response = await page.goto(from)
    // The document itself is a 200: a static host has no other answer, and a
    // 404 is exactly what this milestone exists to avoid.
    expect(response?.status(), from).toBe(200)

    // And the reader ends up on the one progress route, without touching
    // anything.
    await expect(page).toHaveURL(new RegExp(`${PROGRESS}$`))
    await expect(page.locator('main h1')).toHaveText('Your progress')
  })

  test(`${from} keeps the fragment it was bookmarked with`, async ({ page }) => {
    // The fragment is the reason the script goes first and the reason it exists
    // at all: `/report/#data` is a link a reader may have saved, `location.hash`
    // is only knowable in the browser, and a `<meta refresh>` cannot carry it.
    // `#data` is the export/import/erase row, and `FoldFragment` opens the row
    // a fragment names on arrival — so this also checks the two halves meet.
    await page.goto(`${from}#data`)
    await expect(page).toHaveURL(new RegExp(`${PROGRESS}#data$`))
    await expect(page.locator('section[aria-labelledby="data"] details')).toHaveAttribute(
      'open',
      '',
    )
  })

  test(`${from} says where it went, with no JavaScript at all`, async ({ page }) => {
    // Every module refused, so the script cannot run: what is left is the
    // `<meta refresh>` and the sentence. The refresh is what a scripting-off
    // reader is moved by, and this test cannot follow it — aborting the modules
    // does not abort the meta, so the assertion is on the document that was
    // served, read before it forwards.
    await page.route('**/*.js', (route) => route.abort())
    const served = await (await page.request.get(from)).text()

    expect(served).toContain('http-equiv="refresh"')
    expect(served).toContain('0; url=/profile/')
    // React writes `<!-- -->` between adjacent text segments, so the sentence
    // is matched on the served document with the markup taken out rather than
    // on the raw bytes.
    const text = served.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
    expect(text).toContain(`${what} moved to Your progress`)
    // The visible way out, for anyone the first two did not move.
    expect(served).toMatch(/href="\/profile\/?"/)
  })
}

test('a forward asks not to be indexed, because it has no content to find', async ({
  page,
}) => {
  for (const [from] of MOVED) {
    const served = await (await page.request.get(from)).text()
    expect(served, from).toMatch(/<meta name="robots" content="noindex[^"]*"/)
  }
})

/**
 * The base-path build, which is the one that actually ships.
 *
 * GitHub Pages serves this site from `/ai-engineering-bazaar`, and `basePath`
 * only rewrites what the Next router touches — a `<meta refresh>` and a
 * `location.replace` are not. So the target goes through `lib/url.ts`'s
 * `href()`, and this is the check that it did: read against the export in
 * `out/` rather than through the server, because the running server is the
 * base-path-less build and the failure only exists in the other one.
 *
 * It asserts the SHAPE — that the URL the stub forwards to is the same one the
 * page's own link carries — rather than the literal prefix, so it holds for
 * both builds. A hardcoded `/profile/` in the stub would pass locally and 404
 * in production, which is the worst kind of bug and the reason `lib/url.ts`
 * exists.
 */
test('the forward and the link agree on the target, whatever the base path is', () => {
  for (const [from] of MOVED) {
    const file = join(process.cwd(), 'out', from.replace(/^\/|\/$/g, ''), 'index.html')
    const html = readFileSync(file, 'utf8')

    const meta = /<meta http-equiv="refresh" content="0; url=([^"]+)"/.exec(html)?.[1]
    const script = /location\.replace\("([^"]+)"\)?\+location\.hash/.exec(html)?.[1]
    const link = /<a class="bz-btn" href="([^"]*profile[^"]*)"/.exec(html)?.[1]

    expect(meta, `${from} has no meta refresh`).toBeDefined()
    expect(script, `${from} has no script forward`).toBe(meta)
    expect(link, `${from} has no visible link`).toBe(meta)
    expect(meta!.endsWith('/profile/')).toBe(true)
  }
})


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
