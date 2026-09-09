import { type Page, expect, test } from '@playwright/test'
import { readRecord, seedRecord, slugOf, waitForRecord } from './record'
import { CATEGORY_PATHS, INDEX_SHEET, SHEETS, SHEET_COUNT, sheetByModule } from './sheets'
import { CATALOG_VIEWS } from './views'
import { watchPage } from './watch'

/**
 * M12 / D13 — the catalog's three views, in a browser.
 *
 * Everything here needs an engine, and each test says which property could not
 * be checked any other way:
 *
 * 1. **The three views show the same set of modules.** That is D13's binding
 *    criterion and the whole reason three renderings are allowed to exist. It
 *    is asserted by comparing the module names the views RENDER with each
 *    other — never against a written list, which would pin a fact about the
 *    content (`tests/README.md`) and would also pass if all three were wrong in
 *    the same way.
 * 2. **Which view is showing is channel A.** The reveal is CSS keyed off an
 *    attribute a blocking inline script stamps before first paint, so the test
 *    refuses every `.js` request: that leaves channel A intact and kills
 *    channel B outright, which is the only way to prove nothing here is done by
 *    a `useEffect` a frame late. It is `home.spec.ts`'s and `path.spec.ts`'s
 *    mechanism for the same kind of claim.
 * 3. **The hidden views are out of the tab order.** Both halves are asserted —
 *    the showing view's links are reachable by Tab, the hidden views' are not —
 *    because either half alone passes for the wrong reason. That correction is
 *    `logs/BRAINSTORM.md` D17, and it is written by PRESSING THE KEY rather
 *    than by calling `.focus()`.
 * 4. **One route.** Adding a view must not add a URL, so the URL is read before
 *    and after every switch.
 * 5. **Forced colours.** Every hue goes and a level must still be told apart.
 */

/**
 * The toggle's three buttons, by the word each one prints.
 *
 * The ids come from the application's own vocabulary through `views.ts`, and
 * only the words are stated here: a fourth view then reaches every loop below
 * without anybody widening a list, and a renamed button fails on the name
 * rather than on a count. `VIEWS` in `lib/catalog/views.ts` is checked against
 * this pairing by `tests/unit/catalog/views.test.ts`.
 */
const NAMES: Record<string, string> = {
  overview: 'Overview',
  cards: 'Cards',
  table: 'Table',
}

/**
 * Where each view puts a module's name.
 *
 * **A per-view selector, and the first version of this test did without one and
 * was wrong.** It read the view's whole text and asked which of the set's
 * titles appeared in it, which counts a title that is a SUBSTRING of another:
 * with the Planned filter showing 14 modules the containment test found 17,
 * because `Memory` is inside `Advanced Memory` and two more like it. MEASURED,
 * by printing both numbers. Reading the element that holds a title makes each
 * name exact, and the comparison is still between the views themselves.
 */
const TITLES: Record<string, string> = {
  overview: '.hl-ov-mod',
  cards: '.hl-card-title',
  table: '.hl-row-link',
}

const VIEWS = CATALOG_VIEWS.map((id) => ({ id, name: NAMES[id] }))

const viewBox = (page: Page, id: string) => page.locator(`.hl-view[data-view="${id}"]`)

const toggle = (page: Page, name: string) =>
  page.getByRole('button', { name: new RegExp(`^${name}`) })

/**
 * The module names one view is rendering, read out of that view's own box.
 *
 * `textContent`, not `innerText`: two of the three views are `display: none` at
 * any moment, and `innerText` on a non-rendered element falls back to
 * `textContent` anyway — so reading it directly is the same measurement without
 * the ambiguity, and it is unaffected by `text-transform`. What is being
 * compared is what each view RENDERED for the same filter state, which is a
 * property of the DOM rather than of the paint; that the right one is on screen
 * is `showing()`'s claim, asserted separately.
 */
async function namesIn(page: Page, id: string): Promise<string[]> {
  const names = await viewBox(page, id)
    .locator(TITLES[id])
    .evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').trim()))
  return names.sort()
}

/** The view the stylesheet is actually showing, measured rather than assumed. */
async function showing(page: Page): Promise<string[]> {
  const visible: string[] = []
  for (const view of VIEWS) {
    if (await viewBox(page, view.id).isVisible()) visible.push(view.id)
  }
  return visible
}

