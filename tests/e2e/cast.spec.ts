import { type Page, expect, test } from '@playwright/test'
import { CAST } from '@/components/home/street/cast'

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
 * in `kia-context/logs/PROGRESS_3.md` lists them).
 */

const WALK = { width: 1440, height: 900 }
/** Far enough into the walk that the chase has begun, and not so far the zoom is over. */
const INTO_CHASE = 420

const gate = (page: Page) => page.locator('.bz-street .cast-box .who-btn')
const row = (page: Page) => page.locator('.bz-street .cast-row .who-btn')
/** ScrollTrigger scrubs with a lag (`scrub: 0.9`), so a pose is read after it settles. */
const settle = (page: Page) => page.waitForTimeout(1600)

async function walk(page: Page) {
  await page.setViewportSize(WALK)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await expect(page.locator('html')).toHaveClass(/is-walk/)
}

test('every person at the gate is a named button, in the cast order, with a story as its description', async ({ page }) => {
  await walk(page)
  await expect(gate(page)).toHaveCount(CAST.length)
  for (const [i, m] of CAST.entries()) {
    const btn = gate(page).nth(i)
    await expect(btn).toHaveAttribute('data-who', m.id)
    await expect(btn).toHaveAccessibleName(new RegExp(`^${m.name}\\b.*${m.trade}$`))
    await expect(btn).toHaveAccessibleDescription(m.story)
  }
})

test('the captions show before the chase and are gone once it begins (walk)', async ({ page }) => {
  await walk(page)
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
  for (const width of [1024, 1440]) {
    await page.setViewportSize({ width, height: 768 })
    await page.goto('/')
    for (const btn of [gate(page).first(), gate(page).last()]) {
      // A click, not \`.focus()\` and Enter: focus already opens a story, and Enter toggles it.
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
  await page.evaluate((y) => window.scrollTo(0, y), INTO_CHASE)
  await settle(page)
  expect(await gate(page).evaluateAll((b) => b.filter((x) => x.getAttribute('tabindex') === '-1' && x.getAttribute('aria-hidden') === 'true').length)).toBe(CAST.length)
  await expect(page.locator('.bz-street')).toHaveAttribute('data-chasing', 'true')
  await page.evaluate(() => window.scrollTo(0, 0))
  await settle(page)
  expect(await gate(page).evaluateAll((b) => b.filter((x) => x.hasAttribute('tabindex') || x.hasAttribute('aria-hidden')).length)).toBe(0)
})

test('no caption is covered by a person, in the walk and in the still picture', async ({ page }) => {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    for (const size of [{ width: 1024, height: 768 }, WALK, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(size)
      await page.emulateMedia({ reducedMotion })
      await page.goto('/')
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

test('the cast pushes no page sideways, in any mode and at any width', async ({ page }) => {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    for (const width of [390, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
      await page.emulateMedia({ reducedMotion })
      await page.goto('/')
      const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(sideways, `${reducedMotion} ${width}`).toBeLessThanOrEqual(0)
    }
  }
})

test('opening the stories writes nothing to storage', async ({ page }) => {
  await walk(page)
  const before = await page.evaluate(() => [JSON.stringify(localStorage), JSON.stringify(sessionStorage)])
  for (const btn of await gate(page).all()) {
    await btn.focus()
    await btn.press('Enter')
  }
  const after = await page.evaluate(() => [JSON.stringify(localStorage), JSON.stringify(sessionStorage)])
  expect(after).toEqual(before)
})
