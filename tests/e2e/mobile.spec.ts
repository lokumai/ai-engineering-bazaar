import { type Page, expect, test } from '@playwright/test'
import { A0, A4, CATEGORY_PATHS } from './sheets'

/**
 * THE PHONE (M129). Rules that hold for any content, on a touch device.
 *
 * Run by the `chrome-mobile` project (390x844, `isMobile`, `hasTouch`, so
 * `(hover: none)` and `(pointer: coarse)` are true), with the 360 case set per
 * test. `responsive.spec.ts` already proves the document never scrolls
 * sideways and every control in its list reaches the touch floor; this file
 * proves what the tab bar added: every destination on screen without
 * scrolling, a menu that opens and closes by touch and keyboard, controls with
 * no hover-only path, and a desktop that kept its bar where it was.
 *
 * Nothing here names a count, a title or a module: the routes are the shell's
 * own, and the controls are found by the classes the language defines.
 */

const ROUTES = [
  '/', '/tr/', '/fa/', '/about/', '/caravan/', '/courses/', CATEGORY_PATHS[1],
  A0.path, A4.path, `/fa${A0.path}`, `/everyone${A0.path}`, '/profile/', '/legend/', '/no-such-page/',
]

const isPhone = (page: Page) => page.viewportSize()!.width < 768

for (const width of [360, 390]) {
  test(`no route scrolls sideways at ${width}px, and the tab bar stays inside the screen`, async ({ page }) => {
    test.skip(!isPhone(page), 'a phone-width rule')
    await page.setViewportSize({ width, height: 780 })
    for (const route of ROUTES) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const metrics = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        bar: document.querySelector('.bz-bar-nav')!.getBoundingClientRect().toJSON(),
      }))
      expect(metrics.scroll, `${route} scrolls sideways`).toBeLessThanOrEqual(width)
      expect(metrics.bar.left, `${route}: tab bar starts off screen`).toBeGreaterThanOrEqual(0)
      expect(metrics.bar.right, `${route}: tab bar ends off screen`).toBeLessThanOrEqual(width)
    }
  })
}

test('every main destination is a visible, fixed, 44px tab with nothing to scroll', async ({ page }) => {
  test.skip(!isPhone(page), 'a phone-width rule')
  await page.setViewportSize({ width: 360, height: 780 })
  await page.goto(A0.path)
  const nav = page.locator('.bz-bar-nav')
  expect(await nav.evaluate((el) => getComputedStyle(el).position)).toBe('fixed')
  const bar = (await nav.boundingBox())!
  expect(Math.round(bar.y + bar.height), 'the bar sits on the bottom edge').toBe(780)
  const tabs = page.locator('.bz-bar-nav > ul > li')
  const count = await tabs.count()
  expect(count, 'fewer than three destinations in a tab bar').toBeGreaterThanOrEqual(3)
  expect(count, 'more than five tabs is past what a thumb can tell apart').toBeLessThanOrEqual(5)
  for (let i = 0; i < count; i++) {
    const box = (await tabs.nth(i).locator('.bz-bar-link').boundingBox())!
    expect(box.width, `tab ${i} is under 44px wide`).toBeGreaterThanOrEqual(44)
    expect(box.height, `tab ${i} is under 44px tall`).toBeGreaterThanOrEqual(44)
    expect(box.x, `tab ${i} starts off screen`).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width, `tab ${i} ends off screen`).toBeLessThanOrEqual(360 + 0.5)
  }
  // Nothing hides behind a sideways swipe.
  expect(await page.locator('.bz-bar-nav > ul').evaluate((ul) => ul.scrollWidth <= ul.clientWidth)).toBe(true)
  // Colour is not the only signal of the current tab: a link says so, and so does a rule.
  const current = page.locator('.bz-bar-nav [aria-current], .bz-bar-nav [data-current]').first()
  expect(await current.evaluate((el) => getComputedStyle(el).borderTopColor !== 'rgba(0, 0, 0, 0)')).toBe(true)
})

test('the page ends above the tab bar, not behind it', async ({ page }) => {
  test.skip(!isPhone(page), 'a phone-width rule')
  await page.goto(A0.path)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  const footer = (await page.locator('footer').last().boundingBox())!
  const bar = (await page.locator('.bz-bar-nav').boundingBox())!
  expect(footer.y + footer.height, 'the last line of the page is under the tab bar').toBeLessThanOrEqual(bar.y + 1)
})

