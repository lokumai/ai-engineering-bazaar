import { type Page, expect, test } from '@playwright/test'
import { NAME_SCOPE } from '@/lib/record/scope'
import {
  documentLoads,
  firstPaint,
  hasRootClass,
  probeFirstPaint,
  readRawRecord,
  readRecord,
  readoutCell,
  readoutCells,
  seedRecord,
  seedTheme,
  signedSheet,
  slugOf,
  waitForHydratedReadout,
  waitForRecord,
  waitForSheet,
} from './record'
import { A0, CATEGORY_PATHS, CHECKLIST_ITEMS, INDEX_SHEET, SHEETS, sheetByModule } from './sheets'
import { showTable } from './views'
import { watchPage } from './watch'

/**
 * §12 THE RECORD, on a module sheet, in a real engine.
 *
 * `playwright.config.ts` states the division: Vitest covers everything that
 * computes a value, and this covers what only a browser can answer. For §12
 * that line falls in five specific places, and every test below is on one side
 * of it:
 *
 * 1. **§12.2's two channels are a claim about *when*.** Channel A is a blocking
 *    script in `<head>`, and the only reading that separates it from a
 *    `useEffect` doing the same thing a frame later is one taken inside the
 *    first `requestAnimationFrame` — before the first paint and before any
 *    React effect. `record.ts`'s probe is `theme.spec.ts`'s, for the same
 *    reason: an effect passes every assertion taken after load while still
 *    showing the reader a mascot with no state in frame one.
 * 2. **Channel A has to survive a client transition.** Every navigation on this
 *    site is a `<Link>`, so a stamp that is only correct because the browser
 *    fetched a fresh document is correct for one page view and wrong for the
 *    rest of the session. Nothing but a real router can be asked this.
 * 3. **`localStorage` is real here.** The unit suite drives the store through a
 *    `Map`-backed fake behind the port (§12.14.2), which is the right shape for
 *    the reducers and cannot tell you that the value came back after a reload,
 *    that §12.1.4's 500 ms trailing flush actually landed, or that the boot
 *    script can parse what the store wrote.
 * 4. **Computed style is the state.** §12.2 moved the mascot's six faces onto
 *    CSS keyed off `<html>`; whether `hl-cat-intermediate-started` really draws
 *    that face at `--stroke-struct` is a cascade question, and only an engine
 *    resolves a cascade.
 * 5. **§12.16 is keys, focus and modifiers.** `lib/record/keys.ts` is pure and
 *    exhaustively unit-tested over *described* events; that a `?` typed into a
 *    textarea reaches the map at all is a DOM fact.
 *
 * Sheet 13 (`intermediate/security`) is the subject throughout, and not
 * arbitrarily: it is the only sheet in the corpus that carries all four stamp
 * slots — the checklist's eight items are its alone (§12.7) — so its title
 * block is the only place the full §7.4 grid can be read.
 */

/** Sheet 13 — the widest sheet, and the only one with a checklist (§12.7). */
const SHEET = A0
const SLUG = slugOf(SHEET)
/** Sheet 1 — a sheet in a *different* subsystem, for §12.2's category stamps. */
const OTHER = sheetByModule(1)
const OTHER_SLUG = slugOf(OTHER)

/**
 * §12.13 class 1 — what the readout prints when nothing has been recorded.
 *
 * M13 / O2 — two cells, not four. `XP`, `Rank` and the next threshold left the
 * strip when nobody could name the question they answered, and `Reading time`
 * arrived in XP's place: the modules' own declared minutes over the modules the
 * reader has completed, which is `0 m` for a record that holds nothing. The
 * exact cell list is asserted rather than a subset, so a cell put back is a red
 * test rather than a strip that quietly grew again.
 */
const EMPTY_READOUT = [`Completed 00/${SHEETS.length}`, 'Reading time 0 m']
/** §12.2 — what it prints before the store has answered at all. */
const NO_READING = [`Completed --/${SHEETS.length}`, 'Reading time --']

/**
 * The hash the page prints for THIS FILE, read off the footer.
 *
 * It used to be the title block's `REVISION` row. M16 stage 5 replaced that
 * twelve-row panel with `01`'s three spans and stopped printing the revision
 * twice — §5.2 already gives it to the footer, which is where a drawing's
 * revision belongs. So this reads the one printer that is left, and the
 * sign-off still signs against the same hash it always did.
 */
function printedRevision(page: Page) {
  return page.locator('footer')
}

/**
 * 2026-10-11 — a module is completed with ONE checkbox, `Mark this module as
 * complete`, where it was a `Complete` button with a separate `Un-complete`
 * beside it. Found by its role and its name, so a restyle cannot hide it.
 */
const completion = (page: Page) =>
  page.getByRole('checkbox', { name: 'Mark this module as complete' })
const anyDialog = (page: Page) => page.locator('[role="dialog"], [role="alertdialog"], dialog')

