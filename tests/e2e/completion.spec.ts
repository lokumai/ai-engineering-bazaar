import { type Page, expect, test } from '@playwright/test'
import {
  type RecordSeed,
  firstPaint,
  probeFirstPaint,
  readRecord,
  seedRecord,
  signedSheet,
  slugOf,
  waitForRecord,
} from './record'
import { A0, DRAWN_COUNT, SHEETS, SHEET_COUNT, sheetByModule } from './sheets'
import { watchPage } from './watch'

/**
 * D14's completion control C, in a browser — and **M18 is why this file
 * exists.**
 *
 * Control C is every level, every module, a dial each and three statistics: the
 * reader's own state visible and adjustable without opening anything. D14 put
 * it on two surfaces, *"C on the home and progress pages"*, and M13 made it the
 * home page's level grid as well, because home A's levels ARE its table of
 * contents.
 *
 * **M18 took it off the front door.** The author's shape for that page is the
 * banner and the argument, and control C was the only thing on it that could
 * say nothing true to a stranger. It is unchanged on `/profile/`, which is the
 * page named for it — so these tests MOVED rather than died, out of
 * `home.spec.ts` and into a file named for what they are about rather than for
 * where it used to be drawn. Every assertion below is the one it was written
 * as; only the address changed.
 *
 * The two claims here that only a real engine can answer are the two that were
 * hardest to write honestly, and both are §12.2's:
 *
 * 1. **A reader's own marks are in the FIRST FRAME.** Channel A stamps `<html>`
 *    before first paint, so the marks are right in frame one and there is no
 *    flash of an empty record. It is the assertion that is easy to write
 *    vacuously, because the wrong implementation — a React effect painting the
 *    ticks — is correct a frame later and passes anything allowed to wait. So
 *    the reading is taken with **every module aborted**: whatever is on screen
 *    after every `.js` request has been refused was drawn with no React at all,
 *    and no wait can rescue it. A first-frame probe corroborates it inside the
 *    first `requestAnimationFrame`.
 * 2. **The counts are channel B and print `--` until the store answers**, and
 *    the ticks do not move when it does. A count is a tally over the record,
 *    which no prerendered page has met.
 */

/** Where control C lives, since M18. It used to be here and on `/`. */
const CONTROL_C = '/profile/'

/** Module 13 — the module this suite completes when it wants a record (§12.7). */
const SEEDED = A0
const SEEDED_SLUG = slugOf(SEEDED)

/* M18 — `CONTINUE` was `.bz-home-continue`, the returning reader's shortcut on
   the home page and the only thing on it keyed off the record. The author had
   the block removed, so the probe below no longer reads it; `data-hl-record` is
   still stamped and `home.spec.ts` asserts the stamp itself, which is what
   §15.11 is actually about. */

/** Control C's own selectors (D14). */
const LEVEL_CARD = '.bz-cc-level'
const MODULE_ROW = '.bz-cmod'
const TICK = '.bz-cmod-mark'
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
const SAID = '.bz-cmod-said'

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
interface ControlCPaint {
  /** `data-hl-record="1"` — the boot script found a readable record. */
  record: string | null
  /** The module numbers whose completion tick was visible in that frame. */
  ticked: number[]
  /** How many module rows had been parsed when the reading was taken. */
  rows: number
  /**
   * `.bz-readout`'s channel-B flag, read in the same frame. `"false"` is the
   * prerendered state, and it is the proof that everything above was drawn
   * before React.
   */
  hydrated: string | null
  /** How many frames the parser took. Reported on failure, never asserted. */
  frames: number
}

interface ControlCPaintWindow {
  __hlControlCPaint?: ControlCPaint
}

async function probeControlCPaint(page: Page): Promise<void> {
  await page.addInitScript(
    ({ row, tick }: { row: string; tick: string }) => {
      ;(window as unknown as ControlCPaintWindow).__hlControlCPaint = undefined
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
        ;(window as unknown as ControlCPaintWindow).__hlControlCPaint = {
          record: document.documentElement.getAttribute('data-hl-record'),
          ticked: ticked.sort((a, b) => a - b),
          rows: rows.length,
          hydrated: document.querySelector('.bz-readout')?.getAttribute('data-hydrated') ?? null,
          frames,
        }
      }
      requestAnimationFrame(look)
    },
    { row: MODULE_ROW, tick: TICK },
  )
}

