import { type Locator, type Page, expect, test } from '@playwright/test'
import { A0, A2, A4 } from './sheets'

/**
 * §4.4 — the three sheet formats, each rendering its own anatomy.
 *
 * The failure this guards against is the one §4.4 names as the biggest in the
 * whole direction: an A4 stub wrapped in A0 chrome, or an A0 assembly quietly
 * degrading to a single column because a grid rule stopped matching. Both
 * still show an h1 and both still pass `module-sheets.spec.ts`. The difference
 * is structural, so it is asserted structurally — which parts exist, which do
 * not, and how wide the prose actually is.
 *
 * These run at 1440 (the `chrome-1440` project), where §4.7 gives every format
 * its full three-zone behaviour. `responsive.spec.ts` covers what happens as
 * the zones collapse.
 */

/** The rendered width of an element, which is the thing §4.4 legislates. */
async function widthOf(locator: Locator): Promise<number> {
  const box = await locator.boundingBox()
  if (!box) throw new Error('element has no box')
  return Math.round(box.width)
}

/**
 * The width of the *drawing*, and where it sits in the 1152px box.
 *
 * `.hl-sheet` is the grid container and it always spans the shell; §4.4's
 * numbers are the width of the tracks inside it, and "centred in the 1152 box"
 * is a statement about the leftover space either side. So this measures the
 * zones themselves, from the left edge of the first to the right edge of the
 * last, and reports how far each margin is from the container's edge.
 */
async function zones(page: Page, selectors: readonly string[]) {
  const boxes = await Promise.all(
    selectors.map(async (selector) => {
      const box = await page.locator(selector).boundingBox()
      if (!box) throw new Error(`${selector} has no box`)
      return box
    }),
  )
  const sheet = await page.locator('.hl-sheet').boundingBox()

  const left = Math.min(...boxes.map((b) => b.x))
  const right = Math.max(...boxes.map((b) => b.x + b.width))

  return {
    width: Math.round(right - left),
    leadIn: Math.round(left - sheet!.x),
    leadOut: Math.round(sheet!.x + sheet!.width - right),
  }
}

test.describe('A0 — the assembly sheet', () => {
  test('has a section spine, a 656px prose column and a title block', async ({ page }) => {
    await page.goto(A0.path)

    // Zone 1: the section spine, tracking scroll and nothing else (§4.6).
    const spine = page.locator('.hl-rail-left nav[aria-label="Sections"]')
    await expect(spine).toBeVisible()
    expect(await spine.locator('.hl-toc-entry').count()).toBeGreaterThan(2)
    expect(await widthOf(page.locator('.hl-rail-left'))).toBe(208)

    // …and the dependency block below its rule, the rail's other half.
    await expect(page.locator('.hl-rail-left').getByText('Requires', { exact: false }).first())
      .toBeVisible()

    // Zone 2: the prose column, at the measure §4.4 gives it.
    const prose = page.locator('[data-hl-prose]')
    await expect(prose).toBeVisible()
    expect(await widthOf(page.locator('.hl-column'))).toBe(656)

    // Zone 3: the title block, as the 240px panel rather than the strip.
    const titleBlock = page.locator('.hl-rail-right .hl-title-block')
    await expect(titleBlock).toBeVisible()
    expect(await widthOf(page.locator('.hl-rail-right'))).toBe(240)
    await expect(titleBlock.locator('.hl-title-block-row')).not.toHaveCount(0)

    // The strip variant is the *fallback* for this format and must not double
    // up with the panel at a width where the panel is showing (§4.7).
    await expect(page.locator('.hl-column .hl-title-strip')).toBeHidden()

    // 208 + 24 + 656 + 24 + 240 = 1152, exactly (§4.6) — and it fills the box,
    // so there is nothing left over either side.
    const drawing = await zones(page, ['.hl-rail-left', '.hl-column', '.hl-rail-right'])
    expect(drawing.width).toBe(1152)
    expect(drawing.leadIn).toBe(0)
    expect(drawing.leadOut).toBe(0)
  })

  test('a figure that covers a rail reads as covering it', async ({ page }) => {
    await page.goto(A0.path)
    await page.waitForLoadState('networkidle')

    const figures = await page.locator('[data-hl-prose] .hl-figure').evaluateAll(
      (nodes) => {
        const column = document.querySelector('.hl-column')!.getBoundingClientRect()
        return nodes.map((node) => {
          const rect = node.getBoundingClientRect()
          const edge = getComputedStyle(node, '::before')
          // `content: none` means there is no pseudo-element at all, and its
          // other properties are then the element's own inherited values.
          const drawn = edge.content !== 'none'
          return {
            width: node.getAttribute('data-hl-width'),
            breaksOut: rect.left < column.left - 1 || rect.right > column.right + 1,
            edgeColor: drawn ? edge.borderLeftColor : 'rgba(0, 0, 0, 0)',
            edgeWidth: drawn ? edge.borderLeftWidth : '0px',
          }
        })
      },
    )

    // §6.5 gives a 5-column table 920px — "prose + gutter + right rail" — so
    // the collision with the title block is designed, not accidental. What was
    // missing was any sign of it: both grounds are `--color-paper`, so the
    // panel underneath did not read as covered, it read as gone.
    const broken = figures.filter((figure) => figure.breaksOut)
    expect(broken.length, 'sheet 13 still has a figure that breaks the measure')
      .toBeGreaterThan(0)

    for (const figure of broken) {
      expect(figure.edgeColor, `a ${figure.width} figure with no edge`)
        .not.toBe('rgba(0, 0, 0, 0)')
      // §2.2's hairline. Not the struct weight: this is a divider, not
      // structure — the figure's own rules already close it top and bottom.
      expect(figure.edgeWidth).toBe('1px')
    }

    // …and a figure that is not covering anything is not boxed in either: a
    // hairline down a figure sitting flush in the measure means nothing (§1).
    for (const figure of figures.filter((f) => !f.breaksOut)) {
      expect(figure.edgeColor, `a flush ${figure.width} figure was boxed`)
        .toBe('rgba(0, 0, 0, 0)')
    }
  })

  test('the spine follows the reader down the sheet', async ({ page }) => {
    await page.goto(A0.path)

    const current = page.locator('.hl-toc-entry[aria-current="true"]')
    const headings = page.locator('[data-hl-prose] h2')

    // At the top of the sheet the reader has not reached a section yet, and
    // the spine says so by marking none — it tracks position, not progress
    // (§4.6 part 1), so there is nothing to highlight before the first h2.
    await expect(current).toHaveCount(0)

    // `scrollIntoView`, not `scrollIntoViewIfNeeded`: on a 900px viewport the
    // first h2 is already on screen at rest, and a no-op scroll would prove
    // nothing about the observer.
    await headings.first().evaluate((el) => el.scrollIntoView())
    await expect(current).toHaveCount(1)
    const atFirst = await current.textContent()

    await headings.last().evaluate((el) => el.scrollIntoView())
    await expect(current).toHaveCount(1)
    await expect
      .poll(() => current.textContent(), { timeout: 5_000 })
      .not.toBe(atFirst)

    // Back to the top and the spine lets go again rather than sticking on the
    // last section the reader happened to touch.
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(current).toHaveCount(0)
  })
})

