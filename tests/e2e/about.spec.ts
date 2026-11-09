import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type Page, expect, test } from '@playwright/test'

/**
 * M90, D115 — the About page, against the built export.
 *
 * Every rule here holds for any story: the headings are read from `mini-courses/STORY.md` at test
 * time with a plain line scan, never written down, and a count is never asserted (tests/README.md).
 *
 * What is checked is what the page promises and no unit test can see: the story arrives in its
 * file's order; it is all there, visible, with the script blocked and under reduced motion; a phone
 * never scrolls sideways and puts the text above its scene; and no scene sits in a box (the author:
 * "the fact that each animation is in a box is bad. in the final version I want no box.").
 */

const ROUTE = '/about/'
// `process.cwd()`: Playwright's transform gives a spec no `import.meta`, and the runner starts at the root.
const STORY = readFileSync(join(process.cwd(), 'mini-courses/STORY.md'), 'utf8')
const HEADINGS = STORY.split('\n')
  .filter((line) => /^## /.test(line))
  .map((line) => line.slice(3).trim())

/** Every piece of the story's text on the page, each scrolled to and measured where it stands. */
async function hiddenText(page: Page): Promise<string[]> {
  const count = await page.locator('.bz-about h2, .bz-about .copy p, .bz-about .motto-k, .bz-about .motto-q').count()
  const hidden: string[] = []
  for (let i = 0; i < count; i++) {
    const node = page.locator('.bz-about h2, .bz-about .copy p, .bz-about .motto-k, .bz-about .motto-q').nth(i)
    await node.scrollIntoViewIfNeeded()
    const problem = await node.evaluate((el) => {
      const rect = el.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) return 'has no size'
      if (rect.bottom <= 0 || rect.top >= innerHeight) return 'is off screen after scrolling to it'
      let opacity = 1
      for (let at: Element | null = el; at; at = at.parentElement) {
        const style = getComputedStyle(at)
        opacity *= Number(style.opacity)
        if (style.visibility !== 'visible' && at === el) return `is visibility: ${style.visibility}`
        if (style.display === 'none') return 'is not displayed'
      }
      return opacity < 0.99 ? `is drawn at opacity ${opacity.toFixed(2)}` : null
    })
    if (problem) hidden.push(`${(await node.textContent())?.slice(0, 40)}… ${problem}`)
  }
  return hidden
}

test('tells STORY.md, one stall per ## section, in the file\'s order', async ({ page }) => {
  expect(HEADINGS.length, 'STORY.md has no ## heading; is it still there?').toBeGreaterThan(1)
  await page.goto(ROUTE)
  await expect(page.locator('main h1')).toHaveCount(1)
  await expect(page.locator('.bz-about section.stall h2')).toHaveText(HEADINGS)
  // Each stall carries a scene beside its text, and the motto closes the page.
  await expect(page.locator('.bz-about section.stall .slot')).toHaveCount(HEADINGS.length)
  await expect(page.locator('.bz-about .motto-q')).toHaveCount(1)
})

test.describe('with the script blocked', () => {
  test.use({ javaScriptEnabled: false })

  test('the whole story is visible, and nothing is pinned', async ({ page }) => {
    await page.goto(ROUTE)
    expect(await hiddenText(page)).toEqual([])
    await expect(page.locator('.pin-spacer')).toHaveCount(0)
  })
})

test.describe('under reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  test('the whole story is visible, nothing moves and nothing is pinned', async ({ page }) => {
    await page.goto(ROUTE)
    await page.waitForLoadState('networkidle')
    // Long enough for the island to have loaded and decided.
    await page.waitForTimeout(1000)
    await expect(page.locator('.bz-about')).not.toHaveAttribute('data-motion')
    expect(await hiddenText(page)).toEqual([])
    await expect(page.locator('.pin-spacer')).toHaveCount(0)
  })
})

