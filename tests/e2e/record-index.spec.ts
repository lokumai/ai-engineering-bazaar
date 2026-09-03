import { type Page, expect, test } from '@playwright/test'
import {
  probeFirstPaint,
  firstPaint,
  readoutCells,
  seedRecord,
  signedSheet,
  slugOf,
  waitForHydratedReadout,
} from './record'
import { A0, DRAWN_COUNT, INDEX_SHEET, SHEETS, SHEET_COUNT, sheetByModule } from './sheets'
import { watchPage } from './watch'

/**
 * §4.8's ninth column and §12.18's amendment to it — the sign-off squares on
 * the index sheet, and the two chips that select on the record rather than on
 * the drawing.
 *
 * `index-sheet.spec.ts` already proves the manifest counts the set it prints.
 * This file is about the one column that is not about the drawing at all, and
 * every check here needs an engine for a reason the unit suite cannot reach:
 *
 * 1. **The column is painted by a `MutationObserver`, and only a real DOM has
 *    one.** Filtering unmounts and re-mounts rows, and a re-mounted row arrives
 *    with the server's `data-signed="false"` on it: React diffs against the
 *    props it last rendered, not against attributes something else wrote, so it
 *    neither preserves nor restores the paint. Press a chip, come back to `ALL`,
 *    and the column is blank again — which is exactly the case this file exists
 *    to hold, because it is invisible to every other kind of test.
 * 2. **`ALL` has to be the chip that is active on load** (§12.2). A
 *    reader-state filter active at that moment would make the first client
 *    render emit a different number of `<tr>` than the prerender: the worst
 *    class of hydration mismatch, and one React 19 answers by discarding the
 *    subtree and repainting the table. Comparing the served bytes against the
 *    hydrated DOM is the only way to ask that question.
 * 3. **The squares must stay non-interactive.** `.hl-row-link::after` covers
 *    the whole row with `inset: 0`, so a control in that cell would be
 *    unclickable and lifting it out would give the row a second tab stop
 *    (§10.3). Whether anything in there is focusable is a DOM fact.
 * 4. **The ninth column widened the table** (§12.18: `min-width` 988 → 1060).
 *    §4.7's one hard rule is that the page body never scrolls horizontally at
 *    any width, and a painted square is a different box from an empty one.
 *
 * The manifest was `/` until §15 gave the front door to the home screen; it is
 * `INDEX_SHEET` now, and every navigation and every request in this file reads
 * that constant rather than typing the route, so a second move costs one line
 * in `sheets.ts` (§15.1). Nothing else here changed: the column, the chips and
 * the two channels are the same claims about the same table.
 */

/** Sheet 13 — the only sheet with all four slots, so the widest cell (§12.7). */
const SEEDED = A0
const SEEDED_SLUG = slugOf(SEEDED)

/** Every square in one sheet's cell, keyed by the slot it stands for. */
function squares(page: Page, slug: string) {
  return page.locator(`[data-hl-signoff-cell="${slug}"] [data-hl-slot]`)
}

function slotState(page: Page, slug: string, slot: string) {
  return page.locator(`[data-hl-signoff-cell="${slug}"] [data-hl-slot="${slot}"]`)
}

const rows = (page: Page) => page.locator('.hl-index tbody tr')
const chip = (page: Page, label: string) => page.getByRole('button', { name: label, exact: true })

// ---------------------------------------------------------------------------
// §4.8 column 9 / §12.18 — the column itself
// ---------------------------------------------------------------------------

test('the ninth column is SIGN-OFF, and its squares are 14 × 14 (§4.8, §12.18)', async ({
  page,
}) => {
  await page.goto(INDEX_SHEET)

  const headers = page.locator('.hl-index thead th')
  await expect(headers).toHaveCount(9)
  // The rendered case, because this one is a §4.8 column name the reader reads
  // off the drawing, and `SIGN-OFF` is how §4.8 writes it.
  await expect(headers.nth(7)).toHaveText('SIGN-OFF', { useInnerText: true })

  const boxes = squares(page, SEEDED_SLUG)
  await expect(boxes).toHaveCount(4)
  const measured = await boxes.evaluateAll((nodes) =>
    nodes.map((node) => {
      const style = getComputedStyle(node)
      return { width: style.width, height: style.height, radius: style.borderTopLeftRadius }
    }),
  )
  for (const box of measured) {
    expect(box.width).toBe('14px')
    expect(box.height).toBe('14px')
    // §5.9 — zero radius, everywhere on this site.
    expect(box.radius).toBe('0px')
  }
})

