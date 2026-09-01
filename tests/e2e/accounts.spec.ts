import { expect, test } from '@playwright/test'

import { openRegisterRow, seedRecord, signedSheet, waitForHydratedReadout } from './record'
import {
  accountsEnv,
  cleanup,
  makeAdmin,
  seed,
  serverEventKinds,
  serverEvents,
  serverRecord,
  signInByLink,
  type Fixture,
} from './accounts'

/**
 * §14 — the whole feature, in real Chrome against a real Supabase project.
 *
 * ## What only this file can answer
 *
 * The unit suite proves `mergeRecords` merges and `sync.ts` transitions. Neither
 * can prove the thing the reader was actually promised: that a record survives
 * the browser it was made in. That claim spans a real session, a real RLS
 * policy, a real static export and a second empty browser profile, and it is
 * false in a dozen ways that every layer in isolation reports as fine.
 *
 * ## Gate
 *
 * Requires a build made with `NEXT_PUBLIC_AUTH_ENABLED=true` and a filled
 * `.env.local`. `E2E_ACCOUNTS=1` asserts the first; the second is checked and
 * skipped rather than failed, so a clone with no credentials still runs the
 * suite green — the credentials are not in the repository and never will be.
 *
 * ## Serial
 *
 * One organisation, four accounts, one database. These tests share that state
 * on purpose: "a manager sees three records" is only a real claim if three
 * records exist, and building a private org per test would test a shape no
 * deployment has.
 */

const env = accountsEnv()
const ENABLED = process.env.E2E_ACCOUNTS === '1' && env !== null

