import { type Page, expect, test } from '@playwright/test'
import { loadAllModules, loadModuleIn } from '@/lib/content/loader'
import { CATEGORIES } from '@/lib/content/curriculum-file'
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

test('a Persian page searches its own language first, and pressing English narrows to it', async ({ page }) => {
  test.skip(PERSIAN === undefined, 'no module has a Persian page')
  const persian = moduleRoute(PERSIAN!.slug, 'engineers', 'fa')
  await page.goto(persian)
  await page.keyboard.press('Control+k')
  await field(page).fill(PERSIAN!.frontmatter.title)
  // Its own language first. The page itself need not top the list: a module's For Everyone
  // version shares its title, and a shut filter searches both tracks (D104).
  await expect(results(page).first()).toHaveAttribute('lang', 'fa')
  await expect(hit(page, persian)).toBeVisible()
  await openFilters(page)
  await chip(page, 'English').click()
  await expect(hit(page, persian)).toHaveCount(0)
  await chip(page, 'English').click()
  await expect(results(page).first()).toHaveAttribute('lang', 'fa')
  await expect(hit(page, persian)).toBeVisible()
})

/* ---- D103/D104: the filters behind a disclosure, and the bar on each result ---- */

const chip = (page: Page, name: string) => dialog(page).getByRole('button', { name, exact: true })
const toggle = (page: Page) => dialog(page).getByRole('button', { name: 'Filters', exact: true })
const results = (page: Page) => dialog(page).locator('.bz-search-results a')
const hit = (page: Page, href: string) => dialog(page).locator(`.bz-search-results a[href="${href}"]`)
const hrefs = (page: Page) => results(page).evaluateAll((links) => links.map((a) => a.getAttribute('href')))
const levelOfModule = (_slug: string) => WRITTEN.category
const OTHER_LEVEL = CATEGORIES.find((c) => c.slug !== levelOfModule(WRITTEN.slug).slug)!
/** The one module written for For Everyone, if any: it is the only one found under that track. */
const EVERYONE = loadAllModules().find((m) => loadModuleIn(m.slug, 'en', 'everyone') !== undefined)

async function openWith(page: Page, path: string, query: string) {
  await page.goto(path)
  await page.keyboard.press('Control+k')
  await field(page).fill(query)
}

async function openFilters(page: Page) {
  if ((await toggle(page).getAttribute('aria-expanded')) !== 'true') await toggle(page).click()
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true')
}

test('the filters are shut by default, and a search then covers every track and language', async ({ page }) => {
  test.skip(PERSIAN === undefined, 'no module has a Persian page')
  const persian = moduleRoute(PERSIAN!.slug, 'engineers', 'fa')
  await page.goto('/')
  await page.keyboard.press('Control+k')
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false')
  await expect(toggle(page)).toHaveAttribute('aria-controls', 'bz-search-filters')
  await expect(chip(page, 'For Engineers')).toBeHidden()
  await expect(dialog(page).locator('#bz-search-filters')).toBeHidden()

  /* from an English page, with nothing touched: a Persian page is found, and so is English */
  await field(page).fill(PERSIAN!.frontmatter.title)
  await expect(hit(page, persian)).toBeVisible()
  await expect(dialog(page).locator('.bz-search-status')).toHaveText(/\d+\+? results?/)
  await field(page).fill(WRITTEN.frontmatter.title)
  await expect(hit(page, moduleRoute(WRITTEN.slug, 'engineers'))).toBeVisible()
  /* with every language searched, each row names its language */
  await expect(dialog(page).locator('.bz-search-meta').first()).toContainText(/English|Türkçe|فارسی/)
})

test('a search covers For Everyone as well as For Engineers while the filters are shut', async ({ page }) => {
  test.skip(EVERYONE === undefined, 'no module is written for For Everyone')
  await openWith(page, '/', EVERYONE!.frontmatter.title)
  await expect(hit(page, moduleRoute(EVERYONE!.slug, 'engineers'))).toBeVisible()
  await expect(hit(page, moduleRoute(EVERYONE!.slug, 'everyone'))).toBeVisible()
})

test('the other languages\' indexes load with the first search, not when the window opens', async ({ page }) => {
  const asked: string[] = []
  page.on('request', (r) => {
    const m = /\/search\/(\w+)\.json/.exec(r.url())
    if (m) asked.push(m[1])
  })
  await page.goto('/')
  await page.keyboard.press('Control+k')
  await expect.poll(() => asked.includes('en')).toBe(true)
  await page.waitForLoadState('networkidle')
  expect([...new Set(asked)], 'a language other than the page\'s was fetched before a search').toEqual(['en'])
  await field(page).fill(WRITTEN.frontmatter.title)
  await expect.poll(() => new Set(asked).size).toBe(3)
})