test.describe('A2 — the part sheet', () => {
  test('carries the horizontal title strip, not the panel', async ({ page }) => {
    await page.goto(A2.path)

    const strip = page.locator('.hl-title-strip')
    await expect(strip).toBeVisible()
    await expect(strip.locator('.hl-title-strip-pair')).not.toHaveCount(0)

    // It sits beneath the h1, which is the whole point of the variant (§5.5).
    const h1Box = await page.locator('main h1').boundingBox()
    const stripBox = await strip.boundingBox()
    expect(stripBox!.y).toBeGreaterThan(h1Box!.y)

    // No third zone: an A2 sheet is two zones centred in the 1152 box (§4.4).
    await expect(page.locator('.hl-rail-right')).toHaveCount(0)
    await expect(page.locator('.hl-title-block')).toHaveCount(0)

    // It is a drawn sheet, so it keeps the spine and the prose.
    await expect(page.locator('.hl-rail-left nav[aria-label="Sections"]')).toBeVisible()
    expect(await widthOf(page.locator('.hl-column'))).toBe(656)

    // 208 + 24 + 656 = 888, centred in the 1152 box: the leftover space is
    // equal either side, which is the half of §4.4 that a width alone misses.
    const drawing = await zones(page, ['.hl-rail-left', '.hl-column'])
    expect(drawing.width).toBe(888)
    expect(drawing.leadIn).toBe(drawing.leadOut)
    expect(drawing.leadIn).toBe(132)

    // …and none of the A4 furniture.
    await expect(page.locator('.hl-status-band')).toHaveCount(0)
    await expect(page.locator('.hl-schedule')).toHaveCount(0)
  })
})

test.describe('A4 — the detail sheet', () => {
  test('is a status band and a schedule of parts, with no rails', async ({ page }) => {
    await page.goto(A4.path)

    // §4.5 item 1 — the band says the two true things, in words (§10.4).
    const band = page.locator('.hl-status-band')
    await expect(band).toBeVisible()
    await expect(band).toContainText(/not yet drawn/i)
    await expect(band).toContainText(/schedule of parts only/i)

    // §4.5 item 6 — the topics list as a hairline table, not as bullets.
    const schedule = page.locator('table.hl-schedule')
    await expect(schedule).toBeVisible()
    await expect(schedule.locator('thead th')).toHaveText([/item/i, /description/i])
    const items = schedule.locator('tbody tr')
    expect(await items.count()).toBeGreaterThan(0)
    // The `ITEM` column is a derived ordinal, zero-padded like `DRAWING`.
    await expect(items.first().locator('.hl-schedule-item')).toHaveText('01')

    // "One column: 656px centred. No rails." — at any width (§4.4).
    await expect(page.locator('.hl-rail-left')).toHaveCount(0)
    await expect(page.locator('.hl-rail-right')).toHaveCount(0)
    await expect(page.locator('nav[aria-label="Sections"]')).toHaveCount(0)

    const drawing = await zones(page, ['.hl-column'])
    expect(drawing.width).toBe(656)
    expect(drawing.leadIn).toBe(drawing.leadOut)

    // The title block is the strip here too, and no prose is rendered: §4.5's
    // body is one sentence and the schedule.
    await expect(page.locator('.hl-title-strip')).toBeVisible()
    await expect(page.locator('[data-hl-prose]')).toHaveCount(0)
  })

  test('makes no claim about a reader it has never met', async ({ page }) => {
    await page.goto(A4.path)

    // §4.5: no stamp slots, no XP, no completion — on a sheet that is not
    // drawn there is nothing to have read (§1, §7.2).
    await expect(page.locator('.hl-title-block')).toHaveCount(0)
    await expect(page.locator('[class*="stamp"]')).toHaveCount(0)
  })
})
