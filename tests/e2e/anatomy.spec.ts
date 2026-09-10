import { type Locator, type Page, expect, test } from '@playwright/test'
import { A0, SHORT, A4 } from './sheets'

/**
 * §4.4, as M10 and M11 rebuilt it — the reading shell, asserted structurally.
 *
 * The failure this guards against is the one §4.4 names as the biggest in the
 * whole direction: a stub wrapped in the full chrome, or an assembly quietly
 * degrading to a single column because a grid rule stopped matching. Both still
 * show an h1 and both still pass `module-sheets.spec.ts`. The difference is
 * structural, so it is asserted structurally — which parts exist, which do not,
 * and how wide the text actually is.
 *
 * ## What changed in M11, and why nothing here pins a pixel any more
 *
 * The three tracks used to be 208 + 24 + 656 + 24 + 240 = 1152, centred in a
 * 1200px shell, and this file asserted those numbers. They are gone: the rails
 * are anchored to the WINDOW edges and the column is centred between them at a
 * cap of 80ch (`kia-context/logs/BRAINSTORM.md` D15). So the assertions are the
 * RULES rather than the arithmetic — the rail widths are read back from the
 * tokens that declare them, and the measure is compared against an 80ch box
 * measured in the reading face itself. A webfont that loads at a different
 * advance width moves the pixel count and must not move this suite.
 *
 * These run at 1440 (the `chrome-1440` project), where every rail is in flow.
 * `responsive.spec.ts` covers what happens as they collapse, and
 * `containment.spec.ts` covers what a diagram may not do inside the column.
 */

/** The rendered width of an element, which is the thing §4.4 legislates. */
async function widthOf(locator: Locator): Promise<number> {
  const box = await locator.boundingBox()
  if (!box) throw new Error('element has no box')
  return Math.round(box.width)
}

/** A layout token, read back from the stylesheet that declares it. */
function track(page: Page, name: string): Promise<number> {
  return page.evaluate(
    (token) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(token)),
    name,
  )
}

/**
 * The reading measure, in the reading face.
 *
 * `--layout-measure` is `80ch`, and `ch` is the advance width of `0` in
 * whatever font actually resolved — the language's one sans family where it
 * loaded, a fallback where it did not. Measuring an 80ch box inside the prose
 * itself is the only way to assert the cap without writing down a pixel count
 * that a font swap invalidates.
 */
function measureCap(page: Page): Promise<number> {
  return page.evaluate(() => {
    const prose = document.querySelector('[data-hl-prose], .bz-prose')!
    const probe = document.createElement('div')
    probe.style.cssText = 'position:absolute;visibility:hidden;width:var(--layout-measure)'
    prose.appendChild(probe)
    const width = probe.getBoundingClientRect().width
    probe.remove()
    return Math.round(width)
  })
}

/**
 * Where the three tracks sit, and how far each end is from the WINDOW.
 *
 * D15's rule is "anchored to the window edges", so what this reports is the
 * distance from the viewport's own edges rather than from a shell that no
 * longer exists on this page.
 */
async function zones(page: Page, selectors: readonly string[]) {
  const boxes = await Promise.all(
    selectors.map(async (selector) => {
      const box = await page.locator(selector).boundingBox()
      if (!box) throw new Error(`${selector} has no box`)
      return box
    }),
  )
  const viewport = page.viewportSize()!

  const left = Math.min(...boxes.map((b) => b.x))
  const right = Math.max(...boxes.map((b) => b.x + b.width))

  return {
    width: Math.round(right - left),
    leadIn: Math.round(left),
    leadOut: Math.round(viewport.width - right),
  }
}

