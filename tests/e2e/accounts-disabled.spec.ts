import { type Page, expect, test } from '@playwright/test'

import { RECORD_KEY, seedRecord, waitForHydratedReadout } from './record'

/**
 * §14.1 — the kill switch, from the browser's side.
 *
 * §14.1 makes `bazaar.lokumai.com` a PRECONDITION for accounts, and the reason
 * is not tidiness: `lokumai.github.io` is one origin shared with every other
 * project site published under that account, an origin is a scheme/host/port
 * tuple that excludes the path, and a session token in `localStorage` on a
 * shared origin is readable by any sibling site. So the code ships before the
 * domain does, with `NEXT_PUBLIC_AUTH_ENABLED` off.
 *
 * A flag is only a safety measure if something checks it. These tests are that
 * check, and they assert the two things that matter separately:
 *
 *   1. No auth UI is offered. A button that cannot work is worse than no
 *      button, because the reader blames themselves.
 *   2. NOTHING REACHES SUPABASE. This is the one that a rendering assertion
 *      cannot make: a page can hide its buttons and still open a session in an
 *      effect. So the network is recorded and the assertion is on the requests.
 *
 * Runs against the default build. `E2E_ACCOUNTS=1` marks a build made WITH the
 * flag on, and these tests skip there — the same assertions would then be
 * asserting the opposite of the truth.
 */

const AUTH_ON = process.env.E2E_ACCOUNTS === '1'

/**
 * No door on this page, by every name a door goes by.
 *
 * The email field is asserted as well as the three buttons, and it is the more
 * useful half: a control that cannot work is worse than no control, and a text
 * field that swallows an address and does nothing with it is exactly that. The
 * route is named in the failure because this now runs over more than one.
 */
async function expectNoDoor(page: Page, route: string): Promise<void> {
  for (const door of [/github/i, /google/i, /email link/i, /magic link/i]) {
    await expect(
      page.getByRole('button', { name: door }),
      `${route} offers a ${String(door)} door with accounts disabled`,
    ).toHaveCount(0)
  }
  await expect(
    page.locator('input[type="email"]'),
    `${route} offers an email field with accounts disabled`,
  ).toHaveCount(0)
}

test.describe('§14.1 accounts are switched off', () => {
  test.skip(AUTH_ON, 'this build has NEXT_PUBLIC_AUTH_ENABLED=true')

  test('/sign-in/ says so, and offers no provider', async ({ page }) => {
    await page.goto('/sign-in/')
    await expect(
      page.getByText('ACCOUNTS NOT ENABLED YET'),
      'the build under test has accounts ENABLED. `next build` reads .env.local, '
        + 'so a local NEXT_PUBLIC_AUTH_ENABLED=true produces a build these '
        + 'assertions are the opposite of. Set it back to false, or run the '
        + 'accounts suite instead: E2E_ACCOUNTS=1 npx playwright test accounts.spec.ts',
    ).toBeVisible()

    // The page still has to be useful: §14.13's honesty requirement is that it
    // says what DOES work, not merely what does not. Named exactly — the page
    // has a second link whose text also contains "profile sheet".
    await expect(
      page.getByRole('link', { name: 'Go to the profile sheet', exact: true })
    ).toBeVisible()

    // No provider control of any kind. Two routes render one now (§16.1), and
    // each asserts it where a reader would meet it; the shared helper is what
    // keeps the two bans the same ban.
    await expectNoDoor(page, '/sign-in/')
  })

  test('/profile/ says so too, and its drafter block offers no door', async ({ page }) => {
    /**
     * §16.1 — the constraint on half B of the drafter block, and the test that
     * fails first if it is broken.
     *
     * §16 moved the sign-in controls onto `/profile/`, inside a block that is
     * open on arrival: before §16 the only page that could offer a door was
     * `/sign-in/`, and the ban above was scoped to that route accordingly. The
     * block renders `SignInPanel` in `inline` chrome rather than writing a
     * second sign-in form (§16.1.1, §11.38), so the flag is still read in one
     * place — but `chrome` reaching into the state machine, or the block
     * branching on the session itself, would put an email field and two provider
     * buttons on the profile sheet of a deployment that has no backend. That is
     * §14.1's worst outcome: a control that cannot work, on the page a reader
     * with no account is sent to.
     */
    await seedRecord(page, { identity: { name: 'Ada Lovelace', markSeed: '0123abcd' } })
    await page.goto('/profile/')
    await waitForHydratedReadout(page)

    // The state, in the words of the state it is in — the same single spelling
    // `/sign-in/` prints, from the same author.
    await expect(page.getByText('ACCOUNTS NOT ENABLED YET')).toBeVisible()

    await expectNoDoor(page, '/profile/')

    // And the half is not merely empty: it says what does work without one,
    // which is §14.13's honesty requirement applied to the block.
    await expect(page.locator('section[aria-labelledby="hl-account-head"]')).toContainText(
      /without an account/i,
    )
  })

  test('no page opens a connection to the project', async ({ page }) => {
    const reached: string[] = []
    page.on('request', (r) => {
      const u = r.url()
      if (u.includes('supabase.co') || u.includes('supabase.com')) reached.push(u)
    })

    // Every route that knows about accounts, plus a sheet, which must be
    // untouched by any of this.
    for (const path of [
      '/',
      '/sign-in/',
      '/join/',
      '/team/',
      '/team/assignments/',
      '/profile/',
      '/courses/intermediate/harness-engineering/',
    ]) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
    }

    expect(reached, `these requests were made with accounts disabled:\n${reached.join('\n')}`).toEqual([])
  })

  test('the footer asserts nothing about a server', async ({ page }) => {
    await page.goto('/courses/intermediate/harness-engineering/')
    const readout = page.locator('footer .hl-readout')
    await expect(readout).toHaveAttribute('data-hydrated', 'true')
    // §14.7.3: `off` is a claim too - "I am not saying anything about a server".
    await expect(readout).toHaveAttribute('data-sync', 'off')
  })

  test('the record still works with no account at all', async ({ page }) => {
    // A name on record so §12.3.2's prompt never opens: this test is about the
    // write reaching storage, and a form in the middle of it is a second
    // subject. The established fixture, not a hand-rolled one.
    await seedRecord(page, { identity: { name: 'Ada Lovelace', markSeed: '0123abcd' } })

    await page.goto('/courses/intermediate/harness-engineering/')
    await waitForHydratedReadout(page)
    const readout = page.locator('footer .hl-readout')
    await expect(readout).toHaveAttribute('data-hydrated', 'true')

    await page.getByRole('button', { name: 'SIGN OFF', exact: true }).click()
    await expect(page.getByRole('button', { name: /^SIGNED OFF / })).toBeVisible()

    // The record is in this browser, exactly as it was before §14 existed.
    //
    // Polled, not read once: §12.1.4 throttles the flush, so the write reaches
    // storage a beat after the button reports the sign-off. Reading immediately
    // returns the value from before the click and the assertion fails against
    // entirely correct code.
    await expect
      .poll(
        () => page.evaluate((key) => window.localStorage.getItem(key) ?? '', RECORD_KEY),
        { message: 'the local record must still be written with no account' }
      )
      .toContain('signedOff')
    await expect(readout).toHaveAttribute('data-sync', 'off')
  })
})
