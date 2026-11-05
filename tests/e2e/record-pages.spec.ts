import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type Page, expect, test } from '@playwright/test'
import {
  QUARANTINE_KEY,
  RECORD_KEY,
  type RecordData,
  type RecordSeed,
  type SheetSeed,
  openRegisterRow,
  readRawRecord,
  readRecord,
  registerReading,
  seedRecord,
  slugOf,
} from './record'
import { CATEGORY_PATHS, DRAWN_COUNT, SHEETS, SHEET_COUNT, sheetByModule } from './sheets'
import { QUARANTINE_COPY } from '@/components/record/ProfilePanels'
import { watchPage } from './watch'

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
 * The signal is the footer readout flipping to `data-hydrated="true"`, which is
 * the store's own report that it has read the record and the page is showing it
 * rather than the honest empty form the build shipped (§12.2).
 *
 * It used to wait on §12.1.6's durability query LANDING IN STORAGE instead. That
 * write is gone on purpose: routing the queried grant through the reducer made
 * merely loading a page put an envelope in storage, and the boot script stamps
 * `data-hl-record` from whatever storage holds at load — so from a reader's
 * second page view onward, an envelope written by their first would have had the
 * empty state tell them they had cleared a record they never made (§12.13). With
 * nothing written on load there is no write for a comparison to straddle, and
 * waiting on the DOM is the better signal regardless: it is what the reader can
 * see, not an inference from a side effect.
 */
async function settled(page: Page): Promise<RecordData> {
  await expect(page.locator('.bz-readout[data-hydrated="true"]').first()).toBeAttached()
  return (await storedData(page)) as RecordData
}