test.describe('§14 accounts, organisations and the record that outlives a browser', () => {
  test.skip(!ENABLED, 'needs E2E_ACCOUNTS=1 and a filled .env.local')
  /**
   * Serial, and 60s per test rather than Playwright's 30.
   *
   * Every test here waits on real Supabase round trips, and two of them add a
   * deliberate settle — one delays the claim's read to open a window, one waits
   * out a push that must NOT arrive. A 30s budget fits those on a quiet network
   * and not on a slow one, and in serial mode the first timeout takes the rest of
   * the suite with it as "did not run": the failure that shows is then a timing
   * accident rather than the assertion anyone wrote. The budget is stated here
   * because the waits are deliberate, not because the tests are slow.
   */
  test.describe.configure({ mode: 'serial', timeout: 60_000 })

  let fixture: Fixture

  test.beforeAll(async () => {
    fixture = await seed(env!)
  })

  test.afterAll(async () => {
    if (env) await cleanup(env, makeAdmin(env))
  })

  // -- §14.7 sign-in --------------------------------------------------------

  test('the sign-in sheet offers exactly the providers this project has', async ({ page }) => {
    // Asserted against Supabase's own public settings rather than against a
    // fixed list of three. A provider needs code AND configuration, and the
    // panel used to offer all three unconditionally — so on a project with
    // GitHub switched off, pressing its button produced a server error and the
    // reader had no way to know it was never going to work. §14.1's own
    // argument applies to itself: a button that cannot work is worse than none.
    const settings = await fetch(`${env!.url}/auth/v1/settings`, {
      headers: { apikey: env!.anon },
    }).then((r) => r.json())
    const enabled = settings.external as Record<string, boolean>

    await page.goto('/sign-in/')
    await expect(page.getByText('ACCOUNTS NOT ENABLED YET')).toHaveCount(0)

    // The probe is in flight on first paint; the panel says so rather than
    // flashing buttons it is about to remove.
    await expect(page.getByText('CHECKING WHICH METHODS THIS SITE OFFERS')).toHaveCount(0, {
      timeout: 15_000,
    })

    for (const [provider, pattern] of [
      ['github', /github/i],
      ['google', /google/i],
    ] as const) {
      const button = page.getByRole('button', { name: pattern })
      if (enabled[provider]) await expect(button).toBeVisible()
      else await expect(button, `${provider} is off in this project`).toHaveCount(0)
    }

    // The email link is the one this project always has, and the only one the
    // account tests themselves use.
    expect(enabled.email, 'the email provider is off — the suite cannot sign in').toBe(true)
    await expect(page.getByRole('button', { name: /link|email/i }).first()).toBeVisible()

    // And when no provider sign-in exists at all, the panel says that too,
    // instead of leaving an empty row where two buttons used to be.
    if (!enabled.github && !enabled.google) {
      await expect(page.getByText(/NO PROVIDER SIGN-IN ON THIS DEPLOYMENT/i)).toBeVisible()
    }
  })

  test('a magic link signs the reader in and lands them back on the site', async ({
    page,
    baseURL,
  }) => {
    await signInByLink(page, fixture, fixture.emails.learner, baseURL!)

    // The callback must not leave the reader on a Supabase error page or on a
    // blank screen: §14.7 requires it to return them to the site.
    await page.goto('/profile/')
    await waitForHydratedReadout(page)
    await expect(page.getByText(fixture.emails.learner, { exact: false })).toBeVisible()
  })

  // -- §14.7.4 the claim ----------------------------------------------------

  test('an anonymous record is claimed, summarised, and pushed', async ({ page, baseURL }) => {
    // Two signed sheets made before this browser had ever heard of an account.
    await seedRecord(page, {
      identity: { name: 'Ada Lovelace', markSeed: '0123abcd' },
      sheets: {
        // Category-prefixed, because that is what `derive.ts` iterates and
        // what the routes are: a bare module slug matches no sheet, so
        // `signedCount` would count zero and `progress.signedOff` would read 0
        // for a record with two signatures in it.
        'intermediate/harness-engineering': signedSheet('f60e2d2'),
        'intermediate/coding-agents': signedSheet('f60e2d2'),
      },
    })
    await page.goto('/')
    await waitForHydratedReadout(page)

    await signInByLink(page, fixture, fixture.emails.learner, baseURL!)
    await page.goto('/profile/')
    await waitForHydratedReadout(page)

    // §14.7.4 — the reader is TOLD what happened to their own record. The
    // account held nothing, so this is the `adopted` outcome.
    await expect(page.getByText('NO RECORD IN ACCOUNT')).toBeVisible()

    // §14.7.3 — and the footer stops claiming nothing once the push lands.
    await expect
      .poll(() => page.locator('footer .hl-readout').getAttribute('data-sync'), {
        timeout: 20_000,
        message: 'the readout never reached a settled sync state',
      })
      .toBe('synced')

    // The server actually holds it. Read past RLS, because the assertion is
    // about the row existing, not about who may see it.
    await expect
      .poll(async () => {
        const row = await serverRecord(fixture, fixture.ids.learner)
        return Object.keys((row?.data?.sheets as Record<string, unknown>) ?? {}).length
      }, { timeout: 20_000 })
      .toBe(2)

    const row = await serverRecord(fixture, fixture.ids.learner)
    const sheets = row!.data.sheets as Record<string, { signedOff: string | null }>
    expect(sheets['intermediate/harness-engineering'].signedOff).not.toBeNull()
    expect(sheets['intermediate/coding-agents'].signedOff).not.toBeNull()

    // §14.9 — the stored progress is derive.ts's own output, not SQL's guess.
    expect(row!.progress).toMatchObject({ signedOff: 2 })
    expect(typeof (row!.progress as { ratio: number }).ratio).toBe('number')
  })

  test('THE PROMISE: the record reaches a second, empty browser', async ({ browser, baseURL }) => {
    // A brand-new context is a different browser profile: empty localStorage,
    // no session, nothing carried over. This is the claim the whole phase was
    // built to make, and the only test that can falsify it.
    const fresh = await browser.newContext()
    const page = await fresh.newPage()
    try {
      await page.goto('/')
      const before = await page.evaluate(() => window.localStorage.getItem('hl-record'))
      expect(before, 'the fresh context was not empty').toBeNull()

      await signInByLink(page, fixture, fixture.emails.learner, baseURL!)
      await page.goto('/profile/')
      await waitForHydratedReadout(page)

      await expect
        .poll(
          () => page.evaluate(() => window.localStorage.getItem('hl-record') ?? ''),
          { timeout: 20_000, message: 'the account record never arrived in the new browser' }
        )
        .toContain('intermediate/harness-engineering')

      // Not merely present — the sign-off survived the round trip.
      const restored = await page.evaluate(() => window.localStorage.getItem('hl-record') ?? '')
      const parsed = JSON.parse(restored) as {
        data: { sheets: Record<string, { signedOff: string | null }> }
      }
      expect(parsed.data.sheets['intermediate/harness-engineering'].signedOff).not.toBeNull()
      expect(parsed.data.sheets['intermediate/coding-agents'].signedOff).not.toBeNull()
    } finally {
      await fresh.close()
    }
  })

  test('a sign-off made while signed in is appended to the log §14.2.3', async ({
    page,
    baseURL,
  }) => {
    await seedRecord(page, { identity: { name: 'Ada Lovelace', markSeed: '0123abcd' } })
    await signInByLink(page, fixture, fixture.emails.colleague, baseURL!)

    await page.goto('/courses/intermediate/harness-engineering/')
    await waitForHydratedReadout(page)
    await page.getByRole('button', { name: 'SIGN OFF', exact: true }).click()
    await expect(page.getByRole('button', { name: /^SIGNED OFF / })).toBeVisible()

    // The event name IS the reducer name (§14.2.3) - no translation layer.
    await expect
      .poll(() => serverEventKinds(fixture, fixture.ids.colleague), { timeout: 20_000 })
      .toContain('signOff')
  })

  /**
   * §14.8.1 rule 2 — ONE row per attempt, measured with real keystrokes.
   *
   * This row used to be filed from the textarea's `onChange`, so it was one row
   * per CHARACTER. `pressSequentially` types the answer the way a reader does,
   * which is the only way to tell the two apart: a test that sets the value in
   * one go would have passed against the defect.
   *
   * Two assertions, because the defect had two halves. The count is the
   * cheap one. The absence of the answer text is the one that mattered:
   * `learner_event` has no delete policy while the reader belongs to an
   * organisation, so a draft filed there could never be retracted — including
   * text written and then deleted.
   */
  test('a typed quiz answer files ONE attempt, and no answer text §14.8.1', async ({
    page,
    baseURL,
  }) => {
    await signInByLink(page, fixture, fixture.emails.colleague, baseURL!)
    await page.goto('/courses/intermediate/harness-engineering/')
    await waitForHydratedReadout(page)

    const DRAFT = 'the hook exits nonzero'
    const ANSWER = 'a broken guardrail must fail closed, and be tested as a guardrail'
    const box = page.getByLabel('YOUR ANSWER')

    await box.click()
    // A draft, then all of it deleted: the text a reader most wants back, and
    // the case the keystroke handler filed 23 unretractable rows for.
    await box.pressSequentially(DRAFT, { delay: 4 })
    await box.press('Control+a')
    await box.press('Backspace')
    await box.pressSequentially(ANSWER, { delay: 4 })
    // The attempt boundary: focus leaves the field.
    await page.keyboard.press('Tab')

    const attempts = async () =>
      (await serverEvents(fixture, fixture.ids.colleague))
        .filter((row) => row.kind === 'setQuizAnswer').length

    /*
      The envelope FIRST, and the order is the whole reason this test is not
      vacuous.

      `expect.poll(attempts).toBe(1)` was the obvious way to write the count
      assertion and it protected nothing: MEASURED against a deliberately
      restored per-keystroke handler, it passed. A poll succeeds on its first
      matching observation, and a count climbing 1, 2, 3 … is momentarily 1. The
      assertion was watching a growing quantity for a value it was guaranteed to
      pass through.

      So the wait is anchored to something that arrives ONCE and settles: the
      answer itself, in `record_state`. When the envelope holds the whole
      answer, every keystroke has been through the throttled flush, and the row
      count can be read as a total rather than sampled as it grows.
    */
    await expect
      .poll(async () => {
        const record = await serverRecord(fixture, fixture.ids.colleague)
        const sheets = record?.data.sheets as Record<string, { quiz?: { answer?: string } }>
        return sheets?.['intermediate/harness-engineering']?.quiz?.answer ?? null
      }, { timeout: 20_000 })
      .toBe(ANSWER)

    // One flush interval past the last write, because the log rides the same
    // timer as the envelope and a row queued behind it would otherwise be
    // counted after this test had already read the total.
    await page.waitForTimeout(2_000)

    expect(await attempts()).toBe(1)

    // Nothing the reader typed reached the log — neither the answer nor the
    // draft they deleted. The envelope carries the answer, where they can
    // overwrite it and erase it; the log carries the act, where they cannot.
    const rows = await serverEvents(fixture, fixture.ids.colleague)
    const logged = JSON.stringify(rows.map((row) => row.payload))
    expect(logged).not.toContain('guardrail')
    expect(logged).not.toContain('nonzero')
  })

  /**
   * §14.7.4 — a write made WHILE the claim is in flight survives it.
   *
   * `claim()` is two network round trips: read the account's row, then push the
   * merge. The record layer is mounted and interactive for the whole of it, and
   * the branch that lands the merge used to be `update(() => outcome.record)` —
   * a replacement with a value computed before the reader touched anything. A
   * sign-off made in that window was reverted in front of them.
   *
   * The window is made deterministic rather than raced for: the account's read
   * is delayed at the network, and the sign-off happens inside the delay. This
   * effect runs on every mount with a session, so what the delay widens is an
   * ordinary page load, not an exotic state.
   */
  test('a sign-off made while the claim is in flight is not reverted §14.7.4', async ({
    page,
    baseURL,
  }) => {
    await signInByLink(page, fixture, fixture.emails.colleague, baseURL!)

    // Only the claim's READ is delayed. A blanket delay would also hold up the
    // push and the log append, and then nothing would distinguish "the write
    // survived" from "the write never left".
    await page.route(
      (url) => url.pathname.endsWith('/record_state') && url.searchParams.has('select'),
      async (route) => {
        if (route.request().method() !== 'GET') return route.continue()
        await new Promise((resolve) => setTimeout(resolve, 2_500))
        return route.continue()
      },
    )

    const SHEET = '/courses/intermediate/context-engineering/'
    await page.goto(SHEET)
    await waitForHydratedReadout(page)

    // Inside the delay: the claim has not resolved, so `outcome.record` — if it
    // were applied as a replacement — cannot know about this.
    await page.getByRole('button', { name: 'SIGN OFF', exact: true }).click()
    await expect(page.getByRole('button', { name: /^SIGNED OFF / })).toBeVisible()

    // Past the delay, so the merge has landed and written to localStorage.
    await page.waitForTimeout(4_000)
    await expect(page.getByRole('button', { name: /^SIGNED OFF / })).toBeVisible()

    // And it is in the record, not merely on the screen: a reload reads
    // localStorage, which is what the merge wrote.
    await page.unroute(
      (url) => url.pathname.endsWith('/record_state') && url.searchParams.has('select'),
    )
    await page.reload()
    await waitForHydratedReadout(page)
    await expect(page.getByRole('button', { name: /^SIGNED OFF / })).toBeVisible()
  })

  /**
   * §14.6 — the erase removes both halves, and a second tab does not undo it.
   *
   * Two defects in one flow, because they are one flow:
   *
   *  - `learner_event` was never deleted by anything. `0003_phase4_erase.sql`
   *    shipped the policy that permits it for a reader no organisation holds —
   *    §14.6's first row — and no code ever called it, so the history stayed
   *    behind for everybody.
   *  - The local erase removes the storage key, every other open tab's
   *    `storage` handler saw `newValue === null`, adopted the empty record and
   *    PUSHED it. That push is independent of this tab's ordering, so it could
   *    land after the delete and recreate `record_state` — while the dialog had
   *    already reported the account copy removed.
   *
   * `eraser` is its own fixture user, in no organisation — the only case in
   * which the history is theirs to remove. It is not `outsider`, because this
   * test destroys the browser it runs in and a later test signing the same
   * reader in again failed waiting for a session.
   */
  test('an erase removes the history too, and a second tab does not undo it §14.6', async ({
    page,
    context,
    baseURL,
  }) => {
    await signInByLink(page, fixture, fixture.emails.eraser, baseURL!)

    // Something to erase, in both tables.
    await page.goto('/courses/intermediate/loop-engineering/')
    await waitForHydratedReadout(page)
    await page.getByRole('button', { name: 'SIGN OFF', exact: true }).click()
    await expect(page.getByRole('button', { name: /^SIGNED OFF / })).toBeVisible()
    await expect
      .poll(() => serverRecord(fixture, fixture.ids.eraser), { timeout: 20_000 })
      .not.toBeNull()
    await expect
      .poll(() => serverEventKinds(fixture, fixture.ids.eraser), { timeout: 20_000 })
      .toContain('signOff')

    // The second tab, in the SAME context: same origin, same localStorage, so
    // its `storage` handler fires on the erase. This is the tab that used to
    // recreate the row.
    const sibling = await context.newPage()
    await sibling.goto('/dashboard/')
    await sibling.waitForTimeout(1_000)

    await page.goto('/profile/')
    await waitForHydratedReadout(page)
    // §16.4 — the erase control is in the `data` register row, closed on
    // arrival, and `click()` needs a rendered box (hazard H-A).
    await openRegisterRow(page, 'data')
    await page.getByRole('button', { name: 'ERASE ALL LOCAL DATA' }).click()
    const dialog = page.locator('[role="dialog"]')
    await dialog.getByLabel('Type ERASE to confirm').fill('ERASE')
    await dialog.getByRole('button', { name: 'Erase all data' }).click()

    // Long enough for a sibling push to have landed if one were made: the
    // storage event is synchronous and the push follows it immediately.
    await page.waitForTimeout(5_000)

    expect(await serverRecord(fixture, fixture.ids.eraser)).toBeNull()
    expect(await serverEventKinds(fixture, fixture.ids.eraser)).toEqual([])

    await sibling.close()
  })

  // -- §14.8 the panel ------------------------------------------------------

  test('a manager sees the whole organisation, claim and evidence apart', async ({
    page,
    baseURL,
  }) => {
    await signInByLink(page, fixture, fixture.emails.manager, baseURL!)
    await page.goto('/team/')

    // §11.25 - the page says nothing until the query answers.
    await expect(page.getByRole('table')).toBeVisible({ timeout: 20_000 })

    // §14.8.2 - two columns, never merged into one tick.
    await expect(page.getByRole('columnheader', { name: /claim/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /evidence/i })).toBeVisible()

    // Three members: the manager and two colleagues.
    await expect(page.getByRole('row')).toHaveCount(4) // header + 3

    // §14.8.2 / blocker 7 — a NAME, not a uuid. `profiles` was written by
    // nobody before this phase's fix, so every member printed as `USER
    // 1a2b3c4d` and every submittal classified as unattributable for ever.
    //
    // The name shown is the one in the RECORD, not the fixture's: the session
    // island upserts `profiles.display_name` from `identity.name`, so the two
    // learners who signed in carrying a seeded record read as that record's
    // name. The manager never seeded one, and `profileRowFor` declines to write
    // a row with nothing in it (§11.25's absent-not-empty rule), so the
    // fixture's own value survives for them. Both facts are asserted, because
    // together they prove the write happened AND that it did not overwrite with
    // emptiness.
    await expect(page.getByText(/^USER [0-9a-f]{8}$/)).toHaveCount(0)
    await expect(page.getByText('Ada Lovelace').first()).toBeVisible()
    await expect(page.getByText('E2E Manager')).toBeVisible()
  })

  test('a non-manager is told they are not one, not shown an empty table', async ({
    page,
    baseURL,
  }) => {
    await signInByLink(page, fixture, fixture.emails.learner, baseURL!)
    await page.goto('/team/')

    // §11.25 again, from the other side: an empty result from RLS is a fact
    // about the reader's role, and printing an empty roster would state
    // something else entirely.
    // Both halves, asserted separately: the readout mark and the sentence that
    // explains it. §11.25's rule is that a state is named AND said, so a test
    // that matched either loosely would pass against a page carrying only one.
    await expect(page.getByText('NOT A MANAGER', { exact: true })).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByText(/You are not a manager of an organisation/)).toBeVisible()
    await expect(page.getByRole('table')).toHaveCount(0)
  })

  // -- §14.5 joining --------------------------------------------------------

  test('the join sheet discloses before it offers, and the reader joins', async ({
    page,
    baseURL,
  }) => {
    await signInByLink(page, fixture, fixture.emails.outsider, baseURL!)
    await page.goto('/join/')

    // The outsider's address is on the org's join_domain, so path 1 applies.
    const joinButton = page.getByRole('button', { name: /join/i }).first()
    await expect(joinButton).toBeVisible({ timeout: 20_000 })

    // §14.5.1 - the three statements, and the button BELOW them. Position is
    // the requirement, not merely presence: a disclosure under the control has
    // already failed.
    const disclosure = page.getByText(/read the same record|whole record|entire record/i).first()
    await expect(disclosure).toBeVisible()
    const disclosureBox = await disclosure.boundingBox()
    const buttonBox = await joinButton.boundingBox()
    expect(disclosureBox!.y, 'the disclosure must sit above the control').toBeLessThan(buttonBox!.y)

    // And erasing later does not erase the organisation's copy (§14.6).
    await expect(page.getByText(/does not withdraw the history|already holds/i)).toBeVisible()

    await joinButton.click()

    // The row the READER wrote - §14.5's consent mechanism.
    await expect
      .poll(async () => {
        const { data } = await fixture.admin
          .from('memberships')
          .select('user_id')
          .eq('user_id', fixture.ids.outsider)
        return data?.length ?? 0
      }, { timeout: 20_000, message: 'the membership row was never written' })
      .toBe(1)
  })
})
