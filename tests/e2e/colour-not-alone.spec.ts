import { expect, test } from '@playwright/test'
import { openRegisterRow, seedRecord, signedSheet } from './record'
import { CATEGORY_PATHS, INDEX_SHEET } from './sheets'
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
  await seedRecord(page, { identity: { role: 'software-engineer' }, sheets: SIGNED })

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

test('LKM-01 still reports every level with no colour (§13.1.3 item 1)', async ({
  page,
}) => {
  await seedRecord(page, { sheets: SIGNED })
  // M14 — the mark and its face legend are the `readout` row of the progress
  // page's register: `/dashboard/` folded into `/profile/`. The row is opened
  // because a closed `<details>` has no box, and `getComputedStyle` on an
  // unrendered element answers about a box that is not there.
  await page.goto('/profile/')
  await openRegisterRow(page, 'readout')

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
  // Two cubes on this page, not one: the 28px mark in the header and the 128px
  // hero (§13.2's four sizes). So the count is a positive multiple of the face
  // count rather than the face count itself — asserting it directly would have
  // been a claim about the page's furniture, and it would break the day a third
  // mark appears. The face count comes off the subsystem list, because there is
  // one face per subsystem.
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

  // One row per subsystem, each naming its flavour, its subsystem and its
  // count in words.
  const legend = page.locator('.bz-legend-swatch')
  await expect(legend).toHaveCount(CATEGORY_PATHS.length)

  const text = await page.locator('body').innerText()
  for (const flavour of ['TURKUAZ', 'LACİVERT', 'ERİK', 'BAL', 'KİREMİT']) {
    expect(text, flavour).toContain(flavour)
  }
  for (const title of ['Fundamentals', 'Intermediate', 'Expert', 'Ecosystem']) {
    expect(text, title).toContain(title)
  }

  // A subsystem holding no drawn sheets says so in the register's own word
  // rather than as a bare dash or as `0/9`, which would each imply something
  // untrue (§11.25, §13.14a).
  expect(text).toContain('PLANNED')
})

test('a path step still states its state with no colour (§13.1.3 item 6)', async ({ page }) => {
  await seedRecord(page, { identity: { role: 'software-engineer' }, sheets: SIGNED })
  // M14 — the nine paths are the `role` row of the progress page's register.
  await page.goto('/profile/')
  await openRegisterRow(page, 'role')

  const body = page.locator('.bz-path-body[data-role="software-engineer"]')
  await expect(body).toBeVisible()

  // Every step names its subsystem and its tier in text, so the leading rule's
  // hue repeats a fact rather than carrying one.
  const first = body.locator('.bz-step').first()
  await expect(first).toContainText(/FUNDAMENTALS/i)
  await expect(first).toContainText(/CORE|SUPPORTING|CONTEXT/i)

  // And the two states a step can be in are words, not colours.
  await expect(body.locator('.bz-step-tick:visible').first()).toContainText('COMPLETED')
  await expect(body).toContainText(/REMAINING ON THIS PATH/i)
})

test('the swatch is labelled by the row it sits in, never by hue alone', async ({ page }) => {
  await seedRecord(page, { sheets: SIGNED })
  await page.goto('/profile/')
  await openRegisterRow(page, 'readout')

  // §13.1.3 item 8 — the swatch is the one place a hue appears without an
  // adjacent count of its own, which is why it is `aria-hidden` and why its row
  // carries the flavour name, the subsystem and the count as text. Under forced
  // colours it is a bordered box with the system ground, and the row is
  // unchanged.
  for (const swatch of await page.locator('.bz-legend-swatch').all()) {
    await expect(swatch).toHaveAttribute('aria-hidden', 'true')
  }

  const rows = page.locator('tr', { has: page.locator('.bz-legend-swatch') })
  await expect(rows).toHaveCount(CATEGORY_PATHS.length)
  for (const row of await rows.all()) {
    // Flavour, subsystem, and a reading: three cells, all of them words.
    expect((await row.innerText()).trim().length).toBeGreaterThan(8)
  }
})