test('nothing in the sign-off column is interactive or announced (§4.8, §10.3, §10.4)', async ({
  page,
}) => {
  await page.goto(INDEX_SHEET)

  // §12.18 — a control here would sit under `.hl-row-link`'s stretched
  // pseudo-element, unclickable, and lifting it out would add a second tab stop
  // to every row. Signing off happens on the sheet, which is the only place the
  // criteria are stated (§12.4.1).
  const focusable = await page
    .locator('.hl-row-signoff')
    .evaluateAll((cells) =>
      cells.reduce(
        (total, cell) =>
          total + cell.querySelectorAll('a, button, input, select, textarea, [tabindex]').length,
        0,
      ),
    )
  expect(focusable, 'the sign-off column grew a control').toBe(0)

  // They carry no text by specification, so they are hidden rather than
  // announced as thirty-two nameless somethings — and §10.4 is satisfied twice
  // over elsewhere: the sheet states its own sign-off in words, and this page
  // states it through the chips and their announced count.
  const hidden = await page
    .locator('.hl-signoff-square')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-hidden')))
  expect(hidden.length).toBeGreaterThan(SHEET_COUNT)
  for (const value of hidden) expect(value).toBe('true')
})

test('a seeded record paints the squares its record has earned (§12.2 channel B)', async ({
  page,
}) => {
  const problems = watchPage(page)
  await seedRecord(page, {
    sheets: {
      [SEEDED_SLUG]: signedSheet('b7225f8', { quiz: { answer: 'a', assessed: 'matched', at: '' } }),
    },
  })
  await page.goto(INDEX_SHEET)

  // `sheetStamps` decides what is filled — the same function the manifest asked
  // which squares to draw — so a square is filled when its slot's count has
  // reached its threshold, one rule for all four slots.
  await expect(slotState(page, SEEDED_SLUG, 'SIGN-OFF')).toHaveAttribute('data-signed', 'true')
  await expect(slotState(page, SEEDED_SLUG, 'QUIZ')).toHaveAttribute('data-signed', 'true')
  // Nothing was ticked and no source was opened, so those two stay as drawn.
  await expect(slotState(page, SEEDED_SLUG, 'CHECKLIST')).toHaveAttribute('data-signed', 'false')
  await expect(slotState(page, SEEDED_SLUG, 'SOURCES')).toHaveAttribute('data-signed', 'false')

  // Every other sheet's cell is untouched: one island paints all of them, and a
  // selector that matched too broadly would fill the whole column.
  const other = slugOf(sheetByModule(1))
  await expect(slotState(page, other, 'SIGN-OFF')).toHaveAttribute('data-signed', 'false')

  expect(problems.consoleErrors).toEqual([])
})

/**
 * The case that breaks without the observer, and the reason it exists.
 *
 * Nothing about this is visible to a unit test: the island's paint is correct,
 * the chip's filter is correct, and the column still goes blank — because the
 * rows React re-mounts are the server's markup again, and React has no reason
 * to think anything else wrote to them.
 */
test('pressing a filter chip and returning to ALL keeps the squares painted (§12.2)', async ({
  page,
}) => {
  await seedRecord(page, { sheets: { [SEEDED_SLUG]: signedSheet('b7225f8') } })
  await page.goto(INDEX_SHEET)
  const painted = slotState(page, SEEDED_SLUG, 'SIGN-OFF')
  await expect(painted).toHaveAttribute('data-signed', 'true')

  // `READY` is a drawing filter, so it re-mounts rows without changing which
  // sheets the record says are signed off — the cleanest way to make the DOM
  // move under the paint.
  await chip(page, 'READY').click()
  await expect(rows(page)).toHaveCount(DRAWN_COUNT)
  await expect(painted).toHaveAttribute('data-signed', 'true')

  await chip(page, 'NOT DRAWN').click()
  await expect(rows(page)).toHaveCount(SHEET_COUNT - DRAWN_COUNT)
  // The seeded sheet is not in this table at all; the assertion is that coming
  // back finds it painted rather than that it stayed painted while absent.
  await expect(squares(page, SEEDED_SLUG)).toHaveCount(0)

  await chip(page, 'ALL').click()
  await expect(rows(page)).toHaveCount(SHEET_COUNT)
  await expect(painted).toHaveAttribute('data-signed', 'true')
})

