import { type Page, expect, test } from '@playwright/test'
import { CAST } from '@/components/home/street/cast'
import { TRANSLATED_LANGS, homeRoute, type ReadingLang } from '@/lib/content/languages'
import { HOME_COPY } from '@/lib/home-copy'

/**
 * M58 — the people at the gate, in a browser.
 *
 * The home page has three modes (`street/motion.ts`): the walk (a wide window with motion
 * allowed), the still picture (reduced motion) and the stack (narrower windows, and no
 * script). The cast is placed on the gate's pavement in the first two from 900px up, and
 * lined up in a row under the gate below it. Every claim here is a rule for any cast: the
 * names come from `cast.ts`, never typed in, and nothing pins a position or a word.
 *
 * Each claim was seen failing under a named mutation before it was trusted (M58's report
 * in `kia-context/logs/PROGRESS.md` lists them).
 */

const WALK = { width: 1440, height: 900 }
/** Far enough into the walk that the chase has begun, and not so far the zoom is over. The
 * people stand until the last of them has turned to the gate (M72), measured at about 540px
 * at this window. */
const INTO_CHASE = 700
/** A small first scroll: the people still stand and can be read (M72). */
const FIRST_STEP = 120

const gate = (page: Page) => page.locator('.bz-street .cast-box .who-btn')
const row = (page: Page) => page.locator('.bz-street .cast-row .who-btn')
/** The clouds' script marks the street when it is wired; a click before that only focuses. */
const cloudsReady = (page: Page) => expect(page.locator('.bz-street[data-clouds]')).toHaveCount(1)
/** ScrollTrigger scrubs with a lag (`scrub: 0.9`), so a pose is read after it settles. */
const settle = (page: Page) => page.waitForTimeout(1600)

async function walk(page: Page, path = '/') {
  await page.setViewportSize(WALK)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(path)
  await expect(page.locator('html')).toHaveClass(/is-walk/)
}

/** Every language the home page is read in, with its address: from the registry, never typed in. */
const READINGS: ReadonlyArray<readonly [ReadingLang, string]> = (['en', ...TRANSLATED_LANGS] as ReadingLang[]).map(
  (lang) => [lang, homeRoute(lang)] as const,
)

for (const [lang, path] of READINGS) {
  test(`${lang}: every person at the gate is a named button, in the cast order, with a story as its description`, async ({ page }) => {
    await walk(page, path)
    await expect(gate(page)).toHaveCount(CAST.length)
    for (const [i, m] of CAST.entries()) {
      const words = HOME_COPY[lang].cast[m.id]
      const btn = gate(page).nth(i)
      await expect(btn).toHaveAttribute('data-who', m.id)
      // A name may end in a letter outside ASCII (Mihrî), where `\b` finds no boundary. The
      // name is the same in every language; the trade after it is the language's own.
      await expect(btn).toHaveAccessibleName(new RegExp(`^${m.name}(?![\\p{L}\\d]).*${words.trade}$`, 'u'))
      await expect(btn).toHaveAccessibleDescription(words.story)
    }
  })
}

test('the captions show before the chase and are gone once it begins (walk)', async ({ page }) => {
  await walk(page)
  await expect(page.locator('.bz-street .cast-box .who-cap')).toHaveCount(CAST.length)
  for (const cap of await page.locator('.bz-street .cast-box .who-cap').all()) await expect(cap).toBeVisible()
  await page.evaluate((y) => window.scrollTo(0, y), INTO_CHASE)
  await settle(page)
  const shown = await page.locator('.bz-street .cast-box .who-cap').evaluateAll((caps) =>
    caps.filter((c) => Number(getComputedStyle(c).opacity) > 0.05).length,
  )
  expect(shown, 'a caption still shows while the people run').toBe(0)
})

