import { expect, test } from '@playwright/test'
import { A0, A4, sheetByModule } from './sheets'
import { DIAGRAM_THEMES } from '@/lib/reading/diagram-themes'
import { contrastSamples, useTheme, worst } from './contrast'
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

/** A reader who has chosen `theme` for the diagrams and nothing else, on the page's next load. */
async function chooseTheme(page: import('@playwright/test').Page, theme: string): Promise<void> {
  await page.evaluate((id) => {
    window.localStorage.setItem('hl-record', JSON.stringify({
      schema: 1, savedAt: '2026-11-08T10:00:00.000Z', data: { prefs: { diagramTheme: id } },
    }))
  }, theme)
  await page.reload()
}

async function figuresDrawn(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const all = document.querySelectorAll('[data-hl-prose] .bz-diagram').length
      const ready = document.querySelectorAll('[data-hl-prose] .bz-diagram[data-hl-ready]').length
      return all > 0 && all === ready
    },
    null,
    { timeout: 20_000 },
  )
}

/**
 * What a diagram owes the reader, in every theme the reader can choose, measured off the
 * painted pixels, in both site themes. It is the gate this suite has always had on diagrams,
 * and Mermaid's own themes are not exempt from it:
 *
 * - every label owes 4.5:1 as text, against the ground it is painted on (a node's fill, an
 *   edge label's box, or the frame);
 * - every node's edge owes 3:1 as a graphic against the node's own fill and against the
 *   frame, and so does every arrow.
 *
 * A theme that misses a floor gets the smallest override that clears it, in
 * `diagram-themes.ts` (`variables`), with the number it started from written beside it. It is
 * not excused here: the site never ships a label below its floor because the library drew it.
 *
 * Run in both site themes even though the frame does not flip, because "does not flip" is
 * the claim: a frame that quietly inherited the page's palette would pass in one and fail
 * in the other. One test per theme, so one theme's failure names itself and none of them
 * waits on nine others.
 */
