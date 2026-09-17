import { type Page, expect, test } from '@playwright/test'

/**
 * The premise, measured in the engine that has to paint it.
 *
 * `tests/unit/stroke-weights.test.ts` refuses a fractional pixel in any border
 * or outline across the shipped stylesheets. That rule is only worth having if
 * Chrome really does floor a border width, so this asks it directly rather than
 * citing a measurement taken once and written down.
 *
 * ## What was here until M16
 *
 * Two more tests, both about the retired design's three-weight line system:
 * one read `--stroke-struct` off `:root` and required a `.hl-rule-struct` box
 * to measure exactly 1.5px, the other required `.prose h1` and
 * `.prose thead th` to paint that weight as a background and keep a
 * transparent border. **The T4 language has no such system** — it separates a
 * hairline from a strong edge by colour, and every line it draws is one whole
 * pixel — so those two were assertions about a design that no longer exists.
 * `logs/BRAINSTORM.md` D32 records the retirement; the unit half carries the
 * rule that survived it.
 */

/** The browser fact the whole no-fractional-border rule rests on. */
async function borderFlooring(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement('div')
    probe.style.cssText =
      'width:80px;height:20px;border-top:1.5px solid red;border-bottom:2px solid red;'
      + 'background-image:linear-gradient(red 0 0);background-size:100% 1.5px;'
    document.body.append(probe)
    const style = getComputedStyle(probe)
    const measured = {
      border1_5: style.borderTopWidth,
      border2: style.borderBottomWidth,
      background1_5: style.backgroundSize,
      dpr: window.devicePixelRatio,
    }
    probe.remove()
    return measured
  })
}

test('Chrome floors a border width, so a fractional one never paints', async ({ page }) => {
  await page.goto('/')
  const measured = await borderFlooring(page)

  // If `border1_5` ever starts reading 1.5px, the unit rule stops being a
  // correctness guard and becomes a consistency one. Nothing else changes.
  expect(measured.border1_5, 'a 1.5px border').toBe('1px')
  expect(measured.border2, 'a 2px border, for contrast').toBe('2px')
  expect(measured.background1_5, 'a 1.5px background is not floored')
    .toBe('100% 1.5px')
})