test.describe('A0 — the assembly module', () => {
  test('is the curriculum, the reading column and the contents, edge to edge', async ({
    page,
  }) => {
    await page.goto(A0.path)

    // Zone 1: THE CURRICULUM, which is what M10 put here. It used to be the
    // section spine; the swap is the point (`CurriculumRail.tsx`).
    const rail = page.locator('.bz-rail')
    await expect(rail.locator('nav[aria-label="Course modules"]')).toBeVisible()
    expect(await widthOf(rail)).toBe(await track(page, '--layout-rail'))

    // One accordion section per level, this module's level open and enlarged,
    // and its own row marked as the current page. The counts are the levels'
    // own and are derived, so nothing here says how many there are.
    const levels = page.locator('.bz-group')
    expect(await levels.count()).toBeGreaterThan(1)
    await expect(page.locator('.bz-group[data-here]')).toHaveCount(1)
    await expect(page.locator('.bz-group[data-here][open]')).toHaveCount(1)
    await expect(page.locator('.bz-item[aria-current="page"]')).toHaveCount(1)

    // Zone 2: the reading column, capped at the measure and centred in what
    // the rails leave. Two claims, and the second is the one D15 is about: the
    // track is WIDER than the text, so the cap is doing work rather than
    // coinciding with the space available.
    /*
      `.bz-main` is the TRACK and `.bz-col` is the capped box inside it. The old
      markup had one element doing both jobs (`.hl-column`), which is why this
      compared the column to the text; now the cap is a box of its own and the
      claim is between the track and the cap.
    */
    const prose = page.locator('[data-hl-prose]')
    await expect(prose).toBeVisible()
    const cap = await measureCap(page)
    expect(await widthOf(prose)).toBe(cap)
    expect(await widthOf(page.locator('.bz-main'))).toBeGreaterThan(cap)

    const centred = await page.evaluate(() => {
      const column = document.querySelector('.bz-main')!.getBoundingClientRect()
      const text = document.querySelector('[data-hl-prose]')!.getBoundingClientRect()
      return {
        before: Math.round(text.left - column.left),
        after: Math.round(column.right - text.right),
      }
    })
    expect(centred.before).toBe(centred.after)

    // Zone 3: ON THIS PAGE, which is what the right rail holds now — the
    // sections of this module and what sits either side of it in the graph.
    const contents = page.locator('.bz-aside')
    await expect(contents.locator('nav[aria-label="Sections"]')).toBeVisible()
    expect(await contents.locator('.bz-aside-link').count()).toBeGreaterThan(2)

    /*
      THE ASIDE IS THE SECTION INDEX AND NOTHING ELSE, which is what `01` draws
      — *"a `label` heading, then items indented behind a `line` rail"*. It used
      to carry a second half, an `Around this module` block of the dependency
      graph, and stage 5 moved that behind the action row's quiet
      `Requirements (n)` button: a reader consults it once, when deciding
      whether they can start, so it is a disclosure rather than a column.
    */
    await expect(contents.getByText('Requirements', { exact: false })).toHaveCount(0)
    await expect(page.locator('.bz-actions .bz-requires > summary')).toContainText(/Requirements/)
    expect(await widthOf(contents)).toBe(await track(page, '--layout-aside'))

    /*
      The module's own facts are in the COLUMN, and they are a ROW OF TAGS now
      rather than a panel of rows. The second assertion used to name the 240px
      `TitleBlock` variant by class; a class nothing emits is trivially absent,
      so it is the shape that is checked instead — stage 5 replaced a twelve-row
      `<dl>` with `01`'s three spans, and a `<dl>` reappearing in this column
      would mean the instrument panel had come back.
    */
    await expect(page.locator('.bz-col .bz-facts')).toBeVisible()
    // THREE THINGS AT MOST, which is what `01`'s `div.row` holds: a tag for
    // the level, a tag for the position, and one line of facts. The twelve-row
    // panel this replaced would fail on the count alone.
    expect(await page.locator('.bz-facts > *').count()).toBeLessThanOrEqual(3)

    // …and the whole thing is anchored to the window, not to a 1200px shell.
    const drawing = await zones(page, ['.bz-rail', '.bz-main', '.bz-aside'])
    expect(drawing.width).toBe(page.viewportSize()!.width)
    expect(drawing.leadIn).toBe(0)
    expect(drawing.leadOut).toBe(0)
  })

  /**
   * The test that used to sit here asserted that at least one figure on this
   * module BREAKS OUT of the measure, and that a broken-out figure draws a
   * hairline down each broken side so the rail it covers reads as covered.
   *
   * **It is deleted rather than fixed, because M11 removed the behaviour it
   * described.** Nothing breaks out any more: a figure is its column's width
   * and anything wider scrolls inside its own box, which is the rule
   * `kia-context/specs/DESIGN.md` states and the fix D10 asked for. There is no
   * covered rail left to make legible.
   *
   * It was also the one test in this file that pinned a fact about the CONTENT
   * — "module 13 still has a figure that breaks the measure" — which
   * `tests/README.md` forbids: an author who narrowed every diagram would have
   * turned it red for doing nothing wrong. And it raced the client-side
   * mermaid render, waiting on `networkidle` rather than on the island's own
   * `data-hl-ready`, which is why it passed alone and failed under load
   * (`kia-context/logs/BRAINSTORM.md` D20).
   *
   * What replaced it is `containment.spec.ts`, which asserts the rule instead
   * of the instance, at all three viewports, after the injection.
   */

  test('the spine follows the reader down the module', async ({ page }) => {
    await page.goto(A0.path)

    const current = page.locator('.bz-aside-link[aria-current="true"]')
    const headings = page.locator('[data-hl-prose] h2')

    // At the top of the sheet the reader has not reached a section yet, and
    // the spine says so by marking none — it tracks position, not progress
    // (§4.6 part 1), so there is nothing to highlight before the first h2.
    await expect(current).toHaveCount(0)

    // `scrollIntoView`, not `scrollIntoViewIfNeeded`: on a 900px viewport the
    // first h2 is already on screen at rest, and a no-op scroll would prove
    // nothing about the observer.
    await headings.first().evaluate((el) => el.scrollIntoView())
    await expect(current).toHaveCount(1)
    const atFirst = await current.textContent()

    await headings.last().evaluate((el) => el.scrollIntoView())
    await expect(current).toHaveCount(1)
    await expect
      .poll(() => current.textContent(), { timeout: 5_000 })
      .not.toBe(atFirst)

    // Back to the top and the spine lets go again rather than sticking on the
    // last section the reader happened to touch.
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(current).toHaveCount(0)
  })
})

