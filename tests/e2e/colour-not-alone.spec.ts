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
