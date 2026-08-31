import { expect, test } from '@playwright/test'
import { A0, A4, sheetByModule } from './sheets'
import { watchPage } from './watch'

/**
 * §6.10 — the diagram island, and the one property it exists to hold that no
 * unit test can observe: mermaid is 500kB, seventeen of the thirty-two sheets
 * have no figures, and none of them may pay for it.
 */

/**
 * The code-splitting assertions below are about the bundle that ships, so they
 * only run against the export. `next dev` serves the whole route's module
 * graph eagerly — an A4 sheet fetches the mermaid chunk there even though it
 * never mounts the island — and failing on that would be reporting a fact
 * about the dev server as a fact about the site.
 */
const SPLIT_BUNDLE_ONLY = process.env.E2E_TARGET === 'dev'

/** A sheet with figures. Module 1 carries `.mermaid-source` markers. */
const WITH_FIGURES = sheetByModule(1).path
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
  test.skip(SPLIT_BUNDLE_ONLY, 'dev does not code-split; run against the export')
  const requested: string[] = []
  page.on('request', (request) => requested.push(request.url()))

  await page.goto(WITHOUT_FIGURES)
  await page.waitForLoadState('networkidle')

  expect(requested.filter((url) => /mermaid/i.test(url))).toHaveLength(0)
})

test('every marker on a sheet becomes a drawing, not just the first', async ({ page }) => {
  const problems = watchPage(page)
  await page.goto(A0.path)

  const markers = page.locator('[data-hl-prose] .mermaid-source[data-mermaid]')
  const total = await markers.count()
  expect(total, 'the A0 sheet still carries figures').toBeGreaterThan(0)

  // One island renders all of them, so a single failure part-way through the
  // list leaves the rest of the sheet showing raw mermaid source.
  await expect(markers.locator('svg')).toHaveCount(total, { timeout: 20_000 })

  // A drawing with no geometry in it is a blank box that passes a "has svg"
  // check, so read the box the engine actually laid out.
  const box = await markers.locator('svg').first().boundingBox()
  expect(box!.width).toBeGreaterThan(80)
  expect(box!.height).toBeGreaterThan(40)

  // Mermaid logs its parse failures rather than throwing them.
  expect(problems.consoleErrors).toEqual([])
})

test('a sheet that is not drawn downloads no mermaid bundle', async ({ page }) => {
  test.skip(SPLIT_BUNDLE_ONLY, 'dev does not code-split; run against the export')
  const requested: string[] = []
  page.on('request', (request) => requested.push(request.url()))

  await page.goto(A4.path)
  await page.waitForLoadState('networkidle')

  // Seventeen of thirty-two sheets are in this state and none of them may pay
  // 500kB for a renderer they will never call (§6.10).
  await expect(page.locator('.mermaid-source')).toHaveCount(0)
  expect(requested.filter((url) => /mermaid/i.test(url))).toHaveLength(0)
})