/** The reader's own work, which is what a round trip has to preserve. */
function readerWork(data: RecordData): Record<string, unknown> {
  return { identity: data.identity, sheets: data.sheets, prefs: data.prefs }
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

const READER = 'İlker Cevheri'

/**
 * Three sheets signed off across two subsystems, one repository with a commit,
 * one assessed Quick Check, three ticks and three distinct sources. Enough for
 * every count on the profile sheet and in the erase dialog to be a real number
 * rather than a zero, which is the only way the enumeration can be checked.
 */
const SEEDED: RecordSeed = {
  identity: { name: READER, markSeed: 'a1b2c3d4', mark: null, role: null },
  sheets: {
    'fundamentals/llms': {
      signedOff: '2026-07-01T08:00:00.000Z',
      signedRevision: 'ab12cd3',
      reachedEnd: true,
      sources: ['https://platform.openai.com/docs/guides/text-generation'],
    },
    'intermediate/prompt-engineering': {
      signedOff: '2026-07-20T11:30:00.000Z',
      signedRevision: 'bc23de4',
      quiz: {
        answer: 'Retrieval before generation, and the module says why.',
        assessed: 'matched',
        at: '2026-07-20T11:20:00.000Z',
      },
    },
    'intermediate/security': {
      signedOff: '2026-08-11T15:45:00.000Z',
      signedRevision: 'cd34ef5',
      reachedEnd: true,
      dwellSeconds: 900,
      checklist: { '0': true, '1': true, '2': true },
      sources: [
        'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
        'https://platform.openai.com/docs/guides/text-generation',
      ],
      submittals: [
        {
          owner: 'cevheri',
          repo: 'hidden-line',
          url: 'https://github.com/cevheri/hidden-line',
          commit: '9f2c1ab',
          note: 'A prompt-injection harness for the module 13 criteria.',
          at: '2026-08-11T16:00:00.000Z',
        },
      ],
    },
  },
  days: ['2026-07-01', '2026-07-20', '2026-08-11'],
}

/** The `<dd>` beside a `<dt>`, matched on the DOM's own text: `.bz-defs`
 * uppercases in CSS, so the source still reads `Last export`. */
function definition(page: Page, scope: string, term: string): Promise<string | null> {
  return page.evaluate(
    ({ scope, term }) => {
      const root = document.querySelector(scope)
      if (root === null) return null
      for (const dt of root.querySelectorAll('dt')) {
        if ((dt.textContent ?? '').trim().toLowerCase() !== term.toLowerCase()) continue
        return ((dt.nextElementSibling as HTMLElement | null)?.textContent ?? '').trim()
      }
      return null
    },
    { scope, term },
  )
}

// ===========================================================================
// §12.10 — THE CURRICULUM DIAGRAM
// ===========================================================================

/**
 * M13/M14 — `ContinueLine` is on the HOME page now, not on a progress page.
 *
 * It was the dashboard's one line above the graph. The dashboard folded into
 * `/profile/` and the line did not go with it: a reader who wants the next
 * module is on the front door, not on the page about their own record, and home
 * A shows it inside `.bz-home-continue` — the one block on that page keyed off
 * `data-hl-record`, so a reader with no record is not offered a shortcut into a
 * course they have not started.
 *
 * The claim is unchanged and so is the component; only the surface moved.
 */
test('§12.10.6 — CONTINUE names the next ready module that is not completed', async ({ page }) => {
  await seedRecord(page, SEEDED)
  /* M18 — `/profile/` and not `/`. The home page's one-line `ContinueLine` went
     with the rest of the reader-state block; the SAME DERIVATION is the hero at
     the top of this page (`ContinueHero`, and `nextUnsigned` is the function
     both called). So the claim did not move surface so much as lose its second
     drawing — which is why the assertions below read the hero's parts rather
     than the line's sentence. */
  await page.goto('/profile/')

  // Modules 1, 8 and 13 are completed in this record, so the next ready one is
  // 2 — stated by the hero's ordinal, its title, and the target of its control.
  const next = sheetByModule(2)
  const hero = page.locator('.bz-cont')
  await expect(hero).toHaveCount(1)
  await expect(hero.locator('.bz-cont-num')).toHaveText('02')
  await expect(hero.locator('.bz-cont-title')).toHaveText(next.title)
  await expect(hero.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', next.path)
})

test('§12.10.6 — CONTINUE is absent when there is no next module', async ({ page }) => {
  // Every drawn sheet signed off. §12.10.6 makes the line ABSENT rather than
  // congratulatory, and its absence is the whole design: it is cheap, and it is
  // the first thing a returning senior engineer notices.
  const everything: Record<string, SheetSeed> = {}
  for (const sheet of SHEETS) {
    if (!sheet.drawn) continue
    everything[slugOf(sheet)] = {
      signedOff: '2026-08-11T15:45:00.000Z',
      signedRevision: 'cd34ef5',
    }
  }

  await seedRecord(page, { identity: { name: READER }, sheets: everything })
  await page.goto('/profile/')

  // The island has to have taken the record on board before an absence means
  // anything: on the server frame nothing is completed and CONTINUE is there.
  // Control C's own ticks are the witness — one per completed module, all of
  // them channel A — and they are painted from the same record.
  await expect(page.locator('.bz-cmod .bz-cmod-mark:visible')).toHaveCount(
    SHEETS.filter((sheet) => sheet.drawn).length,
  )
  await expect(page.locator('.bz-cont')).toHaveCount(0)
})

// ===========================================================================
// §12.11 — THE PROFILE SHEET
// ===========================================================================

/**
 * §16.4 — the register, from the outside.
 *
 * **What these three tests replace.** One assertion pinned the eleven panel ids
 * as an ordered sequence off `main section.bz-panel h2.bz-panel-title`. §16
 * folded nine of those panels into `<details>` rows and moved two into the
 * drafter block, so that selector now matches a different set of things and the
 * sequence it pinned no longer exists. Order is still part of the
 * specification, so it is still asserted as a sequence — against
 * `REGISTER_ROWS`, the table the page renders from, rather than against a
 * second hand-typed copy of it that could agree with a broken page.
 *
 * **Importing that table is a deliberate exception to this suite's own rule.**
 * `sheets.ts` and `alias.spec.ts`'s `MARK_ORDER` are typed out because a
 * fixture derived from the code under test can only prove the code agrees with
 * itself. The ids here are the opposite case: they are not a claim about what
 * the register SHOULD hold, they are the identifiers roughly twenty assertions
 * in this suite already address by name (`section[aria-labelledby="storage"]`
 * and its four siblings) and that two in-tree links point at. A second copy of
 * that list in a spec file would drift from the page silently, and the
 * consequence of drift is not a red test — it is a dead anchor that no gate
 * catches. What is asserted independently is the SHAPE: ten rows, all closed,
 * each stating a reading, the drafter block the only thing open.
 */

/** §16.4.2's house spelling for "no reading taken yet". */
const NO_READING = '--'

/**
 * The register's rows. Since 2026-11-05 there is one: the author removed every
 * other row from the page as unused, and kept `Export, import, erase` because
 * the record lives only in the browser. The generic register tests below still
 * run over this list, so a row added back must be added here too.
 */
const REGISTER_ROWS = [{ id: 'data', name: 'Export, import, erase' }] as const

/**
 * §16.4.1 — what a summary line is allowed to say: a count, `--`, or a named
 * state. Never nothing, and never a sentence of prose.
 *
 * THIS USED TO ASK ABOUT CASING, and it could, because the readings were
 * pre-cased to match a class that uppercased them: capitals meant a named
 * state and a lowercase sentence meant prose. M16's design language has no
 * uppercase anywhere, so in sentence case "Software Engineer" and a sentence
 * of prose are the same shape and the distinction was gone.
 *
 * So the row states which of the three it is, in `data-reading`, and this asks
 * by that — the project's own lesson about asking by location rather than by
 * what the text says. What is left for the text to prove is the part a kind
 * cannot: a `count` really does carry a digit or the no-reading dash, and no
 * reading of any kind runs to the length of a sentence.
 */
const READING_WORD_CEILING = 6

function isReading(text: string, kind: string): boolean {
  if (text === NO_READING) return true
  if (kind === 'count') return /\d/.test(text)
  if (kind === 'none') return false
  // A named state: short, and not a sentence — no terminal punctuation and no
  // more words than a label can carry.
  if (/[.!?]$/.test(text)) return false
  return text.split(/\s+/).length <= READING_WORD_CEILING
}

interface RowSnapshot {
  /** The summary reading, as the reader sees it. */
  reading: string
  /** Which of §16.4.1's three shapes the row says it is. */
  kind: string
  /**
   * Everything the row's body states, whether the row is open or closed.
   *
   * Text alone is not enough and the reason is `keyboard`: its body is a
   * checkbox and a paragraph, so switching single-character keys off changes
   * what the row reports without changing one character of its text. So the
   * signature carries the body's text AND the state of every control and every
   * accessible name in it — `checked`, `aria-label`, `data-active`,
   * `data-state`. A closed `<details>` keeps its subtree in the DOM and its
   * islands mounted, so all of it can be read without opening anything, which
   * is what lets these tests compare two loads rather than nine gestures.
   */
  body: string
}

function registerSnapshot(page: Page): Promise<Record<string, RowSnapshot>> {
  return page.evaluate(() => {
    const out: Record<string, { reading: string; kind: string; body: string }> = {}
    for (const row of document.querySelectorAll('section.bz-register-row')) {
      const id = row.getAttribute('aria-labelledby') ?? ''
      const reading = row.querySelector('.bz-register-reading') as HTMLElement | null
      const kind = reading?.getAttribute('data-reading') ?? ''
      const body = row.querySelector('.bz-register-body')
      const parts = [(body?.textContent ?? '').replace(/\s+/g, ' ').trim()]
      const stateful = body?.querySelectorAll(
        'input, [aria-label], [data-active], [data-state], [data-hl-selected]',
      )
      for (const node of stateful ?? []) {
        parts.push(
          [
            node.tagName,
            node.getAttribute('type') ?? '',
            node.getAttribute('value') ?? '',
            node.getAttribute('aria-label') ?? '',
            node.getAttribute('data-active') ?? '',
            node.getAttribute('data-state') ?? '',
            node instanceof HTMLInputElement ? String(node.checked) : '',
          ].join(':'),
        )
      }
      out[id] = { reading: (reading?.innerText ?? '').trim(), kind, body: parts.join('\n') }
    }
    return out
  })
}

/**
 * The register once it has stopped changing.
 *
 * Every reading is channel B (§12.2): the prerendered summary prints `--`, the
 * store answers after the hydration commit, and two of the readings —
 * `STORED VALUES` and `STORAGE` — land later still, from an effect and from
 * `navigator.storage`. A snapshot taken on the line after `goto` compares one
 * page mid-hydration with another and reports a difference that is the design
 * working. So the whole register is read repeatedly until two consecutive reads
 * agree, which is a property of the page rather than a list of strings to wait
 * for.
 */
async function settledRegister(page: Page): Promise<Record<string, RowSnapshot>> {
  await expect(page.locator('.bz-readout[data-hydrated="true"]').first()).toBeAttached()

  let previous = ''
  let snapshot: Record<string, RowSnapshot> = {}
  await expect
    .poll(
      async () => {
        snapshot = await registerSnapshot(page)
        const now = JSON.stringify(snapshot)
        const settled = now === previous
        previous = now
        return settled
      },
      { message: 'the record never stopped changing' },
    )
    .toBe(true)

  return snapshot
}

test('§16.4 — the page draws one row, Export, import, erase, and it arrives closed', async ({
  page,
}) => {
  const problems = watchPage(page)
  await seedRecord(page, SEEDED)
  await page.goto('/profile/')

  // The level circles are first, and nothing above them asks for a name.
  await expect(page.locator('h2#progress-levels')).toBeVisible()
  await expect(page.getByRole('textbox', { name: /Name or initials/ })).toHaveCount(0)
  await expect(page.locator('label[data-hl-mark]')).toHaveCount(0)

  const rows = page.locator('main section.bz-register-row')
  await expect(rows).toHaveCount(REGISTER_ROWS.length)
  const state = await rows.evaluateAll((nodes) =>
    nodes.map((node) => ({
      row: node.getAttribute('aria-labelledby'),
      heading: node.querySelector(':scope > details > summary > h3')?.id ?? null,
      open: node.querySelector(':scope > details')?.hasAttribute('open') ?? null,
      group: node.closest('[data-bz-register-group]')?.getAttribute('data-bz-register-group') ?? null,
    })),
  )
  const expected = REGISTER_ROWS.map((row) => row.id)
  expect(state.map((row) => row.row)).toEqual(expected)
  expect(state.map((row) => row.heading)).toEqual(expected)
  expect(state.map((row) => row.group)).toEqual(['group-data'])
  // §16.4.3 — which rows were open is not remembered, so every load is closed.
  expect(state.filter((row) => row.open !== false).map((row) => row.row)).toEqual([])

  // §12.1.2's quarantine note renders nothing when there is nothing to report.
  for (const { readout } of Object.values(QUARANTINE_COPY)) {
    await expect(page.getByText(readout, { exact: false })).toHaveCount(0)
  }

  expect(problems.consoleErrors).toEqual([])
  expect(problems.failedRequests).toEqual([])
})

test('§16.4.1 — every closed row states a reading, and not one of them is blank', async ({
  page,
}) => {
  await seedRecord(page, SEEDED)
  await page.goto('/profile/')

  const snapshot = await settledRegister(page)

  // A property over whatever the page rendered, not a list of expected strings:
  // the point of §16.4.1 is that no row may be foldable without reporting
  // something, and a list would have to be rewritten by whoever breaks it.
  expect(Object.keys(snapshot).sort()).toEqual(REGISTER_ROWS.map((row) => row.id).sort())
  for (const { id } of REGISTER_ROWS) {
    const { reading, kind } = snapshot[id]
    expect(reading, `${id} states nothing while closed`).not.toBe('')
    expect(kind, `${id} does not say what kind of reading it is`).toMatch(/^(count|none|state)$/)
    expect(
      isReading(reading, kind),
      `${id}'s reading is prose, not a ${kind}: "${reading}"`,
    ).toBe(true)
  }
})

// ---------------------------------------------------------------------------
// §16.4.1 — the property the redesign is paid for with
// ---------------------------------------------------------------------------

/** Today, in UTC, which is the basis `store.ts` stamps `days` in (§12.1.4). */
const TODAY = new Date().toISOString().slice(0, 10)

function daysBack(count: number): string {
  return new Date(Date.parse(`${TODAY}T00:00:00.000Z`) - count * 86_400_000)
    .toISOString()
    .slice(0, 10)
}

/** A record that has recorded nothing at all beyond a name. */
const NOTHING_RECORDED: RecordSeed = { identity: { name: READER }, days: [] }

/**
 * The opposite record, and it is maximal on purpose: every drawn sheet signed
 * off, a submittal filed, a role stated, three of the last fourteen days
 * recorded, and single-character keys switched off. Every row that reports
 * reader state reports something different here than it does above, which is
 * what makes the comparison below able to fail.
 *
 * Every drawn sheet rather than three, because §7.4's subsystem stamps are only
 * earned when a whole category is signed off: with three sheets signed the
 * stamps row reads `0 OF 9 EARNED` in both records while its body's live counts
 * move, and the gate below would then have nothing to say about the one row
 * whose body says most.
 */
const EVERYTHING_RECORDED: RecordSeed = (() => {
  const sheets: Record<string, SheetSeed> = {}
  for (const sheet of SHEETS) {
    if (!sheet.drawn) continue
    sheets[slugOf(sheet)] = {
      signedOff: '2026-08-11T15:45:00.000Z',
      signedRevision: 'cd34ef5',
      reachedEnd: true,
      sources: ['https://owasp.org/www-project-top-10-for-large-language-model-applications/'],
    }
  }
  sheets['intermediate/security'] = {
    ...sheets['intermediate/security'],
    submittals: [
      {
        owner: 'cevheri',
        repo: 'hidden-line',
        url: 'https://github.com/cevheri/hidden-line',
        commit: '9f2c1ab',
        note: 'A prompt-injection harness for the module 13 criteria.',
        at: '2026-08-11T16:00:00.000Z',
      },
    ],
  }
  return {
    identity: { name: READER, markSeed: 'a1b2c3d4', mark: 'datum', role: 'software-engineer' },
    sheets,
    days: [daysBack(2), daysBack(1), TODAY],
    prefs: { charKeys: false },
    meta: {
      lastExport: null,
      persisted: null,
      // §17.7 — a receipt in the rich seed, so the row's notation is pinned in
      // BOTH states. Without it the row reads NO CLAIM ON RECORD at both seeds
      // and a frozen reading would pass the table — the exact vacuity this
      // gate exists to close.
      lastClaim: {
        at: '2026-08-11T15:44:00.000Z',
        summary: {
          outcome: 'merged',
          signed: { here: 2, account: 3, shared: 1, merged: 4 },
          submittals: { here: 1, account: 0, shared: 0, merged: 1 },
          droppedSignatures: [],
          droppedSubmittals: [],
          identity: {
            name: 'account',
            markSeed: 'account',
            role: 'local',
            markChanged: false,
            nameChanged: true,
            roleChanged: false,
          },
        },
      },
    },
  }
})()

test('§16.4.1 — a fold removes prose and never a fact: the reading is the same open as closed', async ({
  page,
}) => {
  await seedRecord(page, EVERYTHING_RECORDED)
  await page.goto('/profile/')

  const closed = await settledRegister(page)

  // Every row, opened one at a time, and the claim is per row: the reading it
  // printed while folded is the reading it prints unfolded. This is §16.4.1
  // stated as an equality rather than as an expectation about any particular
  // number — the fold is a visual operation and a fact may not depend on it.
  for (const { id } of REGISTER_ROWS) {
    await openRegisterRow(page, id)
    const reading = registerReading(page, id)
    // Still on screen, and still the same words: a row that dropped its
    // reading on opening would have made the closed line a teaser.
    await expect(reading, `${id} hides its reading when opened`).toBeVisible()
    expect(
      (await reading.innerText()).trim(),
      `${id}'s reading changed when the row was opened`,
    ).toBe(closed[id].reading)
  }

  // And opening ten rows changed no reading anywhere: the readings after the
  // ten gestures are the readings from before them, as a whole register.
  const opened = await registerSnapshot(page)
  expect(
    Object.fromEntries(Object.entries(opened).map(([id, row]) => [id, row.reading])),
    'a reading moved while rows were being opened',
  ).toEqual(Object.fromEntries(Object.entries(closed).map(([id, row]) => [id, row.reading])))
})

test('§16.4.1 / §16.4.2 — a summary reading comes from the body it summarises, and it counts the record', async ({
  page,
  browser,
}) => {
  /**
   * The gate hazard H-A2 was written for, and it is the one nothing in this
   * suite tested: **a closed row's summary reports the fact its body reports,
   * out of the same record.**
   *
   * It is asserted by moving the record, not by comparing two strings. A
   * summary reading and its body print the same fact in different notations —
   * `3 OF 34 SIGNED OFF` beside a strip reading `03/34`, `1 KEYS · 1,412 BYTES`
   * beside the bytes themselves — so a containment test would have had to know
   * every row's notation, which is the list of expected strings §16.4.2 exists
   * to avoid. What both notations DO share is their source. So the register is
   * read twice, over two records at opposite extremes, and two implications are
   * asserted over every row the page rendered:
   *
   *  1. **A reading that moved must have a body that moved.** A summary may not
   *     report a fact its own body does not state; this is what fails if a
   *     reading is computed from a second selector of its own (§16.4.2's
   *     "no new derivation").
   *  2. **A reading that counts must count the reader's record.** Any row whose
   *     reading carries a digit in either record must print a different reading
   *     in the two, which is what fails if a count is hard-coded, frozen at the
   *     prerendered `--`, or read from the wrong record.
   *
   * The converse of 1 is deliberately NOT asserted. A body may state more than
   * its summary — the stamp shelf prints a live count against every locked
   * stamp while the summary reports only how many are earned — and §16.4.1 asks
   * for THE reading the panel exists to report, not for all of them.
   *
   * Two contexts rather than one page reloaded, because `seedRecord` writes only
   * when the key is absent (which is what makes it a seed) and both records have
   * to arrive before channel A runs.
   */
  await seedRecord(page, NOTHING_RECORDED)
  await page.goto('/profile/')
  const thin = await settledRegister(page)

  const second = await browser.newContext()
  const rich = await (async () => {
    const other = await second.newPage()
    try {
      await seedRecord(other, EVERYTHING_RECORDED)
      await other.goto('/profile/')
      return await settledRegister(other)
    } finally {
      await second.close()
    }
  })()

  expect(Object.keys(rich).sort()).toEqual(Object.keys(thin).sort())

  // Not vacuous: if both loads had rendered the prerendered `--` everywhere,
  // every row below would pass with nothing to say.
  expect(
    Object.values(thin).filter((row) => row.reading === NO_READING).length,
    'the thin register never left the prerendered dash',
  ).toBeLessThan(REGISTER_ROWS.length)

  for (const { id } of REGISTER_ROWS) {
    const readingMoved = thin[id].reading !== rich[id].reading
    const bodyMoved = thin[id].body !== rich[id].body

    if (readingMoved) {
      expect(
        bodyMoved,
        `${id}: the summary reading changed from "${thin[id].reading}" to `
          + `"${rich[id].reading}" while nothing in its own body changed, so the `
          + 'summary is reading something the body does not state (§16.4.2)',
      ).toBe(true)
    }

    if (/\d/.test(thin[id].reading) || /\d/.test(rich[id].reading)) {
      expect(
        readingMoved,
        `${id}: a counted reading printed "${rich[id].reading}" for both an empty `
          + 'record and a fully completed one, so it is not counting the record',
      ).toBe(true)
    }
  }
})

/**
 * §16.4.1 — the notation each row reads in, pinned per row at two fixed seeds.
 *
 * **This gate exists because the two implications above were MEASURED to be
 * blind to the one defect that would make folding dishonest.** A reviewer
 * swapped `uptime`'s reading with `stamps`', hard-coded `StorageReading` to
 * `PERSISTENT · QUERIED` with its hydration gate dropped, made `RoleReading`
 * return `NO ROLE ON RECORD` unconditionally and inverted `CharKeysReading` —
 * four readings lying at once, one of them asserting persistence the browser was
 * never asked about — and the whole suite stayed green: 2782 unit tests, 365 e2e
 * tests, byte-identical to the clean baseline. Reproduced here before this test
 * was written: with those four mutations in the tree, `record-pages.spec.ts` ran
 * 25/25 green.
 *
 * **Why the implications cannot see it.** They are one-way. "A reading that
 * moved must have a body that moved" is satisfied by a swap — both readings move
 * and both bodies move — and it says nothing at all about a reading with no
 * digits in it, which is four of the ten rows. `isReading` only asks for a
 * count, a dash or an upper-case phrase, so `PERSISTENT · QUERIED` is a
 * well-formed reading of a fact nobody looked up.
 *
 * **What is asserted, and what is deliberately not.** For each row, at each of
 * the two seeds, the expected reading, verbatim. The table pins the row's
 * NOTATION to its SUBJECT — `OF LAST 14 DAYS` is the uptime row's phrase and
 * nowhere else's — which is what a swap breaks and what a hard-coded value
 * breaks. It does not claim to know any row's notation in general: it is ten
 * literals at two seeds this file authored, and a reading may change its wording
 * freely as long as whoever changes it says so here.
 *
 * Digits are written out only where this suite has its own authority for the
 * number: `sheets.ts`'s hand-typed drawing set gives the readout's numerator and
 * denominator, and the seeds below state their own days and submittals. Where the
 * number is a measurement of the corpus's internals or of the browser — how many
 * stamps the shelf holds, how many bytes a record occupies — `#` stands for one
 * group-separated number, because a literal there would be this file guessing at
 * a fact it cannot check. Those are exactly the rows the "a counted reading must
 * count the record" implication above already covers.
 *
 * **A new row cannot skip this table.** `satisfies Record<RegisterRowId, …>`
 * makes a row added to `REGISTER_ROWS` without an entry here a `tsc` failure,
 * and `npm run typecheck` is the first gate in CI; the key-set assertion in the
 * test repeats it at runtime for anyone reading a red test rather than a red
 * compile.
 */
type RowId = (typeof REGISTER_ROWS)[number]['id']

const EXPECTED_READINGS = {
  data: { thin: 'YOUR COPY OF THE RECORD', rich: 'YOUR COPY OF THE RECORD' },
} as const satisfies Record<RowId, { thin: string | RegExp; rich: string | RegExp }>

/**
 * The table's entries as anchored patterns: a literal becomes an equality test,
 * `#` becomes one group-separated number. Escaped rather than interpolated, so
 * the `·` and the `-` in `BEST-EFFORT` are characters and not syntax.
 */
function readingPattern(expected: string | RegExp): RegExp {
  if (expected instanceof RegExp) return expected
  return new RegExp(
    `^${expected
      .split('#')
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('\\d{1,3}(?:,\\d{3})*')}$`,
  )
}

test('§16.4.1 — each row reads in its own notation, and the notation is pinned to the subject', async ({
  page,
  browser,
}) => {
  // Two contexts for the same reason the test above uses two: `seedRecord` only
  // writes when the key is absent, and both records have to be there before
  // channel A runs.
  await seedRecord(page, NOTHING_RECORDED)
  await page.goto('/profile/')
  const thin = await settledRegister(page)

  const second = await browser.newContext()
  const rich = await (async () => {
    const other = await second.newPage()
    try {
      await seedRecord(other, EVERYTHING_RECORDED)
      await other.goto('/profile/')
      return await settledRegister(other)
    } finally {
      await second.close()
    }
  })()

  // The compile-time guarantee, restated where a failing run can print it.
  expect(
    Object.keys(EXPECTED_READINGS).sort(),
    'a register row has no expected reading in EXPECTED_READINGS',
  ).toEqual(REGISTER_ROWS.map((row) => row.id).sort())

  for (const { id } of REGISTER_ROWS) {
    const expected = EXPECTED_READINGS[id]
    expect(
      thin[id].reading,
      `${id}: an empty record reads "${thin[id].reading}", not "${String(expected.thin)}"`,
    ).toMatch(readingPattern(expected.thin))
    expect(
      rich[id].reading,
      `${id}: a full record reads "${rich[id].reading}", not "${String(expected.rich)}"`,
    ).toMatch(readingPattern(expected.rich))
  }
})

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
  // §16.4 — `ERASE ALL LOCAL DATA` is inside the `data` row, and a closed row
  // has no rendered box for `click()` to reach (hazard H-A).
  await openRegisterRow(page, 'data')

  await page.getByRole('button', { name: 'ERASE ALL LOCAL DATA' }).click()
  const dialog = page.locator(DIALOG)
  await expect(dialog).toBeVisible()

  // "Are you sure?" asks a reader to confirm a decision the dialog has not
  // described. This names the scope, which is a question somebody can answer.
  const title = (await dialog.getByRole('heading').first().textContent()) ?? ''
  expect(title).toBe('Erase all progress in this browser?')
  expect(title.toLowerCase()).not.toContain('are you sure')

  // The actual counts, from the record: 3 sheet states, 1 name, 1 submittal,
  // 1 self-check, 2 sources opened. Zeros are omitted rather than padding the
  // list a reader is meant to read.
  const enumerated = await dialog
    .locator('.bz-dialog-tally li')
    .evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').trim()))
  expect(enumerated).toEqual([
    '3 module states',
    '1 name',
    '1 submittal',
    '1 self-check',
    '2 sources opened',
  ])

  // §12.15 — the safe path is one click from the destructive one, not a route
  // away from it.
  await expect(dialog.getByRole('button', { name: 'EXPORT YOUR RECORD' })).toBeVisible()

  // §12.14.1 — the buttons state OUTCOMES, and the decline states the SAFE
  // outcome with no shame and no loss framing. Never Yes/No.
  const buttons = await dialog
    .locator('.bz-actions button')
    .evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').trim()))
  expect(buttons).toEqual(['Erase all data', 'Keep my data', 'EXPORT YOUR RECORD'])
  for (const label of buttons) {
    expect(label).not.toMatch(/^(yes|no)\b/i)
  }
  expect((await dialog.textContent()) ?? '').not.toMatch(/don.t care|lose everything/i)
})

