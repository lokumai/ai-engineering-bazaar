import { expect, test } from '@playwright/test'
import { A0, A4, sheetByModule } from './sheets'
import { DIAGRAM_THEMES } from '@/lib/reading/diagram-themes'
import { useTheme } from './contrast'
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
const WITHOUT_FIGURES = '/sheets/'

test('renders a mermaid marker as an SVG drawing', async ({ page }) => {
  await page.goto(WITH_FIGURES)
  const diagram = page.locator('.mermaid-source svg').first()
  await expect(diagram).toBeVisible({ timeout: 20_000 })
})

/**
 * §9.2 — flipping the SITE's light and dark theme neither redraws a diagram nor changes it.
 *
 * What a diagram is painted in changed on 2026-11-08: Mermaid's own theme paints it, and
 * the reader chooses which (`diagram-themes.ts`), where the site's tokens used to repaint
 * every node. What did not change is that a diagram is a frame with its own ground that the
 * site's theme switch does not flip, so the same two claims hold and are still worth
 * measuring:
 *
 * - the painted stroke is the same in both site themes, because it is Mermaid's and
 *   nothing on the page reaches it;
 * - the page's own token DOES move under the same flip, so "unchanged" is not just "the
 *   token never moved";
 * - and no draw ran, which a probe attribute the render would destroy shows.
 */
test('keeps the drawing when the site theme flips, and never redraws it', async ({ page }) => {
  await page.goto(WITH_FIGURES)
  const diagram = page.locator('.mermaid-source svg').first()
  await expect(diagram).toBeVisible({ timeout: 20_000 })

  const read = () =>
    diagram.evaluate((svg) => {
      const node = svg.querySelector('.node rect, .node polygon, .node path')
      return {
        stroke: node ? getComputedStyle(node).stroke : null,
        fill: node ? getComputedStyle(node).fill : null,
        rootToken: getComputedStyle(document.documentElement)
          .getPropertyValue('--color-line-strong')
          .trim(),
        probe: svg.getAttribute('data-hl-probe'),
      }
    })

  // A probe the render would destroy: if mermaid re-runs, this attribute goes.
  await diagram.evaluate((svg) => svg.setAttribute('data-hl-probe', 'set'))

  const light = await read()
  expect(light.stroke).not.toBeNull()

  await page.evaluate(() => document.documentElement.classList.add('dark'))
  const dark = await read()

  expect(dark.probe, 'the site theme redrew the diagram').toBe('set')
  expect(dark.rootToken, 'the page token did not move, so this proves nothing').not.toBe(light.rootToken)
  expect(dark.stroke).toBe(light.stroke)
  expect(dark.fill).toBe(light.fill)
})

test('downloads no mermaid bundle on a page with no figures', async ({ page }) => {
  test.skip(SPLIT_BUNDLE_ONLY, 'dev does not code-split; run against the export')
  const requested: string[] = []
  page.on('request', (request) => requested.push(request.url()))

  await page.goto(WITHOUT_FIGURES)
  await page.waitForLoadState('networkidle')

  expect(requested.filter((url) => /mermaid/i.test(url))).toHaveLength(0)
})

test('every marker on a module becomes a drawing, not just the first', async ({ page }) => {
  const problems = watchPage(page)
  await page.goto(A0.path)

  const markers = page.locator('[data-hl-prose] .mermaid-source[data-mermaid]')
  const total = await markers.count()
  expect(total, 'the A0 module still carries figures').toBeGreaterThan(0)

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

test('a module that is planned downloads no mermaid bundle', async ({ page }) => {
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

/**
 * What a diagram owes the reader, per theme, measured off the painted pixels.
 *
 * Mermaid paints a node's fill, its text and its edge labels itself, as pairs it chose, so
 * those are Mermaid's to get right and are not measured here. **MEASURED, and the reason:**
 * the first version of this test asked 4.5:1 of every edge label, and Mermaid's own `dark`
 * theme draws "blocked" in #cccccc on #585858, which is 4.43:1 and is not the site's to fix.
 * What the SITE decides is the ground each theme is drawn on: a light theme on a dark frame,
 * or the reverse, would leave the arrows, which run on the frame itself, unreadable. So for
 * every theme, in both site themes, this takes each edge line and recomputes its ratio
 * against the frame's own ground. An edge line owes 3:1 as a graphic.
 *
 * Run in both site themes even though the frame does not flip, because "does not flip" is
 * the claim: a frame that quietly inherited the page's palette would pass in one and fail
 * in the other.
 */
test('a diagram theme is drawn on a ground it can be read on, in both site themes', async ({ page }) => {
  for (const diagramTheme of DIAGRAM_THEMES)
  for (const site of ['light', 'dark'] as const) {
    await page.goto(A0.path)
    await page.evaluate(([id]) => {
      window.localStorage.setItem('hl-record', JSON.stringify({
        schema: 1, savedAt: '2026-11-08T10:00:00.000Z', data: { prefs: { diagramTheme: id } },
      }))
    }, [diagramTheme.id])
    await page.reload()
    await page.waitForFunction(
      () => {
        const all = document.querySelectorAll('[data-hl-prose] .bz-diagram').length
        const ready = document.querySelectorAll(
          '[data-hl-prose] .bz-diagram[data-hl-ready]',
        ).length
        return all > 0 && all === ready
      },
      null,
      { timeout: 20_000 },
    )
    await useTheme(page, site)
    const name = `${diagramTheme.id}/${site}`

    // The geometry, as in every earlier version of this test: a stroke is a graphic, so
    // SC 1.4.11's 3:1, against the frame the figure is drawn on.
    const lines = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const context = canvas.getContext('2d', { willReadFrequently: true })!
      const paint = (colour: string): [number, number, number, number] => {
        context.clearRect(0, 0, 1, 1)
        context.fillStyle = colour
        context.fillRect(0, 0, 1, 1)
        const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
        return [r, g, b, a / 255]
      }
      const luminance = (rgb: readonly number[]) => {
        const [r, g, b] = [rgb[0], rgb[1], rgb[2]].map((value) => {
          const channel = value / 255
          return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
        })
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      const ratio = (a: readonly number[], b: readonly number[]) => {
        const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
        return (hi + 0.05) / (lo + 0.05)
      }
      const found: number[] = []
      for (const svg of document.querySelectorAll('[data-hl-prose] .bz-diagram .mermaid-source svg')) {
        const figure = svg.closest('.bz-figure')!
        const ground = paint(getComputedStyle(figure).backgroundColor)
        for (const node of svg.querySelectorAll('.edgePath path, path.flowchart-link')) {
          const stroke = getComputedStyle(node).stroke
          if (!stroke || stroke === 'none') continue
          found.push(ratio(paint(stroke), ground))
        }
      }
      return found
    })

    expect(lines.length, `${name}: no edge line to measure`).toBeGreaterThan(2)
    expect(
      Math.min(...lines),
      `${name}: an edge line is ${Math.min(...lines).toFixed(2)}:1 on its frame`,
    ).toBeGreaterThanOrEqual(3.0)
  }
})
