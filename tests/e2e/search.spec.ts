import { type Page, expect, test } from '@playwright/test'
import { loadAllModules, loadModuleIn } from '@/lib/content/loader'
import { moduleRoute } from '@/lib/tracks'
import { searchDocs } from '@/lib/search/documents'
import { A0 } from './sheets'

/**
 * M59 (D95) — search in a browser: the window, its keys, when the index loads, and that a
 * module is found and opened. The term searched for is a written module's own title, read
 * from the corpus here; no word is typed into the test.
 */

const WRITTEN = loadAllModules().find((m) => m.frontmatter.status === 'ready')!
/** A written module that has a Persian page, for the language check. */
const PERSIAN = loadAllModules().map((m) => loadModuleIn(m.slug, 'fa')).find((m) => m !== undefined)

const dialog = (page: Page) => page.locator('dialog.bz-search')
const field = (page: Page) => dialog(page).getByRole('searchbox', { name: 'Search the course' })

test('the index is not fetched with the page, and is fetched when the window first opens', async ({ page }) => {
  const asked: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('/search/')) asked.push(r.url())
  })
  await page.goto(A0.path)
  await page.waitForLoadState('networkidle')
  expect(asked, 'the page fetched the search index on load').toEqual([])
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(dialog(page)).toBeVisible()
  await expect.poll(() => asked.length).toBeGreaterThan(0)
})

test('Ctrl+K and / open the window with the field focused; Escape closes it and focus goes back', async ({ page }) => {
  await page.goto(A0.path)
  await page.locator('body').click()
  await page.keyboard.press('Control+k')
  await expect(dialog(page)).toBeVisible()
  await expect(field(page)).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toBeHidden()
  await page.keyboard.press('/')
  await expect(dialog(page)).toBeVisible()
  await expect(field(page)).toBeFocused()
  await page.keyboard.press('Control+k')
  await expect(dialog(page)).toBeHidden()

  const icon = page.getByRole('button', { name: 'Search' })
  await icon.focus()
  await page.keyboard.press('Enter')
  await expect(dialog(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(icon).toBeFocused()
})

test('a module is found by its title and opened from the keyboard', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+k')
  await field(page).fill(WRITTEN.frontmatter.title)
  const first = dialog(page).locator('.bz-search-results a').first()
  await expect(first).toHaveAttribute('href', moduleRoute(WRITTEN.slug, 'engineers'))
  await page.keyboard.press('ArrowDown')
  await expect(first).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp(`${moduleRoute(WRITTEN.slug, 'engineers')}$`))
  await expect(dialog(page)).toBeHidden()
})

test('a Persian page searches its own language, and widening it loads the others', async ({ page }) => {
  test.skip(PERSIAN === undefined, 'no module has a Persian page')
  await page.goto(moduleRoute(PERSIAN!.slug, 'engineers', 'fa'))
  await page.keyboard.press('Control+k')
  await field(page).fill(PERSIAN!.frontmatter.title)
  const first = dialog(page).locator('.bz-search-results a').first()
  await expect(first).toHaveAttribute('href', moduleRoute(PERSIAN!.slug, 'engineers', 'fa'))
  const english = page.waitForRequest((r) => r.url().endsWith('/search/en.json'))
  await dialog(page).getByRole('checkbox', { name: 'All tracks and languages' }).check()
  await english
  await expect(first).toHaveAttribute('href', moduleRoute(PERSIAN!.slug, 'engineers', 'fa'))
})

test('on a phone the search icon leaves every main destination in view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(A0.path)
  await expect(page.getByRole('button', { name: 'Search' })).toBeVisible()
  const nav = (await page.locator('.bz-bar-nav > ul').boundingBox())!
  expect(await page.locator('.bz-bar-nav > ul > li').filter({ visible: true }).count(), 'no main destination is shown').toBeGreaterThan(1)
  for (const box of await page.locator('.bz-bar-nav > ul > li').filter({ visible: true }).evaluateAll((items) =>
    items.map((item) => ({ text: item.textContent?.trim() ?? '', right: item.getBoundingClientRect().right })))) {
    expect(box.right, `${box.text} runs past the bar's navigation`).toBeLessThanOrEqual(nav.x + nav.width + 1)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})

test('Escape closes the window even with text in the field; Enter opens the first result', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+k')
  await field(page).fill(WRITTEN.frontmatter.title)
  await expect(dialog(page).locator('.bz-search-results a').first()).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toBeHidden()
  await page.keyboard.press('Control+k')
  await field(page).fill(WRITTEN.frontmatter.title)
  const first = await dialog(page).locator('.bz-search-results a').first().getAttribute('href')
  await field(page).press('Enter')
  await expect(page).toHaveURL(new RegExp(`${first}$`))
})

test('Tab and Shift+Tab go round the window and never leave it', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+k')
  await field(page).fill(WRITTEN.frontmatter.title)
  await expect(dialog(page).locator('.bz-search-results a').first()).toBeVisible()
  const stops = await dialog(page).locator('input, button, a[href]').count()
  for (let i = 0; i < stops + 2; i++) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.querySelector('dialog.bz-search')?.contains(document.activeElement)), `Tab ${i + 1} left the window`).toBe(true)
  }
  await field(page).focus()
  await page.keyboard.press('Shift+Tab')
  expect(await page.evaluate(() => document.querySelector('dialog.bz-search')?.contains(document.activeElement)), 'Shift+Tab left the window').toBe(true)
})

test('a section result lands with its heading below the bar, also on the page already open', async ({ page }) => {
  // a section well down a written module, found by its own heading
  const sections = searchDocs('en').filter((d) => d.kind === 'section' && d.track === 'engineers' && d.url.startsWith(moduleRoute(WRITTEN.slug, 'engineers')))
  const doc = sections[Math.floor(sections.length / 2)]
  const target = doc.url
  await page.goto('/')
  await page.keyboard.press('Control+k')
  await field(page).fill(doc.section)
  await dialog(page).locator(`.bz-search-results a[href="${target}"]`).first().click()
  await expect(page).toHaveURL(new RegExp(`${target}$`))
  const id = decodeURIComponent(target.split('#')[1])
  const below = async () => page.evaluate((id) => {
    const bar = document.querySelector('.bz-bar')!.getBoundingClientRect().bottom
    return document.getElementById(id)!.getBoundingClientRect().top - bar
  }, id)
  await expect.poll(below).toBeGreaterThanOrEqual(0)
  // the same section again, from the page it is on, with its address already in the bar
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.keyboard.press('Control+k')
  await field(page).fill(doc.section)
  await dialog(page).locator(`.bz-search-results a[href="${target}"]`).first().click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await expect.poll(below).toBeGreaterThanOrEqual(0)
})
