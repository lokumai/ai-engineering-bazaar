import { expect, test } from '@playwright/test'
import { seedRecord, signedSheet } from './record'
import { A0, CATEGORY_PATHS, INDEX_SHEET } from './sheets'
import { showCatalogView, showTable } from './views'

/**
 * §13.1.4 / SC 1.4.1 — every surface that carries a category hue says the same
 * thing without it.
 *
 * §13 spends colour on progress, which is exactly the change WCAG's oldest
 * success criterion exists to police. The claim §13.1.4 makes is that hue is
 * always **redundant reinforcement**: a count in text, a line type, or a status
 * word says it too. A claim like that is worth nothing asserted — so this spec
 * takes the colour away and reads the page.
 *
 * `forcedColors: 'active'` is the real thing rather than a simulation: Chrome
 * discards author colours and substitutes the system palette, which is what a
 * reader in Windows High Contrast actually gets. The generated sheet's
 * `@media (forced-colors: active)` block drops every hue to `Canvas` /
 * `CanvasText` deliberately, so if any surface depended on its hue, it goes
 * blank here and nowhere else.
 *
 * The same pass doubles as the colour-blindness argument. Two of the six hues
 * are 45° apart (KİREMİT and BAL) and a deuteranope may not separate them at
 * all; that is tolerable precisely because nothing here rests on telling two
 * hues apart.
 */

const SIGNED = {
  'fundamentals/llms': signedSheet('abc1234'),
  'fundamentals/training': signedSheet('abc1234'),
  'intermediate/security': signedSheet('abc1234'),
}

/**
 * `emulateMedia`, not `test.use({ forcedColors })`: this Playwright version does
 * not carry `forcedColors` in the `use` fixture type, and it is a page-level
 * emulation anyway. Applied before every navigation so no case can accidentally
 * run in colour and pass for the wrong reason.
 */
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
})

test('a category card still reports its standing with no colour (§13.1.3 item 2)', async ({
  page,
}) => {
  await seedRecord(page, {sheets: SIGNED })

  /* M17 — the band and its meter are on the level's own catalog entry now, one
     per page rather than five on one. `SIGNED` carries a signed sheet in each
     of these two levels, so both are asserted: a claim checked on one level is
     a claim checked on one page, and the failure this replaces was exactly
     that — a count of five meters that became a count of one. */
  for (const level of [CATEGORY_PATHS[0], CATEGORY_PATHS[1]]) {
    await page.goto(level)

    // The meter is the surface that carries hue. Its count is what carries the
    // meaning, and it is real text beside it.
    await expect(page.locator('.bz-meter'), level).toHaveCount(1)

    await expect
      .poll(async () => page.locator('[data-hl-cat-tally]').first().innerText())
      .toMatch(/^\d+\/\d+$/)

    // …and it says what the number means, in words, beside it.
    const body = await page.locator('body').innerText()
    expect(body.match(/\d+\/\d+\s+COMPLETED/gi)?.length ?? 0, level).toBe(1)
  }

  await page.goto(CATEGORY_PATHS[0])

  // A segment's border survives forced colours — `forced-color-adjust: none` on
  // the track and a system-colour fill on a signed one — so "signed" is still a
  // filled cell against an empty one. A difference in FILL, not in hue.
  const fills = await page.locator('.bz-seg[data-cat="fundamentals"]').evaluateAll(
    (nodes) => nodes.map((node) => getComputedStyle(node).backgroundColor),
  )
  expect(new Set(fills).size).toBeGreaterThan(1)
})

test('a module row still states its own status with no colour (§13.1.3 item 3)', async ({
  page,
}) => {
  await seedRecord(page, { sheets: SIGNED })
  /* The WHOLE catalog and not a level page: the claim is that a written row and
     a planned row are told apart without colour, so both have to be in one
     table. `Fundamentals` is entirely written — which is why `catalog.spec.ts`
     picks it for the empty-state case — so a level page is exactly where the
     comparison cannot be made. */
  await page.goto(INDEX_SHEET)
  await showTable(page)

  /* The row's leading rule is tinted; the row's own cells are what say so.

     **M17 changed which cells those are and this is where that is measured.**
     §4.8's `STATUS` column was the word `READY` beside a tick, and the author
     had it removed. What is left on a written row and absent from a planned
     one, with no colour in any of it: a declared length, a source count, and
     a completion cell holding a square per slot rather than one dashed square.
     An em dash and a border style both survive `forced-colors: active`; a hue
     does not, which is the whole of §13.1.3 item 3. */
  const signedRow = page.locator('tr.bz-row').filter({ hasText: 'LLM Fundamentals' })
  await expect(signedRow).toHaveAttribute('data-cat', 'fundamentals')
  await expect(signedRow.locator('.bz-signoff-square[data-drawn="false"]')).toHaveCount(0)
  await expect(signedRow.locator('.bz-signoff-square')).not.toHaveCount(0)

  // And a planned row in the same table, told apart from it by the same cells.
  const planned = page.locator('tr.bz-row[data-draft]').first()
  await expect(planned.locator('.bz-signoff-square[data-drawn="false"]')).toHaveCount(1)
  await expect(planned.locator('.bz-row-value').first()).toHaveText('—')

  // The word did not vanish, it left the screen (D61).
  await expect(planned.locator('.bz-row-title .bz-said')).toHaveText('PLANNED')

  // Every hue-bearing row keeps a visible structural border, so the table still
  // reads as a table.
  const borders = await page.locator('tr.bz-row.bz-cat-tint > :first-child').evaluateAll(
    (nodes) => nodes.map((node) => getComputedStyle(node).borderInlineStartColor),
  )
  expect(borders.length).toBeGreaterThan(0)
  expect(borders.every((colour) => colour !== 'rgba(0, 0, 0, 0)')).toBe(true)
})

