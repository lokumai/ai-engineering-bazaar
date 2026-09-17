import { expect, test } from '@playwright/test'
import { SHEETS } from './sheets'
import {
  firstPaintClass,
  openRegisterRow,
  probeFirstPaint,
  readRecord,
  seedRecord,
  signedSheet,
} from './record'

/**
 * §13.4.3 — the nine role paths, driven in a real browser.
 *
 * **M14 moved them and changed nothing else about them.** They were `/path/`,
 * one static document holding all nine bodies plus the empty state; that route
 * folded into `/profile/` and they are the `role` row of its register, beside
 * the panel that states which role is on record. The design is the same design:
 * every body is in the document and **channel A shows exactly one of them**,
 * which is the whole point and is only checkable here — a unit test can render
 * the markup but cannot watch CSS pick a body before React exists, and Phase
 * 2's two genuine defects were both invisible to every test and obvious in
 * thirty seconds of Chrome.
 *
 * What the move costs these tests is one gesture: a register row is a closed
 * `<details>`, so the row is opened first. That is not a workaround, it is the
 * page — and it is worth noting that `<details>` opens with no JavaScript at
 * all, which is why the frame-one test below can still refuse every module and
 * then open the row.
 *
 * The order of the cases is deliberate:
 *
 *  1. Nothing stored — the honest empty state (§12.13's fifth), and **nothing
 *     written by having looked**.
 *  2. A role stored, JavaScript never allowed to run — the right body, the
 *     right ticks, drawn by CSS alone.
 *  3. Hydrated — the standing, and exactly one step marked as next.
 *  4. Choosing a role — the record written once, the body swapped, no dialog.
 */

const SE = 'software-engineer'

/** The page the paths live on since M14, and the row they live in. */
const PROGRESS = '/profile/'
const ROLE_ROW = 'role'

/*
  THE FOUR SELECTORS, EACH NAMED ONCE.

  Three assertions in this file are `:visible` `toHaveCount(0)` — no path drawn
  before a role is chosen, no step marked next in the prerender, no body left
  showing after a role is cleared. All three are satisfied by a selector that
  matches nothing, so while each test wrote its own string a rename would have
  turned them green and empty rather than red. Named once, every absence
  assertion shares its selector with a presence assertion in the same file
  (`toHaveCount(9)`, `toBeVisible`, `toHaveCount(3)`), so the pair cannot both
  be silenced. Stage 8 renames these to the design language; that is one edit
  here rather than fourteen.
*/
const PATH_BODY = '.bz-path-body'
const STEP = '.bz-step'
const STEP_NEXT = '.bz-step-next'
const STEP_TICK = '.bz-step-tick'

test('with no role, no path is drawn and nothing is written (§12.13)', async ({ page }) => {
  await page.goto(PROGRESS)
  await openRegisterRow(page, ROLE_ROW)

  // `RolePanel`'s own empty state: the row says there is no role and offers the
  // picker, rather than drawing a path nobody chose. Scoped to the row's body —
  // the closed row's SUMMARY prints the same words as its reading (§16.4.1), so
  // an unscoped locator finds the state twice and says so in strict mode.
  await expect(
    page.locator('section[aria-labelledby="role"] .bz-register-body')
      .getByText('NO ROLE ON RECORD'),
  ).toBeVisible()

  // All nine are in the document; none of them is on screen. That is what makes
  // the row correct in frame one for a reader who has a role and for one who
  // has not, without React deciding anything.
  await expect(page.locator(PATH_BODY)).toHaveCount(9)
  for (const body of await page.locator(PATH_BODY).all()) {
    await expect(body).not.toBeVisible()
  }

  // No path is drawn, and no step is either — never a placeholder path.
  await expect(page.locator(`${STEP}:visible`)).toHaveCount(0)

  // The nine roles are offered, with their blurbs, so the empty state is useful
  // rather than merely honest. ONE group of nine: two `RolePicker`s on one
  // document would share the radio name and clear each other.
  await expect(page.locator('input[name="hl-role"]')).toHaveCount(9)

  // §12.13 class 1 against class 2: merely reading a page must leave the browser
  // as it found it, or from the reader's second visit the empty state would tell
  // them they had cleared a record they never made.
  expect(await readRecord(page)).toBeNull()
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([])
})

