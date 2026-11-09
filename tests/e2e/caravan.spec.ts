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


/** The strip's thumb: where the view is, in months, and the last month. */
async function thumb(page: Page): Promise<{ now: number; max: number }> {
  return page.locator('.cv-scrub-thumb').evaluate((el) => ({
    now: Number(el.getAttribute('aria-valuenow')),
    max: Number(el.getAttribute('aria-valuemax')),
  }))
}

const road = (page: Page) => page.locator('.cv-road').evaluate((el) => (el as HTMLElement).style.transform)

/** Tab from the notice until a stop has focus, as a keyboard reader would. */
async function tabToStop(page: Page): Promise<void> {
  await page.locator('.cv-notice').click()
  for (let presses = 0; presses < 40; presses += 1) {
    await page.keyboard.press('Tab')
    if (await page.evaluate(() => document.activeElement?.classList.contains('cv-stop'))) return
  }
  throw new Error('Tab never reached a stop')
}

/** WCAG relative luminance contrast of two computed `rgb()` colours. */
function contrast(a: string, b: string): number {
  const lum = (c: string) => {
    const [r, g, bl] = (c.match(/[\d.]+/g) ?? []).slice(0, 3).map((v) => Number(v) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** The focused element's ring colour, and the colour it is drawn against. */
function ringOf(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement
    const target = el.classList.contains('cv-stop') ? el.querySelector('.cv-stop-lab') as HTMLElement : el
    const style = getComputedStyle(target)
    // The ground the ring sits on: the element's own fill for an inset ring, its nearest filled ancestor otherwise.
    let ground: Element | null = Number.parseFloat(style.outlineOffset) < 0 ? target : target.parentElement
    while (ground && ['rgba(0, 0, 0, 0)', 'transparent'].includes(getComputedStyle(ground).backgroundColor)) ground = ground.parentElement
    return { ring: style.outlineColor, width: style.outlineWidth, style: style.outlineStyle, ground: ground ? getComputedStyle(ground).backgroundColor : 'rgb(255, 255, 255)' }
  })
}

for (const viewport of [{ width: 1280, height: 720 }, { width: 1440, height: 800 }, { width: 1440, height: 900 }]) {
  test(`the whole caravan and the whole strip are in the window at load, close up and on long rods — ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await open(page)
    await expect.poll(async () => page.evaluate(() => {
      const stage = document.querySelector('.cv-stage')!.getBoundingClientRect()
      const strip = document.querySelector('.cv-scrub')!.getBoundingClientRect()
      const cloth = document.querySelector('.cv-screen')!.getBoundingClientRect()
      const members = [...document.querySelectorAll('.cv-member')]
      const puppets = members.map((m) => m.getBoundingClientRect())
      const bad: string[] = []
      if (window.scrollY !== 0) bad.push(`the page is scrolled by ${window.scrollY}`)
      if (stage.bottom > innerHeight) bad.push(`the stage ends at ${stage.bottom}`)
      if (strip.bottom > innerHeight) bad.push(`the strip ends at ${strip.bottom}`)
      if (puppets.length < 4) bad.push(`${puppets.length} puppets`)
      // The cloth is clipped 32px under the stage's top and 24px in from its sides.
      puppets.forEach((p, i) => {
        if (p.top < stage.top + 32 || p.left < stage.left + 24 || p.top > innerHeight) bad.push(`puppet ${i} at ${Math.round(p.left)},${Math.round(p.top)}`)
      })
      members.forEach((member, i) => {
        // The painted leather without its rod: what a reader sees as the puppet.
        const parts = [...member.querySelectorAll('.cv-puppet > :not(.cv-rod)')].map((el) => el.getBoundingClientRect())
        const body = { top: Math.min(...parts.map((r) => r.top)), bottom: Math.max(...parts.map((r) => r.bottom)) }
        // M93, the author: "the caravan should be about 30 percent higher". The first build drew
        // the leader at 11 to 12% of the window's height at these three sizes; the zoom draws it
        // at 14 to 16%, and 13.5% is between the two.
        if (i === 0 && body.bottom - body.top < innerHeight * 0.135) bad.push(`the leader is ${Math.round(body.bottom - body.top)} px tall in a ${innerHeight} px window`)
        // "it is not clearly visible that caravan objects are actually on a stick": each rod is
        // pinned inside its puppet and runs at least 20 px past the foot of the cloth.
        const rod = member.querySelector('.cv-rod')
        if (rod === null) {
          bad.push(`puppet ${i} has no rod`)
          return
        }
        const r = rod.getBoundingClientRect()
        if (r.top < body.top || r.top > body.bottom) bad.push(`puppet ${i}'s rod is not pinned to it`)
        const below = Math.min(r.bottom, stage.bottom) - cloth.bottom
        if (below < 20) bad.push(`puppet ${i}'s rod shows ${Math.round(below)} px below the cloth`)
      })
      return bad
    }), { timeout: 5000 }).toEqual([])
  })
}

