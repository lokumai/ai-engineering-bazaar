import { type Page, expect, test } from '@playwright/test'
import { A0, A4, SHEETS } from './sheets'
import { seedRecord, signedSheet } from './record'

/**
 * M10 — the curriculum rail, its accordion, its fold, and the tick.
 *
 * Four of M10's acceptance criteria are here, and three of them say the same
 * thing about how they are checked: **not by reading the CSS.** The first
 * version of the restore tab was fixed at `top: 88px` under a `z-index: 40`
 * sticky header and could not be clicked at all, and only a browser found it
 * (`kia-context/logs/BRAINSTORM.md` D15). The first version of the navbar's
 * dropdown was keyboard-inaccessible and a check that called `.focus()` passed
 * it (D17). So: the fold is driven, the keyboard path is a Tab press, and a
 * disclosure is asserted in BOTH states, because either alone passes for the
 * wrong reason.
 */

/** The rail's measured width, which is what the fold is a claim about. */
function railWidth(page: Page): Promise<number> {
  return page
    .locator('.hl-rail-left')
    .evaluate((node) => Math.round(node.getBoundingClientRect().width))
}

function columnWidth(page: Page): Promise<number> {
  return page
    .locator('.hl-column')
    .evaluate((node) => Math.round(node.getBoundingClientRect().width))
}

/**
 * What has focus after `presses` Tab keys from the top of the document, as a
 * list of coarse identities. **Pressing the key, not calling `.focus()`** —
 * `.focus()` reaches an element `visibility: hidden` has removed from the tab
 * order, which is exactly the hole D17 records.
 */
async function tabWalk(page: Page, presses: number): Promise<string[]> {
  const seen: string[] = []
  for (let i = 0; i < presses; i += 1) {
    await page.keyboard.press('Tab')
    seen.push(
      await page.evaluate(() => {
        const active = document.activeElement
        if (!active) return 'none'
        if (active.hasAttribute('data-hl-rail-hide')) return 'hide'
        if (active.hasAttribute('data-hl-rail-restore')) return 'restore'
        const classes = (active.className ?? '').toString()
        if (classes.includes('hl-mod')) return 'module'
        if (classes.includes('hl-level-head')) return 'level'
        return active.tagName.toLowerCase()
      }),
    )
  }
  return seen
}

test.describe('the accordion', () => {
  test('is one section per level, with the current one open and enlarged', async ({ page }) => {
    await page.goto(A0.path)

    const levels = page.locator('.hl-level')
    // Every level in the curriculum, and the count is asked of the page rather
    // than written down: a level added to `curriculum.yaml` must not turn this
    // red for doing nothing wrong.
    const shipped = new Set(SHEETS.map((sheet) => sheet.category))
    expect(await levels.count()).toBe(shipped.size)

    const current = page.locator('.hl-level[data-current]')
    await expect(current).toHaveCount(1)
    await expect(current).toHaveAttribute('open', '')
    await expect(current).toHaveAttribute('data-cat', A0.category)

    // ENLARGED, and measured rather than read off the stylesheet: the current
    // level's head is bigger than a sibling's, which is what the author asked
    // for. Plus a coloured edge and the count in the reader's own ink, so the
    // level is never told apart by size alone.
    const sizes = await page.evaluate(() => {
      const head = (element: Element) => element.querySelector('.hl-level-head')!
      const current = document.querySelector('.hl-level[data-current]')!
      const other = document.querySelector('.hl-level:not([data-current])')!
      const style = (element: Element) => getComputedStyle(head(element))
      return {
        currentSize: parseFloat(style(current).fontSize),
        otherSize: parseFloat(style(other).fontSize),
        currentEdge: getComputedStyle(current).borderInlineStartColor,
        otherEdge: getComputedStyle(other).borderInlineStartColor,
        currentCount: getComputedStyle(
          current.querySelector('.hl-level-count')!,
        ).color,
        otherCount: getComputedStyle(other.querySelector('.hl-level-count')!).color,
        ink: getComputedStyle(document.body).color,
      }
    })

    expect(sizes.currentSize).toBeGreaterThan(sizes.otherSize)
    // A 4px edge in the level's own hue against a transparent one.
    expect(sizes.currentEdge).not.toBe(sizes.otherEdge)
    expect(sizes.otherEdge).toBe('rgba(0, 0, 0, 0)')
    // "its count in the reader's own ink rather than grey".
    expect(sizes.currentCount).toBe(sizes.ink)
    expect(sizes.otherCount).not.toBe(sizes.ink)
  })

  test('marks the module being read, and only that one', async ({ page }) => {
    await page.goto(A0.path)
    const current = page.locator('.hl-mod[aria-current="page"]')
    await expect(current).toHaveCount(1)
    await expect(current).toHaveAttribute('href', A0.path)

    // A draft module gets the rail too — it is navigation, not module info.
    await page.goto(A4.path)
    await expect(page.locator('.hl-mod[aria-current="page"]')).toHaveCount(1)
  })

  test('opens a level a reader chooses, with no JavaScript in the way', async ({ page }) => {
    // The disclosure is a native `<details>`, so it works before any bundle
    // lands. Driving it with the keyboard is the check that matters, and it is
    // asserted in both states.
    await page.goto(A0.path)
    const other = page.locator('.hl-level:not([data-current])').first()
    const rows = other.locator('.hl-mod')

    await expect(other).not.toHaveAttribute('open', '')
    expect(await rows.first().isVisible()).toBe(false)

    await other.locator('summary').focus()
    await page.keyboard.press('Enter')
    await expect(other).toHaveAttribute('open', '')
    await expect(rows.first()).toBeVisible()
  })
})