test('in the still picture the people stand with their captions, and nobody runs', async ({ page }) => {
  await page.setViewportSize(WALK)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('html')).not.toHaveClass(/is-walk/)
  await expect(gate(page)).toHaveCount(CAST.length)
  for (const cap of await page.locator('.bz-street .cast-box .who-cap').all()) {
    await cap.scrollIntoViewIfNeeded()
    await expect(cap).toBeVisible()
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 3))
  await settle(page)
  const moved = await page.locator('.bz-street .cast-box .who-btn').evaluateAll((btns) =>
    btns.filter((b) => b.querySelector('svg')?.classList.contains('back') || b.querySelector('.mover')?.hasAttribute('transform')).length,
  )
  expect(moved, 'somebody turned or ran in the still picture').toBe(0)
  const running = await page.evaluate(() =>
    document.getAnimations().filter((a) => {
      const target = (a.effect as KeyframeEffect | null)?.target
      return target instanceof Element && target.closest('.bz-street .fig') !== null
    }).length,
  )
  expect(running, 'a figure still moves under reduced motion').toBe(0)
})

test('on a phone the people stand in a row under the gate, captioned, and none at the gate', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(gate(page).first()).toBeHidden()
  await expect(row(page)).toHaveCount(CAST.length)
  for (const btn of await row(page).all()) {
    await btn.scrollIntoViewIfNeeded()
    await expect(btn.locator('.who-cap')).toBeVisible()
    const box = (await btn.boundingBox())!
    expect(Math.min(box.width, box.height), 'a person is a target under 44px').toBeGreaterThanOrEqual(44)
  }
})

test('a story opens by keyboard focus, one at a time, and Escape closes it', async ({ page }) => {
  await walk(page)
  await cloudsReady(page)
  const first = gate(page).first()
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    if (await first.evaluate((b) => b === document.activeElement)) break
  }
  await expect(first).toBeFocused()
  await expect(first.locator('.who-cloud')).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(gate(page).nth(1).locator('.who-cloud')).toBeVisible()
  await expect(page.locator('.bz-street .who-btn[data-open]')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(page.locator('.bz-street .who-btn[data-open]')).toHaveCount(0)
})

test.describe('on a touch screen', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })
  test('a tap opens a story, a second tap or a tap elsewhere closes it', async ({ page }) => {
    await page.goto('/')
    await cloudsReady(page)
    const last = row(page).last()
    await last.scrollIntoViewIfNeeded()
    await last.tap()
    await expect(last.locator('.who-cloud')).toBeVisible()
    await last.tap()
    await expect(last.locator('.who-cloud')).toBeHidden()
    await last.tap()
    await page.locator('.bz-street .gate-copy h1').tap()
    await expect(page.locator('.bz-street .who-btn[data-open]')).toHaveCount(0)
  })
})

test('an open story stays inside the window, at both ends of the cast', async ({ page }) => {
  test.setTimeout(90_000) // several page loads: past 30s on a CI runner
  for (const width of [1024, 1440]) {
    await page.setViewportSize({ width, height: 768 })
    await page.goto('/')
    await cloudsReady(page)
    for (const btn of [gate(page).first(), gate(page).last()]) {
      // A click, not `.focus()` and Enter: focus already opens a story, and Enter toggles it.
      await btn.click()
      const cloud = btn.locator('.who-cloud')
      await expect(cloud).toBeVisible()
      const box = (await cloud.boundingBox())!
      expect(box.x, `${width}: a story starts off the left edge`).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width, `${width}: a story runs off the right edge`).toBeLessThanOrEqual(width)
      await page.keyboard.press('Escape')
    }
  }
})

test('once the people run they leave the tab order, and come back when the reader scrolls back up', async ({ page }) => {
  await walk(page)
  await expect(gate(page)).toHaveCount(CAST.length)
  await page.evaluate((y) => window.scrollTo(0, y), INTO_CHASE)
  await settle(page)
  expect(await gate(page).evaluateAll((b) => b.filter((x) => x.getAttribute('tabindex') === '-1' && x.getAttribute('aria-hidden') === 'true').length)).toBe(CAST.length)
  await expect(page.locator('.bz-street')).toHaveAttribute('data-chasing', 'true')
  await page.evaluate(() => window.scrollTo(0, 0))
  await settle(page)
  expect(await gate(page).evaluateAll((b) => b.filter((x) => x.hasAttribute('tabindex') || x.hasAttribute('aria-hidden')).length)).toBe(0)
})