test('opening the filters changes nothing on its own', async ({ page }) => {
  await openWith(page, '/', WRITTEN.frontmatter.title)
  await expect(results(page).first()).toBeVisible()
  await expect(dialog(page).locator('.bz-search-status')).toHaveText(/\d+\+? results?/)
  const before = await hrefs(page)
  await openFilters(page)
  for (const c of [...CATEGORIES.map((c) => c.title), 'For Engineers', 'For Everyone', 'English', 'Türkçe', 'فارسی']) {
    await expect(chip(page, c)).toHaveAttribute('aria-pressed', 'false')
  }
  await expect(chip(page, 'Reset filters')).toHaveCount(0)
  expect(await hrefs(page)).toEqual(before)
})

test('a level chip narrows the results to that level, and Reset filters takes it back', async ({ page }) => {
  const own = levelOfModule(WRITTEN.slug)
  await openWith(page, '/', WRITTEN.frontmatter.title)
  await expect(results(page).first()).toHaveAttribute('href', moduleRoute(WRITTEN.slug, 'engineers'))
  await openFilters(page)

  await chip(page, OTHER_LEVEL.title).click()
  await expect(chip(page, OTHER_LEVEL.title)).toHaveAttribute('aria-pressed', 'true')
  await expect(hit(page, moduleRoute(WRITTEN.slug, 'engineers'))).toHaveCount(0)
  for (const meta of await dialog(page).locator('.bz-search-meta').allTextContents()) {
    expect(meta, 'a result outside the pressed level').toMatch(new RegExp(`^(${OTHER_LEVEL.title}|Level)`))
  }

  await chip(page, OTHER_LEVEL.title).click()
  await chip(page, own.title).click()
  await expect(results(page).first()).toHaveAttribute('href', moduleRoute(WRITTEN.slug, 'engineers'))
  for (const meta of await dialog(page).locator('.bz-search-meta').allTextContents()) {
    expect(meta, 'a result outside the pressed level').toMatch(new RegExp(`^(${own.title}|Level)`))
  }

  await chip(page, 'Reset filters').click()
  await expect(chip(page, own.title)).toHaveAttribute('aria-pressed', 'false')
  await expect(chip(page, 'Reset filters')).toHaveCount(0)
})

test('closing the panel stops the filtering, and opening it shows the same chips pressed and applies them again', async ({ page }) => {
  await openWith(page, '/', WRITTEN.frontmatter.title)
  await openFilters(page)
  await chip(page, OTHER_LEVEL.title).click()
  await expect(hit(page, moduleRoute(WRITTEN.slug, 'engineers'))).toHaveCount(0)

  await toggle(page).click()
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false')
  await expect(hit(page, moduleRoute(WRITTEN.slug, 'engineers'))).toBeVisible()

  await toggle(page).click()
  await expect(chip(page, OTHER_LEVEL.title)).toHaveAttribute('aria-pressed', 'true')
  await expect(hit(page, moduleRoute(WRITTEN.slug, 'engineers'))).toHaveCount(0)
})

