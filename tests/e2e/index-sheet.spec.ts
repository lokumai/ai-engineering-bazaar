import { expect, test } from '@playwright/test'
import {
  DRAWN_COUNT,
  INDEX_SHEET,
  NOT_DRAWN_COUNT,
  SHEETS,
  SHEET_COUNT,
} from './sheets'
import { watchPage } from './watch'

/**
 * §4.8 — the index sheet, and the one promise it makes that is easy to break
 * silently: every count the page prints is measured from the set it is
 * printing.
 *
 * The sheet lives at `INDEX_SHEET` since §15.1 gave `/` to the home screen. The
 * table moved verbatim, so every test here moved with it — the subject was
 * never the route, it was the flat manifest — and the route is imported rather
 * than typed so a second move costs one line in `sheets.ts`.
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

test('lists every sheet in the set, once, in sheet order', async ({ page }) => {
  await page.goto(INDEX_SHEET)

  const rows = page.locator('.hl-index tbody tr')
  await expect(rows).toHaveCount(SHEET_COUNT)

  // The manifest and `sheets.ts` are two independent statements of what ships.
  // Reconciling them here is what lets every other spec trust the fixture.
  const links = await page.locator('.hl-index tbody .hl-row-link').evaluateAll(
    (nodes) => nodes.map((node) => ({
      href: new URL((node as HTMLAnchorElement).href).pathname,
      title: node.textContent?.trim() ?? '',
    })),
  )

  expect(links).toEqual(SHEETS.map((s) => ({ href: s.path, title: s.title })))
})

test('the drawn / not-drawn counts match the rows actually rendered', async ({ page }) => {
  await page.goto(INDEX_SHEET)

  const ready = page.locator('.hl-index tbody tr:not([data-draft])')
  const notDrawn = page.locator('.hl-index tbody tr[data-draft]')

  await expect(ready).toHaveCount(DRAWN_COUNT)
  await expect(notDrawn).toHaveCount(NOT_DRAWN_COUNT)

  // Every one of those rows says so in words as well as in line type (§10.4).
  await expect(page.locator('.hl-row-status', { hasText: /^READY$/ })).toHaveCount(DRAWN_COUNT)
  await expect(page.locator('.hl-row-status', { hasText: /^NOT DRAWN$/ })).toHaveCount(NOT_DRAWN_COUNT)

  // …and the eyebrow above the table counts the same set (§11.25), in the
  // marks register rather than in words.
  const eyebrow = await page.locator('.hl-eyebrow').innerText()
  expect(eyebrow).toContain(`${SHEET_COUNT} SHEETS`)
  expect(eyebrow).toContain(`${DRAWN_COUNT} DRAWN`)

  // The spelt-out form of the same three counts is the home screen's first-visit
  // statement (§15.2.3). It is prose about the set, not about the reader, so it
  // has to agree with the rows above — and after §15 nothing else compares the
  // two, because they are no longer on one page.
  await page.goto('/')
  const statement = (await page.locator('.hl-statement').innerText()).replace(/\s+/g, ' ')
  expect(statement).toContain(`${spellOut(SHEET_COUNT)} sheets`)
  expect(statement).toContain(`${spellOut(DRAWN_COUNT)} are drawn.`)
  expect(statement).toContain(`${spellOut(NOT_DRAWN_COUNT)} are dashed`)
})

test('the filter chips narrow the table to the count they claim', async ({ page }) => {
  await page.goto(INDEX_SHEET)

  const rows = page.locator('.hl-index tbody tr')
  const count = page.locator('.hl-chip-count')

  await expect(count).toHaveText(`Showing ${SHEET_COUNT} of ${SHEET_COUNT}`)

  await page.getByRole('button', { name: 'READY', exact: true }).click()
  await expect(rows).toHaveCount(DRAWN_COUNT)
  await expect(count).toHaveText(`Showing ${DRAWN_COUNT} of ${SHEET_COUNT}`)

  await page.getByRole('button', { name: 'NOT DRAWN', exact: true }).click()
  await expect(rows).toHaveCount(NOT_DRAWN_COUNT)
  await expect(count).toHaveText(`Showing ${NOT_DRAWN_COUNT} of ${SHEET_COUNT}`)

  await page.getByRole('button', { name: 'ALL', exact: true }).click()
  await expect(rows).toHaveCount(SHEET_COUNT)
})

test('links every subsystem, and each row reaches its sheet', async ({ page }) => {
  const problems = watchPage(page)
  await page.goto(INDEX_SHEET)

  await expect(page.locator('.hl-subsystem-list > li')).toHaveCount(6)

  // One row, followed end to end: the manifest is only useful if it navigates.
  await page.locator('.hl-index tbody .hl-row-link').first().click()
  await expect(page).toHaveURL(new RegExp(`${SHEETS[0].path}$`))
  await expect(page.locator('main h1')).toHaveText(SHEETS[0].title)

  expect(problems.consoleErrors).toEqual([])
})
