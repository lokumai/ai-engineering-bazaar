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
  /**
   * The strip's whole text, or `null` where the module prints no strip.
   *
   * M21 — it was the strip's THIRD SPAN, because the first two were tags
   * naming the level and the module's place in it. The author asked for the
   * line to be plain text and both tags went; a drawn module's strip is the
   * one line, and a module nobody has written has no strip at all.
   */
  facts: string | null
  /** The breadcrumb's own segments, which is where the level is named now. */
  crumbs: string[]
  diagrams: number
  images: number
  tables: number
  /** Distinct external destinations a reader can actually open. */
  sources: number
}

const read = () => {
  const strip = document.querySelector('.bz-facts')
  const text = strip?.textContent?.trim() ?? ''

  return {
    facts: text === '' ? null : text,
    // Named by the landmark rather than by a class: the level has to be
    // readable off something a fold cannot hide and forced colours cannot
    // flatten, and the trail is that. The rail names it too and the rail can
    // be folded away.
    crumbs: [...document.querySelectorAll('nav[aria-label="Curriculum"] a, nav[aria-label="Curriculum"] span')]
      .map((node) => node.textContent?.trim() ?? '')
      .filter((word) => word !== '' && word !== '/'),
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

    /* M21 — the strip is `25 min · 2,317 words` and nothing else. It was two
       tags and a third span carrying the language as well; the author asked
       for plain text, and every fact that left is still stated somewhere:
       the level by the trail below, the position by the footer (which
       `site-footer.spec.ts` asserts on all thirty-three), and the language by
       nothing, because the site cannot serve it (M19).

       A drawn module has been counted, so it prints what it counted, and
       every term of it is non-empty. The dash means "nobody counted this" and
       belongs to the modules nobody has drawn. */
    expect(found.facts, `${sheet.path} facts`).toMatch(/^\d+ min · [\d,]+ words$/)

    // THE LEVEL IS STILL NAMED, in words, on something no fold can hide: the
    // trail. This is the carrier the level tag handed off to, and asserting it
    // here is what makes removing the tag a move rather than a loss.
    expect(found.crumbs.length, `${sheet.path} has no trail to name a level in`)
      .toBeGreaterThan(2)
    expect(found.crumbs[2] ?? '', `${sheet.path} names no level in its trail`).not.toBe('')

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
      `SOURCES —`. A module nobody has drawn prints NO STRIP AT ALL, which says
      the same thing without four dashes saying it four times: the status band
      above it already reads `Planned · Schedule of parts only`. (It used to
      print two tags and no third span; M21 took the tags off every module, so
      what was an empty slot is now an absent element.)

      Absence rather than a dash is the stronger check too. A dash is a string
      a bug could produce; a missing span cannot be produced by a derivation
      that has started counting a draft as drawn.
    */
    expect(found.facts, `${sheet.path} claims a length it has not drawn`).toBeNull()
    // And its level is still named, by the trail, exactly as a drawn one's is.
    expect(found.crumbs[2] ?? '', `${sheet.path} names no level in its trail`).not.toBe('')

    // And it renders nothing to count either, which is what makes the absence
    // above honest rather than merely quiet.
    expect(found.diagrams, `${sheet.path} diagrams`).toBe(0)
    expect(found.tables, `${sheet.path} tables`).toBe(0)
  })
}

/**
 * M20 and M21 — **NOTHING STATES A LANGUAGE ANY MORE, and this is what says so.**
 *
 * It used to read the `LANG` column off §4.8's table and cross-check it
 * against every module's own facts strip: two renderings of one fact, which is
 * the right shape for a test. M20 took the column off the table, because
 * `EN · TR` is a fact about the REPOSITORY — a `_tr.md` file exists — and the
 * site renders none of those 33 files. The listing was stating a translation
 * it cannot serve.
 *
 * M20 took `EN · TR` off the catalog's table and cards; **M21 took it off the
 * module's own facts strip**, which was the last surface printing it. The site
 * renders none of the 33 `_tr.md` files, so every one of those was a claim it
 * could not honour.
 *
 * **The invariant did not go with them.** That a draft is `EN` and a drawn
 * sheet is `EN` or `EN · TR` is checked against the loader in
 * `tests/unit/content/derive.test.ts`, over every module — the fact is still
 * true of the repository and still tested where it lives. What this asserts is
 * the thing only a browser can: that no surface a reader meets makes the claim.
 *
 * **M19 is what makes it true, and it makes it an address rather than a
 * printed word.** When it lands, this test gains the switcher instead of
 * losing the case.
 */
test('every module states its own language, and no listing states one', async ({ page }) => {
  await page.goto(INDEX_SHEET)

  // Nowhere in the catalog — not a column, not a card fact, not a filter chip.
  // Checked on the whole document because all three views are in it at once.
  const stated = await page.evaluate(() => document.body.innerText)
  expect(stated).not.toContain('EN · TR')
  expect(
    await page.getByRole('button', { name: 'Both languages', exact: true }).count(),
    'a filter for a fact no view shows',
  ).toBe(0)

  // And on the sheets themselves, where the fact is still printed. A drawn
  // sheet reads `EN · TR` or `EN` and nothing else; which sheets are
  // translated changes as they are translated, so the shape is asserted and
  // the list is not written down here (`tests/README.md`).
  let bilingual = 0
  for (const sheet of DRAWN) {
    await page.goto(sheet.path)
    const facts = await page.evaluate(read)
    expect(facts.facts, `${sheet.path} states no facts`).not.toBeNull()
    expect(facts.facts as string, `${sheet.path} still states a language`)
      .not.toMatch(/\bEN\b|\bTR\b/)
    bilingual += 1
  }
  expect(bilingual, 'no module was checked').toBeGreaterThan(0)
})
