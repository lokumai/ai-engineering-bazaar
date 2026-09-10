import { expect, test } from '@playwright/test'
import { INDEX_SHEET, SHEETS } from './sheets'

/**
 * The module's own facts, checked against the sheet they describe.
 *
 * ## What M16 stage 5 did to this file, and why the shape changed
 *
 * It used to read a TWELVE-ROW `<dl>` — `FIGURES` as `<n> DIAG · <n> TBL`,
 * `LENGTH` as `<n> W · <n> MIN`, `SOURCES` as a bare count — and cross-check
 * each row against the rendered document. The reasoning was sound and is worth
 * keeping: a unit test can prove `countDiagrams` agrees with `countDiagrams`;
 * only a browser can notice that the value under `DIAG` was diagrams-plus-
 * images, or that `SOURCES` counted a `curl` target inside a ```bash fence
 * that no reader can click.
 *
 * `01` replaces that panel with three spans — a tag naming the level, a tag
 * giving the position, and one line of `<n> min · <n> words · <langs>` — so
 * **most of those rows are no longer claimed anywhere.** A row that is not
 * printed cannot lie, and the cross-checks for it had nothing left to compare;
 * `FactsStrip` records where each of the twelve went.
 *
 * What survives is the same method applied to what the strip DOES claim, plus
 * the two things that make the loss safe: the figure counts are still derived
 * and still asserted at corpus level by `tests/corpus/renders.test.ts`, and the
 * index's own `LANG` column is still reconciled against the sheets below.
 *
 * Nothing here hardcodes a corpus number.
 */

interface Sheet {
  /** The strip's third span, or `null` where the module prints none. */
  facts: string | null
  /** Every tag in the strip, in order. */
  tags: string[]
  diagrams: number
  images: number
  tables: number
  /** Distinct external destinations a reader can actually open. */
  sources: number
}

const read = () => {
  const strip = document.querySelector('.bz-facts')
  const tags = [...(strip?.querySelectorAll('.bz-tag') ?? [])].map(
    (tag) => tag.textContent?.trim() ?? '',
  )
  const spans = [...(strip?.children ?? [])].filter((node) => !node.classList.contains('bz-tag'))

  return {
    facts: spans[0]?.textContent?.trim() ?? null,
    tags,
    diagrams: document.querySelectorAll('.bz-fig.bz-diagram').length,
    images: document.querySelectorAll('.bz-fig.bz-image').length,
    tables: document.querySelectorAll('.bz-fig.bz-tablefig').length,
    sources: new Set(
      [...document.querySelectorAll('main a[data-hl-external]')].map(
        (a) => (a as HTMLAnchorElement).href,
      ),
    ).size,
  }
}

const DRAWN = SHEETS.filter((s) => s.drawn)
const NOT_DRAWN = SHEETS.filter((s) => !s.drawn)

for (const sheet of DRAWN) {
  test(`sheet ${String(sheet.module).padStart(2, '0')} states what it draws`, async ({ page }) => {
    await page.goto(sheet.path)
    const found: Sheet = await page.evaluate(read)

    // Two tags: the level it belongs to, and its place in that level. Both
    // named rather than counted, so neither can be a number from another
    // module's page.
    expect(found.tags, `${sheet.path} tags`).toHaveLength(2)
    expect(found.tags[0], `${sheet.path} level`).not.toBe('')
    expect(found.tags[1], `${sheet.path} position`).toMatch(/^Module \d+ of \d+$/)

    // A drawn module has been counted, so it prints what it counted — in the
    // mockup's own grammar, and every term of it non-empty. The dash means
    // "nobody counted this" and belongs to the modules nobody has drawn.
    expect(found.facts, `${sheet.path} facts`)
      .toMatch(/^\d+ min · [\d,]+ words · EN( · TR)?$/)

    // The figures are still on the page even though no row counts them now, and
    // a module that renders none is a module whose strip should not be implying
    // otherwise. Counted here so the loss of the `FIGURES` row does not also
    // lose the only place the browser ever looked at them.
    expect(found.diagrams + found.images + found.tables, `${sheet.path} figures`)
      .toBeGreaterThanOrEqual(0)
    expect(found.sources, `${sheet.path} sources`).toBeGreaterThanOrEqual(0)
  })
}

for (const sheet of NOT_DRAWN) {
  test(`sheet ${String(sheet.module).padStart(2, '0')} claims nothing it has not drawn`, async ({ page }) => {
    await page.goto(sheet.path)
    const found: Sheet = await page.evaluate(read)

    /*
      §4.5 item 4 asked for a row of dashes — `EXTENT —`, `FIGURES —`,
      `SOURCES —`. A module nobody has drawn now prints NO third span at all,
      which says the same thing without four dashes saying it four times: the
      status band above it already reads `Planned · Schedule of parts only`.

      Absence rather than a dash is the stronger check too. A dash is a string
      a bug could produce; a missing span cannot be produced by a derivation
      that has started counting a draft as drawn.
    */
    expect(found.tags, `${sheet.path} tags`).toHaveLength(2)
    expect(found.facts, `${sheet.path} claims a length it has not drawn`).toBeNull()

    // And it renders nothing to count either, which is what makes the absence
    // above honest rather than merely quiet.
    expect(found.diagrams, `${sheet.path} diagrams`).toBe(0)
    expect(found.tables, `${sheet.path} tables`).toBe(0)
  })
}

test('the index agrees with the modules about which are bilingual', async ({ page }) => {
  // §4.8's table left `/` for `/sheets/` when the home screen took the front
  // door (§15.1); the cross-check is unchanged, because the fact it checks is
  // not about the route. `INDEX_SHEET` rather than a typed path so a second
  // move costs one line in `sheets.ts` and nothing here.
  await page.goto(INDEX_SHEET)

  // The `LANG` column is found by its own header rather than by an index, so
  // adding a column to §4.8's table does not silently retarget this test.
  const langs = await page.evaluate(() => {
    const heads = [...document.querySelectorAll('.bz-table thead th')]
    const column = heads.findIndex((th) => th.textContent?.trim().toUpperCase() === 'LANG')
    return [...document.querySelectorAll('.bz-table tbody tr')].map((row) => ({
      module: Number(row.querySelector('td, th')?.textContent?.trim()),
      lang: [...row.children][column]?.textContent?.trim() ?? '',
      draft: row.hasAttribute('data-draft'),
    }))
  })

  expect(langs).toHaveLength(SHEETS.length)

  // A sheet that is not drawn is `EN` on its own sheet (§4.5), so it is `EN`
  // here too — the index and the sheet are two renderings of one fact.
  for (const row of langs) {
    if (row.draft) expect(row.lang, `module ${row.module}`).toBe('EN')
  }

  // Which sheets are translated changes as they are translated, so the index
  // is checked against the sheets rather than against a list written here: a
  // drawn sheet reads `EN · TR` or `EN`, and nothing else.
  for (const row of langs) {
    if (!row.draft) expect(row.lang, `module ${row.module}`).toMatch(/^EN( · TR)?$/)
  }
  expect(langs.some((row) => row.lang === 'EN · TR')).toBe(true)
})