/*
  FOUR LOCATORS THAT EXIST TO BE SHARED, not to save typing.

  Each of these is asserted ABSENT somewhere in this file — the drift line when
  nothing is signed, the reveal before an answer is written, the `g` hint after
  Escape, a submittal registered from a hostile URL. `toHaveCount(0)` is a
  passing assertion against a selector that matches nothing, so an absence test
  that writes its own selector string stops testing anything the moment the
  class is renamed, and reports green while doing it.

  Naming each one once fixes that structurally: every absence assertion below
  now shares a selector with a PRESENCE assertion, so a rename turns the
  presence test red and the pair stays honest. This is the shape M16 has
  already been bitten by four times, and the rename that these four are waiting
  for is stages 7 and 8.
*/
const pendingHint = (page: Page) => page.locator('.bz-pending')

/**
 * Every `window.confirm`, `alert` and `beforeunload` this page raised.
 *
 * Playwright dismisses dialogs automatically, so an unasserted native
 * confirmation is invisible: the click still works and the test still passes.
 * §12.4.1 forbids one on sign-off and un-sign — a dialog on a routine action
 * trains the reader to auto-confirm the one that matters — so it has to be
 * watched for rather than assumed away.
 */
function watchDialogs(page: Page): string[] {
  const raised: string[] = []
  page.on('dialog', (dialog) => {
    raised.push(`${dialog.type()}: ${dialog.message()}`)
    void dialog.dismiss()
  })
  return raised
}

// ---------------------------------------------------------------------------
// §12.2, §12.13 class 1 — the honest empty first frame
// ---------------------------------------------------------------------------

/**
 * The frame before any script has run, read as a DOM rather than inferred.
 *
 * A context with scripts off is the exported bytes exactly: no theme boot
 * script, no record boot script, no hydration. That is both §12.2's
 * pre-hydration frame and §10.4's no-JS floor, and it is the one state in which
 * "the build genuinely does not know who is reading" can be checked instead of
 * argued about.
 */
test('the module as exported is the honest empty form (§12.2, §12.13 class 1)', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto(SHEET.path)

  // §12.4.1 — the control is on the sheet from the first visit, unpressed.
  await expect(completion(page)).not.toBeChecked()

  // The `Checked by` and `Repositories` rows left the module page with the
  // `Marked by` card on 2026-10-11; the profile page still prints them.
  await expect(page.locator('.bz-card-facts')).toHaveCount(0)

  // The module's stamps (§7.4) left the page with the rest of the `Marked by`
  // card on 2026-10-11.
  await expect(page.locator('.bz-stamp')).toHaveCount(0)

  // §12.2 — `--` is not `00/32`. The first says "no reading", the second says
  // "nothing recorded", and only the second is a fact about the reader.
  await expect(readoutCells(page)).toHaveText(NO_READING)
  await expect(page.locator('footer .bz-readout')).toHaveAttribute('data-hydrated', 'false')

  await context.close()
})

test('with nothing recorded the module settles on 00/32, not on -- (§12.2 channel B)', async ({
  page,
}) => {
  const problems = watchPage(page)
  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)

  await expect(readoutCells(page)).toHaveText(EMPTY_READOUT)
  await expect(completion(page)).not.toBeChecked()

  // A channel-B readout that mismatched its own prerender would be logged here
  // as a recoverable hydration error, which is the failure `suppressHydrationWarning`
  // would hide rather than fix (§12.2).
  expect(problems.consoleErrors).toEqual([])
  expect(problems.failedRequests).toEqual([])
})

// ---------------------------------------------------------------------------
// §12.2 Channel A — before the first paint
// ---------------------------------------------------------------------------

