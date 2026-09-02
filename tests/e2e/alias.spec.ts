import { type Page, expect, test } from '@playwright/test'

import { readRecord, waitForRecord } from './record'

/**
 * §15.10 — `/sign-in/alias/`, the route that has to work with no environment.
 *
 * The claim §15.4.4 makes is structural: nothing on this route's import graph
 * reaches supabase, a session or a fetch, so the exported document is a
 * heading, a field and eight radios produced in node with nothing configured.
 * A page that promises that in a comment and then opens a connection in an
 * effect looks identical to a reader, which is why the guard below is a
 * request COUNT.
 *
 * ## Why nothing here uses `page.route`
 *
 * §15.10.1 names this route's network test as one of the two gates that can
 * most easily become a lie, and blocking is how it would happen. `page.route`
 * with an abort proves the route was never NEEDED only if something would have
 * noticed the block — and nothing on this screen would: there is no spinner
 * waiting on a session, no error boundary around a fetch, no retry. The alias
 * would be written to `localStorage` and the page would look exactly as it does
 * now whether the request was aborted or never attempted. So every request is
 * let through and the assertion is on what was actually asked for.
 *
 * `accounts-disabled.spec.ts` counts supabase hosts the same way, for the same
 * reason. This spec widens it: on this one route the honest answer is not
 * "no supabase" but "nothing at all beyond this page's own assets", so an
 * off-origin host, a writing method and an API-shaped path are each counted
 * too. A CDN font or an analytics beacon added to the shell would fail here
 * before it failed anywhere else.
 *
 * The one same-origin `fetch` this page does make is the App Router prefetching
 * the three links it renders — MEASURED as `HEAD /sign-in/`, `HEAD /profile/`
 * and the matching `__next.*.txt?_rsc=` payloads, every one of them a file that
 * `out/` already contains. Those are this page's own assets by any reading, so
 * the shape is allowed by name rather than by resource type, and a `fetch` of
 * anything else still fails.
 *
 * ## What the record part proves
 *
 * §15.4.1: the screen is a VIEW, and the only thing it may do is put `name` and
 * `mark` into the record that already holds them. §12.1.3's mapping is the
 * subtle half — the seeded option is the absence of a glyph, so it stores
 * `mark: null` and never the string `'seeded'`, and a record that stored the
 * string would still render correctly on this screen while telling every other
 * reader of the field that a choice was made.
 */

const ALIAS = '/sign-in/alias/'

/** The preview, addressed the way §15.4.3 makes it addressable. */
const STAMP = 'aside[aria-label="Your stamp, as a sheet will print it"]'

/** §15.4.3 — the correction rides on the artefact, in every draft state. */
const UNVERIFIED = 'UNVERIFIED'

/**
 * `STORABLE_MARK_IDS`, typed out rather than imported — the same reason
 * `tests/e2e/sheets.ts` types out the drawing set.
 *
 * This started as `expect(rendered).toEqual([...STORABLE_MARK_IDS])`, under a
 * comment claiming it guarded the stored order against a reshuffle. It did not:
 * both sides came from the one array, so reordering it moved the expectation
 * with the rendered output and the test stayed green. `mark.ts` calls that order
 * a STORED CONTRACT — a reader who chose the sixth mark must still find that
 * glyph in the sixth place — and no unit test pins it either: MEASURED, the only
 * literal list in `tests/unit/identity/mark.test.ts` pins `MARKS`, a different
 * array, and `tests/unit/identity/alias.test.tsx` compares the render against
 * the module the same self-referential way. So the literal lives here, and a
 * reshuffle of `NAMED_MARK_IDS`, a dropped `lokum` or a hard-coded seven now
 * goes red. Only the ids: the labels are `MARKS`' and are `alias.test.tsx`'s.
 */
const MARK_ORDER: readonly string[] = [
  'seeded',
  'datum',
  'section',
  'weld',
  'finish',
  'centre',
  'hex',
  'lokum',
]

// ---------------------------------------------------------------------------
// The network, counted
// ---------------------------------------------------------------------------

interface Ask {
  method: string
  url: string
  resourceType: string
}

/**
 * Records every request the context makes, from before the first navigation.
 * Nothing is intercepted, delayed or refused: the listener is a tally.
 */
function tally(page: Page): Ask[] {
  const asked: Ask[] = []
  page.on('request', (request) => {
    asked.push({
      method: request.method(),
      url: request.url(),
      resourceType: request.resourceType(),
    })
  })
  return asked
}

/**
 * The API shapes, named explicitly rather than left to the host check, because
 * a supabase project proxied under this origin's own path — the shape §14.1
 * would reach for if the shared-origin problem were ever solved that way — is
 * same-origin and would otherwise pass.
 */
