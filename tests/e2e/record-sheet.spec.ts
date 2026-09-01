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
import { A0, SHEETS, sheetByModule } from './sheets'
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

/** §12.13 class 1 — what the readout prints when nothing has been recorded. */
const EMPTY_READOUT = [`Signed off 00/${SHEETS.length}`, 'XP 0', 'Class —', 'I at 8']
/** §12.2 — what it prints before the store has answered at all. */
const NO_READING = [`Signed off --/${SHEETS.length}`, 'XP --', 'Class --', '-- at --']

/**
 * §7.4 / §5.9 — sheet 13's four slots, every one at zero against its real
 * threshold.
 *
 * `SOURCES OPENED`, not `SOURCES`: the title block prints its own `SOURCES` row
 * counting the citations ON the sheet, and a reader read the two side by side
 * and took the stamp for a broken meter. Seven other places in the project
 * already said "sources opened"; the stamps were the outlier.
 */
const EMPTY_STAMPS = [
  'SIGN-OFF 0 OF 1',
  'QUIZ 0 OF 1',
  'CHECKLIST 0 OF 8',
  'SOURCES OPENED 0 OF 5',
]

/** Both §12.3.1 rows: the A0 right-rail title block, and the strip below the h1. */
function checkedBy(page: Page) {
  return page
    .locator('.hl-title-block-row, .hl-title-strip-pair')
    .filter({ has: page.locator('dt', { hasText: /^CHECKED BY$/ }) })
    .locator('dd')
}

/** The sheet's own printed `REVISION` — what §12.4.3 records a sign-off against. */
function printedRevision(page: Page) {
  return page
    .locator('.hl-title-block-row')
    .filter({ has: page.locator('dt', { hasText: /^REVISION$/ }) })
    .locator('dd')
}

/**
 * §5.9's slot text, whitespace-normalised: `SIGN-OFF 0 OF 1`.
 *
 * VISIBLE slots only. §7.4's grid now renders in both of §5.5's title-block
 * variants, so an A0 sheet carries two of them: the right rail's panel, and the
 * horizontal strip that stands in for it below 1280px. Exactly one is ever on
 * screen — the strip is `xl:hidden`, which is `display: none` and therefore out
 * of the accessibility tree as well — but both are in the DOM, and an unfiltered
 * locator reported each stamp twice.
 */
function stampConditions(page: Page): Promise<string[]> {
  return page
    .locator('.hl-stamp-slot')
    .evaluateAll((slots) =>
      slots
        .filter((slot) => (slot as HTMLElement).checkVisibility())
        .map((slot) => ((slot as HTMLElement).innerText ?? '').replace(/\s+/g, ' ').trim()),
    )
}

const signOff = (page: Page) => page.getByRole('button', { name: 'SIGN OFF', exact: true })
const signedOff = (page: Page) => page.getByRole('button', { name: /^SIGNED OFF / })
const unsign = (page: Page) => page.getByRole('button', { name: 'UNSIGN', exact: true })
const anyDialog = (page: Page) => page.locator('[role="dialog"], [role="alertdialog"], dialog')

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
test('the sheet as exported is the honest empty form (§12.2, §12.13 class 1)', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto(SHEET.path)

  // §12.4.1 — the control is on the sheet from the first visit, unpressed.
  await expect(signOff(page)).toHaveAttribute('aria-pressed', 'false')
  await expect(unsign(page)).toHaveCount(0)

  // §12.3.1 — both rows print `—`, which is the ISO 128 hidden line the rest of
  // the set already reads as "not yet", not a missing value.
  await expect(checkedBy(page)).toHaveCount(2)
  await expect(checkedBy(page)).toHaveText(['—', '—'])

  // §12.5.4 — every slot states its exact threshold and its current count. That
  // single rule is what makes a stamp informational rather than controlling, and
  // it holds in the state where every count is zero.
  expect(await stampConditions(page)).toEqual(EMPTY_STAMPS)

  // §12.2 — `--` is not `00/32`. The first says "no reading", the second says
  // "nothing recorded", and only the second is a fact about the reader.
  await expect(readoutCells(page)).toHaveText(NO_READING)
  await expect(page.locator('footer .hl-readout')).toHaveAttribute('data-hydrated', 'false')

  await context.close()
})