test('a seeded record stamps <html> inside the first frame (§12.2 channel A)', async ({
  page,
}) => {
  await seedRecord(page, { sheets: { [SLUG]: signedSheet('b7225f8') } })
  await probeFirstPaint(page)
  await page.goto(SHEET.path)

  const painted = await firstPaint(page)
  expect(painted, 'the probe never ran').toBeDefined()
  // Sheet 13, by module number, because that is what the CSS selectors key off;
  // the record itself is keyed by slug (§12.1.3) and the boot script maps one to
  // the other from a build-time table.
  expect(painted!.className).toContain(`hl-signed-${SHEET.module}`)
  expect(painted!.className).toContain(`hl-cat-${SHEET.category}-started`)
  // §12.2's other two stamps, in the same frame: one says a record was read, the
  // other is what tells §12.13's class 1 from its class 4.
  expect(painted!.record).toBe('1')
  expect(painted!.storage).toBe('ok')

  // And the reading is genuinely pre-React, which is what makes the three above
  // mean anything. **This used to be asserted as `painted.hydrated !== 'true'`,
  // and that proxy is wrong** — kept here in full because the reason is the
  // useful part.
  //
  // The argument was: `hydrated` comes off `.bz-readout`, 82.5 KB into a 211 KB
  // document, and the probe fires on the first `requestAnimationFrame`, so the
  // browser can paint before that element is parsed; `null` is therefore a
  // STRONGER reading than `false`, and only an already-published `true` could
  // contradict §12.2.
  //
  // It can. MEASURED under eight parallel workers, twice out of two runs, with
  // a warm HTTP cache: all three stamps above were correct in the pre-paint
  // frame AND `hydrated` read `true`. Under CPU contention the main thread
  // parses the document and runs React's hydration in one long task, and the
  // browser produces no frame — so no `requestAnimationFrame` callback — until
  // that task ends. React beating the first PAINT contradicts nothing in
  // §12.2: what §12.2 claims is that the stamps are on `<html>` before any
  // paint and without React's help, and the three assertions above are what
  // measure it. The proxy was measuring scheduler load. See
  // `kia-context/logs/BRAINSTORM.md` D20.
  //
  // What replaces it cannot be raced at all, because it is structural rather
  // than temporal: the reason channel A is pre-paint is that the script is
  // INLINE AND BLOCKING INSIDE `<head>`. Read off the served document, not off
  // the live DOM, so a bundle that moved the script to the end of `<body>`, or
  // deferred it, or replaced it with an effect, fails here — which is the
  // regression the old line was reaching for.
  const served = await page.request.get(SHEET.path)
  const html = await served.text()
  const head = html.slice(0, html.indexOf('</head>'))
  expect(head, 'the record boot script is not inline in <head>').toContain('hl-record')
  expect(head, 'the boot script is deferred, so it is no longer pre-paint')
    .not.toMatch(/<script[^>]+(defer|async)[^>]*>[^<]*hl-record/)

  // The corroboration, taken where there is no race: `data-hydrated` is a real
  // two-state signal, so the `false` the prerender ships is a state the page
  // leaves rather than one it never had. Without this, nothing above would
  // notice an attribute that was hardcoded and meant nothing.
  await expect(page.locator('footer .bz-readout')).toHaveAttribute('data-hydrated', /true|false/)
  await waitForHydratedReadout(page)
  await expect(page.locator('footer .bz-readout')).toHaveAttribute('data-hydrated', 'true')
  await expect(completion(page)).toBeChecked()
})

test('with nothing stored the first frame claims no record (§12.2, §12.13)', async ({ page }) => {
  await probeFirstPaint(page)
  await page.goto(SHEET.path)

  const painted = await firstPaint(page)
  expect(painted).toBeDefined()
  expect(painted!.className).not.toContain('hl-signed-')
  expect(painted!.className).not.toContain('hl-cat-')
  // Absent, not `"0"`: `data-hl-record` is the existence of a record, and
  // storage answered, so the page is class 1 and not class 4.
  expect(painted!.record).toBeNull()
  expect(painted!.storage).toBe('ok')
})

/**
 * §8.2 / §12.2 — the six faces are drawn by CSS from the boot script's classes,
 * so "is the mascot right" is a computed-style question and nothing else.
 *
 * `--stroke-hair` is 1px and `--stroke-struct` is 1.5px, and the whole of
 * §12.2's argument for moving this off React is that the difference is visible
 * in frame one. Reading all six at once is deliberate: a selector that matched
 * too broadly would energise the other five, and that is exactly the bug a
 * single-face assertion cannot see.
 */
test('a started level draws its face at the structural weight (§8.2, §12.2)', async ({
  page,
}) => {
  await seedRecord(page, { sheets: { [SLUG]: signedSheet('b7225f8') } })
  /*
    WHERE THE MASCOT IS. This read `header svg`, and the site header does not
    carry it any more: `01` specifies the brand as a tile — four glazed squares
    from the same series, one left as an outline — and M16 stage 1 built that.
    So the mark moved rather than being lost; it renders at 132px in the
    drafter block on this route, at 96px on `/legend/` and exploded on the 404.

    Located through its own faces rather than through a wrapper class, so this
    anchor survives stage 8's rename of the block around it. `.first()` because
    `/legend/` aside, a page may carry the mark more than once and the register's
    face legend is a second instance.

    The state below is still channel A's and is still the point: the rules that
    set it are `html.hl-cat-<slug>-started|complete`, which went with the
    deleted `lokum.css` and are stage 7's to write. Until they exist this fails
    on merit, which is the correct thing for it to do.
  */
  await page.goto('/profile/')

  const faces = await page
    .locator('svg:has(.bz-face)')
    .first()
    .locator('.bz-face')
    .evaluateAll((paths) =>
      paths.map((path) => [
        path.getAttribute('data-cat') ?? '',
        getComputedStyle(path).strokeWidth,
      ]),
    )

  expect(faces).toHaveLength(CATEGORY_PATHS.length)
  for (const [category, width] of faces) {
    expect(width, `${category} face`).toBe(category === SHEET.category ? '1.5px' : '1px')
  }
})

