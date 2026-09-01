import { type Locator, type Page, expect } from '@playwright/test'
import { SHEETS, type Sheet } from './sheets'

/**
 * §12.1 THE RECORD, from the outside — seeding it, reading it back, and
 * catching §12.2 channel A in the frame before the first paint.
 *
 * Every spec that touches reader state needs the same three things, and all
 * three are the kind of thing that goes subtly wrong once and then goes wrong
 * everywhere: a seed that arrives too late to be read by a blocking script in
 * `<head>`, a read taken before §12.1.4's 500 ms trailing flush has run, and a
 * class-list reading taken after React has already had a turn. So they live
 * here, once.
 *
 * ## The shape is typed out, not imported
 *
 * `sheets.ts` states this rule for the drawing set and it holds just as hard
 * for the envelope: a suite that builds its fixtures with `lib/record/schema`'s
 * own `emptySheetRecord()` can only ever prove the store agrees with itself.
 * Rename a field, and both sides move together and nothing goes red. Here the
 * key, the envelope, the slug-keyed map and every field name are written out,
 * so a schema change that the migration ladder (§12.1.2) was supposed to handle
 * fails a browser test and somebody has to look at it.
 *
 * It is also a hard requirement rather than a preference: `lib/record/` is
 * reachable from a client bundle and `tests/e2e/` is not compiled by the app,
 * but the same import would let a `node:fs`-bound module in on the day someone
 * re-exports one from `schema.ts` (§12.2's import direction).
 *
 * ## What is deliberately NOT here
 *
 * Nothing in this file asserts. It seeds, it reads and it waits; the claims
 * belong in the specs, where the section they enforce is named beside them.
 */

// ---------------------------------------------------------------------------
// The storage contract (§12.1.1, §12.1.2, §12.1.3)
// ---------------------------------------------------------------------------

/**
 * §12.1.1 — one key, one owning module. The `hl-` prefix is the only isolation
 * available on a shared `github.io` origin, so a test that invents its own key
 * name proves nothing about the site.
 */
export const RECORD_KEY = 'hl-record'

/** §12.1.2 — where an unreadable payload is copied, never discarded. */
export const QUARANTINE_KEY = 'hl-record-quarantine'

/** §2.5's key, which this suite has to keep out of the record's way. */
export const THEME_KEY = 'hl-theme'

/** §12.1.2 — inside the envelope, never in the key. */
export const SCHEMA_VERSION = 1

export interface QuizRecord {
  answer: string
  assessed: 'matched' | 'missed' | null
  at: string
}

export interface Submittal {
  owner: string
  repo: string
  /** §12.9.2 — the RECONSTRUCTED `https://github.com/{owner}/{repo}`. */
  url: string
  commit: string | null
  note: string
  at: string
}

export interface SheetRecord {
  signedOff: string | null
  signedRevision: string | null
  reachedEnd: boolean
  dwellSeconds: number
  quiz: QuizRecord | null
  checklist: { [index: string]: boolean }
  sources: string[]
  submittals: Submittal[]
}

export interface RecordData {
  identity: {
    name: string | null
    markSeed: string | null
    mark: string | null
    /** §13.3 — `null` is the whole of "has not said", and it is the default. */
    role: string | null
  }
  /** §12.1.3 — keyed by SLUG (`intermediate/security`), never by number. */
  sheets: { [slug: string]: SheetRecord }
  days: string[]
  /**
   * §16.3 — `aliasNamedFor` is stated here for the same reason §13.3's
   * `identity.role` is: a nullable addition is a WIDENING, not a migration
   * (`migrate.ts`'s header), so `coerceRecordData` defaults it and every
   * record the app HOLDS carries the key. A seed that omitted it would put a
   * shape in storage that the store never writes, and the three §12.12.6 /
   * §12.15 round trips compare raw storage against a record that went through
   * the store — they read as data loss when the only difference is a key the
   * seed forgot. Measured: omitting it made those three specs red while the
   * app was correct.
   */
  prefs: { charKeys: boolean; aliasNamedFor: string | null }
  meta: { lastExport: string | null; persisted: boolean | null }
}

