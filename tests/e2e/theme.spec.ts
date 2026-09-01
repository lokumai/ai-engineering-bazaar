import { type Page, expect, test } from '@playwright/test'
import { A0, sheetByModule } from './sheets'

/**
 * §2.3 / §2.5 — the theme, and the one property that cannot be unit tested:
 * there is no flash of the wrong one.
 *
 * A `useEffect` that adds `.dark` passes every test that inspects the page
 * after load and still shows the reader a white page for a frame. The check
 * that separates the two is *when* the class arrives, so these tests record
 * the class list inside the first `requestAnimationFrame` — which runs before
 * the first paint and before any React effect. If the boot script in `<head>`
 * were moved, deferred, or replaced by an effect, that reading comes back
 * empty and this goes red.
 */

/**
 * Installs a probe that captures `<html>`'s class list at the first frame,
 * before anything is painted. Must be called before `goto`.
 */
async function probeFirstPaint(page: Page): Promise<void> {
  await page.addInitScript(() => {
    ;(window as unknown as { __hlFirstPaint?: string }).__hlFirstPaint = undefined
    requestAnimationFrame(() => {
      ;(window as unknown as { __hlFirstPaint?: string }).__hlFirstPaint =
        document.documentElement.className
    })
  })
}

function firstPaintClass(page: Page): Promise<string | undefined> {
  return page.evaluate(() => (window as unknown as { __hlFirstPaint?: string }).__hlFirstPaint)
}

const themeOf = (page: Page) =>
  page.evaluate(() => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'))

const bodyGround = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor)

test('the toggle switches both ways and repaints the page', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.removeItem('hl-theme'))
  await page.emulateMedia({ colorScheme: 'light' })
  await page.reload()

  expect(await themeOf(page)).toBe('light')
  const light = await bodyGround(page)

  const toggle = page.getByRole('button', { name: 'Toggle theme' })

  await toggle.click()
  expect(await themeOf(page)).toBe('dark')
  const dark = await bodyGround(page)
  expect(dark).not.toBe(light)
  expect(await page.evaluate(() => localStorage.getItem('hl-theme'))).toBe('dark')

  await toggle.click()
  expect(await themeOf(page)).toBe('light')
  expect(await bodyGround(page)).toBe(light)
  expect(await page.evaluate(() => localStorage.getItem('hl-theme'))).toBe('light')
})

test('a chosen theme survives a reload with no flash of the other one', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Toggle theme' }).click()
  const chosen = await themeOf(page)

  await probeFirstPaint(page)
  await page.reload()

  expect(await themeOf(page)).toBe(chosen)
  // The class is already right in the frame before the first paint (§2.5).
  const atFirstPaint = await firstPaintClass(page)
  expect(atFirstPaint).toBeDefined()
  expect(atFirstPaint!.includes('dark')).toBe(chosen === 'dark')
})

test('a stored dark preference is in force before the first paint', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('hl-theme', 'dark'))

  await probeFirstPaint(page)
  await page.goto(A0.path)

  expect(await firstPaintClass(page)).toContain('dark')
  expect(await themeOf(page)).toBe('dark')
})

test('a stored light preference beats a dark system setting, before first paint', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('hl-theme', 'light'))

  await probeFirstPaint(page)
  await page.reload()

  expect(await firstPaintClass(page)).not.toContain('dark')
  expect(await themeOf(page)).toBe('light')
})

test('with no stored preference the system setting is honoured at first paint', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.removeItem('hl-theme'))
  await page.emulateMedia({ colorScheme: 'dark' })

  await probeFirstPaint(page)
  await page.reload()

  expect(await firstPaintClass(page)).toContain('dark')
})

/**
 * §15.1 — the pair of pages is `/` and a sheet, because that is the transition
 * a reader actually makes: the front door's lead card opens the first sheet of
 * the set (§15.2.4). It used to click a manifest row on `/`; the manifest moved
 * to its own route (`INDEX_SHEET`), and `/` is the better departure point
 * anyway, because it is where every reader starts.
 *
 * The sentinel is the point of the test. A full document load re-runs the boot
 * script in `<head>` and would carry the theme across for a reason that has
 * nothing to do with a client-side transition — where the mechanism is instead
 * that `<html>`'s class list is never rebuilt. So the sentinel is planted
 * before the click and read after it: if it is gone the router did a document
 * load and this test proved nothing, which is why it is asserted rather than
 * assumed.
 */
test('the theme carries across a navigation', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Toggle theme' }).click()
  const chosen = await themeOf(page)

  await page.evaluate(() => {
    ;(window as unknown as { __hlSameDocument?: true }).__hlSameDocument = true
  })

  // The lead card, by the name it prints, so a card that stopped opening the
  // first sheet fails here rather than being clicked anyway.
  const first = sheetByModule(1)
  const number = String(first.module).padStart(2, '0')
  await page.getByRole('link', { name: `Read sheet ${number}` }).click()
  await expect(page).toHaveURL(new RegExp(`${first.path}$`))
  await expect(page.locator('main h1')).toBeVisible()

  expect(
    await page.evaluate(
      () => (window as unknown as { __hlSameDocument?: true }).__hlSameDocument,
    ),
  ).toBe(true)
  expect(await themeOf(page)).toBe(chosen)
})
