import { expect, test } from '@playwright/test'
import { A0, A4, CATEGORY_PATHS, SHORT } from './sheets'

/**
 * The footer carries no reading-record row (M111, D134).
 *
 * It used to open with a 40px row: the page's sheet label, the file's revision and a compact
 * readout of the reader's record. The author called it useless and it was removed end to end. This
 * file guards the removal by STRUCTURE, never by the English the row printed: a row that came back
 * in another wording, or one more cell in front of the provenance row, still fails here.
 *
 * Three claims. The footer is two blocks and no more (the provenance row, then the owner's
 * `<address>`), the provenance row holds nothing but links and separators, and the footer is the
 * same on every route, because a sheet label or a revision is exactly what would make it differ.
 */

/** The footer's shape, read in the page. */
const readFooter = () => {
  const footer = document.querySelector('footer')
  const inner = footer?.firstElementChild ?? null
  const blocks = inner ? Array.from(inner.children) : []
  const first = blocks[0] ?? null
  return {
    blockTags: blocks.map((block) => block.tagName.toLowerCase()),
    firstRowChildTags: first ? Array.from(first.children).map((child) => child.tagName.toLowerCase()) : [],
    // Every non-link, non-separator child of the provenance row: the one plain-text cell.
    firstRowPlainCells: first
      ? Array.from(first.children).filter((child) => child.tagName !== 'A' && child.getAttribute('aria-hidden') !== 'true').length
      : null,
    firstRowHeight: first ? Math.round(first.getBoundingClientRect().height) : null,
    // The marks a reading record is built from: a state attribute, or the instrument type.
    stateful: footer ? footer.querySelectorAll('[data-hydrated], [data-variant], .bz-readout').length : null,
    text: (footer as HTMLElement | null)?.innerText.replace(/\s+/g, ' ').trim() ?? null,
  }
}

// One module per kind of page the footer sits under: a module sheet carried a revision, a level
// page and the home page carried a sheet label, and the profile page is where the record lives.
const ROUTES = [A0.path, SHORT.path, A4.path, '/', '/sheets/', CATEGORY_PATHS[1], '/profile/']

for (const path of ROUTES) {
  test(`${path} has a footer of the provenance row and the owner's row, and no reading-record row`, async ({
    page,
  }) => {
    await page.goto(path)
    const footer = await page.evaluate(readFooter)

    // The count is what makes the guard non-vacuous: two blocks, the first the row of links.
    expect(footer.blockTags, `${path} footer blocks`).toEqual(['div', 'address'])
    expect(footer.firstRowChildTags.length, `${path} provenance row is empty`).toBeGreaterThan(0)
    expect(footer.firstRowChildTags, `${path} provenance row has a non-link cell`).not.toContain('div')
    expect(footer.firstRowPlainCells, `${path}: only one plain-text cell, the mark credit`).toBe(1)
    expect(footer.stateful, `${path} footer carries an instrument`).toBe(0)
    // Six cells fit on one line from a laptop up; on a phone the row wraps, by design.
    if ((page.viewportSize()?.width ?? 0) >= 1000) {
      expect(footer.firstRowHeight, 'the provenance row is one 32px line at this width').toBe(32)
    }
  })
}

test('the footer reads the same on every route', async ({ page }) => {
  const texts: string[] = []
  for (const path of ROUTES) {
    await page.goto(path)
    texts.push((await page.evaluate(readFooter)).text ?? '')
  }
  // A sheet label, a revision or a count is a per-page value, and any of them makes two pages differ.
  expect(texts[0].length, 'the footer printed nothing').toBeGreaterThan(0)
  for (const [index, text] of texts.entries()) expect(text, ROUTES[index]).toBe(texts[0])
})

test('a route that is not a module still gets a main and a footer', async ({ page }) => {
  const response = await page.goto('/courses/fundamentals/not-a-sheet/')
  expect(response?.status()).toBe(404)

  // §10.2 — the landmarks live in `PageShell` now, so a page outside the
  // normal tree loses both together or neither.
  await expect(page.locator('main#main')).toHaveCount(1)
  await expect(page.locator('footer')).toHaveCount(1)
})