test('with nothing recorded the sheet settles on 00/32, not on -- (§12.2 channel B)', async ({
  page,
}) => {
  const problems = watchPage(page)
  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)

  await expect(readoutCells(page)).toHaveText(EMPTY_READOUT)
  await expect(signOff(page)).toHaveAttribute('aria-pressed', 'false')
  await expect(checkedBy(page)).toHaveText(['—', '—'])
  expect(await stampConditions(page)).toEqual(EMPTY_STAMPS)

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
  // mean anything: in this same frame channel B has not run, so the sign-off
  // control still says `aria-pressed="false"` about a sheet the stored record
  // says is signed off. An effect that added these classes could not have got
  // there first.
  //
  // Stated as what would FALSIFY channel A rather than as a positive reading,
  // and the difference is not pedantry. `hydrated` comes off `.hl-readout`,
  // which sits 82.5 KB into a 211 KB document, while the probe fires on the
  // first `requestAnimationFrame` — so the browser can paint, and this can run,
  // before that element has been parsed at all. MEASURED: serving the document
  // in two chunks 400 ms apart makes this read `null` on a build of `main` just
  // as readily as on any later one, and a loaded CI runner produces the same
  // condition for free — which is exactly how it first showed up, on a run that
  // took 4.7 minutes where its predecessors took 3.8. `null` there is not a
  // weaker channel A, it is a stronger one: nothing had rendered the readout,
  // so nothing could have populated it. The only reading that contradicts
  // §12.2 is a readout that has already published `true`.
  expect(painted!.hydrated).not.toBe('true')
  // The corroboration the line above declines to race for, taken where there is
  // no race: `data-hydrated` is a real two-state signal, so the `false` the
  // prerender ships is a state the page leaves rather than one it never had.
  // Without this, `not.toBe('true')` would also pass against an attribute that
  // is hardcoded and means nothing.
  await waitForHydratedReadout(page)
  await expect(page.locator('footer .hl-readout')).toHaveAttribute('data-hydrated', 'true')
  await expect(signOff(page)).toHaveCount(0)
  await expect(signedOff(page)).toBeVisible()
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
test('a started subsystem draws its face at the structural weight (§8.2, §12.2)', async ({
  page,
}) => {
  await seedRecord(page, { sheets: { [SLUG]: signedSheet('b7225f8') } })
  await page.goto(SHEET.path)

  const faces = await page
    .locator('header svg .hl-face')
    .evaluateAll((paths) =>
      paths.map((path) => [
        path.getAttribute('data-cat') ?? '',
        getComputedStyle(path).strokeWidth,
      ]),
    )

  expect(faces).toHaveLength(6)
  for (const [category, width] of faces) {
    expect(width, `${category} face`).toBe(category === SHEET.category ? '1.5px' : '1px')
  }
})

test('a subsystem with every sheet signed off is hatched, not merely inked (§8.2, §12.2)', async ({
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
  await page.goto('/')

  expect((await firstPaint(page))!.className).toContain(`hl-cat-${category}-complete`)

  const hatches = await page
    .locator('header svg .hl-face-hatch')
    .evaluateAll((paths) =>
      paths.map((path) => [path.getAttribute('data-cat') ?? '', getComputedStyle(path).display]),
    )
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
  const mascot = page.locator('header svg').first()

  await page.goto(SHEET.path)
  await expect(mascot).toHaveAttribute('aria-hidden', 'true')
  const unseeded = await mascot.evaluate((node) => node.outerHTML)

  await seedRecord(page, { sheets: { [SLUG]: signedSheet('b7225f8') } })
  await page.goto(SHEET.path)
  await expect(mascot).toHaveAttribute('aria-hidden', 'true')
  const seeded = await mascot.evaluate((node) => node.outerHTML)

  expect(seeded).toBe(unseeded)
  // Both hatch patterns are always in `<defs>` and all six faces always drawn:
  // an unused `<pattern>` paints nothing, a conditional one paints a mismatch.
  expect(await page.locator('header svg defs pattern').count()).toBe(2)
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
 */
test('channel A stays true across a client transition (§12.2)', async ({ page }) => {
  const problems = watchPage(page)
  // A name on record, so the §12.3.2 prompt never opens: this test is about the
  // stamps, and a form in the middle of it would be a second subject.
  await seedRecord(page, { identity: { name: 'Ada Lovelace', markSeed: '0123abcd' } })

  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)
  await signOff(page).click()
  await expect(signedOff(page)).toBeVisible()
  expect(await hasRootClass(page, `hl-signed-${SHEET.module}`)).toBe(true)
  expect(await hasRootClass(page, `hl-cat-${SHEET.category}-started`)).toBe(true)
  expect(await hasRootClass(page, `hl-cat-${OTHER.category}-started`)).toBe(false)

  // Two `<Link>` hops into another subsystem, with no document load between.
  //
  // Scoped to the banner. `getByRole('link', { name: /^Lokum/ })` on the whole
  // page meant the wordmark for as long as it was the only link whose name
  // began that way; the footer's `LokumAI` made it two and the strict-mode
  // violation was the locator's looseness surfacing, not a regression. What
  // this hop needs is the home link in the header, so that is what it asks for.
  await page.getByRole('banner').getByRole('link', { name: /^Lokum/ }).click()
  await page.locator(`.hl-index tbody a[href$="${OTHER.path}"]`).click()
  await expect(page.locator('main h1')).toHaveText(OTHER.title)
  expect(await documentLoads(page), 'the router did a full page load').toBe(1)

  await signOff(page).click()
  await expect(signedOff(page)).toBeVisible()

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

test('sign-off records the sheet’s own revision and survives a reload (§12.4.1, §12.4.3)', async ({
  page,
}) => {
  await seedRecord(page, { identity: { name: 'Ada Lovelace', markSeed: '0123abcd' } })
  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)

  const revision = (await printedRevision(page).innerText()).trim()
  expect(revision, 'the sheet printed no revision to sign against').toMatch(/^[0-9a-f]{7,40}$/)

  await signOff(page).click()

  // §12.4.1 — the control states the assertion and its date, and `UNSIGN` is
  // adjacent rather than hidden behind the pressed toggle.
  await expect(signedOff(page)).toHaveAttribute('aria-pressed', 'true')
  await expect(signedOff(page)).toHaveText(/^SIGNED OFF \d{4}-\d{2}-\d{2}$/)
  await expect(unsign(page)).toBeVisible()
  await expect(checkedBy(page)).toHaveText(['Ada Lovelace', 'Ada Lovelace'])

  // §12.4.3 — the hash AT sign-off, which is what makes the drift line possible
  // later. The record must hold the sheet's own printed REV, not HEAD.
  const stored = await waitForSheet(page, SLUG, (sheet) => sheet?.signedOff != null)
  expect(stored.signedRevision).toBe(revision)
  expect(stored.signedOff).toMatch(/^\d{4}-\d{2}-\d{2}T/)

  // The whole point of §12.1.4's flush: it came back.
  await page.reload()
  await expect(signedOff(page)).toHaveAttribute('aria-pressed', 'true')
  await expect(checkedBy(page)).toHaveText(['Ada Lovelace', 'Ada Lovelace'])
  expect(await hasRootClass(page, `hl-signed-${SHEET.module}`)).toBe(true)
})

test('un-sign reverses the assertion and clears its channel-A stamp (§12.4.1)', async ({
  page,
}) => {
  await seedRecord(page, {
    sheets: { [SLUG]: signedSheet('b7225f8') },
    identity: { name: 'Ada Lovelace', markSeed: '0123abcd' },
  })
  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)
  expect(await hasRootClass(page, `hl-signed-${SHEET.module}`)).toBe(true)

  await unsign(page).click()

  await expect(signOff(page)).toHaveAttribute('aria-pressed', 'false')
  await expect(unsign(page)).toHaveCount(0)
  // §12.3.1 — not signed off prints `—`, which is a different state from
  // `UNSIGNED`: the first is "nobody signed this", the second is "signed by
  // somebody who declined to give a name".
  await expect(checkedBy(page)).toHaveText(['—', '—'])
  // §12.4.3 — with no assertion there is no revision to be adrift from.
  await expect(page.locator('.hl-signoff-drift')).toHaveCount(0)

  const cleared = await waitForSheet(page, SLUG, (sheet) => sheet?.signedOff == null)
  expect(cleared.signedRevision).toBeNull()
  expect(await hasRootClass(page, `hl-signed-${SHEET.module}`)).toBe(false)
  expect(await hasRootClass(page, `hl-cat-${SHEET.category}-started`)).toBe(false)
})

test('neither sign-off nor un-sign raises a confirmation (§12.4.1, §12.15)', async ({ page }) => {
  const raised = watchDialogs(page)
  await seedRecord(page, { identity: { name: 'Ada Lovelace', markSeed: '0123abcd' } })
  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)

  await signOff(page).click()
  await expect(signedOff(page)).toBeVisible()
  expect(raised, 'sign-off raised a dialog').toEqual([])
  await expect(anyDialog(page)).toHaveCount(0)

  await unsign(page).click()
  await expect(signOff(page)).toBeVisible()
  // Un-sign is its own undo. §12.15's erase is the only confirmation on this
  // site, and it only works because nothing else spends the reader's attention.
  expect(raised, 'un-sign raised a dialog').toEqual([])
  await expect(anyDialog(page)).toHaveCount(0)
})

test('§12.4.3 prints the drift when the sheet has moved under a sign-off', async ({ page }) => {
  await seedRecord(page, {
    sheets: { [SLUG]: signedSheet('a1b2c3d') },
    identity: { name: 'Ada Lovelace', markSeed: '0123abcd' },
  })
  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)

  const revision = (await printedRevision(page).innerText()).trim()
  const drift = page.locator('.hl-signoff-drift')
  await expect(drift).toHaveText(
    new RegExp(`SIGNED OFF 2026-08-14 AGAINST REV a1b2c3d . SHEET NOW AT REV ${revision}`),
  )
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

  await signOff(page).click()
  const minted = (await waitForRecord(page, (env) => env?.data.identity.markSeed != null)).data
    .identity.markSeed
  // §12.3.5 — 8 lowercase hex, four bytes from the CSPRNG, never derived from
  // the name: a name-derived mark would silently change on every already-signed
  // sheet the moment the reader renamed themselves.
  expect(minted).toMatch(/^[0-9a-f]{8}$/)
  await page.getByRole('button', { name: 'SKIP', exact: true }).click()

  // A SECOND sign-off, on another sheet, is not a second mint.
  await page.goto(OTHER.path)
  await signOff(page).click()
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

test('the name is asked for inline at the first sign-off (§12.3.2, §12.3.3)', async ({ page }) => {
  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)
  // Nothing has asked yet: the sheet is the first-run experience.
  await expect(page.locator('.hl-signoff form')).toHaveCount(0)

  await signOff(page).click()
  const form = page.locator('.hl-signoff form')
  await expect(form).toBeVisible()

  // §12.3.2 — not a modal. The drawing is asking who is checking it, and it asks
  // in the empty `CHECKED BY` field of its own title block.
  await expect(anyDialog(page)).toHaveCount(0)

  // §12.3.3 — the label is visible and persistent, never a placeholder standing
  // in for one, and the field is marked optional IN WORDS.
  const label = form.locator('label')
  await expect(label).toBeVisible()
  await expect(label).toContainText('Name or initials, as you would sign a drawing')
  await expect(label.locator('.hl-field-optional')).toHaveText('Optional')

  const field = form.getByRole('textbox', { name: /Name or initials, as you would sign a drawing/ })
  await expect(field).toBeVisible()
  await expect(field).not.toHaveAttribute('placeholder', /.*/)
  // The WHATWG token for "a typically short name used instead of the full
  // name", which is also what satisfies SC 1.3.5.
  await expect(field).toHaveAttribute('autocomplete', 'nickname')
  await expect(field).toHaveAttribute('autocapitalize', 'off')
  await expect(field).toHaveAttribute('spellcheck', 'false')
  await expect(field).toHaveAttribute('dir', 'auto')

  // §12.1.7 — the boundary that actually matters, in the reader's own hands.
  //
  // The old assertion pinned "Never sent anywhere", which §14 made false: the
  // name now reaches `record_state`, and `profiles.display_name` besides. The
  // sentence lives in `lib/record/scope.ts` so that the promise and the
  // behaviour cannot drift, and it is asserted through the constant here for
  // the same reason. What has NOT changed is the clause the section is about:
  // the export is where the name leaves the reader's device by their own hand.
  await expect(form.locator('.hl-field-hint')).toHaveText(NAME_SCOPE)

  // §12.3.2 — genuinely skippable, and stated as a control rather than implied
  // by a dismissal.
  await expect(page.getByRole('button', { name: 'SKIP', exact: true })).toBeVisible()
})

test('skipping the name is a legitimate state and prints UNSIGNED (§12.3.2)', async ({ page }) => {
  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)
  await signOff(page).click()
  await page.getByRole('button', { name: 'SKIP', exact: true }).click()

  await expect(page.locator('.hl-signoff form')).toHaveCount(0)
  // Never a placeholder person: no "Anonymous", no "Reader", no invented name.
  // Absence of a name is information; a fake name would be a claim.
  await expect(checkedBy(page)).toHaveText(['UNSIGNED', 'UNSIGNED'])
  expect((await waitForSheet(page, SLUG, (s) => s?.signedOff != null)).signedOff).not.toBeNull()
  expect((await readRecord(page))?.data.identity.name ?? null).toBeNull()
})

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

test('a Turkish name keeps its dotted İ and its whole stored value (§12.3.4)', async ({
  page,
}) => {
  // For an audience of Turkish engineers, mis-casing the first letter of
  // somebody's own name in their own title block is the single most visible i18n
  // failure available: `"ilker".toUpperCase()` yields a dotless I.
  const NAME = 'İlker Cevheri'

  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)
  await signOff(page).click()
  await page.locator('.hl-signoff form input').fill(NAME)
  await page.getByRole('button', { name: 'SAVE NAME', exact: true }).click()

  // §12.3.4 — never truncate the stored value; ellipsis is a layout affordance
  // only, and the full string must appear unabbreviated on the sheet.
  const stored = await waitForRecord(page, (env) => env?.data.identity.name === NAME)
  expect(stored.data.identity.name).toBe(NAME)

  // §12.3.1 — `<bdi dir="auto">`, so a name cannot re-order the label and value
  // around it, and `normal-case`, because CSS casing is locale-sensitive off the
  // element's `lang` and this row is `.hl-mark` (uppercase).
  const printed = checkedBy(page).first().locator('bdi[dir="auto"]')
  await expect(printed).toHaveText(NAME)
  expect(await printed.evaluate((node) => getComputedStyle(node).textTransform)).toBe('none')

  // §12.3.4 — the initials are graphemes taken AS TYPED. `İC`, with the dot.
  await page.goto('/profile/')
  const initials = page.locator('.hl-identity-initials')
  await expect(initials).toHaveText('İC')
  expect(await initials.evaluate((node) => getComputedStyle(node).textTransform)).toBe('none')
})

