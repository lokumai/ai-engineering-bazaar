import { type Page, expect, test } from '@playwright/test'
import { SHORT, A4, CATEGORY_PATHS, INDEX_SHEET, sheetByModule } from './sheets'

/**
 * §4.7's closing sentence, which is the only hard rule in the whole section:
 *
 *   "The page body **never** scrolls horizontally at any width. Wide content
 *    scrolls inside its own container."
 *
 * This file runs in all three viewport projects — 1440, 1024 and 390 — because
 * that sentence is a claim about every width, and the two halves of it fail
 * differently. A page can avoid horizontal scroll by having no wide content
 * at all, which is why the widest tables on the site are checked from both
 * ends: the document must not move, *and* the container around them must.
 *
 * Module 10 and module 13 are here by measurement, not by taste. They carry
 * the widest tables in the corpus, and a table is the thing that pushes a
 * document sideways at 390px.
 */

/** Module 10 — the widest table on the site. */
const WIDEST = sheetByModule(10)
/** Module 13 — the longest sheet, and the most figures. */
const LONGEST = sheetByModule(13)

const PAGES = [
  // §15.1 — `/` is the home screen and the flat manifest is `/sheets/`. Both
  // are here: the home screen because it is what a reader meets first, and the
  // manifest because it carries the 1060px table that used to live at `/` and
  // is still the widest non-prose thing on the site.
  ['home screen', '/'],
  ['manifest', INDEX_SHEET],
  ['drawing set', '/courses/'],
  ['category', CATEGORY_PATHS[1]],
  ['SHORT sheet', SHORT.path],
  ['A4 sheet', A4.path],
  ['module 10', WIDEST.path],
  ['module 13', LONGEST.path],
  // §16, hazard H-O — `/profile/` was never loaded below 1440 by any spec, and
  // §16.1's drafter block is the site's first two-column block outside a module
  // sheet: a 168px drawing column beside a form, a register whose summary is a
  // three-column grid, and an eight-cell mark row that has to wrap at 390. It is
  // here as a general property (the document never scrolls sideways) rather than
  // as a string match, which is what the rest of this list is for.
  ['profile sheet', '/profile/'],
] as const

/**
 * How far past the viewport the document actually goes, and what is doing it.
 *
 * `documentElement.scrollWidth` is the headline answer, but on its own it is a
 * poor witness: it says a number and not a culprit, and a page can also
 * overhang without growing it. So every laid-out element is measured too — and
 * an element is only an offender if nothing between it and the root is a
 * horizontal scroller.
 *
 * That exclusion is the design, not a let-off. §4.7 says wide content scrolls
 * *inside its own container*, so a 1060px table inside an `overflow-x: auto`
 * region is the rule being kept; the same table with no such ancestor is the
 * rule being broken. `the widest table scrolls inside its own container`
 * below asserts the other half, that those containers really are scrolling.
 */
async function overhang(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement
    const width = root.clientWidth

    /** Does anything above this element take responsibility for the overflow? */
    const contained = (el: Element): boolean => {
      for (let node = el.parentElement; node; node = node.parentElement) {
        const overflowX = getComputedStyle(node).overflowX
        if (overflowX !== 'visible') return true
      }
      return false
    }

    const name = (el: Element) => {
      // SVG elements carry an SVGAnimatedString, not a string.
      const cls = typeof el.className === 'string' ? el.className : el.getAttribute('class') ?? ''
      return `${el.tagName.toLowerCase()}${cls ? `.${cls.split(' ')[0]}` : ''}`
    }

    const offenders: string[] = []
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      const style = getComputedStyle(el)
      if (style.position === 'fixed' || style.visibility === 'hidden') continue
      if (style.display === 'none') continue

      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      // 1px of rounding is the browser's, not the layout's.
      if (rect.right <= width + 1 && rect.left >= -1) continue
      if (contained(el)) continue

      offenders.push(`${name(el)} ${Math.round(rect.left)}..${Math.round(rect.right)}`)
    }

    return {
      documentOverflow: root.scrollWidth - width,
      bodyOverflow: document.body.scrollWidth - width,
      offenders: offenders.slice(0, 6),
      viewport: width,
    }
  })
}

