import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type Page, expect, test } from '@playwright/test'
import {
  QUARANTINE_KEY,
  type RecordData,
  type RecordSeed,
  readRawRecord,
  readRecord,
  seedRecord,
} from './record'

/**
 * §12.10, §12.11 and §12.15 — the dashboard, the profile sheet, and the erase /
 * export / import controls.
 *
 * Everything here needs a real engine, and each group needs it for a different
 * reason:
 *
 *  - **The dashboard** is an accessibility contract expressed in *computed*
 *    terms. §12.10.1 overrides §10.1's `role="img"` because under ARIA 1.2 that
 *    role has presentational children and would erase all 32 node labels — a
 *    defect that leaves the markup looking perfect. Only a browser can be asked
 *    what role an element actually has and where its name came from. §12.10.2's
 *    "one tab stop" is likewise a property of the whole diagram, not of any
 *    node: it holds only if exactly one of 32 elements carries `tabindex="0"`
 *    and the arrow keys move that one, which is a keyboard sequence, not a
 *    snapshot.
 *  - **The profile sheet** prints values that come out of `navigator.storage`,
 *    `localStorage` and `crypto.subtle`. `storageReadout()` is unit-tested
 *    against a fake; what those tests cannot do is *query a browser*, and
 *    §12.1.6's whole rule is that the answer is queried and never assumed.
 *  - **Erase, export and import** are `Blob`, `URL.createObjectURL`,
 *    `<a download>`, `<input type="file">` and `File.text()` end to end. The
 *    round trip is the assertion, and it cannot be made anywhere else.
 *
 * `playwright.config.ts` states the division: "Vitest covers everything that
 * computes a value. This covers what only a real engine can answer."
 */

// ---------------------------------------------------------------------------
// The record, seeded through `record.ts` — the suite's own storage contract,
// typed out there rather than imported from `lib/record/` for the reason
// `sheets.ts` gives: a fixture built from the store's own factories can only
// ever prove the store agrees with itself.
// ---------------------------------------------------------------------------

/**
 * §12.1.2's second key, seeded raw. `record.ts` seeds the live record and an
 * unreadable payload under it; the erase has to be shown removing BOTH, so the
 * quarantined copy is written here, before the page's own scripts run.
 */
async function seedQuarantine(page: Page, raw: string): Promise<void> {
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      try {
        if (localStorage.getItem(key) !== null) return
        localStorage.setItem(key, value)
      } catch {
        // A browser refusing storage is §12.13 class 4, not this test's subject.
      }
    },
    { key: QUARANTINE_KEY, value: raw },
  )
}

/** The stored envelope's `data`, or null where the key is absent. */
async function storedData(page: Page): Promise<RecordData | null> {
  return (await readRecord(page))?.data ?? null
}

/**
 * Waits until the store has read storage, then returns what is in it.
 *
 * The signal is `<html data-hl-read="true">`, which is
 * the store's own report that it has read the record and the page is showing it
 * rather than the honest empty form the build shipped (§12.2).
 *
 * It used to wait on §12.1.6's durability query LANDING IN STORAGE instead. That
 * write is gone on purpose: routing the queried grant through the reducer made
 * merely loading a page put an envelope in storage, and the boot script reads
 * whatever storage holds at load — so from a reader's second page view onward,
 * an envelope written by their first would have had the empty state tell them
 * they had cleared a record they never made (§12.13). With nothing written on
 * load there is no write for a comparison to straddle, and waiting on the DOM is
 * the better signal regardless: it is what the reader can see, not an inference
 * from a side effect.
 */
async function settled(page: Page): Promise<RecordData> {
  await expect(page.locator('html[data-hl-read="true"]')).toBeAttached()
  return (await storedData(page)) as RecordData
}

/** The reader's own work, which is what a round trip has to preserve. */
function readerWork(data: RecordData): Record<string, unknown> {
  return { sheets: data.sheets, prefs: data.prefs }
}

/**
 * §12.12.6's data block, lifted the way `envelopeTextFrom` lifts it: a
 * substring operation, never an HTML parse. A raw `.json` export has no block
 * and is its own payload.
 */
