import { expect, test } from '@playwright/test'
import { type RecordSeed, signedSheet, seedRecord, slugOf } from './record'
import { A0, SHORT, A4, CATEGORY_PATHS, INDEX_SHEET } from './sheets'
import { watchPage } from './watch'

/**
 * The quiet failures: something logged an error, or something the page asked
 * for never arrived.
 *
 * `module-sheets.spec.ts` already watches all thirty-two sheets. This covers
 * the pages it does not — the home screen, the manifest, the drawing set, a
 * category — and it exercises them rather than only loading them, because the
 * islands (the filter chips, the diagram renderer, the drawer, the record
 * readouts) do their throwing after the first paint, when a plain `goto` has
 * already returned.
 */

const PAGES: [string, string][] = [
  ['home screen', '/'],
  ['manifest', INDEX_SHEET],
  ['drawing set', '/courses/'],
  ['category', CATEGORY_PATHS[1]],
  ['A0 sheet', A0.path],
  ['SHORT sheet', SHORT.path],
  ['A4 sheet', A4.path],
]

for (const [name, path] of PAGES) {
  test(`${name} loads clean`, async ({ page }) => {
    const problems = watchPage(page)

    const response = await page.goto(path)
    expect(response?.status()).toBe(200)
    await page.waitForLoadState('networkidle')

    expect(problems.consoleErrors, `${path} logged`).toEqual([])
    expect(problems.failedRequests, `${path} requested`).toEqual([])
  })
}

test('the manifest survives being used', async ({ page }) => {
  const problems = watchPage(page)
  await page.goto(INDEX_SHEET)

  for (const chip of ['READY', 'NOT DRAWN', 'EN · TR', 'ALL']) {
    await page.getByRole('button', { name: chip, exact: true }).click()
  }
  await page.getByRole('button', { name: 'Toggle theme' }).click()
  await page.waitForLoadState('networkidle')

  expect(problems.consoleErrors).toEqual([])
  expect(problems.failedRequests).toEqual([])
})

/**
 * §15.2 — the home screen, watched in both record states.
 *
 * It is the most-visited page on the site and no other spec watches it for
 * console errors, which is reason enough; the record states are the reason it
 * is watched twice. Both blocks are always in the DOM and `home.css` hides one
 * with `display: none` (§15.2.1), so the resume block's islands —
 * `ContinueLine`, `Readout`, `Uptime`, `PathStanding`, the meters and
 * `CategoryTally` — hydrate and read the record even on the visit where the
 * reader never sees them. A throw inside a hidden block looks like a clean page
 * to every assertion that reads the DOM, and only this watchdog would notice.
 *
 * The way out of the page differs by state because the visible block differs;
 * both lead to the manifest, and coming back exercises §12.2 channel A across a
 * router transition, with the islands mounting a second time.
 */
const HOME_STATES: [string, RecordSeed | null, string][] = [
  // `null`, not `{}`: an empty seed is still a record — `recordData()` puts
  // today in `days` — and the boot script would stamp `data-hl-record` for it,
  // which is the returning reader's page. The first visit is the one with no
  // key in `localStorage` at all.
  ['a first visit', null, 'Open the index'],
  ['a return', { sheets: { [slugOf(A0)]: signedSheet('b7225f8') } }, 'Sheet index'],
]

for (const [state, seed, out] of HOME_STATES) {
  test(`the home screen survives being used, on ${state}`, async ({ page }) => {
    const problems = watchPage(page)
    if (seed) await seedRecord(page, seed)
    await page.goto('/')

    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await page.getByRole('link', { name: out, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`${INDEX_SHEET}$`))
    await page.goBack()
    await page.waitForLoadState('networkidle')

    expect(problems.consoleErrors).toEqual([])
    expect(problems.failedRequests).toEqual([])
  })
}

test('an A0 sheet survives being read', async ({ page }) => {
  const problems = watchPage(page)
  await page.goto(A0.path)
  await page.waitForLoadState('networkidle')

  // Down the sheet, through the figures, and back — the spine observer, the
  // diagram island and the sticky rails all run on this.
  await page.keyboard.press('End')
  await page.waitForTimeout(300)
  await page.locator('.hl-toc-entry').last().click()
  await page.keyboard.press('Home')
  await page.waitForTimeout(300)

  expect(problems.consoleErrors).toEqual([])
  expect(problems.failedRequests).toEqual([])
})

test('a route that does not exist answers 404 rather than a blank sheet', async ({ page }) => {
  const response = await page.goto('/courses/fundamentals/not-a-sheet/')
  expect(response?.status()).toBe(404)
  await expect(page.locator('body')).not.toHaveText('')
})