for (const [name, path] of PAGES) {
  test(`${name} never scrolls the document sideways`, async ({ page }) => {
    await page.goto(path)
    // Figures render their diagrams client-side; measure after they land.
    await page.waitForLoadState('networkidle')

    const result = await overhang(page)
    expect(
      result.documentOverflow,
      `document is ${result.documentOverflow}px wider than the ${result.viewport}px `
      + `viewport; offenders: ${result.offenders.join(', ') || 'none'}`,
    ).toBeLessThanOrEqual(0)
    expect(result.bodyOverflow).toBeLessThanOrEqual(0)
    expect(
      result.offenders,
      `nothing above these elements scrolls, so they push the ${result.viewport}px page`,
    ).toEqual([])
  })
}

test('a scroll of the page cannot be nudged sideways by a wide table', async ({ page }) => {
  await page.goto(WIDEST.path)
  await page.waitForLoadState('networkidle')

  // The real gesture, not a measurement: scroll right as far as the document
  // will go and check it did not go anywhere.
  await page.evaluate(() => window.scrollTo(4000, 0))
  expect(await page.evaluate(() => window.scrollX)).toBe(0)
})

test('the widest table scrolls inside its own container', async ({ page }) => {
  await page.goto(WIDEST.path)
  await page.waitForLoadState('networkidle')

  const viewport = page.viewportSize()!.width
  const report = await page.locator('[data-hl-prose] .hl-figure.hl-table').evaluateAll(
    (nodes) => nodes.map((node) => {
      const scroller = (node.querySelector('[class*="scroll"]') ?? node) as HTMLElement
      return {
        clientWidth: scroller.clientWidth,
        scrollWidth: scroller.scrollWidth,
        overflowX: getComputedStyle(scroller).overflowX,
      }
    }),
  )

  expect(report.length, 'module 10 still has tables').toBeGreaterThan(0)
  for (const figure of report) {
    expect(figure.overflowX).toBe('auto')
  }

  // At 390 the containment has to be doing real work, or the assertion above
  // is proving nothing: at least one table must be wider than the phone.
  if (viewport < 500) {
    expect(
      report.some((f) => f.scrollWidth > f.clientWidth),
      'no table is actually overflowing its container at 390px — either the '
      + 'corpus changed or the table collapsed instead of scrolling',
    ).toBe(true)
  }
})

test('the manifest table scrolls inside its region rather than the page', async ({ page }) => {
  await page.goto(INDEX_SHEET)

  const region = page.locator('.hl-index-scroll')
  const measured = await region.evaluate((el) => ({
    clientWidth: el.clientWidth,
    scrollWidth: el.scrollWidth,
    overflowX: getComputedStyle(el).overflowX,
  }))

  expect(measured.overflowX).toBe('auto')
  if (page.viewportSize()!.width < 1024) {
    expect(measured.scrollWidth).toBeGreaterThan(measured.clientWidth)
  }
})

/**
 * §6.5's affordance row: a 24px right-edge fade "applied **only while**
 * `scrollWidth > clientWidth` and removed at the right end".
 *
 * It used to be scoped to `[data-hl-prose]`, which left out the two scrollers
 * that need it most: the index sheet's 1060px manifest table, which is the
 * site's primary navigation surface and sits outside the prose column, and
 * every code block, which §6.7 gives `overflow-x: auto` and no cue at all. At
 * 390px that meant four columns of the manifest and half of every code fence
 * ending at a hard border with nothing to say they continued.
 *
 * The manifest table is at `/sheets/` since §15.1 moved it; the reason it is
 * checked is the reason it was always checked, and it did not move with the
 * route. The home screen is not in this loop: it has no scroller at any of the
 * three widths, so `scrollers.length > 0` there asserts the absence of a
 * subject rather than the presence of an affordance. What §4.7 still demands of
 * it is asserted directly, below.
 */
