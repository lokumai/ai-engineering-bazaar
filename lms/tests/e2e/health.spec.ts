import { expect, test } from '@playwright/test'
import { A0, SHORT, A4, CATEGORY_PATHS } from './sheets'
import { watchPage } from './watch'

/**
 * The quiet failures: something logged an error, or something the page asked
 * for never arrived.
 *
 * `module-sheets.spec.ts` already watches all thirty-two sheets. This covers
 * the pages it does not — the index, the drawing set, a category — and it
 * exercises them rather than only loading them, because the islands (the
 * filter chips, the diagram renderer, the drawer) do their throwing after the
 * first paint, when a plain `goto` has already returned.
 */

const PAGES: [string, string][] = [
  ['index', '/'],
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

test('the index survives being used', async ({ page }) => {
  const problems = watchPage(page)
  await page.goto('/')

  for (const chip of ['READY', 'NOT DRAWN', 'EN · TR', 'ALL']) {
    await page.getByRole('button', { name: chip, exact: true }).click()
  }
  await page.getByRole('button', { name: 'Toggle theme' }).click()
  await page.waitForLoadState('networkidle')

  expect(problems.consoleErrors).toEqual([])
  expect(problems.failedRequests).toEqual([])
})

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
