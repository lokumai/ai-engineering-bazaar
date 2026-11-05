import { expect, test } from '@playwright/test'
import { readRawRecord, seedRecord, signedSheet, slugOf } from './record'
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
  const fills = async (path: string) => {
    await page.goto(path)
    return page.evaluate(() => {
      const fill = (id: string) => {
        const seg = document.querySelector(`.bz-trackswitch-seg[data-track-id="${id}"]`)
        return seg ? getComputedStyle(seg).backgroundColor : null
      }
      return { engineers: fill('engineers'), everyone: fill('everyone') }
    })
  }
  const onEngineers = await fills(A0.path)
  const onEveryone = await fills(EVERYONE)
  await expect(page.locator('html')).toHaveAttribute('data-bz-track', 'everyone')
  expect(onEngineers.engineers, 'no track switch').not.toBeNull()
  expect(onEngineers.engineers, 'For Engineers is not filled on its own page').not.toBe(onEngineers.everyone)
  // The filled segment moves: For Everyone takes the fill For Engineers had.
  expect(onEveryone.everyone, 'For Everyone is not filled on its own page').toBe(onEngineers.engineers)
  expect(onEveryone.engineers).toBe(onEngineers.everyone)
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

test('a For Everyone page offers the same languages as its For Engineers page, each in its own track', async ({ page }) => {
  const offered = async (path: string) => {
    await page.goto(path)
    return page.locator('.bz-langmenu a').evaluateAll((links) =>
      links.map((link) => new URL((link as HTMLAnchorElement).href).pathname))
  }
  const engineers = await offered(A0.path)
  const everyone = await offered(EVERYONE)
  expect(engineers.length, 'the module offers no second language, so this checks nothing').toBeGreaterThan(1)
  expect(everyone).toEqual(engineers.map((path) => path.replace(/(^|\/)courses\//, '$1everyone/courses/')))
})

test('on a phone every main destination is in view in the bar, with the switch and the flag beside them', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(A0.path)
  const nav = await page.locator('.bz-bar-nav > ul').boundingBox()
  const links = page.locator('.bz-bar-nav > ul > li').filter({ visible: true })
  expect(await links.count(), 'no main destination is shown').toBeGreaterThan(1)
  for (const box of await links.evaluateAll((items) => items.map((item) => {
    const rect = item.getBoundingClientRect()
    return { text: item.textContent?.trim() ?? '', left: rect.left, right: rect.right }
  }))) {
    expect(box.right, `${box.text} runs past the bar's navigation`).toBeLessThanOrEqual(nav!.x + nav!.width + 1)
    expect(box.left).toBeGreaterThanOrEqual(nav!.x - 1)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})

// While no For Everyone module is written, its side has nothing to draw and
// counts nothing, so only the For Engineers half can fail today; the rule
// itself is proven in `tests/unit/record/tracks.test.ts`. The For Everyone
// half starts checking the day a module is written.
test('a module completed For Engineers is not completed For Everyone, in frame one and after hydration', async ({ page }) => {
  await seedRecord(page, { sheets: { [SLUG]: signedSheet(null) } })
  const row = (track: string) => page.locator(`[data-panel="${track}"] .bz-cmod[data-module="${A0.module}"]`)
  // Where the module has a control in a track, its mark; an unwritten For
  // Everyone module has none, which also draws nothing.
  const drawn = (track: string) => row(track).locator('.bz-cmod-mark').evaluateAll((marks) =>
    marks.some((mark) => getComputedStyle(mark).display !== 'none'))
  const shown = async (track: string) => {
    await expect(row(track), `the ${track} panel does not list the module`).toHaveCount(1)
    return drawn(track)
  }

  // Frame one: the boot script and the stylesheet only.
  await page.route('**/*.js', (route) => route.abort())
  await page.goto('/profile/')
  expect(await shown('engineers'), 'the For Engineers completion is not drawn').toBe(true)
  expect(await shown('everyone'), 'the For Engineers completion is drawn For Everyone').toBe(false)
  await page.unroute('**/*.js')

  // After hydration: the counts in the tabs and the footer agree.
  await page.goto('/profile/')
  await expect(page.locator('.bz-ptab[data-track-id="engineers"] .bz-ptab-count')).toHaveText(/^1 of \d+$/)
  await expect(page.locator('.bz-ptab[data-track-id="everyone"] .bz-ptab-count')).toHaveText(/^0 of \d+$/)
  expect(await shown('everyone')).toBe(false)
})