// ---------------------------------------------------------------------------
// §12.6 — the Quick Check
// ---------------------------------------------------------------------------

test('nothing is revealed before an answer is written (§12.6)', async ({ page }) => {
  await page.goto(SHEET.path)
  await expect(page.locator('.hl-quiz-question')).toHaveText(/\S/)

  // ABSENT, not disabled (§11.25): a reveal-before-attempt control destroys the
  // retrieval effect, which is the one mechanism here the evidence strongly
  // supports, and a greyed-out button still tells the reader an answer is behind
  // it. `getByRole` finds a disabled button too, which is what makes this the
  // right assertion rather than `toBeDisabled`.
  await expect(page.getByRole('button', { name: /COMPARE/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'MATCHED', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'DID NOT MATCH', exact: true })).toHaveCount(0)
  await expect(page.locator('.hl-quiz-reveal')).toHaveCount(0)

  // And it says why, without praise, blame or an exclamation mark (§12.14.1).
  await expect(page.locator('.hl-quiz-note').first()).toHaveText(
    'The sheet’s summary can be compared once an answer is written.',
  )
})

test('the reveal is the sheet’s own summary, named as that (§12.6)', async ({ page }) => {
  await page.goto(SHEET.path)
  const question = (await page.locator('.hl-quiz-question').innerText()).trim()

  await page.locator('.hl-quiz textarea').fill('Read, act, exfiltrate — the trifecta.')
  const compare = page.getByRole('button', { name: /^COMPARE WITH THE SHEET/ })
  await expect(compare).toHaveText('COMPARE WITH THE SHEET’S SUMMARY')
  await compare.click()

  // Labelled exactly what it is. It is the closest authored thing that exists,
  // and naming it accurately costs nothing — whereas a reveal button over an
  // absent or generated answer is the §1 failure this codebase exists to
  // prevent.
  await expect(page.locator('.hl-quiz-reveal-label')).toHaveText('THE SHEET’S SUMMARY')
  await expect(page.locator('.hl-quiz-reveal .prose')).toHaveText(/\S/)

  // §12.6 — `summarySection` removes the self-check paragraph from the section
  // it returns, because every one of them is authored INSIDE `## Summary`. Without
  // that the sheet reprints the question directly beneath the reader's own answer
  // to it. Counting occurrences over the whole page is what catches it.
  const body = await page.locator('body').innerText()
  expect(body.split(question).length - 1, 'the question is printed twice').toBe(1)

  // §5.10's `REVEAL MODEL ANSWER` is withdrawn, and the phrase goes with it.
  expect(body).not.toMatch(/model answer/i)
})