test('the language chip narrows to one language, and a second press widens it again', async ({ page }) => {
  test.skip(PERSIAN === undefined, 'no module has a Persian page')
  const persian = moduleRoute(PERSIAN!.slug, 'engineers', 'fa')
  await openWith(page, '/', PERSIAN!.frontmatter.title)
  await expect(hit(page, persian)).toBeVisible()
  await openFilters(page)
  await chip(page, 'English').click()
  await expect(hit(page, persian)).toHaveCount(0)
  await chip(page, 'فارسی').click()
  await expect(hit(page, persian)).toBeVisible()
  await chip(page, 'English').click()
  await expect(chip(page, 'English')).toHaveAttribute('aria-pressed', 'false')
  await expect(results(page).first()).toHaveAttribute('lang', 'fa')
  for (const href of await hrefs(page)) {
    expect(href, 'a result that is not Persian').toMatch(/^\/fa\//)
  }
  await chip(page, 'فارسی').click()
  await expect(hit(page, persian)).toBeVisible()
})

test('the track chip gives For Everyone addresses, and only where the page is written', async ({ page }) => {
  test.skip(EVERYONE === undefined, 'no module is written for For Everyone')
  const everyone = moduleRoute(EVERYONE!.slug, 'everyone')
  await openWith(page, '/', EVERYONE!.frontmatter.title)
  await openFilters(page)
  await chip(page, 'For Everyone').click()
  await expect(results(page).first()).toHaveAttribute('href', everyone)
  for (const href of await hrefs(page)) {
    expect(href, 'an address outside For Everyone').toMatch(/^\/everyone\//)
  }
  /* an unwritten For Everyone module is absent rather than found: the index holds none */
  const written = new Set(loadAllModules().filter((m) => loadModuleIn(m.slug, 'en', 'everyone') !== undefined).map((m) => moduleRoute(m.slug, 'everyone')))
  const unwritten = loadAllModules().find((m) => !written.has(moduleRoute(m.slug, 'everyone')) && m.frontmatter.status === 'ready')
  if (unwritten) {
    await field(page).fill(unwritten.frontmatter.title)
    await expect(hit(page, moduleRoute(unwritten.slug, 'everyone'))).toHaveCount(0)
  }
})

test('each result has a bar in its level\'s colour on its start edge, and names the level in text', async ({ page }) => {
  await openWith(page, '/', WRITTEN.frontmatter.title)
  await expect(results(page).first()).toBeVisible()
  await openFilters(page)
  // the colour each level's chip shows, which is the catalog's own (`data-cat`)
  const keys = new Map<string, string>()
  for (const c of CATEGORIES) {
    keys.set(c.title, await dialog(page).locator(`.bz-chip[data-cat="${c.slug}"] .bz-chip-key`).evaluate((k) => getComputedStyle(k).backgroundColor))
  }
  expect(new Set(keys.values()).size, 'two levels share a colour').toBe(CATEGORIES.length)

  const rows = await dialog(page).locator('.bz-search-results li').evaluateAll((items) =>
    items.map((li) => {
      const key = li.querySelector('.bz-search-key')!.getBoundingClientRect()
      const title = li.querySelector('.bz-search-title')!.getBoundingClientRect()
      return {
        colour: getComputedStyle(li.querySelector('.bz-search-key')!).backgroundColor,
        title: li.querySelector('.bz-search-title')!.textContent ?? '',
        meta: li.querySelector('.bz-search-meta')!.textContent ?? '',
        width: key.width,
        height: key.height,
        startsBefore: key.right <= title.left + 0.5,
      }
    }),
  )
  expect(rows.length).toBeGreaterThan(0)
  for (const row of rows) {
    // a level's own row says `Level` in its meta and its name as its title
    const level = CATEGORIES.find((c) => row.meta.startsWith(c.title) || (row.meta.startsWith('Level') && row.title === c.title))
    expect(level, `no level named in: ${row.title} / ${row.meta}`).toBeDefined()
    expect(row.colour, `${row.meta}: bar is not ${level!.title}'s colour`).toBe(keys.get(level!.title))
    expect(row.width).toBe(4)
    expect(row.height).toBeGreaterThan(20)
    expect(row.startsBefore, 'the bar is not on the start edge').toBe(true)
  }
  expect(rows.some((r) => CATEGORIES.some((c) => r.meta.startsWith(c.title))), 'no result named its level').toBe(true)
})

test('a Persian result has its bar on the right, the start of its row', async ({ page }) => {
  test.skip(PERSIAN === undefined, 'no module has a Persian page')
  await openWith(page, moduleRoute(PERSIAN!.slug, 'engineers', 'fa'), PERSIAN!.frontmatter.title)
  await expect(results(page).first()).toBeVisible()
  const edge = await results(page).first().evaluate((a) => {
    const key = a.querySelector('.bz-search-key')!.getBoundingClientRect()
    const title = a.querySelector('.bz-search-title')!.getBoundingClientRect()
    return { keyAfterTitle: key.left >= title.right - 0.5 }
  })
  expect(edge.keyAfterTitle, 'the bar is not on the right of a Persian row').toBe(true)
})

test('Tab goes field, Close, Filters, then the results; the chips join the order only when the panel is open', async ({ page }) => {
  await openWith(page, '/', WRITTEN.frontmatter.title)
  await expect(results(page).first()).toBeVisible()
  await field(page).focus()
  await page.keyboard.press('Tab')
  await expect(dialog(page).getByRole('button', { name: 'Close' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(toggle(page)).toBeFocused()
  const ring = await toggle(page).evaluate((el) => {
    const s = getComputedStyle(el)
    return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) }
  })
  expect(ring.style).not.toBe('none')
  expect(ring.width).toBeGreaterThan(0)
  /* shut: the next stop is the first result, not a chip */
  await page.keyboard.press('Tab')
  await expect(results(page).first()).toBeFocused()

  /* Enter opens, Space shuts */
  await toggle(page).focus()
  await page.keyboard.press('Enter')
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Tab')
  const track = chip(page, 'For Engineers')
  await expect(track).toBeFocused()
  const chipRing = await track.evaluate((el) => {
    const s = getComputedStyle(el)
    return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) }
  })
  expect(chipRing.style).not.toBe('none')
  expect(chipRing.width).toBeGreaterThan(0)
  await page.keyboard.press('Tab')
  const everyone = chip(page, 'For Everyone')
  await expect(everyone).toBeFocused()
  await page.keyboard.press('Space')
  await expect(everyone).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Enter')
  await expect(everyone).toHaveAttribute('aria-pressed', 'false')
  await toggle(page).focus()
  await page.keyboard.press('Space')
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false')
})

test('the arrows still move into the results from the field while the panel is open, and Escape closes the window from the toggle, a chip or the field', async ({ page }) => {
  const icon = page.getByRole('button', { name: 'Search' })
  await page.goto('/')
  await icon.focus()
  await icon.press('Enter')
  await field(page).fill(WRITTEN.frontmatter.title)
  await openFilters(page)
  await field(page).focus()
  await page.keyboard.press('ArrowDown')
  await expect(results(page).first()).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(field(page)).toBeFocused()

  await toggle(page).focus()
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toBeHidden()
  await expect(icon).toBeFocused()

  await icon.press('Enter')
  await openFilters(page)
  await chip(page, 'For Engineers').focus()
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toBeHidden()
  await expect(icon).toBeFocused()

  await icon.press('Enter')
  await field(page).focus()
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toBeHidden()
  await expect(icon).toBeFocused()
})

test('with the panel shut and nothing to find, Tab from the last stop wraps to the field', async ({ page }) => {
  await openWith(page, '/', 'zzqqxxvv')
  await expect(dialog(page).locator('.bz-search-status')).toHaveText('No results')
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false')
  await toggle(page).focus()
  await page.keyboard.press('Tab')
  await expect(field(page)).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(toggle(page)).toBeFocused()
})

test('the chevron turns when the panel opens', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+k')
  const turned = () => dialog(page).locator('.bz-search-chevron').evaluate((c) => getComputedStyle(c).rotate)
  expect(await turned()).toBe('none')
  await toggle(page).click()
  expect(await turned()).toBe('180deg')
  await toggle(page).click()
  expect(await turned()).toBe('none')
})

