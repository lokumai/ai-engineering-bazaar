import { type Page, expect, test } from '@playwright/test'
import { contrastSamples, useTheme, worst } from './contrast'
import { A0, SHORT, A4, CATEGORY_PATHS, INDEX_SHEET, SHEETS } from './sheets'

/**
 * §10.2–§10.3 and §9.6 — the floors only a real engine can confirm.
 *
 * A skip link that exists in the DOM is not a skip link. It has to be the
 * first thing `Tab` reaches, it has to become visible when it is reached, and
 * pressing it has to actually move the reader past the header. All three are
 * separate failures and all three are invisible to a DOM snapshot.
 */

/**
 * §15.1 moved the manifest off `/`, so both addresses are listed: `/` is the
 * home screen and `/sheets/` is the register it used to hold. A new document
 * gets no exemption from the skip link or from the three landmarks.
 */
const PAGES = [
  '/',
  INDEX_SHEET,
  '/courses/',
  CATEGORY_PATHS[0],
  SHORT.path,
  A0.path,
  A4.path,
]

/** What has focus, described the way a keyboard user would recognise it. */
function focusDescription(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    if (!el || el === document.body) return null
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40),
      inHeader: !!el.closest('header'),
      inMain: !!el.closest('main'),
      outline: getComputedStyle(el).outlineWidth,
      outlineStyle: getComputedStyle(el).outlineStyle,
    }
  })
}

for (const path of PAGES) {
  test(`${path} puts the skip link first in the tab order`, async ({ page }) => {
    await page.goto(path)
    await page.keyboard.press('Tab')

    const focused = page.locator(':focus')
    await expect(focused).toHaveAttribute('href', /#main$/)
    // §9.6: hidden until focused, then actually on screen — a skip link the
    // reader cannot see is a skip link they will not use.
    await expect(focused).toBeVisible()
    await expect(focused).toBeInViewport()
  })

  test(`${path} carries one banner, one main and one contentinfo`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('header')).toHaveCount(1)
    await expect(page.locator('main#main')).toHaveCount(1)
    await expect(page.locator('footer')).toHaveCount(1)
  })
}

test('the skip link moves the reader past the header', async ({ page }) => {
  await page.goto(A0.path)

  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/#main$/)

  // Focus itself has to land on `main`, not merely the fragment. Chrome and
  // Firefox relocate the sequential-focus starting point to a fragment target
  // that cannot hold focus, which hides the defect; Safari/VoiceOver does not,
  // and leaves the VO cursor in the header. `main` carries `tabindex="-1"` so
  // the target is focusable and every engine agrees.
  expect(
    await page.evaluate(() => document.activeElement?.id ?? null),
    'the skip link left focus on the body',
  ).toBe('main')

  // …and it must not be *ringed*. `main` matches `:focus-visible` once focus
  // arrives from a keypress, so without `main:focus { outline: none }` §9.6's
  // one focus treatment paints 2px of vermilion around the whole page.
  const ring = await page.evaluate(() => {
    const main = document.getElementById('main')!
    return {
      outline: getComputedStyle(main).outlineStyle,
      focusVisible: main.matches(':focus-visible'),
    }
  })
  expect(ring.focusVisible, 'the un-ringing rule is no longer under test').toBe(true)
  expect(ring.outline, 'main is ringed after the skip').toBe('none')

  // The point of the link is the next Tab, not the hash: whatever the browser
  // does with the fragment, focus has to continue from `main` rather than
  // restart at the header.
  await page.keyboard.press('Tab')
  const focused = await focusDescription(page)
  expect(focused, 'something has focus after the skip').not.toBeNull()
  expect(focused!.inHeader, `focus went back into the header: ${focused!.text}`).toBe(false)
  expect(focused!.inMain).toBe(true)
})

test('main is not a tab stop of its own', async ({ page }) => {
  // `tabindex="-1"` and not `0`: §10.3 forbids a positive tabindex and a
  // landmark that swallows a Tab is a new obstacle, not a fix.
  await page.goto(A0.path)
  await expect(page.locator('main#main')).toHaveAttribute('tabindex', '-1')
})

