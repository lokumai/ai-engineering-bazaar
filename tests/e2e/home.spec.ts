import { type Page, expect, test } from '@playwright/test'
import { HOME_SCOPE } from '@/lib/record/scope'
import { SITE_NAME } from '@/lib/site'
import {
  type RecordSeed,
  firstPaint,
  probeFirstPaint,
  readRawRecord,
  readRecord,
  seedRecord,
  signedSheet,
  slugOf,
  waitForRecord,
} from './record'
import { A0, DRAWN_COUNT, INDEX_SHEET, SHEETS, SHEET_COUNT, sheetByModule } from './sheets'
import { watchPage } from './watch'

/**
 * M13 — the home page, option A, in a browser.
 *
 * `/` used to be the flat manifest; §15.1 moved that table to `INDEX_SHEET` and
 * gave the front door to a home screen in two halves — a first-visit document
 * and a returning-reader document, one of them hidden by CSS. **M13 replaced
 * both with one document** (home A): say what this is, then show the levels,
 * with completion control C as the level grid (D14). So the claims this file
 * makes changed with the page, and there are five that only a real engine can
 * answer:
 *
 * 1. **A reader's own marks are in the FIRST FRAME.** This is M13's own
 *    acceptance criterion — channel A stamps `<html>` before first paint, so
 *    the progress marks are correct in frame one and there is no flash of an
 *    empty record — and it is the assertion that is easy to write vacuously,
 *    because the wrong implementation (a React effect painting the ticks) is
 *    correct a frame later and passes anything allowed to wait. So the reading
 *    below is taken with **every module aborted**, which is `path.spec.ts`'s
 *    idiom for exactly this claim: whatever is on screen after every `.js`
 *    request has been refused was drawn with no React at all, and no wait can
 *    rescue it. A first-frame probe corroborates it inside the first
 *    `requestAnimationFrame`.
 * 2. **Control C writes**, and the tick, the count and the stored record all
 *    move together. Three renderings of one derivation; a click is the only way
 *    to see whether they agree after it.
 * 3. **A record that carries nothing is not a returning reader** (§15.11). What
 *    is IN the envelope is the question, not whether the key exists, and the
 *    rule lives in the boot script — so only an engine shows which state that
 *    leaves on screen.
 * 4. **One document, so one h1 and one tab** (§15.2.2), whichever record the
 *    reader brought.
 * 5. **Every number on the page is derived** (§11.25). Asserted by comparing
 *    the page's own numbers with each other — the facts strip against the level
 *    cards it summarises — rather than against a written list, which would pin
 *    a fact about the content.
 *
 * Module 13 is what gets completed to make a record, for `record-sheet.spec.ts`'s
 * reason: it is the module the rest of the suite already means by "a record".
 */

/** Module 13 — the module this suite completes when it wants a record (§12.7). */
const SEEDED = A0
const SEEDED_SLUG = slugOf(SEEDED)

/** The returning reader's shortcut, and the only thing keyed off the record. */
const CONTINUE = '.hl-home-continue'

/** Control C's own selectors (D14). */
const LEVEL_CARD = '.hl-cc-level'
const MODULE_ROW = '.hl-cmod'
const TICK = '.hl-cmod-mark'
/**
 * The word that states the completion to an assistive technology. It is the
 * STATE, and the toggle carries no `aria-pressed`: whether a module is complete
 * is decided by a class on `<html>` that no React render sets (channel A,
 * §12.2), so an attribute rendered on channel B was a second author of one
 * state and read `false` for ever with scripts refused, about a module whose
 * disc was painted. Asserted by computed `display` rather than `toBeVisible`,
 * because the element is deliberately a 1px clipped box: it is out of the
 * picture and in the accessibility tree, and `toBeVisible` cannot tell the
 * revealed one from the hidden one.
 *
 * The question is `display: none` or not, and not which non-none value: the
 * stylesheet asks for `inline` and the computed value is `block`, because the
 * element is absolutely positioned and absolute positioning blockifies an
 * inline display. Asserting `inline` here failed against a page that was
 * behaving correctly.
 */