for (const [name, path] of [['manifest', INDEX_SHEET], ['module 13', LONGEST.path]] as const) {
  test(`${name} tells the reader where a scroller continues`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')

    const scrollers = await page.locator('[data-hl-scroller]').evaluateAll(
      (nodes) => nodes.map((node) => ({
        kind: node.className || node.tagName.toLowerCase(),
        overflows: node.scrollWidth > node.clientWidth + 1,
        marked: node.getAttribute('data-hl-overflow'),
        mask: getComputedStyle(node).maskImage,
      })),
    )

    expect(scrollers.length, `${path} has scroll containers`).toBeGreaterThan(0)
    for (const scroller of scrollers) {
      if (scroller.overflows) {
        expect(scroller.marked, `${scroller.kind} overflows silently`).toBe('right')
        expect(scroller.mask, `${scroller.kind} has no fade`).toContain('gradient')
      } else {
        // The other half of §6.5: a fade over content that does not continue
        // is the affordance lying about there being more.
        expect(scroller.marked, `${scroller.kind} fades but fits`).toBeNull()
        expect(scroller.mask).toBe('none')
      }
    }

    // At 390 the containment has to be doing real work, or the loop above is
    // proving nothing.
    if (page.viewportSize()!.width < 500) {
      expect(scrollers.some((s) => s.overflows)).toBe(true)
    }
  })
}

/**
 * §4.7 for the front door, asserted as the gesture rather than the measurement.
 *
 * `home screen never scrolls the document sideways` above measures the layout;
 * this drags it. The two fail differently — a document can refuse to grow and
 * still be draggable, which is how the widest sheet is checked at line 115 —
 * and `/` is now the one page every reader lands on, with two blocks in the DOM
 * of which the stylesheet hides one. A block hidden by `display: none` still
 * costs nothing sideways, but the block that is *shown* is chosen before first
 * paint and never measured by React, so nothing else in the suite would notice
 * it overhanging at 390px.
 *
 * The width guard is the mutation test: with both blocks gone, or the visible
 * one collapsed, an empty page cannot be dragged either and this would pass
 * while proving nothing.
 */
test('the home screen cannot be nudged sideways at any width', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const viewport = page.viewportSize()!.width

  // Exactly one of §15.2's two blocks is laid out, and it fills the column.
  const shown = await page.locator('.hl-home-new, .hl-home-resume').evaluateAll(
    (nodes) => nodes
      .filter((node) => node.checkVisibility())
      .map((node) => Math.round(node.getBoundingClientRect().width)),
  )
  expect(shown, 'the home screen renders one of its two blocks').toHaveLength(1)
  expect(shown[0], 'the visible block has no width to overhang with')
    .toBeGreaterThan(viewport / 2)

  await page.evaluate(() => window.scrollTo(4000, 0))
  expect(await page.evaluate(() => window.scrollX)).toBe(0)
})

/**
 * §10.4 on the alias picker, which the test above cannot reach.
 *
 * That test measures the `::after` hit-area idiom on a module sheet. The mark
 * picker meets the floor a different way — `max-md:min-h-11` on the label, which
 * is `RolePicker`'s spelling of the same rule — so it needs its own measurement
 * rather than an entry in that selector list.
 *
 * It is worth a test of its own because it shipped 2px under: MEASURED at 42px
 * against a 44px floor, on a screen whose whole purpose is a reader choosing
 * between eight options with a thumb. Nothing else in the suite looks at this
 * route's controls.
 */
test('the mark options reach the §10.4 touch floor below 768px', async ({ page }) => {
  test.skip(page.viewportSize()!.width >= 768, '§10.4 sets the floor below 768')

  // §16.2.2 — one picker, three call sites, and two of them are routes a reader
  // reaches on a phone. `/sign-in/alias/` is the first-run screen this test was
  // written for; `/profile/` renders the same component at its default prefix
  // inside the drafter block, and it is the one that changed — the floor is now
  // stated once in `profile.css` as an unconditional `min-height` on the cell
  // rather than by `max-md:min-h-11` on this screen's own label, so a
  // measurement on one route no longer says anything about the other.
  for (const route of ['/sign-in/alias/', '/profile/']) {
    await page.goto(route)
    await page.waitForLoadState('networkidle')

    const options = await page
      .locator('label[data-hl-mark]')
      .evaluateAll((nodes) => nodes.map((node) => ({
        mark: node.getAttribute('data-hl-mark'),
        height: Math.round(node.getBoundingClientRect().height),
      })))

    // Asserted, not assumed: a picker that rendered nothing would otherwise pass
    // a loop over an empty list. Eight is the whole vocabulary — `seeded` plus the
    // seven named glyphs — and `alias.spec.ts` pins the order. Exactly eight is
    // also hazard H-C: `data-hl-mark` on a wrapper as well as on the label makes
    // this sixteen, and the picker would still look right.
    expect(options.length, `${route} no longer renders eight mark options`).toBe(8)
    for (const option of options) {
      expect(
        option.height,
        `${option.mark} is under the touch floor on ${route}`,
      ).toBeGreaterThanOrEqual(44)
    }
  }
})