test('the header tab order runs left to right and stops at the repo link', async ({ page }) => {
  await page.goto(A0.path)

  const order: string[] = []
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press('Tab')
    const focused = await focusDescription(page)
    if (!focused) break
    if (!focused.inHeader && order.length > 0) break
    order.push(focused.text)
  }

  // Skip link, wordmark, the breadcrumb trail, then the two controls (§5.1).
  expect(order[0]).toMatch(/skip to content/i)
  expect(order[1]).toMatch(/lokum/i)
  expect(order.at(-2)).toMatch(/toggle theme/i)
  expect(order.at(-1)).toMatch(/repository/i)

  // The breadcrumb sits between the wordmark and the controls, in trail order.
  // §15.1 renamed its first crumb: the root of every trail on this site used to
  // be the manifest and read INDEX, and now `/` is the home screen and the
  // register is one click further on at `/sheets/`. The trail follows the
  // route, so the name it prints has to follow the route too.
  const crumbs = order.slice(2, -2)
  expect(crumbs.length).toBeGreaterThan(0)
  expect(crumbs[0].toLowerCase(), 'the trail does not start at the front door').toBe('home')
  expect(crumbs.join(' ').toLowerCase()).toContain('drawing set')
})

test('every interactive control in the header shows a focus ring', async ({ page }) => {
  await page.goto('/')

  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab')
    const focused = await focusDescription(page)
    if (!focused || !focused.inHeader) break
    expect(
      Number.parseFloat(focused.outline),
      `no focus ring on "${focused.text}"`,
    ).toBeGreaterThan(0)
    expect(focused.outlineStyle, `focus ring on "${focused.text}"`).not.toBe('none')
  }
})

test('the home screen is titled once, whichever state is showing (§15.2.2)', async ({ page }) => {
  await page.goto('/')

  // §15.2 renders BOTH state blocks unconditionally and lets `home.css` pick
  // one off `data-hl-record`, so a heading drawn inside either block is a
  // heading in the document in every record state. That is two ways to get
  // this wrong from one arrangement — the page dropping its own h1 and letting
  // each block head itself, or a block growing one beside the page's — and
  // both are invisible to the reader who only ever sees one block painted.
  const h1 = page.locator('h1')
  await expect(h1).toHaveCount(1)
  // Typed out rather than imported from `lib/site`, for the reason `sheets.ts`
  // gives: an expectation read from the same constant the page renders can only
  // prove the constant agrees with itself. §15.2.2 fixes this string, and a
  // reader's state may never appear in it — "Welcome back" would be a lie in
  // the tab of anybody the build has never met.
  await expect(h1).toHaveText('AI Engineering Bazaar')

  // Measured on the DOM rather than on what is visible: the hidden block is
  // still announced to anything reading the document, and `display: none` is
  // the state switch, not a promise about the accessibility tree.
  expect(
    await page.locator('.hl-home-resume h1, .hl-home-new h1').count(),
    'a state block draws an h1 of its own',
  ).toBe(0)

  // And both blocks are present, or the two counts above prove nothing.
  await expect(page.locator('.hl-home-resume')).toHaveCount(1)
  await expect(page.locator('.hl-home-new')).toHaveCount(1)
})

test('a row in the manifest is one tab stop, and it is reachable', async ({ page }) => {
  await page.goto(INDEX_SHEET)

  // §5.3 — the whole row is one link target, so it must not be two or three
  // tab stops per row. One per row, however many rows the set has.
  const stops = await page.locator('.hl-index tbody a, .hl-index tbody [tabindex]:not([tabindex="-1"])').count()
  const rows = await page.locator('.hl-index tbody tr').count()
  expect(stops).toBe(rows)

  // The scroll region itself is focusable so a keyboard can reach the columns
  // that scroll (§10.3).
  await expect(page.locator('.hl-index-scroll')).toHaveAttribute('tabindex', '0')
})

test('the schedule of parts and the manifest are named tables', async ({ page }) => {
  await page.goto(A4.path)
  await expect(page.locator('table.hl-schedule caption')).toHaveText(/schedule of parts/i)

  await page.goto(INDEX_SHEET)
  await expect(page.locator('.hl-index caption')).not.toHaveText('')
})

// ---------------------------------------------------------------------------
// §10.1 — contrast, measured off the painted pixels rather than off the tokens
// ---------------------------------------------------------------------------

const THEMES = ['light', 'dark'] as const

/**
 * The unit suite proves the *palette* clears §10.1. It cannot prove that a
 * given run of text ended up in a token it was allowed to carry, and T5 —
 * `--color-ink-faint` "may never be applied to text a user must read" — is a
 * claim about text, not about a colour. These are the four places the audit
 * found it applied to content, each measured against the ground it is actually
 * painted on.
 */

