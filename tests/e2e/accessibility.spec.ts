import { type Page, expect, test } from '@playwright/test'
import { contrastSamples, useTheme, worst } from './contrast'
import { A0, SHORT, A4, CATEGORY_PATHS, INDEX_SHEET, SHEETS } from './sheets'
import { showTable } from './views'
import { SHORTCUTS } from '@/lib/record/keys'

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
  // M17 — `/courses/` was the third listing of the course and is a forwarding
  // stub now. What it listed is on the two addresses above and below it.
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
      inRail: !!el.closest('.bz-rail'),
      // M21 — the rail's fold control, which sits just OUTSIDE the rail: a
      // folded rail is `visibility: hidden`, and that is deliberately what
      // takes its contents out of the tab order, so a control inside it would
      // become unreachable in exactly the state it exists to undo.
      isRailToggle: el.hasAttribute('data-bz-rail-toggle'),
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
    // BY ROLE, which is what the test has always claimed to check. It counted
    // `header` and `footer` ELEMENTS, which was an honest proxy while the site
    // header was the only one on any page — and stopped being one when M16
    // stage 4 gave each board column the `<header>` its mockup draws. A
    // `<header>` inside a sectioning element is not a banner: ARIA maps it to
    // `generic`, so `/sheets/` had six header elements and still exactly one
    // banner. Counting the landmark asserts the claim rather than a stand-in.
    await expect(page.getByRole('banner')).toHaveCount(1)
    await expect(page.locator('main#main')).toHaveCount(1)
    await expect(page.getByRole('contentinfo')).toHaveCount(1)
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

  // M10 raised the cap from 16. The header gained a navbar: three destinations
  // plus the five levels inside the catalog's panel, which `:focus-within`
  // opens as the trigger takes focus, so every one of them is in the tab order
  // by design. Sixteen presses no longer reach the repo link, and a cap that
  // stops short reads as "the order ends here" rather than "we stopped
  // looking".
  const order: string[] = []
  /** The first stop the walk reaches OUTSIDE the header, kept rather than
   *  dropped: where the header hands over is a design fact of its own. */
  let handover: Awaited<ReturnType<typeof focusDescription>> = null
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    const focused = await focusDescription(page)
    if (!focused) break
    if (!focused.inHeader && order.length > 0) {
      handover = focused
      break
    }
    order.push(focused.text)
  }

  // MEASURED in Chrome, and the order is not what it was before M10:
  //   skip · wordmark · navbar (3 + the panel's levels) · controls (4) · trail
  // The trail moved to its own row UNDER the navbar row, so it is last in the
  // DOM and therefore last in the tab order. That is why the old
  // `order.at(-1)` assertion for the repo link is gone: the controls are no
  // longer the end of the header.
  const at = (name: RegExp) => order.findIndex((text) => name.test(text))

  expect(order[0]).toMatch(/skip to content/i)
  // The wordmark, which M16 stage 1 took from the mockup: `01`'s `.brand`
  // reads "AI Engineering Bazaar". The old header said "Lokum", and this line
  // is the last thing in the suite that still did.
  expect(order[1]).toMatch(/bazaar/i)

  // Left to right, and the rule is the ORDER of the groups rather than any
  // group's length: the navbar is reached before the controls, and the trail
  // after them.
  expect(at(/^home$/i), 'the navbar').toBe(2)
  // M17 — THREE destinations, not four. `Curriculum` and `Catalog` opened two
  // listings of the same thirty-three modules; the fold left one, and the
  // level dropdown moved onto it. The levels inside that panel are still in
  // the tab order, which is what the cap of 40 above is for.
  expect(at(/^catalog$/i)).toBe(3)
  // M14 — the last destination reads `Your progress`. It was `My progress`,
  // and the copy register bans the first person outright.
  expect(at(/^your progress$/i)).toBe(4)
  expect(at(/toggle theme/i)).toBeGreaterThan(at(/^your progress$/i))
  expect(at(/repository/i)).toBeGreaterThan(at(/toggle theme/i))

  /* WHERE THE HEADER HANDS OVER, and this has now changed three times.
     It used to read "the trail is what follows the controls", because the
     retired header gave the breadcrumb a second row inside `<header>`. Stage 1
     moved the trail into the reading column, where the mockup puts it — and on
     a module page the DOM order is `.shell > .side > main`, so the CURRICULUM
     RAIL sat between the controls and the column.

     **M21 put the rail's fold control ahead of the rail**, which is the point
     of it: one control replaced two, it is `position: fixed`, and rendered
     inside the page's own content Tab did not reach it in 30 presses — the
     control that hides the rail sat behind the rail. It cannot go INSIDE the
     rail either, because a folded rail is `visibility: hidden` and that is what
     takes its contents out of the tab order.

     So the header hands over to the fold, and the rail follows it. Both halves
     are asserted: a handover to the fold with no rail behind it would mean the
     rail had become unreachable, which is the thing the old assertion was
     really protecting. */
  expect(handover, 'the walk never left the header').not.toBeNull()
  expect(
    handover?.isRailToggle,
    `the header hands over to ${handover?.text}, not to the rail's fold control`,
  ).toBe(true)

  let reachedRail = false
  for (let i = 0; i < 6 && !reachedRail; i += 1) {
    await page.keyboard.press('Tab')
    reachedRail = (await focusDescription(page))?.inRail ?? false
  }
  expect(reachedRail, 'the rail does not follow its own fold control').toBe(true)

  // And the trail is still there, still in the tab order, and still starts at
  // the front door. Read off the landmark rather than by tabbing to it: every
  // link in a nav is in the tab order by construction, and reaching it here
  // would mean walking the whole curriculum first. §15.1 renamed the root —
  // it used to be the manifest and read INDEX; `/` is the home screen now.
  const crumbs = await page
    .getByRole('navigation', { name: 'Curriculum' })
    .getByRole('link')
    .allTextContents()
  expect(crumbs.length, 'the trail is not in the tab order').toBeGreaterThan(0)
  expect(crumbs[0].trim().toLowerCase(), 'the trail does not start at the front door').toBe('home')
})