test('a level with every module completed is hatched, not merely inked (§8.2, §12.2)', async ({
  page,
}) => {
  // `-complete` needs the whole subsystem, and its denominator is a build-time
  // fact the boot script is handed — so this is also the only test that proves
  // the factory embedded the per-category totals at all.
  const category = OTHER.category
  const whole = SHEETS.filter((sheet) => sheet.category === category)
  const sheets = Object.fromEntries(whole.map((sheet) => [slugOf(sheet), signedSheet(null)]))

  await seedRecord(page, { sheets })
  await probeFirstPaint(page)
  // `/profile/` for the same reason as the test above: the header's mark is a
  // tile now, and the mascot draws in the drafter block.
  await page.goto('/profile/')

  expect((await firstPaint(page))!.className).toContain(`hl-cat-${category}-complete`)

  const hatches = await page
    .locator('svg:has(.bz-face-hatch)')
    .first()
    .locator('.bz-face-hatch')
    .evaluateAll((paths) =>
      paths.map((path) => [path.getAttribute('data-cat') ?? '', getComputedStyle(path).display]),
    )

  /*
    ASSERTED, NOT ASSUMED. The loop below is the whole test, and a selector that
    matched nothing would skip it entirely and report green — which is what the
    sibling assertion at the `.bz-face` test above guards against and this one
    did not. A rename is exactly the event that would have silenced it.
  */
  expect(hatches).toHaveLength(CATEGORY_PATHS.length)
  for (const [slug, display] of hatches) {
    expect(display, `${slug} hatch`).toBe(slug === category ? 'block' : 'none')
  }
})

/**
 * §12.2 / §12.18 — `aria-hidden` is unconditional and the markup does not vary.
 *
 * Both halves are hydration correctness rather than politeness. An accessible
 * name that flips between the prerender and the hydrated render is a mismatch,
 * and a child list that depends on state is a *structural* one — React 19
 * answers that by discarding the subtree and re-rendering it, which is a logged
 * recoverable error and a visible repaint of the header on every single load.
 * Comparing the serialised mark across two records is the only way to see that
 * the second has not come back.
 */
test('the mascot is aria-hidden and byte-identical in every state (§12.2, §12.18)', async ({
  page,
}) => {
  // The mark itself, not whatever SVG the header happens to draw first — which
  // since stage 1 is `01`'s four-square tile and not this component at all.
  const mascot = page.locator('svg:has(.bz-face)').first()

  await page.goto('/profile/')
  await expect(mascot).toHaveAttribute('aria-hidden', 'true')
  const unseeded = await mascot.evaluate((node) => node.outerHTML)

  await seedRecord(page, { sheets: { [SLUG]: signedSheet('b7225f8') } })
  await page.goto('/profile/')
  await expect(mascot).toHaveAttribute('aria-hidden', 'true')
  const seeded = await mascot.evaluate((node) => node.outerHTML)

  expect(seeded).toBe(unseeded)
  // Both hatch patterns are always in `<defs>` and every face always drawn: an
  // unused `<pattern>` paints nothing, a conditional one paints a mismatch. Read
  // off the mark itself, since the header's tile has `<defs>` of its own.
  expect(await mascot.locator('defs pattern').count()).toBe(2)
})

/**
 * §12.2 — the case that was a real bug: a client transition never reloads the
 * document, so nothing re-runs the boot script.
 *
 * `performance.getEntriesByType('navigation')` is the witness. One entry means
 * the whole run happened inside one document, which is the only condition under
 * which the assertion at the end means anything: if the router had done a full
 * load, the boot script would have re-stamped `<html>` and the test would pass
 * while the bug was still there.
 *
 * §15.2.1 raised the stakes: the route this run passes through is now the home
 * screen, whose *visible* half is chosen by nothing but the `data-hl-record`
 * this same stamp carries. So the hop through `/` reads the two blocks' computed
 * display as well as the class list — on a document the router built rather than
 * the browser loaded, which is the only place a stamp that survives a fresh load
 * and nothing else would show.
 */
