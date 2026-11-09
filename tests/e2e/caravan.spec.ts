import { type Page, expect, test } from '@playwright/test'

/**
 * M91, D116 — Caravan (`/caravan/`), C4 Shadow Play, in a real engine.
 *
 * Every assertion is a rule that holds for any set of trends, the sample or the author's: nothing
 * here names a trend, counts them or quotes one. What is compared is the page with itself: the
 * stops the scene draws against the entries the server wrote, the card against the stop that
 * opened it, a puppet's box against every stop's box.
 *
 * The author's three changes to the first C4 are what the geometry cases hold: the caravan walks a
 * lower road so nothing moving covers a stop, and a stop's name never sits on a year's medallion
 * (in 2024 one did, in the mockup).
 */

const ROUTE = '/caravan/'

async function open(page: Page): Promise<void> {
  await page.goto(ROUTE)
  await page.locator('#caravan[data-cv-ready]').waitFor({ state: 'attached' })
}

test('the notice is the first thing in the page, on screen, and says the page is not ready', async ({ page }) => {
  await open(page)
  const first = await page.evaluate(() => {
    const main = document.querySelector('main')
    if (main === null) return null
    // The first rendered element of the page's own content that carries text of its own. The trail
    // is the site's, above every page but the front door (D79), so it is not the page's content.
    for (const el of main.querySelectorAll(':not(style, script, noscript, template)')) {
      if (el.closest('.bz-crumb')) continue
      const own = [...el.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '')
      if (own) return { inNotice: el.closest('.cv-notice') !== null }
    }
    return { inNotice: false }
  })
  expect(first, 'no text in <main> at all').not.toBeNull()
  expect(first!.inNotice, 'something in <main> comes before the notice').toBe(true)

  const notice = page.locator('.cv-notice')
  await expect(notice).toBeInViewport()
  await expect(notice).toContainText(/not ready/i)
  if (await page.locator('#caravan[data-sample]').count()) await expect(notice).toContainText(/sample/i)
  const [n, h] = await Promise.all([notice.boundingBox(), page.locator('main h1').boundingBox()])
  expect(n!.y + n!.height).toBeLessThanOrEqual(h!.y)
})

test('every trend is in the page without a script, and the scene draws exactly those trends', async ({ browser, page }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const bare = await context.newPage()
  await bare.goto(ROUTE)
  const entries = await bare.locator('[data-trend-entry]').evaluateAll((nodes) => nodes.map((node) => ({
    title: node.querySelector('.cv-entry-title')?.textContent?.trim() ?? '',
    when: node.querySelector('.cv-entry-when')?.textContent?.trim() ?? '',
    text: node.querySelector('.cv-entry-text')?.textContent?.trim() ?? '',
    groups: [...node.querySelectorAll('.cv-entry-group')].map((group) => ({
      heading: group.querySelector('h4')?.textContent?.trim() ?? '',
      links: [...group.querySelectorAll('li')].map((li) => li.textContent?.trim() ?? ''),
    })),
    sample: node.querySelector('.cv-entry-sample') !== null,
  })))
  const sample = (await bare.locator('#caravan[data-sample]').count()) > 0
  // The journey cannot move without a script, so it is not shown.
  await expect(bare.locator('.cv-journey')).toBeHidden()
  await context.close()

  expect(entries.length, 'the page lists no trend, so this checks nothing').toBeGreaterThan(0)
  for (const entry of entries) {
    expect(entry.title, 'an entry with no title').not.toBe('')
    expect(entry.when, `${entry.title} has no period`).not.toBe('')
    expect(entry.text, `${entry.title} has no text`).not.toBe('')
    expect(entry.groups.length, `${entry.title} links nowhere`).toBeGreaterThan(0)
    for (const group of entry.groups) {
      expect(group.heading, `${entry.title} has a link group with no heading`).not.toBe('')
      expect(group.links.length, `${entry.title}'s ${group.heading} is empty`).toBeGreaterThan(0)
      for (const link of group.links) expect(link, `${entry.title} has an empty link`).not.toBe('')
    }
    // While the page shows the sample, every trend says so on its own.
    expect(entry.sample, `${entry.title}: sample data not marked as such`).toBe(sample)
  }

  await open(page)
  const stops = await page.locator('.cv-stop .cv-stop-lab').allTextContents()
  expect(stops.map((one) => one.trim())).toEqual(entries.map((entry) => entry.title))
})

