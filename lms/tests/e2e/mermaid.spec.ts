import { expect, test } from '@playwright/test'

/**
 * §6.10 — the diagram island, and the one property it exists to hold that no
 * unit test can observe: mermaid is 500kB, seventeen of the thirty-two sheets
 * have no figures, and none of them may pay for it.
 */

/** A sheet with figures. Module 1 carries `.mermaid-source` markers. */
const WITH_FIGURES = '/courses/fundamentals/llms/'
/** A listing page: chrome only, no prose, no figures. */
const WITHOUT_FIGURES = '/courses/'

test('renders a mermaid marker as an SVG drawing', async ({ page }) => {
  await page.goto(WITH_FIGURES)
  const diagram = page.locator('.mermaid-source svg').first()
  await expect(diagram).toBeVisible({ timeout: 20_000 })
})

test('paints the figure from tokens, and re-themes it without re-rendering', async ({ page }) => {
  await page.goto(WITH_FIGURES)
  const diagram = page.locator('.mermaid-source svg').first()
  await expect(diagram).toBeVisible({ timeout: 20_000 })

  // B4/§9.2: every colour in the drawing is a `var(--color-…)` reference, so a
  // theme flip re-resolves it in the same frame — no re-render, no re-parse.
  // That is only true if the painted stroke *is* the token, so read both.
  const strokeAndToken = () =>
    diagram.evaluate((svg) => {
      const node = svg.querySelector('.node rect, .node polygon, .node path')
      return {
        stroke: node ? getComputedStyle(node).stroke : null,
        token: getComputedStyle(document.documentElement)
          .getPropertyValue('--color-line-strong')
          .trim(),
        probe: svg.getAttribute('data-hl-probe'),
      }
    })

  // A probe the render would destroy: if mermaid re-runs, this attribute goes.
  await diagram.evaluate((svg) => svg.setAttribute('data-hl-probe', 'set'))

  const light = await strokeAndToken()
  expect(light.stroke).not.toBeNull()

  await page.evaluate(() => document.documentElement.classList.add('dark'))
  const dark = await strokeAndToken()

  expect(dark.probe).toBe('set')
  expect(dark.token).not.toBe(light.token)
  expect(dark.stroke).not.toBe(light.stroke)
})

test('downloads no mermaid bundle on a page with no figures', async ({ page }) => {
  const requested: string[] = []
  page.on('request', (request) => requested.push(request.url()))

  await page.goto(WITHOUT_FIGURES)
  await page.waitForLoadState('networkidle')

  expect(requested.filter((url) => /mermaid/i.test(url))).toHaveLength(0)
})