test('no caption is covered by a person, in the walk and in the still picture', async ({ page }) => {
  // six page loads: more than the default 30s on a CI runner (measured 34s there)
  test.setTimeout(90_000)
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    for (const size of [{ width: 1024, height: 768 }, WALK, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(size)
      await page.emulateMedia({ reducedMotion })
      await page.goto('/')
      await expect(page.locator('.bz-street .cast-box .who-cap')).toHaveCount(CAST.length)
      for (const cap of await page.locator('.bz-street .cast-box .who-cap').all()) {
        await cap.scrollIntoViewIfNeeded()
        const covered = await cap.evaluate((c) => {
          const r = c.getBoundingClientRect()
          const points = [[r.left + 3, r.top + 3], [r.right - 3, r.top + 3], [r.left + 3, r.bottom - 3], [r.right - 3, r.bottom - 3]]
          return points.filter(([x, y]) => {
            const hit = document.elementFromPoint(x, y)
            return hit !== null && !c.contains(hit)
          }).length
        })
        expect(covered, `${reducedMotion} ${size.width}: a caption is covered (${await cap.textContent()})`).toBe(0)
      }
    }
  }
})

/* `.bz-street` clips sideways, so a person off the edge would never widen the document:
   each person and caption is measured against the window instead (M58 review). */
test('every person and caption stays inside the window, in any mode and at any width', async ({ page }) => {
  test.setTimeout(90_000) // several page loads: past 30s on a CI runner
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    for (const width of [390, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
      await page.emulateMedia({ reducedMotion })
      await page.goto('/')
      const shown = page.locator('.bz-street .who-btn:visible, .bz-street .who-cap:visible')
      expect(await shown.count(), `${reducedMotion} ${width}: no person is shown`).toBeGreaterThanOrEqual(CAST.length)
      const outside = await shown.evaluateAll((els) => els
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.left < -0.5 || r.right > document.documentElement.clientWidth + 0.5).length)
      expect(outside, `${reducedMotion} ${width}: a person or caption is off the window`).toBe(0)
    }
  }
})

test('clicking a person opens their story and leaves the walk where it is', async ({ page }) => {
  await walk(page)
  // Before the chase begins (later, a person refuses to open), and past the point the
  // old focus handler jumped the walk back to.
  await page.evaluate(() => window.scrollTo(0, 40))
  await settle(page)
  const before = await page.evaluate(() => window.scrollY)
  await cloudsReady(page)
  await gate(page).first().click()
  await expect(gate(page).first().locator('.who-cloud')).toBeVisible()
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - before), 'the click moved the walk').toBeLessThan(4)
})

test('opening the stories writes nothing to storage', async ({ page }) => {
  await walk(page)
  const before = await page.evaluate(() => [JSON.stringify(localStorage), JSON.stringify(sessionStorage)])
  await expect(gate(page)).toHaveCount(CAST.length)
  await cloudsReady(page)
  for (const btn of await gate(page).all()) {
    await btn.click()
    await expect(btn.locator('.who-cloud')).toBeVisible()
  }
  const after = await page.evaluate(() => [JSON.stringify(localStorage), JSON.stringify(sessionStorage)])
  expect(after).toEqual(before)
})

test('on the walk no two captions touch and none leaves the window, from the smallest walk up', async ({ page }) => {
  test.setTimeout(90_000) // several page loads: past 30s on a CI runner
  for (const size of [{ width: 900, height: 560 }, { width: 900, height: 600 }, { width: 1280, height: 720 }, WALK]) {
    await page.setViewportSize(size)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/')
    await expect(page.locator('html')).toHaveClass(/is-walk/)
    const caps = page.locator('.bz-street .cast-box .who-cap')
    await expect(caps).toHaveCount(CAST.length)
    const boxes = await caps.evaluateAll((els) => els.map((el) => {
      const r = el.getBoundingClientRect()
      return { left: r.left, right: r.right, bottom: r.bottom, text: el.textContent ?? '' }
    }))
    for (const [i, box] of boxes.entries()) {
      expect(box.bottom, `${size.width}x${size.height}: ${box.text} runs off the bottom`).toBeLessThanOrEqual(size.height + 0.5)
      if (i > 0) expect(boxes[i - 1].right, `${size.width}x${size.height}: ${boxes[i - 1].text} touches ${box.text}`).toBeLessThanOrEqual(box.left + 0.5)
    }
  }
})