/**
 * M10 — the level panel, and the property the first version of it failed.
 *
 * It was a `visibility: hidden` panel revealed on `:focus-within`, which is
 * circular: `visibility: hidden` takes an element out of the tab order, so
 * focus can never get inside to fire the rule that would reveal it. The five
 * level links were simply not reachable by keyboard, and the check that missed
 * it called `.focus()` programmatically — which does fire `:focus-within`,
 * where a Tab press cannot.
 *
 * So this asserts both halves, because either alone passes for the wrong
 * reason: closed, the links are NOT in the tab order (a disclosure that leaks
 * its contents is six stops of noise on every page); open, they ARE.
 */
test('the level panel is inert when closed and reachable when open', async ({ page }) => {
  await page.goto(A0.path)

  const summary = page.locator('summary.bz-bar-link')
  const levels = page.locator('.bz-menu-item')

  /**
   * Each stop, and whether it is INSIDE THE PANEL — which is the question, and
   * asking it by location is what makes the answer trustworthy.
   *
   * Two earlier versions of this walk compared TEXT. The first looked for
   * `01fundamentals`, a string the retired menu printed and stage 2's rebuild
   * does not. The second compared against the panel's own row labels, and that
   * one is worse than wrong — it reported the closed panel as leaking, because
   * the CURRICULUM RAIL's group summaries read `Fundamentals8` too. Two
   * different components, one label, and a test that cannot tell them apart.
   */
  const walk = async (presses: number) => {
    const seen: { text: string; inMenu: boolean }[] = []
    for (let i = 0; i < presses; i++) {
      await page.keyboard.press('Tab')
      seen.push(
        await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null
          return {
            text: (el?.textContent ?? '').trim().toLowerCase(),
            inMenu: !!el?.closest('.bz-menu'),
          }
        }),
      )
    }
    return seen
  }

  // Closed: walk the whole header and never step inside the panel.
  await expect(summary).toHaveAttribute('open', /^$/, { timeout: 1 }).catch(() => {})
  const closedWalk = await walk(14)
  expect(closedWalk.length, 'the walk found nothing to walk').toBeGreaterThan(0)
  expect(
    closedWalk.filter((stop) => stop.inMenu).map((stop) => stop.text),
    'a closed disclosure is leaking its rows into the tab order',
  ).toEqual([])

  // Open with the keyboard, which is the interaction that was broken.
  await page.reload()
  await summary.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.bz-bar-nav details')).toHaveAttribute('open', '')

  const openWalk = await walk(7)
  expect(
    openWalk.filter((stop) => stop.inMenu).length,
    `the levels are not reachable once the panel is open: walked ${openWalk
      .map((stop) => stop.text)
      .join(' | ')}`,
  ).toBeGreaterThan(0)
  await expect(levels).toHaveCount(6) // every level, plus the whole-curriculum row
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