test('the account block and a closed row read as text with no colour (§16.2.3, §16.7)', async ({
  page,
}) => {
  /**
   * §16 introduced two surfaces that carry state in paint, and both of them are
   * deleted by this mode rather than merely dimmed.
   *
   * The selected mark cell has three carriers: an `--accent-wash` ground, a
   * 1.5px inset shadow and a bold label. `forced-colors: active` drops every
   * `background-image` and every `box-shadow` on the page, so two of the three
   * are gone here and the third — a font weight — is not a state a reader can be
   * asked to infer. §16.2.3's answer is that the native radio, hidden at every
   * other width because the glyph and its name are the control, is brought back
   * into view in this mode; the selection is then read from the platform's own
   * control, which is the one thing forced colours cannot take away.
   *
   * The register's closed row is the other: the fold is drawn as a painted
   * hairline grid, and the open row's marker is a painted 2px cut line. What
   * makes a closed row honest is not any of that — it is §16.4.1's reading,
   * which is real text in the summary. So this reads it as text, with the row
   * still closed, which is also the screen-reader case: the line is announced
   * without opening anything.
   */
  await seedRecord(page, {
    identity: {
      name: 'Ada Lovelace',
      markSeed: 'a1b2c3d4',
      mark: 'datum',
      role: 'software-engineer',
    },
    sheets: SIGNED,
  })
  await page.goto('/profile/')
  await expect(page.locator('.bz-readout[data-hydrated="true"]').first()).toBeAttached()

  // ---- the drafter block, in words -----------------------------------------
  const drafter = page.locator('.bz-drafter')
  await expect(drafter).toBeVisible()

  // The mark and the seed are two mono lines under the drawing, and they are the
  // information the deleted definition list described without printing: the mark
  // is a choice, the seed is the record of a past act.
  const lines = await drafter.locator('.bz-drafter-line').allInnerTexts()
  expect(lines.length, 'the drawing states neither its mark nor its seed').toBeGreaterThan(1)
  expect(lines.join('\n')).toMatch(/MARK ·/)
  expect(lines.join('\n')).toMatch(/SEED ·|NO SEED MINTED YET/)

  // Both halves name themselves, and the naming is the substitute for the
  // painted 1.5px rule between them, which this mode has just deleted.
  const halves = await drafter.locator('.bz-drafter-half h3').allInnerTexts()
  expect(halves.length).toBe(2)
  for (const half of halves) expect(half.trim().length).toBeGreaterThan(3)

  /*
    §16.2.3 — the chosen mark is readable from the native control, not from the
    wash.

    THE DESIGN IS A SWAP, SO BOTH HALVES ARE ASSERTED. The glyph and its name
    are the control at every other width, so the radio is `opacity: 0` there;
    under forced colours it comes back, because the platform's own widget is
    then the only thing that can say which option is chosen. `progress.css`
    states both, and stage 8 restored them after stage 0 deleted the stylesheet
    that used to.

    This comment said the rule was missing and that `toBeVisible()` "can no
    longer tell the design from its absence" — true when it was written, stale
    since stage 8, and the second half is the part worth keeping: **it is still
    true of `toBeVisible()`**, because Playwright counts an `opacity: 0` element
    as visible. It has a box and it is not `visibility: hidden`. So the swap is
    read from the COMPUTED OPACITY in both modes, which is the only assertion
    that can fail if either half of the rule goes away.
  */
  const chosen = page.locator('label[data-hl-mark="datum"] input[name="hl-mark"]')
  await expect(chosen).toBeChecked()

  await page.emulateMedia({ forcedColors: 'none' })
  expect(
    await chosen.evaluate((node) => getComputedStyle(node).opacity),
    'the native radio is meant to be out of sight while the glyph is the control',
  ).toBe('0')

  await page.emulateMedia({ forcedColors: 'active' })
  expect(
    await chosen.evaluate((node) => getComputedStyle(node).opacity),
    'with no colour at all the native radio is what says which mark is chosen',
  ).toBe('1')
  await expect(chosen).toBeVisible()
  // And the cell says which mark it is in text, because the glyph is decoration:
  // it is `aria-hidden` in every state and its fill is gone here.
  await expect(page.locator('label[data-hl-mark="datum"]')).toContainText(/\S/)

  // ---- one closed row, in words -------------------------------------------
  const row = page.locator('section.bz-register-row').first()
  const fold = row.locator('details.bz-register-fold')
  expect(await fold.evaluate((node) => (node as HTMLDetailsElement).open)).toBe(false)

  const name = (await row.locator('.bz-register-name').innerText()).trim()
  const reading = (await row.locator('.bz-register-reading').innerText()).trim()
  expect(name.length, 'a closed row does not name itself').toBeGreaterThan(2)
  // §16.4.1 — folding removes prose and never a fact, and with no colour at all
  // the fact is still the only thing that has to survive.
  expect(reading, 'a closed row states no reading under forced colours').not.toBe('')
  expect(reading === '--' || /\d/.test(reading) || /^[A-Z]/.test(reading)).toBe(true)
  // The whole summary reads as one line of text: name, reading, and the mono
  // chevron, which is `aria-hidden` and therefore not in this reading.
  expect((await row.locator('summary').innerText()).trim()).toContain(name)
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
