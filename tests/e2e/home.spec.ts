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

// ---------------------------------------------------------------------------
// What a page built once for everybody says
// ---------------------------------------------------------------------------

test('a clean browser meets the whole page, and it claims nothing about the reader', async ({
  page,
}) => {
  const problems = watchPage(page)
  await page.goto('/')

  // What it is: the headline, and a lede that is a PROMISE rather than a
  // description. It used to carry the measured statement and the sentence
  // `scope.ts` owns about where the record goes — five paragraphs saying in
  // prose what the levels below already show. The author had them removed on
  // 2026-09-11, so what is asserted is what remains true: the page opens with
  // sentences about the course, and not one of them is about the reader.
  await expect(page.locator('main h1')).toHaveText(
    'AI engineering, written by the people who build it.',
  )
  const lede = (await page.locator('.bz-lede').innerText()).trim()
  expect(lede.length, 'the front door says nothing at all').toBeGreaterThan(40)
  expect(lede, 'the lede claims something about the reader').not.toMatch(/\byou(r)?\b/i)

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

  /* M18 — THE LEVELS ARE NOT HERE ANY MORE, and neither is the shortcut.

     This asserted that every module in the course was on the page, because
     home A's levels doubled as its table of contents. The author's shape for
     the front door is the banner and the argument, so completion control C is
     on `/profile/` and the continue block is gone. **The claim moved rather
     than died**: `catalog.spec.ts` proves every module in the course is
     listed, on the one page that lists it since M17.

     What is asserted here instead is the property that replaced it — the front
     door reports on NOBODY. Not one control on it reads the record, so there
     is no state a stranger can be shown and no claim a build can get wrong. */
  await expect(page.locator('.bz-cmod, .bz-home-continue')).toHaveCount(0)
  await expect(page.locator('[data-hl-cat-tally]')).toHaveCount(0)

  /* The three figures the strip still prints are counted from the corpus, and
     the only honest check a browser can make on a derivation is that it is not
     a placeholder: every one is a positive number, and NONE of them is a count
     of modules — the page states the size of the thing in reading time,
     figures and sources, and says how many modules there are nowhere at all.
     Summing the level dials against the module rows is the strong version of
     this claim and it is in `completion.spec.ts`, on the page that draws them. */
  const figures = await page.locator('.bz-facts-value').allInnerTexts()
  expect(figures.length, 'the facts strip states nothing').toBeGreaterThan(2)
  for (const figure of figures) {
    expect(figure.trim(), 'a fact is not a measured number').toMatch(/\d/)
    expect(Number(figure.replace(/[^\d]/g, '')), figure).toBeGreaterThan(0)
  }

  // NOTHING HERE REQUIRES AN ACCOUNT, and the way the page says so is now by
  // not asking. The "Keeping your place" strip — three rows explaining what a
  // name, an alias and an account each do — was removed by the author on
  // 2026-09-11: it explained a choice nobody had been asked to make, on the
  // page a stranger meets first. What is asserted instead is the property it
  // was there to demonstrate, which is stronger: the front door asks for
  // nothing at all.
  await expect(page.locator('main input, main [role="textbox"]')).toHaveCount(0)
  await expect(page.getByRole('link', { name: /sign in|account/i })).toHaveCount(0)

  expect(problems.consoleErrors).toEqual([])
  expect(problems.failedRequests).toEqual([])
})

// ---------------------------------------------------------------------------
// M13's own criterion: the marks are right in frame one
// ---------------------------------------------------------------------------







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
    await seedRecord(page, seed)
    await page.goto('/')

    // Absent, not `"0"`: the key IS in storage and it parses, so this is the
    // boot script having applied `carriesNothing`'s rule rather than having
    // failed to read anything.
    expect(await readRawRecord(page)).not.toBeNull()
    expect((await firstPaint(page))!.record).toBeNull()
    expect((await firstPaint(page))!.storage).toBe('ok')

    /* M18 — the STAMP is the whole claim now, and it always was.

       This read the continue block the stamp revealed, and the author had that
       block removed; what §15.11 says is that an envelope carrying only a
       schema version or a preference is not a reader who has been here, and
       that is a fact about `data-hl-record` rather than about any one control.
       The stamp is asserted above, before first paint, which is stricter than
       reading what it drew. What the page does with it is `/profile/`'s
       business now, and `completion.spec.ts` measures that. */

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
  await seedRecord(page, { days: [], identity: { name: 'Ada' } })
  await page.goto('/')

  // Before first paint, and on the stamp itself — see the block above for why
  // this stopped reading a control.
  expect((await firstPaint(page))!.record).toBe('1')
  expect((await firstPaint(page))!.storage).toBe('ok')
})

// ---------------------------------------------------------------------------
// §15.2.2 — one document, so one h1 and one tab
// ---------------------------------------------------------------------------

for (const state of ['clean', 'with a record'] as const) {
  test(`one h1 in main and a tab that claims nothing about the reader, ${state} (§15.2.2)`, async ({
    page,
  }) => {
    if (state === 'with a record') {
      await seedRecord(page, { sheets: { [slugOf(A0)]: signedSheet('b7225f8') } })
    }
    await page.goto('/')

    // One document for both readers since M13, so there is one title whatever
    // the record says. Counted over `main` rather than the document, because
    // the shell's header and footer are not this page's to speak for.
    await expect(page.locator('main h1')).toHaveCount(1)
    await expect(page.locator('main h1')).toBeVisible()

    // The 56px step, used here and nowhere else on the site (§3.2).
    await expect(page.locator('main h1')).toHaveClass(/bz-hero-title/)

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

  // And it survives the reload, i.e. the two stampers agree rather than one
  // undoing the other.
  //
  // M18 — the continue block this used to watch is gone; the stamp it was
  // revealed by is the claim, and `stampRecordState` is the half that was
  // broken. `boot.ts` is the other half and the reload is what asks it.
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-hl-record', '1')
})

// ---------------------------------------------------------------------------
// §13.1.4, §10.4 — a level is never told apart by colour alone
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
  await expect(lead).toHaveClass(/bz-btn/)
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
  await expect(page.locator('.bz-view[data-view="overview"]')).toBeVisible()

  expect(problems.consoleErrors).toEqual([])
  expect(problems.failedRequests).toEqual([])
})

// ---------------------------------------------------------------------------
// The record survives the page it is edited from
// ---------------------------------------------------------------------------

