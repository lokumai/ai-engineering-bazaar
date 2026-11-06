import { type Page, expect, test } from '@playwright/test'
import { SITE_NAME } from '@/lib/site'
import {
  type RecordSeed,
  firstPaint,
  probeFirstPaint,
  readRawRecord,
  seedRecord,
  signedSheet,
  slugOf,
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
    'AI Engineering, written by the people who build it.',
  )
  const lede = (await page.locator('.bz-lede').innerText()).trim()
  expect(lede.length, 'the front door says nothing at all').toBeGreaterThan(40)
  expect(lede, 'the lede claims something about the reader').not.toMatch(/\byou(r)?\b/i)

  // Where to start: the way in is the catalog, which lists the whole course
  // (D79). `Start with <first module>` and `Browse the catalog` were the
  // author's to remove, and he did, with the Bazaar Street front door.
  await expect(
    page.locator('#gate').getByRole('link', { name: 'Open the curriculum', exact: true }),
  ).toHaveAttribute('href', INDEX_SHEET)

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

  /* THE DOORS ARE THE LEVELS, DERIVED. The facts strip that stood here was
     removed by the author with the old front door, so the page states no
     count. What it does draw from the corpus is one door per level, named by
     the level and opening it, and that is checkable against the drawing set
     without writing a fact about the content down. */
  const levels = [...new Set(SHEETS.map((sheet) => sheet.category))]
  await expect(page.locator('.bz-street .door')).toHaveCount(levels.length)
  for (const level of levels) {
    await expect(page.locator(`.bz-street .door[data-cat="${level}"]`)).toHaveAttribute(
      'href',
      `${INDEX_SHEET}${level}/`,
    )
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
// §15.11 — a record that carries nothing stamps no progress
// ---------------------------------------------------------------------------

/**
 * `days: []` is the whole point of these seeds. `recordData()` puts today in
 * `days` by default, so the suite's ordinary "empty seed" is already a record
 * that carries something; the state under test is the one the store leaves
 * behind when a reader has touched the site without reading it — a schema
 * stamp, a preference, and nothing else.
 */
const CARRIES_NOTHING: ReadonlyArray<[string, RecordSeed]> = [
  ['a migration stamp and nothing else', { days: [] }],
  ['one preference and nothing else', { days: [], prefs: { charKeys: false } }],
  // M12's catalog view is the newest member of `prefs`, and the newest way to
  // write an envelope that carries nothing: pressing a view toggle is not
  // reading the course.
  ['a catalog view and nothing else', { days: [], prefs: { catalogView: 'table' } }],
]

/** The classes and properties channel A uses to draw progress, either track. */
const PROGRESS_CLASS = /^hl-(?:e-)?(?:signed-|cat-)/
const PROGRESS_PROPERTY = /--bz-(?:e)?done-/

for (const [what, seed] of CARRIES_NOTHING) {
  test(`a record carrying ${what} stamps no progress (§15.11)`, async ({ page }) => {
    const problems = watchPage(page)
    await probeFirstPaint(page)
    await seedRecord(page, seed)
    await page.goto('/')

    // The key IS in storage and it parses, so what follows is the boot script
    // applying the rule rather than having failed to read anything.
    expect(await readRawRecord(page)).not.toBeNull()
    const painted = (await firstPaint(page))!
    expect(painted.storage).toBe('ok')
    expect(painted.className.split(/\s+/).filter((token) => PROGRESS_CLASS.test(token))).toEqual([])
    expect((await page.locator('html').getAttribute('style')) ?? '').not.toMatch(PROGRESS_PROPERTY)

    expect(problems.consoleErrors).toEqual([])
    expect(problems.failedRequests).toEqual([])
  })
}

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
// §13.1.4, §10.4 — a level is never told apart by colour alone
// ---------------------------------------------------------------------------

test(`the way in opens the catalog at ${INDEX_SHEET}`, async ({ page }) => {
  const problems = watchPage(page)
  await page.goto('/')

  const way = page.locator('#gate').getByRole('link', { name: 'Open the curriculum', exact: true })
  await expect(way).toHaveAttribute('href', INDEX_SHEET)
  // DESIGN.md, Components — one `button-primary` per screen region, and this is
  // the gate's.
  await expect(way).toHaveClass(/bz-btn/)
  await way.click()
  await expect(page).toHaveURL(new RegExp(`${INDEX_SHEET}$`))
  // What the door opens on is the catalog's default view (D13); the table is
  // one keystroke away and `catalog.spec.ts` owns the toggle.
  await expect(page.locator('.bz-view[data-view="overview"]')).toBeVisible()

  expect(problems.consoleErrors).toEqual([])
  expect(problems.failedRequests).toEqual([])
})

test('a level door opens that level, and the page it leaves still works', async ({ page }) => {
  const problems = watchPage(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  const level = SHEETS[0].category
  const door = page.locator(`.bz-street .door[data-cat="${level}"]`)
  await door.click()
  await expect(page).toHaveURL(new RegExp(`${INDEX_SHEET}${level}/$`))
  await page.goBack()
  await expect(page.locator('main h1')).toHaveText(
    'AI Engineering, written by the people who build it.',
  )

  expect(problems.consoleErrors).toEqual([])
  expect(problems.failedRequests).toEqual([])
})

/* The welcome at each door (2026-10-14): a tray of lokum offered while the door
   is pointed at, and put away after. Asserted twice because two mechanisms
   carry it: `home.css` alone under reduced motion, and the island's timeline
   when motion is allowed. The narrow window keeps the doors in the stack, where
   they sit in the document rather than at the far end of the walk. */
for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`a door offers a tray of lokum while it is pointed at, and only then (${reducedMotion})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 700, height: 1000 })
    await page.emulateMedia({ reducedMotion })
    await page.goto('/')

    const door = page.locator('.bz-street .door').first()
    const offer = door.locator('.tray .offer')
    await door.scrollIntoViewIfNeeded()
    await expect(offer).toHaveCSS('opacity', '0')
    // The tray is drawn over the door, so it must never take the click.
    await expect(door.locator('.tray')).toHaveCSS('pointer-events', 'none')

    await door.hover()
    await expect(offer).toHaveCSS('opacity', '1')

    await page.mouse.move(1, 1)
    await expect(offer).toHaveCSS('opacity', '0')
  })
}

// ---------------------------------------------------------------------------
// The track choice: which way the five doors open
// ---------------------------------------------------------------------------

/**
 * The page asks how the reader would like to read, and the doors open into
 * that track. What is asserted is the mechanism, not any wording: every door
 * starts on the For Engineers address (the one that always exists, which is
 * what a link checker reads), a sign swaps ALL of them to the For Everyone
 * address and back, and the choice is written nowhere, so a reader who comes
 * back meets the same question. Each door carries both addresses, so the test
 * needs no list of levels of its own beyond the drawing set's.
 */
const LEVELS = [...new Set(SHEETS.map((sheet) => sheet.category))]
const ENGINEERS = (level: string) => `${INDEX_SHEET}${level}/`
const EVERYONE = (level: string) => `/everyone${INDEX_SHEET}${level}/`

async function doorHrefs(page: Page): Promise<(string | null)[]> {
  return page.locator('.bz-street .door').evaluateAll((doors) => doors.map((door) => door.getAttribute('href')))
}

/** What a reader could have been given to keep the choice with: storage and cookies. */
async function keptAnywhere(page: Page): Promise<string> {
  return page.evaluate(() => JSON.stringify([
    Object.entries(localStorage),
    Object.entries(sessionStorage),
    document.cookie,
  ]))
}

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`a sign opens all five doors into its track, and the other sign opens them back (${reducedMotion})`, async ({
    page,
  }) => {
    const problems = watchPage(page)
    await page.emulateMedia({ reducedMotion })
    await page.goto('/')
    // With motion allowed the choice stands inside the walk, and a control in
    // it is brought into view by being focused, which is how a keyboard reader
    // reaches it; with motion reduced it is already in the page.
    const signFor = (track: 'eng' | 'all') => page.locator(`.bz-street [data-choose="${track}"]`)

    // Nothing chosen: the doors open For Engineers, and nothing is pressed.
    expect(await doorHrefs(page)).toEqual(LEVELS.map(ENGINEERS))
    await expect(page.locator('.bz-street [data-choose][aria-pressed="true"]')).toHaveCount(0)
    const before = await keptAnywhere(page)

    await signFor('all').focus()
    await signFor('all').click()
    expect(await doorHrefs(page)).toEqual(LEVELS.map(EVERYONE))
    await expect(signFor('all')).toHaveAttribute('aria-pressed', 'true')
    await expect(signFor('eng')).toHaveAttribute('aria-pressed', 'false')
    // Colour is not the only signal: the chosen sign says so in words, and the
    // other one does not.
    await expect(signFor('all').locator('.sg-on')).toBeVisible()
    await expect(signFor('all').locator('.sg-on')).toHaveText('Chosen')
    await expect(signFor('eng').locator('.sg-on')).toBeHidden()

    await signFor('eng').focus()
    await signFor('eng').click()
    expect(await doorHrefs(page)).toEqual(LEVELS.map(ENGINEERS))
    await expect(signFor('eng')).toHaveAttribute('aria-pressed', 'true')
    await expect(signFor('all')).toHaveAttribute('aria-pressed', 'false')

    // Nothing was saved: not a record, not storage, not a cookie.
    expect(await keptAnywhere(page)).toBe(before)

    expect(problems.consoleErrors).toEqual([])
    expect(problems.failedRequests).toEqual([])
  })
}

test('with no choice made the doors say they open For Engineers, and the line under them switches', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  const line = page.locator('.bz-street [data-switch-line]')
  await expect(line).toContainText('These doors open For Engineers')
  const switcher = line.locator('[data-switch]')
  await expect(switcher).toContainText('For Everyone')
  expect(await doorHrefs(page)).toEqual(LEVELS.map(ENGINEERS))

  await switcher.click()
  expect(await doorHrefs(page)).toEqual(LEVELS.map(EVERYONE))
  await expect(line).toContainText('These doors open For Everyone')
  await expect(switcher).toContainText('For Engineers')
  // Switching from the line is a choice like any other: it marks the sign.
  await expect(page.locator('.bz-street [data-choose="all"]')).toHaveAttribute('aria-pressed', 'true')

  await switcher.click()
  expect(await doorHrefs(page)).toEqual(LEVELS.map(ENGINEERS))
})

test('every door carries both addresses, and its default is always the For Engineers one', async ({
  page,
}) => {
  await page.goto('/')
  const doors = await page.locator('.bz-street .door').evaluateAll((all) => all.map((door) => ({
    cat: (door as HTMLElement).dataset.cat,
    href: door.getAttribute('href'),
    eng: (door as HTMLElement).dataset.hrefEng,
    all: (door as HTMLElement).dataset.hrefAll,
  })))
  expect(doors.map((door) => door.cat)).toEqual(LEVELS)
  for (const door of doors) {
    expect(door.href).toBe(door.eng)
    expect(door.eng).toBe(ENGINEERS(door.cat!))
    expect(door.all).toBe(EVERYONE(door.cat!))
  }
})

test('a door opens the track that was chosen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.locator('.bz-street [data-choose="all"]').click()

  const level = LEVELS[0]
  await page.locator(`.bz-street .door[data-cat="${level}"]`).click()
  await expect(page).toHaveURL(new RegExp(`${EVERYONE(level)}?$`))
  // And the page it lands on is that track's, by the bar's own account.
  await expect(page.getByRole('navigation', { name: 'Track' }).getByRole('link', { name: /For Everyone/ }))
    .toHaveAttribute('aria-current', 'true')
})

test('the track choice and its two characters stack on a phone without pushing the page sideways', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  for (const track of ['eng', 'all']) {
    const sign = page.locator(`.bz-street [data-choose="${track}"]`)
    await sign.scrollIntoViewIfNeeded()
    await expect(sign).toBeVisible()
    const box = (await sign.boundingBox())!
    expect(box.x, 'a sign starts off the left edge').toBeGreaterThanOrEqual(0)
    expect(box.x + box.width, 'a sign runs off the right edge').toBeLessThanOrEqual(390)
  }
  // A caption names each character, Turkish first and the English in brackets.
  await expect(page.locator('.bz-street .who')).toHaveCount(2)
  for (const who of await page.locator('.bz-street .who').all()) {
    await expect(who).toHaveText(/^\S.* \(\S.*\)$/)
  }
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(sideways).toBeLessThanOrEqual(0)
})

// ---------------------------------------------------------------------------
// The record survives the page it is edited from
// ---------------------------------------------------------------------------