// ---------------------------------------------------------------------------
// D13's criterion: one data source, three renderings
// ---------------------------------------------------------------------------

test('the three views show the same set of modules, filtered and unfiltered', async ({
  page,
}) => {
  const problems = watchPage(page)
  await page.goto(INDEX_SHEET)

  // Unfiltered, then narrowed on each axis in turn. The comparison is between
  // the views; the count beside the toggle is the third witness, and it is one
  // number for the page rather than one per view — a view that rendered a
  // different set would disagree with it.
  for (const filter of ['Every level', 'Ready', 'Planned', 'Both languages']) {
    await page.getByRole('button', { name: filter, exact: true }).click()

    const [overview, cards, table] = await Promise.all(
      VIEWS.map((view) => namesIn(page, view.id)),
    )
    expect(overview, filter).toEqual(cards)
    expect(cards, filter).toEqual(table)
    // Non-vacuity: three empty sets are equal and prove nothing.
    expect(overview.length, filter).toBeGreaterThan(0)

    const shown = Number((await page.locator('.hl-chip-count-value').first().innerText()).trim())
    expect(shown, filter).toBe(overview.length)
  }

  expect(problems.consoleErrors).toEqual([])
})

test('every view carries the whole curriculum, in curriculum order', async ({ page }) => {
  await page.goto(INDEX_SHEET)

  // `sheets.ts` is an independent statement of what ships, so this is the check
  // that a curriculum change reaches all three views: the order comes from the
  // config, and a view that grouped, sorted or paginated on its own would come
  // back in a different order than the other two and than the fixture.
  const expected = SHEETS.map((sheet) => sheet.title)

  for (const view of VIEWS) {
    const found = await viewBox(page, view.id)
      .locator(TITLES[view.id])
      .evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').trim()))
    // In order, and every one of them: a view that grouped, sorted or
    // paginated on its own would come back in a different order than the
    // config, and a view that dropped the drafts would come back short.
    expect(found, view.id).toEqual(expected)
    expect(found.length, view.id).toBe(SHEET_COUNT)
  }
})

// ---------------------------------------------------------------------------
// One route, and the preference that survives a reload
// ---------------------------------------------------------------------------

test('switching view changes no URL and adds no document load', async ({ page }) => {
  await page.goto(INDEX_SHEET)
  const before = page.url()

  for (const view of VIEWS) {
    await toggle(page, view.name).click()
    await expect(viewBox(page, view.id)).toBeVisible()
    expect(await showing(page), `after choosing ${view.id}`).toEqual([view.id])
    expect(page.url()).toBe(before)
  }

  // The toggle is three buttons and no links: D13's criterion is that a view
  // is not an address, and a link would be one.
  await expect(page.locator('.hl-viewtoggle a')).toHaveCount(0)
})

test('the chosen view is remembered, through the record and nowhere else', async ({
  page,
}) => {
  // Seeded, so the record's own key already exists: the claim is that the
  // preference goes INTO that envelope and that no second key appears beside
  // it, which is §5's one-writer rule. Starting from an empty browser would
  // compare an empty key list against the record the write itself created.
  await seedRecord(page)
  await page.goto(INDEX_SHEET)
  const keysBefore = await page.evaluate(() => Object.keys(localStorage).sort())

  await toggle(page, 'Table').click()
  await waitForRecord(page, (env) => env?.data.prefs.catalogView === 'table')

  // §5 — `store.ts` is the only writer of learner state, so the preference is
  // in the record's own envelope and there is no second key beside it.
  const envelope = await readRecord(page)
  expect(envelope?.data.prefs.catalogView).toBe('table')
  expect(await page.evaluate(() => Object.keys(localStorage).sort())).toEqual(keysBefore)

  // And it is honoured on the next visit.
  await page.reload()
  expect(await showing(page)).toEqual(['table'])
})