test('the head is the title and the year bar, and a year\'s place is only announced', async ({ page }) => {
  await open(page)
  // M93, the author: remove the line under the title and the "2026 · The sea port" row.
  const head = await page.locator('.cv-head').evaluate((el) => ({
    children: [...el.children].map((child) => `${child.tagName.toLowerCase()}.${child.classList[0] ?? ''}`),
    text: (el as HTMLElement).innerText.replace(/\s+/g, ' ').trim(),
    years: [...el.querySelectorAll('[data-cv-year]')].map((b) => b.textContent?.trim()).join(' '),
  }))
  expect(head.children).toEqual(['h1.bz-display', 'div.cv-tools'])
  expect(head.text, 'the head says more than the title and the years').toBe(`Caravan ${head.years}`)
  await page.locator('[data-cv-year]').last().click()
  await expect(page.locator('[data-cv-announce]')).toHaveText(/^\d{4} · \S/)
  const shown = await page.evaluate(() => [...document.querySelectorAll('main *')]
    .filter((el) => !el.closest('.sr-only') && (el as HTMLElement).offsetParent !== null)
    .some((el) => [...el.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && /^\d{4} · /.test(node.textContent ?? ''))))
  expect(shown, 'a "year · place" row is on screen').toBe(false)
})

test('the year bar moves the journey to that year, and only a picked year is announced', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page)
  const years = page.locator('[data-cv-year]')
  const count = await years.count()
  expect(count, 'the year bar has fewer than two years').toBeGreaterThan(1)
  const announce = page.locator('[data-cv-announce]')

  // Crossing years on the strip moves the year bar's mark and announces nothing.
  await page.locator('.cv-scrub-thumb').focus()
  await page.keyboard.press('End')
  await expect(years.first()).not.toHaveAttribute('aria-current', 'true')
  await expect(announce).toHaveText('')

  for (let i = 0; i < count; i += 1) {
    const button = years.nth(i)
    const year = (await button.getAttribute('data-cv-year'))!
    const before = await road(page)
    await button.click()
    await expect(announce).toHaveText(new RegExp(`^${year} · \\S`))
    await expect(button).toHaveAttribute('aria-current', 'true')
    await expect(page.locator('[data-cv-year][aria-current]')).toHaveCount(1)
    expect(await road(page), `${year} did not move the scene`).not.toBe(before)
  }
})