const SAID = '.hl-cmod-said'

function saidRevealed(page: Page, module: number): Promise<boolean> {
  return page
    .locator(`${MODULE_ROW}[data-module="${module}"] ${SAID}`)
    .evaluate((node) => getComputedStyle(node).display !== 'none')
}

/**
 * What the page was drawing inside the first `requestAnimationFrame` in which
 * control C had been parsed — before the first paint, and before any React
 * effect could have run.
 *
 * `record.ts`'s `probeFirstPaint` reads `<html>`'s stamps; this reads what the
 * stamps DRAW, which is the thing M13 actually promises a reader. A callback
 * scheduled from an init script runs before the first paint and before
 * hydration, so a tick that is already painted here cannot have been painted by
 * an effect.
 *
 * The probe retries per frame until the rows exist rather than capturing
 * blindly on frame one. That is not a wait for the STATE — the state is CSS and
 * is decided the moment the element exists — it is a wait for the PARSER, and
 * it costs nothing: `hydrated` is captured in the same reading, so a capture
 * that somehow arrived after React would announce itself instead of passing
 * quietly.
 */
interface HomePaint {
  /** `data-hl-record="1"` — the boot script found a readable record. */
  record: string | null
  /** Whether the returning reader's shortcut was visible in that frame. */
  continued: boolean
  /** The module numbers whose completion tick was visible in that frame. */
  ticked: number[]
  /** How many module rows had been parsed when the reading was taken. */
  rows: number
  /**
   * `.hl-readout`'s channel-B flag, read in the same frame. `"false"` is the
   * prerendered state, and it is the proof that everything above was drawn
   * before React.
   */
  hydrated: string | null
  /** How many frames the parser took. Reported on failure, never asserted. */
  frames: number
}

interface HomePaintWindow {
  __hlHomePaint?: HomePaint
}

async function probeHomePaint(page: Page): Promise<void> {
  await page.addInitScript(
    ({ shortcut, row, tick }: { shortcut: string; row: string; tick: string }) => {
      ;(window as unknown as HomePaintWindow).__hlHomePaint = undefined
      let frames = 0
      const look = () => {
        frames += 1
        const rows = document.querySelectorAll(row)
        // 240 frames is four seconds, after which the reading is taken anyway
        // and its emptiness fails loudly rather than the probe silently never
        // producing one.
        if (rows.length === 0 && frames < 240) {
          requestAnimationFrame(look)
          return
        }
        const ticked: number[] = []
        for (const element of rows) {
          const mark = element.querySelector(tick) as HTMLElement | null
          const number = Number(element.getAttribute('data-module'))
          if (mark?.checkVisibility() === true) ticked.push(number)
        }
        ;(window as unknown as HomePaintWindow).__hlHomePaint = {
          record: document.documentElement.getAttribute('data-hl-record'),
          continued:
            (document.querySelector(shortcut) as HTMLElement | null)?.checkVisibility() ?? false,
          ticked: ticked.sort((a, b) => a - b),
          rows: rows.length,
          hydrated: document.querySelector('.hl-readout')?.getAttribute('data-hydrated') ?? null,
          frames,
        }
      }
      requestAnimationFrame(look)
    },
    { shortcut: CONTINUE, row: MODULE_ROW, tick: TICK },
  )
}

function homePaint(page: Page): Promise<HomePaint | undefined> {
  return page.evaluate(() => (window as unknown as HomePaintWindow).__hlHomePaint)
}

/** A record with one module completed — enough for `data-hl-record="1"`. */
function seedOneCompletion(page: Page): Promise<void> {
  return seedRecord(page, { sheets: { [SEEDED_SLUG]: signedSheet('b7225f8') } })
}

/** Control C's toggle for one module, by the name it carries. */
function toggleFor(page: Page, title: string) {
  return page.getByRole('button', { name: `Complete ${title}`, exact: true })
}

// ---------------------------------------------------------------------------
// What a page built once for everybody says
// ---------------------------------------------------------------------------