export interface Envelope {
  schema: number
  savedAt: string
  data: RecordData
}

/** A seed only ever states the fields it cares about; the rest default. */
export type SheetSeed = Partial<SheetRecord>
export interface RecordSeed {
  identity?: Partial<RecordData['identity']>
  sheets?: { [slug: string]: SheetSeed }
  days?: string[]
  prefs?: Partial<RecordData['prefs']>
  meta?: Partial<RecordData['meta']>
}

/** An instant to seed with. Fixed, so a seeded record reads the same in July. */
export const SEED_AT = '2026-08-14T09:30:00.000Z'
/** The date `SIGNED OFF <date>` prints for `SEED_AT`. */
export const SEED_DAY = SEED_AT.slice(0, 10)

/** §12.1.3 — the empty sheet record, every field present and nothing observed. */
export function sheetRecord(seed: SheetSeed = {}): SheetRecord {
  return {
    signedOff: null,
    signedRevision: null,
    reachedEnd: false,
    dwellSeconds: 0,
    quiz: null,
    checklist: {},
    sources: [],
    submittals: [],
    ...seed,
  }
}

/** A sheet record the reader has asserted. `revision` is §12.4.3's hash. */
export function signedSheet(
  revision: string | null = null,
  seed: SheetSeed = {},
): SheetRecord {
  return sheetRecord({ signedOff: SEED_AT, signedRevision: revision, ...seed })
}

/** The whole record, with every field of §12.1.3's shape present. */
export function recordData(seed: RecordSeed = {}): RecordData {
  const sheets: RecordData['sheets'] = {}
  for (const [slug, sheet] of Object.entries(seed.sheets ?? {})) {
    sheets[slug] = sheetRecord(sheet)
  }
  return {
    identity: { name: null, markSeed: null, mark: null, role: null, ...seed.identity },
    sheets,
    days: seed.days ?? [SEED_DAY],
    prefs: { charKeys: true, aliasNamedFor: null, ...seed.prefs },
    meta: { lastExport: null, persisted: null, ...seed.meta },
  }
}

export function envelope(seed: RecordSeed = {}, savedAt: string = SEED_AT): Envelope {
  return { schema: SCHEMA_VERSION, savedAt, data: recordData(seed) }
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

/**
 * Writes a record into the page's `localStorage` **before any of the page's own
 * scripts run**, on every navigation this page makes.
 *
 * `addInitScript` is the only mechanism that can do this. §12.2's channel A is
 * a *blocking script in `<head>`*, so a record written by `page.evaluate` after
 * `goto` has already missed the only frame the class list is interesting in —
 * and a `goto` followed by a `reload` proves the reload, not the load.
 *
 * **It writes only when the key is absent**, which is what makes the seed a
 * seed rather than a floor. The record survives `page.reload()` inside one test
 * (§12.14.2's "real `localStorage` round-trips"), so a seed that overwrote on
 * every navigation would silently repair the very state a survival test is
 * trying to observe — and would resurrect an erased record on the reload after
 * an erase. A test that wants a mid-flight overwrite calls `writeRecord`.
 *
 * The whole body is inside `try/catch` for the same reason the boot script is:
 * reading the `localStorage` property itself throws in some privacy modes
 * (§12.1.4), and a seed that throws would fail the test with a stack trace from
 * the harness rather than with the assertion that actually matters.
 */
export async function seedRecord(
  page: Page,
  seed: RecordSeed = {},
  savedAt: string = SEED_AT,
): Promise<void> {
  await page.addInitScript(
    ({ key, payload }: { key: string; payload: string }) => {
      try {
        if (localStorage.getItem(key) !== null) return
        localStorage.setItem(key, payload)
      } catch {
        // The specs assert on what the page did with the record; a browser that
        // will not store one is §12.13 class 4 and has its own tests.
      }
    },
    { key: RECORD_KEY, payload: JSON.stringify(envelope(seed, savedAt)) },
  )
}

/**
 * Seeds a raw string, for the payloads §12.1.2 has to survive rather than read:
 * a newer `schema`, a truncated JSON body, a `data` that is not an object.
 */
export async function seedRawRecord(page: Page, payload: string): Promise<void> {
  await page.addInitScript(
    ({ key, raw }: { key: string; raw: string }) => {
      try {
        if (localStorage.getItem(key) !== null) return
        localStorage.setItem(key, raw)
      } catch {
        /* see seedRecord */
      }
    },
    { key: RECORD_KEY, raw: payload },
  )
}

/**
 * §2.5's key, pinned so a record spec is never at the mercy of the machine's
 * `prefers-color-scheme`. `theme.spec.ts` owns the theme's behaviour; this only
 * keeps it still while §12.16's `.` is under test.
 */
export async function seedTheme(page: Page, theme: 'dark' | 'light'): Promise<void> {
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      try {
        if (localStorage.getItem(key) !== null) return
        localStorage.setItem(key, value)
      } catch {
        /* see seedRecord */
      }
    },
    { key: THEME_KEY, value: theme },
  )
}

