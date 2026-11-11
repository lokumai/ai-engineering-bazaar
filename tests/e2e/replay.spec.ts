import fs from 'node:fs'
import path from 'node:path'
import { type Page, expect, test } from '@playwright/test'
import { isAnimatedImage } from '@/lib/content/animated'
import { TRANSLATED_LANGS, type ReadingLang } from '@/lib/content/languages'
import { loadAllModules } from '@/lib/content/loader'
import { PAGE_COPY } from '@/lib/content/page-copy'
import { CONTENT_ROOT } from '@/lib/content/paths'
import { moduleRoute } from '@/lib/tracks'

/**
 * D136 — every animated recording carries a replay control, and pressing it restarts the
 * animation from its first frame.
 *
 * The pages are picked from the corpus by the byte rule the build uses (`animated.ts`): the first
 * module that has an animated image and a translation in every language, and the first that has
 * only a still one. No slug, file or count is written down here.
 *
 * ## How a restart is proved
 *
 * A canvas can read what an `<img>` is showing right now: `drawImage(img)` paints the animation's
 * CURRENT frame, and `createImageBitmap` of the file's bytes paints its FIRST. So the test waits
 * until the image has moved off frame 0 (otherwise a press could not be told from doing nothing),
 * presses the button, and polls the image until it shows frame 0 again. A control that did nothing
 * leaves the image on whatever frame it was on and never matches.
 */

const imageLink = /!\[[^\]]*\]\((?:\.\/)?images\/([^)\s]+)\)/g

function pick(animated: boolean, everyLanguage: boolean) {
  for (const module of loadAllModules()) {
    if (everyLanguage && (module.translations.tr === null || module.translations.fa === null)) continue
    const files = [...module.body.matchAll(imageLink)].map((m) => m[1])
    const hits = files.filter((file) => {
      const full = path.join(CONTENT_ROOT, module.category.dir, 'images', file)
      return fs.existsSync(full) && isAnimatedImage(fs.readFileSync(full)) === animated
    })
    if (hits.length > 0) return { slug: `${module.category.slug}/${module.moduleSlug}`, count: hits.length }
  }
  return undefined
}

const MOVING = pick(true, true)
const STILL = pick(false, false)

const langs: ReadingLang[] = ['en', ...TRANSLATED_LANGS]

/**
 * The colour at the middle of the image as the PAGE draws it, from a screenshot of the element.
 * Not `drawImage(img)`: a canvas paints an animated image's FIRST frame whatever frame it is
 * showing (measured: 24 samples over 24 s of a looping recording, one hash), so it cannot tell a
 * restart from nothing.
 */
async function colour(page: Page, selector: string): Promise<'red' | 'blue'> {
  const png = await page.locator(selector).screenshot({ type: 'png' })
  return page.evaluate(async (b64) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0)
    const [r, , b] = ctx.getImageData(bitmap.width >> 1, bitmap.height >> 1, 1, 1).data
    return r > b ? 'red' : 'blue'
  }, png.toString('base64'))
}

test('the corpus has a recording and a still to test against', () => {
  expect(MOVING, 'no module with an animated image and all three languages').toBeDefined()
  expect(STILL, 'no module with a still image').toBeDefined()
})

for (const lang of langs) {
  test(`${lang}: an animated recording has a replay button named in the page's language`, async ({ page }) => {
    await page.goto(moduleRoute(MOVING!.slug, 'engineers', lang))
    const figures = page.locator('figure[data-hl-animated]')
    await expect(figures).toHaveCount(MOVING!.count)
    for (const figure of await figures.all()) {
      const button = figure.locator('[data-hl-replay]')
      await expect(button).toHaveCount(1)
      await expect(button).toHaveAttribute('aria-label', PAGE_COPY[lang].replay)
      await expect(button).toBeVisible()
    }
    if (lang !== 'en') expect(PAGE_COPY[lang].replay).not.toBe(PAGE_COPY.en.replay)
  })

  test(`${lang}: the button is reachable by keyboard and shows a focus ring`, async ({ page }) => {
    await page.goto(moduleRoute(MOVING!.slug, 'engineers', lang))
    const button = page.locator('figure[data-hl-animated] [data-hl-replay]').first()
    await button.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(button).toBeFocused()
    const outline = await button.evaluate((el) => getComputedStyle(el).outlineStyle)
    expect(outline).toBe('solid')
  })
}