test('a clean browser meets the whole page, and it claims nothing about the reader', async ({
  page,
}) => {
  const problems = watchPage(page)
  await page.goto('/')

  // What it is: the headline, the measured statement, and the sentence about
  // where the record goes, which `scope.ts` owns.
  await expect(page.locator('main h1')).toHaveText(
    'AI engineering, written by someone who builds it.',
  )
  await expect(page.locator('.hl-statement')).toContainText(HOME_SCOPE)

  // Where to start: the two actions, and the first of them opens a module
  // rather than a menu (§15.2.4, §11.3).
  await expect(page.getByRole('link', { name: `Start with ${SHEETS[0].title}` })).toHaveAttribute(
    'href',
    SHEETS[0].path,
  )
  await expect(page.getByRole('link', { name: 'Browse the catalog' })).toHaveAttribute(
    'href',
    INDEX_SHEET,
  )

  // The levels, doubling as the table of contents — which is the property home
  // A was chosen for. Every module in the course is on the page.
  await expect(page.locator(MODULE_ROW)).toHaveCount(SHEET_COUNT)

  // And the shortcut for a reader who has been here before is ABSENT, not
  // dimmed: nothing on the page describes a state this reader is not in.
  await expect(page.locator(CONTINUE)).not.toBeVisible()

  // Nothing here requires an account, and the identity strip says so.
  await expect(page.getByRole('heading', { name: 'Keeping your place' })).toBeVisible()

  expect(problems.consoleErrors).toEqual([])
  expect(problems.failedRequests).toEqual([])
})

test('every number on the page is derived from the modules it is printed beside', async ({
  page,
}) => {
  await page.goto('/')

  // §11.25 — "no number is written in `src/`" is not a property a browser can
  // read directly. What it CAN read is whether the page's numbers agree with
  // each other: the facts strip summarises the level cards, so summing the
  // cards has to reproduce it. A typed number would drift the moment the
  // corpus moved, and this is what would catch it.
  const facts = await page.locator('.hl-facts').innerText()
  const [written, total] = [...facts.matchAll(/(\d+) of (\d+)\s+modules written/g)][0]
    .slice(1)
    .map(Number)

  const rows = await page.locator(MODULE_ROW).count()
  const planned = await page.locator(`${MODULE_ROW}[data-drawn="false"]`).count()
  expect(total).toBe(rows)
  expect(written).toBe(rows - planned)

  // The same two counts again, from the level cards' own lines, which are
  // rendered by a different component from a different array.
  const cards = await page.locator('.hl-cc-count').allInnerTexts()
  const summed = cards.reduce(
    (sum, text) => {
      const numbers = [...text.matchAll(/(\d+)/g)].map((match) => Number(match[1]))
      // `8 modules` where every module in the level is ready, `11 modules · 0
      // ready` where they are not: the second number is absent exactly when it
      // equals the first.
      return {
        modules: sum.modules + numbers[0],
        ready: sum.ready + (numbers.length > 1 ? numbers[1] : numbers[0]),
      }
    },
    { modules: 0, ready: 0 },
  )
  expect(summed).toEqual({ modules: total, ready: written })

  // And the fixture, which is an independent statement of what ships.
  expect(total).toBe(SHEET_COUNT)
  expect(written).toBe(DRAWN_COUNT)
})

// ---------------------------------------------------------------------------
// M13's own criterion: the marks are right in frame one
// ---------------------------------------------------------------------------