function payloadOf(text: string): { schema: number; savedAt: string; data: RecordData } {
  const opening = /<script[^>]*id=["']hl-record["'][^>]*>/i.exec(text)
  if (opening === null) return JSON.parse(text)
  const start = opening.index + opening[0].length
  return JSON.parse(text.slice(start, text.indexOf('</script', start)))
}

/**
 * Three sheets signed off across two subsystems, one repository with a commit,
 * one assessed Quick Check, three ticks and three distinct sources. Enough for
 * every count on the profile sheet and in the erase dialog to be a real number
 * rather than a zero, which is the only way the enumeration can be checked.
 */
const SEEDED: RecordSeed = {
  sheets: {
    'fundamentals/llms': {
      signedOff: '2026-07-01T08:00:00.000Z',
      signedRevision: 'ab12cd3',
      reachedEnd: true,
    },
    'intermediate/prompt-engineering': {
      signedOff: '2026-07-20T11:30:00.000Z',
      signedRevision: 'bc23de4',
    },
    'intermediate/security': {
      signedOff: '2026-08-11T15:45:00.000Z',
      signedRevision: 'cd34ef5',
      reachedEnd: true,
      dwellSeconds: 900,
      checklist: { '0': true, '1': true, '2': true },
    },
  },
  days: ['2026-07-01', '2026-07-20', '2026-08-11'],
}


// ===========================================================================
// §12.15 — ERASE
// ===========================================================================

/** The one dialog on the site. Radix portals it, so it is queried from `body`. */
const DIALOG = '[role="dialog"]'

test('§12.15 — the erase dialog names its scope and enumerates the real counts', async ({
  page,
}) => {
  await seedRecord(page, SEEDED)
  await page.goto('/profile/')

  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  const dialog = page.locator(DIALOG)
  await expect(dialog).toBeVisible()

  // "Are you sure?" asks a reader to confirm a decision the dialog has not
  // described. This names the scope, which is a question somebody can answer.
  const title = (await dialog.getByRole('heading').first().textContent()) ?? ''
  expect(title).toBe('Erase all progress in this browser?')
  expect(title.toLowerCase()).not.toContain('are you sure')

  // The actual count, from the record: 3 module states.
  const enumerated = await dialog
    .locator('.bz-dialog-tally li')
    .evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').trim()))
  expect(enumerated).toEqual(['3 module states'])

  // §12.15 — the safe path is one click from the destructive one, not a route
  // away from it.
  await expect(dialog.getByRole('button', { name: 'Back up to a file' })).toBeVisible()

  // §12.14.1 — the buttons state OUTCOMES, and the decline states the SAFE
  // outcome with no shame and no loss framing. Never Yes/No.
  const buttons = await dialog
    .locator('.bz-actions button')
    .evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').trim()))
  expect(buttons).toEqual(['Erase all data', 'Keep my data', 'Back up to a file'])
  for (const label of buttons) {
    expect(label).not.toMatch(/^(yes|no)\b/i)
  }
  expect((await dialog.textContent()) ?? '').not.toMatch(/don.t care|lose everything/i)
})

test('§12.15 — the danger button is gated on the typed word', async ({ page }) => {
  await seedRecord(page, SEEDED)
  await page.goto('/profile/')
  await page.getByRole('button', { name: 'Reset', exact: true }).click()

  const dialog = page.locator(DIALOG)
  const danger = dialog.getByRole('button', { name: 'Erase all data' })
  const field = dialog.getByLabel('Type ERASE to confirm')

  // A real `disabled`, not an `aria-disabled` that swallows clicks: for a
  // destructive action the guarantee has to hold for every input modality.
  await expect(danger).toBeDisabled()

  for (const wrong of ['E', 'ERAS', 'ERASER', 'DELETE', 'E R A S E']) {
    await field.fill(wrong)
    await expect(danger, `"${wrong}" armed the danger button`).toBeDisabled()
  }

  await field.fill('ERASE')
  await expect(danger).toBeEnabled()

  // §12.13's condition on disabling a control — print the reason beside it — is
  // met by the field's own visible label, directly above the button.
  await expect(dialog.getByText('Type ERASE to confirm')).toBeVisible()

  // Closing disarms it: a confirmation still armed from last time is a
  // confirmation of nothing.
  await dialog.getByRole('button', { name: 'Keep my data' }).click()
  await expect(dialog).toHaveCount(0)
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(page.locator(DIALOG).getByRole('button', { name: 'Erase all data' })).toBeDisabled()
})

test('§12.15 — the gate is the WORD, deliberately trimmed and case-folded', async ({ page }) => {
  /**
   * A documented divergence from "typed exactly", pinned here so it is a
   * decision rather than a discovery. `lib/record/erase.ts` trims and
   * case-folds on purpose: the gate exists to make the act deliberate, which
   * typing five letters already is, and failing a reader who typed `erase `
   * because of a trailing space they cannot see would refuse the exact act
   * that was asked for. Internal whitespace is NOT collapsed — `E R A S E` is
   * five letters and four spaces, not the word — which the test above asserts.
   *
   * The label prints `ERASE` because §12.14.1's readout register is uppercase,
   * not because the case is the test.
   */
  await seedRecord(page, SEEDED)
  await page.goto('/profile/')
  await page.getByRole('button', { name: 'Reset', exact: true }).click()

  const dialog = page.locator(DIALOG)
  const danger = dialog.getByRole('button', { name: 'Erase all data' })

  for (const accepted of ['erase', '  ERASE  ', 'Erase']) {
    await dialog.getByLabel('Type ERASE to confirm').fill(accepted)
    await expect(danger, `"${accepted}" should arm the danger button`).toBeEnabled()
  }
})

test('§12.15 — a confirmed erase removes both keys and offers a working UNDO', async ({ page }) => {
  const QUARANTINED = '{"schema":99,"data":{}}'
  await seedRecord(page, SEEDED)
  await seedQuarantine(page, QUARANTINED)
  await page.goto('/profile/')

  const before = await settled(page)

  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await page.locator(DIALOG).getByLabel('Type ERASE to confirm').fill('ERASE')
  await page.locator(DIALOG).getByRole('button', { name: 'Erase all data' }).click()
  await expect(page.locator(DIALOG)).toHaveCount(0)

  // Removal, not an empty envelope written over the top: §12.11 item 7 prints
  // these keys, and `NO VALUE STORED UNDER THIS KEY` is the only reading of
  // that panel that agrees with the word "erase". Both keys go — the
  // quarantined copy is the reader's data as much as the live record is.
  await expect
    .poll(() => Promise.all([readRawRecord(page), readRawRecord(page, QUARANTINE_KEY)]))
    .toEqual([null, null])

  // §12.15 — reversible, and the line says for how long. A readout: uppercase
  // mono key, value, no terminal period (§12.14.1).
  const status = page
    .locator('section#data [role="status"]', { hasText: 'Reset.' })
    .first()
  await expect(status).toHaveText(/^Reset\. You can undo it for \d+ seconds?\.$/)

  await page.getByRole('button', { name: 'Undo', exact: true }).click()

  // The pre-erase snapshot came back whole: the live record through the store,
  // and the quarantined copy as the same bytes it was set aside as.
  await expect.poll(() => storedData(page)).toEqual(before)
  await expect.poll(() => readRawRecord(page, QUARANTINE_KEY)).toBe(QUARANTINED)
})

test('§12.4.1 / §12.15 — the erase dialog is the only confirmation on the site', async ({
  page,
}) => {
  await seedRecord(page, SEEDED)
  await page.goto('/profile/')

  // Every other control commits immediately. Crying wolf is how a reader
  // learns to auto-confirm the one dialog that matters, so the export — which
  // is not destructive — has no dialog at all.
  let dialogs = 0
  page.on('dialog', (dialog) => {
    dialogs += 1
    void dialog.dismiss()
  })

  await page.getByRole('button', { name: 'Back up to a file' }).click()
  await expect(page.locator('section#data [role="status"]').first()).toContainText(
    /^Backed up \d{4}-\d{2}-\d{2}$/,
  )
  expect(await page.locator(DIALOG).count()).toBe(0)
  expect(dialogs, 'a native confirm() reached the reader').toBe(0)
})

// ===========================================================================
// §12.15 / §12.12.6 — EXPORT AND IMPORT
// ===========================================================================

interface SaveHooks {
  __hlBlobs: Blob[]
  __hlSaved: Array<{ download: string; href: string }>
}

/**
 * Captures the `Blob` a save path builds, and the `download` name it puts on
 * its own anchor.
 *
 * `showSaveFilePicker` is removed from the prototype as well as the instance —
 * it is a `Window.prototype` method in Chrome, so deleting only the own
 * property leaves `'showSaveFilePicker' in window` true and the File System
 * Access branch would run instead of the `<a download>` one that §12.12.7 makes
 * the primary path, because it is the only one Firefox and Safari have.
 */
async function installSaveProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const hooks = window as unknown as SaveHooks
    hooks.__hlBlobs = []
    hooks.__hlSaved = []

    const create = URL.createObjectURL.bind(URL)
    URL.createObjectURL = (object: Blob | MediaSource): string => {
      if (object instanceof Blob) hooks.__hlBlobs.push(object)
      return create(object)
    }

    const click = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement): void {
      if (this.download !== '') {
        hooks.__hlSaved.push({ download: this.download, href: this.href })
      }
      click.call(this)
    }

    type Removable = Record<string, unknown>
    try {
      delete (Window.prototype as unknown as Removable).showSaveFilePicker
    } catch {
      // Nothing to remove is the Firefox and Safari case, which is the point.
    }
    try {
      delete (window as unknown as Removable).showSaveFilePicker
    } catch {
      // Same.
    }
  })
}