test('a stored view is showing in frame one, with no JavaScript at all', async ({
  page,
}) => {
  await seedRecord(page, { prefs: { catalogView: 'cards' } })

  // Refusing every module leaves channel A intact and kills channel B outright,
  // so nothing below can have been done after mount. No poll, no timeout and no
  // `toBeVisible` wait can make a JS-selected view appear a frame late and pass.
  await page.route('**/*.js', (route) => route.abort())
  await page.goto(INDEX_SHEET, { waitUntil: 'domcontentloaded' })

  await expect(page.locator('html')).toHaveAttribute('data-hl-view', 'cards')
  expect(await showing(page)).toEqual(['cards'])
  // The toggle states it too, in the accessible name rather than in an ARIA
  // attribute React would have to render: one author for one state.
  await expect(toggle(page, 'Cards')).toHaveAccessibleName(/Showing/)
  await expect(toggle(page, 'Table')).not.toHaveAccessibleName(/Showing/)
})

test('a reader who has chosen nothing gets the default view', async ({ page }) => {
  await page.goto(INDEX_SHEET)
  await expect(page.locator('html')).not.toHaveAttribute('data-hl-view', /./)
  expect(await showing(page)).toEqual(['overview'])
})

// ---------------------------------------------------------------------------
// D17 — the keyboard, by pressing the key
// ---------------------------------------------------------------------------

test('only the showing view is in the tab order, and it is', async ({ page }) => {
  await page.goto(INDEX_SHEET)
  await toggle(page, 'Cards').click()
  await expect(viewBox(page, 'cards')).toBeVisible()

  // Tab from the toggle until a module link inside the cards view has focus,
  // recording every view a focused element belonged to on the way. `.focus()`
  // would prove nothing: `display: none` is what takes an element out of the
  // tab order, and only a real Tab press can observe that.
  await toggle(page, 'Cards').focus()
  const seen = new Set<string>()
  let reachedCards = false
  for (let press = 0; press < 60 && !reachedCards; press += 1) {
    await page.keyboard.press('Tab')
    const owner = await page.evaluate(() => {
      const active = document.activeElement
      if (!(active instanceof HTMLElement)) return null
      const box = active.closest('.hl-view')
      return box === null ? null : box.getAttribute('data-view')
    })
    if (owner !== null) {
      seen.add(owner)
      if (owner === 'cards') reachedCards = true
    }
  }

  // Both halves. Open: the showing view's links are reachable.
  expect(reachedCards, 'no link inside the cards view was reachable by Tab').toBe(true)
  // Closed: the other two views' links are not, which is what stops three
  // views from putting 99 links between the toggle and the footer.
  expect([...seen]).toEqual(['cards'])
})

test('both filter axes work from the keyboard and announce the count', async ({ page }) => {
  await page.goto(INDEX_SHEET)

  const count = page.locator('.hl-chip-count')
  await expect(count).toHaveAttribute('role', 'status')
  await expect(count).toHaveText(`Showing ${SHEET_COUNT} of ${SHEET_COUNT}`)

  // Pressed with the keyboard, not clicked: a control that answers a click and
  // not a key is a control half the readers cannot use (SC 2.1.1).
  const ready = page.getByRole('button', { name: 'Ready', exact: true })
  await ready.focus()
  await page.keyboard.press('Enter')
  await expect(ready).toHaveAttribute('aria-pressed', 'true')

  const readyCount = Number((await page.locator('.hl-chip-count-value').first().innerText()).trim())
  expect(readyCount).toBeGreaterThan(0)
  expect(readyCount).toBeLessThan(SHEET_COUNT)

  // The second axis composes with the first rather than replacing it. The chip
  // is taken by its position in the named group and not by its title: a level's
  // title is a fact about the content, which a test may not write down
  // (`tests/README.md`), and renaming a level in `curriculum.yaml` would turn
  // this red for no reason. `nth(1)` steps over the `All` chip.
  const level = page
    .getByRole('group', { name: 'Filter by level' })
    .getByRole('button')
    .nth(1)
  await level.focus()
  await page.keyboard.press('Space')
  await expect(level).toHaveAttribute('aria-pressed', 'true')
  await expect(ready).toHaveAttribute('aria-pressed', 'true')

  const both = Number((await page.locator('.hl-chip-count-value').first().innerText()).trim())
  expect(both).toBeLessThanOrEqual(readyCount)
})

