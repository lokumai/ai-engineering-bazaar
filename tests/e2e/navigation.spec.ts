import { expect, test } from '@playwright/test'
import { SHEETS } from './sheets'

/**
 * §5.7 — prev/next, walked end to end.
 *
 * The build deletes the hand-typed `**Next Module:**` lines from every source
 * file and replaces them from the manifest, so this chain is generated. That
 * makes it exactly the kind of thing that is right until a renumber and then
 * wrong in one place: sheet 7 to sheet 8 crosses from Fundamentals to
 * Intermediate, and a chain built per-category rather than per-set would stop
 * dead there and look deliberate.
 *
 * So the walk is the whole set, one click at a time, checking the URL and the
 * title at every step. Both ends are asserted too — §5.7 renders `— END OF
 * SET` rather than omitting the cell, and a link that wraps sheet 32 back to
 * sheet 1 would make the set a loop with no first sheet.
 */

const first = SHEETS[0]
const last = SHEETS[SHEETS.length - 1]

test('sheet 1 has no previous', async ({ page }) => {
  await page.goto(first.path)

  await expect(page.locator('.hl-prevnext a[rel="prev"]')).toHaveCount(0)
  await expect(page.locator('.hl-prevnext .hl-prevnext-cell').first())
    .toContainText(/end of set/i)
  await expect(page.locator('.hl-prevnext a[rel="next"]')).toHaveCount(1)
})

test('sheet 32 has no next', async ({ page }) => {
  await page.goto(last.path)

  await expect(page.locator('.hl-prevnext a[rel="next"]')).toHaveCount(0)
  await expect(page.locator('.hl-prevnext .hl-prevnext-cell').last())
    .toContainText(/end of set/i)
  await expect(page.locator('.hl-prevnext a[rel="prev"]')).toHaveCount(1)
})

test('next walks 1 to 32 straight through every category boundary', async ({ page }) => {
  test.slow() // thirty-one real navigations

  await page.goto(first.path)

  for (let i = 1; i < SHEETS.length; i++) {
    const expected = SHEETS[i]
    const previous = SHEETS[i - 1]

    // The link states where it goes before it goes there (§5.7).
    const next = page.locator('.hl-prevnext a[rel="next"]')
    await expect(next).toContainText(expected.title)
    await expect(next.locator('.hl-prevnext-sheet')).toHaveText(String(expected.module))

    // A sheet that is not drawn says so on the link, not only on arrival.
    await expect(next.locator('.hl-prevnext-tag')).toHaveCount(expected.drawn ? 0 : 1)

    await next.click()
    await expect(page).toHaveURL(new RegExp(`${expected.path}$`))
    await expect(page.locator('main h1')).toHaveText(expected.title)

    if (expected.category !== previous.category) {
      // The boundary is a subsystem label, not a stop (§4.4 / §5.7).
      await expect(page.locator('.hl-eyebrow')).toContainText(
        expected.category.toUpperCase().replace('-', ' '),
      )
    }
  }

  await expect(page).toHaveURL(new RegExp(`${last.path}$`))
})

test('previous walks 32 back to 1', async ({ page }) => {
  test.slow()

  await page.goto(last.path)

  for (let i = SHEETS.length - 2; i >= 0; i--) {
    const expected = SHEETS[i]
    await page.locator('.hl-prevnext a[rel="prev"]').click()
    await expect(page).toHaveURL(new RegExp(`${expected.path}$`))
    await expect(page.locator('main h1')).toHaveText(expected.title)
  }
})
