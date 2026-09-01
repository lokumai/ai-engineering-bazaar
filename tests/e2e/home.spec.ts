import { type Page, expect, test } from '@playwright/test'
import { HOME_SCOPE } from '@/lib/record/scope'
import { SITE_NAME } from '@/lib/site'
import {
  type RecordSeed,
  firstPaint,
  probeFirstPaint,
  readRawRecord,
  seedRecord,
  signedSheet,
  slugOf,
  waitForRecord,
} from './record'
import { A0, INDEX_SHEET, SHEETS } from './sheets'
import { watchPage } from './watch'

/**
 * §15.2, §15.10 — the home screen: one document, two states, and the state is
 * chosen by CSS.
 *
 * `/` used to be the flat manifest; §15.1 moved that table verbatim to
 * `INDEX_SHEET` and gave the front door to this screen. `index-sheet.spec.ts`
 * still owns the table. This file owns the door, and there are exactly five
 * claims in it that only a real engine can answer:
 *
 * 1. **The prerendered document is the first-visit one.** A page built once for
 *    everybody can honestly say nothing about the reader, so a clean browser —
 *    no record, therefore no `data-hl-record` — meets the first-visit block and
 *    never sees the resume block. Both are in the DOM either way; which one a
 *    reader can *see* is a cascade question.
 * 2. **A reader with a record gets the resume block in the FIRST FRAME**, and
 *    this is the assertion the whole design rests on (§15.2.1). It is also the
 *    easy one to write vacuously: the wrong implementation — a React effect
 *    choosing the block — is correct a frame later and passes every assertion
 *    that is allowed to wait. §14.14 recorded the same trap in its `expect.poll`
 *    form. So the reading below is taken with **every module aborted**, which is
 *    `path.spec.ts`'s idiom for exactly this claim: channel A is a blocking
 *    inline script plus CSS, so whatever is on screen after every module has
 *    been refused was drawn without React running once, and no wait can rescue
 *    it. The first-frame probe corroborates the same reading inside the first
 *    `requestAnimationFrame`.
 * 3. **A record that carries nothing is not a returning reader** (§15.11). The
 *    key in `localStorage` is not the question; what is IN it is. An envelope
 *    holding only `prefs`, or only a migration stamp, is written the moment a
 *    reader touches the theme toggle, and the screen that greeted it with
 *    "Where you left off" and a continue control was describing reading that
 *    never happened. `carriesNothing`'s rule is therefore inside the boot
 *    script, and only a real engine can show which block that leaves on screen.
 * 4. **One document, so one h1 and one tab** (§15.2.2), whichever state won.
 *    Two states share one prerender, so a title that greeted anybody would be a
 *    lie in the other state's tab.
 * 5. **The primary action is the first sheet** (§15.2.4) — a slug the corpus
 *    ordered, never a number typed here (§12.1.3), which is why the target is
 *    `SHEETS[0]` and the set link is `INDEX_SHEET`.
 *
 * Sheet 13 is what gets signed off to make a record, for `record-sheet.spec.ts`'s
 * reason: it is the sheet the rest of the suite already means by "a record".
 */

/** Sheet 13 — the sheet this suite signs off when it wants a record (§12.7). */
const SEEDED_SLUG = slugOf(A0)

/** The two blocks §15.2 keeps in the DOM together, by the class `home.css` keys. */
const RESUME = '.hl-home-resume'
const FIRST_VISIT = '.hl-home-new'

/**
 * What the two blocks were doing inside the first `requestAnimationFrame` in
 * which both had been parsed — before the first paint, and before any React
 * effect could have run.
 *
 * `record.ts`'s `probeFirstPaint` reads `<html>`'s stamps; this reads what the
 * stamps DRAW, which is the thing §15.2 actually promises a reader, and it is
 * the same mechanism for the same reason: a callback scheduled from an init
 * script runs before the first paint and before hydration, so a block that is
 * already the right one here cannot have been chosen by an effect.
 *
 * The probe retries per frame until both blocks are attached rather than
 * capturing blindly on frame one. That is not a wait for the *state* — the
 * state is CSS and is decided the moment the element exists — it is a wait for
 * the PARSER, and it costs nothing: `hydrated` is captured in the same reading,
 * so a capture that somehow arrived after React would announce itself instead
 * of passing quietly.
 */
