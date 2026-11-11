import { readFileSync } from 'node:fs'
import { existsSync } from 'node:fs'
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

/**
 * Every piece of the story's text on the page, each scrolled to and measured where it stands. It
 * returns how many it read as well, so a page with no story on it cannot pass as one with all of it
 * visible.
 */
async function hiddenText(page: Page): Promise<{ read: number; hidden: string[] }> {
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
  return { read: count, hidden }
}

/** The story's own size: a heading and at least one paragraph per stall, and the motto's two lines. */
const AT_LEAST = HEADINGS.length * 2 + 2

test('tells STORY.md, one stall per ## section, in the file\'s order', async ({ page }) => {
  expect(HEADINGS.length, 'STORY.md has no ## heading; is it still there?').toBeGreaterThan(1)
  await page.goto(ROUTE)
  await expect(page.locator('main h1')).toHaveCount(1)
  await expect(page.locator('.bz-about section.stall h2')).toHaveText(HEADINGS)
  // Each stall carries a scene beside its text, and the motto closes the page.
  await expect(page.locator('.bz-about section.stall .slot')).toHaveCount(HEADINGS.length)
  await expect(page.locator('.bz-about .motto-q')).toHaveCount(1)
  // The stall rail is navigation that is fixed at the window's edge; in the document it comes after
  // the story, so a keyboard reader reaches the stalls before five jump links to them.
  const railAfterStory = await page.evaluate(() => {
    const rail = document.querySelector('.bz-about .rail')!
    const last = [...document.querySelectorAll('.bz-about [data-sec]')].at(-1)!
    return Boolean(last.compareDocumentPosition(rail) & Node.DOCUMENT_POSITION_FOLLOWING)
  })
  expect(railAfterStory, 'the rail comes before the story in the tab order').toBe(true)
})