test.describe('the fold', () => {
  test('takes the rail to zero and gives the width to the column', async ({ page }) => {
    await page.goto(A0.path)

    const open = await railWidth(page)
    const openColumn = await columnWidth(page)
    expect(open).toBeGreaterThan(0)

    await page.locator('[data-hl-rail-hide]').click()
    // Measured after the 200ms fold rather than at a frame count.
    await expect.poll(() => railWidth(page), { timeout: 2_000 }).toBe(0)
    const foldedColumn = await columnWidth(page)

    // The point of the fold is that the reading column gets the space, which
    // is what an `auto` first track buys and a fixed one does not: MEASURED,
    // with a fixed track the column came back the same width and the fold
    // looked broken.
    expect(foldedColumn).toBeGreaterThan(openColumn)
    expect(foldedColumn - openColumn).toBe(open)

    await page.locator('[data-hl-rail-restore]').click()
    await expect.poll(() => railWidth(page), { timeout: 2_000 }).toBe(open)
    expect(await columnWidth(page)).toBe(openColumn)
  })

  test('is remembered per reader, and is right in the first frame', async ({ page }) => {
    await page.goto(A0.path)
    await page.locator('[data-hl-rail-hide]').click()
    await expect.poll(() => railWidth(page), { timeout: 2_000 }).toBe(0)

    // Written through the record store and nowhere else
    // (`kia-context/specs/ARCHITECTURE.md` §5). A second `localStorage` key
    // beside the record would be a second writer.
    //
    // Polled, because §12.1.4 throttles the flush: the in-memory store is
    // authoritative and the write lands on a trailing 500ms timer, so reading
    // storage in the same tick as the click reads the state before it.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const raw = localStorage.getItem('hl-record')
            return raw === null ? null : JSON.parse(raw).data.prefs.railFolded
          }),
        { timeout: 3_000 },
      )
      .toBe(true)

    // …and no second key beside it. The record is the only place this lives.
    const keys = await page.evaluate(() => Object.keys(localStorage).sort())
    expect(keys.filter((key) => /rail|fold|sidebar/i.test(key))).toEqual([])

    // A fresh document, folded before the first paint by channel A — no flash
    // of an open column, and no width to animate away.
    await page.goto(A0.path)
    await expect(page.locator('html')).toHaveAttribute('data-hl-rail', 'folded')
    expect(await railWidth(page)).toBe(0)
  })

  test('is instant under prefers-reduced-motion, and animated without it', async ({ browser }) => {
    for (const [motion, expectation] of [
      ['reduce', 'instant'],
      ['no-preference', 'animated'],
    ] as const) {
      const context = await browser.newContext({ reducedMotion: motion })
      const page = await context.newPage()
      await page.goto(A0.path)

      const declared = await page
        .locator('.hl-rail-left')
        .evaluate((node) => getComputedStyle(node).transitionDuration)

      await page.locator('[data-hl-rail-hide]').click()
      // 40ms is well inside the 200ms fold: instant means already at zero,
      // animated means somewhere in between.
      await page.waitForTimeout(40)
      const midway = await railWidth(page)

      if (expectation === 'instant') {
        expect(declared, motion).toMatch(/^0?\.?0*1?e?-?\d*s|^0s/)
        expect(midway, motion).toBe(0)
      } else {
        expect(declared, motion).toContain('0.2s')
        expect(midway, motion).toBeGreaterThan(0)
        await expect.poll(() => railWidth(page), { timeout: 2_000 }).toBe(0)
      }

      await context.close()
    }
  })

  /**
   * The disclosure, in BOTH states, by pressing the key. Either half alone
   * passes for the wrong reason (D17): open-and-reachable would pass a rail
   * that is never removable, and closed-and-unreachable would pass a rail that
   * is never reachable at all.
   */
  test('folded, the rail is out of the tab order; open, it is in it', async ({ page }) => {
    await page.goto(A0.path)

    const open = await tabWalk(page, 26)
    expect(open, 'the fold control is not reachable by Tab').toContain('hide')
    expect(open, 'the levels are not reachable by Tab').toContain('level')
    expect(open, 'the module links are not reachable by Tab').toContain('module')
    expect(open, 'the restore tab is reachable while the rail is open')
      .not.toContain('restore')

    await page.locator('[data-hl-rail-hide]').click()
    await expect.poll(() => railWidth(page), { timeout: 2_000 }).toBe(0)

    // A fresh document so the walk starts at the top rather than wherever the
    // click left focus, and folded from the first frame by channel A.
    await page.goto(A0.path)
    const folded = await tabWalk(page, 26)
    expect(folded, 'the restore tab is not reachable by Tab').toContain('restore')
    expect(folded, 'a folded rail still puts its modules in the tab order')
      .not.toContain('module')
    expect(folded, 'a folded rail still puts its levels in the tab order')
      .not.toContain('level')
    expect(folded, 'a folded rail still puts its fold control in the tab order')
      .not.toContain('hide')
  })

  test('hands focus to whichever control is on screen', async ({ page }) => {
    await page.goto(A0.path)

    await page.locator('[data-hl-rail-hide]').click()
    await expect(page.locator('[data-hl-rail-restore]')).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page.locator('[data-hl-rail-hide]')).toBeFocused()
  })

  test('rings both controls when the keyboard reaches them', async ({ page }) => {
    await page.goto(A0.path)

    const ring = (selector: string) =>
      page.locator(selector).evaluate((node) => {
        const style = getComputedStyle(node)
        return { width: parseFloat(style.outlineWidth), style: style.outlineStyle }
      })

    // The ring is a `:focus-visible` treatment, so focus has to arrive from
    // the keyboard for it to be painted at all.
    let walked = 0
    while (walked < 30) {
      await page.keyboard.press('Tab')
      walked += 1
      const onHide = await page.evaluate(
        () => document.activeElement?.hasAttribute('data-hl-rail-hide') ?? false,
      )
      if (onHide) break
    }
    expect(walked, 'Tab never reached the fold control').toBeLessThan(30)
    const hideRing = await ring('[data-hl-rail-hide]')
    expect(hideRing.width, 'no focus ring on the fold control').toBeGreaterThan(0)

    await page.keyboard.press('Enter')
    await expect(page.locator('[data-hl-rail-restore]')).toBeFocused()
    const restoreRing = await ring('[data-hl-rail-restore]')
    expect(restoreRing.width, 'no focus ring on the restore tab').toBeGreaterThan(0)
  })

  /**
   * The tab is `position: fixed` and vertically centred against the WINDOW.
   * The first version was `top: 88px`, directly under a sticky header at
   * `z-index: 40`, and a real click landed on the header instead (D15). So
   * this clicks at the tab's own measured centre rather than through
   * Playwright's locator, which would have scrolled and retried around the
   * obstruction and hidden the defect.
   */
  test('the restore tab is clickable where it is drawn', async ({ page }) => {
    await page.goto(A0.path)
    await page.locator('[data-hl-rail-hide]').click()
    await expect.poll(() => railWidth(page), { timeout: 2_000 }).toBe(0)

    const box = await page.locator('[data-hl-rail-restore]').boundingBox()
    expect(box, 'the restore tab has no box').not.toBeNull()

    // Against the window's left edge, and clear of the sticky bar.
    expect(Math.round(box!.x)).toBe(0)
    const viewport = page.viewportSize()!
    expect(box!.y).toBeGreaterThan(120)
    expect(box!.y + box!.height).toBeLessThan(viewport.height)

    // Whatever is on top at that point had better be the tab itself.
    const hit = await page.evaluate(
      ([x, y]) => {
        const element = document.elementFromPoint(x, y)
        return element?.closest('[data-hl-rail-restore]') !== null
      },
      [box!.x + box!.width / 2, box!.y + box!.height / 2],
    )
    expect(hit, 'something else is painted over the restore tab').toBe(true)

    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await expect.poll(() => railWidth(page), { timeout: 2_000 }).toBeGreaterThan(0)
  })
})