test('the year bar moves the journey to that year', async ({ page }) => {
  await open(page)
  const years = page.locator('[data-cv-year]')
  const count = await years.count()
  expect(count, 'the year bar has fewer than two years').toBeGreaterThan(1)
  const road = () => page.locator('.cv-road').evaluate((el) => (el as HTMLElement).style.transform)

  for (let i = count - 1; i >= 0; i -= 1) {
    const button = years.nth(i)
    const year = (await button.getAttribute('data-cv-year'))!
    const before = await road()
    await button.click()
    await expect(page.locator('.cv-place')).toHaveText(new RegExp(`^${year} · \\S`))
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-cv-year][aria-pressed="true"]')).toHaveCount(1)
    if (i < count - 1) expect(await road(), `${year} did not move the scene`).not.toBe(before)
  }
})

test('a stop opens on Enter and closes on Escape, by real key presses', async ({ page }) => {
  await open(page)
  await page.locator('.cv-notice').click()
  let focused = ''
  for (let presses = 0; presses < 40 && focused !== 'stop'; presses += 1) {
    await page.keyboard.press('Tab')
    focused = await page.evaluate(() => (document.activeElement?.classList.contains('cv-stop') ? 'stop' : ''))
  }
  expect(focused, 'Tab never reached a stop').toBe('stop')

  const stop = page.locator('.cv-stop:focus')
  const title = (await stop.locator('.cv-stop-lab').textContent())!.trim()
  const card = page.locator('#cv-card')
  await page.keyboard.press('Enter')
  await expect(stop).toHaveAttribute('aria-expanded', 'true')
  await expect(card).toBeVisible()
  await expect(card.locator('.cv-entry-title')).toHaveText(title)

  await page.keyboard.press('Escape')
  await expect(card).toBeHidden()
  await expect(page.locator(`.cv-stop[aria-expanded="true"]`)).toHaveCount(0)
  await expect(stop, 'Escape took focus off the stop').toBeFocused()

  // The arrows walk the stops in time order.
  const next = await page.evaluate(() => {
    const all = [...document.querySelectorAll('.cv-stop')]
    return all.indexOf(document.activeElement as Element) + 1
  })
  await page.keyboard.press('ArrowRight')
  expect(await page.evaluate(() => [...document.querySelectorAll('.cv-stop')].indexOf(document.activeElement as Element))).toBe(next)
})

interface Rect { l: number; r: number; t: number; b: number; what: string }

/** Every box that must not meet another, read off the live scene at its current position. */
function boxes(page: Page) {
  return page.evaluate(() => {
    const stage = document.querySelector('.cv-stage')!.getBoundingClientRect()
    const rect = (el: Element, what: string) => {
      const r = el.getBoundingClientRect()
      return { l: r.left, r: r.right, t: r.top, b: r.bottom, what }
    }
    const onStage = (r: { l: number; r: number }) => r.r > stage.left && r.l < stage.right
    const shown = (el: Element) => Number(getComputedStyle(el).opacity) > 0 && getComputedStyle(el).visibility !== 'hidden'
    const stops = [...document.querySelectorAll('.cv-stop:not(.is-off)')]
    const labels = stops.map((s) => s.querySelector('.cv-stop-lab')!).filter(shown).map((l) => rect(l, `label "${l.textContent}"`)).filter(onStage)
    return {
      puppets: [...document.querySelectorAll('.cv-member')].map((m, i) => rect(m, `puppet ${i}`)),
      props: [...document.querySelectorAll('.cv-stopg')].map((g) => rect(g, `prop ${(g as SVGGElement).dataset.id}`)).filter(onStage),
      hits: stops.map((s) => rect(s.querySelector('.cv-stop-hit')!, `stop ${(s as HTMLElement).dataset.trend}`)).filter(onStage),
      labels,
      posts: [...document.querySelectorAll('.cv-post')].map((p) => rect(p, `post ${p.textContent?.trim()}`)).filter(onStage),
      thumb: Number(document.querySelector('.cv-scrub-thumb')!.getAttribute('aria-valuenow')),
      max: Number(document.querySelector('.cv-scrub-thumb')!.getAttribute('aria-valuemax')),
    }
  })
}