test('the character beside each track tells a story too, opened like the people at the gate (M63)', async ({ page }) => {
  await page.setViewportSize(WALK)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await cloudsReady(page)
  const tracks = await page.locator('.bz-street .track').count()
  const tellers = page.locator('.bz-street .who-story')
  expect(tracks, 'no track on the page').toBeGreaterThan(0)
  await expect(tellers).toHaveCount(tracks)
  for (const teller of await tellers.all()) {
    await expect(teller).toHaveAccessibleDescription(/\S{2,}/)
    await teller.scrollIntoViewIfNeeded()
    await teller.click()
    await expect(teller.locator('.who-cloud')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(teller.locator('.who-cloud')).toBeHidden()
  }
})

test('after a small first scroll the people still stand captioned, and a story still opens (M72)', async ({ page }) => {
  await walk(page)
  await cloudsReady(page)
  await page.evaluate((y) => window.scrollTo(0, y), FIRST_STEP)
  await settle(page)
  await expect(page.locator('.bz-street')).not.toHaveAttribute('data-chasing', 'true')
  const faded = await page.locator('.bz-street .cast-box .who-cap').evaluateAll((caps) =>
    caps.filter((c) => Number(getComputedStyle(c).opacity) < 0.95).length,
  )
  expect(faded, 'a caption faded on the first small scroll').toBe(0)
  const first = gate(page).first()
  await first.click()
  await expect(first.locator('.who-cloud')).toBeVisible()
  // and it stays open through another small step of the wheel
  await page.evaluate((y) => window.scrollTo(0, y), FIRST_STEP * 2)
  await settle(page)
  await expect(first.locator('.who-cloud')).toBeVisible()
})

test('on the walk the Sipahi and the Bezirgân tell their stories at the choice, after the chase (M72)', async ({ page }) => {
  await walk(page)
  await cloudsReady(page)
  const tellers = page.locator('.bz-street .who-story')
  expect(await tellers.count()).toBeGreaterThan(0)
  for (const teller of await tellers.all()) {
    // focusing a teller brings the walk to the choice (motion.ts), long after the people ran;
    // a key press first makes it a keyboard focus, which is what opens a story
    await page.keyboard.press('Shift')
    await teller.focus()
    await settle(page)
    await expect(page.locator('.bz-street')).toHaveAttribute('data-chasing', 'true')
    // focus alone opened it, and the walk's jump to the choice did not close it
    await expect(teller).toHaveAttribute('data-open', '')
    // still open once the walk has settled: it scrubs with a lag after the focus moved it
    await settle(page)
    const cloud = teller.locator('.who-cloud')
    await expect(cloud).toBeVisible()
    // placed for where the teller stands now, not where they stood when it opened
    const box = (await cloud.boundingBox())!
    expect(box.x, 'the story starts off the left edge').toBeGreaterThanOrEqual(0)
    expect(box.x + box.width, 'the story runs off the right edge').toBeLessThanOrEqual(WALK.width)
    await page.keyboard.press('Escape')
  }
})

test('Bit\'s story is drawn over the way in, not under it (M72)', async ({ page }) => {
  // At this window Bit's cloud reaches up into the button's box, which is what was hidden.
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await expect(page.locator('html')).toHaveClass(/is-walk/)
  await cloudsReady(page)
  const bit = page.locator('.bz-street .cast-box .who-btn[data-who="bit"]')
  await bit.click()
  const cloud = bit.locator('.who-cloud')
  await expect(cloud).toBeVisible()
  const covered = await cloud.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const misses: number[] = []
    for (let i = 1; i < 10; i += 1) {
      const x = r.left + (r.width * i) / 10
      const hit = document.elementFromPoint(x, r.top + 4)
      if (hit === null || !el.contains(hit)) misses.push(Math.round(x))
    }
    return misses
  })
  expect(covered, 'something is drawn over the top of Bit\'s story').toEqual([])
})

test('the walk draws the people larger than the still picture does, at the same window (M63)', async ({ page }) => {
  const height = async (reducedMotion: 'reduce' | 'no-preference') => {
    await page.setViewportSize(WALK)
    await page.emulateMedia({ reducedMotion })
    await page.goto('/')
    const art = (await page.locator('#archBox').boundingBox())!.height
    const person = (await gate(page).first().boundingBox())!.height
    return person / art
  }
  const still = await height('reduce')
  const walking = await height('no-preference')
  expect(walking / still, 'a person on the walk, against the gate art, is not larger').toBeGreaterThan(1.3)
})