const ENDPOINT = /(^\/api\/)|\/(auth|rest|realtime|storage|functions)\/v1\//

/**
 * The App Router's prefetch, and nothing else that could be mistaken for it: a
 * static route (`/profile/`) or its RSC payload (`…__next.profile.__PAGE__.txt`),
 * carrying no query but `_rsc`. A request body cannot hide in this shape, and a
 * call to an endpoint that happened to be same-origin fails the query test.
 */
function isRouterPrefetch(url: URL): boolean {
  if ([...url.searchParams.keys()].some((key) => key !== '_rsc')) return false
  return url.pathname.endsWith('/') || url.pathname.endsWith('.txt')
}

/**
 * The requests this page has no business making. Its own assets are same-origin
 * reads of a document, a stylesheet, a script, a font, an image or a route the
 * router prefetched; anything else is somebody else's server or an endpoint.
 */
function offending(asked: readonly Ask[], origin: string): Ask[] {
  return asked.filter((ask) => {
    if (ask.url.includes('supabase.co') || ask.url.includes('supabase.com')) return true
    if (!ask.url.startsWith(`${origin}/`)) return true
    // Reading verbs only: a POST, PUT or DELETE from this screen is a write to
    // somewhere, and there is nowhere for it to write to.
    if (ask.method !== 'GET' && ask.method !== 'HEAD') return true
    const url = new URL(ask.url)
    if (ENDPOINT.test(url.pathname)) return true
    if (ask.resourceType === 'fetch' || ask.resourceType === 'xhr') {
      return !isRouterPrefetch(url)
    }
    return false
  })
}

function describeAsks(asks: readonly Ask[]): string {
  return asks.map((ask) => `${ask.method} ${ask.url} (${ask.resourceType})`).join('\n')
}

/** Whatever the suite was pointed at, as an origin to compare against. */
function originOf(page: Page): string {
  return new URL(page.url()).origin
}

// ---------------------------------------------------------------------------
// The screen
// ---------------------------------------------------------------------------

function nameField(page: Page) {
  return page.getByLabel(/Alias, as you would sign a drawing/)
}

function markRadio(page: Page, id: string) {
  return page.locator(`input[name="hl-alias-mark"][value="${id}"]`)
}

/**
 * Choosing a mark the way a reader chooses one: by pressing the cell.
 *
 * §16.2 made this screen call the one shared `MarkPicker`, whose cell is a
 * `<label>` carrying the glyph and the mark's name with the native radio
 * visually hidden inside it — `opacity: 0` and `pointer-events: none`, never
 * `display: none`, so the group keeps its single tab stop and its arrow-key
 * navigation (`profile.css`, §16.2.3). `.check()` acts on the input itself and
 * fails on a control that cannot be hit, which is correct of Playwright and
 * wrong of this test: the input was never the target. So the gesture is the
 * label, and the ASSERTION is that the native radio ended up checked — the
 * state every other line here reads, and the one the platform owns.
 */
async function chooseMark(page: Page, id: string): Promise<void> {
  await page.locator(`label[data-hl-mark="${id}"]`).click()
  await expect(markRadio(page, id), `pressing the ${id} cell did not check its radio`).toBeChecked()
}