test('channel A stays true across a client transition (§12.2)', async ({ page }) => {
  const problems = watchPage(page)
  // A name on record, so the §12.3.2 prompt never opens: this test is about the
  // stamps, and a form in the middle of it would be a second subject.
  await seedRecord(page, { identity: { name: 'Ada Lovelace', markSeed: '0123abcd' } })

  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)
  await completion(page).check()
  await expect(completion(page)).toBeChecked()
  expect(await hasRootClass(page, `hl-signed-${SHEET.module}`)).toBe(true)
  expect(await hasRootClass(page, `hl-cat-${SHEET.category}-started`)).toBe(true)
  expect(await hasRootClass(page, `hl-cat-${OTHER.category}-started`)).toBe(false)

  // Three `<Link>` hops into another subsystem, with no document load between:
  // the sheet to the home screen, the home screen to the manifest at
  // `INDEX_SHEET`, and the manifest into the other subsystem's sheet. It was two
  // until §15.1 moved the flat table off `/`; the hop through the home screen is
  // kept rather than routed around, because that is the page whose content the
  // stamp now chooses.
  //
  // Scoped to the banner. `getByRole('link', { name: /^Lokum/ })` on the whole
  // page meant the wordmark for as long as it was the only link whose name
  // began that way; the footer's `LokumAI` made it two and the strict-mode
  // violation was the locator's looseness surfacing, not a regression. What
  // this hop needs is the home link in the header, so that is what it asks for.
  // The WORDMARK, which M16 stage 1 took from the mockup: `01`'s `.brand`
  // reads "AI Engineering Bazaar". It said "Lokum" until then, and scoping to
  // the banner is still what keeps the footer's own LokumAI link out of it.
  await page.getByRole('banner').getByRole('link', { name: /Bazaar/ }).click()
  await expect(page.locator('h1.bz-hero-title')).toBeVisible()

  /* §15.2.1 — the stamp, read as the reader meets it. A stamp lost in a client
     transition would take the reader's own state away from them a frame after
     they earned it, and every navigation on this site is a client transition.

     **M18 removed both of the things this used to read on the home page** — the
     continue block and control C's tick — so the assertion is on the stamp
     itself, which is what `stampRecordState` is responsible for and what was
     broken when this test was written. The tick is asserted on the page that
     still draws it, two steps below. */
  await expect(page.locator('html')).toHaveAttribute('data-hl-record', '1')

  await page.getByRole('link', { name: 'Your progress', exact: true }).click()
  await expect(page).toHaveURL(/\/profile\/$/)
  await expect(page.locator('html')).toHaveAttribute('data-hl-record', '1')
  await expect(
    page.locator(`.bz-cmod[data-module="${SHEET.module}"] .bz-cmod-mark`),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Home', exact: true }).first().click()
  await expect(page.locator('h1.bz-hero-title')).toBeVisible()

  await page.getByRole('link', { name: 'Browse the catalog' }).click()
  await expect(page).toHaveURL(new RegExp(`${INDEX_SHEET}$`))
  // M12 — the catalog renders three views over one array and CSS reveals one
  // (D13). The row link is in the table view, which is not the one showing by
  // default, so this hop asks for it: a `display: none` row is not clickable
  // and that is the arrangement working, not failing.
  await showTable(page)
  await page.locator(`.bz-table tbody a[href$="${OTHER.path}"]`).click()
  await expect(page.locator('main h1')).toHaveText(OTHER.title)
  expect(await documentLoads(page), 'the router did a full page load').toBe(1)

  await completion(page).check()
  await expect(completion(page)).toBeChecked()

  // The stamp the boot script could not have known about, applied with no reload.
  expect(await hasRootClass(page, `hl-cat-${OTHER.category}-started`)).toBe(true)
  expect(await hasRootClass(page, `hl-signed-${OTHER.module}`)).toBe(true)
  // And the earlier one is still there: this keeps the stamps true, it does not
  // replace them with the current page's.
  expect(await hasRootClass(page, `hl-signed-${SHEET.module}`)).toBe(true)
  expect(await documentLoads(page)).toBe(1)

  expect(problems.consoleErrors).toEqual([])
})

// ---------------------------------------------------------------------------
// §12.4 — sign-off, the completion primitive
// ---------------------------------------------------------------------------

test('sign-off records the module’s own revision and survives a reload (§12.4.1, §12.4.3)', async ({
  page,
}) => {
  await seedRecord(page, { identity: { name: 'Ada Lovelace', markSeed: '0123abcd' } })
  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)

  const printed = await printedRevision(page).innerText()
  const revision = printed.match(/Rev ([0-9a-f]{7,40})/i)?.[1] ?? ''
  expect(revision, 'the module printed no revision to sign against').toMatch(/^[0-9a-f]{7,40}$/)

  await completion(page).check()

  // §12.4.1 — the control states the assertion and its date, and `UNSIGN` is
  // adjacent rather than hidden behind the pressed toggle.
  await expect(completion(page)).toBeChecked()
  // The date it was completed, said once beside the box.
  await expect(page.locator('.bz-complete-when')).toHaveText(/^Completed \d{1,2} \w{3} \d{4}$/)

  // §12.4.3 — the hash AT sign-off, which is what makes the drift line possible
  // later. The record must hold the sheet's own printed REV, not HEAD.
  const stored = await waitForSheet(page, SLUG, (sheet) => sheet?.signedOff != null)
  expect(stored.signedRevision).toBe(revision)
  expect(stored.signedOff).toMatch(/^\d{4}-\d{2}-\d{2}T/)

  // The whole point of §12.1.4's flush: it came back.
  await page.reload()
  await expect(completion(page)).toBeChecked()
  expect(await hasRootClass(page, `hl-signed-${SHEET.module}`)).toBe(true)
})

