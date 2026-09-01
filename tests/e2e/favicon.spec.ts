import { expect, test } from '@playwright/test'
import { A0 } from './sheets'
import { watchPage } from './watch'

/**
 * The tab icon (§8.3), and the console error the site paid for not having one.
 *
 * Chrome asks for `/favicon.ico` on every navigation whether the document links
 * an icon or not. `src/app/` shipped no `icon.*`, so the request 404'd and every
 * one of the forty-two exported pages logged an error for it — the only 404 the
 * site produced. Declaring the icon is what stops the request being made at
 * all, which is why the assertion below is about the *absence* of a request
 * rather than about `/favicon.ico` resolving: nothing has to exist at that path
 * once the document says where its icon is.
 *
 * `src/app/icon.svg` is a metadata file route rather than a file under
 * `public/`, because Next rewrites both the asset URL and the `<link>` for the
 * base path this site is served from and does neither for `public/`. That is
 * what the base-path assertion here is checking.
 *
 * `tests/unit/mascot/icon.test.ts` covers the drawing itself: §8.3's geometry,
 * and the two baked hexes against the ink token they were derived from.
 */

test('a page declares its icon rather than leaving the browser to guess', async ({ page }) => {
  await page.goto(A0.path)

  const icons = page.locator('link[rel~="icon"]')
  await expect(icons).not.toHaveCount(0)

  const svg = page.locator('link[rel~="icon"][type="image/svg+xml"]')
  await expect(svg).toHaveCount(1)
  // §8.3 also asks for a 32px raster fallback for the engines with no SVG
  // favicon support.
  await expect(page.locator('link[rel~="icon"][type="image/png"]')).toHaveCount(1)

  const href = await svg.getAttribute('href')
  expect(href).toBeTruthy()
  const response = await page.request.get(href as string)
  expect(response.status(), `${href} did not resolve`).toBe(200)
  expect(response.headers()['content-type']).toContain('svg')
})

test('the icon is prefixed for the sub-path the site is served from', async ({ page, baseURL }) => {
  await page.goto('/')

  // Whatever prefix the router uses for a route is the prefix the icon needs:
  // a hand-written <link> in the layout would miss it and 404 in production.
  const routePrefix = new URL(
    (await page.locator('header a[href$="/"]').first().getAttribute('href')) as string,
    baseURL,
  ).pathname.replace(/\/$/, '')

  for (const rel of ['[type="image/svg+xml"]', '[type="image/png"]']) {
    const href = await page.locator(`link[rel~="icon"]${rel}`).getAttribute('href')
    expect(href, rel).toContain(`${routePrefix}/icon.`)
  }
})

test('no page asks for an icon that is not there', async ({ page }) => {
  const problems = watchPage(page)
  const asked: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('favicon')) asked.push(request.url())
  })

  for (const path of ['/', '/courses/', A0.path]) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
  }

  expect(asked, 'Chrome fell back to /favicon.ico').toEqual([])
  expect(problems.consoleErrors).toEqual([])
  expect(problems.failedRequests).toEqual([])
})