test('code comments clear the text floor on the code ground (§6.7, T5)', async ({ page }) => {
  for (const theme of THEMES) {
    await page.goto(SHORT.path)
    await useTheme(page, theme)

    // Leaf spans only: shiki nests a line wrapper around each row.
    const samples = (
      await contrastSamples(page, '.hl-code pre code span:not(:has(span))')
    ).filter((sample) => sample.text !== '')
    expect(samples.length, 'no highlighted code on this sheet').toBeGreaterThan(20)

    const low = worst(samples)
    expect(
      low.ratio,
      `${theme}: "${low.text}" is ${low.ratio.toFixed(2)}:1 (${low.color} on ${low.background})`,
    ).toBeGreaterThanOrEqual(4.5)
  }
})

test('the schedule of parts announces its ITEM column legibly (§4.5)', async ({ page }) => {
  for (const theme of THEMES) {
    await page.goto(A4.path)
    await useTheme(page, theme)

    // Not `aria-hidden`, and the only text under a `<th scope="col">Item</th>`,
    // so it is content: §10.4 puts an 11px mono mark at `ink-muted` or better.
    await expect(page.locator('.hl-schedule-item').first()).not.toHaveAttribute('aria-hidden')
    const samples = await contrastSamples(page, '.hl-schedule-item')
    expect(samples.length).toBeGreaterThan(0)
    const low = worst(samples)
    expect(low.ratio, `${theme}: ITEM "${low.text}" at ${low.ratio.toFixed(2)}:1`)
      .toBeGreaterThanOrEqual(4.5)
  }
})

test('the manifest\'s quiet columns clear the §10.4 floor (§4.8, §4.9)', async ({ page }) => {
  for (const theme of THEMES) {
    await page.goto(INDEX_SHEET)
    await useTheme(page, theme)

    // §4.8 sets `#` in `--color-ink-faint` and `SUBSYSTEM` in `--color-ink-
    // muted`. The `#` cell is the sheet's number under a `<th>` reading `#`,
    // it is not `aria-hidden`, and it is 11px mono — the same shape §10.4
    // already forced up to `ink-muted` in the schedule of parts. Same call
    // here, for the same reason, so the two do not disagree.
    await expect(page.locator('.hl-row-number').first()).not.toHaveAttribute('aria-hidden')
    const samples = await contrastSamples(page, '.hl-row-number, .hl-row-context')
    expect(samples.length).toBeGreaterThan(SHEETS.length)
    const low = worst(samples)
    expect(low.ratio, `${theme}: "${low.text}" at ${low.ratio.toFixed(2)}:1`)
      .toBeGreaterThanOrEqual(4.5)
  }
})

test('the manifest keeps a hierarchy across its columns (§4.8)', async ({ page }) => {
  await page.goto(INDEX_SHEET)

  // A cascade collision painted both quiet columns at full `--color-ink`:
  // `.hl-row > :is(td, th)` is (0,1,1) and outranked the class rules. The
  // symptom was invisible in the stylesheet and obvious on the page — three
  // columns competing for the same voice.
  const inks = await page.evaluate(() => {
    const of = (sel: string) => getComputedStyle(document.querySelector(sel)!).color
    return {
      number: of('.hl-row-number'),
      context: of('.hl-row-context'),
      title: of('.hl-row-title'),
      ink: getComputedStyle(document.body).color,
    }
  })

  expect(inks.title, 'the sheet title is the loud column').toBe(inks.ink)
  expect(inks.number, '# recedes from the title').not.toBe(inks.ink)
  expect(inks.context, 'SUBSYSTEM recedes from the title').not.toBe(inks.ink)
})

test('prev/next carries no text below the §10.4 floor (§5.7)', async ({ page }) => {
  // Sheet 1 has no previous, so it prints the `— END OF SET` cell as well as a
  // live one; both are 11px mono and both are read out.
  for (const theme of THEMES) {
    await page.goto(SHEETS[0].path)
    await useTheme(page, theme)

    const samples = await contrastSamples(
      page,
      '.hl-prevnext-sheet, .hl-prevnext-end, .hl-prevnext-title',
    )
    expect(samples.length).toBeGreaterThan(2)
    const low = worst(samples)
    expect(low.ratio, `${theme}: "${low.text}" at ${low.ratio.toFixed(2)}:1`)
      .toBeGreaterThanOrEqual(4.5)
  }
})