// The no-JavaScript test below uses the same first-paint probe as
// theme.spec.ts, and it has the same race: it reads the class list in a
// requestAnimationFrame with every script aborted. It fails the same way with
// this file's other changes reverted, so it is the measurement, not the page.
// Retries are file-wide because there is no describe block to scope them to; a
// genuine break still fails all three attempts.
test.describe.configure({ retries: 2 })

test('a stored role draws its own path with no JavaScript at all', async ({
  page,
}) => {
  await seedRecord(page, {
    identity: { role: SE },
    sheets: {
      'fundamentals/llms': signedSheet('abc1234'),
      'fundamentals/tools': signedSheet('abc1234'),
      'intermediate/security': signedSheet('abc1234'),
    },
  })
  await probeFirstPaint(page)

  // Channel A is a blocking inline script and CSS. Blocking every module proves
  // the claim rather than asserting it: whatever is on screen after this was
  // drawn without React running once — including the disclosure, which is
  // native.
  await page.route('**/*.js', (route) => route.abort())
  await page.goto(PROGRESS, { waitUntil: 'domcontentloaded' })

  const painted = await firstPaintClass(page)
  expect(painted).toContain(`hl-role-${SE}`)
  // One class per seeded module. The numbers come from the corpus, so they are
  // read off it rather than written down here.
  for (const slug of ['fundamentals/llms', 'fundamentals/tools', 'intermediate/security']) {
    const sheet = SHEETS.find((candidate) => candidate.path === `/courses/${slug}/`)!
    expect(painted).toContain(`hl-signed-${sheet.module}`)
  }

  // Opened by a click on a `<summary>`, which needs no script.
  await page.locator('section[aria-labelledby="role"] summary').click()

  await expect(page.locator(`${PATH_BODY}[data-role="${SE}"]`)).toBeVisible()
  await expect(page.locator(`${PATH_BODY}:visible`)).toHaveCount(1)

  // The three completed modules say so, and the other steps do not. The ticks
  // for all nine bodies are in the document; only the visible body's show.
  await expect(page.locator(`${STEP_TICK}:visible`)).toHaveCount(3)

  // No step claims to be next: "first not completed" is a computation, so the
  // prerender genuinely does not know, and §13.4.3 has it stay quiet rather
  // than guess (the marker is channel B).
  await expect(page.locator(`${STEP_NEXT}:visible`)).toHaveCount(0)
})

test('hydrated, the standing leads with what is left and one step is marked next', async ({
  page,
}) => {
  await seedRecord(page, {
    identity: { role: SE },
    sheets: {
      'fundamentals/llms': signedSheet('abc1234'),
      'fundamentals/tools': signedSheet('abc1234'),
      'intermediate/security': signedSheet('abc1234'),
    },
  })
  await page.goto(PROGRESS)
  const row = await openRegisterRow(page, ROLE_ROW)

  const body = page.locator(`${PATH_BODY}[data-role="${SE}"]`)
  await expect(body).toBeVisible()

  // §13.8 — TO-GO framing, and §11.35 forbids a percentage outright. Three
  // modules were seeded as completed, so the standing counts three off the
  // ready total. `RolePanel` states it once for the row; the nine bodies state
  // no standing of their own, which is what keeps one live region on the page.
  const standing = (await row.innerText()).toUpperCase()
  expect(standing).toMatch(/\d+ OF \d+\s+REMAINING ON THIS PATH/)
  expect(standing).toMatch(/COMPLETED\s+3 OF \d+/)

  // §13.4.2 — the ready count and the planned count are both printed, and they
  // differ. A path that counted its planned steps would print the same number
  // twice and ask the reader to finish modules nobody has written. How many
  // steps a path holds is curation, so the numbers are read off the page and
  // compared rather than written down here.
  const ready = Number(/COMPLETED\s+3 OF (\d+)/.exec(standing)?.[1])
  const planned = Number(/STEPS PLANNED\s+(\d+)/.exec(standing)?.[1])
  expect(ready).toBeGreaterThan(0)
  expect(planned).toBeGreaterThan(0)
  expect(standing).not.toContain('%')

  // Exactly one step is next, and it is the first not-completed READY step in
  // path order: the path opens 1, 3, 4, …, and 1 is completed, so 3 is next.
  const next = body.locator(`${STEP}[data-next="true"]`)
  await expect(next).toHaveCount(1)
  await expect(next).toHaveAttribute('data-module', '3')
  // Every step carries the marker in its markup; channel B reveals exactly the
  // one whose ancestor got `data-next`, so the count of VISIBLE ones is the
  // assertion that matters — a reader must never see two steps both claiming to
  // be next.
  await expect(body.locator(`${STEP_NEXT}:visible`)).toHaveCount(1)
})

