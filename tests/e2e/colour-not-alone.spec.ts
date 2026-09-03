import { expect, test } from '@playwright/test'
import { seedRecord, signedSheet } from './record'

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
 * reader in Windows High Contrast actually gets. `lokum.css`'s
 * `@media (forced-colors: active)` block drops every hue to `Canvas` /
 * `CanvasText` deliberately, so if any surface depended on its hue, it goes
 * blank here and nowhere else.
 *
 * The same pass doubles as the colour-blindness argument. Two of the six hues
 * are 38° apart (FISTIK and KAYMAK) and a deuteranope may not separate them at
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
  await page.goto('/courses/')

  // The meter is the surface that carries hue. Its count is what carries the
  // meaning, and it is real text beside it.
  const meters = page.locator('.hl-meter')
  expect(await meters.count()).toBeGreaterThan(0)

  await expect
    .poll(async () => page.locator('[data-hl-cat-tally]').first().innerText())
    .toMatch(/^\d+\/\d+$/)

  // Two categories carry a signed sheet in SIGNED, and each states its count
  // in words. How many sheets a category holds is the curriculum's business.
  const body = await page.locator('body').innerText()
  expect(body.match(/\d+\/\d+\s+SIGNED OFF/gi)?.length ?? 0).toBeGreaterThanOrEqual(2)

  // A segment's border survives forced colours — `forced-color-adjust: none` on
  // the track and a system-colour fill on a signed one — so "signed" is still a
  // filled cell against an empty one. A difference in FILL, not in hue.
  const fills = await page.locator('.hl-seg[data-cat="fundamentals"]').evaluateAll(
    (nodes) => nodes.map((node) => getComputedStyle(node).backgroundColor),
  )
  expect(new Set(fills).size).toBeGreaterThan(1)
})

test('a module row still states its own status with no colour (§13.1.3 item 3)', async ({
  page,
}) => {
  await seedRecord(page, { sheets: SIGNED })
  await page.goto('/courses/fundamentals/')

  // The row's leading rule is tinted; the row's own cells are what say so.
  const signedRow = page.locator('tr.hl-row').filter({ hasText: 'LLM Fundamentals' })
  await expect(signedRow).toContainText(/READY/i)

  // Every hue-bearing row keeps a visible structural border, so the table still
  // reads as a table.
  const borders = await page.locator('tr.hl-row.hl-cat-tint > :first-child').evaluateAll(
    (nodes) => nodes.map((node) => getComputedStyle(node).borderInlineStartColor),
  )
  expect(borders.length).toBeGreaterThan(0)
  expect(borders.every((colour) => colour !== 'rgba(0, 0, 0, 0)')).toBe(true)
})

test('LKM-01 still reports six subsystems with no colour (§13.1.3 item 1)', async ({
  page,
}) => {
  await seedRecord(page, { sheets: SIGNED })
  await page.goto('/dashboard/')

  // The faces lose their fill entirely under forced colours — `lokum.css` sets
  // `.hl-face { fill: none }` there on purpose. What is left is §8.2's line
  // types and the face legend, and the legend is the accessible content: the SVG
  // is `aria-hidden` in every state and at every size (§12.2, §12.18).
  const fills = await page.locator('.hl-face').evaluateAll(
    (nodes) => nodes.map((node) => getComputedStyle(node).fill),
  )
  // Two cubes on this page, not one: the 28px mark in the header and the 128px
  // hero (§13.2's four sizes). So the count is a positive multiple of six faces
  // rather than six — asserting six would have been a claim about the page's
  // furniture, and it would break the day a third mark appears.
  expect(fills.length).toBeGreaterThan(0)
  expect(fills.length % 6).toBe(0)
  expect(fills.every((fill) => fill === 'none')).toBe(true)

  // Six rows, each naming its flavour, its subsystem and its count in words.
  const legend = page.locator('.hl-legend-swatch')
  await expect(legend).toHaveCount(6)

  const text = await page.locator('body').innerText()
  for (const flavour of ['GÜL', 'FISTIK', 'LAVANTA', 'NANE', 'KAHVE', 'KAYMAK']) {
    expect(text, flavour).toContain(flavour)
  }
  for (const title of ['Fundamentals', 'Intermediate', 'Expert', 'Ecosystem', 'Optional']) {
    expect(text, title).toContain(title)
  }

  // A subsystem holding no drawn sheets says so in the register's own word
  // rather than as a bare dash or as `0/9`, which would each imply something
  // untrue (§11.25, §13.14a).
  expect(text).toContain('NOT DRAWN')
})