/**
 * The languages (the author's rule of 2026-11-09: only content is multilingual).
 *
 * A translated string is longer than the English one, and a cloud, a caption or a sign
 * was sized for English. These claims hold in every language the registry lists, so the
 * address, the words and the languages come from the registry and `lib/home-copy.ts`.
 */

/** Four points just inside an element, counted when something other than it or its children answers. */
const coveredCorners = (el: Element) => {
  const r = el.getBoundingClientRect()
  const points = [[r.left + 3, r.top + 3], [r.right - 3, r.top + 3], [r.left + 3, r.bottom - 3], [r.right - 3, r.bottom - 3]]
  return points.filter(([x, y]) => {
    const hit = document.elementFromPoint(x, y)
    return hit === null || !el.contains(hit)
  }).length
}

for (const [lang, path] of READINGS) {
  test(`${lang}: every story opens whole, inside the window, on a phone and on the walk`, async ({ page }) => {
    test.setTimeout(120_000) // two page loads and sixteen stories
    const words = HOME_COPY[lang]
    for (const size of [{ width: 390, height: 844 }, WALK]) {
      await page.setViewportSize(size)
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await page.goto(path)
      await cloudsReady(page)
      const people = size.width === 390 ? row(page) : gate(page)
      for (const btn of await people.all()) {
        await btn.scrollIntoViewIfNeeded()
        await btn.click()
        const cloud = btn.locator('.who-cloud')
        await expect(cloud).toBeVisible()
        const box = (await cloud.boundingBox())!
        const who = await btn.getAttribute('data-who')
        expect(box.x, `${lang} ${size.width}: ${who}'s story starts off the left edge`).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width, `${lang} ${size.width}: ${who}'s story runs off the right edge`).toBeLessThanOrEqual(size.width)
        expect(await cloud.evaluate(coveredCorners), `${lang} ${size.width}: ${who}'s story is cut or covered`).toBe(0)
        await page.keyboard.press('Escape')
      }
      for (const teller of await page.locator('.bz-street .who-story').all()) {
        await teller.scrollIntoViewIfNeeded()
        await page.keyboard.press('Shift')
        await teller.focus()
        await settle(page)
        const cloud = teller.locator('.who-cloud')
        await expect(cloud).toBeVisible()
        const box = (await cloud.boundingBox())!
        expect(box.x, `${lang} ${size.width}: a teller's story starts off the left edge`).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width, `${lang} ${size.width}: a teller's story runs off the right edge`).toBeLessThanOrEqual(size.width)
        expect(await cloud.evaluate(coveredCorners), `${lang} ${size.width}: a teller's story is cut or covered`).toBe(0)
        await page.keyboard.press('Escape')
      }
      // And it is the language's own story that opens.
      const told = await page.locator('.bz-street .who-story .who-cloud').allTextContents()
      expect(told).toEqual([words.tracks.eng.teller.story, words.tracks.all.teller.story])
    }
  })

  test(`${lang}: on the walk no two captions touch and none leaves the window`, async ({ page }) => {
    test.setTimeout(90_000)
    for (const size of [{ width: 900, height: 560 }, WALK]) {
      await page.setViewportSize(size)
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await page.goto(path)
      await expect(page.locator('html')).toHaveClass(/is-walk/)
      const boxes = await page.locator('.bz-street .cast-box .who-cap').evaluateAll((els) => els.map((el) => {
        const r = el.getBoundingClientRect()
        return { left: r.left, right: r.right, text: el.textContent ?? '' }
      }))
      expect(boxes.length).toBe(CAST.length)
      for (const [i, box] of boxes.entries()) {
        expect(box.left, `${lang} ${size.width}: ${box.text} starts off the left edge`).toBeGreaterThanOrEqual(-0.5)
        expect(box.right, `${lang} ${size.width}: ${box.text} runs off the right edge`).toBeLessThanOrEqual(size.width + 0.5)
        if (i > 0) expect(boxes[i - 1].right, `${lang} ${size.width}: ${boxes[i - 1].text} touches ${box.text}`).toBeLessThanOrEqual(box.left + 0.5)
      }
    }
  })
}