// ---------------------------------------------------------------------------
// §12.18 — the two chips that select on the record
// ---------------------------------------------------------------------------

test('the SIGNED OFF and UNSIGNED chips filter on the reader’s own assertions (§12.18)', async ({
  page,
}) => {
  const signed = [sheetByModule(13), sheetByModule(8)]
  await seedRecord(page, {
    sheets: Object.fromEntries(signed.map((sheet) => [slugOf(sheet), signedSheet('b7225f8')])),
  })
  await page.goto(INDEX_SHEET)
  await waitForHydratedReadout(page)

  await chip(page, 'SIGNED OFF').click()
  await expect(rows(page)).toHaveCount(signed.length)
  const titles = await page.locator('.hl-index tbody .hl-row-link').allTextContents()
  expect(titles.sort()).toEqual(signed.map((sheet) => sheet.title).sort())

  // §12.4.1 — a draft can never carry a sign-off, so it is always `UNSIGNED`
  // rather than excluded from both: the two chips partition the whole set.
  await chip(page, 'UNSIGNED').click()
  await expect(rows(page)).toHaveCount(SHEET_COUNT - signed.length)
  await expect(page.locator('.hl-index tbody tr[data-draft]')).toHaveCount(
    SHEET_COUNT - DRAWN_COUNT,
  )
})

test('the count of what is shown is announced, not implied (§12.13, SC 4.1.3)', async ({
  page,
}) => {
  await seedRecord(page, { sheets: { [SEEDED_SLUG]: signedSheet('b7225f8') } })
  await page.goto(INDEX_SHEET)
  await waitForHydratedReadout(page)

  // One region, rendered in both states, so the announcement comes from an
  // element the reader's software has already seen rather than from one that
  // appears at the moment it has something to say. SC 4.1.3's own examples are
  // literally "5 results returned" / "No results returned", so the count itself
  // is in the region.
  const count = page.locator('.hl-chip-count')
  await expect(count).toHaveAttribute('role', 'status')
  await expect(count).toHaveText(`Showing ${SHEET_COUNT} of ${SHEET_COUNT}`)

  await chip(page, 'SIGNED OFF').click()
  await expect(count).toHaveText(`Showing 1 of ${SHEET_COUNT}`)

  await chip(page, 'UNSIGNED').click()
  await expect(count).toHaveText(`Showing ${SHEET_COUNT - 1} of ${SHEET_COUNT}`)
})

/**
 * §12.2 — `DEFAULT_FILTER_ID` is `ALL` and has to stay `ALL`.
 *
 * The served bytes are one witness and the hydrated DOM is the other. Reading
 * the row count out of the response body rather than out of a constant is what
 * makes this a comparison of the two renders instead of a comparison of the
 * suite with itself: if a record chip were ever active on load, the numbers
 * would differ and React would repaint the table.
 */
test('ALL is active on load and the first client render emits the prerender’s rows (§12.2)', async ({
  page,
}) => {
  const problems = watchPage(page)
  await seedRecord(page, {
    sheets: { [SEEDED_SLUG]: signedSheet('b7225f8'), [slugOf(sheetByModule(3))]: signedSheet(null) },
  })

  const served = await (await page.request.get(INDEX_SHEET)).text()
  const tbody = served.slice(served.indexOf('<tbody'), served.indexOf('</tbody>'))
  const prerendered = (tbody.match(/<tr/g) ?? []).length
  expect(prerendered).toBe(SHEET_COUNT)

  await page.goto(INDEX_SHEET)
  await waitForHydratedReadout(page)

  await expect(chip(page, 'ALL')).toHaveAttribute('aria-pressed', 'true')
  for (const label of ['READY', 'NOT DRAWN', 'EN · TR', 'SIGNED OFF', 'UNSIGNED'])
    await expect(chip(page, label)).toHaveAttribute('aria-pressed', 'false')

  await expect(rows(page)).toHaveCount(prerendered)
  // A mismatched `<tr>` count is a recoverable hydration error, which React
  // logs. Nothing else in this suite would notice the repaint.
  expect(problems.consoleErrors).toEqual([])
  expect(problems.failedRequests).toEqual([])

  // The readout on the same page reads the same record (§12.2 channel B), so a
  // painted column and a printed count cannot disagree.
  await expect(readoutCells(page).first()).toHaveText(`Signed off 02/${SHEET_COUNT}`)
})

