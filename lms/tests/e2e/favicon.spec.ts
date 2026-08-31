import { expect, test } from '@playwright/test'
import { A0 } from './sheets'

/**
 * The site ships no favicon, and every page pays for it.
 *
 * Chrome asks for `/favicon.ico` on every navigation whether the document
 * links one or not. `src/app/` has no `icon.*` or `favicon.ico`, so the export
 * has nothing at that path, the request 404s, and the console logs an error on
 * all thirty-nine pages. Nothing else on the site 404s.
 *
 * This is the one test in the suite that is expected to be red today. It is
 * here rather than folded into `health.spec.ts` on purpose: the alternative is
 * the same product bug failing forty page checks with a message that looks
 * like the page is broken, which buries it. `watch.ts` filters `favicon.ico`
 * for exactly that reason and points here.
 *
 * The fix is one file — `src/app/icon.svg` — and Next emits the `<link rel>`
 * and the route from it. Delete this spec and the filter in `watch.ts` when it
 * lands.
 */

test('the site serves an icon at the path the browser asks for', async ({ page }) => {
  const response = await page.request.get('/favicon.ico')
  expect(
    response.status(),
    'no icon in the export: Chrome requests /favicon.ico unprompted on every '
    + 'page and logs a console error when it 404s',
  ).toBe(200)
})

test('a page declares its icon rather than leaving the browser to guess', async ({ page }) => {
  await page.goto(A0.path)
  await expect(page.locator('link[rel~="icon"]')).not.toHaveCount(0)
})
