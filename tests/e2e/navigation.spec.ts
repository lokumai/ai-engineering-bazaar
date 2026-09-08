import { expect, test } from '@playwright/test'
import { A0, INDEX_SHEET, SHEETS } from './sheets'

/**
 * §5.7 — prev/next, walked end to end, plus M10's navbar on every route.
 *
 * The build deletes the hand-typed `**Next Module:**` lines from every source
 * file and replaces them from the manifest, so this chain is generated. That
 * makes it exactly the kind of thing that is right until a renumber and then
 * wrong in one place: sheet 7 to sheet 8 crosses from Fundamentals to
 * Intermediate, and a chain built per-category rather than per-set would stop
 * dead there and look deliberate.
 *
 * So the walk is the whole set, one click at a time, checking the URL and the
 * title at every step. Both ends are asserted too — §5.7 renders `— END OF
 * SET` rather than omitting the cell, and a link that wraps sheet 32 back to
 * sheet 1 would make the set a loop with no first sheet. (That cell reads
 * `End of the course` since M11; `— END OF SET` was drawing-set vocabulary the
 * copy register's word boundaries could not see.)
 */

const first = SHEETS[0]
const last = SHEETS[SHEETS.length - 1]

test('module 1 has no previous', async ({ page }) => {
  await page.goto(first.path)

  await expect(page.locator('.hl-prevnext a[rel="prev"]')).toHaveCount(0)
  await expect(page.locator('.hl-prevnext .hl-prevnext-cell').first())
    .toContainText(/end of the course/i)
  await expect(page.locator('.hl-prevnext a[rel="next"]')).toHaveCount(1)
})

test('module 32 has no next', async ({ page }) => {
  await page.goto(last.path)

  await expect(page.locator('.hl-prevnext a[rel="next"]')).toHaveCount(0)
  await expect(page.locator('.hl-prevnext .hl-prevnext-cell').last())
    .toContainText(/end of the course/i)
  await expect(page.locator('.hl-prevnext a[rel="prev"]')).toHaveCount(1)
})

test('next walks 1 to 32 straight through every category boundary', async ({ page }) => {
  test.slow() // thirty-one real navigations

  await page.goto(first.path)

  for (let i = 1; i < SHEETS.length; i++) {
    const expected = SHEETS[i]
    const previous = SHEETS[i - 1]

    // The link states where it goes before it goes there (§5.7).
    const next = page.locator('.hl-prevnext a[rel="next"]')
    await expect(next).toContainText(expected.title)
    await expect(next.locator('.hl-prevnext-sheet')).toHaveText(String(expected.module))

    // A sheet that is not drawn says so on the link, not only on arrival.
    await expect(next.locator('.hl-prevnext-tag')).toHaveCount(expected.drawn ? 0 : 1)

    await next.click()
    await expect(page).toHaveURL(new RegExp(`${expected.path}$`))
    await expect(page.locator('main h1')).toHaveText(expected.title)

    if (expected.category !== previous.category) {
      // The boundary is a subsystem label, not a stop (§4.4 / §5.7).
      await expect(page.locator('.hl-eyebrow')).toContainText(
        expected.category.toUpperCase().replace('-', ' '),
      )
    }
  }

  await expect(page).toHaveURL(new RegExp(`${last.path}$`))
})

test('previous walks 32 back to 1', async ({ page }) => {
  test.slow()

  await page.goto(last.path)

  for (let i = SHEETS.length - 2; i >= 0; i--) {
    const expected = SHEETS[i]
    await page.locator('.hl-prevnext a[rel="prev"]').click()
    await expect(page).toHaveURL(new RegExp(`${expected.path}$`))
    await expect(page.locator('main h1')).toHaveText(expected.title)
  }
})

/**
 * M10's first acceptance criterion: **every route carries the same navbar**,
 * verified by loading all of them and comparing rather than by trusting that
 * one layout renders once.
 *
 * The routes are typed out for the same reason `sheets.ts` types out its list:
 * a suite that reads them back from `src/app` can only prove the router agrees
 * with itself, and a route added without a navbar would then be a route this
 * check silently skipped. `/auth/callback/` is the one exclusion and it is not
 * a page a reader navigates to — it is where a magic link lands, and it
 * redirects.
 *
 * `find src/app -name page.tsx | wc -l` says 17. Sixteen are here; the
 * seventeenth is the module page, reached by `A0.path`.
 */
const EVERY_ROUTE: readonly string[] = [
  '/',
  '/courses/',
  '/courses/fundamentals/',
  A0.path,
  INDEX_SHEET,
  '/dashboard/',
  '/join/',
  '/legend/',
  '/legend/specimen/',
  '/path/',
  '/profile/',
  '/report/',
  '/sign-in/',
  '/sign-in/alias/',
  '/team/',
  '/team/assignments/',
]

test('every route carries the same navbar', async ({ page }) => {
  test.slow()

  /** The nav's own shape: its label, its destinations, and the level list. */
  const shapeOf = () =>
    page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Main"]')
      if (!nav) return null
      return {
        destinations: [...nav.querySelectorAll('.hl-nav-link')].map((node) =>
          (node.textContent ?? '').replace(/\s+/g, ' ').trim(),
        ),
        levels: [...nav.querySelectorAll('.hl-nav-menu-link')].map((node) =>
          (node.textContent ?? '').replace(/\s+/g, ' ').trim(),
        ),
        // Exactly one destination is marked current, and it is marked twice —
        // a fill and a rule — so forced colours keeps one of them.
        current: nav.querySelectorAll('[data-current]').length,
      }
    })

  await page.goto(EVERY_ROUTE[0])
  const reference = await shapeOf()
  expect(reference, `${EVERY_ROUTE[0]} has no navbar at all`).not.toBeNull()
  expect(reference!.destinations.length).toBeGreaterThan(3)
  expect(reference!.levels.length).toBeGreaterThan(1)

  for (const route of EVERY_ROUTE.slice(1)) {
    const response = await page.goto(route)
    expect(response?.status(), route).toBe(200)
    const shape = await shapeOf()
    expect(shape, `${route} has no navbar`).not.toBeNull()
    expect(shape!.destinations, route).toEqual(reference!.destinations)
    expect(shape!.levels, route).toEqual(reference!.levels)
    // Never two, which would be two `aria-current` claims in one nav, and never
    // more than one route lit at a time.
    expect(shape!.current, `${route} marks ${shape!.current} destinations`)
      .toBeLessThanOrEqual(1)
  }
})