function controlCPaint(page: Page): Promise<ControlCPaint | undefined> {
  return page.evaluate(() => (window as unknown as ControlCPaintWindow).__hlControlCPaint)
}

/** A record with one module completed — enough for `data-hl-record="1"`. */
function seedOneCompletion(page: Page): Promise<void> {
  return seedRecord(page, { sheets: { [SEEDED_SLUG]: signedSheet('b7225f8') } })
}

/** Control C's toggle for one module, by the name it carries. */
function toggleFor(page: Page, title: string) {
  return page.getByRole('button', { name: `Complete ${title}`, exact: true })
}

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
  await probeControlCPaint(page)

  // Refusing every module leaves channel A intact and kills channel B
  // outright, so nothing below can have been done by an effect.
  await page.route('**/*.js', (route) => route.abort())
  await page.goto(CONTROL_C, { waitUntil: 'domcontentloaded' })

  expect((await firstPaint(page))!.record).toBe('1')

  const painted = await controlCPaint(page)
  expect(painted, 'the first-paint probe never ran').toBeDefined()
  expect(painted!.rows, 'no module rows were parsed').toBe(SHEET_COUNT)
  // The reading, in the frame it was taken: exactly the two completed modules
  // are ticked, and the other thirty-one are not.
  expect(painted!.ticked, `after ${painted!.frames} frame(s)`).toEqual(
    [SEEDED.module, second.module].sort((a, b) => a - b),
  )
  /* M18 — the returning reader's shortcut was read in this same frame and the
     author had it removed from the home page. What the assertion was about is
     unchanged and is asserted two lines above by the STAMP itself:
     `data-hl-record` is `1` before first paint, and it is the one thing on
     channel A that knows the reader at all. `home.spec.ts` holds §15.11's own
     cases on that attribute. */
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
  await page.goto(CONTROL_C)

  // Channel B fills every count; it must not touch a mark that was already
  // right. A React island that re-decided the ticks would show up here as one
  // flipping once the store answered, and the frame-one test above cannot see
  // that because it never lets React run.
  await expect(page.locator('.bz-readout[data-hydrated="true"]').first()).toBeAttached()
  await expect(page.locator(`${MODULE_ROW}[data-module="${SEEDED.module}"] ${TICK}`)).toBeVisible()

  // The three numbers, which are `--` until the store has answered.
  const numbers = page.locator('.bz-cc-stats')
  await expect(numbers).toContainText(`1 of ${SHEET_COUNT}`)
  await expect(numbers).not.toContainText('--')

  expect(problems.consoleErrors).toEqual([])
  expect(problems.failedRequests).toEqual([])
})

// ---------------------------------------------------------------------------
// D14 — control C writes, and everything that reads the record follows
// ---------------------------------------------------------------------------

