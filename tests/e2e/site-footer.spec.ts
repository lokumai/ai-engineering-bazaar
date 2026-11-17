import { expect, test } from '@playwright/test'
import { FEEDBACK_URL } from '@/lib/site'
import { A0, A4, CATEGORY_PATHS, SHORT } from './sheets'

/**
 * The footer carries no reading-record row (M111, D134), and it is one footer on every route.
 *
 * It used to open with a 40px row: the page's sheet label, the file's revision and a compact
 * readout of the reader's record. The author called it useless and it was removed end to end. This
 * file guards the removal by STRUCTURE, never by the English the row printed: a row that came back
 * in another wording still fails here.
 *
 * Round 6 changed the footer from two blocks to a grid of three (owner, site links, project links),
 * so the claims were re-pointed from the old markup to the rule they meant: the footer holds no
 * reader state, every list entry is a link, the owner is one `<address>`, and the footer is the
 * same on every route, because a sheet label or a revision is exactly what would make it differ.
 */

/** The footer's shape, read in the page. */
const readFooter = () => {
  const footer = document.querySelector('footer')
  const items = footer ? Array.from(footer.querySelectorAll('li')) : []
  return {
    addresses: footer ? footer.querySelectorAll('address').length : null,
    items: items.length,
    // A list entry that is not exactly one link is a cell of some other kind: a readout, a label.
    nonLinkItems: items.filter((li) => li.children.length !== 1 || li.firstElementChild?.tagName !== 'A').length,
    // The marks a reading record is built from: a state attribute, or the instrument type.
    stateful: footer ? footer.querySelectorAll('[data-hydrated], [data-variant], .bz-readout').length : null,
    text: (footer as HTMLElement | null)?.innerText.replace(/\s+/g, ' ').trim() ?? null,
  }
}

// One module per kind of page the footer sits under: a module sheet carried a revision, a level
// page and the home page carried a sheet label, and the profile page is where the record lives.
const ROUTES = [A0.path, SHORT.path, A4.path, '/', '/sheets/', CATEGORY_PATHS[1], '/profile/']

for (const path of ROUTES) {
  test(`${path} has a footer of links and the owner's address, and no reading-record row`, async ({ page }) => {
    await page.goto(path)
    const footer = await page.evaluate(readFooter)

    // The counts make the guard non-vacuous: links exist, and the owner is named in one address.
    expect(footer.items, `${path} footer lists no links`).toBeGreaterThan(0)
    expect(footer.nonLinkItems, `${path} footer has a list entry that is not a link`).toBe(0)
    expect(footer.addresses, `${path} footer owner address`).toBe(1)
    expect(footer.stateful, `${path} footer carries an instrument`).toBe(0)
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

test('the footer links to the feedback form on every route, as a plain link and nothing embedded', async ({ page }) => {
  for (const path of ROUTES) {
    await page.goto(path)
    await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Feedback', exact: true })).toHaveAttribute(
      'href',
      FEEDBACK_URL,
    )
    await expect(page.locator('iframe, form'), `${path} embeds a form`).toHaveCount(0)
  }
})