test('the boot script stamps the index before its first paint too (§12.2 channel A)', async ({
  page,
}) => {
  await seedRecord(page, { sheets: { [SEEDED_SLUG]: signedSheet('b7225f8') } })
  await probeFirstPaint(page)
  await page.goto(INDEX_SHEET)

  // The index is where the six tick gauges and the mascot are read at once, so
  // it is the page a frame of unstamped `<html>` would be most visible on.
  const painted = await firstPaint(page)
  expect(painted).toBeDefined()
  expect(painted!.className).toContain(`hl-signed-${SEEDED.module}`)
  expect(painted!.className).toContain(`hl-cat-${SEEDED.category}-started`)
  expect(painted!.record).toBe('1')
})

// ---------------------------------------------------------------------------
// §4.7 — the one hard rule, at the width the ninth column pushed the table to
// ---------------------------------------------------------------------------

/**
 * §4.7's closing sentence: "The page body **never** scrolls horizontally at any
 * width. Wide content scrolls inside its own container."
 *
 * `responsive.spec.ts` runs in all three viewport projects and asserts this for
 * the index sheet already — but never with a record, and §12.18 widened the
 * table by 72px to carry the ninth column. A painted square is a different box
 * from an empty one: `data-signed="true"` swaps a border for four painted
 * gradients, and a border-box that grew would push the table past the
 * hand-computed 1060px `min-width` the flexible column is sized against.
 *
 * The viewport is set here rather than by adding this file to the 1024 and 390
 * projects: `playwright.config.ts` states the trade — the rest of the suite is
 * behaviour, not a rendering matrix, and tripling this whole file to take one
 * measurement three times would triple it for no additional answer.
 */
const WIDTHS = [
  [1440, 900],
  [1024, 768],
  [390, 844],
] as const

for (const [width, height] of WIDTHS) {
  test(`a painted sign-off column does not push the body sideways at ${width}px (§4.7, §12.18)`, async ({
    page,
  }) => {
    await seedRecord(page, {
      sheets: Object.fromEntries(
        SHEETS.filter((sheet) => sheet.drawn).map((sheet) => [slugOf(sheet), signedSheet(null)]),
      ),
    })
    await page.setViewportSize({ width, height })
    await page.goto(INDEX_SHEET)
    // Every drawn sheet signed off, so every fillable square in the column is
    // painted — the widest the column can ever be.
    await expect(slotState(page, SEEDED_SLUG, 'SIGN-OFF')).toHaveAttribute('data-signed', 'true')

    const measured = await page.evaluate(() => {
      const root = document.documentElement
      const scroller = document.querySelector('.hl-index-scroll') as HTMLElement
      return {
        documentOverflow: root.scrollWidth - root.clientWidth,
        bodyOverflow: document.body.scrollWidth - root.clientWidth,
        scrollerOverflow: scroller.scrollWidth - scroller.clientWidth,
        overflowX: getComputedStyle(scroller).overflowX,
      }
    })

    expect(measured.documentOverflow, 'the document scrolls sideways').toBeLessThanOrEqual(0)
    expect(measured.bodyOverflow, 'the body scrolls sideways').toBeLessThanOrEqual(0)
    // The other half of §4.7: the table is genuinely wider than its box below
    // 1060px, and its own container is what scrolls.
    expect(measured.overflowX).toBe('auto')
    if (width < 1060) {
      expect(measured.scrollerOverflow, 'the table is not scrolling inside its own container')
        .toBeGreaterThan(0)
    }
  })
}
