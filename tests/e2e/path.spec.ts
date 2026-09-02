import { expect, test } from '@playwright/test'
import { SHEETS } from './sheets'
import {
  firstPaintClass,
  probeFirstPaint,
  readRecord,
  seedRecord,
  signedSheet,
} from './record'

/**
 * §13.4.3 — `/path/`, driven in a real browser.
 *
 * The page is one static document holding **all nine role bodies plus the empty
 * state**, and channel A shows exactly one of the ten. That is the whole design,
 * and it is only checkable here: a unit test can render the markup but cannot
 * watch CSS pick a body before React exists, and Phase 2's two genuine defects
 * were both invisible to every test and obvious in thirty seconds of Chrome.
 *
 * So the order of these cases is deliberate:
 *
 *  1. Nothing stored — the honest empty state (§12.13's fifth), and **nothing
 *     written by having looked**.
 *  2. A role stored, JavaScript never allowed to run — the right body, the right
 *     ticks, in frame one.
 *  3. Hydrated — the tally, and exactly one step marked as next.
 *  4. Choosing a role — the record written once, the body swapped, no dialog.
 */

const SE = 'software-engineer'

test('with no role, the path draws no path and writes nothing (§12.13)', async ({ page }) => {
  await page.goto('/path/')
  await expect(page.locator('.hl-path-empty')).toBeVisible()

  // All nine are in the document; none of them is on screen. That is what makes
  // the page correct in frame one for a reader who has a role and for one who
  // has not, without React deciding anything.
  await expect(page.locator('.hl-path-body')).toHaveCount(9)
  for (const body of await page.locator('.hl-path-body').all()) {
    await expect(body).not.toBeVisible()
  }

  // No path is drawn, and no step is either — never a placeholder path.
  await expect(page.locator('.hl-step:visible')).toHaveCount(0)

  // The nine roles are offered, with their blurbs, so the empty state is useful
  // rather than merely honest.
  await expect(page.locator('input[name="hl-role"]')).toHaveCount(9)

  // §12.13 class 1 against class 2: merely reading a page must leave the browser
  // as it found it, or from the reader's second visit the empty state would tell
  // them they had cleared a record they never made.
  expect(await readRecord(page)).toBeNull()
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([])
})