test('a reader’s completions are ticked in frame one, with no JavaScript at all', async ({
  page,
}) => {
  const second = sheetByModule(1)
  await seedRecord(page, {
    sheets: {
      [SEEDED_SLUG]: signedSheet('b7225f8'),
      [slugOf(second)]: signedSheet(null),
    },
  })
  await probeFirstPaint(page)
  await probeHomePaint(page)

  // Refusing every module leaves channel A intact and kills channel B
  // outright, so nothing below can have been done by an effect.
  await page.route('**/*.js', (route) => route.abort())
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  expect((await firstPaint(page))!.record).toBe('1')

  const painted = await homePaint(page)
  expect(painted, 'the first-paint probe never ran').toBeDefined()
  expect(painted!.rows, 'no module rows were parsed').toBe(SHEET_COUNT)
  // The reading, in the frame it was taken: exactly the two completed modules
  // are ticked, and the other thirty-one are not.
  expect(painted!.ticked, `after ${painted!.frames} frame(s)`).toEqual(
    [SEEDED.module, second.module].sort((a, b) => a - b),
  )
  // The returning reader's shortcut is in the same frame.
  expect(painted!.continued, `after ${painted!.frames} frame(s)`).toBe(true)
  // And it is genuinely pre-React: the footer's strip still publishes the
  // prerendered `false`, which is the state channel B leaves. It cannot say
  // anything else here — every module was refused — which is what makes the
  // readings above statements about frame one.
  expect(painted!.hydrated).toBe('false')

  // The same thing said as a reader would meet it, on a page where JavaScript
  // never ran.
  await expect(page.locator(`${MODULE_ROW}[data-module="${SEEDED.module}"] ${TICK}`)).toBeVisible()
  await expect(page.locator(`${MODULE_ROW}[data-module="3"] ${TICK}`)).not.toBeVisible()
})

test('the counts arrive after mount, and the ticks do not move', async ({ page }) => {
  const problems = watchPage(page)
  await seedOneCompletion(page)
  await page.goto('/')

  // Channel B fills every count; it must not touch a mark that was already
  // right. A React island that re-decided the ticks would show up here as one
  // flipping once the store answered, and the frame-one test above cannot see
  // that because it never lets React run.
  await expect(page.locator('.hl-readout[data-hydrated="true"]').first()).toBeAttached()
  await expect(page.locator(`${MODULE_ROW}[data-module="${SEEDED.module}"] ${TICK}`)).toBeVisible()

  // The three numbers, which are `--` until the store has answered.
  const numbers = page.locator('.hl-cc-numbers')
  await expect(numbers).toContainText(`1 of ${SHEET_COUNT}`)
  await expect(numbers).not.toContainText('--')

  expect(problems.consoleErrors).toEqual([])
  expect(problems.failedRequests).toEqual([])
})

// ---------------------------------------------------------------------------
// D14 — control C writes, and everything that reads the record follows
// ---------------------------------------------------------------------------

test('control C completes a module from the home page, and takes it back', async ({
  page,
}) => {
  const target = sheetByModule(1)
  await page.goto('/')
  await expect(page.locator('.hl-readout[data-hydrated="true"]').first()).toBeAttached()

  const toggle = toggleFor(page, target.title)
  // The contract, asserted so that putting `aria-pressed` back turns this red:
  // the button names the action and never the state.
  await expect(toggle).not.toHaveAttribute('aria-pressed', /.*/)
  expect(await saidRevealed(page, target.module)).toBe(false)
  const tick = page.locator(`${MODULE_ROW}[data-module="${target.module}"] ${TICK}`)
  await expect(tick).not.toBeVisible()

  await toggle.click()

  // Four things read that one write, and all four have to move: the control's
  // own state, the tick (channel A, re-stamped by the store rather than by a
  // reload), the count on this page, and the record in storage.
  await expect(tick).toBeVisible()
  await expect
    .poll(() => saidRevealed(page, target.module), { timeout: 3_000 })
    .toBe(true)
  await expect(page.locator('.hl-cc-numbers')).toContainText(`1 of ${SHEET_COUNT}`)
  const stored = await waitForRecord(
    page,
    (envelope) => envelope?.data.sheets[slugOf(target)]?.signedOff != null,
    'the completion',
  )
  expect(stored.data.sheets[slugOf(target)]?.signedOff).not.toBeNull()

  // §12.3.5 — the first completion on a record mints the mark seed, once, and
  // control C takes the same path control A does (`lib/record/complete.ts`).
  // Without that shared path this write would have left the reader with no
  // mark on their exported record and nothing would have failed.
  expect(stored.data.identity.markSeed).toMatch(/^[0-9a-f]{8}$/)

  // And it is its own undo (§12.4.1): no dialog, and the tick goes with it.
  await toggle.click()
  await expect(tick).not.toBeVisible()
  await expect
    .poll(() => saidRevealed(page, target.module), { timeout: 3_000 })
    .toBe(false)
  await waitForRecord(
    page,
    (envelope) => (envelope?.data.sheets[slugOf(target)]?.signedOff ?? null) === null,
    'the completion, undone',
  )
})

