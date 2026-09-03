import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type Page, expect, test } from '@playwright/test'
import { waitForHydratedReadout } from './record'
import { SHEETS } from './sheets'

/**
 * Does each feature work at all.
 *
 * These four tests replaced 865 unit tests that checked the insides of the
 * progress tracker, the name generator and the mascot. That trade is
 * deliberate and worth stating: a unit test can prove a rounding rule is
 * right, and these cannot. What these do is catch every version of "the
 * feature is broken", which is the failure a reader would actually meet, and
 * they cost four tests instead of eight hundred.
 *
 * If one of these goes red, something a person uses stopped working. None of
 * them can go red because a module was edited. See `tests/README.md`.
 */

const DRAWN = SHEETS.filter((sheet) => sheet.drawn)
const signOff = (page: Page) => page.getByRole('button', { name: 'SIGN OFF', exact: true })

test('the reader can sign a sheet off, and it is still signed after a reload', async ({
  page,
}) => {
  const sheet = DRAWN[0]
  await page.goto(sheet.path)
  await waitForHydratedReadout(page)

  const readout = page.locator('footer .hl-readout').first()
  const before = await readout.innerText()
  await expect(signOff(page)).toHaveAttribute('aria-pressed', 'false')

  await signOff(page).click()

  // The control flips, and the running tally in the footer moves with it.
  await expect(page.getByRole('button', { name: /^SIGNED OFF / })).toBeVisible()
  await expect.poll(async () => readout.innerText()).not.toBe(before)
  const after = await readout.innerText()

  // The point of the feature: it survives leaving the page.
  await page.reload()
  await waitForHydratedReadout(page)
  await expect(page.getByRole('button', { name: /^SIGNED OFF / })).toBeVisible()
  await expect.poll(async () => readout.innerText()).toBe(after)

  // And it can be taken back.
  await page.getByRole('button', { name: 'UNSIGN', exact: true }).click()
  await expect(signOff(page)).toHaveAttribute('aria-pressed', 'false')
})

test('the reader is given a name and a mark once there is a record', async ({ page }) => {
  await page.goto(DRAWN[0].path)
  await waitForHydratedReadout(page)
  await signOff(page).click()
  await expect(page.getByRole('button', { name: /^SIGNED OFF / })).toBeVisible()

  // Somewhere on the record pages the reader is named, and the name is real
  // words rather than an empty slot or the literal word "undefined".
  await page.goto('/record/')
  const text = await page.locator('main').innerText()
  expect(text.toLowerCase()).not.toContain('undefined')
  expect(text.replace(/\s+/g, ' ').trim().length).toBeGreaterThan(40)
})

test('the mascot draws itself', async ({ page }) => {
  await page.goto('/')

  // Drawn in code, so "it rendered" means real geometry with real size, not an
  // empty <svg> box.
  const mascot = page.locator('header svg').first()
  await expect(mascot).toBeVisible()
  const box = await mascot.boundingBox()
  expect(box?.width ?? 0).toBeGreaterThan(8)
  expect(box?.height ?? 0).toBeGreaterThan(8)
  expect(await mascot.locator('path, circle, rect, ellipse, polygon').count())
    .toBeGreaterThan(0)
})

test('every picture the export names is in the export', () => {
  // The defect this exists for: figures were authored in a way the build
  // stripped, and pages shipped with the pictures gone while a green suite and
  // a clean build said nothing. `tests/corpus/renders.test.ts` catches the
  // authoring mistake; this catches a file that is named correctly on a
  // shipped page and is not there beside it.
  //
  // It reads the exported bytes off disk rather than asking a browser. Pixel
  // decoding races the assertion under a parallel run, an image below the fold
  // may never be fetched at all, and an HTTP check adds a network to something
  // that is really a question about files. The browser suite runs after
  // `npm run build`, so `out/` is the bytes that would ship.
  const root = join(process.cwd(), 'out')
  expect(existsSync(root), 'out/ is missing — the webServer build did not run').toBe(true)

  const pages = SHEETS.map((sheet) => join(root, sheet.path, 'index.html'))

  const missing: string[] = []
  let pictures = 0
  for (const file of pages) {
    const html = readFileSync(file, 'utf8')
    for (const [, src] of html.matchAll(/<img[^>]+src="([^"]+)"/g)) {
      if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) continue
      pictures += 1
      if (!existsSync(join(root, src.replace(/^\//, '')))) {
        missing.push(`${file.slice(root.length)} -> ${src}`)
      }
    }
  }
  expect(pictures, 'no sheet exported a single picture').toBeGreaterThan(0)
  expect(missing).toEqual([])
})