test('a stored role draws its own path in frame one, with no JavaScript at all', async ({
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
  // drawn without React running once.
  await page.route('**/*.js', (route) => route.abort())
  await page.goto('/path/', { waitUntil: 'domcontentloaded' })

  const painted = await firstPaintClass(page)
  expect(painted).toContain(`hl-role-${SE}`)
  // One class per seeded sheet. The numbers come from the corpus, so they are
  // read off it rather than written down here.
  for (const slug of ['fundamentals/llms', 'fundamentals/tools', 'intermediate/security']) {
    const sheet = SHEETS.find((candidate) => candidate.path === `/courses/${slug}/`)!
    expect(painted).toContain(`hl-signed-${sheet.module}`)
  }

  await expect(page.locator('.hl-path-empty')).not.toBeVisible()
  await expect(page.locator(`.hl-path-body[data-role="${SE}"]`)).toBeVisible()
  await expect(page.locator('.hl-path-body:visible')).toHaveCount(1)

  // The three signed sheets say so, and the other steps do not. The ticks for
  // all nine bodies are in the document; only the visible body's show.
  await expect(page.locator('.hl-step-tick:visible')).toHaveCount(3)

  // No step claims to be next: "first unsigned" is a computation, so the
  // prerender genuinely does not know, and §13.4.3 has it stay quiet rather
  // than guess (the marker is channel B).
  await expect(page.locator('.hl-step-next:visible')).toHaveCount(0)
})

test('hydrated, the tally leads with what is left and one step is marked next', async ({
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
  await page.goto('/path/')

  const body = page.locator(`.hl-path-body[data-role="${SE}"]`)
  await expect(body).toBeVisible()

  // §13.8 — TO-GO framing, and §11.35 forbids a percentage outright. Three
  // sheets were seeded as signed, so the tally counts three off the drawn total.
  await expect(body).toContainText(/\d+\s+OF\s+\d+\s+REMAINING/i)
  await expect(body).toContainText(/SIGNED OFF\s+3\s+OF\s+\d+/i)

  // §13.4.2 — the two numbers are both printed, and they differ. A path that
  // counted its draft steps would print the same number twice and ask the
  // reader to finish sheets nobody has written. How many steps the path holds
  // is curation, so the numbers are read off the page and compared.
  const tally = (await body.innerText()).toUpperCase()
  const steps = Number(/(\d+)\s+STEPS/.exec(tally)?.[1])
  const drawn = Number(/(\d+)\s+SHEETS DRAWN/.exec(tally)?.[1])
  expect(steps).toBeGreaterThan(drawn)
  expect(drawn).toBeGreaterThan(0)
  expect(tally).not.toContain('%')

  // Exactly one step is next, and it is the first unsigned DRAWN step in path
  // order: the path opens 1, 3, 4, …, and 1 is signed, so 3 is next.
  const next = body.locator('.hl-step[data-next="true"]')
  await expect(next).toHaveCount(1)
  await expect(next).toHaveAttribute('data-module', '3')
  // Every step carries the marker in its markup; channel B reveals exactly the
  // one whose ancestor got `data-next`, so the count of VISIBLE ones is the
  // assertion that matters — a reader must never see two steps both claiming to
  // be next.
  await expect(body.locator('.hl-step-next:visible')).toHaveCount(1)
})

test('choosing a role writes once, swaps the body, and asks nothing (§13.3)', async ({
  page,
}) => {
  await page.goto('/path/')
  await expect(page.locator('.hl-path-empty')).toBeVisible()

  await page.locator(`input[name="hl-role"][value="${SE}"]`).check()

  // Channel A re-stamps from the store, so the body swaps with no reload.
  await expect(page.locator(`.hl-path-body[data-role="${SE}"]`)).toBeVisible()
  await expect(page.locator('.hl-path-empty')).not.toBeVisible()

  await expect
    .poll(async () => (await readRecord(page))?.data.identity.role ?? null)
    .toBe(SE)

  // A path is a view over the corpus, not a container: switching roles loses
  // nothing, because sign-offs are recorded against sheets. So there is no
  // confirmation gate — §12's SC 3.3.4 dialog is for destructive acts, and this
  // is not one.
  await expect(page.locator('[role="alertdialog"]')).toHaveCount(0)

  await page.locator('input[name="hl-role"][value="qa"]').check()
  await expect(page.locator('.hl-path-body[data-role="qa"]')).toBeVisible()
  await expect(page.locator('.hl-path-body:visible')).toHaveCount(1)
  await expect
    .poll(async () => (await readRecord(page))?.data.identity.role ?? null)
    .toBe('qa')
})

test('a draft step points at nothing and says so (§13.4.2)', async ({ page }) => {
  await seedRecord(page, { identity: { role: SE } })
  await page.goto('/path/')

  const body = page.locator(`.hl-path-body[data-role="${SE}"]`)
  await expect(body).toBeVisible()

  // The path ends on draft sheets. A draft has no sign-off control at all
  // (§12.4.1), so its step carries no link that implies a lesson, and it never
  // claims to be next. Which sheets are still drafts is the corpus's business,
  // so the step is found by what it says.
  const draft = body.locator('.hl-step', { hasText: 'NOT DRAWN' }).first()
  await expect(draft).toBeVisible()
  await expect(draft).toContainText('NOT DRAWN')
  await expect(draft.locator('a')).toHaveCount(0)
  await expect(draft.locator('.hl-step-tick')).not.toBeVisible()
})

test('the reader’s own tally never announces itself twice (SC 4.1.3)', async ({ page }) => {
  await seedRecord(page, {
    identity: { role: SE },
    sheets: { 'fundamentals/llms': signedSheet('abc1234') },
  })
  await page.goto('/path/')
  await expect(page.locator(`.hl-path-body[data-role="${SE}"]`)).toBeVisible()

  // Driving this page found two visible live regions both stating the standing
  // on load — the path's readout and the picker's — so a screen reader heard the
  // same count twice for a page nobody had touched. SC 4.1.3 is about a CHANGE
  // in status: the picker stays silent until the reader picks something.
  const live = page.locator('[role="status"]:visible')
  const texts = await live.allInnerTexts()
  const stating = texts.filter((text) => /REMAINING/i.test(text))
  expect(stating).toHaveLength(1)

  // And once the reader does choose, the picker speaks — that is the change.
  await page.locator('input[name="hl-role"][value="qa"]').check()
  await expect
    .poll(async () => (await page.locator('[role="status"]:visible').allInnerTexts())
      .filter((text) => /REMAINING/i.test(text)).length)
    .toBe(2)
})