test('every control reaches the §10.4 touch floor below 768px', async ({ page }) => {
  test.skip(page.viewportSize()!.width >= 768, '§10.4 sets the floor below 768')

  await page.goto(LONGEST.path)
  await page.waitForLoadState('networkidle')

  // MEASURED: `COPY` painted 47 × 24 and `EXPAND` 61.6 × 24 with no hit area
  // at all, and the two controls that did have one reached 42 × 42 — Tailwind's
  // preflight makes them border-box and both carry a transparent hairline
  // border, so a hand-tuned `inset` resolved against a padding box 2px smaller
  // than the painted one.
  const controls = await page
    .locator('.hl-code-copy, .hl-cap-action, .hl-icon-btn, .hl-button')
    // A control the reader cannot reach has no floor to meet. §12 added a
    // `Keyboard shortcuts` trigger that is `display: none` below 768px — a
    // table of keystrokes is a control for a device with keys — and an
    // undisplayed element's pseudo has no used width, so measuring it yields
    // `auto` and then `NaN`. Filter first, and assert below that something
    // survived, so this can never become a scan of nothing.
    .evaluateAll((nodes) => nodes.filter((node) => node.checkVisibility()).map((node) => {
      const hit = getComputedStyle(node, '::after')
      const painted = node.getBoundingClientRect()
      return {
        kind: (typeof node.className === 'string' ? node.className : '').split(' ')[0],
        painted: [Math.round(painted.width), Math.round(painted.height)],
        content: hit.content,
        width: Number.parseFloat(hit.width),
        height: Number.parseFloat(hit.height),
        position: hit.position,
      }
    }))

  expect(controls.length, 'sheet 13 still has controls to hit').toBeGreaterThan(3)
  for (const control of controls) {
    expect(control.content, `${control.kind} has no hit area`).not.toBe('none')
    expect(control.position, `${control.kind}'s hit area is not positioned`)
      .toBe('absolute')
    expect(control.width, `${control.kind} is ${control.width}px wide to hit`)
      .toBeGreaterThanOrEqual(44)
    expect(control.height, `${control.kind} is ${control.height}px tall to hit`)
      .toBeGreaterThanOrEqual(44)
  }
})

test('the sheet gives up its zones in §4.7 order as the viewport narrows', async ({ page }) => {
  const width = page.viewportSize()!.width
  await page.goto(LONGEST.path) // an A0 sheet — the only format with three zones

  const rightRail = page.locator('.hl-rail-right')
  const leftRail = page.locator('.hl-rail-left')
  const drawer = page.getByRole('button', { name: 'Contents', exact: true })

  if (width >= 1280) {
    await expect(rightRail).toBeVisible()
    await expect(leftRail).toBeVisible()
    await expect(drawer).toBeHidden()
  } else if (width >= 1024) {
    // Right rail collapses; the title block becomes the strip (§4.7).
    await expect(rightRail).toBeHidden()
    await expect(leftRail).toBeVisible()
    await expect(page.locator('.hl-title-strip')).toBeVisible()
  } else {
    // Left rail becomes a drawer; one column.
    await expect(rightRail).toBeHidden()
    await expect(leftRail).toBeHidden()
    await expect(drawer).toBeVisible()
    await expect(page.locator('.hl-title-strip')).toBeVisible()
  }
})

test('the A4 sheet keeps its band and schedule at every width', async ({ page }) => {
  await page.goto(A4.path)
  await expect(page.locator('.hl-status-band')).toBeVisible()
  await expect(page.locator('table.hl-schedule')).toBeVisible()
  await expect(page.locator('.hl-rail-left')).toHaveCount(0)
})