/** The last file a save path handed the browser, as bytes and as a name. */
async function lastSaved(page: Page): Promise<{ text: string; type: string; filename: string }> {
  await page.waitForFunction(() => (window as unknown as SaveHooks).__hlBlobs.length > 0)
  return page.evaluate(async () => {
    const hooks = window as unknown as SaveHooks
    const blob = hooks.__hlBlobs[hooks.__hlBlobs.length - 1]
    const saved = hooks.__hlSaved[hooks.__hlSaved.length - 1]
    return { text: await blob.text(), type: blob.type, filename: saved?.download ?? '' }
  })
}

/**
 * Puts bytes on disk, because an import is a file the reader chooses — not a
 * buffer handed to the input. Left in the OS temp directory the OS cleans: on a
 * failure the file is the evidence, and a teardown that deleted it would take
 * the only copy of the thing under test.
 */
function onDisk(name: string, contents: string): string {
  const file = join(mkdtempSync(join(tmpdir(), 'hl-import-')), name)
  writeFileSync(file, contents, 'utf8')
  return file
}

test('§12.15 — export, erase, import: the record comes back identical', async ({ page }) => {
  await seedRecord(page, SEEDED)
  await installSaveProbe(page)
  await page.goto('/profile/')
  // §16.4, hazard H-A — this used to wait on the storage panel being visible,
  // which a closed row's `<section>` still is: only its body is unrendered. Both
  // rows this test drives are opened instead, and opening the storage row IS the
  // wait — `openRegisterRow` returns once the body is on screen.

  expect(await page.evaluate(() => 'showSaveFilePicker' in window)).toBe(false)

  // ---- EXPORT. Load-bearing durability, not a convenience: Safari deletes
  // script-writable storage after seven days without a visit, and LRU eviction
  // deletes ALL of an origin's data at once.
  await page.getByRole('button', { name: 'Back up to a file' }).click()
  const exported = await lastSaved(page)

  expect(exported.type).toBe('application/json')
  expect(exported.filename).toMatch(/^hl-record-\d{4}-\d{2}-\d{2}\.json$/)
  // GDPR Art. 20 asks for "structured, commonly used and machine-readable",
  // and indented JSON is also readable in a text editor — the cheapest proof
  // that §1 reaches the storage layer.
  expect(exported.text).toContain('\n  "schema": 1')

  // `lastExport` is recorded, so `NO EXPORT ON RECORD` can be a truthful state
  // rather than a permanent one.
  await expect
    .poll(async () => (await storedData(page))?.meta?.lastExport ?? '')
    .toMatch(/^\d{4}-\d{2}-\d{2}T/)

  const before = await settled(page)
  const inFile = payloadOf(exported.text)
  expect(inFile.schema).toBe(1)
  // Not vacuous: the file really does carry the reader's work, all of it.
  expect(readerWork(inFile.data)).toEqual(readerWork(before))

  // ---- ERASE
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await page.locator(DIALOG).getByLabel('Type ERASE to confirm').fill('ERASE')
  await page.locator(DIALOG).getByRole('button', { name: 'Erase all data' }).click()
  await expect.poll(() => readRawRecord(page)).toBeNull()

  // ---- IMPORT the very file that was exported. Untrusted input, fully
  // validated before anything is committed.
  await page
    .getByLabel('Restore from a file')
    .setInputFiles(onDisk(exported.filename, exported.text))

  await expect(page.getByText('Restored from the file.')).toBeVisible()
  // The reset's undo is gone with the reset it would have undone: offering it
  // now would put an older erase back over the restored file.
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toHaveCount(0)
  await expect(page.getByText(/^Reset\./)).toHaveCount(0)

  // The record that comes back is the record the file carried, field for
  // field — which is what makes the export a backup rather than a souvenir.
  await expect.poll(() => storedData(page)).toEqual(inFile.data)
  // …and the reader's own work is identical to what was in this browser before
  // it was erased. `identity`, `sheets` and `prefs` only: `meta.lastExport` and
  // the export's own day in `days` are stamped AFTER the payload is serialised,
  // so a file cannot carry them and a round trip does not restore them.
  expect(readerWork((await storedData(page)) as RecordData)).toEqual(readerWork(before))
})