test('a stop says when its card is open, Enter keeps it and moves focus into it, Escape gives focus back', async ({ page }) => {
  await open(page)
  await tabToStop(page)
  const index = await page.evaluate(() => [...document.querySelectorAll('.cv-stop')].indexOf(document.activeElement as Element))
  const stop = page.locator('.cv-stop').nth(index)
  const next = page.locator('.cv-stop').nth(index + 1)
  const card = page.locator('#cv-card')

  // Focus alone opens the card, and the stop says so; the arrow moves both.
  await expect(stop).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('ArrowRight')
  await expect(next).toBeFocused()
  await expect(next).toHaveAttribute('aria-expanded', 'true')
  await expect(stop).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.cv-stop[aria-expanded="true"]')).toHaveCount(1)

  const title = (await next.locator('.cv-stop-lab').textContent())!.trim()
  await page.keyboard.press('Enter')
  await expect(card).toBeVisible()
  await expect(card.locator('.cv-entry-title')).toHaveText(title)
  await expect(card.locator('.cv-entry-title'), 'Enter left focus outside the card').toBeFocused()
  await expect(next).toHaveAttribute('aria-expanded', 'true')
  if (await card.locator('a').count()) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.closest('#cv-card') !== null && document.activeElement?.tagName === 'A'),
      'Tab from the card heading did not reach its link').toBe(true)
  }

  await page.keyboard.press('Escape')
  await expect(card).toBeHidden()
  await expect(page.locator('.cv-stop[aria-expanded="true"]')).toHaveCount(0)
  await expect(next, 'Escape did not give focus back to the stop').toBeFocused()

  // A second Enter on the same stop keeps it once: no double toggle.
  await page.keyboard.press('Enter')
  await expect(card).toBeVisible()
  await expect(next).toHaveAttribute('aria-expanded', 'true')
})

test('Escape from elsewhere closes a card without taking focus', async ({ page }) => {
  await open(page)
  await page.locator('.cv-stop:not(.is-off) .cv-stop-lab').first().hover()
  await expect(page.locator('#cv-card')).toBeVisible()
  await page.locator('[data-cv-year]').first().focus()
  await page.keyboard.press('Escape')
  await expect(page.locator('#cv-card')).toBeHidden()
  await expect(page.locator('[data-cv-year]').first()).toBeFocused()
})

test('every focus ring on the leather, the card and the strip keeps 3:1 against what it sits on', async ({ page }) => {
  await open(page)
  const rings: string[] = []
  const check = async (where: string) => {
    const ring = await ringOf(page)
    expect(ring.style, `${where} has no ring`).not.toBe('none')
    const ratio = contrast(ring.ring, ring.ground)
    if (ratio < 3) rings.push(`${where}: ${ring.ring} on ${ring.ground} is ${ratio.toFixed(2)}:1`)
  }
  await tabToStop(page)
  await check('a stop')
  await page.keyboard.press('Enter')
  await expect(page.locator('#cv-card .cv-entry-title')).toBeFocused()
  await check('the card heading')
  await page.keyboard.press('Tab')
  await check('the first control in the card')
  await page.keyboard.press('Escape')
  for (let presses = 0; presses < 60; presses += 1) {
    await page.keyboard.press('Tab')
    if (await page.evaluate(() => document.activeElement?.classList.contains('cv-scrub-thumb'))) break
  }
  await expect(page.locator('.cv-scrub-thumb')).toBeFocused()
  await check('the strip')
  expect(rings).toEqual([])
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
    const stage = (await page.locator('.cv-stage').boundingBox())!
    expect(stage.y + stage.height, 'the stage is not wholly in the window, so the wheel below may miss it').toBeLessThanOrEqual(viewport.height)
    await page.mouse.move(stage.x + stage.width - 40, stage.y + stage.height - 30)

    const clashes = new Set<string>()
    let samples = 0
    let puppetPairs = 0
    let labelPostPairs = 0
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
          puppetPairs += 1
          if (meet(puppet, other)) clashes.add(`${puppet.what} meets ${other.what} at month ${now.thumb}`)
        }
      }
      for (const label of now.labels) {
        for (const post of now.posts) {
          labelPostPairs += 1
          if (meet(label, post)) clashes.add(`${label.what} meets ${post.what} at month ${now.thumb}`)
        }
      }
      if (now.thumb >= now.max && now.thumb === last) break
      last = now.thumb
      // Sideways, half a month or so a step, so no stop can pass the caravan between two samples.
      await page.mouse.wheel(30, 0)
    }
    expect(reached, 'the walk did not reach the end of the road').toBe(end)
    expect(samples, 'the walk took too few steps to see every stop pass').toBeGreaterThan(60)
    expect(puppetPairs, 'no puppet was compared with a stop').toBeGreaterThan(2000)
    // 50, not the first build's 100: since M93 a month is up to 340 px, not 260, so fewer labels
    // and posts are on the stage at once. Still far from none, which is what this guards.
    expect(labelPostPairs, 'no label was compared with a year\'s post').toBeGreaterThan(50)
    expect([...clashes]).toEqual([])
  })
}