test.describe('the completion tick', () => {
  /**
   * Channel A (§12.2): the boot script stamps `hl-signed-<n>` before the first
   * paint and `lokum-modules.css` reveals the mark for that module. No React,
   * correct in frame one — which is asserted by reading the rail immediately
   * after `goto` rather than after waiting for hydration.
   */
  test('is a filled disc on a completed module, and absent on the rest', async ({ page }) => {
    // From the level this module is IN, so the accordion section holding them
    // is the one that is open: a mark inside a closed `<details>` is correctly
    // invisible, and picking modules from another level would have measured
    // the accordion rather than the tick.
    const completed = SHEETS.filter(
      (sheet) => sheet.drawn && sheet.category === A0.category && sheet.path !== A0.path,
    ).slice(0, 2)
    expect(completed.length, 'this level has no other written module to complete').toBe(2)
    await seedRecord(page, {
      sheets: Object.fromEntries(
        completed.map((sheet) => [
          sheet.path.replace('/courses/', '').replace(/\/$/, ''),
          signedSheet('b7225f8'),
        ]),
      ),
    })
    await page.goto(A0.path)

    // One tick per completed module and no more — the count is derived from
    // what was seeded, never written down.
    await expect(page.locator('.hl-mod-mark:visible')).toHaveCount(completed.length)

    for (const sheet of completed) {
      const mark = page.locator(`.hl-mod[data-module="${sheet.module}"] .hl-mod-mark`)
      await expect(mark).toBeVisible()

      const drawn = await mark.evaluate((node) => {
        const style = getComputedStyle(node)
        const box = node.getBoundingClientRect()
        return {
          width: Math.round(box.width),
          height: Math.round(box.height),
          radius: style.borderRadius,
          background: style.backgroundColor,
          check: node.querySelector('svg') !== null,
          // The word, so completion is never carried by colour alone.
          word: (node.textContent ?? '').trim(),
        }
      })

      // A DISC, not a hairline glyph: DESIGN.md's `tick` is 17px, pill radius,
      // teal fill, white check. Teal fails the 4.5:1 text floor and clears the
      // 3:1 graphic one, which is why the shape is load-bearing.
      expect(drawn.width).toBe(17)
      expect(drawn.height).toBe(17)
      expect(parseFloat(drawn.radius)).toBeGreaterThanOrEqual(17 / 2)
      expect(drawn.background).not.toBe('rgba(0, 0, 0, 0)')
      expect(drawn.check).toBe(true)
      expect(drawn.word.toLowerCase()).toBe('complete')
    }
  })

  test('claims nothing about a reader with no record', async ({ page }) => {
    await page.goto(A0.path)
    await expect(page.locator('.hl-mod-mark:visible')).toHaveCount(0)
  })
})