test.describe('§15.4 /sign-in/alias/', () => {
  test('reaches nothing beyond its own assets, even on submit', async ({ page }) => {
    const asked = tally(page)

    await page.goto(ALIAS)
    await page.waitForLoadState('networkidle')

    // The whole gesture, not just the load: a screen can be quiet until the
    // moment it has a name to send.
    await nameField(page).fill('Ada Lovelace')
    await chooseMark(page, 'hex')
    await page.getByRole('button', { name: 'KEEP THIS ALIAS', exact: true }).click()
    await waitForRecord(page, (env) => env?.data.identity.name === 'Ada Lovelace')
    await page.waitForLoadState('networkidle')

    const origin = originOf(page)
    const strays = offending(asked, origin)
    expect(
      strays,
      `/sign-in/alias/ asked for something beyond its own assets:\n${describeAsks(strays)}`,
    ).toEqual([])

    // And the tally is a tally: if the listener had gone unattached, the check
    // above would pass on an empty array and prove nothing. The document
    // itself must be in there.
    expect(
      asked.filter((ask) => ask.resourceType === 'document').map((ask) => ask.url),
      'no document request was recorded, so the tally never saw this navigation',
    ).toContain(`${origin}${ALIAS}`)
  })

  test('renders the mark options in their stored order', async ({ page }) => {
    await page.goto(ALIAS)

    // §15.4.2 — the order is a stored contract: a reader who chose the sixth
    // mark must find that glyph in the sixth place. Asserted against
    // `MARK_ORDER`, the typed-out list, for the reason its docblock gives.
    const rendered = await page.locator('[data-hl-mark]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-hl-mark')),
    )
    expect(rendered).toEqual(MARK_ORDER)

    // One radio per option, all eight under one `name`, which is what makes the
    // group a single tab stop — the reason the picker uses native radios at all.
    // The count is taken on that attribute selector, so a radio given its own
    // name would be missing here rather than merely differently focusable.
    await expect(page.locator('input[name="hl-alias-mark"]')).toHaveCount(MARK_ORDER.length)

    // §15.4.5 — two controls of one weight, and the exit is a real way out.
    await expect(page.getByRole('button', { name: 'KEEP THIS ALIAS', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'READ WITHOUT ONE', exact: true })).toBeVisible()
  })

  test('a name and a named mark are written, and survive a reload', async ({ page }) => {
    await page.goto(ALIAS)

    await nameField(page).fill('  Ada  Lovelace  ')
    await chooseMark(page, 'centre')
    await page.getByRole('button', { name: 'KEEP THIS ALIAS', exact: true }).click()

    // §12.1.4 throttles the flush, so this is polled rather than read on the
    // next line — the read taken immediately returns the record from before
    // the click and fails against entirely correct code.
    const stored = await waitForRecord(
      page,
      (env) => env !== null && env.data.identity.name !== null,
      'the alias',
    )
    // §12.3.4 sanitising is the store's, and the screen must not have stored
    // the raw field.
    expect(stored.data.identity.name).toBe('Ada Lovelace')
    expect(stored.data.identity.mark).toBe('centre')
    // §15.4.1 — the screen writes those two fields and touches nothing else.
    expect(stored.data.identity.markSeed).toBe(null)
    expect(stored.data.identity.role).toBe(null)

    await page.reload()

    const after = await readRecord(page)
    expect(after?.data.identity.name).toBe('Ada Lovelace')
    expect(after?.data.identity.mark).toBe('centre')

    // Read back onto the screen, not merely present in storage: channel B
    // fills both fields from the record once it has been read (§12.2).
    await expect(nameField(page)).toHaveValue('Ada Lovelace')
    await expect(markRadio(page, 'centre')).toBeChecked()
    await expect(page.locator(STAMP)).toContainText('Ada Lovelace')
  })

  test('the seeded option stores mark: null, not "seeded"', async ({ page }) => {
    await page.goto(ALIAS)

    // §12.1.3, §12.3.5 — the seeded mark is not a glyph, it is the absence of a
    // choice. Storing the string would render identically here and misinform
    // every other reader of the field.
    await nameField(page).fill('Grace Hopper')
    await chooseMark(page, 'seeded')
    await page.getByRole('button', { name: 'KEEP THIS ALIAS', exact: true }).click()

    const stored = await waitForRecord(
      page,
      (env) => env?.data.identity.name === 'Grace Hopper',
      'the seeded alias',
    )
    expect(stored.data.identity.mark).toBe(null)
  })

  test('the preview prints UNVERIFIED in every draft state', async ({ page }) => {
    await page.goto(ALIAS)

    const stamp = page.locator(STAMP)

    // §15.4.3 — this is the one screen where a name could be mistaken for a
    // proof, so the correction sits on the object that could be mistaken, not
    // in a paragraph beside it. Asserted inside the stamp for that reason.
    await expect(stamp).toBeVisible()
    await expect(stamp).toContainText(UNVERIFIED)

    // Empty field: the stamp prints what a title block genuinely prints for a
    // record with no name, and still prints the correction.
    await expect(stamp).toContainText('UNSIGNED')

    await nameField(page).fill('Ada Lovelace')
    await expect(stamp).toContainText('Ada Lovelace')
    await expect(stamp).toContainText(UNVERIFIED)

    await chooseMark(page, 'weld')
    await expect(stamp).toContainText(UNVERIFIED)

    await page.getByRole('button', { name: 'KEEP THIS ALIAS', exact: true }).click()
    await waitForRecord(page, (env) => env?.data.identity.name === 'Ada Lovelace')
    // Kept is not verified. A screen that dropped the word once the alias was
    // on the record would be at its most misleading exactly then.
    await expect(stamp).toContainText(UNVERIFIED)

    // Colour is never the only signal (T6): the word carries it and the
    // caution ink only agrees. So the word must be readable text, not a class.
    const status = stamp.locator('.hl-title-block-row', { hasText: 'Status' })
    await expect(status).toContainText(UNVERIFIED)
  })
})