test('a planned module has no completion control at all', async ({ page }) => {
  await page.goto('/')

  // §12.4.1 — absent, not disabled: a control for a module nobody has written
  // would offer a state no reader can reach, and every denominator on the site
  // counts a planned module the same way, in.
  const planned = page.locator(`${MODULE_ROW}[data-drawn="false"]`)
  expect(await planned.count()).toBeGreaterThan(0)
  await expect(planned.locator('.hl-cmod-toggle')).toHaveCount(0)
  await expect(planned.locator('button')).toHaveCount(0)
  await expect(planned.first()).toContainText('Planned')

  // And it is still reachable: a planned module has a page — its schedule of
  // parts — so this list links it.
  await expect(planned.first().locator('a')).toHaveCount(1)
})

test('control C is reachable and operable from the keyboard', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.hl-readout[data-hydrated="true"]').first()).toBeAttached()

  const toggle = toggleFor(page, SHEETS[0].title)
  // Pressed with the key, not clicked: a control that answers a click and not
  // a key is a control half the readers cannot use (SC 2.1.1). `.focus()` is
  // not a Tab press, so the tab order is walked to it (D17).
  await page.locator('#main').focus()
  let reached = false
  for (let press = 0; press < 40 && !reached; press += 1) {
    await page.keyboard.press('Tab')
    reached = await toggle.evaluate((node) => node === document.activeElement)
  }
  expect(reached, 'the first toggle was not reachable by Tab').toBe(true)

  await page.keyboard.press('Enter')
  await expect(
    page.locator(`${MODULE_ROW}[data-module="${SHEETS[0].module}"] ${TICK}`),
  ).toBeVisible()
  await expect
    .poll(() => saidRevealed(page, SHEETS[0].module), { timeout: 3_000 })
    .toBe(true)
})

// ---------------------------------------------------------------------------
// §15.11 — a record that carries nothing is not a returning reader
// ---------------------------------------------------------------------------

/**
 * `days: []` is the whole point of these seeds. `recordData()` puts today in
 * `days` by default, so the suite's ordinary "empty seed" is already a record
 * that carries something; the state under test is the one the store leaves
 * behind when a reader has touched the site without reading it — a schema
 * stamp, a preference, and nothing else. That envelope used to stamp
 * `data-hl-record` and hand the reader a continue control for a module they had
 * never opened.
 */
const CARRIES_NOTHING: ReadonlyArray<[string, RecordSeed]> = [
  ['a migration stamp and nothing else', { days: [] }],
  ['one preference and nothing else', { days: [], prefs: { charKeys: false } }],
  // M12's catalog view is the newest member of `prefs`, and the newest way to
  // write an envelope that carries nothing: pressing a view toggle is not
  // reading the course.
  ['a catalog view and nothing else', { days: [], prefs: { catalogView: 'table' } }],
]

for (const [what, seed] of CARRIES_NOTHING) {
  test(`a record carrying ${what} is not a returning reader (§15.11)`, async ({
    page,
  }) => {
    const problems = watchPage(page)
    await probeFirstPaint(page)
    await probeHomePaint(page)
    await seedRecord(page, seed)
    await page.goto('/')

    // Absent, not `"0"`: the key IS in storage and it parses, so this is the
    // boot script having applied `carriesNothing`'s rule rather than having
    // failed to read anything.
    expect(await readRawRecord(page)).not.toBeNull()
    expect((await firstPaint(page))!.record).toBeNull()
    expect((await firstPaint(page))!.storage).toBe('ok')

    const painted = await homePaint(page)
    expect(painted, 'the first-paint probe never ran').toBeDefined()
    expect(painted!.continued, `after ${painted!.frames} frame(s)`).toBe(false)
    expect(painted!.ticked, `after ${painted!.frames} frame(s)`).toEqual([])

    // And as a reader meets it, after hydration: channel B has now read the
    // same record and must reach the same answer, because a shortcut that
    // appeared once the store replied would be the same claim one frame later.
    await expect(page.locator(CONTINUE)).not.toBeVisible()

    expect(problems.consoleErrors).toEqual([])
    expect(problems.failedRequests).toEqual([])
  })
}