test('the home page is titled once, and the title claims no state (§15.2.2)', async ({ page }) => {
  await page.goto('/')

  // M13 — one document for every reader, so one h1. It used to be two blocks
  // rendered unconditionally with `home.css` picking one, which was two ways to
  // get this wrong from one arrangement: the page dropping its own h1 and
  // letting each block head itself, or a block growing one beside the page's.
  // Both were invisible to the reader who only ever saw one block painted.
  const h1 = page.locator('h1')
  await expect(h1).toHaveCount(1)
  // Typed out rather than imported from the page, for the reason `sheets.ts`
  // gives: an expectation read from the same constant the page renders can only
  // prove the constant agrees with itself. A reader's state may never appear in
  // it — "Welcome back" would be a lie for anybody the build has never met.
  await expect(h1).toHaveText('AI engineering, written by the people who build it.')
  expect(await h1.innerText()).not.toMatch(/\b(you|your|welcome|back)\b/i)

  /* M18 — NOTHING on this page is keyed to the reader's record any more, which
     is a stronger form of the same claim. The continue block was the last one,
     and the assertion here was that it drew no heading of its own — a document
     with one `h1` cannot have a record-keyed block adding a second. Now there
     is no record-keyed block at all, so `main` holds exactly the headings the
     page authored. */
  await expect(page.locator('.bz-home-continue, .bz-cmod')).toHaveCount(0)
  expect(await page.locator('main h1').count(), 'the front door has one h1').toBe(1)
})

test('a row in the manifest is one tab stop, and it is reachable', async ({ page }) => {
  await page.goto(INDEX_SHEET)
  // M12 — the table is one of the catalog's three views and CSS reveals one
  // (D13). A hidden view's links are out of the tab order by design, which is
  // the point of that arrangement; the claim here is about the showing table.
  await showTable(page)

  // §5.3 — the whole row is one link target, so it must not be two or three
  // tab stops per row. One per row, however many rows the set has.
  const stops = await page.locator('.bz-table tbody a, .bz-table tbody [tabindex]:not([tabindex="-1"])').count()
  const rows = await page.locator('.bz-table tbody tr').count()
  expect(stops).toBe(rows)

  // The scroll region itself is focusable so a keyboard can reach the columns
  // that scroll (§10.3).
  await expect(page.locator('.bz-table-scroll')).toHaveAttribute('tabindex', '0')
})

test('the schedule of parts and the manifest are named tables', async ({ page }) => {
  await page.goto(A4.path)
  await expect(page.locator('table.bz-schedule caption')).toHaveText(/schedule of parts/i)

  await page.goto(INDEX_SHEET)
  await showTable(page)
  await expect(page.locator('.bz-table caption')).not.toHaveText('')
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
      await contrastSamples(page, '.bz-slab pre code span:not(:has(span))')
    ).filter((sample) => sample.text !== '')
    expect(samples.length, 'no highlighted code on this module').toBeGreaterThan(20)

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
    await expect(page.locator('.bz-schedule-item').first()).not.toHaveAttribute('aria-hidden')
    const samples = await contrastSamples(page, '.bz-schedule-item')
    expect(samples.length).toBeGreaterThan(0)
    const low = worst(samples)
    expect(low.ratio, `${theme}: ITEM "${low.text}" at ${low.ratio.toFixed(2)}:1`)
      .toBeGreaterThanOrEqual(4.5)
  }
})