/**
 * §12.5.1, amending §5.10's 60/40/20 tier: the act worth paying for is the
 * retrieval attempt, so both outcomes pay the same. Tiering rewards "matched"
 * and penalises retries, which inverts the retrieval-practice evidence.
 */
for (const outcome of ['MATCHED', 'DID NOT MATCH'] as const) {
  test(`${outcome} records the self-assessment and pays the flat 60 (§12.5.1, §12.6)`, async ({
    page,
  }) => {
    await page.goto(SHEET.path)
    await waitForHydratedReadout(page)
    await page.locator('.hl-quiz textarea').fill('An answer, written before anything is revealed.')
    await page.getByRole('button', { name: /^COMPARE WITH THE SHEET/ }).click()

    const button = page.getByRole('button', { name: outcome, exact: true })
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')

    // §12.4.2 — self-assessment is its own axis and no third state is derived
    // from it: the readout gains XP and nothing gains a pass, a grade or a mark.
    await expect(readoutCell(page, /^XP/)).toHaveText('XP 60')
    await expect(readoutCell(page, /^Signed off/)).toHaveText(`Signed off 00/${SHEETS.length}`)
    await expect(page.locator('.hl-quiz-note').filter({ hasText: 'SELF-ASSESSED' })).toHaveText(
      `SELF-ASSESSED: ${outcome}`,
    )
    await expect(page.locator('.hl-quiz-body')).toContainText(
      'Self-assessment. Not graded by anyone.',
    )

    const stored = await waitForSheet(page, SLUG, (sheet) => sheet?.quiz?.assessed != null)
    expect(stored.quiz?.assessed).toBe(outcome === 'MATCHED' ? 'matched' : 'missed')
    expect(stored.quiz?.answer).toBe('An answer, written before anything is revealed.')
    // The assessment is not a completion claim (§12.4.2).
    expect(stored.signedOff).toBeNull()
  })
}

