import { expect, test } from '@playwright/test'

/**
 * §10.2–§10.3 — the floors that only a real engine can confirm: the skip link
 * is the first focusable element on the page, and the landmarks are actually
 * in the DOM exactly once each.
 */

const PAGES = ['/', '/courses/', '/courses/fundamentals/', '/courses/fundamentals/llms/']

for (const path of PAGES) {
  test(`${path} puts the skip link first in the tab order`, async ({ page }) => {
    await page.goto(path)
    await page.keyboard.press('Tab')
    const focused = page.locator(':focus')
    await expect(focused).toHaveAttribute('href', /#main$/)
  })

  test(`${path} carries one banner, one main and one contentinfo`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('body > header, header')).toHaveCount(1)
    await expect(page.locator('main#main')).toHaveCount(1)
    await expect(page.locator('footer')).toHaveCount(1)
  })
}