test('the manifest\'s quiet columns clear the §10.4 floor (§4.8, §4.9)', async ({ page }) => {
  for (const theme of THEMES) {
    await page.goto(INDEX_SHEET)
    await showTable(page)
    await useTheme(page, theme)

    // §4.8 sets `#` in `--color-ink-faint` and `SUBSYSTEM` in `--color-ink-
    // muted`. The `#` cell is the sheet's number under a `<th>` reading `#`,
    // it is not `aria-hidden`, and it is 11px mono — the same shape §10.4
    // already forced up to `ink-muted` in the schedule of parts. Same call
    // here, for the same reason, so the two do not disagree.
    await expect(page.locator('.bz-row-number').first()).not.toHaveAttribute('aria-hidden')
    const samples = await contrastSamples(page, '.bz-row-number, .bz-row-context')
    expect(samples.length).toBeGreaterThan(SHEETS.length)
    const low = worst(samples)
    expect(low.ratio, `${theme}: "${low.text}" at ${low.ratio.toFixed(2)}:1`)
      .toBeGreaterThanOrEqual(4.5)
  }
})

test('the manifest keeps a hierarchy across its columns (§4.8)', async ({ page }) => {
  await page.goto(INDEX_SHEET)
  await showTable(page)

  // A cascade collision painted both quiet columns at full `--color-ink`:
  // `.bz-row > :is(td, th)` is (0,1,1) and outranked the class rules. The
  // symptom was invisible in the stylesheet and obvious on the page — three
  // columns competing for the same voice.
  const inks = await page.evaluate(() => {
    const of = (sel: string) => getComputedStyle(document.querySelector(sel)!).color
    return {
      number: of('.bz-row-number'),
      context: of('.bz-row-context'),
      title: of('.bz-row-title'),
      ink: getComputedStyle(document.body).color,
    }
  })

  expect(inks.title, 'the module title is the loud column').toBe(inks.ink)
  expect(inks.number, '# recedes from the title').not.toBe(inks.ink)
  expect(inks.context, 'LEVEL recedes from the title').not.toBe(inks.ink)
})

/**
 * §10.4 in the pager, and **the one place in this stage where the design
 * language and a blanket floor genuinely disagree.**
 *
 * `01`'s tile is `.pn small` over `.pn b` — a faint direction label above a
 * titled destination — and the language transcribes the label as
 * `on-surface-faint`. DESIGN.md is explicit that faint *"does not meet a 4.5:1
 * text floor on this ground"* and names its legitimate uses, one of which is
 * "a label above a control". MEASURED: `Next module` lands at 3.30:1.
 *
 * So this test asserts what is actually true of the language rather than a
 * blanket rule the language deliberately does not keep:
 *
 * - every DESTINATION clears 4.5:1, because that is the text carrying the
 *   information — including the end-of-course tile, whose sentence moved into
 *   the destination slot for exactly this reason;
 * - the LABEL is the language's own faint token and not something quieter
 *   still, so a regression past it is caught even though 4.5:1 is not the bar.
 *
 * **The remaining tension is the author's to settle, not this test's.** Lifting
 * the pager label to `on-surface-muted` would clear the floor and cost nothing
 * visible, but it would be a second entry in DESIGN.md's `DEVIATIONS` list —
 * and that list says in as many words that adding one is the author's decision
 * and never a way past a red test. The first entry, `slab-comment`, is the
 * precedent for how it would be recorded (**D34**).
 */
