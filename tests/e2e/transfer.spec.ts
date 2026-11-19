import { readFileSync } from 'node:fs'
import { deflateRawSync } from 'node:zlib'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { readRecord, seedRecord, signedSheet, waitForRecord, waitForRecordRead } from './record'

/**
 * D144 — the progress transfer, in a real browser, against the export: `/transfer/` reads a link
 * made by another implementation (the shared vector), shows what it holds, and adds it through
 * the record's writer; the progress page's title-row button draws a code of this browser's own
 * link, and is there only when there is something to move.
 *
 * The counts are computed from the vector's JSON here, never typed in, so the vector can change
 * without this file changing (tests/README.md).
 */

const VECTOR: { compactJson: string; payload: string } = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'tests/fixtures/transfer/vector-1.json'), 'utf8'),
)
const LINKED: { e: Record<string, [string, string, number[]]>; y: Record<string, [string, string, number[]]> } =
  JSON.parse(VECTOR.compactJson)

const completed = (map: Record<string, [string, string, number[]]>) =>
  Object.values(map).filter(([signedOff]) => signedOff !== '').length
const phrase = (count: number) => `${count} ${count === 1 ? 'module' : 'modules'} completed`

test('a progress link shows its counts, adds on one press, and says when nothing is new', async ({ page }) => {
  await page.goto(`/transfer/#t=${VECTOR.payload}`)

  const counts = page.getByRole('main').locator('dl')
  await expect(counts).toContainText(`For Engineers${phrase(completed(LINKED.e))}`)
  await expect(counts).toContainText(`For Everyone${phrase(completed(LINKED.y))}`)
  // Nothing is applied on open.
  expect(await readRecord(page)).toBeNull()

  await page.getByRole('button', { name: "Add to this browser's progress" }).click()
  await expect(page.getByText('Added. Nothing here was removed.')).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('')

  const stored = await waitForRecord(page, (envelope) =>
    Object.keys(LINKED.e).every((slug) => envelope?.data.sheets[slug] !== undefined),
  )
  for (const slug of Object.keys(LINKED.y)) expect(stored?.data.everyoneSheets[slug]).toBeDefined()

  await page.goto(`/transfer/#t=${VECTOR.payload}`)
  await page.getByRole('button', { name: "Add to this browser's progress" }).click()
  await expect(page.getByText('Nothing new: this browser already has all of it.')).toBeVisible()
})

test('a link of ticks alone says how many checklist items it ticks in each track', async ({ page }) => {
  const compact = '{"v":1,"e":{"a/b":["","",[0]]},"y":{"a/b":["","",[1,2]]},"d":[]}'
  await page.goto(`/transfer/#t=${deflateRawSync(compact).toString('base64url')}`)
  const counts = page.locator('dl')
  await expect(counts).toContainText(`For Engineers${phrase(0)}1 checklist item ticked`)
  await expect(counts).toContainText(`For Everyone${phrase(0)}2 checklist items ticked`)
})

test('an unreadable link says so and changes nothing; no link says what the page is for', async ({ page }) => {
  await page.goto('/transfer/#t=not-a-progress-link')
  await expect(page.getByText('This link cannot be read. Nothing was changed.')).toBeVisible()
  await expect(page.getByRole('button', { name: "Add to this browser's progress" })).toHaveCount(0)

  await page.goto('/transfer/')
  await expect(page.getByRole('main').getByRole('link', { name: 'Progress', exact: true })).toBeVisible()
  expect(await readRecord(page)).toBeNull()
})

test('the progress page shows "Move to the app" only when there is something to move', async ({ page }) => {
  const move = page.getByRole('button', { name: 'Move to the app' })

  await page.goto('/profile/')
  await waitForRecordRead(page)
  await expect(move).toHaveCount(0)

  // A ticked item alone is something to move.
  await seedRecord(page, { everyoneSheets: { 'alpha/first': { checklist: { '0': true } } } })
  await page.reload()
  await waitForRecordRead(page)
  await expect(move).toBeVisible()
})

test('the button sits on the title row and the data line has no trigger', async ({ page }) => {
  await seedRecord(page, { sheets: { 'alpha/first': signedSheet() } })
  await page.goto('/profile/')
  const move = page.getByRole('button', { name: 'Move to the app' })
  await expect(move).toBeVisible()
  await expect(move.locator('svg[aria-hidden="true"]')).toHaveCount(1)

  // Beside the title or, where both do not fit, on the line under it: never below the tabs.
  const title = await page.getByRole('heading', { level: 1, name: 'Your progress' }).boundingBox()
  const tabs = await page.getByRole('tablist').boundingBox()
  const box = await move.boundingBox()
  expect(box && title && tabs).toBeTruthy()
  expect(box!.y + box!.height).toBeLessThanOrEqual(tabs!.y)
  expect(box!.y + box!.height).toBeGreaterThan(title!.y)

  const dataLine = page.locator('#data')
  await expect(dataLine.getByRole('button', { name: 'Back up to a file' })).toBeVisible()
  await expect(dataLine.getByText('Move to the app')).toHaveCount(0)
})

test("the button opens a dialog with a QR code of this browser's progress", async ({ page }) => {
  await seedRecord(page, { sheets: { 'alpha/first': signedSheet() } })
  await page.goto('/profile/')
  await page.getByRole('button', { name: 'Move to the app' }).click()

  const dialog = page.getByRole('dialog', { name: 'Move your progress to the app' })
  const code = dialog.getByRole('img', { name: 'QR code of the link to this progress' })
  await expect(code).toBeVisible()
  const box = await code.boundingBox()
  expect(box?.width).toBeGreaterThan(100)
  await expect(dialog.getByRole('button', { name: 'Copy link' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Move to the app' })).toBeFocused()
})
