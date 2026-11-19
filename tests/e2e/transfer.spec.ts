import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { readRecord, seedRecord, signedSheet, waitForRecord } from './record'

/**
 * D144 — the progress transfer, in a real browser, against the export: `/transfer/` reads a link
 * made by another implementation (the shared vector), shows what it holds, and adds it through
 * the record's writer; the progress page draws a code of this browser's own link.
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

test('an unreadable link says so and changes nothing; no link says what the page is for', async ({ page }) => {
  await page.goto('/transfer/#t=not-a-progress-link')
  await expect(page.getByText('This link cannot be read. Nothing was changed.')).toBeVisible()
  await expect(page.getByRole('button', { name: "Add to this browser's progress" })).toHaveCount(0)

  await page.goto('/transfer/')
  await expect(page.getByRole('main').getByRole('link', { name: 'Progress', exact: true })).toBeVisible()
  expect(await readRecord(page)).toBeNull()
})

test('the progress page draws a QR code of this browser\'s progress, and says when there is nothing', async ({ page }) => {
  await page.goto('/profile/')
  await page.getByRole('button', { name: 'Move to the app' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('no completed module and no ticked item')
  await expect(dialog.locator('svg[role="img"]')).toHaveCount(0)
  await page.keyboard.press('Escape')

  await seedRecord(page, { sheets: { 'alpha/first': signedSheet() } })
  await page.reload()
  await page.getByRole('button', { name: 'Move to the app' }).click()
  const code = page.getByRole('img', { name: 'QR code of the link to this progress' })
  await expect(code).toBeVisible()
  const box = await code.boundingBox()
  expect(box?.width).toBeGreaterThan(100)
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Copy link' })).toBeVisible()
})