const meet = (a: Rect, b: Rect) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t

for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }]) {
  test(`along the whole road, no puppet meets a stop and no stop's name meets a year's post — ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.slow()
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await open(page)
    // At 720px tall the stage's foot is below the fold, and a wheel turned outside the viewport
    // reaches nothing: this walk once stood still at the start and passed.
    await page.locator('.cv-stage').scrollIntoViewIfNeeded()
    const stage = (await page.locator('.cv-stage').boundingBox())!
    await page.mouse.move(stage.x + stage.width - 40, stage.y + stage.height - 30)

    const clashes = new Set<string>()
    let samples = 0
    let checkedPairs = 0
    let last = -1
    let reached = -1
    let end = 0
    for (let step = 0; step < 400; step += 1) {
      const now = await boxes(page)
      samples += 1
      reached = now.thumb
      end = now.max
      for (const puppet of now.puppets) {
        for (const other of [...now.props, ...now.hits, ...now.labels]) {
          checkedPairs += 1
          if (meet(puppet, other)) clashes.add(`${puppet.what} meets ${other.what} at month ${now.thumb}`)
        }
      }
      for (const label of now.labels) {
        for (const post of now.posts) {
          checkedPairs += 1
          if (meet(label, post)) clashes.add(`${label.what} meets ${post.what} at month ${now.thumb}`)
        }
      }
      if (now.thumb >= now.max && now.thumb === last) break
      last = now.thumb
      await page.mouse.wheel(120, 0)
    }
    expect(reached, 'the walk did not reach the end of the road').toBe(end)
    expect(samples, 'the walk took too few steps to see every stop pass').toBeGreaterThan(20)
    expect(checkedPairs, 'nothing was compared').toBeGreaterThan(1000)
    expect([...clashes]).toEqual([])
  })
}

test('no sideways scroll at a phone width, at rest, with a stop open, and at the end of the road', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page)
  const width = () => page.evaluate(() => document.documentElement.scrollWidth)
  expect(await width()).toBeLessThanOrEqual(390)
  await page.locator('.cv-stop:not(.is-off)').first().focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#cv-card')).toBeVisible()
  expect(await width()).toBeLessThanOrEqual(390)
  await page.keyboard.press('Escape')
  await page.locator('[data-cv-year]').last().click()
  await expect(page.locator('[data-cv-year]').last()).toHaveAttribute('aria-pressed', 'true')
  expect(await width()).toBeLessThanOrEqual(390)
})

test('under reduced motion the journey moves at once and nothing walks', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page)
  const years = page.locator('[data-cv-year]')
  const target = years.last()
  const year = (await target.getAttribute('data-cv-year'))!
  await target.click()
  // One frame later the scene is already where it is going.
  const inFrame = await page.evaluate(() => new Promise<{ road: string; place: string }>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve({
      road: (document.querySelector('.cv-road') as HTMLElement).style.transform,
      place: document.querySelector('.cv-place')?.textContent ?? '',
    })))
  }))
  expect(inFrame.place.startsWith(year), `one frame after the click the place is "${inFrame.place}"`).toBe(true)
  await page.waitForTimeout(700)
  const settled = await page.locator('.cv-road').evaluate((el) => (el as HTMLElement).style.transform)
  expect(settled, 'the scene kept moving after the first frame').toBe(inFrame.road)
  const moving = await page.evaluate(() => document.querySelector('.cv-stage')!.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length)
  expect(moving, 'something in the scene is animating').toBe(0)
  await expect(page.locator('.cv-caravan.is-walking')).toHaveCount(0)
})
