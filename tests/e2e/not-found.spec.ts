import { type Page, expect, test } from '@playwright/test'
import { watchPage } from './watch'

/**
 * The 404 (§8.4, §8.5, §5.1, §5.2).
 *
 * Every assertion here is one a source read could not have made, because the
 * defect was invisible in the source. `404.html` is prerendered once, at
 * `/_not-found`, and then served at every address that is not a sheet — so the
 * header trail and the footer's sheet slot rendered `_NOT FOUND` in the export
 * and `404` in the browser. React answers a text mismatch by re-rendering the
 * whole document from scratch, which discarded §2.5's boot-script class along
 * with it: a reader whose theme was dark got a white 404, on the only page on
 * the site logging a hydration error. The class was on `<html>` in the HTML the
 * whole time.
 *
 * So the checks that matter run at more than one URL, and they ask the engine
 * what it painted after hydration rather than what the document said.
 *
 * `scripts/serve-static.mjs` serves `404.html` with a 404 status for an unknown
 * path, exactly as GitHub Pages does, which is what makes the second URL below
 * a real test of the shipped file.
 */

/**
 * Two addresses one document has to be right at. `/404/` is a route of its own
 * and answers 200; the second exists nowhere and answers 404 with the same
 * file, which is the case that actually broke.
 */
const ADDRESSES: [string, number][] = [
  ['/404/', 200],
  ['/courses/fundamentals/no-such-module/', 404],
]

/** §8.4 — the caption, in the words the spec fixes for this page. */
const CAPTION = 'ASSEMBLY NOT FOUND · SHEET DOES NOT EXIST IN THIS DRAWING SET'

/**
 * A static host answers an unknown address with `404.html` *and* a 404 status.
 * That is the host being correct, and Chrome logs the status of the document it
 * has just loaded, so one such line is expected at an unknown address. Exactly
 * one is dropped: a second thing 404ing still fails the assertion.
 */
function withoutDocumentStatus(lines: string[], status: number): string[] {
  if (status < 400) return lines
  const at = lines.findIndex((line) => new RegExp(`status of ${status}\\b`).test(line))
  return at === -1 ? lines : [...lines.slice(0, at), ...lines.slice(at + 1)]
}

async function withTheme(page: Page, theme: 'dark' | 'light'): Promise<void> {
  await page.addInitScript((value) => {
    try {
      localStorage.setItem('hl-theme', value)
    } catch {
      // Private windows throw; the test below would fail loudly either way.
    }
  }, theme)
}

for (const [address, expectedStatus] of ADDRESSES) {
  test(`${address} keeps the reader's theme through hydration`, async ({ page }) => {
    await withTheme(page, 'dark')
    const problems = watchPage(page)

    const response = await page.goto(address)
    await page.waitForLoadState('networkidle')
    expect(response?.status(), 'the host did not answer the way GitHub Pages does')
      .toBe(expectedStatus)

    expect(
      await page.evaluate(() => document.documentElement.classList.contains('dark')),
      'the boot script class did not survive hydration',
    ).toBe(true)

    // The class surviving is necessary but not sufficient — this is the thing
    // the reader would have seen.
    const ground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    const documentUrl = response?.url() ?? address
    await page.goto('/')
    expect(ground, 'the 404 is not on the same ground as the rest of the site')
      .toBe(await page.evaluate(() => getComputedStyle(document.body).backgroundColor))

    expect(
      withoutDocumentStatus(problems.consoleErrors, expectedStatus),
      'the 404 logged',
    ).toEqual([])
    expect(
      problems.failedRequests.filter((request) => !request.endsWith(documentUrl)),
      'the 404 requested',
    ).toEqual([])
  })

  test(`${address} names the page, never the address`, async ({ page }) => {
    await page.goto(address)

    // §5.1 — the trail, and §5.2 — the footer's sheet slot. Both are derived
    // from the route, and on this one route the URL is not it.
    const trail = await page.locator('nav[aria-label="Drawing set"]').innerText()
    const sheet = await page.locator('footer').innerText()

    for (const [where, text] of [['trail', trail], ['footer', sheet]] as const) {
      expect(text, `${where} printed a URL segment`)
        .not.toMatch(/_not.?found|no.such.module|\b404\b/i)
      expect(text.toUpperCase(), `${where} does not name the page`).toContain('NO SUCH SHEET')
    }

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('No such sheet')
    await expect(page).toHaveTitle('No such sheet · AI Engineering Bazaar')
  })
}

test('the trail and the footer read the same at every address', async ({ page }) => {
  const readings: string[][] = []
  for (const address of [...ADDRESSES.map(([path]) => path), '/nothing/at/all/']) {
    await page.goto(address)
    readings.push([
      await page.locator('nav[aria-label="Drawing set"]').innerText(),
      await page.locator('footer').innerText(),
    ])
  }
  for (const reading of readings) expect(reading).toEqual(readings[0])
})

test('draws §8.4’s exploded axonometric, and only one of it', async ({ page }) => {
  await page.goto(ADDRESSES[0][0])

  const svg = page.locator('main svg')
  await expect(svg).toHaveCount(1)
  await expect(svg).toHaveAttribute('viewBox', '0 0 56 56')

  // §8.3 fixes this variant at 96px, and the caption carries the meaning, so
  // the drawing itself is hidden from assistive technology (T5).
  const box = await svg.boundingBox()
  expect(box?.width).toBe(96)
  expect(box?.height).toBe(96)
  await expect(svg).toHaveAttribute('aria-hidden', 'true')

  // Six faces, six leader lines: the cube taken apart, not a cube with a line
  // through it.
  await expect(page.locator('main [data-face]')).toHaveCount(6)
  await expect(page.locator('main [data-leader]')).toHaveCount(6)

  await expect(page.getByText(CAPTION, { exact: true })).toHaveCount(1)
})

test('keeps §8.2’s line types once the faces no longer touch', async ({ page }) => {
  await page.goto(ADDRESSES[0][0])

  const dashOf = (face: string) =>
    page.locator(`main [data-face="${face}"]`)
      .evaluate((el) => getComputedStyle(el).strokeDasharray)

  // Visible faces keep solid edges and hidden faces keep their 2 2 dashes "in
  // every state" — which is the only thing left telling a reader the cube's
  // front from its back once it is disassembled.
  for (const visible of ['F1', 'F2', 'F3']) expect(await dashOf(visible), visible).toBe('none')
  for (const hidden of ['F4', 'F5', 'F6']) {
    expect(await dashOf(hidden), hidden).toMatch(/^2px,\s*2px$/)
  }
})

test('sits in the normal shell flow, with its footer above the fold', async ({ page }) => {
  await page.goto(ADDRESSES[0][0])

  // Next's built-in not-found page ships an inline `height: 100vh` inside the
  // shell, which gave a 900px viewport a 1234px document: a scrollbar with
  // nothing under it and the footer pushed off the screen.
  const { scrollHeight, innerHeight } = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }))
  expect(scrollHeight).toBeLessThanOrEqual(innerHeight)

  await expect(page.locator('main')).toHaveCount(1)
  await expect(page.locator('footer')).toBeInViewport()
})

test('the index is one link away, and it works', async ({ page }) => {
  await page.goto(ADDRESSES[1][0])
  await page.locator('main').getByRole('link', { name: 'Index' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('AI Engineering Bazaar')
})