test('§12.15 — an unreadable file changes nothing, and each state has its own words', async ({
  page,
}) => {
  await seedRecord(page, SEEDED)
  await page.goto('/profile/')
  // §16.4 — the import readouts below are `toBeVisible()` assertions, and the
  // input and its status live in the `data` row (hazard H-A).
  const before = await settled(page)
  const input = page.getByLabel('Restore from a file')
  const panel = page.locator('section#data')

  // A file with no payload in it at all. §12.13's rule that states which do not
  // share a cause must not share copy applies to these three as much as to the
  // empty states, so each is asserted by its own sentence.
  await input.setInputFiles(onDisk('holiday.html', '<!doctype html><p>Not a record.'))
  await expect(page.getByText('That file holds no progress', { exact: false })).toBeVisible()

  // A payload that is not the shape this site writes.
  await input.setInputFiles(onDisk('half.json', '{"unrelated": true}'))
  await expect(page.getByText('That file is not a backup this site wrote', { exact: false })).toBeVisible()

  // §12.1.2 — written by a newer version. Never migrated, never discarded, and
  // this is not theoretical: GitHub Pages serves cached bundles.
  await input.setInputFiles(
    onDisk('future.json', '{"schema":99,"savedAt":"2026-09-01T00:00:00.000Z","data":{}}'),
  )
  await expect(
    page.getByText('That file was written by a newer version of this site', { exact: false }),
  ).toBeVisible()
  await expect(panel).toContainText('Reload the site, then restore it again.')

  // §12.14.1 bans "invalid", "oops" and "sorry": the readout states what is
  // true of the FILE rather than scolding whoever chose it.
  expect((await panel.textContent()) ?? '').not.toMatch(/invalid|oops|sorry|you forgot/i)

  // Three refused files, and the record is exactly as it was.
  expect(await storedData(page)).toEqual(before)
})

test('M39 F2 — the progress page has one tab per track over its cards, and the data line', async ({
  page,
}) => {
  await page.goto('/profile/')
  await expect(page.getByRole('tab')).toHaveCount(2)
  await expect(page.getByRole('tab', { name: /For Engineers/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('[data-panel="engineers"] .bz-cc-level').first()).toBeVisible()
  await expect(page.locator('[data-panel="everyone"]')).toBeHidden()

  // A tab changes the view, not the reader's track: the bar still says For Engineers.
  await page.getByRole('tab', { name: /For Everyone/ }).click()
  await expect(page.locator('[data-panel="everyone"] .bz-cc-level').first()).toBeVisible()
  await expect(page.locator('[data-panel="engineers"]')).toBeHidden()

  const line = page.locator('section#data')
  await expect(line.getByRole('button', { name: 'Back up to a file' })).toBeVisible()
  await expect(line.getByText('Restore from a file')).toBeVisible()
  await expect(line.getByRole('button', { name: 'Reset', exact: true })).toBeVisible()
})

test('M39 F2 — /profile/#data still lands on the data line', async ({ page }) => {
  await page.goto('/profile/#data')
  await expect(page.locator('section#data')).toBeInViewport()
})