// ---------------------------------------------------------------------------
// §12.7 — the checklist
// ---------------------------------------------------------------------------

test('the eight items are real, named checkboxes and a tick survives a reload (§12.7)', async ({
  page,
}) => {
  await page.goto(SHEET.path)

  const boxes = page.getByRole('checkbox')
  await expect(boxes).toHaveCount(8)

  for (const box of await boxes.all()) {
    await expect(box).toBeEnabled()
    // §6.4's problem, solved rather than avoided: the item's text is a SIBLING
    // of the box, so it contributes nothing to the accessible name and the
    // island has to supply one. Without it these are eight nameless checkboxes.
    const name = (await box.getAttribute('aria-label')) ?? ''
    expect(name.trim().length, 'a checkbox with no accessible name').toBeGreaterThan(0)
  }

  const first = page.locator('li.task-list-item').first()
  await boxes.first().check()
  await expect(first).toHaveAttribute('data-ticked', 'true')

  await page.reload()
  await expect(page.getByRole('checkbox').first()).toBeChecked()
  await expect(page.locator('li.task-list-item').first()).toHaveAttribute('data-ticked', 'true')
  expect((await readRecord(page))?.data.sheets[SLUG]?.checklist).toEqual({ '0': true })
})

test('all eight ticked awards 40, and a ticked item is not struck through (§12.5.1, §12.7)', async ({
  page,
}) => {
  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)

  const boxes = page.getByRole('checkbox')
  const total = await boxes.count()
  for (let index = 0; index < total; index += 1) await boxes.nth(index).check()

  await expect(readoutCell(page, /^XP/)).toHaveText('XP 40')
  const stored = await waitForSheet(page, SLUG, (sheet) =>
    Object.keys(sheet?.checklist ?? {}).length === total,
  )
  expect(Object.keys(stored.checklist).sort()).toEqual(['0', '1', '2', '3', '4', '5', '6', '7'])

  // §7.2 — NO strikethrough. A struck-through line reads as cancelled, and a
  // completed check is the opposite of cancelled.
  const decorations = await page
    .locator('li.task-list-item[data-ticked="true"]')
    .evaluateAll((items) => items.map((item) => getComputedStyle(item).textDecorationLine))
  expect(decorations).toHaveLength(total)
  for (const decoration of decorations) expect(decoration).toBe('none')
})