/** An overwrite mid-test — a second tab's write, or a hand-edited record. */
export async function writeRecord(page: Page, seed: RecordSeed = {}): Promise<void> {
  await page.evaluate(
    ({ key, payload }: { key: string; payload: string }) => {
      localStorage.setItem(key, payload)
    },
    { key: RECORD_KEY, payload: JSON.stringify(envelope(seed)) },
  )
}

/** Deliberate, not incidental: the contexts are already fresh per test. */
export async function clearRecord(page: Page): Promise<void> {
  await page.evaluate((key) => {
    try {
      localStorage.removeItem(key)
    } catch {
      /* see seedRecord */
    }
  }, RECORD_KEY)
}

// ---------------------------------------------------------------------------
// Reading it back
// ---------------------------------------------------------------------------

/** What storage holds right now, parsed. `null` where nothing is stored. */
export async function readRecord(page: Page): Promise<Envelope | null> {
  const raw = await page.evaluate((key) => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }, RECORD_KEY)
  if (raw === null) return null
  return JSON.parse(raw) as Envelope
}

/** The raw string, for the tests that care that it is *not* valid JSON. */
export function readRawRecord(page: Page, key: string = RECORD_KEY): Promise<string | null> {
  return page.evaluate((name) => {
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  }, key)
}

export function sheetOf(envelope: Envelope | null, slug: string): SheetRecord | null {
  return envelope?.data.sheets[slug] ?? null
}

/**
 * The record, once it says what the caller is waiting for.
 *
 * **Every write is behind §12.1.4's 500 ms trailing throttle**, so a read taken
 * on the line after a click is a coin toss — and one that comes up heads on a
 * fast machine and tails in CI. `expect.poll` is the harness's own answer to
 * that and it reports the last value it saw when it gives up, which is the
 * difference between "the flush is slow" and "the reducer did nothing".
 */
export async function waitForRecord(
  page: Page,
  accept: (envelope: Envelope | null) => boolean,
  what = 'the record',
): Promise<Envelope> {
  let last: Envelope | null = null
  await expect
    .poll(
      async () => {
        last = await readRecord(page)
        return accept(last)
      },
      { message: `waiting for ${what} to reach localStorage['${RECORD_KEY}']` },
    )
    .toBe(true)
  return last as unknown as Envelope
}

/** The same wait, expressed over one sheet's record. */
export async function waitForSheet(
  page: Page,
  slug: string,
  accept: (sheet: SheetRecord | null) => boolean,
  what = `${slug}`,
): Promise<SheetRecord> {
  const stored = await waitForRecord(page, (env) => accept(sheetOf(env, slug)), what)
  return sheetOf(stored, slug) as SheetRecord
}

// ---------------------------------------------------------------------------
// §12.2 channel A — the frame before the first paint
// ---------------------------------------------------------------------------

