import { expect, test } from '@playwright/test'
import {
  DRAWN_COUNT,
  INDEX_SHEET,
  NOT_DRAWN_COUNT,
  SHEETS,
  SHEET_COUNT,
  CATEGORY_PATHS,
} from './sheets'
import { showTable } from './views'
import { watchPage } from './watch'

/**
 * §4.8, as M12 left it — the catalog, and the one promise it makes that is easy
 * to break silently: every count the page prints is measured from the set it is
 * printing.
 *
 * The page lives at `INDEX_SHEET` since §15.1 gave `/` to the home screen, and
 * M12 turned it into three views over one array (D13). **The table is one of
 * the three now, and it is not the one showing by default**, so every test here
 * that reads the table selects the Table view first. That is a real change in
 * what these tests exercise and it is the right one: the table's counts are
 * still the subject, and the toggle is now part of reaching them.
 *
 * `catalog.spec.ts` is the file about the three views themselves — that they
 * render the same set, that the choice is remembered and that only the showing
 * one is in the tab order. This file stayed with the counts.
 *
 * "Fifteen are drawn" is prose, so nothing type-checks it and no unit test of
 * the loader can catch the day it stops matching the table it is counting. So
 * the assertions here all run the same way — read the sentence, count the rows,
 * and require the two to agree — rather than hardcoding fifteen on both sides
 * of the comparison. §15.2.3 put that sentence on the home screen while the
 * rows stayed here, so the one test that reads it now crosses both documents
 * instead of dropping the comparison: two pages, one measurement of one set.
 */

/** Spelt-out counts, independently of `lib/content/manifest`'s spelling. */
const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
]
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty']

function spellOut(n: number): string {
  const word = n <= 20 ? WORDS[n] : `${TENS[Math.floor(n / 10)]}-${WORDS[n % 10]}`
  return word.charAt(0).toUpperCase() + word.slice(1)
}

test('lists every module in the set, once, in module order', async ({ page }) => {
  await page.goto(INDEX_SHEET)
  await showTable(page)

  const rows = page.locator('.bz-table tbody tr')
  await expect(rows).toHaveCount(SHEET_COUNT)

  // The manifest and `sheets.ts` are two independent statements of what ships.
  // Reconciling them here is what lets every other spec trust the fixture.
  const links = await page.locator('.bz-table tbody .bz-row-link').evaluateAll(
    (nodes) => nodes.map((node) => ({
      href: new URL((node as HTMLAnchorElement).href).pathname,
      title: node.textContent?.trim() ?? '',
    })),
  )

  expect(links).toEqual(SHEETS.map((s) => ({ href: s.path, title: s.title })))
})

test('the ready / not-ready counts match the rows actually rendered', async ({ page }) => {
  await page.goto(INDEX_SHEET)
  await showTable(page)

  const ready = page.locator('.bz-table tbody tr:not([data-draft])')
  const notDrawn = page.locator('.bz-table tbody tr[data-draft]')

  await expect(ready).toHaveCount(DRAWN_COUNT)
  await expect(notDrawn).toHaveCount(NOT_DRAWN_COUNT)

  /* M17 — the same claim, on what carries it now. §4.8's `STATUS` column is
     gone; the word it printed is `.bz-said` inside each row's own header, so
     a screen reader still hears it and the screen no longer repeats what four
     other cells already say (`ModuleRow`'s `RowState`). Counting it here is
     what stops the word being dropped along with the column. */
  await expect(
    page.locator('.bz-table tbody .bz-row-title .bz-said', { hasText: /^READY$/ }),
  ).toHaveCount(DRAWN_COUNT)
  await expect(
    page.locator('.bz-table tbody .bz-row-title .bz-said', { hasText: /^PLANNED$/ }),
  ).toHaveCount(NOT_DRAWN_COUNT)

  // …and the Overview view states the same set, level by level (§11.25).
  //
  // It used to print `8 modules · 8 ready` under each level name and this
  // summed those. The author had the printed counts removed on 2026-09-11 —
  // the rail beside them draws the same fact — so the sum is taken from where
  // the fact lives now: each rail's accessible name, which is the statement a
  // reader who cannot see the fill is given.
  const bands = await page.locator('.bz-boardcol .bz-track').evaluateAll(
    (nodes) => nodes.map((node) => node.getAttribute('aria-label') ?? ''),
  )
  expect(bands.length, 'the overview draws no rails').toBeGreaterThan(0)
  const summed = bands.reduce(
    (total, label) => {
      const [ready, modules] = [...label.matchAll(/(\d+)/g)].map((match) => Number(match[1]))
      return { modules: total.modules + modules, ready: total.ready + ready }
    },
    { modules: 0, ready: 0 },
  )
  expect(summed).toEqual({ modules: SHEET_COUNT, ready: DRAWN_COUNT })

  // The home page used to spell the same three counts out in its opening
  // paragraph and this compared them too. That paragraph is gone — it
  // described the course to itself — so there is no second prose statement of
  // the set left to disagree with the rows.
})

test('the filter chips narrow the table to the count they claim', async ({ page }) => {
  await page.goto(INDEX_SHEET)
  await showTable(page)

  const rows = page.locator('.bz-table tbody tr')
  const count = page.locator('.bz-filter-count')

  await expect(count).toHaveText(`Showing ${SHEET_COUNT} of ${SHEET_COUNT}`)

  // M12 — the same six selections in sentence case. The ids did not move; the
  // labels did, because a tracked-out all-caps chip is one of DESIGN.md's
  // do-nots and `EN · TR` was two of them at once.
  await page.getByRole('button', { name: 'Ready', exact: true }).click()
  await expect(rows).toHaveCount(DRAWN_COUNT)
  await expect(count).toHaveText(`Showing ${DRAWN_COUNT} of ${SHEET_COUNT}`)

  await page.getByRole('button', { name: 'Planned', exact: true }).click()
  await expect(rows).toHaveCount(NOT_DRAWN_COUNT)
  await expect(count).toHaveText(`Showing ${NOT_DRAWN_COUNT} of ${SHEET_COUNT}`)

  await page.getByRole('button', { name: 'All', exact: true }).click()
  await expect(rows).toHaveCount(SHEET_COUNT)
})

test('links every level, and each row reaches its module', async ({ page }) => {
  const problems = watchPage(page)
  await page.goto(INDEX_SHEET)

  // M12 — the level links are the Overview view's bands. They replaced the
  // block of category cards that used to sit under the table, which was a
  // second, shorter rendering of the same grouping (D13's cost paragraph).
  await expect(page.locator('.bz-boardcol')).toHaveCount(CATEGORY_PATHS.length)
  const levelLinks = await page.locator('.bz-boardcol-link').evaluateAll((nodes) =>
    nodes.map((node) => new URL((node as HTMLAnchorElement).href).pathname),
  )
  expect(levelLinks.sort()).toEqual([...CATEGORY_PATHS].sort())

  // One row, followed end to end: the catalog is only useful if it navigates.
  await showTable(page)
  await page.locator('.bz-table tbody .bz-row-link').first().click()
  await expect(page).toHaveURL(new RegExp(`${SHEETS[0].path}$`))
  await expect(page.locator('main h1')).toHaveText(SHEETS[0].title)

  expect(problems.consoleErrors).toEqual([])
})