// ---------------------------------------------------------------------------
// §12.9 — the submittal register
// ---------------------------------------------------------------------------

test('a deep link is stored and printed as the reconstructed repository URL (§12.9.2)', async ({
  page,
}) => {
  const RECONSTRUCTED = 'https://github.com/cevheri/hidden-line'

  await page.goto(SHEET.path)
  await expect(page.locator('.hl-submittal-empty')).toHaveText('NO SUBMITTAL REGISTERED')

  await page
    .getByRole('textbox', { name: 'Repository' })
    .fill(`${RECONSTRUCTED}/tree/main/lms?tab=readme#top`)
  await page.getByRole('textbox', { name: /What you built/ }).fill('A harness for the trifecta')
  await page.getByRole('button', { name: 'REGISTER', exact: true }).click()

  // §12.9.2 — render only the reconstructed string, as BOTH the href and the
  // visible label. That is what makes a link whose text lies about its
  // destination impossible rather than merely unlikely.
  const link = page.locator('.hl-submittal-repo')
  await expect(link).toHaveText(RECONSTRUCTED)
  expect(await link.getAttribute('href')).toBe(RECONSTRUCTED)
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(link).toHaveAttribute('target', '_blank')

  // Not merely absent from the href: absent from the register's markup, so no
  // `title`, `aria-label` or data attribute quietly carries the query string
  // the reader pasted.
  const markup = await page.locator('.hl-submittal').innerHTML()
  expect(markup).not.toContain('tab=readme')
  expect(markup).not.toContain('tree/main')
  expect(markup).not.toContain('#top')

  const stored = await waitForSheet(page, SLUG, (sheet) => (sheet?.submittals.length ?? 0) === 1)
  expect(stored.submittals[0]).toMatchObject({
    owner: 'cevheri',
    repo: 'hidden-line',
    url: RECONSTRUCTED,
  })
})