/**
 * The line between the two: a name is not reading, but it is something the
 * reader put there, so the record carries it. This is the case that keeps the
 * rule above from becoming "ignore everything but completions".
 */
test('an identity the reader typed is enough to be a returning reader (§15.11)', async ({
  page,
}) => {
  await probeFirstPaint(page)
  await probeHomePaint(page)
  await seedRecord(page, { days: [], identity: { name: 'Ada' } })
  await page.goto('/')

  expect((await firstPaint(page))!.record).toBe('1')
  const painted = await homePaint(page)
  expect(painted, 'the first-paint probe never ran').toBeDefined()
  expect(painted!.continued, `after ${painted!.frames} frame(s)`).toBe(true)
})

// ---------------------------------------------------------------------------
// §15.2.2 — one document, so one h1 and one tab
// ---------------------------------------------------------------------------

for (const state of ['clean', 'with a record'] as const) {
  test(`one h1 in main and a tab that claims nothing about the reader, ${state} (§15.2.2)`, async ({
    page,
  }) => {
    if (state === 'with a record') await seedOneCompletion(page)
    await page.goto('/')

    // One document for both readers since M13, so there is one title whatever
    // the record says. Counted over `main` rather than the document, because
    // the shell's header and footer are not this page's to speak for.
    await expect(page.locator('main h1')).toHaveCount(1)
    await expect(page.locator('main h1')).toBeVisible()

    // The 56px step, used here and nowhere else on the site (§3.2).
    await expect(page.locator('main h1')).toHaveClass(/hl-hero-title/)

    // §15.2.2 — the title is written once, at build time, for a reader the
    // build has never met, so it greets nobody and reports no state. Stated as
    // the exact string AND as what would falsify it: `AI Engineering Bazaar ·
    // AI Engineering Bazaar` from a missing `title.absolute` would pass a
    // substring check, and "Where you left off" would pass a length check.
    await expect(page).toHaveTitle(SITE_NAME)
    const title = await page.title()
    expect(title).not.toMatch(/\b(you|your|welcome|back|resume|continue|left off)\b/i)
  })
}

// ---------------------------------------------------------------------------
// §15.2.1 — the state switch after a client transition
// ---------------------------------------------------------------------------

/**
 * The reader who becomes a returning reader DURING the visit.
 *
 * MEASURED before this existed: a clean browser opened `/`, saved an alias on
 * `/sign-in/alias/`, pressed Home, and got the first-visit document —
 * `data-hl-record` absent — correct only after a full reload. `boot.ts` was the
 * attribute's only writer and `stampRecordState` explicitly left it alone. Every
 * navigation on this site is a client transition, so "whatever was true at load"
 * was the whole session.
 *
 * The route is a real one and taken through real controls: type a name, keep
 * it, then follow a link a reader can see. Seeding storage and reloading would
 * test the boot script again, which was never the half that was broken.
 */
test('a first write during the visit reaches the home page without a reload (§15.2.1)', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator(CONTINUE)).not.toBeVisible()
  await expect(page.locator('html')).not.toHaveAttribute('data-hl-record', '1')

  // The write, through the control the reader would use.
  await page.goto('/sign-in/alias/')
  await page.getByRole('textbox').first().fill('Ada')
  await page.getByRole('button', { name: /keep this alias/i }).click()
  await waitForRecord(
    page,
    (envelope) => envelope?.data.identity.name === 'Ada',
    'the alias',
  )

  // Home the way a reader gets there: a link, not a reload. The breadcrumb is
  // where a reader on this route sees a way back.
  await page
    .getByRole('navigation', { name: 'Curriculum' })
    .getByRole('link', { name: 'Home', exact: true })
    .click()
  await expect(page).toHaveURL(/\/$/)

  await expect(page.locator('html')).toHaveAttribute('data-hl-record', '1')
  await expect(page.locator(CONTINUE)).toBeVisible()

  // And it survives the reload, i.e. the two stampers agree rather than one
  // undoing the other.
  await page.reload()
  await expect(page.locator(CONTINUE)).toBeVisible()
})

