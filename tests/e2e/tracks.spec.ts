import { expect, test } from '@playwright/test'
import { readRawRecord, slugOf } from './record'
import { A0 } from './sheets'

/**
 * M43 / D91 — the two tracks. Rules that hold for any content: the switch
 * leads to the same page in the other track, the page's track is right in
 * frame one, an unwritten For Everyone module says so, and opening a page
 * writes nothing to the reader's record.
 */

const SLUG = slugOf(A0)
const EVERYONE = `/everyone/courses/${SLUG}/`

test('the switch leads to the same module in the other track, and back', async ({ page }) => {
  await page.goto(A0.path)
  const track = page.getByRole('navigation', { name: 'Track' })
  await expect(track.getByRole('link', { name: /For Engineers/ })).toHaveAttribute('aria-current', 'true')
  await expect(track.getByRole('link', { name: /For Everyone/ })).toHaveAttribute('href', new RegExp(`${EVERYONE}$`))

  await track.getByRole('link', { name: /For Everyone/ }).click()
  await expect(page).toHaveURL(new RegExp(`${EVERYONE}$`))
  await expect(track.getByRole('link', { name: /For Everyone/ })).toHaveAttribute('aria-current', 'true')
  await expect(track.getByRole('link', { name: /For Engineers/ })).toHaveAttribute('href', new RegExp(`${A0.path}$`))
})

test('a For Everyone page is For Everyone in frame one, before any script file loads', async ({ page }) => {
  await page.route('**/*.js', (route) => route.abort())
  await page.goto(EVERYONE)
  await expect(page.locator('html')).toHaveAttribute('data-bz-track', 'everyone')
  const filled = await page.evaluate(() => {
    const seg = document.querySelector('.bz-trackswitch-seg[data-track-id="everyone"]')
    const other = document.querySelector('.bz-trackswitch-seg[data-track-id="engineers"]')
    return seg && other ? [getComputedStyle(seg).backgroundColor, getComputedStyle(other).backgroundColor] : null
  })
  expect(filled, 'no track switch').not.toBeNull()
  expect(filled![0], 'the current track is not filled').not.toBe(filled![1])
})

test('an unwritten For Everyone module says so, and offers both ways on', async ({ page }) => {
  await page.goto(EVERYONE)
  // Whatever is written, every module has a For Everyone page; one that is not
  // written says so and links back. Written ones have prose instead.
  const notWritten = page.getByText('The For Everyone version of this module is not written yet.')
  if (await notWritten.count() === 0) {
    await expect(page.locator('[data-hl-prose]')).toBeVisible()
    return
  }
  await expect(page.getByRole('link', { name: 'Read it For Engineers' })).toHaveAttribute('href', new RegExp(`${A0.path}$`))
  await expect(page.getByRole('link', { name: 'See what is written For Everyone' })).toBeVisible()
})

test('the catalog menu opens on the reader\'s track, and its levels open into it', async ({ page }) => {
  await page.goto(EVERYONE)
  await page.locator('.bz-bar-nav summary').click()
  await expect(page.getByRole('tab', { name: 'For Everyone' })).toHaveAttribute('aria-selected', 'true')
  const level = page.locator('#bz-menu-panel-everyone .bz-menu-item[data-cat]').first()
  await expect(level).toBeVisible()
  await expect(level).toHaveAttribute('href', /\/everyone\/sheets\/[a-z-]+\/$/)

  await page.getByRole('tab', { name: 'For Engineers' }).click()
  await expect(page.locator('#bz-menu-panel-engineers .bz-menu-item[data-cat]').first()).toHaveAttribute('href', /^(?!.*everyone).*\/sheets\/[a-z-]+\/$/)
})

test('the progress page opens on the track the reader was reading, and nothing is written', async ({ page }) => {
  await page.goto(EVERYONE)
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Progress', exact: true }).click()
  await expect(page).toHaveURL(/\/profile\/$/)
  await expect(page.locator('[data-panel="everyone"]')).toBeVisible()
  await expect(page.locator('[data-panel="engineers"]')).toBeHidden()
  // §12.13 — opening pages records nothing; the last track lives in the tab only.
  expect(await readRawRecord(page)).toBeNull()
})