test('in a Persian page the chevron still follows the label in the same direction as the dialog and the panel keeps inside it', async ({ page }) => {
  test.skip(PERSIAN === undefined, 'no module has a Persian page')
  await page.goto(moduleRoute(PERSIAN!.slug, 'engineers', 'fa'))
  await page.keyboard.press('Control+k')
  await openFilters(page)
  const geometry = await toggle(page).evaluate((button) => {
    const label = document.createRange()
    label.selectNodeContents([...button.childNodes].find((n) => n.nodeType === Node.TEXT_NODE)!)
    const text = label.getBoundingClientRect()
    const chevron = button.querySelector('svg')!.getBoundingClientRect()
    return { dir: getComputedStyle(button).direction, textLeft: text.left, textRight: text.right, chevronLeft: chevron.left, chevronRight: chevron.right }
  })
  if (geometry.dir === 'rtl') expect(geometry.chevronRight, 'the chevron is not after the label').toBeLessThanOrEqual(geometry.textLeft + 0.5)
  else expect(geometry.chevronLeft, 'the chevron is not after the label').toBeGreaterThanOrEqual(geometry.textRight - 0.5)
  const box = (await dialog(page).boundingBox())!
  for (const c of await dialog(page).locator('.bz-search-filters button').all()) {
    const b = (await c.boundingBox())!
    expect(b.x).toBeGreaterThanOrEqual(box.x)
    expect(b.x + b.width).toBeLessThanOrEqual(box.x + box.width + 1)
  }
})

test('on a phone the shut panel leaves the results more room, and the open one wraps inside the window', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openWith(page, '/', WRITTEN.frontmatter.title)
  await expect(results(page).first()).toBeVisible()
  const shut = (await results(page).first().boundingBox())!.y
  await openFilters(page)
  const box = (await dialog(page).boundingBox())!
  for (const c of await dialog(page).locator('.bz-search-filters button').all()) {
    const b = (await c.boundingBox())!
    expect(b.x, 'a chip starts left of the window').toBeGreaterThanOrEqual(box.x)
    expect(b.x + b.width, 'a chip runs past the window').toBeLessThanOrEqual(box.x + box.width + 1)
  }
  const open = (await results(page).first().boundingBox())!.y
  expect(open - shut, 'opening the panel did not push the results down').toBeGreaterThan(100)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  expect(await dialog(page).evaluate((d) => d.scrollWidth <= d.clientWidth)).toBe(true)
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