for (const diagramTheme of DIAGRAM_THEMES)
test(`the ${diagramTheme.id} diagram theme clears the label and line floors, in both site themes`, async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto(A0.path)
  await chooseTheme(page, diagramTheme.id)
  await figuresDrawn(page)

  for (const site of ['light', 'dark'] as const) {
    await useTheme(page, site)
    const name = `${diagramTheme.id}/${site}`

    const labels = (
      await contrastSamples(
        page,
        '[data-hl-prose] .bz-diagram .mermaid-source svg .nodeLabel, [data-hl-prose] .bz-diagram .mermaid-source svg text',
      )
    ).filter((sample) => sample.text !== '')
    expect(labels.length, `${name}: no diagram label to measure`).toBeGreaterThan(5)
    const quietest = worst(labels)
    expect(
      quietest.ratio,
      `${name}: "${quietest.text}" at ${quietest.ratio.toFixed(2)}:1 (${quietest.color} on ${quietest.background})`,
    ).toBeGreaterThanOrEqual(4.5)

    const geometry = await page.evaluate(() => {
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
      /* A stroke is a colour, or a gradient (the neo themes draw a node's edge from blue to red):
         every stop of a gradient is a colour the edge is painted in, so the weakest of them decides. */
      const colours = (svg: Element, value: string): string[] => {
        const id = /^url\(["']?#([^"')]+)["']?\)$/.exec(value)?.[1]
        if (id === undefined) return [value]
        const stops = [...(svg.ownerDocument.getElementById(id)?.querySelectorAll('stop') ?? [])]
        return stops.map((stop) => getComputedStyle(stop).stopColor)
      }
      const found: { what: string; ratio: number }[] = []
      for (const svg of document.querySelectorAll('[data-hl-prose] .bz-diagram .mermaid-source svg')) {
        const ground = paint(getComputedStyle(svg.closest('.bz-figure')!).backgroundColor)
        for (const node of svg.querySelectorAll('.node rect, .node polygon, .node circle, .node ellipse, .node path')) {
          const style = getComputedStyle(node)
          if (!style.stroke || style.stroke === 'none') continue
          for (const colour of colours(svg, style.stroke)) {
            found.push({ what: 'a node edge on the frame', ratio: ratio(paint(colour), ground) })
            if (style.fill && style.fill !== 'none' && !style.fill.startsWith('url(')) {
              found.push({ what: 'a node edge on its own fill', ratio: ratio(paint(colour), paint(style.fill)) })
            }
          }
        }
        for (const node of svg.querySelectorAll('.edgePath path, path.flowchart-link')) {
          const stroke = getComputedStyle(node).stroke
          if (!stroke || stroke === 'none') continue
          for (const colour of colours(svg, stroke)) {
            found.push({ what: 'an arrow on the frame', ratio: ratio(paint(colour), ground) })
          }
        }
      }
      return found
    })

    expect(geometry.length, `${name}: no diagram geometry to measure`).toBeGreaterThan(5)
    const weakest = geometry.reduce((low, one) => (one.ratio < low.ratio ? one : low))
    expect(
      weakest.ratio,
      `${name}: ${weakest.what} is ${weakest.ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(3.0)
  }
})

/**
 * The four semantic edges are the one colour the site paints on a diagram
 * (`mermaid-config.ts`), and they are painted from tokens the frame rebinds to the ground the
 * theme's tone gives it. So each owes 3:1 as a graphic on BOTH grounds, a light theme's and a
 * dark one's, in both site themes. This reads the tokens as the figure resolves them, which is
 * what the stylesheet paints with, and the frame's own ground.
 */
test('the four semantic edge hues clear 3:1 on the light frame and on the dark one', async ({ page }) => {
  for (const [theme, tone] of [['default', 'light'], ['dark', 'dark']] as const)
  for (const site of ['light', 'dark'] as const) {
    await page.goto(A0.path)
    await chooseTheme(page, theme)
    await figuresDrawn(page)
    await useTheme(page, site)
    const hues = await page.locator('.bz-figure').first().evaluate((figure) => {
      const style = getComputedStyle(figure)
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const context = canvas.getContext('2d', { willReadFrequently: true })!
      const paint = (colour: string): number[] => {
        context.clearRect(0, 0, 1, 1)
        context.fillStyle = colour
        context.fillRect(0, 0, 1, 1)
        return [...context.getImageData(0, 0, 1, 1).data]
      }
      const luminance = (rgb: readonly number[]) => {
        const [r, g, b] = [rgb[0], rgb[1], rgb[2]].map((value) => {
          const channel = value / 255
          return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
        })
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      const ground = paint(style.backgroundColor)
      return ['--color-category-5', '--color-success', '--color-primary', '--color-caution'].map((token) => {
        const [hi, lo] = [luminance(paint(style.getPropertyValue(token))), luminance(ground)].sort((a, b) => b - a)
        return { token, ratio: (hi + 0.05) / (lo + 0.05) }
      })
    })
    for (const { token, ratio } of hues) {
      expect(ratio, `${tone} frame, ${site} site: ${token} at ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3.0)
    }
  }
})

/**
 * Every diagram type the corpus draws, in a theme that is not the default and in a dark one.
 * A theme that cannot draw a type does not fail loudly: the figure falls back to its source
 * (`MermaidFigure`), and a unit test that built the config would never see it. So this loads
 * a page with a mind map and a page with flowcharts, and asks that every marker became an
 * SVG, that none fell back, and that the mind map is a mind map.
 */
const TYPES = [
  { path: '/courses/intermediate/harness-engineering/', kind: 'mindmap' },
  { path: '/courses/fundamentals/rag/', kind: 'flowchart' },
] as const
for (const theme of ['neo', 'redux-color', 'dark', 'neo-dark'])
for (const { path, kind } of TYPES)
test(`draws a ${kind} in the ${theme} theme as a drawing, not as its source`, async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto(path)
  await chooseTheme(page, theme)
  await figuresDrawn(page)
  const markers = await page.locator('[data-hl-prose] .mermaid-source').count()
  expect(markers, 'a page with no diagram proves nothing').toBeGreaterThan(0)
  await expect(page.locator('[data-hl-prose] .bz-fig-fallback'), 'a diagram fell back to its source').toHaveCount(0)
  await expect(page.locator('[data-hl-prose] .mermaid-source svg')).toHaveCount(markers)
  await expect(
    page.locator(`[data-hl-prose] .mermaid-source svg[aria-roledescription^="${kind}"]`).first(),
    `no ${kind} among the drawings`,
  ).toBeVisible()
})