test('un-complete reverses the assertion and clears its channel-A stamp (§12.4.1)', async ({
  page,
}) => {
  await seedRecord(page, {
    sheets: { [SLUG]: signedSheet('b7225f8') },
    identity: { name: 'Ada Lovelace', markSeed: '0123abcd' },
  })
  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)
  expect(await hasRootClass(page, `hl-signed-${SHEET.module}`)).toBe(true)

  await completion(page).uncheck()

  await expect(completion(page)).not.toBeChecked()
  // §12.3.1 — not signed off prints `—`, which is a different state from
  // `UNSIGNED`: the first is "nobody signed this", the second is "signed by
  // somebody who declined to give a name".
  // §12.4.3 — with no assertion there is no revision to be adrift from.

  const cleared = await waitForSheet(page, SLUG, (sheet) => sheet?.signedOff == null)
  expect(cleared.signedRevision).toBeNull()
  expect(await hasRootClass(page, `hl-signed-${SHEET.module}`)).toBe(false)
  expect(await hasRootClass(page, `hl-cat-${SHEET.category}-started`)).toBe(false)
})

test('neither sign-off nor un-complete raises a confirmation (§12.4.1, §12.15)', async ({ page }) => {
  const raised = watchDialogs(page)
  await seedRecord(page, { identity: { name: 'Ada Lovelace', markSeed: '0123abcd' } })
  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)

  await completion(page).check()
  await expect(completion(page)).toBeChecked()
  expect(raised, 'sign-off raised a dialog').toEqual([])
  await expect(anyDialog(page)).toHaveCount(0)

  await completion(page).uncheck()
  await expect(completion(page)).not.toBeChecked()
  // Un-sign is its own undo. §12.15's erase is the only confirmation on this
  // site, and it only works because nothing else spends the reader's attention.
  expect(raised, 'un-complete raised a dialog').toEqual([])
  await expect(anyDialog(page)).toHaveCount(0)
})

// ---------------------------------------------------------------------------
// §12.3.5 — the mark seed, minted once
// ---------------------------------------------------------------------------

test('the first sign-off mints one mark seed and nothing mints a second (§12.3.5)', async ({
  page,
}) => {
  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)
  expect((await readRecord(page))?.data.identity.markSeed ?? null).toBeNull()

  await completion(page).check()
  const minted = (await waitForRecord(page, (env) => env?.data.identity.markSeed != null)).data
    .identity.markSeed
  // §12.3.5 — 8 lowercase hex, four bytes from the CSPRNG, never derived from
  // the name: a name-derived mark would silently change on every already-signed
  // sheet the moment the reader renamed themselves.
  expect(minted).toMatch(/^[0-9a-f]{8}$/)

  // A SECOND sign-off, on another sheet, is not a second mint.
  await page.goto(OTHER.path)
  await completion(page).check()
  await waitForSheet(page, OTHER_SLUG, (sheet) => sheet?.signedOff != null)
  expect((await readRecord(page))?.data.identity.markSeed).toBe(minted)

  // Neither is a rename, which is §12.3.5's whole point: the mark is generated
  // from the seed, so an identity edit cannot retroactively alter an artefact
  // the reader has already signed.
  await page.goto('/profile/')
  await page.getByRole('textbox', { name: /Name or initials/ }).fill('Ada Lovelace')
  await page.getByRole('button', { name: 'SAVE NAME', exact: true }).click()
  const renamed = await waitForRecord(page, (env) => env?.data.identity.name === 'Ada Lovelace')
  expect(renamed.data.identity.markSeed).toBe(minted)
})

// ---------------------------------------------------------------------------
// §12.3.2, §12.3.3 — the name, asked for once
// ---------------------------------------------------------------------------

test('there is no first-run gate anywhere on the index (§12.3.2)', async ({ page }) => {
  const problems = watchPage(page)
  await page.goto('/')
  await waitForHydratedReadout(page)

  // No modal, no tour, no coach marks, no name prompt before the index: a
  // controlled study of 70 users across 4 apps found tutorial-viewers rated
  // tasks significantly harder with no gain in success or speed.
  await expect(anyDialog(page)).toHaveCount(0)
  await expect(page.getByRole('textbox')).toHaveCount(0)
  await expect(page.locator('input[autocomplete="nickname"]')).toHaveCount(0)
  expect(problems.consoleErrors).toEqual([])
})

// ---------------------------------------------------------------------------
// §12.6 — the Quick Check
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// §12.7 — the checklist
// ---------------------------------------------------------------------------

test('the task items are real, named checkboxes and a tick survives a reload (§12.7)', async ({
  page,
}) => {
  await page.goto(SHEET.path)

  const boxes = page.locator('[data-hl-prose]').getByRole('checkbox')
  await expect(boxes).toHaveCount(CHECKLIST_ITEMS)

  for (const box of await boxes.all()) {
    await expect(box).toBeEnabled()
    // §6.4's problem, solved rather than avoided: the item's text is a SIBLING
    // of the box, so it contributes nothing to the accessible name and the
    // island has to supply one. Without it these are nameless checkboxes.
    const name = (await box.getAttribute('aria-label')) ?? ''
    expect(name.trim().length, 'a checkbox with no accessible name').toBeGreaterThan(0)
  }

  const first = page.locator('li.task-list-item').first()
  await boxes.first().check()
  await expect(first).toHaveAttribute('data-ticked', 'true')

  await page.reload()
  await expect(page.locator('[data-hl-prose]').getByRole('checkbox').first()).toBeChecked()
  await expect(page.locator('li.task-list-item').first()).toHaveAttribute('data-ticked', 'true')
  expect((await readRecord(page))?.data.sheets[SLUG]?.checklist).toEqual({ '0': true })
})