test('the catalog menu opens by touch and by keyboard, and closes by Escape and by a tap outside', async ({ page }) => {
  test.skip(!isPhone(page), 'a phone-width rule')
  await page.goto(A0.path)
  const details = page.locator('.bz-bar-nav details')
  const summary = details.locator('summary')

  await summary.tap()
  await expect(details).toHaveAttribute('open', '')
  const sheet = (await page.locator('.bz-menu').first().boundingBox())!
  const bar = (await page.locator('.bz-bar-nav').boundingBox())!
  expect(sheet.y + sheet.height, 'the sheet runs under the tab bar').toBeLessThanOrEqual(bar.y + 1)
  expect(sheet.x).toBeGreaterThanOrEqual(0)
  expect(sheet.x + sheet.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  for (const row of await page.locator('.bz-menu ul:not([hidden]) .bz-menu-item').all()) {
    expect((await row.boundingBox())!.height, 'a menu row is under 44px').toBeGreaterThanOrEqual(44)
  }

  await page.touchscreen.tap(20, 200)
  await expect(details).not.toHaveAttribute('open', '')

  await summary.focus()
  await page.keyboard.press('Enter')
  await expect(details).toHaveAttribute('open', '')
  await page.locator('.bz-menu a').first().focus()
  await page.keyboard.press('Escape')
  await expect(details).not.toHaveAttribute('open', '')
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('SUMMARY')
})

test('no control lives behind a hover: the heading anchor and the chord hint are not offered to touch', async ({ page }) => {
  test.skip(!isPhone(page), 'a phone-width rule')
  expect(await page.evaluate(() => matchMedia('(hover: none)').matches), 'not a touch context').toBe(true)
  await page.goto(A0.path)
  const anchors = page.locator('.bz-anchor')
  expect(await anchors.count(), 'the module has no heading anchors to check').toBeGreaterThan(0)
  for (const anchor of await anchors.all()) await expect(anchor).toBeHidden()
  await page.goto('/profile/')
  await expect(page.locator('.bz-chord-hint')).toBeHidden()
})

test('the search window fills the screen and its field does not zoom the page', async ({ page }) => {
  test.skip(!isPhone(page), 'a phone-width rule')
  await page.goto('/')
  await page.getByRole('button', { name: 'Search' }).tap()
  const dialog = page.locator('dialog.bz-search')
  await expect(dialog).toBeVisible()
  const box = (await dialog.boundingBox())!
  const view = page.viewportSize()!
  expect(Math.round(box.width)).toBe(view.width)
  expect(Math.round(box.height)).toBe(view.height)
  expect(await dialog.locator('input').first().evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize)),
    'an input under 16px makes iOS zoom the page').toBeGreaterThanOrEqual(16)
})

test('every non-inline control in the chrome, the level page and the progress page reaches 44px in height', async ({ page }) => {
  test.skip(!isPhone(page), 'a phone-width rule')
  for (const route of ['/legend/', CATEGORY_PATHS[1], '/profile/']) {
    await page.goto(route)
    await page.waitForLoadState('networkidle')
    const short = await page.evaluate(() => {
      const found: string[] = []
      for (const el of document.querySelectorAll<HTMLElement>('a[href], button, summary')) {
        if (!el.checkVisibility() || el.classList.contains('skip-link')) continue
        const style = getComputedStyle(el)
        if (el.tagName === 'A' && style.display === 'inline' && el.closest('p, li:not([class]), td, dd, figcaption')) continue
        const hit = getComputedStyle(el, '::after')
        const pseudo = hit.content !== 'none' && hit.position === 'absolute' ? Number.parseFloat(hit.height) || 0 : 0
        const height = Math.max(el.getBoundingClientRect().height, pseudo)
        if (height < 43.5) found.push(`${el.tagName.toLowerCase()}.${el.className} ${Math.round(height)}px`)
      }
      return found
    })
    expect(short, `${route} has controls under the touch floor`).toEqual([])
  }
})

test('at desktop width the bar keeps its place: the navigation is in the top bar, nothing is fixed to the bottom', async ({ page }) => {
  test.skip(page.viewportSize()!.width < 1024, 'a desktop rule')
  await page.goto('/')
  const nav = page.locator('.bz-bar-nav')
  expect(await nav.evaluate((el) => getComputedStyle(el).position)).not.toBe('fixed')
  const box = (await nav.boundingBox())!
  expect(box.y + box.height, 'the navigation left the top bar').toBeLessThanOrEqual(76)
  expect(await page.locator('.bz-tab-icon').first().isVisible()).toBe(false)
})
