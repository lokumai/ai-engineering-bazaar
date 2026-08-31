import { type Page, expect, test } from '@playwright/test'
import { A0, A2, A4, CATEGORY_PATHS } from './sheets'

/**
 * §10.2–§10.3 and §9.6 — the floors only a real engine can confirm.
 *
 * A skip link that exists in the DOM is not a skip link. It has to be the
 * first thing `Tab` reaches, it has to become visible when it is reached, and
 * pressing it has to actually move the reader past the header. All three are
 * separate failures and all three are invisible to a DOM snapshot.
 */

const PAGES = ['/', '/courses/', CATEGORY_PATHS[0], A2.path, A0.path, A4.path]

/** What has focus, described the way a keyboard user would recognise it. */
function focusDescription(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    if (!el || el === document.body) return null
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40),
      inHeader: !!el.closest('header'),
      inMain: !!el.closest('main'),
      outline: getComputedStyle(el).outlineWidth,
      outlineStyle: getComputedStyle(el).outlineStyle,
    }
  })
}

for (const path of PAGES) {
  test(`${path} puts the skip link first in the tab order`, async ({ page }) => {
    await page.goto(path)
    await page.keyboard.press('Tab')

    const focused = page.locator(':focus')
    await expect(focused).toHaveAttribute('href', /#main$/)
    // §9.6: hidden until focused, then actually on screen — a skip link the
    // reader cannot see is a skip link they will not use.
    await expect(focused).toBeVisible()
    await expect(focused).toBeInViewport()
  })

  test(`${path} carries one banner, one main and one contentinfo`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('header')).toHaveCount(1)
    await expect(page.locator('main#main')).toHaveCount(1)
    await expect(page.locator('footer')).toHaveCount(1)
  })
}

test('the skip link moves the reader past the header', async ({ page }) => {
  await page.goto(A0.path)

  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/#main$/)

  // The point of the link is the next Tab, not the hash: whatever the browser
  // does with the fragment, focus has to continue from `main` rather than
  // restart at the header.
  await page.keyboard.press('Tab')
  const focused = await focusDescription(page)
  expect(focused, 'something has focus after the skip').not.toBeNull()
  expect(focused!.inHeader, `focus went back into the header: ${focused!.text}`).toBe(false)
  expect(focused!.inMain).toBe(true)
})

test('the header tab order runs left to right and stops at the repo link', async ({ page }) => {
  await page.goto(A0.path)

  const order: string[] = []
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab')
    const focused = await focusDescription(page)
    if (!focused) break
    if (!focused.inHeader && order.length > 0) break
    order.push(focused.text)
  }

  // Skip link, wordmark, the breadcrumb trail, then the two controls (§5.1).
  expect(order[0]).toMatch(/skip to content/i)
  expect(order[1]).toMatch(/lokum/i)
  expect(order.at(-2)).toMatch(/toggle theme/i)
  expect(order.at(-1)).toMatch(/repository/i)

  // The breadcrumb sits between the wordmark and the controls, in trail order.
  const crumbs = order.slice(2, -2)
  expect(crumbs.length).toBeGreaterThan(0)
  expect(crumbs.join(' ').toLowerCase()).toContain('index')
})

test('every interactive control in the header shows a focus ring', async ({ page }) => {
  await page.goto('/')

  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab')
    const focused = await focusDescription(page)
    if (!focused || !focused.inHeader) break
    expect(
      Number.parseFloat(focused.outline),
      `no focus ring on "${focused.text}"`,
    ).toBeGreaterThan(0)
    expect(focused.outlineStyle, `focus ring on "${focused.text}"`).not.toBe('none')
  }
})

test('a row in the manifest is one tab stop, and it is reachable', async ({ page }) => {
  await page.goto('/')

  // §5.3 — the whole row is one link target, so it must not be two or three
  // tab stops per row across a thirty-two row table.
  const stops = await page.locator('.hl-index tbody a, .hl-index tbody [tabindex]:not([tabindex="-1"])').count()
  expect(stops).toBe(32)

  // The scroll region itself is focusable so a keyboard can reach the columns
  // that scroll (§10.3).
  await expect(page.locator('.hl-index-scroll')).toHaveAttribute('tabindex', '0')
})

test('the schedule of parts and the manifest are named tables', async ({ page }) => {
  await page.goto(A4.path)
  await expect(page.locator('table.hl-schedule caption')).toHaveText(/schedule of parts/i)

  await page.goto('/')
  await expect(page.locator('.hl-index caption')).not.toHaveText('')
})