test('the wheel walks the whole road in about 3,000 px, then the page scrolls on, at both ends', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page)
  const stage = (await page.locator('.cv-stage').boundingBox())!
  await page.mouse.move(stage.x + stage.width - 40, stage.y + stage.height - 30)
  const scrollY = () => page.evaluate(() => window.scrollY)

  // At the start, a wheel back up is the page's. (The view's centre starts a little ahead of the
  // first month, where the caravan stands at the left edge.)
  const start = (await thumb(page)).now
  await page.mouse.wheel(0, -200)
  expect((await thumb(page)).now, 'a wheel up at the start moved the caravan back').toBe(start)

  for (let i = 0; i < 15; i += 1) await page.mouse.wheel(0, 100)
  const half = await thumb(page)
  expect(await scrollY(), 'the page scrolled while the caravan still had road ahead').toBe(0)
  const share = (half.now - start) / (half.max - start)
  expect(share, '1,500 px of wheel is not about half the road').toBeGreaterThan(0.35)
  expect(share, '1,500 px of wheel is not about half the road').toBeLessThan(0.65)

  for (let i = 0; i < 25; i += 1) await page.mouse.wheel(0, 100)
  expect((await thumb(page)).now, '4,000 px of wheel did not reach the end of the road').toBe(half.max)
  await page.mouse.wheel(0, 300)
  await expect.poll(scrollY, { message: 'at the road\'s end the wheel did not scroll the page' }).toBeGreaterThan(0)
})

test('Shift and a wheel, and a sideways swipe, both move the caravan', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page)
  const stage = (await page.locator('.cv-stage').boundingBox())!
  await page.mouse.move(stage.x + stage.width - 40, stage.y + stage.height - 30)
  // Against where the road starts, not 0: the view's centre starts a little ahead of month 0, and
  // a first version of this case compared with 0 and passed with sideways swipes ignored.
  const start = (await thumb(page)).now
  await page.mouse.wheel(400, 0)
  const swiped = (await thumb(page)).now
  expect(swiped, 'a sideways swipe did not move the caravan').toBeGreaterThan(start)
  await page.keyboard.down('Shift')
  await page.mouse.wheel(0, 400)
  await page.keyboard.up('Shift')
  expect((await thumb(page)).now, 'Shift and a wheel did not move the caravan').toBeGreaterThan(swiped)
})

test('a drag on the picture pulls the road, and the strip walks it by month and by year', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page)
  const stage = (await page.locator('.cv-stage').boundingBox())!
  const y = stage.y + stage.height - 30
  const before = await thumb(page)
  const start = before.now
  await page.mouse.move(stage.x + stage.width - 60, y)
  await page.mouse.down()
  // 600 px: more than a month at any zoom (a month is up to 416 px since M93).
  await page.mouse.move(stage.x + stage.width - 660, y, { steps: 12 })
  await page.mouse.up()
  expect((await thumb(page)).now, 'dragging the road left did not move the caravan on').toBeGreaterThan(before.now)

  await page.locator('.cv-scrub-thumb').focus()
  await page.keyboard.press('Home')
  expect((await thumb(page)).now, 'Home did not go back to the start of the road').toBe(start)
  await page.keyboard.press('ArrowRight')
  expect((await thumb(page)).now).toBe(start + 1)
  await page.keyboard.press('PageDown')
  expect((await thumb(page)).now).toBe(start + 13)
  await page.keyboard.press('ArrowLeft')
  expect((await thumb(page)).now).toBe(start + 12)
  await page.keyboard.press('End')
  expect((await thumb(page)).now).toBe(before.max)
})

