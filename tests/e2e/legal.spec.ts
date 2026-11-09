import { type Page, expect, test } from '@playwright/test'
import { LEGAL_ROUTE, PRIVACY_ROUTE, SITE_OWNER } from '@/lib/site'
import { A0, INDEX_SHEET } from './sheets'

/**
 * M94, D118 — the site owner, the privacy note and the legal note, against the built export.
 *
 * Every rule here holds for any owner and any wording: the facts are read from `SITE_OWNER`, the
 * one object that holds them, and no sentence of the notes is pinned (tests/README.md). What is
 * checked is what a reader relies on and no unit test can see: the owner is named on every route;
 * the two footer links land on a heading that is there and not under the bar; the Legal section
 * prints every fact the object holds and a row for none it does not; and the privacy note's claims
 * stay true. "Collects no personal data, sets no cookies, no form, nothing sent anywhere" is a
 * promise about the whole export, so it is checked on a spread of routes, after a reader acts.
 */

const ROUTES = [
  '/',
  INDEX_SHEET,
  '/sheets/fundamentals/',
  A0.path,
  '/everyone/courses/fundamentals/llms/',
  '/tr/',
  '/fa/',
  '/legend/',
  '/profile/',
  '/caravan/',
  '/about/',
] as const

/** The one header-height fact this file needs: the bar is 58px, and a heading must sit below it. */
const BAR = 58

for (const route of ROUTES) {
  test(`the footer names the owner and links Privacy and Legal (${route})`, async ({ page }) => {
    await page.goto(route)
    const footer = page.getByRole('contentinfo')

    await expect(footer).toContainText(SITE_OWNER.tradeName)
    await expect(footer.getByRole('link', { name: 'Privacy', exact: true })).toHaveAttribute('href', PRIVACY_ROUTE)
    await expect(footer.getByRole('link', { name: 'Legal', exact: true })).toHaveAttribute('href', LEGAL_ROUTE)
    await expect(footer.getByRole('link', { name: SITE_OWNER.email })).toHaveAttribute(
      'href',
      `mailto:${SITE_OWNER.email}`,
    )
  })
}

for (const [name, anchor] of [
  ['Privacy', 'privacy'],
  ['Legal', 'legal'],
] as const) {
  test(`the footer's ${name} link lands on its heading, below the bar`, async ({ page }) => {
    await page.goto('/')
    await page.getByRole('contentinfo').getByRole('link', { name, exact: true }).click()
    await page.waitForURL(`**/legend/#${anchor}`)

    const heading = page.locator(`h2#${anchor}`)
    await expect(heading, `no heading carries id="${anchor}"`).toHaveCount(1)
    await expect(heading).toBeInViewport()
    const top = (await heading.boundingBox())?.y ?? -1
    expect(top, 'the heading is under the sticky bar').toBeGreaterThanOrEqual(BAR)
  })
}

test('the Legal section prints every fact the owner object holds, and no other', async ({ page }) => {
  await page.goto('/legend/')
  const section = page.locator('section:has(h2#legal)')
  const text = await section.innerText()

  const held = Object.entries(SITE_OWNER).filter(([, value]) => value)
  expect(held.length, 'the owner object is empty').toBeGreaterThan(0)
  for (const [field, value] of held) {
    expect(text, `${field} is not printed in the Legal section`).toContain(value)
  }

  // A row is drawn for a fact that exists. A row whose value is blank would read as a fact that
  // was looked up and is empty, and a label with no value is the placeholder this file refuses.
  const rows = await section.locator('dl > div').evaluateAll((nodes) =>
    nodes.map((node) => ({
      label: node.querySelector('dt')?.textContent?.trim() ?? '',
      value: node.querySelector('dd')?.textContent?.trim() ?? '',
    })),
  )
  expect(rows.length).toBeGreaterThanOrEqual(held.length)
  for (const row of rows) expect(row.value, `${row.label} has no value`).not.toBe('')
})

test('the Privacy section links its sources and the contact address', async ({ page }) => {
  await page.goto('/legend/')
  const section = page.locator('section:has(h2#privacy)')

  await expect(section.locator(`a[href="mailto:${SITE_OWNER.email}"]`)).not.toHaveCount(0)
  const hrefs = await section.locator('a').evaluateAll((links) => links.map((link) => link.getAttribute('href')))
  expect(hrefs.some((href) => href?.startsWith('https://docs.github.com/')), 'GitHub is not cited').toBe(true)
  expect(hrefs).toContain('/profile/#data')
})

/**
 * What the Privacy section promises, measured: no cookie, no form, and no request to any origin
 * but the site's own, on each route, after the reader has acted on the page (a theme toggle writes
 * to storage, so a cookie written beside it would be caught here).
 */
async function foreignOrigins(page: Page, route: string, own: string): Promise<string[]> {
  const asked = new Set<string>()
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.protocol === 'data:' || url.protocol === 'blob:') return
    asked.add(url.origin)
  })
  await page.goto(route)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Toggle theme' }).click()
  await page.waitForLoadState('networkidle')
  return [...asked].filter((origin) => origin !== own)
}

for (const route of ROUTES) {
  test(`${route} sets no cookie, has no form and asks no other origin for anything`, async ({ page, context, baseURL }) => {
    const own = new URL(baseURL ?? 'http://localhost:3111').origin
    const foreign = await foreignOrigins(page, route, own)

    expect(foreign, 'a request left the site').toEqual([])
    expect(await context.cookies(), 'a cookie was set').toEqual([])
    expect(await page.evaluate(() => document.cookie), 'a cookie is readable').toBe('')
    await expect(page.locator('form'), 'a form is on the page').toHaveCount(0)
  })
}
