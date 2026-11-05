import { expect, test } from '@playwright/test'
import { readRawRecord, seedRecord, signedSheet, slugOf, waitForHydratedReadout } from './record'
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

test('a For Everyone page is either the written module or says it is not written, never both or neither', async ({ page }) => {
  await page.goto(EVERYONE)
  // Every module has a For Everyone page (D91). Which of the two it is depends
  // on the content, so the test asserts the rule both ways round: exactly one
  // of prose and the not-written note, and the note always offers both ways on.
  const notWritten = page.getByText('The For Everyone version of this module is not written yet.')
  const prose = page.locator('[data-hl-prose]')
  const shown = (await notWritten.count()) + (await prose.count())
  expect(shown, 'a For Everyone page with both, or neither, of prose and the note').toBe(1)
  await expect(page.getByRole('link', { name: 'Read it For Engineers' })).toHaveCount(await notWritten.count())
  if (await notWritten.count() === 1) {
    await expect(page.getByRole('link', { name: 'Read it For Engineers' })).toHaveAttribute('href', new RegExp(`${A0.path}$`))
    await expect(page.getByRole('link', { name: 'See what is written For Everyone' })).toBeVisible()
  }
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

test('on a page of neither track the switch changes the track in place, and records nothing', async ({ page }) => {
  await page.goto('/profile/')
  await waitForHydratedReadout(page)
  const track = page.getByRole('navigation', { name: 'Track' })
  await track.getByRole('link', { name: /For Everyone/ }).click()
  await expect(page).toHaveURL(/\/profile\/$/)
  await expect(track.getByRole('link', { name: /For Everyone/ })).toHaveAttribute('aria-current', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-bz-track', 'everyone')
  await expect(page.locator('[data-panel="everyone"]')).toBeVisible()
  await expect(page.getByRole('tab', { name: /For Everyone/ })).toHaveAttribute('aria-selected', 'true')
  expect(await page.evaluate(() => sessionStorage.getItem('hl-track'))).toBe('everyone')
  expect(await readRawRecord(page)).toBeNull()

  // And it survives a reload, for this tab.
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-bz-track', 'everyone')
})

test('both track tablists follow the ARIA tabs pattern: one tab stop, arrows move and select', async ({ page }) => {
  await page.goto('/profile/')
  await waitForHydratedReadout(page)
  const progress = page.getByRole('tablist', { name: 'Progress by track' })
  await expect(progress.locator('[role="tab"][tabindex="0"]')).toHaveCount(1)
  await progress.getByRole('tab', { name: /For Engineers/ }).focus()
  await page.keyboard.press('ArrowRight')
  const everyone = progress.getByRole('tab', { name: /For Everyone/ })
  await expect(everyone).toBeFocused()
  await expect(everyone).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('[data-panel="everyone"]')).toBeVisible()
  await page.keyboard.press('Home')
  await expect(progress.getByRole('tab', { name: /For Engineers/ })).toBeFocused()

  await page.locator('.bz-bar-nav summary').click()
  const menu = page.getByRole('tablist', { name: 'Catalog by track' })
  await expect(menu.locator('[role="tab"][tabindex="0"]')).toHaveCount(1)
  await menu.locator('[role="tab"][tabindex="0"]').focus()
  await page.keyboard.press('ArrowRight')
  const focused = menu.locator('[role="tab"]:focus')
  await expect(focused).toHaveAttribute('aria-selected', 'true')
  await expect(focused).toHaveAttribute('tabindex', '0')
})

test('the home page\'s signs and the bar agree, both ways, and a sign keeps nothing', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await waitForHydratedReadout(page)
  const bar = page.getByRole('navigation', { name: 'Track' })
  const doors = () => page.locator('.bz-street .door').evaluateAll((all) =>
    all.map((door) => new URL((door as HTMLAnchorElement).href).pathname))

  // A sign: the bar shows the choice, and the tab does not remember it (D86).
  await page.locator('.bz-street [data-choose="all"]').click()
  await expect(bar.getByRole('link', { name: /For Everyone/ })).toHaveAttribute('aria-current', 'true')
  expect(await page.evaluate(() => sessionStorage.getItem('hl-track'))).toBeNull()
  expect((await doors()).every((path) => path.includes('/everyone/'))).toBe(true)

  // The bar: the doors follow, and no sign claims the reader pressed it.
  await bar.getByRole('link', { name: /For Engineers/ }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect.poll(async () => (await doors()).some((path) => path.includes('/everyone/'))).toBe(false)
  await expect(page.locator('.bz-street [data-choose][aria-pressed="true"]')).toHaveCount(0)
  expect(await readRawRecord(page)).toBeNull()
})

test('every language in the menu carries a flag, and the button shows the current one', async ({ page }) => {
  // M46 — Persian included: the author asked for Iran's flag rather than the script chip.
  for (const path of [A0.path, `/tr${A0.path}`, `/fa${A0.path}`]) {
    await page.goto(path)
    const rows = page.locator('.bz-langmenu a')
    const count = await rows.count()
    if (count === 0) continue
    await expect(rows.locator('svg.bz-flag')).toHaveCount(count)
    await expect(page.locator('.bz-langmenu summary svg.bz-flag')).toHaveCount(1)
  }
  await page.goto(`/fa${A0.path}`)
  await expect(page.locator('.bz-langmenu summary svg.bz-flag'), 'the Persian page offers no menu, so this checks nothing').toHaveCount(1)
})

test('a track sign carries its icon and its name on one row', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    const rows = await page.locator('.bz-street .track-sign .board').evaluateAll((boards) => boards.map((board) => {
      const icon = board.querySelector('.sg-ico')!.getBoundingClientRect()
      const name = board.querySelector('.sg-t')!.getBoundingClientRect()
      return { overlapY: Math.min(icon.bottom, name.bottom) - Math.max(icon.top, name.top), beside: name.left >= icon.right }
    }))
    expect(rows.length).toBe(2)
    for (const row of rows) {
      expect(row.beside, `the name is not beside its icon at ${width}px`).toBe(true)
      expect(row.overlapY, `the name is not on the icon's row at ${width}px`).toBeGreaterThan(0)
    }
  }
})