test('§12.15 — the danger button is gated on the typed word', async ({ page }) => {
  await seedRecord(page, SEEDED)
  await page.goto('/profile/')
  // §16.4 — `ERASE ALL LOCAL DATA` is inside the `data` row, and a closed row
  // has no rendered box for `click()` to reach (hazard H-A).
  await openRegisterRow(page, 'data')
  await page.getByRole('button', { name: 'ERASE ALL LOCAL DATA' }).click()

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
  await page.getByRole('button', { name: 'ERASE ALL LOCAL DATA' }).click()
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
  // §16.4 — `ERASE ALL LOCAL DATA` is inside the `data` row, and a closed row
  // has no rendered box for `click()` to reach (hazard H-A).
  await openRegisterRow(page, 'data')
  await page.getByRole('button', { name: 'ERASE ALL LOCAL DATA' }).click()

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
  // §16.4 — `ERASE ALL LOCAL DATA` is inside the `data` row, and a closed row
  // has no rendered box for `click()` to reach (hazard H-A).
  await openRegisterRow(page, 'data')

  const before = await settled(page)

  await page.getByRole('button', { name: 'ERASE ALL LOCAL DATA' }).click()
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
    .locator('section[aria-labelledby="data"] [role="status"]', { hasText: 'ERASED' })
    .locator('p')
    .first()
  await expect(status).toHaveText(/^ERASED · UNDO AVAILABLE FOR \d+ S$/)

  await page.getByRole('button', { name: 'UNDO' }).click()

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
  // §16.4 — `EXPORT YOUR RECORD` is inside the `data` row, and a closed row has
  // no rendered box for `click()` to reach (hazard H-A).
  await openRegisterRow(page, 'data')

  // Every other control commits immediately. Crying wolf is how a reader
  // learns to auto-confirm the one dialog that matters, so the export — which
  // is not destructive — has no dialog at all.
  let dialogs = 0
  page.on('dialog', (dialog) => {
    dialogs += 1
    void dialog.dismiss()
  })

  await page.getByRole('button', { name: 'EXPORT YOUR RECORD' }).first().click()
  await expect(page.locator('section[aria-labelledby="data"] [role="status"]').first()).toContainText(
    /^EXPORTED \d{4}-\d{2}-\d{2}$/,
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
  await openRegisterRow(page, 'data')

  expect(await page.evaluate(() => 'showSaveFilePicker' in window)).toBe(false)

  // ---- EXPORT. Load-bearing durability, not a convenience: Safari deletes
  // script-writable storage after seven days without a visit, and LRU eviction
  // deletes ALL of an origin's data at once.
  await page.getByRole('button', { name: 'EXPORT YOUR RECORD' }).first().click()
  const exported = await lastSaved(page)

  expect(exported.type).toBe('application/json')
  expect(exported.filename).toMatch(/^hl-record-\d{4}-\d{2}-\d{2}\.json$/)
  // GDPR Art. 20 asks for "structured, commonly used and machine-readable",
  // and indented JSON is also readable in a text editor — the cheapest proof
  // that §1 reaches the storage layer.
  expect(exported.text).toContain('\n  "schema": 1')
  expect(exported.text).toContain(READER)

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
  await page.getByRole('button', { name: 'ERASE ALL LOCAL DATA' }).click()
  await page.locator(DIALOG).getByLabel('Type ERASE to confirm').fill('ERASE')
  await page.locator(DIALOG).getByRole('button', { name: 'Erase all data' }).click()
  await expect.poll(() => readRawRecord(page)).toBeNull()

  // ---- IMPORT the very file that was exported. Untrusted input, fully
  // validated before anything is committed.
  await page
    .getByLabel('Import a record from a file')
    .setInputFiles(onDisk(exported.filename, exported.text))

  await expect(page.getByText('RECORD IMPORTED · SCHEMA 1')).toBeVisible()
  // A raw `.json` export carries no digest at all, and that is stated as a
  // fact about the file rather than as an accusation about the reader.
  await expect(page.getByText('NO CONTENT DIGEST IN THIS FILE')).toBeVisible()

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
  await openRegisterRow(page, 'data')
  const before = await settled(page)
  const input = page.getByLabel('Import a record from a file')
  const panel = page.locator('section[aria-labelledby="data"]')

  // A file with no payload in it at all. §12.13's rule that states which do not
  // share a cause must not share copy applies to these three as much as to the
  // empty states, so each is asserted by its own sentence.
  await input.setInputFiles(onDisk('holiday.html', '<!doctype html><p>Not a record.'))
  await expect(page.getByText('NO RECORD IN THIS FILE')).toBeVisible()

  // A payload that is not the shape this site writes.
  await input.setInputFiles(onDisk('half.json', '{"unrelated": true}'))
  await expect(page.getByText('FILE IS NOT THE SHAPE THIS SITE WRITES — NOT READ')).toBeVisible()

  // §12.1.2 — written by a newer version. Never migrated, never discarded, and
  // this is not theoretical: GitHub Pages serves cached bundles.
  await input.setInputFiles(
    onDisk('future.json', '{"schema":99,"savedAt":"2026-09-01T00:00:00.000Z","data":{}}'),
  )
  await expect(
    page.getByText('FILE WRITTEN BY A NEWER VERSION OF THIS SITE — NOT READ'),
  ).toBeVisible()
  await expect(panel).toContainText('Nothing was changed, and the file on disk is untouched.')

  // §12.14.1 bans "invalid", "oops" and "sorry": the readout states what is
  // true of the FILE rather than scolding whoever chose it.
  expect((await panel.textContent()) ?? '').not.toMatch(/invalid|oops|sorry|you forgot/i)

  // Three refused files, and the record is exactly as it was.
  expect(await storedData(page)).toEqual(before)
})

/**
 * §17.6 — the affordance labelled DETAILS lands on the fold, not on its lid.
 *
 * `#claim` is on the `<h2>` inside a closed `<summary>` (`Register.tsx` keeps it
 * at that level so folding does not flatten the outline), so before
 * `FoldFragment` the deep link scrolled the summary into view and delivered the
 * one line the reader already had. The second half is the half that matters: a
 * plain visit still finds every row closed, which is what stops the island from
 * being a switch that opens the whole register.
 */
test('§17.6 — the #data fragment opens the data row, and a plain visit opens none', async ({ page }) => {
  await seedRecord(page, EVERYTHING_RECORDED)

  // The export controls' row is the other fragment two surfaces point at.
  await page.goto('/profile/#data')
  await settledRegister(page)
  await expect(
    page.locator('section.bz-register-row[aria-labelledby="data"] details.bz-register-fold'),
  ).toHaveAttribute('open', '')

  // And a plain visit opens nothing. Asserted over every row, because an island
  // that opened them all would pass the two assertions above.
  await page.goto('/profile/')
  await settledRegister(page)
  const openCount = await page
    .locator('details.bz-register-fold[open]')
    .count()
  expect(openCount, 'a plain visit to the register opened a row').toBe(0)
})