/**
 * `tests/fixtures/two-frame.webp` is a 144-byte animated WebP: red for 1.5 s, then blue for a
 * minute, looping. It stands in for the recording's bytes (`page.route`), so the first frame has a
 * colour of its own and the press is checked against it. Blue means the animation has moved on;
 * red straight after a press means it started again from frame 0.
 */
test('pressing the button restarts the animation from its first frame, and fetches the file once', async ({ page }) => {
  const fixture = fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/two-frame.webp'))
  await page.route('**/course-images/**/*.webp', (route) => route.fulfill({ body: fixture, contentType: 'image/webp' }))
  await page.goto(moduleRoute(MOVING!.slug, 'engineers', 'en'))
  const selector = 'figure[data-hl-animated] img'
  const figure = page.locator('figure[data-hl-animated]').first()
  const img = figure.locator('img')
  await img.scrollIntoViewIfNeeded()
  const original = await img.evaluate((el: HTMLImageElement) => el.currentSrc)

  const requests: string[] = []
  page.on('request', (request) => { if (request.url().endsWith('.webp')) requests.push(request.url()) })

  const seen = new Set<string>()
  for (let press = 1; press <= 3; press += 1) {
    // Past the red frame: until then a press is indistinguishable from doing nothing.
    await expect.poll(() => colour(page, selector), { timeout: 15_000, intervals: [100] }).toBe('blue')
    await figure.locator('[data-hl-replay]').click()
    await expect.poll(() => colour(page, selector), { timeout: 5_000, intervals: [20], message: `press ${press} did not restart` }).toBe('red')
    const now = await img.evaluate((el: HTMLImageElement) => el.currentSrc)
    expect(now, `press ${press}`).toMatch(/^blob:/)
    expect(seen.has(now), `press ${press} reused a URL`).toBe(false)
    seen.add(now)
    expect(now).not.toBe(original)
  }
  // Three presses cost one fetch of the bytes, and none after the first.
  expect(requests.length).toBe(1)
})

test('what a press gives the image is the same bytes as the file', async ({ page }) => {
  await page.goto(moduleRoute(MOVING!.slug, 'engineers', 'en'))
  await expect(page.locator('figure[data-hl-animated] [data-hl-replay]')).toHaveCount(1)
  const same = await page.evaluate(async () => {
    const img = document.querySelector<HTMLImageElement>('figure[data-hl-animated] img')!
    const original = new Uint8Array(await (await fetch(img.currentSrc)).arrayBuffer())
    document.querySelector<HTMLButtonElement>('figure[data-hl-animated] [data-hl-replay]')!.click()
    while (!img.currentSrc.startsWith('blob:')) await new Promise((resolve) => setTimeout(resolve, 20))
    const given = new Uint8Array(await (await fetch(img.currentSrc)).arrayBuffer())
    return given.length === original.length && given.every((byte, i) => byte === original[i])
  })
  expect(same).toBe(true)
})

test('a still image has no replay button', async ({ page }) => {
  await page.goto(moduleRoute(STILL!.slug, 'engineers', 'en'))
  const stills = page.locator('figure.bz-image:not([data-hl-animated])')
  expect(await stills.count()).toBeGreaterThan(0)
  await expect(stills.locator('[data-hl-replay]')).toHaveCount(0)
})

test('without JavaScript the recording is marked and there is no button', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  const page = await context.newPage()
  await page.goto(moduleRoute(MOVING!.slug, 'engineers', 'en'))
  await expect(page.locator('figure[data-hl-animated]')).toHaveCount(MOVING!.count)
  await expect(page.locator('[data-hl-replay]')).toHaveCount(0)
  await context.close()
})

test('at 390px the button has a 44px target and sits in the image corner', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(moduleRoute(MOVING!.slug, 'engineers', 'en'))
  const button = page.locator('figure[data-hl-animated] [data-hl-replay]').first()
  await button.scrollIntoViewIfNeeded()
  const hit = await button.evaluate((el) => {
    const pseudo = getComputedStyle(el, '::after')
    return { width: Number.parseFloat(pseudo.width), height: Number.parseFloat(pseudo.height) }
  })
  expect(hit.width).toBeGreaterThanOrEqual(44)
  expect(hit.height).toBeGreaterThanOrEqual(44)
  const box = (await button.boundingBox())!
  const image = (await page.locator('figure[data-hl-animated] img').first().boundingBox())!
  expect(box.y).toBeGreaterThanOrEqual(image.y)
  expect(box.x + box.width).toBeLessThanOrEqual(image.x + image.width)
  expect(image.x + image.width - (box.x + box.width)).toBeLessThan(16)
})