interface HomePaint {
  /** `data-hl-record="1"` — the boot script found a readable record. */
  record: string | null
  /** Whether the resume block was visible to a reader in that frame. */
  resume: boolean
  /** Whether the first-visit block was. */
  firstVisit: boolean
  /**
   * `.hl-readout`'s channel-B flag, read in the same frame. The resume block
   * carries §7.1's strip, so on this page the flag is inside the block under
   * test: `"false"` is the prerendered state, and it is the proof that the
   * visibility above was not React's doing.
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
    ({ resume, firstVisit }: { resume: string; firstVisit: string }) => {
      ;(window as unknown as HomePaintWindow).__hlHomePaint = undefined
      let frames = 0
      const look = () => {
        frames += 1
        const a = document.querySelector(resume)
        const b = document.querySelector(firstVisit)
        // Both blocks are always in the DOM (§15.2), so "not yet found" only
        // ever means "not yet parsed" — and 240 frames is four seconds, after
        // which the reading is taken anyway and its `false`s fail loudly rather
        // than the probe silently never producing one.
        if ((a === null || b === null) && frames < 240) {
          requestAnimationFrame(look)
          return
        }
        ;(window as unknown as HomePaintWindow).__hlHomePaint = {
          record: document.documentElement.getAttribute('data-hl-record'),
          resume: (a as HTMLElement | null)?.checkVisibility() ?? false,
          firstVisit: (b as HTMLElement | null)?.checkVisibility() ?? false,
          hydrated: document.querySelector('.hl-readout')?.getAttribute('data-hydrated') ?? null,
          frames,
        }
      }
      requestAnimationFrame(look)
    },
    { resume: RESUME, firstVisit: FIRST_VISIT },
  )
}

function homePaint(page: Page): Promise<HomePaint | undefined> {
  return page.evaluate(() => (window as unknown as HomePaintWindow).__hlHomePaint)
}

/** A record with one sheet signed off — enough for `data-hl-record="1"`. */
function seedOneSignOff(page: Page): Promise<void> {
  return seedRecord(page, { sheets: { [SEEDED_SLUG]: signedSheet('b7225f8') } })
}

// ---------------------------------------------------------------------------
// §15.2 — the state a page built once for everybody is in
// ---------------------------------------------------------------------------

test('a clean browser meets the first-visit document (§15.2, §15.2.3)', async ({ page }) => {
  const problems = watchPage(page)
  await probeFirstPaint(page)
  await probeHomePaint(page)
  await page.goto('/')

  // Absent, not `"0"`: `data-hl-record` is the existence of a record, so with
  // nothing stored there is nothing to stamp and the cascade has no reason to
  // swap the blocks.
  expect((await firstPaint(page))!.record).toBeNull()

  // What a reader can see, not a class list: §15.2.3's statement — including
  // the one line that is a commitment rather than a measurement — then the lead
  // card, then §15.2.5's identity strip at the foot of it.
  await expect(page.getByText(HOME_SCOPE)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Keeping your place' })).toBeVisible()
  await expect(page.locator('.hl-home-card')).toHaveCount(3)
  for (const card of await page.locator('.hl-home-card').all()) {
    await expect(card).toBeVisible()
  }

  // And the returning reader's block is present but not on screen. Both halves
  // matter: `display: none` is admissible here only because both blocks stay in
  // the DOM, so a resume block that was absent would be a different design.
  await expect(page.locator(RESUME)).toHaveCount(1)
  await expect(page.locator(RESUME)).not.toBeVisible()
  await expect(page.getByRole('heading', { name: 'Where you left off' })).not.toBeVisible()

  // The swap is symmetrical, so exactly one of the two is ever readable.
  const painted = await homePaint(page)
  expect(painted, 'the first-paint probe never ran').toBeDefined()
  expect(painted!.firstVisit).toBe(true)
  expect(painted!.resume).toBe(false)

  expect(problems.consoleErrors).toEqual([])
  expect(problems.failedRequests).toEqual([])
})

// ---------------------------------------------------------------------------
// §15.2.1, §15.10.1 — the resume block in the first frame
// ---------------------------------------------------------------------------

test('a stored record shows the resume block in frame one, with no JavaScript at all (§15.2.1)', async ({
  page,
}) => {
  await seedOneSignOff(page)
  await probeFirstPaint(page)
  await probeHomePaint(page)

  // The claim is about WHEN, so it is proved rather than asserted: `home.css`
  // keys off `data-hl-record`, which a blocking inline script in `<head>`
  // stamps, and both are in the document itself. Refusing every module leaves
  // channel A intact and kills channel B outright — so nothing below can have
  // been done by a `useEffect`, and no timeout, poll or `toBeVisible` wait can
  // make a JS-selected block appear a frame late and pass. This is
  // `path.spec.ts`'s mechanism for the same kind of claim.
  await page.route('**/*.js', (route) => route.abort())
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  expect((await firstPaint(page))!.record).toBe('1')

  const painted = await homePaint(page)
  expect(painted, 'the first-paint probe never ran').toBeDefined()
  expect(painted!.record).toBe('1')
  // The reading, in the frame it was taken: the returning reader's block is the
  // visible one and the first-visit block is not.
  expect(painted!.resume, `after ${painted!.frames} frame(s)`).toBe(true)
  expect(painted!.firstVisit, `after ${painted!.frames} frame(s)`).toBe(false)
  // And it is genuinely pre-React: §7.1's strip inside the resume block still
  // publishes the prerendered `false`, which is the state channel B leaves. It
  // cannot say anything else here — every module was refused — which is exactly
  // what makes the two readings above a statement about frame one.
  expect(painted!.hydrated).toBe('false')

  // The same thing said as a reader would meet it, on a page where JavaScript
  // never ran: the resume heading is readable, the first-visit block is gone,
  // and only one of the two is on screen.
  await expect(page.getByRole('heading', { name: 'Where you left off' })).toBeVisible()
  await expect(page.locator(FIRST_VISIT)).toHaveCount(1)
  await expect(page.locator(FIRST_VISIT)).not.toBeVisible()
  await expect(page.locator(`${RESUME}:visible, ${FIRST_VISIT}:visible`)).toHaveCount(1)
})

test('the resume block is still the readable one after hydration (§15.2.1, §12.2)', async ({
  page,
}) => {
  const problems = watchPage(page)
  await seedOneSignOff(page)
  await page.goto('/')

  // Channel B fills the counts inside the block; it must not touch which block
  // is drawn. A React island that re-decided the state would show up here as
  // the block flipping back once the store answered — the frame-one test above
  // cannot see that, because it never lets React run.
  await expect(page.locator('.hl-readout[data-hydrated="true"]').first()).toBeAttached()
  await expect(page.getByRole('heading', { name: 'Where you left off' })).toBeVisible()
  await expect(page.locator(FIRST_VISIT)).not.toBeVisible()

  expect(problems.consoleErrors).toEqual([])
  expect(problems.failedRequests).toEqual([])
})

// ---------------------------------------------------------------------------
// §15.11 — a record that carries nothing is not a returning reader
// ---------------------------------------------------------------------------

/**
 * `days: []` is the whole point of this seed. `recordData()` puts today in
 * `days` by default, so the suite's ordinary "empty seed" is already a record
 * that carries something; the state under test here is the one the store leaves
 * behind when a reader has touched the site without reading it — a schema
 * stamp, a preference, and nothing else. That envelope used to stamp
 * `data-hl-record` and hand the reader the resume block.
 */
const CARRIES_NOTHING: ReadonlyArray<[string, RecordSeed]> = [
  ['a migration stamp and nothing else', { days: [] }],
  ['one preference and nothing else', { days: [], prefs: { charKeys: false } }],
]

for (const [what, seed] of CARRIES_NOTHING) {
  test(`a record carrying ${what} meets the first-visit document (§15.11)`, async ({
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
    expect(painted!.firstVisit, `after ${painted!.frames} frame(s)`).toBe(true)
    expect(painted!.resume, `after ${painted!.frames} frame(s)`).toBe(false)

    // And as a reader meets it, after hydration: channel B has now read the
    // same record and must reach the same answer, because a resume block that
    // appeared once the store replied would be the same lie one frame later.
    await expect(page.getByRole('heading', { name: 'Keeping your place' })).toBeVisible()
    await expect(page.locator(RESUME)).toHaveCount(1)
    await expect(page.locator(RESUME)).not.toBeVisible()
    await expect(page.getByRole('heading', { name: 'Where you left off' })).not.toBeVisible()

    expect(problems.consoleErrors).toEqual([])
    expect(problems.failedRequests).toEqual([])
  })
}

/**
 * The line between the two: a name is not reading, but it is something the
 * reader put there, so the record carries it and the returning-reader block is
 * the honest one. This is the case that keeps the fix above from becoming
 * "ignore everything but sign-offs".
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
  expect(painted!.resume, `after ${painted!.frames} frame(s)`).toBe(true)
  expect(painted!.firstVisit, `after ${painted!.frames} frame(s)`).toBe(false)
})

// ---------------------------------------------------------------------------
// §15.2.2 — one document, so one h1 and one tab
// ---------------------------------------------------------------------------

for (const state of ['clean', 'with a record'] as const) {
  test(`one h1 in main and a tab that claims nothing about the reader, ${state} (§15.2.2)`, async ({
    page,
  }) => {
    if (state === 'with a record') await seedOneSignOff(page)
    await page.goto('/')

    // Neither block draws its own h1, so whichever state the stylesheet chose,
    // a reader and a screen reader get exactly one title. Counted over `main`
    // rather than the document because the shell's header and footer are not
    // this page's to speak for.
    await expect(page.locator('main h1')).toHaveCount(1)
    await expect(page.locator('main h1')).toHaveText(SITE_NAME)
    await expect(page.locator('main h1')).toBeVisible()

    // The 56px step, used here and nowhere else on the site (§3.2) — it is what
    // the manifest gave up when it moved to `INDEX_SHEET`.
    await expect(page.locator('main h1')).toHaveClass(/hl-index-title/)

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
 * MEASURED before this: a clean browser opened `/`, saved an alias on
 * `/sign-in/alias/`, pressed Home, and got the first-visit document —
 * `data-hl-record` absent, `.hl-home-new` visible — correct only after a full
 * reload. `boot.ts` was the attribute's only writer and `stampRecordState`
 * explicitly left it alone; the reason recorded for that justified never
 * REMOVING it (§12.13's CLEARED BY YOU) and said nothing about setting it. Every
 * navigation on this site is a client transition, so "whatever was true at load"
 * was the whole session.
 *
 * The route is a real one and taken through real controls: type a name, keep it,
 * then follow a link a reader can see. Seeding storage and reloading would test
 * the boot script again, which was never the half that was broken.
 */
test('a first write during the visit reaches the home screen without a reload (§15.2.1)', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('.hl-home-new').first()).toBeVisible()
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

  // Home the way a reader gets there: a link, not a reload.
  // The breadcrumb, which is where a reader on this route sees a way back.
  await page
    .getByRole('navigation', { name: 'Drawing set' })
    .getByRole('link', { name: 'Home', exact: true })
    .click()
  await expect(page).toHaveURL(/\/$/)

  await expect(page.locator('html')).toHaveAttribute('data-hl-record', '1')
  await expect(page.locator('.hl-home-resume').first()).toBeVisible()
  await expect(page.locator('.hl-home-new').first()).toBeHidden()

  // And it survives the reload, i.e. the two stampers agree rather than one
  // undoing the other.
  await page.reload()
  await expect(page.locator('.hl-home-resume').first()).toBeVisible()
})

// ---------------------------------------------------------------------------
// §15.3.1, §10.4 — every meter cell states its own size in text
// ---------------------------------------------------------------------------

/**
 * The gauges in the resume block are all `aria-hidden`, so the line under each
 * one is the only statement of its reading — which is the single condition
 * §10.4 allows a gauge to be silent under. A drawn subsystem gets that number
 * from `CategoryTally`; a subsystem with nothing drawn takes `UnsignableMeter`,
 * which printed `— signed off · NOT DRAWN` and no size at all, so one cell in
 * the list named a subsystem and measured nothing.
 *
 * Asserted as the general property rather than as the one string, because the
 * failure is "a cell with no number in it" and either branch can regress into
 * it. The `NOT DRAWN` half is asserted separately, since that is the branch
 * this section changed and the one the corpus can empty: when the last
 * subsystem is drawn there will be no such cell, and the count below is what
 * says so out loud instead of passing silently.
 */
test('no meter cell names a subsystem without measuring it (§15.3.1, §10.4)', async ({
  page,
}) => {
  await seedOneSignOff(page)
  await page.goto('/')

  const cells = page.locator('.hl-home-meters > li')
  const total = await cells.count()
  expect(total).toBeGreaterThan(0)

  for (let i = 0; i < total; i++) {
    const text = (await cells.nth(i).innerText()).replace(/\s+/g, ' ').trim()
    expect(text, `cell ${i} states no number`).toMatch(/\d/)
  }

  // The branch this section changed. `plural` and not a typed word: protocols &
  // specs is a subsystem of one, and `1 sheets` would be a typed word
  // contradicting the measured number beside it (§11.25).
  const undrawn = page.locator('.hl-home-meters > li', { hasText: 'NOT DRAWN' })
  const dashed = await undrawn.count()
  expect(dashed, 'no undrawn subsystem left to check — retire this half').toBeGreaterThan(0)

  for (let i = 0; i < dashed; i++) {
    const text = (await undrawn.nth(i).innerText()).replace(/\s+/g, ' ').trim()
    // Case-insensitive: `.hl-mark` uppercases in CSS, so `innerText` reads
    // `SIGNED OFF · 9 SHEETS`. The words are what is pinned, not the casing.
    expect(text).toMatch(/signed off · (\d+ sheets|1 sheet), NOT DRAWN/i)
  }
})

// ---------------------------------------------------------------------------
// §15.2.4, §15.1 — where the door leads
// ---------------------------------------------------------------------------

test('the lead card opens the first sheet of the set, and it exists (§15.2.4)', async ({
  page,
}) => {
  const problems = watchPage(page)
  await page.goto('/')

  // `SHEETS[0]`, not a typed slug: the set has been renumbered once already, so
  // the claim is "the first row of the set as the corpus orders it" and
  // `sheets.ts` is where the suite states what that row is (§12.1.3).
  const first = SHEETS[0]
  const lead = page.locator('.hl-home-card-lead').getByRole('link')
  await expect(lead).toHaveCount(1)
  await expect(lead).toHaveAttribute('href', first.path)

  // A `<Link>` to a route that does not exist 404s silently in a static export
  // and fails no build (§15.1.2), so the card is followed rather than read.
  await lead.click()
  await expect(page).toHaveURL(new RegExp(`${first.path}$`))
  await expect(page.locator('main h1')).toHaveText(first.title)

  expect(problems.consoleErrors).toEqual([])
  expect(problems.failedRequests).toEqual([])
})

test(`the set card opens the manifest at ${INDEX_SHEET} (§15.1)`, async ({ page }) => {
  const problems = watchPage(page)
  await page.goto('/')

  // §15.1 moved the flat manifest here, and the home screen is the one page
  // that has to know where it went. `index-sheet.spec.ts` owns the table; this
  // owns the door to it.
  const set = page.getByRole('link', { name: 'Open the index' })
  await expect(set).toHaveAttribute('href', INDEX_SHEET)
  await set.click()
  await expect(page).toHaveURL(new RegExp(`${INDEX_SHEET}$`))
  await expect(page.locator('main table')).toBeVisible()

  expect(problems.consoleErrors).toEqual([])
  expect(problems.failedRequests).toEqual([])
})