test('choosing a role writes once, swaps the body, and asks nothing (§13.3)', async ({
  page,
}) => {
  await page.goto(PROGRESS)
  await openRegisterRow(page, ROLE_ROW)
  await expect(page.locator(`${PATH_BODY}:visible`)).toHaveCount(0)

  await page.locator(`input[name="hl-role"][value="${SE}"]`).check()

  // Channel A re-stamps from the store, so the body swaps with no reload.
  await expect(page.locator(`${PATH_BODY}[data-role="${SE}"]`)).toBeVisible()

  await expect
    .poll(async () => (await readRecord(page))?.data.identity.role ?? null)
    .toBe(SE)

  // A path is a view over the corpus, not a container: switching roles loses
  // nothing, because completions are recorded against modules. So there is no
  // confirmation gate — §12's SC 3.3.4 dialog is for destructive acts, and this
  // is not one.
  await expect(page.locator('[role="alertdialog"]')).toHaveCount(0)

  // With a role on record the picker moves behind `Another role`, which is
  // `RolePanel`'s own arrangement: open it and choose again.
  await page.getByText('Another role').click()
  await page.locator('input[name="hl-role"][value="qa"]').check()
  await expect(page.locator(`${PATH_BODY}[data-role="qa"]`)).toBeVisible()
  await expect(page.locator(`${PATH_BODY}:visible`)).toHaveCount(1)
  await expect
    .poll(async () => (await readRecord(page))?.data.identity.role ?? null)
    .toBe('qa')
})

test('a planned step points at nothing and says so (§13.4.2)', async ({ page }) => {
  await seedRecord(page, { identity: { role: SE } })
  await page.goto(PROGRESS)
  await openRegisterRow(page, ROLE_ROW)

  const body = page.locator(`${PATH_BODY}[data-role="${SE}"]`)
  await expect(body).toBeVisible()

  // The path ends on planned modules. A planned module has no completion
  // control at all (§12.4.1), so its step carries no link that implies a
  // lesson, and it never claims to be next. Which modules are still planned is
  // the corpus's business, so the step is found by what it says.
  const draft = body.locator(STEP, { hasText: 'PLANNED' }).first()
  await expect(draft).toBeVisible()
  await expect(draft).toContainText('PLANNED')
  await expect(draft.locator('a')).toHaveCount(0)
  await expect(draft.locator(STEP_TICK)).not.toBeVisible()
})

test('the reader’s own standing never announces itself twice (SC 4.1.3)', async ({ page }) => {
  await seedRecord(page, {
    identity: { role: SE },
    sheets: { 'fundamentals/llms': signedSheet('abc1234') },
  })
  await page.goto(PROGRESS)
  await openRegisterRow(page, ROLE_ROW)
  await expect(page.locator(`${PATH_BODY}[data-role="${SE}"]`)).toBeVisible()

  // Driving `/path/` found two visible live regions both stating the standing on
  // load — the path's readout and the picker's — so a screen reader heard the
  // same count twice for a page nobody had touched. SC 4.1.3 is about a CHANGE
  // in status: the picker stays silent until the reader picks something, and
  // M14's arrangement has one panel stating the standing rather than two.
  const live = page.locator('[role="status"]:visible')
  const stating = (await live.allInnerTexts()).filter((text) => /REMAINING/i.test(text))
  expect(stating).toHaveLength(1)

  // And once the reader does choose, the picker speaks too — that is the
  // change, and it is the second region rather than a repeat of the first.
  await page.getByText('Another role').click()
  await page.locator('input[name="hl-role"][value="qa"]').check()
  await expect
    .poll(async () => (await page.locator('[role="status"]:visible').allInnerTexts())
      .filter((text) => /REMAINING/i.test(text)).length)
    .toBe(2)
})