test.describe('A short ready module — the same anatomy as a long one', () => {
  /**
   * §4.4 used to split drawn sheets at 2,500 words: over it the A0 assembly with
   * three zones and the title-block panel, under it the A2 part sheet with two
   * zones and a horizontal strip. This suite pinned that — "carries the
   * horizontal title strip, NOT the panel".
   *
   * A reader asked why two sheets of the same curriculum looked structurally
   * different, and whether every markdown file is designed separately. Nothing
   * is: one component renders all 32 and a search of `src/` finds no per-module
   * code at all. But the format was making it look that way, and it was not even
   * about the text — both formats always used the same 1152px box and the same
   * 656px measure, so the rail moved the metadata and the prose with it. The text
   * started at x=588 on a short sheet and x=456 on a long one, jumping 132px
   * sideways between them.
   */
  test('carries the module facts and the stamps, like every ready module', async ({
    page,
  }) => {
    await page.goto(SHORT.path)

    // The strip is the module's own facts, in the column, at every width, and
    // it is the only place they live since M11 cut the rail back.
    await expect(page.locator('.bz-col .bz-facts')).toBeVisible()
    await expect(page.locator('.hl-title-block')).toHaveCount(0)

    // The same three tracks as the long module, and the same rule for each:
    // the widths come from the tokens and the measure from the face.
    await expect(page.locator('.bz-rail nav[aria-label="Course modules"]')).toBeVisible()
    await expect(page.locator('.bz-aside nav[aria-label="Sections"]')).toBeVisible()
    expect(await widthOf(page.locator('.bz-rail')))
      .toBe(await track(page, '--layout-rail'))
    expect(await widthOf(page.locator('.bz-aside')))
      .toBe(await track(page, '--layout-aside'))
    expect(await widthOf(page.locator('[data-hl-prose]'))).toBe(await measureCap(page))

    const drawing = await zones(page, ['.bz-rail', '.bz-main', '.bz-aside'])
    expect(drawing.leadIn).toBe(0)
    expect(drawing.leadOut).toBe(0)

    // §7.4 — the stamps used to render only inside the old right rail.
    await expect(page.locator('.hl-stamp:visible')).not.toHaveCount(0)

    // …and none of the draft furniture.
    await expect(page.locator('.hl-status-band')).toHaveCount(0)
    await expect(page.locator('.hl-schedule')).toHaveCount(0)
  })

  /**
   * The measure holds as the window narrows, which is the claim §6 is about.
   *
   * §4.7 once grew the measure to 720px when the right rail collapsed, on the
   * reasoning that the width was going spare. MEASURED, 720px at 17px Source
   * Serif 4 was 82 characters per line — against the 68–72 that 656px was
   * chosen FOR, and past the 75 that ends the readable range. The cap is
   * 80ch now and it is a CAP: it never grows past the face's 80 characters,
   * and below the cap the column simply gets what is left.
   */
  test('holds §6’s measure as the rails collapse, on a short module and a long one', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1100, height: 900 })

    for (const path of [SHORT.path, A0.path]) {
      await page.goto(path)

      // The contents rail is gone at this width, so it is behind the control,
      // and the module's own facts and stamps stay in the column.
      await expect(page.locator('.bz-aside')).not.toBeVisible()
      // The contents move behind one control at this width, which is the
      // drawer's bar — `.hl-subheader` was the retired header row it used to
      // live in (M16 stage 3 rebuilt it as `.bz-drawer-bar`).
      await expect(page.locator('.bz-drawer-bar[data-bz-at="wide"]')).toBeVisible()
      await expect(page.locator('.bz-facts')).toBeVisible()
      await expect(page.locator('.hl-stamp:visible')).not.toHaveCount(0)

      // The curriculum is still beside the prose: 1100px is above the width
      // where it becomes a sheet.
      await expect(page.locator('.bz-rail')).toBeVisible()

      // `.prose`, not `.bz-col`: the column is the box and the measure is
      // the text inside it, which is the number §6 legislates. Never wider
      // than the cap, whatever the window does.
      const width = await widthOf(page.locator('.bz-prose').first())
      expect(width, path).toBeLessThanOrEqual(await measureCap(page))
      expect(width, path).toBeGreaterThan(0)
    }
  })
})