// ---------------------------------------------------------------------------
// §13.1.4, §10.4 — a level is never told apart by colour alone
// ---------------------------------------------------------------------------

test('every level card names, numbers and counts itself', async ({ page }) => {
  await page.goto('/')

  const cards = page.locator(LEVEL_CARD)
  const count = await cards.count()
  expect(count).toBeGreaterThan(0)

  for (let index = 0; index < count; index += 1) {
    const card = cards.nth(index)
    // The hue arrives through `data-cat`, which is the carrier `lokum.css`
    // resolves. Everything else on the card is what a reader in forced colours
    // reads instead: a number, a name, and both counts.
    await expect(card).toHaveAttribute('data-cat', /.+/)
    await expect(card.locator('.hl-cc-order')).toHaveText(/^\d{2}$/)
    await expect(card.locator('.hl-cc-title')).not.toHaveText('')
    await expect(card.locator('.hl-cc-count')).toHaveText(/\d+ modules?/)
    // §10.4 — the meter is `aria-hidden`, so the printed tally beside it is the
    // only statement of its reading, and every card has one.
    await expect(card.locator('[data-hl-cat-tally]')).toHaveCount(1)
  }
})

// ---------------------------------------------------------------------------
// §15.2.4 — the two doors out
// ---------------------------------------------------------------------------

test('the lead action opens the first module of the set, and it exists', async ({
  page,
}) => {
  const problems = watchPage(page)
  const first = SHEETS[0]
  await page.goto('/')

  const lead = page.getByRole('link', { name: `Start with ${first.title}` })
  await expect(lead).toHaveAttribute('href', first.path)
  // DESIGN.md, Components — one `button-primary` per screen region, and this is
  // the home page's.
  await expect(lead).toHaveClass(/hl-btn-primary/)
  await lead.click()
  await expect(page).toHaveURL(new RegExp(`${first.path}$`))
  await expect(page.locator('main h1')).toHaveText(first.title)

  expect(problems.consoleErrors).toEqual([])
  expect(problems.failedRequests).toEqual([])
})

test(`the second action opens the catalog at ${INDEX_SHEET}`, async ({ page }) => {
  const problems = watchPage(page)
  await page.goto('/')

  const catalog = page.getByRole('link', { name: 'Browse the catalog' })
  await expect(catalog).toHaveAttribute('href', INDEX_SHEET)
  await catalog.click()
  await expect(page).toHaveURL(new RegExp(`${INDEX_SHEET}$`))
  // What the door opens on is the catalog's default view (D13); the table is
  // one keystroke away and `catalog.spec.ts` owns the toggle.
  await expect(page.locator('.hl-view[data-view="overview"]')).toBeVisible()

  expect(problems.consoleErrors).toEqual([])
  expect(problems.failedRequests).toEqual([])
})

// ---------------------------------------------------------------------------
// The record survives the page it is edited from
// ---------------------------------------------------------------------------

test('a completion made on the home page is the same one the module page shows', async ({
  page,
}) => {
  const target = sheetByModule(1)
  await page.goto('/')
  await expect(page.locator('.hl-readout[data-hydrated="true"]').first()).toBeAttached()
  await toggleFor(page, target.title).click()
  await waitForRecord(
    page,
    (envelope) => envelope?.data.sheets[slugOf(target)]?.signedOff != null,
    'the completion',
  )

  // Control A and control C are two controls over one record (D14), so the
  // module's own button has to report the state the list just wrote — and the
  // revision is the one thing that differs: a completion recorded from a list
  // of thirty-three makes no claim about which revision it was made against
  // rather than claiming the wrong one.
  await page.goto(target.path)
  await expect(page.getByRole('button', { name: /^Completed / })).toBeVisible()
  const stored = await readRecord(page)
  expect(stored?.data.sheets[slugOf(target)]?.signedRevision).toBeNull()
})
