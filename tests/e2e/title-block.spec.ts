import { expect, test } from '@playwright/test'
import { INDEX_SHEET, SHEETS } from './sheets'

/**
 * §5.5 — the title block, checked against the sheet it describes.
 *
 * Every row here is a number about *this page*, and the only way to know a
 * derivation is honest is to count the thing it claims to count in the
 * rendered document. A unit test can prove `countDiagrams` agrees with
 * `countDiagrams`; it cannot notice that the value under `DIAG` was actually
 * diagrams-plus-images, or that `SOURCES` counted a `curl` target inside a
 * ```bash fence that no reader can click.
 *
 * So the assertions all run the same way: read the row, count the figures and
 * the distinct external hrefs on the page, and require the two to agree.
 * Nothing here hardcodes a corpus number — a re-drawn sheet moves both sides
 * together, and a derivation that starts lying fails on the sheet it lies
 * about.
 */

interface Sheet {
  rows: Record<string, string>
  diagrams: number
  images: number
  tables: number
  /** Distinct external destinations a reader can actually open. */
  sources: number
}

const read = () => ({
  rows: Object.fromEntries(
    [...document.querySelectorAll('.hl-title-block-row, .hl-title-strip-pair')].map((pair) => [
      pair.querySelector('dt')?.textContent?.trim().toUpperCase() ?? '',
      pair.querySelector('dd')?.textContent?.trim() ?? '',
    ]),
  ),
  diagrams: document.querySelectorAll('.hl-figure.hl-diagram').length,
  images: document.querySelectorAll('.hl-figure.hl-image').length,
  tables: document.querySelectorAll('.hl-figure.hl-table').length,
  sources: new Set(
    [...document.querySelectorAll('main a[data-hl-external]')].map(
      (a) => (a as HTMLAnchorElement).href,
    ),
  ).size,
})

const DRAWN = SHEETS.filter((s) => s.drawn)
const NOT_DRAWN = SHEETS.filter((s) => !s.drawn)

for (const sheet of DRAWN) {
  test(`sheet ${String(sheet.module).padStart(2, '0')} states what it draws`, async ({ page }) => {
    await page.goto(sheet.path)
    const found: Sheet = await page.evaluate(read)

    // §5.5 spells the row `<n> DIAG · <n> TBL`. An image is a figure and §6.9
    // draws it in the same component, but it is not a diagram: module 6 has
    // one diagram and four images, and `5 DIAG` was the sum wearing the wrong
    // label.
    expect(found.rows.FIGURES, `${sheet.path} FIGURES`)
      .toBe(`${found.diagrams} DIAG · ${found.tables} TBL`)

    // §5.5: "count of distinct external http(s) links". The number and the
    // links the reader can open are the same set or one of them is a lie.
    expect(found.rows.SOURCES, `${sheet.path} SOURCES`).toBe(String(found.sources))

    // A drawn sheet has been counted, so it prints its count — `0` included.
    // The dash means "nobody counted this" and belongs to the sheets nobody
    // has drawn (§4.5, §11.25).
    expect(found.rows.SOURCES, `${sheet.path} SOURCES`).toMatch(/^\d+$/)
    expect(found.rows.EXTENT, `${sheet.path} EXTENT`).toMatch(/^[\d,]+ W · \d+ MIN$/)
  })
}

for (const sheet of NOT_DRAWN) {
  test(`sheet ${String(sheet.module).padStart(2, '0')} claims nothing it has not drawn`, async ({ page }) => {
    await page.goto(sheet.path)
    const found: Sheet = await page.evaluate(read)

    // §4.5 item 4, verbatim: `EXTENT —`, `FIGURES —`, `SOURCES —`,
    // `REQUIRES —`, `LANG EN`.
    expect(found.rows.EXTENT, `${sheet.path} EXTENT`).toBe('—')
    expect(found.rows.FIGURES, `${sheet.path} FIGURES`).toBe('—')
    expect(found.rows.SOURCES, `${sheet.path} SOURCES`).toBe('—')
    expect(found.rows.REQUIRES, `${sheet.path} REQUIRES`).toBe('—')

    // §11.27 and §1's second self-check. The Turkish sibling of a stub is a
    // faithful translation *of the stub*, which is why the ratio alone badged
    // all seventeen of these; there is no drawing here to be bilingual about.
    expect(found.rows.LANG, `${sheet.path} LANG`).toBe('EN')
  })
}

test('the index agrees with the sheets about which are bilingual', async ({ page }) => {
  // §4.8's table left `/` for `/sheets/` when the home screen took the front
  // door (§15.1); the cross-check is unchanged, because the fact it checks is
  // not about the route. `INDEX_SHEET` rather than a typed path so a second
  // move costs one line in `sheets.ts` and nothing here.
  await page.goto(INDEX_SHEET)

  // The `LANG` column is found by its own header rather than by an index, so
  // adding a column to §4.8's table does not silently retarget this test.
  const langs = await page.evaluate(() => {
    const heads = [...document.querySelectorAll('.hl-index thead th')]
    const column = heads.findIndex((th) => th.textContent?.trim().toUpperCase() === 'LANG')
    return [...document.querySelectorAll('.hl-index tbody tr')].map((row) => ({
      module: Number(row.querySelector('td, th')?.textContent?.trim()),
      lang: [...row.children][column]?.textContent?.trim() ?? '',
      draft: row.hasAttribute('data-draft'),
    }))
  })

  expect(langs).toHaveLength(SHEETS.length)

  // A sheet that is not drawn is `EN` on its own sheet (§4.5), so it is `EN`
  // here too — the index and the sheet are two renderings of one fact.
  for (const row of langs) {
    if (row.draft) expect(row.lang, `sheet ${row.module}`).toBe('EN')
  }

  // Which sheets are translated changes as they are translated, so the index
  // is checked against the sheets rather than against a list written here: a
  // drawn sheet reads `EN · TR` or `EN`, and nothing else.
  for (const row of langs) {
    if (!row.draft) expect(row.lang, `sheet ${row.module}`).toMatch(/^EN( · TR)?$/)
  }
  expect(langs.some((row) => row.lang === 'EN · TR')).toBe(true)
})