test('a reader-supplied commit is lowercased and printed unverified (§12.9.3)', async ({
  page,
}) => {
  await page.goto(SHEET.path)
  await page
    .getByRole('textbox', { name: 'Repository' })
    .fill('https://github.com/cevheri/hidden-line')
  await page.getByRole('textbox', { name: /^Commit/ }).fill('9F2C1AB')
  await page.getByRole('button', { name: 'REGISTER', exact: true }).click()

  const commit = page.locator('.hl-submittal-commit')
  await expect(commit).toContainText('COMMIT 9f2c1ab')
  // §12.9.3 — this is the single cheapest thing in the slice that raises the
  // record from "self-reported" to "checkable", and the caveat is what keeps it
  // honest: verification moves to the party who actually has a network.
  await expect(commit).toContainText('supplied by reader; not fetched or verified by this application')

  const stored = await waitForSheet(page, SLUG, (sheet) => (sheet?.submittals.length ?? 0) === 1)
  expect(stored.submittals[0].commit).toBe('9f2c1ab')
})

/**
 * §12.9.2 — an allowlist over the *parsed* URL, never a regex over the raw
 * string. Each of these defeats a regex specifically: the scheme survives
 * whitespace and case games, the host of the third one is `evil.example`, and
 * the second differs from `github.com` by one Cyrillic code point.
 */
const HOSTILE_REPOS: readonly [string, string][] = [
  ['javascript:', 'javascript:alert(1)'],
  ['a homograph host', 'https://gіthub.com/cevheri/hidden-line'],
  ['userinfo', 'https://github.com@evil.example/a/b'],
]

for (const [what, input] of HOSTILE_REPOS) {
  test(`the register refuses ${what} (§12.9.2)`, async ({ page }) => {
    await page.goto(SHEET.path)
    await page.getByRole('textbox', { name: 'Repository' }).fill(input)
    await page.getByRole('button', { name: 'REGISTER', exact: true }).click()

    // Imperative, describing the fix; no "please", no verdict on the input.
    await expect(page.locator('.hl-field-error')).toHaveText(
      'Enter the repository as https://github.com/owner/name',
    )
    // Refused, not silently swallowed: a form that clears itself and records
    // nothing is the page telling the reader something untrue.
    await expect(page.locator('.hl-submittal-item')).toHaveCount(0)
    await expect(page.locator('.hl-submittal-empty')).toHaveText('NO SUBMITTAL REGISTERED')
    await expect(page.locator('.hl-submittal a')).toHaveCount(0)
    expect((await readRecord(page))?.data.sheets[SLUG]?.submittals ?? []).toEqual([])
  })
}

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
  const pending = page.locator('.hl-pending')
  await expect(pending).toBeVisible()
  await expect(pending).toHaveText('g …')
  await expect(pending).toHaveAttribute('role', 'status')

  await page.keyboard.press('Escape')
  await expect(pending).toHaveCount(0)
  expect(await documentLoads(page), 'an abandoned g navigated anyway').toBe(1)
})

test('g d reaches the dashboard (§12.16)', async ({ page }) => {
  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)

  await page.keyboard.press('g')
  await page.keyboard.press('d')
  await page.waitForURL(/\/dashboard\/$/)
  await expect(page.locator('main h1')).toBeVisible()
})

test('? opens the shortcut sheet and Escape closes it (§12.16)', async ({ page }) => {
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
  await expect(sheet).toContainText('Shortcut sheet')
  await expect(sheet).toContainText('Keyboard shortcuts')
  for (const row of ['g d', 'g i', 'g p', 'g r', 'g c', '[ / ]', 'j / k', 'Esc'])
    await expect(sheet).toContainText(row)

  await page.keyboard.press('Escape')
  await expect(sheet).toHaveCount(0)
})

test('. toggles the theme and s signs off the current sheet (§12.16)', async ({ page }) => {
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
  await expect(signedOff(page)).toHaveAttribute('aria-pressed', 'true')
  await waitForSheet(page, SLUG, (record) => record?.signedOff != null)

  // It is a toggle, and un-sign needs no confirmation either.
  await page.keyboard.press('s')
  await expect(signOff(page)).toHaveAttribute('aria-pressed', 'false')
})