test('a resize draws the scene again with nothing left lit or dimmed', async ({ page }) => {
  await open(page)
  const stops = await page.locator('.cv-stop').count()
  await tabToStop(page)
  await page.keyboard.press('Enter')
  await expect(page.locator('.cv-stage.has-active')).toHaveCount(1)
  await expect(page.locator('.cv-stage.has-lit')).toHaveCount(1)
  const f = () => page.locator('.cv-stage').evaluate((el) => (el as HTMLElement).style.getPropertyValue('--cv-f'))
  const scale = await f()

  await page.setViewportSize({ width: 1440, height: 760 })
  await expect.poll(f, { message: 'the scene was not drawn again for the new height' }).not.toBe(scale)
  await expect(page.locator('.cv-stage.has-active')).toHaveCount(0)
  await expect(page.locator('.cv-stage.has-lit')).toHaveCount(0)
  await expect(page.locator('#cv-card')).toBeHidden()
  await expect(page.locator('.cv-stop')).toHaveCount(stops)
  await expect(page.locator('.cv-stop[aria-expanded="true"]')).toHaveCount(0)
})

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
  await expect(page.locator('[data-cv-year]').last()).toHaveAttribute('aria-current', 'true')
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
  const inFrame = await page.evaluate(() => new Promise<{ road: string; year: string }>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve({
      road: (document.querySelector('.cv-road') as HTMLElement).style.transform,
      year: document.querySelector('[data-cv-year][aria-current]')?.getAttribute('data-cv-year') ?? '',
    })))
  }))
  expect(inFrame.year, `one frame after the click the year bar marks "${inFrame.year}"`).toBe(year)
  await page.waitForTimeout(700)
  const settled = await road(page)
  expect(settled, 'the scene kept moving after the first frame').toBe(inFrame.road)
  const moving = await page.evaluate(() => document.querySelector('.cv-stage')!.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length)
  expect(moving, 'something in the scene is animating').toBe(0)
  await expect(page.locator('.cv-caravan.is-walking')).toHaveCount(0)
})

/* ---- M93: the list of trends, browsed the way the catalog is ---------------------------------- */

/** The titles of the entries on screen, in order. */
const shownTitles = (page: Page) => page.locator('.cv-entries > li:visible .cv-entry-title').allTextContents()

async function openList(page: Page): Promise<{ total: number; size: number }> {
  await open(page)
  await page.locator('.cv-list[data-cv-browse]').waitFor({ state: 'attached' })
  const total = await page.locator('.cv-entries > li').count()
  return { total, size: (await shownTitles(page)).length }
}

const count = (page: Page) => page.locator('.cv-list .bz-filter-count[role="status"]')

test('without a script every trend is listed and none of the controls are shown', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const bare = await context.newPage()
  await bare.goto(ROUTE)
  const all = await bare.locator('.cv-entries > li').count()
  expect(all, 'the page lists no trend, so this checks nothing').toBeGreaterThan(0)
  await expect(bare.locator('.cv-entries > li:visible')).toHaveCount(all)
  await expect(bare.locator('.cv-filters')).toBeHidden()
  await expect(bare.locator('.cv-pages')).toBeHidden()
  await context.close()
})

