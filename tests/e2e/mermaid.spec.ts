import { expect, test } from '@playwright/test'
import { A0, A4, sheetByModule } from './sheets'
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
const WITHOUT_FIGURES = '/courses/'

test('renders a mermaid marker as an SVG drawing', async ({ page }) => {
  await page.goto(WITH_FIGURES)
  const diagram = page.locator('.mermaid-source svg').first()
  await expect(diagram).toBeVisible({ timeout: 20_000 })
})

/**
 * B4/§9.2 — every colour in the drawing is a `var(--color-…)` reference and
 * nothing is inline, so the drawing re-resolves from the cascade with no
 * re-render and no re-parse.
 *
 * **M11 changed what that mechanism is used FOR, and the test with it.** A
 * diagram is a dark slab in both themes now (`kia-context/specs/DESIGN.md`),
 * and the slab is implemented as a local theme override on the figure —
 * `.bz-figure` in `src/design/bazaar.css` redeclares the palette there, custom
 * properties cascade into inline SVG, and fifty-three diagrams land on a dark
 * ground with no change to `mermaid-config.ts` at all.
 *
 * **That override was missing between stage 0 and stage 6**, so this test could
 * not pass: the docblock named `rail.css` as its owner, a file that never
 * carried such a rule under any name after the interface was replaced. A
 * diagram was a near-white box inside a near-black frame for six commits, and
 * the only test that could have said so was red for what looked like an
 * unrelated reason.
 *
 * It is the same mechanism this test has always been about; what it proves has
 * been inverted:
 *
 * - the painted stroke IS the token, read from the FIGURE rather than from
 *   `<html>`, because the figure is where the slab declares it;
 * - flipping the theme does NOT change it, which is the slab's promise;
 * - the root token DOES change under the same flip, so the two are genuinely
 *   independent and the slab is not simply a token that happens not to move;
 * - and the SVG is never re-rendered either way, which is the 0ms claim.
 *
 * Asserting "the stroke changed" would now be asserting a defect.
 */
test('paints the figure from its own tokens, and never re-renders it', async ({ page }) => {
  await page.goto(WITH_FIGURES)
  const diagram = page.locator('.mermaid-source svg').first()
  await expect(diagram).toBeVisible({ timeout: 20_000 })

  const read = () =>
    diagram.evaluate((svg) => {
      const node = svg.querySelector('.node rect, .node polygon, .node path')
      const figure = svg.closest('.bz-figure')!
      return {
        stroke: node ? getComputedStyle(node).stroke : null,
        // The token as the FIGURE resolves it — the slab's value.
        slabToken: getComputedStyle(figure).getPropertyValue('--color-line-strong').trim(),
        // …and as the page resolves it, which is a different value entirely.
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
  expect(light.slabToken).not.toBe('')
  // The slab is its own palette, not the page's.
  expect(light.slabToken).not.toBe(light.rootToken)

  await page.evaluate(() => document.documentElement.classList.add('dark'))
  const dark = await read()

  // No re-render, in either direction.
  expect(dark.probe).toBe('set')
  // The page's own token moved…
  expect(dark.rootToken).not.toBe(light.rootToken)
  // …and the drawing did not, because the slab does not flip.
  expect(dark.slabToken).toBe(light.slabToken)
  expect(dark.stroke).toBe(light.stroke)
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
 * M11's acceptance criterion, measured off the painted pixels: **mermaid text
 * stays legible on the dark slab, and the diagram palette clears 3:1 for
 * graphics.**
 *
 * Only a browser can answer it. The SVG does not exist until the island runs,
 * its colours are `var()` references resolved from the slab's local override
 * rather than from the page, and the ground a label sits on is whatever the
 * first opaque ancestor turns out to be — a layout fact. So the label's colour
 * is composited up the ancestor chain and the ratio is recomputed, which is
 * exactly what `contrast.ts` exists for.
 *
 * Run in BOTH themes even though the slab does not flip, because "does not
 * flip" is the claim: a slab that quietly inherited the page's palette would
 * pass in one theme and fail in the other.
 *
 * MEASURED on the widest module: 16 labels at worst 12.82:1 and 28 strokes at
 * worst 5.21:1, identical in both themes.
 */
test('a diagram on the slab clears its floors, in both themes', async ({ page }) => {
  for (const theme of ['light', 'dark'] as const) {
    await page.goto(A0.path)
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
    await useTheme(page, theme)

    // The labels, in both the shapes mermaid emits them in. MEASURED on this
    // module: 13 `<text>` elements of which 2 carry their own text, and 14
    // `.nodeLabel` elements — mermaid 11 lays a node's label out as HTML inside
    // a `foreignObject` and keeps `<text>` for the edge labels, so a selector
    // of either alone measures a third of the drawing and calls it the whole.
    // `mermaid-config.ts` sets both `color` and `fill` to the same token on
    // every one of them, so the shared probe reads the right property either
    // way.
    const labels = (
      await contrastSamples(
        page,
        '[data-hl-prose] .bz-diagram svg .nodeLabel, [data-hl-prose] .bz-diagram svg text',
      )
    ).filter((sample) => sample.text !== '')
    expect(labels.length, `${theme}: no diagram label to measure`).toBeGreaterThan(5)
    const quietest = worst(labels)
    expect(
      quietest.ratio,
      `${theme}: "${quietest.text}" at ${quietest.ratio.toFixed(2)}:1 ` +
      `(${quietest.color} on ${quietest.background})`,
    ).toBeGreaterThanOrEqual(4.5)

    // The geometry. A stroke is a graphic, so SC 1.4.11's 3:1 — and this is
    // the pair that made the slab need its own line token: `slab-line` is
    // 1.36:1 there, correct for the slab's own boundary and invisible as a
    // node's edge.
    const strokes = await page.evaluate(() => {
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
      for (const svg of document.querySelectorAll('[data-hl-prose] .bz-diagram svg')) {
        // The slab is the first opaque ancestor of the drawing, by construction.
        const figure = svg.closest('.bz-figure')!
        const ground = paint(getComputedStyle(figure).backgroundColor)
        for (const node of svg.querySelectorAll('.node rect, .edgePath path')) {
          const stroke = getComputedStyle(node).stroke
          if (!stroke || stroke === 'none') continue
          found.push(ratio(paint(stroke), ground))
        }
      }
      return found
    })

    expect(strokes.length, `${theme}: no diagram geometry to measure`).toBeGreaterThan(5)
    expect(
      Math.min(...strokes),
      `${theme}: a diagram stroke is ${Math.min(...strokes).toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(3.0)
  }
})