/** What `<html>` carried inside the first `requestAnimationFrame`. */
export interface FirstPaint {
  className: string
  /** `data-hl-record="1"` — a readable record exists. */
  record: string | null
  /** `data-hl-storage` — §12.13's class 1 told from class 4. */
  storage: string | null
  /**
   * The proof that this reading is pre-React, taken in the same frame.
   *
   * `Readout` publishes which of §12.2's two states it is in, and channel B has
   * not run yet at this point: MEASURED here as `document.readyState` of
   * `"interactive"` with `data-hydrated="false"` on a page whose stored record
   * says several sheets are signed off. So a class list that is already correct
   * in this frame cannot have come from an effect — the effect that would have
   * set it has demonstrably not run. `null` where the page draws no readout.
   */
  hydrated: string | null
}

interface PaintWindow {
  __hlRecordFirstPaint?: FirstPaint
}

/**
 * Installs a probe that captures `<html>`'s class list and channel A's two data
 * attributes at the first frame, before anything is painted. Must be called
 * before `goto`.
 *
 * This is `theme.spec.ts`'s probe, and the mechanism is copied rather than
 * adapted on purpose: `requestAnimationFrame` scheduled from an init script
 * runs **before the first paint and before any React effect**, which is the
 * only reading that can tell §12.2's channel A from a `useEffect` that adds the
 * same classes a frame later. An effect passes every assertion taken after load
 * and still shows the reader a mascot with no state in frame one; move the boot
 * script out of `<head>`, defer it, or replace it with an effect, and the
 * reading below comes back without the classes and the spec goes red.
 */
export async function probeFirstPaint(page: Page): Promise<void> {
  await page.addInitScript(() => {
    ;(window as unknown as PaintWindow).__hlRecordFirstPaint = undefined
    requestAnimationFrame(() => {
      const root = document.documentElement
      ;(window as unknown as PaintWindow).__hlRecordFirstPaint = {
        className: root.className,
        record: root.getAttribute('data-hl-record'),
        storage: root.getAttribute('data-hl-storage'),
        hydrated: document.querySelector('.hl-readout')?.getAttribute('data-hydrated') ?? null,
      }
    })
  })
}

export function firstPaint(page: Page): Promise<FirstPaint | undefined> {
  return page.evaluate(
    () => (window as unknown as PaintWindow).__hlRecordFirstPaint,
  )
}

/** The class list alone, the shape `theme.spec.ts` reads. */
export async function firstPaintClass(page: Page): Promise<string | undefined> {
  return (await firstPaint(page))?.className
}

/** `<html>`'s class list now, after React has had every turn it is going to. */
export function rootClass(page: Page): Promise<string> {
  return page.evaluate(() => document.documentElement.className)
}

/** Whether `<html>` carries one channel-A stamp, now (§12.2). */
export function hasRootClass(page: Page, token: string): Promise<boolean> {
  return page.evaluate((name) => document.documentElement.classList.contains(name), token)
}

/**
 * How many documents this context has loaded.
 *
 * §12.2's channel A is stamped by a script in `<head>`, so a class that is
 * correct only because the browser fetched a fresh document proves nothing
 * about a client transition — and a client transition is every navigation on
 * this site. One entry means the `<Link>` really did navigate in-page.
 */
export function documentLoads(page: Page): Promise<number> {
  return page.evaluate(() => performance.getEntriesByType('navigation').length)
}

// ---------------------------------------------------------------------------
// Channel B — the readout, once the store has answered
// ---------------------------------------------------------------------------

/**
 * §12.2 channel B renders the honest empty form and fills it in after the
 * hydration commit, and `Readout` publishes which of the two is on screen:
 * `data-hydrated="false"` prints `--` ("not yet known"), `"true"` prints
 * `00/32` ("nothing recorded"). Only one of those is a fact about the reader,
 * so a spec that means the second has to wait for it.
 */
export async function waitForHydratedReadout(page: Page): Promise<void> {
  await expect(page.locator('.hl-readout[data-hydrated="true"]').first()).toBeAttached()
}

/**
 * §7.1's readout, cell by cell, with the `aria-hidden` separators left out.
 *
 * The strip's own text is uppercased by CSS, so `innerText` reads `SIGNED OFF`
 * where the component wrote `Signed off`. Reading the cells as a list keeps the
 * assertions in the case the source states — and it fails loudly if a cell is
 * added, removed or reordered, which a substring match on one long string would
 * not.
 */