test('no character shortcut fires from inside a text field (§12.16)', async ({ page }) => {
  await seedTheme(page, 'light')
  await page.goto(SHEET.path)
  await waitForHydratedReadout(page)

  const answer = page.locator('.hl-quiz textarea')
  await answer.focus()
  for (const key of ['s', '.', '?', 'g', 'j', '[']) await page.keyboard.press(key)

  // Every one of them is a character the reader was typing. The guard is what
  // stops a reader writing about `s3` from signing the sheet off mid-sentence.
  expect(await answer.inputValue()).toBe('s.?gj[')
  await expect(signedOff(page)).toHaveCount(0)
  await expect(anyDialog(page)).toHaveCount(0)
  await expect(page.locator('.hl-pending')).toHaveCount(0)
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

  await expect(signedOff(page)).toHaveCount(0)
  expect(await hasRootClass(page, 'dark')).toBe(false)
  await expect(page.locator('.hl-pending')).toHaveCount(0)
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
  await expect(signedOff(page)).toHaveCount(0)
  await expect(anyDialog(page)).toHaveCount(0)
  await expect(page.locator('.hl-pending')).toHaveCount(0)
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
  expect(afterIndex, 'the index sheet wrote nothing').toBeNull()

  await page.goto(A0.path)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1200)
  expect(await readRawRecord(page), 'a module sheet wrote nothing').toBeNull()

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

/**
 * §12.9 — the register, and the title block that now reports it.
 *
 * A reader registered three repositories and told us the title block never
 * mentioned them. It did not: the register said `3 OF 3` under the sheet and
 * the panel beside it had no row for them, while the exported RECORD OF WORK
 * had been printing `REPOSITORIES n` all along. These two cases are the round
 * trip that was missing — type it in, and read it back out of the panel.
 */
test('§12.9 — registering a repository reaches the title block’s own row', async ({ page }) => {
  await page.goto(SHEET.path)

  const row = page
    .locator('.hl-title-block-row, .hl-title-strip-pair')
    .filter({ has: page.locator('dt', { hasText: /^REPOSITORIES$/ }) })
    .locator('dd')
    .first()

  // Nothing read yet, and nothing registered: a count that was taken and came
  // to zero, not §11.25's dash for a count nobody took.
  await expect(row).toHaveText('0')

  // Scoped to the form on purpose: the site header's GitHub icon also carries
  // `aria-label="Repository"`, so an unscoped lookup matches a link and a field.
  // Worth knowing rather than working around — see the note on the second case.
  const form = page.locator('.hl-submittal-form')
  await form.getByLabel('Repository').fill('https://github.com/libredb/libredb-studio')
  await page.getByRole('button', { name: 'REGISTER' }).click()

  await expect(row).toHaveText('1')

  // And it survives a reload, because it is read from the record rather than
  // held in the form's state.
  await page.reload()
  await expect(row).toHaveText('1')
})

test('§12.9.3 — the commit field states its format before it is typed in', async ({ page }) => {
  await page.goto(SHEET.path)

  /**
   * Everything here is scoped to the form. The header's repository icon is
   * labelled `Repository` too, which makes an unscoped `getByLabel` ambiguous —
   * and that ambiguity is real for a screen reader as well, not just for this
   * test: one page, two controls, one name. Recorded here because it is a
   * pre-existing smell in the shell rather than anything §12.9 introduced.
   */
  const form = page.locator('.hl-submittal-form')
  const commit = form.getByLabel(/^Commit/)
  const hintId = await commit.getAttribute('aria-describedby')
  expect(hintId).not.toBeNull()

  // Visible, not merely present: the whole defect was that the rule existed
  // only inside the error branch, so a reader met it after failing.
  const hint = page.locator(`#${hintId?.split(/\s+/)[0]}`)
  await expect(hint).toBeVisible()
  await expect(hint).toContainText('7 to 40 hexadecimal characters')

  // And the error, when it comes, says the same thing rather than a second
  // wording of it.
  await form.getByLabel('Repository').fill('https://github.com/libredb/libredb-studio')
  await commit.fill('project added')
  await page.getByRole('button', { name: 'REGISTER' }).click()

  const error = page.locator('.hl-field-error')
  await expect(error).toContainText('7 to 40 hexadecimal characters')

  // Nothing was registered, so the title block's count did not move.
  await expect(
    page
      .locator('.hl-title-block-row, .hl-title-strip-pair')
      .filter({ has: page.locator('dt', { hasText: /^REPOSITORIES$/ }) })
      .locator('dd')
      .first(),
  ).toHaveText('0')
})