test('prev/next puts every destination above the §10.4 floor (§5.7)', async ({ page }) => {
  for (const theme of THEMES) {
    await page.goto(SHEETS[0].path)
    await useTheme(page, theme)

    // Sheet 1 has no previous, so it prints the end-of-course tile as well as
    // a live one, and both destinations are read out.
    const samples = await contrastSamples(page, '.bz-pager-item b')
    expect(samples.length, 'the pager prints no destinations').toBeGreaterThan(1)
    const low = worst(samples)
    expect(low.ratio, `${theme}: "${low.text}" at ${low.ratio.toFixed(2)}:1`)
      .toBeGreaterThanOrEqual(4.5)

    /* **This read the label's painted colour and then asserted nothing about
       it.** `painted` was computed, returned, and dropped; the only assertion
       left was that the language declares a faint token at all, which is true
       of every build. Paint this element in the page ground and the test stayed
       green — while its own docblock says the point is that the label is the
       faint token "and not something quieter still".

       Both values go through the canvas because a computed colour serialises as
       `lab()` or `oklch()` depending on how it was authored, and two spellings
       of one colour are not string-equal. `contrast.ts`'s `paint()` is what
       `contrastSamples` already uses for the same reason. */
    const label = await page.evaluate(() => {
      const node = document.querySelector('.bz-pager-item small')
      const root = getComputedStyle(document.documentElement)
      if (node === null) return null
      const paint = (value: string): string => {
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')!
        context.fillStyle = '#000'
        context.fillStyle = value
        return context.fillStyle
      }
      return {
        painted: paint(getComputedStyle(node).color),
        faint: paint(root.getPropertyValue('--color-on-surface-faint').trim()),
      }
    })
    expect(label, 'the pager prints no direction label').not.toBeNull()
    expect(label!.faint, 'the language declares no faint ink').not.toBe('')
    expect(
      label!.painted,
      `${theme}: the direction label is not the language's faint ink`,
    ).toBe(label!.faint)
  }
})