test('LKM-01 draws its faces with no fill (§13.1.3 item 1)', async ({ page }) => {
  await seedRecord(page, { sheets: SIGNED })
  // `/legend/` since 2026-11-05. The mark and its face legend were the
  // `readout` row of the progress page until that row was removed; the legend
  // still draws the mark, and the face legend went with the row.
  await page.goto('/legend/')

  /*
    The faces carry no fill. What is left is §8.2's line types and the face
    legend, and the legend is the accessible content: the SVG is `aria-hidden`
    in every state and at every size (§12.2, §12.18).

    WHERE THE `none` COMES FROM CHANGED, and this comment used to name
    `lokum.css`, which set `.bz-face { fill: none }` inside a forced-colours
    block. M16 stage 0 deleted that stylesheet, and the fill is now the `fill`
    attribute on the path itself — so the claim is no longer conditional on
    forced colours at all, and asserting it only under forced colours had
    stopped distinguishing anything. It is checked in BOTH modes below, which
    is the stronger statement the markup now actually makes: a face reports its
    subsystem by stroke and shape, never by a fill, whatever the display is
    doing.
  */
  const faceFills = () =>
    page
      .locator('.bz-face')
      .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).fill))

  const fills = await faceFills()
  // The face count comes off the subsystem list, because there is one face per
  // subsystem; a multiple of it, because a page may carry the mark more than
  // once.
  expect(fills.length).toBeGreaterThan(0)
  expect(fills.length % CATEGORY_PATHS.length).toBe(0)
  expect(fills.every((fill) => fill === 'none')).toBe(true)

  // And again with forced colours off, because the mechanism is the markup now
  // and not a media query. Same count, same answer.
  await page.emulateMedia({ forcedColors: 'none' })
  const unforced = await faceFills()
  expect(unforced.length).toBe(fills.length)
  expect(unforced.every((fill) => fill === 'none')).toBe(true)
  await page.emulateMedia({ forcedColors: 'active' })
})

/**
 * M20 — the level swatch in the Cards view, which lost the number inside it.
 *
 * The swatch carried its level's ordinal, and `CatalogCards`' own comment said
 * why: *"the number inside it is what a reader in forced colours reads
 * instead."* The author does not name a level by number anywhere, so the digit
 * went — and the moment it did, the swatch became a hue with nothing in it.
 *
 * That is only safe because the heading BESIDE it names the level in words,
 * and a word survives `forced-colors: active` untouched. This is the test that
 * says so, because nothing else did: `.bz-levelhead-key` had a fidelity role
 * and no behavioural assertion anywhere in the suite, so the number could have
 * been removed with no carrier left and a green run either way.
 */
test('a level head names its level in words, with nothing in the swatch', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto('/sheets/')
  await showCatalogView(page, 'cards')

  const heads = page.locator('[data-view="cards"] .bz-levelhead')
  const count = await heads.count()
  expect(count, 'the cards view groups by level').toBeGreaterThan(1)

  for (let i = 0; i < count; i += 1) {
    const head = heads.nth(i)
    const swatch = head.locator('.bz-levelhead-key')

    // The hue is decoration and says so, in both senses: hidden from assistive
    // software, and empty of anything a sighted reader could fall back on.
    await expect(swatch).toHaveAttribute('aria-hidden', 'true')
    expect((await swatch.innerText()).trim(), 'the swatch carries text again').toBe('')

    // And the fact it used to carry is beside it, as a word.
    const named = (await head.locator('.bz-levelhead-title').innerText()).trim()
    expect(named.length, 'a level head with no name is a hue alone').toBeGreaterThan(0)
  }
})

/**
 * M21 — **the rail keeps a visible boundary in forced colours**, and this
 * exists because the milestone briefly took it away.
 *
 * The rail's trailing hairline was a `border-right`, and a border takes its
 * pixel out of the content box — which made the rail overflow itself by one
 * pixel and let the fold latch a scroll offset that could never come back (the
 * bug the author reported). M21 painted the line as a background layer instead,
 * which takes no space.
 *
 * **MEASURED under `forced-colors: active`: a background image is not painted
 * at all.** `backgroundImage` computes to `none`, and with the border already
 * gone the rail had no boundary of any kind — the column and the reading
 * surface ran together with nothing between them. An independent review named
 * it and the browser confirmed it.
 *
 * So the border comes back in this mode and the inner gives up the pixel, which
 * keeps both true at once. Asserted here rather than in `rail.spec.ts` because
 * it is a forced-colours fact and this is the file that runs in that mode.
 */
test('the curriculum rail is still bounded under forced colours', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto(A0.path)

  const rail = await page.evaluate(() => {
    const node = document.querySelector('.bz-rail')
    if (!node) return null
    const style = getComputedStyle(node)
    return {
      painted: style.backgroundImage !== 'none',
      border: parseFloat(style.borderRightWidth),
      // The fix must not reintroduce the defect it replaced: a border here
      // costs a pixel of the content box, and the inner has to give it back.
      inlineOverflow: node.scrollWidth - node.clientWidth,
    }
  })

  expect(rail, 'no rail on this route').not.toBeNull()
  // Either mechanism is fine; having NEITHER is the failure.
  expect(
    rail!.painted || rail!.border > 0,
    'the rail has no boundary at all in forced colours',
  ).toBe(true)
  expect(rail!.inlineOverflow, 'the forced-colours border reintroduced the overflow').toBe(0)
})