test.describe('at a phone\'s width', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('nothing scrolls sideways, nothing pins, and each stall\'s text stands above its scene', async ({ page }) => {
    await page.goto(ROUTE)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    for (const at of [0, 0.25, 0.5, 0.75, 1]) {
      await page.evaluate((f) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), at)
      const width = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
      expect(width[0], `the page scrolls sideways at ${at * 100}% down`).toBeLessThanOrEqual(width[1])
    }
    await expect(page.locator('.pin-spacer')).toHaveCount(0)
    const order = await page.locator('.bz-about section.stall').evaluateAll((stalls) =>
      stalls.map((stall) => {
        const copy = stall.querySelector('.copy')!.getBoundingClientRect()
        const slot = stall.querySelector('.slot')!.getBoundingClientRect()
        return copy.bottom <= slot.top + 1 ? null : `${stall.id}: text ends at ${copy.bottom}, scene starts at ${slot.top}`
      }),
    )
    expect(order.filter(Boolean)).toEqual([])
  })
})

test('no scene sits in a box', async ({ page }) => {
  await page.goto(ROUTE)
  await page.waitForLoadState('networkidle')
  const slots = page.locator('.bz-about .slot')
  const count = await slots.count()
  expect(count).toBeGreaterThan(0)
  const boxes: string[] = []
  let canvases = 0
  for (let i = 0; i < count; i++) {
    const slot = slots.nth(i)
    await slot.scrollIntoViewIfNeeded()
    // Let the stall's motion bring the scene in and the island wrap it.
    await page.waitForTimeout(2200)
    const found = await slot.evaluate((root) => {
      const area = root.getBoundingClientRect()
      const bad: string[] = []
      const name = (el: Element) => `${root.closest('section')?.id} ${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`
      const transparent = (colour: string) => colour === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(colour)
      // The slot, its scene, and anything inside drawn across most of the slot: a backdrop is a box.
      const candidates = [root, ...root.querySelectorAll('*')].filter((el) => {
        if (el === root || el.matches('[data-scene]')) return true
        const r = el.getBoundingClientRect()
        return r.width >= area.width * 0.9 && r.height >= area.height * 0.9 && !(el instanceof SVGElement && !(el instanceof SVGSVGElement))
      })
      for (const el of candidates) {
        const style = getComputedStyle(el)
        for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
          if (style[`border${side}Style`] !== 'none' && parseFloat(style[`border${side}Width`]) > 0) bad.push(`${name(el)} has a ${side.toLowerCase()} border`)
        }
        if (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) bad.push(`${name(el)} has an outline`)
        if (style.boxShadow !== 'none') bad.push(`${name(el)} has a shadow`)
        if (!transparent(style.backgroundColor)) bad.push(`${name(el)} is filled with ${style.backgroundColor}`)
        if (el === root || el.matches('[data-scene]')) {
          if (style.overflowX !== 'visible' || style.overflowY !== 'visible') bad.push(`${name(el)} clips its art at the slot's edge`)
          if (style.clipPath !== 'none') bad.push(`${name(el)} is clipped`)
        }
      }
      // A canvas scene is transparent where it meets its corners, so the ground shows through.
      let canvas = 0
      for (const cv of root.querySelectorAll('canvas')) {
        canvas++
        const ctx = cv.getContext('2d')
        if (!ctx) continue
        const w = cv.width
        const h = cv.height
        for (const [x, y] of [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]]) {
          const alpha = ctx.getImageData(x, y, 1, 1).data[3]
          if (alpha > 8) bad.push(`${name(cv)} is painted at its corner (${x}, ${y}), alpha ${alpha}`)
        }
      }
      return { bad, canvas }
    })
    boxes.push(...found.bad)
    canvases += found.canvas
  }
  expect(boxes).toEqual([])
  // The corner check read a canvas at all: the haystack is drawn on one once its stall arrives.
  expect(canvases, 'no canvas scene was ever created, so its corners were never read').toBeGreaterThan(0)
})