test.describe('A4 — the detail module', () => {
  test('is a status band and a schedule of parts, with no rails', async ({ page }) => {
    await page.goto(A4.path)

    // §4.5 item 1 — the band says the two true things, in words (§10.4).
    const band = page.locator('.hl-status-band')
    await expect(band).toBeVisible()
    await expect(band).toContainText(/planned/i)
    await expect(band).toContainText(/schedule of parts only/i)

    // §4.5 item 6 — the topics list as a hairline table, not as bullets.
    const schedule = page.locator('table.hl-schedule')
    await expect(schedule).toBeVisible()
    await expect(schedule.locator('thead th')).toHaveText([/item/i, /description/i])
    const items = schedule.locator('tbody tr')
    expect(await items.count()).toBeGreaterThan(0)
    // The `ITEM` column is a derived ordinal, zero-padded like `DRAWING`.
    await expect(items.first().locator('.hl-schedule-item')).toHaveText('01')

    // NO CONTENTS RAIL, at any width: a draft has no sections to list.
    await expect(page.locator('.bz-aside')).toHaveCount(0)
    await expect(page.locator('nav[aria-label="Sections"]')).toHaveCount(0)

    // …but it DOES get the curriculum, and that is a change M10 made
    // deliberately: the rail is navigation, not module info, and a reader who
    // lands on a stub needs a way out of it more than anyone does.
    await expect(page.locator('.bz-rail nav[aria-label="Course modules"]')).toBeVisible()
    await expect(page.locator('.bz-item[aria-current="page"]')).toHaveCount(1)

    // Two tracks, anchored to the window, with the content centred in the one
    // the rail leaves.
    const drawing = await zones(page, ['.bz-rail', '.bz-main'])
    expect(drawing.width).toBe(page.viewportSize()!.width)
    expect(drawing.leadIn).toBe(0)
    expect(drawing.leadOut).toBe(0)

    // The module's facts are the strip here too, and no prose is rendered:
    // §4.5's body is one sentence and the schedule.
    await expect(page.locator('.bz-facts')).toBeVisible()
    await expect(page.locator('[data-hl-prose]')).toHaveCount(0)
  })

  test('makes no claim about a reader it has never met', async ({ page }) => {
    await page.goto(A4.path)

    // §4.5: no stamp slots, no XP, no completion — on a module that is not
    // written there is nothing to have read (§1, §7.2).
    await expect(page.locator('.hl-title-block')).toHaveCount(0)
    await expect(page.locator('[class*="stamp"]')).toHaveCount(0)
    await expect(page.locator('[data-hl-signoff]')).toHaveCount(0)
    // …and no tick can be revealed on its own row in the rail, because no
    // selector for one is generated (`scripts/curriculum-css.mjs`, list D).
    await expect(page.locator('.bz-item[aria-current="page"] .bz-item-mark')).toHaveCount(0)
  })
})