export function readoutCells(page: Page, scope = 'footer'): Locator {
  return page.locator(`${scope} .hl-readout > span:not(.hl-readout-sep)`)
}

/** One cell of the readout, found by the label it prints (`XP`, `Class`). */
export function readoutCell(page: Page, label: RegExp, scope = 'footer'): Locator {
  return readoutCells(page, scope).filter({ hasText: label })
}

// ---------------------------------------------------------------------------
// The corpus, as the record keys it
// ---------------------------------------------------------------------------

/**
 * §12.1.3 — the record's key for a sheet: `<category>/<module-slug>`, taken off
 * the route in `sheets.ts` rather than from a second typed-out list. A number
 * is a label and a slug is an identity, so this is the one derivation the suite
 * does make: `/courses/intermediate/security/` → `intermediate/security`.
 */
export function slugOf(sheet: Sheet): string {
  return sheet.path.replace(/^\/courses\//, '').replace(/\/$/, '')
}

export function sheetBySlug(slug: string): Sheet {
  const found = SHEETS.find((sheet) => slugOf(sheet) === slug)
  if (!found) throw new Error(`no sheet ${slug} in the set`)
  return found
}

/** The six subsystem slugs, in sheet order — channel A's `hl-cat-<slug>-*`. */
export const CATEGORY_SLUGS: readonly string[] = [
  ...new Set(SHEETS.map((sheet) => sheet.category)),
]

// ---------------------------------------------------------------------------
// §16.4 — the register, opened
// ---------------------------------------------------------------------------

/**
 * Opens the register row whose heading id is `id`, and returns its body once
 * the browser is actually rendering it.
 *
 * **Why every spec needs this and none of them needed anything like it before.**
 * §16.4 folded nine of `/profile/`'s eleven panels into closed `<details>`
 * rows. A closed row's subtree is still in the DOM, so `textContent`,
 * `page.evaluate` and `setInputFiles` are unaffected — MEASURED as the reason
 * the storage readouts and the import input needed no change at all. What does
 * not survive is anything that requires a rendered box: `click()` waits for the
 * element to be visible and stable, and `toBeVisible()` is that assertion by
 * definition. So `ERASE ALL LOCAL DATA`, `EXPORT YOUR RECORD` and every import
 * readout now sit behind one gesture, and the gesture is written once here
 * rather than nine times as `page.locator(...).click()` on a summary.
 *
 * **It is idempotent, and that is the point of reading `open` first.** Several
 * tests open the same row twice — an erase followed by an import, a reload in
 * the middle of a round trip — and `<summary>` is a toggle: a second click
 * would CLOSE the row and the next assertion would fail somewhere far from the
 * cause. Reading `details.open` and clicking only when it is false makes the
 * call safe to repeat and safe to put in a helper another spec composes.
 *
 * The row is addressed by `aria-labelledby`, not by position: the ids are
 * verbatim from the panels these rows replaced (`storage`, `raw`, `data`,
 * `submittals`, `hl-orgs-head`) and §16.4's order is asserted on its own, in
 * `record-pages.spec.ts`, rather than assumed here by every caller.
 */
export async function openRegisterRow(page: Page, id: string): Promise<Locator> {
  const row = page.locator(`section.hl-register-row[aria-labelledby="${id}"]`)
  const fold = row.locator('details.hl-register-fold')
  const body = fold.locator('.hl-register-body')

  await expect(fold, `no register row is labelled by "${id}"`).toHaveCount(1)
  if (!(await fold.evaluate((node) => (node as HTMLDetailsElement).open))) {
    await fold.locator('summary.hl-register-summary').click()
  }
  await expect(body).toBeVisible()
  return body
}

/** One register row's summary reading (§16.4.1), addressed by its heading id. */
export function registerReading(page: Page, id: string): Locator {
  return page.locator(
    `section.hl-register-row[aria-labelledby="${id}"] .hl-register-reading`,
  )
}