test('ticking every item moves no instrument, and a ticked item is not struck through (§12.7)', async ({
  page,
}) => {
  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)

  const boxes = page.locator('[data-hl-prose]').getByRole('checkbox')
  const total = await boxes.count()
  for (let index = 0; index < total; index += 1) await boxes.nth(index).check()

  // M13 / O2 — the checklist used to pay a flat 40 and this line read
  // `XP 40`. The points are gone from every instrument on the site, so what
  // is asserted now is that the checklist moves NEITHER cell: ticking eight
  // boxes is not completing a module and is not reading time either. The
  // record below is where the eight ticks are checked.
  await expect(readoutCell(page, /^Completed/)).toHaveText(`Completed 00/${SHEETS.length}`)
  await expect(readoutCell(page, /^Reading time/)).toHaveText('Reading time 0 m')
  const stored = await waitForSheet(page, SLUG, (sheet) =>
    Object.keys(sheet?.checklist ?? {}).length === total,
  )
  expect(Object.keys(stored.checklist).sort()).toEqual(
    Array.from({ length: total }, (_, index) => String(index)).sort(),
  )

  // §7.2 — NO strikethrough. A struck-through line reads as cancelled, and a
  // completed check is the opposite of cancelled.
  const decorations = await page
    .locator('li.task-list-item[data-ticked="true"]')
    .evaluateAll((items) => items.map((item) => getComputedStyle(item).textDecorationLine))
  expect(decorations).toHaveLength(total)
  for (const decoration of decorations) expect(decoration).toBe('none')
})

// ---------------------------------------------------------------------------
// §12.16 — the keyboard map
// ---------------------------------------------------------------------------

test('g is a mode rather than a race, and Escape clears it (§12.16, SC 2.1.1)', async ({
  page,
}) => {
  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)

  await page.keyboard.press('g')
  // The mode is VISIBLE while it is held, in `role="status"` — SC 4.1.3 covers
  // exactly this: a state change with no focus move. `g …` in the key's own
  // case, because a hint that does not match the key you pressed is not a hint.
  const pending = pendingHint(page)
  await expect(pending).toBeVisible()
  await expect(pending).toHaveText('g …')
  await expect(pending).toHaveAttribute('role', 'status')

  await page.keyboard.press('Escape')
  await expect(pending).toHaveCount(0)
  expect(await documentLoads(page), 'an abandoned g navigated anyway').toBe(1)
})

test('g p reaches the one progress route (§12.16)', async ({ page }) => {
  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)

  // M14 — it was `g d`, for the dashboard. Three of the seven `g` chords named
  // routes that folded into `/profile/`, and the honest thing to do with a
  // chord whose destination is gone is to unbind it rather than repoint it:
  // four keystrokes reaching one page is a shortcut sheet that reads as a
  // mistake. `g p` has meant the reader's own record since §12.16.
  await page.keyboard.press('g')
  await page.keyboard.press('p')
  await page.waitForURL(/\/profile\/$/)
  await expect(page.locator('main h1')).toBeVisible()
})

test('the three chords M14 retired navigate nowhere (§12.16)', async ({ page }) => {
  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)

  // A mistyped chord does nothing at all, which is the whole difference between
  // a mode and a race — and it is what an unbound second key has always done.
  // Asserted as the absence of a navigation rather than as a key that "does
  // nothing", because the failure this guards against is `g d` quietly landing
  // on a page whose first heading is something else.
  for (const key of ['d', 'r', 'l']) {
    await page.keyboard.press('g')
    await page.keyboard.press(key)
  }
  await expect(page).toHaveURL(new RegExp(`${SHEET.path}$`))
  expect(await documentLoads(page), 'a retired chord navigated anyway').toBe(1)
})

test('? opens the keyboard shortcuts and Escape closes it (§12.16)', async ({ page }) => {
  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)

  await page.keyboard.press('?')
  const sheet = anyDialog(page)
  await expect(sheet).toHaveCount(1)
  // The dialog lists §12.16's own table, so the map and its documentation
  // cannot drift apart.
  // The source case, not the rendered one: `.hl-mark` uppercases these in CSS,
  // and asserting the transformed text would pass on a stylesheet that had
  // stopped loading (§3.4).
  await expect(sheet).toContainText('Keyboard shortcuts')
  await expect(sheet).toContainText('Keyboard shortcuts')
  // M14 — four `g` rows, not seven: `g d`, `g r` and `g l` went with the three
  // routes that folded into `/profile/`.
  for (const row of ['g h', 'g i', 'g p', 'g c', '[ / ]', 'j / k', 'Esc'])
    await expect(sheet).toContainText(row)

  await page.keyboard.press('Escape')
  await expect(sheet).toHaveCount(0)
})