test.describe('with the script blocked', () => {
  test.use({ javaScriptEnabled: false })

  test('the whole story is visible, and nothing is pinned', async ({ page }) => {
    await page.goto(ROUTE)
    const { read, hidden } = await hiddenText(page)
    expect(read, 'the story was not on the page at all').toBeGreaterThanOrEqual(AT_LEAST)
    expect(hidden).toEqual([])
    await expect(page.locator('.pin-spacer')).toHaveCount(0)
    // A still tells its whole scene: every speech bubble in it is shown, the question as well as the answer.
    const bubbles = await page.locator('.bz-about [data-scene] .t-bubble').evaluateAll((all) => all.map((el) => getComputedStyle(el).opacity))
    expect(bubbles.length, 'no scene bubble to check').toBeGreaterThan(0)
    expect(bubbles.filter((opacity) => opacity !== '1')).toEqual([])
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
    const { read, hidden } = await hiddenText(page)
    expect(read, 'the story was not on the page at all').toBeGreaterThanOrEqual(AT_LEAST)
    expect(hidden).toEqual([])
    await expect(page.locator('.pin-spacer')).toHaveCount(0)
  })

  test('the motion module is never even fetched', async ({ page }) => {
    const scripts: string[] = []
    page.on('response', (response) => {
      if (response.request().resourceType() === 'script') scripts.push(response.url())
    })
    await page.goto(ROUTE)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    const before = scripts.length
    // The positive control: allowing motion fetches it, and the page starts to move.
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await expect(page.locator('.bz-about')).toHaveAttribute('data-motion', 'wide')
    expect(scripts.length, 'allowing motion fetched no new script').toBeGreaterThan(before)
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
    /*
      The page clips its own overflow (`.bz-about { overflow-x: clip }`), so scrollWidth alone cannot see
      art that runs past the window: it is cut off instead of scrolling. So every box the page draws
      something in is measured against the window. Inside an SVG only the <svg> itself counts (its own
      drawing is masked to its box); a box that paints nothing of its own (a transparent container, such
      as the seal's tilted desk, whose projected box is wider than what it holds) is skipped; and
      `data-bleed` marks art that fades to nothing before its edge (the seal's desk pool and shade).
    */
    const outside = await page.evaluate(() => {
      const bad: string[] = []
      const paints = (el: Element, style: CSSStyleDeclaration) =>
        el instanceof SVGSVGElement || el instanceof HTMLCanvasElement || el instanceof HTMLImageElement ||
        style.backgroundImage !== 'none' || !/rgba\([^)]*,\s*0\)$|^transparent$/.test(style.backgroundColor) ||
        ['Top', 'Right', 'Bottom', 'Left'].some((side) => parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0 && style.getPropertyValue(`border-${side.toLowerCase()}-style`) !== 'none') ||
        [...el.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '')
      for (const el of document.querySelectorAll('.bz-about *')) {
        if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) continue
        if (el.closest('[data-bleed]')) continue
        const style = getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden') continue
        if (!paints(el, style)) continue
        const r = el.getBoundingClientRect()
        if (r.width < 1 || r.height < 1) continue
        if (r.left < -1 || r.right > innerWidth + 1) {
          bad.push(`${el.closest('section')?.id ?? 'page'} ${el.tagName.toLowerCase()}.${[...el.classList].join('.')} spans ${Math.round(r.left)} to ${Math.round(r.right)}`)
        }
      }
      return bad
    })
    expect(outside, 'something is drawn past the window and cut off').toEqual([])
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
    // While it moves, the scene is still one named picture to assistive technology (a canvas drawn
    // over a still must not take the still's name out of the tree).
    await expect(slot.getByRole('img'), `slot ${i + 1} has no named image while it moves`).toHaveCount(1)
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

test('at 1440 the stalls pin, and the motion leaves no trace when it stops', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const root = page.locator('.bz-about')
  const slots = page.locator('.bz-about .slot')
  /** Bring every scene to life, so each has something to undo. */
  const visitScenes = async () => {
    for (let i = 0; i < (await slots.count()); i++) {
      await slots.nth(i).scrollIntoViewIfNeeded()
      await page.waitForTimeout(500)
    }
  }
  /** What the server wrote that the motion must leave as it found it: the scenes' inline styles
      (their fonts among them) and the text it splits into words and lines. */
  const marks = () =>
    page.evaluate(() => ({
      // Read as the browser normalises it, and an emptied `style=""` is the same as none.
      styles: [...document.querySelectorAll<HTMLElement | SVGElement>('.bz-about [data-scene] [style]')]
        .filter((el) => el.style.cssText !== '')
        .map((el) => `${el.tagName}.${el.getAttribute('class') ?? ''}: ${el.style.cssText}`),
      text: [...document.querySelectorAll('.bz-about h1, .bz-about h2, .bz-about .copy p, .bz-about .motto-q')].map((el) => el.innerHTML),
    }))

  // The server's page, read before any motion has touched it.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(ROUTE)
  await page.waitForLoadState('networkidle')
  const server = await marks()
  expect(server.styles.length, 'no scene carries an inline style to check').toBeGreaterThan(0)

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(root).toHaveAttribute('data-motion', 'wide')
  // The positive control for every pin-spacer count of zero in this file.
  const pins = await page.locator('.pin-spacer').count()
  expect(pins, 'nothing pinned at 1440').toBeGreaterThan(0)
  await visitScenes()

  // Across 900px: the pins go, and come back exactly once each.
  await page.setViewportSize({ width: 800, height: 900 })
  await expect(root).toHaveAttribute('data-motion', 'narrow')
  await expect(page.locator('.pin-spacer')).toHaveCount(0)
  await visitScenes()
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(root).toHaveAttribute('data-motion', 'wide')
  await expect(page.locator('.pin-spacer')).toHaveCount(pins)
  await visitScenes()

  // Stopping puts back every node and attribute the server wrote, fonts included.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(root).not.toHaveAttribute('data-motion')
  await expect(page.locator('.bz-about canvas')).toHaveCount(0)
  expect(await marks()).toEqual(server)

  // Leaving the page by a client navigation takes the motion with it.
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(root).toHaveAttribute('data-motion', 'wide')
  await page.getByRole('contentinfo').getByRole('link', { name: 'Legend and keys' }).click()
  await page.waitForURL('**/legend/')
  await expect(page.locator('.pin-spacer')).toHaveCount(0)
  await page.mouse.wheel(0, 1200)
  await page.waitForTimeout(400)
  expect(await page.evaluate(() => document.body.getAttribute('style'))).toBeNull()
  expect(errors).toEqual([])
})

/**
 * M109, D132 — the translated About pages. Each language whose `STORY_<lang>.md` exists is read from
 * that file at test time (its `##` headings, never written down) and held to the same rules: the
 * stalls in file order, `lang` and `dir` on the elements that hold the words and on nothing around
 * them, the language menu linking the three addresses, and a phone that never scrolls sideways.
 */
const TRANSLATIONS = (['tr', 'fa'] as const).filter((lang) => existsSync(join(process.cwd(), `mini-courses/STORY_${lang}.md`)))

test('at least one translated story exists to hold to the rule', () => {
  expect(TRANSLATIONS.length, 'no STORY_<lang>.md exists, so the translated pages were not checked').toBeGreaterThan(0)
})

for (const lang of TRANSLATIONS) {
  const headings = readFileSync(join(process.cwd(), `mini-courses/STORY_${lang}.md`), 'utf8')
    .split('\n')
    .filter((line) => /^## /.test(line))
    .map((line) => line.slice(3).trim())
  const dir = lang === 'fa' ? 'rtl' : null

  test.describe(`/${lang}/about/`, () => {
    test('renders its file\'s stalls with lang and dir on the words only, and the language menu', async ({ page }) => {
      await page.goto(`/${lang}/about/`)
      await expect(page.locator('html')).toHaveAttribute('lang', lang)
      await expect(page.locator('.bz-about section.stall h2')).toHaveText(headings)
      await expect(page.locator('.bz-about section.stall .slot')).toHaveCount(headings.length)
      const text = '.bz-about h1, .bz-about h2, .bz-about .copy p, .bz-about .motto-k, .bz-about .motto-q'
      const marks = await page.locator(text).evaluateAll((all) => all.map((el) => [el.getAttribute('lang'), el.getAttribute('dir')]))
      expect(marks.length).toBeGreaterThan(headings.length)
      for (const mark of marks) expect(mark).toEqual([lang, dir])
      // The page around the words and the scenes are drawn as on /about/: no direction of their own.
      expect(await page.locator('.bz-about').getAttribute('dir')).toBeNull()
      expect(await page.locator('.bz-about [data-scene]').evaluateAll((all) => all.filter((el) => el.closest('[dir]')).length)).toBe(0)
      const menu = page.getByRole('navigation', { name: 'Language of this page' })
      await expect(menu.locator('a')).toHaveCount(1 + TRANSLATIONS.length)
      await expect(menu.locator('a[aria-current="page"]')).toHaveAttribute('hreflang', lang)
      const hrefs = await menu.locator('a').evaluateAll((all) => all.map((a) => a.getAttribute('href')))
      expect(hrefs).toEqual(expect.arrayContaining(['/about/', `/${lang}/about/`]))
    })

    test.describe('at a phone\'s width', () => {
      test.use({ viewport: { width: 390, height: 844 } })

      test('nothing scrolls sideways, and the copy is aligned to its language\'s start', async ({ page }) => {
        await page.goto(`/${lang}/about/`)
        await page.waitForLoadState('networkidle')
        for (const at of [0, 0.5, 1]) {
          await page.evaluate((f) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), at)
          const width = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
          expect(width[0]).toBeLessThanOrEqual(width[1])
        }
        const overflow = await page.locator('.bz-about .copy p, .bz-about h2').evaluateAll((all) =>
          all.filter((el) => el.getBoundingClientRect().right > innerWidth + 1 || el.getBoundingClientRect().left < -1).length,
        )
        expect(overflow).toBe(0)
        const align = await page.locator('.bz-about .copy p').first().evaluate((el) => getComputedStyle(el).direction)
        expect(align).toBe(lang === 'fa' ? 'rtl' : 'ltr')
      })
    })
  })
}