test('control C completes a module from the progress page, and takes it back', async ({
  page,
}) => {
  const target = sheetByModule(1)
  await page.goto(CONTROL_C)
  await expect(page.locator('.bz-readout[data-hydrated="true"]').first()).toBeAttached()

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
  await expect(page.locator('.bz-cc-stats')).toContainText(`1 of ${SHEET_COUNT}`)
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

/**
 * D25, asserted with scripts REFUSED, which is the only condition under which
 * the defect it records was visible.
 *
 * Control C's toggle carried `aria-pressed` on channel B while the disc beside
 * it is revealed on channel A. With every module refused, that attribute read
 * `false` for ever about a module whose tick was painted and whose own word
 * said `Complete`: a screen reader was told "not pressed" about a completed
 * module. The state is now a word revealed by the same generated rule as the
 * disc, and the button points at it with `aria-describedby` so the CONTROL
 * announces it and not only the row.
 *
 * BOTH halves, because either alone passes for the wrong reason (D17): the
 * word is revealed on the completed module and hidden on every other, and the
 * button carries no `aria-pressed` in either state. A hidden element
 * contributes no accessible description, which is what makes one word on one
 * channel enough for both states.
 */

/**
 * D25, asserted with scripts REFUSED, which is the only condition under which
 * the defect it records was visible.
 *
 * Control C's toggle carried `aria-pressed` on channel B while the disc beside
 * it is revealed on channel A. With every module refused, that attribute read
 * `false` for ever about a module whose tick was painted and whose own word
 * said `Complete`: a screen reader was told "not pressed" about a completed
 * module. The state is now a word revealed by the same generated rule as the
 * disc, and the button points at it with `aria-describedby` so the CONTROL
 * announces it and not only the row.
 *
 * BOTH halves, because either alone passes for the wrong reason (D17): the
 * word is revealed on the completed module and hidden on every other, and the
 * button carries no `aria-pressed` in either state. A hidden element
 * contributes no accessible description, which is what makes one word on one
 * channel enough for both states.
 */
test('control C states completion on channel A, and claims nothing on channel B', async ({
  page,
}) => {
  const planned = sheetByModule(1)
  await seedRecord(page, { sheets: { [SEEDED_SLUG]: signedSheet('b7225f8') } })

  await page.route('**/*.js', (route) => route.abort())
  await page.goto(CONTROL_C, { waitUntil: 'domcontentloaded' })

  // Channel A ran: the completed module's tick is painted with no React.
  await expect(page.locator(`${MODULE_ROW}[data-module="${SEEDED.module}"] ${TICK}`)).toBeVisible()

  // The state, said where a reader who focuses the control will hear it.
  expect(await saidRevealed(page, SEEDED.module)).toBe(true)
  expect(await saidRevealed(page, planned.module)).toBe(false)

  // And the description resolves to that word, rather than being an id that
  // points at nothing.
  const described = await page
    .locator(`${MODULE_ROW}[data-module="${SEEDED.module}"] .bz-cmod-toggle`)
    .evaluate((node) => {
      const id = node.getAttribute('aria-describedby')
      const target = id ? document.getElementById(id) : null
      return { hasPressed: node.hasAttribute('aria-pressed'), resolves: !!target,
               text: target?.textContent?.trim() ?? null }
    })
  expect(described.resolves, 'aria-describedby points at no element').toBe(true)
  expect(described.text).toBe('Complete')
  // The contract: putting `aria-pressed` back turns this red.
  expect(described.hasPressed, '`aria-pressed` is back on channel B (D25)').toBe(false)
})

test('a planned module has no completion control at all', async ({ page }) => {
  await page.goto(CONTROL_C)

  // §12.4.1 — absent, not disabled: a control for a module nobody has written
  // would offer a state no reader can reach, and every denominator on the site
  // counts a planned module the same way, in.
  const planned = page.locator(`${MODULE_ROW}[data-drawn="false"]`)
  expect(await planned.count()).toBeGreaterThan(0)
  await expect(planned.locator('.bz-cmod-toggle')).toHaveCount(0)
  await expect(planned.locator('button')).toHaveCount(0)
  await expect(planned.first()).toContainText('Planned')

  // And it is still reachable: a planned module has a page — its schedule of
  // parts — so this list links it.
  await expect(planned.first().locator('a')).toHaveCount(1)
})

test('control C is reachable and operable from the keyboard', async ({ page }) => {
  await page.goto(CONTROL_C)
  await expect(page.locator('.bz-readout[data-hydrated="true"]').first()).toBeAttached()

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

test('every level card names, numbers and counts itself', async ({ page }) => {
  await page.goto(CONTROL_C)

  const cards = page.locator(LEVEL_CARD)
  const count = await cards.count()
  expect(count).toBeGreaterThan(0)

  for (let index = 0; index < count; index += 1) {
    const card = cards.nth(index)
    // The hue arrives through `data-cat`, which is the carrier `category.css`
    // resolves. Everything else on the card is what a reader in forced colours
    // reads instead: a number, a name, and both counts.
    await expect(card).toHaveAttribute('data-cat', /.+/)
    await expect(card.locator('.bz-cc-order')).toHaveText(/^\d{2}$/)
    await expect(card.locator('.bz-cc-title')).not.toHaveText('')
    // The count is the DIAL's denominator now. The card's own count line —
    // `8 modules · 7 ready` — said in prose what the dial states as a fraction,
    // and the author had it removed on 2026-09-11. A level is still told apart
    // by four signals of which colour is one: number, name, dial and hue.
    await expect(card.locator('.bz-dial-value')).toHaveText(/\d+|--/)
    // §10.4 — the meter is `aria-hidden`, so the printed tally beside it is the
    // only statement of its reading, and every card has one.
    await expect(card.locator('[data-hl-cat-tally]')).toHaveCount(1)
  }
})

// ---------------------------------------------------------------------------
// §15.2.4 — the two doors out
// ---------------------------------------------------------------------------

test('a completion made on the progress page is the same one the module page shows', async ({
  page,
}) => {
  const target = sheetByModule(1)
  await page.goto(CONTROL_C)
  await expect(page.locator('.bz-readout[data-hydrated="true"]').first()).toBeAttached()
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

test('every number control C prints is derived from the modules it is printed beside', async ({
  page,
}) => {
  await page.goto(CONTROL_C)

  // §11.25 — "no number is written in `src/`" is not a property a browser can
  // read directly. What it CAN read is whether the page's numbers agree with
  // each other: the facts strip summarises the level cards, so summing the
  // cards has to reproduce it. A typed number would drift the moment the
  // corpus moved, and this is what would catch it.
  /*
    M18 — AND IT MOVED AGAIN, WITH CONTROL C, TO THE PAGE THAT DRAWS IT.

    THE CROSS-CHECK MOVED WITH THE COUNT. The facts strip used to open with
    "19 of 33 modules written", and summing the level cards had to reproduce
    it. The author had that fact removed on 2026-09-11 — the levels below
    carry their own — so the two sources being compared are now the level
    DIALS and the module rows they are printed beside.

    Each dial reads `--/N`, where N is the level's own module count, and the
    rows are rendered by a different component from a different array. Their
    sum has to be the course. A typed number would drift the moment the corpus
    moved, and this is still what would catch it.
  */
  /* The tally is channel B — a count over the record, which no prerendered page
     has met — so it is EMPTY until the store answers and `--/8` after. Reading
     it without waiting is how this test failed on its first run against
     `/profile/`: on the home page the surrounding assertions had already
     forced hydration, and here it is the first thing the test does. */
  /* Scoped to control C's own dials. `/profile/` has THREE more consumers of
     `data-hl-cat-tally` — a table of per-level rows whose cells are empty until
     the store answers and stay empty for a level with nothing in it — and the
     bare attribute selector picked them up, which is the failure this test
     produced on its first run here. On the home page the dials were the only
     consumer, so the selector had never had to say which it meant. */
  const dial = '.bz-dial-value [data-hl-cat-tally]'
  await expect(page.locator(dial).first()).toHaveText(/\/\d+$/)
  const dials = await page.locator(dial).allInnerTexts()
  expect(dials.length, 'no level states a tally').toBeGreaterThan(0)
  const denominators = dials.map((text) => {
    const match = /\/(\d+)\s*$/.exec(text.trim())
    expect(match, `a dial states no denominator: "${text}"`).not.toBeNull()
    return Number(match![1])
  })

  const rows = await page.locator(MODULE_ROW).count()
  expect(
    denominators.reduce((sum, one) => sum + one, 0),
    'the dials and the rows disagree about how many modules there are',
  ).toBe(rows)

  // The level cards' own count lines used to be summed here as a second,
  // independent statement of the same two numbers. They are gone with the
  // strip's count — see above — and the dials are what replaced them.

  // And the fixture, which is an independent statement of what ships. The
  // written count is no longer printed anywhere on this page, so what is
  // compared to the fixture is what the page still states: how many modules
  // there are, and how many of them are drawn as planned.
  const planned = await page.locator(`${MODULE_ROW}[data-drawn="false"]`).count()
  expect(rows).toBe(SHEET_COUNT)
  expect(rows - planned).toBe(DRAWN_COUNT)
})
