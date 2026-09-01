import { expect, test } from '@playwright/test'
import { CATEGORY_PATHS, SHEETS, SHEET_COUNT } from './sheets'

/**
 * §5.2 — footer row 1, which shipped empty on all 32 module sheets.
 *
 * The cause was structural rather than cosmetic and that is what this file
 * guards. `SiteFooter` always accepted `sheet` and `revision`; nothing was in
 * a position to pass them, because the footer was rendered from the root
 * layout where no page data is in scope. Every unit test of the component
 * passed the whole time. Only a rendered page can say whether the row has
 * anything in it.
 *
 * Read the row, not the props: `SHEET 13 OF 32` and `REV <hash> · <date>` are
 * facts about the file behind the page, and the second is cross-checked
 * against the title block, which derives it independently (§11.26 — the
 * file's last-touching commit, never repo HEAD).
 */

/** Footer row 1, as a reader sees it. */
const readRow = () => {
  const footer = document.querySelector('footer')
  const row = footer?.querySelector('div > div')
  return {
    text: (row as HTMLElement | null)?.innerText.replace(/\s+/g, ' ').trim() ?? null,
    height: row ? Math.round(row.getBoundingClientRect().height) : null,
    revision: [...(document.querySelectorAll('.hl-title-block-row, .hl-title-strip-pair'))]
      .filter((pair) => pair.querySelector('dt')?.textContent?.trim().toUpperCase() === 'REVISION')
      .map((pair) => pair.querySelector('dd')?.textContent?.trim() ?? '')[0] ?? null,
  }
}

for (const sheet of SHEETS) {
  test(`sheet ${String(sheet.module).padStart(2, '0')} signs its footer`, async ({ page }) => {
    await page.goto(sheet.path)
    const row = await page.evaluate(readRow)

    expect(row.height, '§5.2 gives row 1 40px').toBe(40)
    expect(row.text, `${sheet.path} footer row 1`).not.toBe('')
    expect(row.text).toContain(`SHEET ${sheet.module} OF ${SHEET_COUNT}`)

    // §5.2's centre cell, and §11.26: the same hash the title block derived
    // for this file. A footer printing repo HEAD would pass the line above and
    // fail here on 31 of the 32 sheets.
    expect(row.text, `${sheet.path} revision`).toMatch(/REV [0-9a-f]{4,} · \d{4}-\d{2}-\d{2}/)
    expect(row.revision, 'the title block states a revision too').not.toBeNull()
    expect(row.text?.toUpperCase()).toContain(`REV ${row.revision}`.toUpperCase())
  })
}

const LISTINGS: readonly [string, string][] = [
  ['/', 'HOME'],
  ['/sheets/', 'SHEET INDEX'],
  ['/courses/', 'DRAWING SET'],
  [CATEGORY_PATHS[1], 'SUBSYSTEM 02'],
]

for (const [path, label] of LISTINGS) {
  test(`${path} names itself in the footer`, async ({ page }) => {
    await page.goto(path)
    const row = await page.evaluate(readRow)

    expect(row.text).toContain(label)
    // §5.2 — every cell is omitted when its value is unknown, and a listing
    // page is not one file, so it has no revision to print.
    expect(row.text).not.toContain('REV ')
  })
}

test('a route that is not a sheet still gets a main and a footer', async ({ page }) => {
  const response = await page.goto('/courses/fundamentals/not-a-sheet/')
  expect(response?.status()).toBe(404)

  // §10.2 — the landmarks live in `PageShell` now, so a page outside the
  // normal tree loses both together or neither.
  await expect(page.locator('main#main')).toHaveCount(1)
  await expect(page.locator('footer')).toHaveCount(1)
})