test('the § permalink is legible the frame it is revealed (§6.1)', async ({ page }) => {
  for (const theme of THEMES) {
    await page.goto(SHORT.path)
    await useTheme(page, theme)

    const heading = page.locator('.prose h2').first()
    await heading.hover()

    const anchor = heading.locator('.hl-anchor')
    await expect(anchor).toHaveCSS('opacity', '1')

    const [revealed] = await contrastSamples(page, '.prose h2:hover .hl-anchor')
    expect(
      revealed.ratio,
      `${theme}: the revealed § is ${revealed.ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(4.5)

    // Two stages, or the control has no hover feedback of its own once the
    // revealed state is already at `--color-ink-muted`.
    await anchor.hover()
    const [hovered] = await contrastSamples(page, '.prose .hl-anchor:hover')
    expect(hovered.color, `${theme}: hovering the § changes nothing`).not.toBe(revealed.color)
    expect(hovered.ratio).toBeGreaterThan(revealed.ratio)
  }
})

// ---------------------------------------------------------------------------
// §10.2 — what the accessibility tree actually says
// ---------------------------------------------------------------------------

test('a heading is named by its title, not by its permalink (§6.1)', async ({ page }) => {
  await page.goto(SHORT.path)

  const headings = page.locator('.prose :is(h2, h3)')
  const count = await headings.count()
  expect(count).toBeGreaterThan(5)

  for (let i = 0; i < count; i += 1) {
    const heading = headings.nth(i)
    const title = (await heading.locator('> span[id]').innerText()).trim()
    // Not `toContain`: the failure this guards against is a *suffix*, so the
    // name has to be the title and nothing else.
    await expect(heading).toHaveAccessibleName(title)
  }

  // And the anchor is still a labelled tab stop — §6.1 requires it to be
  // keyboard-focusable, so `aria-hidden` was never an option.
  await expect(page.locator('.prose .hl-anchor').first()).toHaveAccessibleName(/^Link to /)
})

test('a data table of three or more columns announces its rows (§10.2)', async ({ page }) => {
  await page.goto(A0.path)

  const tables = await page.evaluate(() =>
    [...document.querySelectorAll('.prose table')].map((table) => ({
      columns: Math.max(
        ...[...table.querySelectorAll('tr')].map((row) => row.children.length),
      ),
      headerScopes: [...table.querySelectorAll('thead th')].map((th) => th.getAttribute('scope')),
      firstCells: [...table.querySelectorAll('tbody tr')].map((row) => ({
        tag: row.children[0]?.tagName.toLowerCase() ?? '',
        scope: row.children[0]?.getAttribute('scope') ?? null,
      })),
    })),
  )

  expect(tables.length).toBeGreaterThan(3)
  for (const table of tables) {
    expect(table.headerScopes.every((scope) => scope === 'col')).toBe(true)
    if (table.columns < 3) continue
    for (const cell of table.firstCells) {
      expect(cell.tag).toBe('th')
      expect(cell.scope).toBe('row')
    }
  }
})

test('task-list checkboxes are real, named, and persist (§12.7)', async ({ page }) => {
  await page.goto(A0.path)

  // Until §12.7 there was no per-item state to hold, so these boxes were
  // decoration: painted, `disabled`, and `aria-hidden` precisely so they did
  // not announce themselves as eight nameless checkboxes down a checklist.
  // `ChecklistIsland` upgrades them after mount, and a real control has to be
  // in the tree and has to have a name.
  const boxes = page.locator('li.task-list-item > input[type="checkbox"]')
  expect(await boxes.count()).toBeGreaterThan(0)
  await expect(boxes.first()).toBeVisible()
  await expect(boxes.first()).toBeEnabled()

  // §6.4's problem, now solved rather than avoided: the item's text is a
  // SIBLING of the box, so it contributes nothing to the accessible name and
  // the island has to supply one.
  const named = page.getByRole('checkbox')
  expect(await named.count()).toBe(await boxes.count())
  for (const box of await named.all()) {
    const name = await box.getAttribute('aria-label')
    expect((name ?? '').trim().length).toBeGreaterThan(4)
  }

  // The item text is the content and is untouched.
  await expect(page.locator('li.task-list-item').first()).toHaveText(/\S/)

  // And a tick survives a reload, which is the whole point of persisting it.
  await named.first().check()
  await expect(page.locator('li.task-list-item').first())
    .toHaveAttribute('data-ticked', 'true')
  await page.reload()
  await expect(page.getByRole('checkbox').first()).toBeChecked()
})
