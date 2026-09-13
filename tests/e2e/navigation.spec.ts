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

  await expect(page.locator('.bz-pager a[rel="prev"]')).toHaveCount(0)
  // M18 — and it says WHICH end. Both empty tiles read `End of the course`
  // until a screenshot of module 01's pager showed the end of the course
  // announced where its previous module would be.
  await expect(page.locator('.bz-pager .bz-pager-item').first())
    .toContainText(/start of the course/i)
  await expect(page.locator('.bz-pager a[rel="next"]')).toHaveCount(1)
})

test('module 32 has no next', async ({ page }) => {
  await page.goto(last.path)

  await expect(page.locator('.bz-pager a[rel="next"]')).toHaveCount(0)
  await expect(page.locator('.bz-pager .bz-pager-item').last())
    .toContainText(/end of the course/i)
  await expect(page.locator('.bz-pager a[rel="prev"]')).toHaveCount(1)
})

test('next walks 1 to 32 straight through every category boundary', async ({ page }) => {
  test.slow() // thirty-one real navigations

  await page.goto(first.path)

  for (let i = 1; i < SHEETS.length; i++) {
    const expected = SHEETS[i]
    const previous = SHEETS[i - 1]

    // The link states where it goes before it goes there (§5.7).
    const next = page.locator('.bz-pager a[rel="next"]')
    await expect(next).toContainText(expected.title)
    // ITS HREF, and not a module number printed inside the tile. `01`'s pager
    // tile is a faint label over a titled destination and nothing else; the
    // retired cell printed the number too, which the trail, the footer and the
    // rail all already carry. The destination is the stronger claim anyway.
    await expect(next).toHaveAttribute('href', new RegExp(`${expected.path}$`))

    // A sheet that is not drawn says so on the link, not only on arrival — in
    // the label beside the direction, which is where the tile has room for it.
    if (expected.drawn) await expect(next).not.toContainText('Planned')
    else await expect(next).toContainText('Planned')

    await next.click()
    await expect(page).toHaveURL(new RegExp(`${expected.path}$`))
    await expect(page.locator('main h1')).toHaveText(expected.title)

    if (expected.category !== previous.category) {
      /* The boundary is a subsystem label, not a stop (§4.4 / §5.7). Read off
         the TRAIL since M21: the facts strip named the level in a tag, and the
         author asked for that line to be plain text. The trail names it in
         words on every module page and no fold can hide it. */
      await expect(page.locator('nav[aria-label="Curriculum"]')).toContainText(
        new RegExp(expected.category.replace('-', '[ -]'), 'i'),
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
    await page.locator('.bz-pager a[rel="prev"]').click()
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
 * `find src/app -name page.tsx | wc -l` says 17, and thirteen of them are here:
 * the fourteenth is the module page, reached by `A0.path`, and the other three
 * are M14's forwards — `/dashboard/`, `/report/` and `/path/`, which replace
 * their own document with `/profile/` the moment they load. Asserting on a
 * navbar in a page that is redirecting is a race with no subject, and what
 * those three routes owe a reader is asserted in `redirects.spec.ts` instead.
 */
const EVERY_ROUTE: readonly string[] = [
  '/',
  // M17 — the catalog's two listing shapes. `/courses/` and
  // `/courses/<level>/` are forwards now and are in `redirects.spec.ts` for
  // the same reason M14's three are: a navbar in a page that is redirecting is
  // a race with no subject.
  '/sheets/fundamentals/',
  A0.path,
  INDEX_SHEET,
  '/join/',
  '/legend/',
  '/legend/specimen/',
  '/profile/',
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
        destinations: [...nav.querySelectorAll('.bz-bar-link')].map((node) =>
          (node.textContent ?? '').replace(/\s+/g, ' ').trim(),
        ),
        levels: [...nav.querySelectorAll('.bz-menu-item')].map((node) =>
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
  // M17 — three destinations: Home, Catalog, Your progress. `Curriculum` and
  // `Catalog` were two entries opening two listings of one course. This is a
  // non-vacuity floor rather than a count of the bar, so it moves with the bar.
  expect(reference!.destinations.length).toBeGreaterThanOrEqual(3)
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

// ---------------------------------------------------------------------------
// M20 — the bar's dropdown, and the three ways it closes
// ---------------------------------------------------------------------------

/**
 * The author: *"even when I move cursor out of the boundaries of dropdown, the
 * dropdown is still here while I want it to disappear."*
 *
 * **Every assertion below is a browser assertion because every one of them is
 * an engine behaviour**, and the first build of this got two of them wrong in
 * a way nothing else could see: the type checker was happy, the markup was
 * right, and a screenshot of an open menu looks the same either way.
 *
 * The two it got wrong were `1` — the close never fired, because clicking a
 * `<summary>` focuses it and the guard asked whether focus was inside the
 * `<details>`, which contains the summary — and the discovery that Chrome does
 * NOT close a `<details>` on Escape, which `MainNav`'s docblock had claimed
 * for three milestones and which the M20 brief reasoned from.
 */
const MENU = '.bz-bar-nav details'

test('the dropdown closes when the pointer leaves, and only where hover exists', async ({
  page,
}) => {
  await page.goto(INDEX_SHEET)
  const menu = page.locator(MENU)

  await page.locator('.bz-bar-nav summary').click()
  await expect(menu).toHaveAttribute('open', '')

  // Away from the bar entirely. The close is on a grace delay, so this is an
  // expectation with a timeout rather than a read after a sleep.
  await page.mouse.move(700, 600)
  await expect(menu).not.toHaveAttribute('open', '')
})

test('the dropdown stays open while focus is in the list', async ({ page }) => {
  await page.goto(INDEX_SHEET)
  const menu = page.locator(MENU)

  await page.locator('.bz-bar-nav summary').click()
  await page.locator('.bz-menu a').first().focus()
  await page.mouse.move(700, 600)

  /* Held rather than sampled: the failure this guards against is a close that
     fires LATE, so reading once immediately would pass against it. A second is
     comfortably longer than the grace delay. */
  await page.waitForTimeout(1000)
  await expect(menu).toHaveAttribute('open', '')
})

test('Escape closes the dropdown and hands focus back to the trigger', async ({ page }) => {
  await page.goto(INDEX_SHEET)
  const menu = page.locator(MENU)

  await page.locator('.bz-bar-nav summary').click()
  await page.locator('.bz-menu a').first().focus()
  await page.keyboard.press('Escape')

  await expect(menu).not.toHaveAttribute('open', '')
  // The element that had focus is now `display: none`, and focus on a hidden
  // element is dropped on the floor — so it goes back to the summary.
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('SUMMARY')
})

/**
 * **The case that would have broken the menu for every phone**: a finger has
 * no hover, so `pointerleave` fires at the end of the tap that OPENED the
 * panel. Closing on it unconditionally would make the menu open and shut on
 * one touch, and nothing in the desktop projects would ever have said so.
 */
test('a tap opens the dropdown and leaves it open', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 800 },
    hasTouch: true,
    isMobile: true,
  })
  const page = await context.newPage()
  await page.goto(INDEX_SHEET)

  expect(
    await page.evaluate(() => matchMedia('(hover: hover)').matches),
    'a touch context that reports hover would not exercise this',
  ).toBe(false)

  await page.locator('.bz-bar-nav summary').tap()
  await page.waitForTimeout(800)
  await expect(page.locator(MENU)).toHaveAttribute('open', '')
  await context.close()
})