/**
 * The two `-color` Redux themes are Mermaid's, and they colour only what Mermaid colours:
 * the branches of a mind map, the groups of a flowchart (a subgraph), and the diagram types
 * the course does not draw. A flowchart of plain nodes is painted the same in `redux` and
 * `redux-color`, and in `redux-dark` and `redux-dark-color` (measured on every flowchart of
 * the course, in Mermaid 11.17.2 and 12.2.0). So the proof that the config passes the theme
 * through is a mind map: each `-color` theme must paint it in more colours than its plain
 * twin, and a regression that handed Mermaid the wrong name (or none) fails here.
 */
for (const [plain, colour] of [['redux', 'redux-color'], ['redux-dark', 'redux-dark-color']])
test(`${colour} paints a mind map in more colours than ${plain}`, async ({ page }) => {
  test.setTimeout(60_000)
  const hues = async (theme: string) => {
    await page.goto('/courses/intermediate/harness-engineering/')
    await chooseTheme(page, theme)
    await figuresDrawn(page)
    return page.locator('[data-hl-prose] .mermaid-source svg[aria-roledescription^="mindmap"]').first().evaluate((svg) => {
      const painted = new Set<string>()
      for (const node of svg.querySelectorAll('.node *, .mindmap-node *, path, rect, circle')) {
        const style = getComputedStyle(node)
        for (const value of [style.fill, style.stroke]) if (value && value !== 'none') painted.add(value)
      }
      return painted.size
    })
  }
  const [plainHues, colourHues] = [await hues(plain), await hues(colour)]
  expect(colourHues, `${colour} (${colourHues}) against ${plain} (${plainHues})`).toBeGreaterThan(plainHues)
})

/**
 * Each theme sits on its own Mermaid background (D107, revised 2026-11-08): the frame, the
 * tool strip over it and the opened view all paint the value `diagram-themes.ts` carries for
 * the chosen theme, on a light site and a dark one, and the unstamped page is the default's.
 * `diagram-themes.test.ts` holds that value to the installed Mermaid's own; this holds the
 * page to the value. Colours are compared as the browser resolves them, so `white` and
 * `#ffffff` are the same ground.
 */
const resolved = (page: import('@playwright/test').Page, colour: string) =>
  page.evaluate((value) => {
    const probe = document.createElement('div')
    probe.style.color = value
    document.body.append(probe)
    const out = getComputedStyle(probe).color
    probe.remove()
    return out
  }, colour)

test('an unchosen page draws every diagram on the default theme\'s own background', async ({ page }) => {
  await page.goto(WITH_FIGURES)
  await figuresDrawn(page)
  const expected = await resolved(page, DIAGRAM_THEMES.find((theme) => theme.id === 'default')!.background)
  const grounds = await page.locator('.bz-figure').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).backgroundColor))
  expect(grounds.length).toBeGreaterThan(0)
  for (const ground of grounds) expect(ground).toBe(expected)
})

for (const diagramTheme of DIAGRAM_THEMES)
test(`the ${diagramTheme.id} theme's frame, tools and expanded view are its own Mermaid background, on both sites`, async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto(WITH_FIGURES)
  await chooseTheme(page, diagramTheme.id)
  await figuresDrawn(page)
  const expected = await resolved(page, diagramTheme.background)

  for (const site of ['light', 'dark'] as const) {
    await useTheme(page, site)
    const frame = page.locator('.bz-figure').first()
    expect(await frame.evaluate((node) => getComputedStyle(node).backgroundColor), `${diagramTheme.id}/${site}: frame`).toBe(expected)
    expect(
      await page.locator('.bz-figure-tools').first().evaluate((node) => getComputedStyle(node).backgroundColor),
      `${diagramTheme.id}/${site}: tools`,
    ).toBe(expected)
  }

  await page.locator('[data-hl-expand]').first().click()
  await expect(page.locator('.bz-expand-view')).toBeVisible()
  expect(
    await page.locator('.bz-expand-view').evaluate((node) => getComputedStyle(node).backgroundColor),
    `${diagramTheme.id}: expanded view`,
  ).toBe(expected)
})