test('an empty result says what to do next, and the way out works', async ({ page }) => {
  await page.goto(INDEX_SHEET)

  // Two filters that select different modules: a level with nothing planned in
  // it, and the planned selection. Which level that is comes from the fixture
  // rather than from a written-in name.
  const readyOnly = CATEGORY_PATHS.map((path) => path.split('/')[2]).find(
    (slug) => SHEETS.filter((sheet) => sheet.category === slug).every((sheet) => sheet.drawn),
  )
  expect(readyOnly, 'no level in the corpus is entirely written').toBeDefined()

  await page.getByRole('button', { name: 'Planned', exact: true }).click()
  await page.locator(`.hl-chip[data-cat="${readyOnly}"]`).click()

  const empty = page.locator('.hl-empty')
  await expect(empty).toBeVisible()
  // The status names the filters as the cause and counts what it excluded from.
  await expect(empty.locator('.hl-empty-status')).toHaveText(
    `No module matches both filters · 0 of ${SHEET_COUNT}`,
  )
  // And it says what to do, which is M12's deliverable: not "no results".
  await expect(empty.locator('.hl-empty-cue')).toContainText('Widen either one')

  await empty.getByRole('button', { name: 'Show the whole catalog' }).click()
  await expect(empty).toHaveCount(0)
  await expect(page.locator('.hl-chip-count')).toHaveText(
    `Showing ${SHEET_COUNT} of ${SHEET_COUNT}`,
  )
})

// ---------------------------------------------------------------------------
// Colour is never the only signal
// ---------------------------------------------------------------------------

test.describe('under forced colours', () => {
  /**
   * `emulateMedia`, not `test.use({ forcedColors })`: this Playwright version
   * does not carry `forcedColors` in the `use` fixture type, and it is a
   * page-level switch either way. `colour-not-alone.spec.ts` records the same
   * correction.
   */
  test('a level is still named, numbered and counted in every view', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    await page.goto(INDEX_SHEET)

    // The overview's bands: each names its level and prints both counts, so
    // dropping every hue costs the reader nothing.
    for (const path of CATEGORY_PATHS) {
      const slug = path.split('/')[2]
      const band = page.locator(`.hl-ov-band[data-cat="${slug}"]`)
      await expect(band).toHaveCount(1)
      const text = await band.locator('.hl-ov-head').innerText()
      expect(text, slug).toMatch(/\d+ modules? · \d+ ready/)
    }

    // The cards: the level's name beside its square, never the square alone.
    await toggle(page, 'Cards').click()
    const first = page.locator('.hl-card').first()
    await expect(first.locator('.hl-card-level')).not.toHaveText('')

    // And the showing view is still told apart: the button keeps a heavier
    // bottom edge, because forced colours overrides a border's COLOUR and not
    // its width.
    const weights = await page.locator('.hl-viewbtn').evaluateAll((nodes) =>
      nodes.map((node) => ({
        view: node.getAttribute('data-view'),
        bottom: getComputedStyle(node).borderBottomWidth,
      })),
    )
    const cards = weights.find((one) => one.view === 'cards')
    expect(cards?.bottom).toBe('2px')
    for (const other of weights.filter((one) => one.view !== 'cards')) {
      expect(other.bottom, `${other.view} is as heavy as the showing view`).toBe('1px')
    }
  })
})

// ---------------------------------------------------------------------------
// The record's own column, which only the table draws
// ---------------------------------------------------------------------------

test('a completed module reads as completed in the table view', async ({ page }) => {
  const seeded = sheetByModule(1)
  await seedRecord(page, {
    sheets: { [slugOf(seeded)]: { signedOff: '2026-08-14T09:00:00.000Z' } },
  })
  await page.goto(INDEX_SHEET)
  await toggle(page, 'Table').click()

  // The completion column is the table's alone, and the island fills it after
  // mount (§12.2 channel B). The two record selections read the same record,
  // so the chip and the column cannot disagree.
  await expect(
    page.locator(`[data-hl-signoff-cell="${slugOf(seeded)}"] [data-hl-slot="COMPLETION"]`),
  ).toHaveAttribute('data-signed', 'true')

  await page.getByRole('button', { name: 'Completed', exact: true }).click()
  await expect(page.locator('.hl-chip-count-value').first()).toHaveText('1')
})
