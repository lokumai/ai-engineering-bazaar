import { type Page, expect, test } from '@playwright/test'
import { SHEETS } from './sheets'

/**
 * M11 — **a diagram wider than its column cannot paint outside it.**
 *
 * This is the only one of the thirteen flaws
 * (`kia-context/logs/BRAINSTORM.md` D10) that was a defect rather than a matter
 * of taste, so it gets a spec of its own and it runs at all three viewport
 * projects rather than at 1440 alone.
 *
 * ## Why it can only be answered in a browser, and only after mermaid runs
 *
 * The build emits `<div class="mermaid-source" data-mermaid="…">` and a
 * placeholder. The SVG does not exist until the island imports mermaid, renders
 * it, and pins it to its natural content width — so **the overflow this spec
 * exists to catch does not exist in the served HTML, does not exist at
 * `DOMContentLoaded`, and does not reliably exist at `networkidle` either.**
 * Every check here waits on `data-hl-ready`, which the island sets on a figure
 * only once its SVG is in the DOM and measured. A check that waits on the
 * network instead is a check that races the thing it is checking, and this
 * suite has already been bitten by that: `anatomy.spec.ts`'s figure test passed
 * alone and failed under parallel load for exactly this reason
 * (`kia-context/logs/BRAINSTORM.md` D20).
 *
 * ## What "cannot paint outside it" is measured as
 *
 * Not "no element has a right edge beyond the column" — that would forbid the
 * scroll container the design requires, because a 1,524px drawing inside a
 * 781px box legitimately HAS geometry past the edge; it is simply not painted.
 * What is measured is the painted rectangle: an element's own box intersected
 * with the box of every clipping ancestor above it. If that intersection is
 * empty the element paints nothing, and if it is not, it must lie inside the
 * column.
 *
 * **Mutation-tested.** Forcing `overflow-x: visible` on the scroll container
 * and restoring the retired 1152px break-out width put 57 elements outside the
 * column, at 275px past its right edge, and pushed the document's own scroll
 * width to 1511px on a 1440px window. Every assertion below fires on that.
 */

/** The modules that actually carry a diagram — asked of the page, not listed. */
const WITH_FIGURES = SHEETS.filter((sheet) => sheet.drawn).map((sheet) => sheet.path)

/**
 * Waits until every diagram on the page has been rendered and measured.
 *
 * `data-hl-ready` is the island's own signal (`MermaidFigure.tsx`) and it is
 * set after the SVG is inserted AND pinned to its natural width, which is the
 * exact moment the overflow becomes measurable.
 */
async function figuresRendered(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const all = () => document.querySelectorAll('[data-hl-prose] .bz-diagram')
    const ready = () => document.querySelectorAll('[data-hl-prose] .bz-diagram[data-hl-ready]')
    const deadline = Date.now() + 20_000
    while (all().length !== ready().length && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    return all().length
  })
}

interface Overflow {
  /** How many elements of a diagram paint outside the column. */
  outside: number
  /** The worst of them, in pixels past an edge. Zero when none does. */
  worstPx: number
  /** The widest SVG on the page, so a run that measured nothing says so. */
  widestSvg: number
  columnWidth: number
  documentScrollWidth: number
  viewportWidth: number
}

/**
 * The painted geometry of every element of every diagram, against the column.
 *
 * Runs in the page and closes over nothing.
 */
function probe(): Overflow {
  const column = document.querySelector('.bz-col')!.getBoundingClientRect()

  /** An element's box clipped by every ancestor that clips, or null if hidden. */
  const painted = (element: Element): { left: number; right: number } | null => {
    const box = element.getBoundingClientRect()
    let left = box.left
    let right = box.right
    for (let node = element.parentElement; node; node = node.parentElement) {
      if (getComputedStyle(node).overflowX === 'visible') continue
      const clip = node.getBoundingClientRect()
      left = Math.max(left, clip.left)
      right = Math.min(right, clip.right)
      if (right <= left) return null
    }
    return { left, right }
  }

  let outside = 0
  let worst = 0
  let widest = 0

  for (const svg of document.querySelectorAll('[data-hl-prose] .bz-diagram svg')) {
    widest = Math.max(widest, svg.getBoundingClientRect().width)
  }

  const parts = document.querySelectorAll(
    '[data-hl-prose] .bz-diagram svg, [data-hl-prose] .bz-diagram svg *',
  )
  for (const part of parts) {
    const box = part.getBoundingClientRect()
    if (box.width === 0 && box.height === 0) continue
    const visible = painted(part)
    if (visible === null) continue
    const over = Math.max(visible.right - column.right, column.left - visible.left)
    if (over > 1) {
      outside += 1
      worst = Math.max(worst, over)
    }
  }

  return {
    outside,
    worstPx: Math.round(worst),
    widestSvg: Math.round(widest),
    columnWidth: Math.round(column.width),
    documentScrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }
}

