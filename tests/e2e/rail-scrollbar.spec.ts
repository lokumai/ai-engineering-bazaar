import { type Page, expect, test } from '@playwright/test'
import { A0 } from './sheets'
/**
 * THE SCROLLBAR, measured in a window that draws one.
 *
 * Every other test in this suite runs with `--hide-scrollbars`, so the rail's
 * scrollbar is an overlay there and takes no width — while the author, on a
 * desktop browser with classic scrollbars, saw a 15px gutter and asked for
 * *"something subtle … rather than the default, heavy scrollbar which takes a
 * lot of space"*. A check of the scrollbar from inside the headless default
 * would measure a gutter of zero and pass whatever the stylesheet said.
 *
 * The rule is a ceiling rather than a number: the gutter may take the inner's
 * right padding and never the content. Read off the page, so the padding and
 * the width are the language's to change together.
 */
/* A file of its own because a launch option forces a new worker, which
   Playwright allows only at the top of a file. */
test.use({ launchOptions: { args: [], ignoreDefaultArgs: ['--hide-scrollbars'] } })

test.describe('the rail scrollbar', () => {
  async function gutter(page: Page) {
    return page.evaluate(() => {
      const rail = document.querySelector<HTMLElement>('.bz-rail')!
      const inner = document.querySelector('.bz-rail-inner')!
      return {
        gutter: rail.offsetWidth - rail.clientWidth,
        scrolls: rail.scrollHeight > rail.clientHeight,
        padding: parseFloat(getComputedStyle(inner).paddingRight),
      }
    })
  }

  test('takes the padding and never the content', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 600 })
    await page.goto(A0.path)
    await page.evaluate(() => {
      for (const one of document.querySelectorAll<HTMLDetailsElement>('.bz-rail details')) {
        one.open = true
      }
    })

    const styled = await gutter(page)
    // Both halves of non-vacuity: a rail that does not scroll draws no bar, and
    // a window that hides scrollbars draws a zero-width one.
    expect(styled.scrolls, 'the rail does not scroll, so nothing was measured').toBe(true)
    expect(styled.gutter, 'no classic scrollbar was drawn, so nothing was measured').toBeGreaterThan(0)
    expect(styled.gutter).toBeLessThanOrEqual(styled.padding)

    // The mutation, in the same sitting: the browser's own width fails it.
    await page.addStyleTag({ content: '.bz-rail::-webkit-scrollbar { width: 15px !important; }' })
    const heavy = await gutter(page)
    expect(heavy.gutter, 'a default-width bar would pass this check').toBeGreaterThan(heavy.padding)
  })
})