test('a path step still states its state with no colour (§13.1.3 item 6)', async ({ page }) => {
  await seedRecord(page, { identity: { role: 'software-engineer' }, sheets: SIGNED })
  await page.goto('/path/')

  const body = page.locator('.hl-path-body[data-role="software-engineer"]')
  await expect(body).toBeVisible()

  // Every step names its subsystem and its tier in text, so the leading rule's
  // hue repeats a fact rather than carrying one.
  const first = body.locator('.hl-step').first()
  await expect(first).toContainText(/FUNDAMENTALS/i)
  await expect(first).toContainText(/CORE|SUPPORTING|CONTEXT/i)

  // And the two states a step can be in are words, not colours.
  await expect(body.locator('.hl-step-tick:visible').first()).toContainText('SIGNED OFF')
  await expect(body).toContainText(/REMAINING ON THIS PATH/i)
})

test('the swatch is labelled by the row it sits in, never by hue alone', async ({ page }) => {
  await seedRecord(page, { sheets: SIGNED })
  await page.goto('/dashboard/')

  // §13.1.3 item 8 — the swatch is the one place a hue appears without an
  // adjacent count of its own, which is why it is `aria-hidden` and why its row
  // carries the flavour name, the subsystem and the count as text. Under forced
  // colours it is a bordered box with the system ground, and the row is
  // unchanged.
  for (const swatch of await page.locator('.hl-legend-swatch').all()) {
    await expect(swatch).toHaveAttribute('aria-hidden', 'true')
  }

  const rows = page.locator('tr', { has: page.locator('.hl-legend-swatch') })
  await expect(rows).toHaveCount(6)
  for (const row of await rows.all()) {
    // Flavour, subsystem, and a reading: three cells, all of them words.
    expect((await row.innerText()).trim().length).toBeGreaterThan(8)
  }
})

test('the drafter block and a closed register row read as text with no colour (§16.2.3, §16.7)', async ({
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
  await expect(page.locator('.hl-readout[data-hydrated="true"]').first()).toBeAttached()

  // ---- the drafter block, in words -----------------------------------------
  const drafter = page.locator('.hl-drafter')
  await expect(drafter).toBeVisible()

  // The mark and the seed are two mono lines under the drawing, and they are the
  // information the deleted definition list described without printing: the mark
  // is a choice, the seed is the record of a past act.
  const lines = await drafter.locator('.hl-drafter-line').allInnerTexts()
  expect(lines.length, 'the drawing states neither its mark nor its seed').toBeGreaterThan(1)
  expect(lines.join('\n')).toMatch(/MARK ·/)
  expect(lines.join('\n')).toMatch(/SEED ·|NO SEED MINTED YET/)

  // Both halves name themselves, and the naming is the substitute for the
  // painted 1.5px rule between them, which this mode has just deleted.
  const halves = await drafter.locator('.hl-drafter-half h3').allInnerTexts()
  expect(halves.length).toBe(2)
  for (const half of halves) expect(half.trim().length).toBeGreaterThan(3)

  // §16.2.3 — the chosen mark is readable from the native control, not from the
  // wash. The radio is visible in this mode BY DESIGN, and `opacity: 0` rather
  // than `display: none` in every other mode is what makes that possible.
  const chosen = page.locator('label[data-hl-mark="datum"] input[name="hl-mark"]')
  await expect(chosen).toBeChecked()
  await expect(chosen).toBeVisible()
  // And the cell says which mark it is in text, because the glyph is decoration:
  // it is `aria-hidden` in every state and its fill is gone here.
  await expect(page.locator('label[data-hl-mark="datum"]')).toContainText(/\S/)

  // ---- one closed row, in words -------------------------------------------
  const row = page.locator('section.hl-register-row').first()
  const fold = row.locator('details.hl-register-fold')
  expect(await fold.evaluate((node) => (node as HTMLDetailsElement).open)).toBe(false)

  const name = (await row.locator('.hl-register-name').innerText()).trim()
  const reading = (await row.locator('.hl-register-reading').innerText()).trim()
  expect(name.length, 'a closed row does not name itself').toBeGreaterThan(2)
  // §16.4.1 — folding removes prose and never a fact, and with no colour at all
  // the fact is still the only thing that has to survive.
  expect(reading, 'a closed row states no reading under forced colours').not.toBe('')
  expect(reading === '--' || /\d/.test(reading) || /^[A-Z]/.test(reading)).toBe(true)
  // The whole summary reads as one line of text: name, reading, and the mono
  // chevron, which is `aria-hidden` and therefore not in this reading.
  expect((await row.locator('summary').innerText()).trim()).toContain(name)
})