test('. toggles the theme and s signs off the current module (§12.16)', async ({ page }) => {
  await seedTheme(page, 'light')
  await seedRecord(page, { identity: { name: 'Ada Lovelace', markSeed: '0123abcd' } })
  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)
  expect(await hasRootClass(page, 'dark')).toBe(false)

  await page.keyboard.press('.')
  expect(await hasRootClass(page, 'dark')).toBe(true)

  // §12.16 — `s` clicks the sheet's own control by attribute, so the whole of
  // the assertion (the criteria, the date, the revision) stays on the sheet and
  // the shortcut carries none of it.
  await page.keyboard.press('s')
  await expect(completion(page)).toBeChecked()
  await waitForSheet(page, SLUG, (record) => record?.signedOff != null)

  // It is a toggle, and un-sign needs no confirmation either.
  await page.keyboard.press('s')
  await expect(completion(page)).not.toBeChecked()
})

test('no character shortcut fires from inside a text field (§12.16)', async ({ page }) => {
  await seedTheme(page, 'light')
  // The progress page's name field. A module page has no text field since the
  // module's own written quick check left it on 2026-10-11, and the guard is
  // about any field the reader types into, wherever it is.
  await page.goto('/profile/')
  await waitForHydratedReadout(page)

  // On screen at load: the drafter block is the one part of the page that is
  // not a disclosure (§16.1).
  const answer = page.getByRole('textbox', { name: /Name or initials/ })
  await answer.focus()
  for (const key of ['s', '.', '?', 'g', 'j', '[']) await page.keyboard.press(key)

  // Every one of them is a character the reader was typing. The guard is what
  // stops a reader typing `s3` from completing a module mid-word.
  expect(await answer.inputValue()).toBe('s.?gj[')
  await expect(anyDialog(page)).toHaveCount(0)
  await expect(pendingHint(page)).toHaveCount(0)
  expect(await hasRootClass(page, 'dark')).toBe(false)
})

test('no character shortcut fires with a modifier held (§12.16)', async ({ page }) => {
  await seedTheme(page, 'light')
  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)
  await page.locator('main h1').click()

  // The modifier guard returns FIRST, before SC 2.1.4's off switch, because a
  // chord belongs to the browser and to the platform rather than to this map.
  await page.keyboard.press('Alt+s')
  await page.keyboard.press('Alt+.')
  await page.keyboard.press('Alt+g')

  await expect(completion(page)).not.toBeChecked()
  expect(await hasRootClass(page, 'dark')).toBe(false)
  await expect(pendingHint(page)).toHaveCount(0)
})

test('prefs.charKeys off silences every character shortcut (§12.16, SC 2.1.4)', async ({
  page,
}) => {
  await seedTheme(page, 'light')
  await seedRecord(page, { prefs: { charKeys: false } })
  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)
  await page.locator('main h1').click()

  for (const key of ['s', '.', '?', 'g']) await page.keyboard.press(key)

  // SC 2.1.4's off switch. `?` is itself a character shortcut, so the sheet
  // that documents the map is inside the switch that turns the map off rather
  // than exempt from it.
  await expect(completion(page)).not.toBeChecked()
  await expect(anyDialog(page)).toHaveCount(0)
  await expect(pendingHint(page)).toHaveCount(0)
  expect(await hasRootClass(page, 'dark')).toBe(false)
})

/**
 * Found by bringing the built site up on a clean port and looking at what was in
 * storage: merely LOADING a page wrote an envelope, because the passive
 * `navigator.storage.persisted()` query went through the reducer and `update`
 * schedules a flush.
 *
 * It is worth a test of its own because of what it silently costs. §12.13 tells
 * "never started" apart from "cleared by you" by whether the boot script found
 * an envelope at load — so from a reader's SECOND page view onward, an envelope
 * written by their first would have had the empty state tell them they had
 * cleared a record they never made. And it wrote to a reader's device for a fact
 * about their browser, before they had asked the site to remember anything.
 */
test('reading the site writes nothing until the reader records something (§12.13)', async ({ page }) => {
  const problems = watchPage(page)

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  // Give the store's 500ms trailing flush more than its window.
  await page.waitForTimeout(1200)

  const afterIndex = await readRawRecord(page)
  expect(afterIndex, 'the catalog wrote nothing').toBeNull()

  await page.goto(A0.path)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1200)
  expect(await readRawRecord(page), 'a module module wrote nothing').toBeNull()

  // And the second load still reads as NEVER STARTED rather than CLEARED BY YOU.
  await page.reload()
  await page.waitForLoadState('networkidle')
  expect(
    await page.evaluate(() => document.documentElement.dataset.hlRecord ?? null),
    'no record was found at load, so the empty state stays class 1',
  ).toBeNull()

  // The first real act does write, or the feature would not work at all.
  await page.locator('[data-hl-signoff]').click()
  await page.waitForTimeout(1200)
  expect(await readRawRecord(page), 'signing off writes').not.toBeNull()

  expect(problems.consoleErrors).toEqual([])
  expect(problems.failedRequests).toEqual([])
})