test.describe('a diagram is contained by its column', () => {
  for (const path of WITH_FIGURES) {
    test(`nothing of a diagram paints outside the column on ${path}`, async ({ page }) => {
      await page.goto(path)
      const figures = await figuresRendered(page)
      test.skip(figures === 0, 'this module carries no diagram')

      const result = await page.evaluate(probe)

      // The check is worthless if mermaid never drew anything, so say what was
      // actually measured before asserting anything about it.
      expect(result.widestSvg, 'no diagram was rendered to measure').toBeGreaterThan(0)

      expect(
        result.outside,
        `${result.outside} elements paint up to ${result.worstPx}px outside a ` +
        `${result.columnWidth}px column, from a ${result.widestSvg}px drawing`,
      ).toBe(0)
    })
  }

  /**
   * The widest drawing in the corpus, and the one D10 measured: at 1440px it
   * arrived 1,524px wide and painted from x=360 to x=1884 on a 1440px window.
   * It is reached by route rather than by number, so a reorder cannot silently
   * point this at a different module (D9).
   */
  test('the widest diagram scrolls inside its own box rather than widening the page', async ({
    page,
  }) => {
    await page.goto('/courses/intermediate/security/')
    await figuresRendered(page)

    const result = await page.evaluate(probe)
    expect(result.widestSvg).toBeGreaterThan(result.columnWidth)

    // The container takes the extra width, so the DOCUMENT does not.
    expect(result.documentScrollWidth).toBeLessThanOrEqual(result.viewportWidth)

    // …and it says so: the scroll container really can be scrolled, which is
    // what makes the clipped part reachable rather than lost.
    const scrollable = await page.evaluate(() =>
      [...document.querySelectorAll('[data-hl-prose] .bz-figure-body')].map(
        (body) => body.scrollWidth > body.clientWidth,
      ),
    )
    expect(scrollable).toContain(true)
  })

  /**
   * The keyboard half of the same rule. A horizontal scroll container that a
   * pointer can scroll and a keyboard cannot is content a keyboard reader
   * cannot reach (§10.3), so every one of them is a tab stop with a name.
   * Asserted by PRESSING the key, both halves. The first version of this test
   * said exactly that in this docblock and then called `.focus()`, which is
   * D17's documented anti-pattern committed a second time in the file that
   * carries M11's headline fix: `.focus()` succeeds on an element a Tab press
   * can never reach, so the reachability half was unmeasured. It now walks the
   * document with real Tab presses until the container takes focus, and fails
   * with the number of stops it tried if it never does. MEASURED on
   * `intermediate/prompt-engineering` at 1440px: the container takes focus at
   * press 38.
   */
  test('a clipped diagram is reachable and scrollable from the keyboard', async ({ page }) => {
    await page.goto('/courses/intermediate/security/')
    await figuresRendered(page)

    const body = page.locator('[data-hl-prose] .bz-figure-body').first()
    await expect(body).toHaveAttribute('tabindex', '0')
    await expect(body).toHaveAttribute('aria-label', /figure/i)

    // A real Tab walk. The cap is generous because the count is a fact about
    // the page's controls and not about this rule, and a cap that tracked it
    // would turn an ordinary edit red.
    const LIMIT = 250
    let reached = false
    for (let press = 0; press < LIMIT; press += 1) {
      if (await body.evaluate((node) => node === document.activeElement)) {
        reached = true
        break
      }
      await page.keyboard.press('Tab')
    }
    expect(
      reached,
      `the diagram's scroll container never took focus in ${LIMIT} Tab presses`,
    ).toBe(true)
    await expect(body).toBeFocused()
    const before = await body.evaluate((node) => node.scrollLeft)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    // Polled, not read once. MEASURED: the scroll lands within ~200ms of the
    // keypress and at 390px with a device scale factor of 3 it is slower than
    // at 1440px — reading `scrollLeft` in the next protocol round trip caught
    // it at zero and reported a keyboard path that works as one that does not.
    // The same mistake as D20, in a test written the same afternoon.
    await expect
      .poll(() => body.evaluate((node) => node.scrollLeft), { timeout: 3_000 })
      .toBeGreaterThan(before)
  })
})