test('twelve trends to a page, Previous and Next disabled at the ends, the count, and focus at the heading', async ({ page }) => {
  const { total, size } = await openList(page)
  test.skip(total <= 12, 'the list fits on one page, so there is nothing to page through')
  expect(size).toBe(12)
  const pages = Math.ceil(total / 12)
  const previous = page.getByRole('button', { name: 'Previous page' })
  const next = page.getByRole('button', { name: 'Next page' })
  await expect(count(page)).toHaveText(`Showing 1–12 of ${total}`)
  await expect(previous).toBeDisabled()
  await expect(next).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Page 1', exact: true })).toHaveAttribute('aria-current', 'page')

  const seen = await shownTitles(page)
  for (let n = 2; n <= pages; n += 1) {
    await next.click()
    const first = (n - 1) * 12 + 1
    const last = Math.min(total, n * 12)
    await expect(count(page)).toHaveText(`Showing ${first}–${last} of ${total}`)
    await expect(page.locator('.cv-entries > li:visible')).toHaveCount(last - first + 1)
    await expect(page.getByRole('button', { name: `Page ${n}`, exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(page.locator('.cv-pages [aria-current="page"]')).toHaveCount(1)
    await expect(previous).toBeEnabled()
    await expect(page.locator('#cv-list-title'), 'a new page did not start at the list\'s heading').toBeFocused()
    seen.push(...await shownTitles(page))
  }
  await expect(next).toBeDisabled()
  // Every trend once, in the list's order, across the pages.
  expect(seen).toEqual(await page.locator('.cv-entries > li .cv-entry-title').allTextContents())

  await page.getByRole('button', { name: 'Page 1', exact: true }).click()
  await expect(previous).toBeDisabled()
  await expect(count(page)).toHaveText(`Showing 1–12 of ${total}`)
})

test('a year keeps every trend its span touches, and starts again at page 1', async ({ page }) => {
  const { total } = await openList(page)
  const barYears = (await page.locator('[data-cv-year]').allTextContents()).map(Number)
  const lastYear = Math.max(...barYears)
  // Each entry's years, from its period as the page prints it: an open trend runs to the last year.
  const spans = await page.locator('.cv-entries > li .cv-entry').evaluateAll((nodes) => nodes.map((node) => ({
    title: node.querySelector('.cv-entry-title')?.textContent ?? '',
    when: node.querySelector('.cv-entry-when')?.textContent ?? '',
  })))
  const touches = (when: string, year: number) => {
    const ys = (when.match(/\d{4}/g) ?? []).map(Number)
    const to = /^Since /.test(when) ? lastYear : Math.max(...ys)
    return year >= Math.min(...ys) && year <= to
  }
  const chips = page.locator('.cv-list .bz-chip-row')
  await expect(chips.getByRole('button').first()).toHaveText('All')
  await expect(chips.getByRole('button').first()).toHaveAttribute('aria-pressed', 'true')

  for (const year of barYears) {
    if (total > 12) {
      await chips.getByRole('button', { name: 'All', exact: true }).click()
      await page.getByRole('button', { name: 'Page 2', exact: true }).click()
    }
    await chips.getByRole('button', { name: String(year), exact: true }).click()
    await expect(chips.locator('[aria-pressed="true"]')).toHaveText(String(year))
    const expected = spans.filter((span) => touches(span.when, year)).map((span) => span.title)
    // Page 1 again: the count starts at 1, and the first twelve of the year are shown.
    await expect(count(page)).toHaveText(expected.length === 0 ? 'No trend matches' : `Showing 1–${Math.min(12, expected.length)} of ${expected.length}`)
    expect(await shownTitles(page), `${year} shows the wrong trends`).toEqual(expected.slice(0, 12))
  }
  await chips.getByRole('button', { name: 'All', exact: true }).click()
  await expect(count(page)).toHaveText(`Showing 1–${Math.min(12, total)} of ${total}`)
})

test('the search finds a trend by its text in any case, and an empty result says so and clears', async ({ page }) => {
  const { total } = await openList(page)
  const search = page.getByRole('searchbox', { name: 'Search:' })
  await expect(search).toBeVisible()

  if (total > 12) await page.getByRole('button', { name: 'Page 2', exact: true }).click()
  // A word from the last trend's text and not its title, in capitals: the search ignores case,
  // reads the text, and starts again at page 1. (The first version took the text's first long
  // word, which was in the title too, so a search of titles alone passed.)
  const last = page.locator('.cv-entries > li').last()
  const title = (await last.locator('.cv-entry-title').textContent())!.toLowerCase()
  const word = (await last.locator('.cv-entry-text').textContent())!.split(/\W+/)
    .filter((w) => w.length > 5 && !title.includes(w.toLowerCase()))[0]
  expect(word, 'the last trend\'s text has no long word its title lacks').toBeTruthy()
  await search.fill(word.toUpperCase())
  const titles = await shownTitles(page)
  expect(titles).toContain((await last.locator('.cv-entry-title').textContent())!)
  for (const entry of await page.locator('.cv-entries > li:visible .cv-entry').all()) {
    const words = `${await entry.locator('.cv-entry-title').textContent()} ${await entry.locator('.cv-entry-text').textContent()}`.toLowerCase()
    expect(words, 'a trend that does not hold the search is shown').toContain(word.toLowerCase())
  }
  await expect(count(page)).toHaveText(new RegExp(`^Showing 1–${titles.length} of \\d+$`))

  await search.fill('qqzzxxqq')
  await expect(page.locator('.cv-entries > li:visible')).toHaveCount(0)
  await expect(count(page)).toHaveText('No trend matches')
  await page.getByRole('button', { name: 'Show every trend' }).click()
  await expect(search).toHaveValue('')
  await expect(search).toBeFocused()
  await expect(count(page)).toHaveText(`Showing 1–${Math.min(12, total)} of ${total}`)
})

test('Cards and List switch the view, say which is pressed, and keep the page', async ({ page }) => {
  const { total } = await openList(page)
  const cards = page.locator('.cv-list .bz-viewbtn', { hasText: 'Cards' })
  const list = page.locator('.cv-list .bz-viewbtn', { hasText: 'List' })
  await expect(cards).toHaveAttribute('aria-pressed', 'true')
  await expect(list).toHaveAttribute('aria-pressed', 'false')
  const boxes = () => page.locator('.cv-entries > li:visible').evaluateAll((nodes) => nodes.map((n) => {
    const r = n.getBoundingClientRect()
    return { left: Math.round(r.left), top: Math.round(r.top) }
  }))
  const asCards = await boxes()
  expect(new Set(asCards.map((r) => r.top)).size, 'the cards are one to a row at 1440').toBeLessThan(asCards.length)

  if (total > 12) await page.getByRole('button', { name: 'Page 2', exact: true }).click()
  const before = await shownTitles(page)
  await list.click()
  await expect(list).toHaveAttribute('aria-pressed', 'true')
  await expect(cards).toHaveAttribute('aria-pressed', 'false')
  expect(await shownTitles(page), 'switching the view changed the page').toEqual(before)
  const asRows = await boxes()
  expect(new Set(asRows.map((r) => r.left)).size, 'the list is not one entry to a row').toBe(1)
  expect(new Set(asRows.map((r) => r.top)).size).toBe(asRows.length)
})

/** The first entry's edge and fill, at rest and under the pointer, and whether it moved or cast a shadow. */
async function hoverOf(page: Page) {
  const entry = page.locator('.cv-entries > li:visible .cv-entry').first()
  await entry.scrollIntoViewIfNeeded()
  const read = () => entry.evaluate((el) => {
    const style = getComputedStyle(el)
    return { edge: style.borderTopColor, fill: style.backgroundColor, transform: style.transform, shadow: style.boxShadow }
  })
  await page.mouse.move(0, 0)
  const rest = await read()
  await entry.hover()
  return { rest, hover: await read() }
}

test('a card and a row change colour under the pointer, as the catalog\'s do, and neither moves', async ({ page }) => {
  // M93, the author: "no need for shadow or 2px lift. but at least each card should get color
  // change or border color change similar to the ones in catalog".
  await openList(page)
  for (const view of ['Cards', 'List']) {
    await page.locator('.cv-list .bz-viewbtn', { hasText: view }).click()
    const { rest, hover } = await hoverOf(page)
    expect(hover.edge !== rest.edge || hover.fill !== rest.fill, `${view}: the entry looks the same under the pointer`).toBe(true)
    expect(hover.transform, `${view}: the entry moves under the pointer`).toBe('none')
    expect(hover.shadow, `${view}: the entry casts a shadow`).toBe('none')
  }
})