test('the § permalink is legible the frame it is revealed (§6.1)', async ({ page }) => {
  for (const theme of THEMES) {
    await page.goto(SHORT.path)
    await useTheme(page, theme)

    const heading = page.locator('.bz-prose h2').first()
    await heading.hover()

    const anchor = heading.locator('.bz-anchor')
    await expect(anchor).toHaveCSS('opacity', '1')

    const [revealed] = await contrastSamples(page, '.bz-prose h2:hover .bz-anchor')
    expect(
      revealed.ratio,
      `${theme}: the revealed § is ${revealed.ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(4.5)

    // Two stages, or the control has no hover feedback of its own once the
    // revealed state is already at `--color-ink-muted`.
    await anchor.hover()
    const [hovered] = await contrastSamples(page, '.bz-prose .bz-anchor:hover')
    expect(hovered.color, `${theme}: hovering the § changes nothing`).not.toBe(revealed.color)
    expect(hovered.ratio).toBeGreaterThan(revealed.ratio)
  }
})

// ---------------------------------------------------------------------------
// §10.2 — what the accessibility tree actually says
// ---------------------------------------------------------------------------

test('a heading is named by its title, not by its permalink (§6.1)', async ({ page }) => {
  await page.goto(SHORT.path)

  const headings = page.locator('.bz-prose :is(h2, h3)')
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
  await expect(page.locator('.bz-prose .bz-anchor').first()).toHaveAccessibleName(/^Link to /)
})

test('a data table of three or more columns announces its rows (§10.2)', async ({ page }) => {
  await page.goto(A0.path)

  const tables = await page.evaluate(() =>
    [...document.querySelectorAll('.bz-prose table')].map((table) => ({
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

  // At least one, not "more than three". The old number counted the tables in
  // one machine-written draft, and rewriting that sheet took it to zero. What
  // the rule actually says is that ANY data table of three or more columns has
  // to announce its rows, so one is enough to make the loop below mean
  // something and nothing here should depend on how many a sheet happens to
  // carry.
  expect(tables.length).toBeGreaterThan(0)
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


/**
 * §12.16 — the keyboard map is discoverable, and it says what the handler does.
 *
 * **M18 removed the `?` button from the bar and moved the table to `/legend/`,
 * and set no guard on the replacement** — which is the trap the commit itself
 * named for the button it was deleting. Measured afterwards: nothing in the
 * suite mentioned `.bz-keys` or visited that section, so deleting the whole
 * `Keys` block left 2,153 unit and 1,121 browser tests green while the site's
 * only discovery surface for the chords disappeared.
 *
 * Three claims, and each fails for its own reason:
 *
 * 1. **the table exists and is not empty** — the vacuity floor;
 * 2. **it lists every chord the handler dispatches on.** Derived from
 *    `SHORTCUTS`, which is the array `Keyboard` reads, so a chord added to the
 *    map and not to the page fails here rather than being undiscoverable;
 * 3. **the page carrying it is reachable from every route.** A help slot nobody
 *    can navigate to is the state this replaced (`/legend/` was linked only
 *    from `/team/`, itself linked only from `/team/assignments/`), and it is
 *    the state SC 3.2.6 is about.
 */
test('the keyboard map is on a page every route links to (§12.16, SC 3.2.6)', async ({ page }) => {
  await page.goto('/legend/')

  const rows = page.locator('.bz-keys tr')
  await expect(rows, 'the legend carries no keyboard map').not.toHaveCount(0)
  await expect(rows).toHaveCount(SHORTCUTS.length)

  // Every chord the handler knows, printed. Read off the application's own
  // array rather than a list typed here: a map the page and the handler
  // disagree about is worse than no map.
  const printed = await page.locator('.bz-keys kbd').allInnerTexts()
  expect(printed.map((text) => text.trim())).toEqual(SHORTCUTS.map((row) => row.keys))

  // And the way in, from a route that is not this one. The footer is on every
  // page, which is what makes the claim `legend/page.tsx` states about itself
  // true rather than aspirational.
  for (const route of ['/', INDEX_SHEET, A0.path]) {
    await page.goto(route)
    await expect(
      page.getByRole('contentinfo').getByRole('link', { name: /legend/i }),
      `${route} does not link to the legend`,
    ).toHaveCount(1)
  }
})


/**
 * §10.4 on the bar's repository control, in both of its states.
 *
 * **M18 added a gold star to the bar and measured it against the wrong
 * ground.** The control carries `--color-bar-field`, `rgba(255,255,255,.08)`
 * over the cobalt, so nothing inside it sits on `#282864`; and on hover that
 * becomes `--color-bar-hover` at `.10`, which lifts the ground and lowers the
 * ratio. The first pass reported 4.16:1 by compositing nothing. The truth is
 * **3.29:1 at rest and 3.06:1 hovered** — over the 3:1 a graphic owes, and the
 * hovered figure clears it by six hundredths.
 *
 * `tests/unit/color/contrast.test.ts` cannot see this: it resolves tokens
 * against tokens, and this ground is one token laid over another. Only a
 * browser can composite, which is why the check is here.
 *
 * The star is not the only carrier either way — the figure beside it says the
 * same thing in a numeral — so 3:1 is the right floor rather than 4.5:1. What
 * this stops is the ratio drifting UNDER it when somebody adjusts a sibling
 * token, which is the one way a margin of 0.06 disappears.
 */
test('the bar’s star clears the graphic floor, resting and hovered (§10.4)', async ({ page }) => {
  for (const theme of THEMES) {
    await page.goto('/')
    await useTheme(page, theme)

    const control = page.locator('.bz-bar-repo')
    await expect(control, 'the bar carries no repository control').toHaveCount(1)

    for (const state of ['resting', 'hovered'] as const) {
      if (state === 'hovered') await control.hover()

      const samples = await contrastSamples(page, '.bz-bar-repo .bz-bar-star')
      expect(samples.length, `${theme} ${state}: the control draws no star`).toBe(1)
      expect(
        samples[0].ratio,
        `${theme} ${state}: the star is ${samples[0].ratio.toFixed(2)}:1 on its own ground`,
      ).toBeGreaterThanOrEqual(3)

      // And the numeral, which is what actually states the count, takes the
      // text floor rather than the graphic one.
      const figure = await contrastSamples(page, '.bz-bar-stars')
      if (figure.length > 0) {
        expect(
          worst(figure).ratio,
          `${theme} ${state}: the star count is ${worst(figure).ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
  }
})
