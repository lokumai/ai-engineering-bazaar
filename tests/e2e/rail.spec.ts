import { type Page, expect, test } from '@playwright/test'
import { A0, A4, SHEETS } from './sheets'
import { seedRecord, signedSheet, waitForHydratedReadout } from './record'

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

/**
 * The rail's GRID TRACK, which is what the fold is a claim about.
 *
 * M16 moved this from the rail's own box, and the difference is 1px of
 * transparent border. The fold animates `grid-template-columns` to `0px` and
 * the rail keeps its hairline — the mockup does the same, `border-right-color:
 * transparent` rather than a border removed — so the element measures 1px
 * folded and never 0. Asserting the element's width would have been asserting
 * something the design does not do; the track is the thing that closes.
 */
function railTrack(page: Page): Promise<number> {
  return page
    .locator('.bz-shell')
    .evaluate((node) => Math.round(Number.parseFloat(
      getComputedStyle(node).gridTemplateColumns.split(' ')[0],
    )))
}

function columnWidth(page: Page): Promise<number> {
  return page
    .locator('.bz-main')
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
        // M21 — one control, one identity. It was two (`hide` in the rail's
        // head and `restore` on the window's edge) and the author asked for
        // one; `toggle` is what both used to be.
        if (active.hasAttribute('data-bz-rail-toggle')) return 'toggle'
        const classes = (active.className ?? '').toString()
        // Scoped to the rail on purpose: the bar's own level dropdown is a
        // `<summary>` as well, and an unscoped check reported the navbar's
        // trigger as a rail level that a folded rail had left reachable.
        const inRail = active.closest('.bz-rail') !== null
        if (inRail && classes.includes('bz-item')) return 'module'
        if (inRail && active.tagName.toLowerCase() === 'summary') return 'level'
        return active.tagName.toLowerCase()
      }),
    )
  }
  return seen
}

test.describe('the accordion', () => {
  test('is one section per level, with the current one open and enlarged', async ({ page }) => {
    await page.goto(A0.path)

    const levels = page.locator('.bz-group')
    // Every level in the curriculum, and the count is asked of the page rather
    // than written down: a level added to `curriculum.yaml` must not turn this
    // red for doing nothing wrong.
    const shipped = new Set(SHEETS.map((sheet) => sheet.category))
    expect(await levels.count()).toBe(shipped.size)

    const current = page.locator('.bz-group[data-here]')
    await expect(current).toHaveCount(1)
    await expect(current).toHaveAttribute('open', '')
    await expect(current).toHaveAttribute('data-cat', A0.category)

    // ENLARGED, and measured rather than read off the stylesheet: the current
    // level's head is bigger than a sibling's, which is what the author asked
    // for. Plus a coloured edge and the count in the reader's own ink, so the
    // level is never told apart by size alone.
    const sizes = await page.evaluate(() => {
      const head = (element: Element) => element.querySelector(':scope > summary')!
      const current = document.querySelector('.bz-group[data-here]')!
      const other = document.querySelector('.bz-group:not([data-here])')!
      const style = (element: Element) => getComputedStyle(head(element))
      return {
        currentSize: parseFloat(style(current).fontSize),
        otherSize: parseFloat(style(other).fontSize),
        // On the summary, which is where the language paints the arch, its
        // fill and its leading edge. Reading the <details> gave both groups a
        // transparent border and made the comparison vacuous.
        currentEdge: style(current).borderInlineStartColor,
        otherEdge: style(other).borderInlineStartColor,
        currentWeight: parseFloat(style(current).borderInlineStartWidth),
        otherWeight: parseFloat(style(other).borderInlineStartWidth),
        currentCount: getComputedStyle(
          current.querySelector('.bz-group-count')!,
        ).color,
        otherCount: getComputedStyle(other.querySelector('.bz-group-count')!).color,
        ink: getComputedStyle(document.body).color,
      }
    })

    expect(sizes.currentSize).toBeGreaterThan(sizes.otherSize)
    // A 4px edge in the level's own hue against a transparent one.
    expect(sizes.currentEdge).not.toBe(sizes.otherEdge)
    // NOT "the other edge is transparent", which was the retired design's
    // arrangement. Every group in this language carries a hairline; the
    // current one replaces its leading edge with a thick bar in the group's
    // own hue, so the pair that tells them apart is the weight and the colour
    // together.
    expect(sizes.currentWeight).toBeGreaterThan(sizes.otherWeight)
    // "its count in the reader's own ink rather than grey".
    expect(sizes.currentCount).toBe(sizes.ink)
    expect(sizes.otherCount).not.toBe(sizes.ink)
  })

  test('marks the module being read, and only that one', async ({ page }) => {
    await page.goto(A0.path)
    const current = page.locator('.bz-item[aria-current="page"]')
    await expect(current).toHaveCount(1)
    await expect(current).toHaveAttribute('href', A0.path)

    // A draft module gets the rail too — it is navigation, not module info.
    await page.goto(A4.path)
    await expect(page.locator('.bz-item[aria-current="page"]')).toHaveCount(1)
  })

  test('opens a level a reader chooses, with no JavaScript in the way', async ({ page }) => {
    // The disclosure is a native `<details>`, so it works before any bundle
    // lands. Driving it with the keyboard is the check that matters, and it is
    // asserted in both states.
    await page.goto(A0.path)
    const other = page.locator('.bz-group:not([data-here])').first()
    const rows = other.locator('.bz-item')

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
    // The same wait the motion check below explains at length: the hide
    // control is a React island, so a click sent before this document has
    // hydrated lands on nothing at all and the poll then times out on a rail
    // that was never asked to fold. Under eight parallel workers a
    // `load`-resolved `goto` is early enough to hit it — this test is the one
    // an independent review caught red in a full run at 8 workers (railWidth
    // 203, expected 0) while it passed 6/6 alone.
    await waitForHydratedReadout(page)

    const open = await railTrack(page)
    const openColumn = await columnWidth(page)
    expect(open).toBeGreaterThan(0)

    await page.locator('[data-bz-rail-toggle]').click()
    // Measured after the 200ms fold rather than at a frame count.
    await expect.poll(() => railTrack(page), { timeout: 2_000 }).toBe(0)
    const foldedColumn = await columnWidth(page)

    // The point of the fold is that the reading column gets the space, which
    // is what an `auto` first track buys and a fixed one does not: MEASURED,
    // with a fixed track the column came back the same width and the fold
    // looked broken.
    expect(foldedColumn).toBeGreaterThan(openColumn)
    expect(foldedColumn - openColumn).toBe(open)

    await page.locator('[data-bz-rail-toggle]').click()
    await expect.poll(() => railTrack(page), { timeout: 2_000 }).toBe(open)
    expect(await columnWidth(page)).toBe(openColumn)
  })

  /**
   * M21 — **and the rail's OWN box comes back, which is the thing the test
   * above never looked at.**
   *
   * The author reported it with the condition attached, which is what made it
   * findable: *"the left sidebar has no margin with the left of the screen and
   * some parts of it … is hidden under the laptop display edge. BUT THIS ONLY
   * HAPPENS AFTER I CLOSE THE LEFT SIDEBAR AND OPEN IT AGAIN!"*
   *
   * The test above folds and restores and asserts the grid track and the
   * reading column, and **both of those always came back correctly** — which is
   * why 1,138 green tests ran straight through this for three milestones. What
   * did not come back was `scrollLeft`: `.bz-rail-inner` was a pixel wider than
   * the rail's content box, `overflow-x: hidden` is still a scroll container,
   * and the fold's focus hand-off scrolled it by that pixel with no way back.
   *
   * So this measures the box rather than the track, and it measures it against
   * FIRST PAINT rather than against a constant — the numbers are the language's
   * to change, and what may never change is that folding and restoring is a
   * round trip.
   */
  test('folding and restoring returns the rail to the box it had', async ({ page }) => {
    await page.goto(A0.path)
    await waitForHydratedReadout(page)

    const box = () => page.evaluate(() => {
      const rail = document.querySelector('.bz-rail')
      const head = document.querySelector('.bz-rail-head')
      if (!rail || !head) return null
      return {
        scrollLeft: rail.scrollLeft,
        // Zero is the invariant, not a small number: any inline overflow at all
        // is an offset waiting to be latched by the next focus move.
        inlineOverflow: rail.scrollWidth - rail.clientWidth,
        left: Math.round(rail.getBoundingClientRect().left),
        headLeft: Math.round(head.getBoundingClientRect().left),
      }
    })

    const open = await railTrack(page)
    expect(open, 'no rail on this route').toBeGreaterThan(0)

    const first = await box()
    expect(first, 'no rail on this route').not.toBeNull()
    expect(first!.scrollLeft, 'the rail starts scrolled').toBe(0)
    expect(first!.inlineOverflow, 'the rail overflows itself before anything is clicked').toBe(0)
    expect(first!.headLeft).toBeGreaterThan(first!.left)

    // Twice, because a defect that latches does it once and then looks stable.
    for (let cycle = 0; cycle < 2; cycle += 1) {
      await page.locator('[data-bz-rail-toggle]').click()
      await expect.poll(() => railTrack(page), { timeout: 2_000 }).toBe(0)
      await page.locator('[data-bz-rail-toggle]').click()
      /* Back to the FULL open width, not merely to non-zero. The fold eases
         over 200ms, and a reading taken the moment the track leaves zero
         catches the column part-way: MEASURED, the rail reported 149px of
         inline overflow, which is its 262px inner against a column still
         opening. Every number here is a mid-flight artefact until this
         settles. */
      await expect.poll(() => railTrack(page), { timeout: 2_000 }).toBe(open)
    }

    expect(await box(), 'the rail did not come back to the box it had').toEqual(first)
  })

  test('is remembered per reader, and is right in the first frame', async ({ page }) => {
    await page.goto(A0.path)
    // The same wait the motion check below explains at length: the hide
    // control is a React island, so a click sent before this document has
    // hydrated lands on nothing at all and the poll then times out on a rail
    // that was never asked to fold. Under eight parallel workers a
    // `load`-resolved `goto` is early enough to hit it — this test is the one
    // an independent review caught red in a full run at 8 workers (railWidth
    // 203, expected 0) while it passed 6/6 alone.
    await waitForHydratedReadout(page)
    await page.locator('[data-bz-rail-toggle]').click()
    await expect.poll(() => railTrack(page), { timeout: 2_000 }).toBe(0)

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
    await expect(page.locator('html')).toHaveAttribute('data-bz-rail', 'folded')
    expect(await railTrack(page)).toBe(0)
  })

  /**
   * **Asked of the browser, not sampled at a stopwatch.** The first version of
   * this test clicked, waited 40ms and read the width, expecting to catch the
   * fold mid-animation. Under eight parallel workers the click's protocol round
   * trip plus the wait exceeded the 200ms fold, the width read zero, and a
   * working animation was reported as an instant one — which is D20's mistake
   * committed in a test written the same afternoon.
   *
   * `transitionend.elapsedTime` is how long the transition actually ran, in
   * seconds, reported by the engine. It is a record of an event rather than a
   * reading taken at a moment, so it does not care how loaded the machine is.
   * MEASURED: 0.2 with motion, 0.00001 under `prefers-reduced-motion`.
   */
  test('is instant under prefers-reduced-motion, and animated without it', async ({ browser }) => {
    for (const motion of ['reduce', 'no-preference'] as const) {
      const context = await browser.newContext({ reducedMotion: motion })
      const page = await context.newPage()
      await page.goto(A0.path)

      // **Wait for the page to be live and painted before clicking, and this
      // is not defensive padding.** REPRODUCED: with the document only
      // committed and the click sent immediately, no transition fires at all —
      // the attribute change and the rail's first layout land in one style
      // resolution, so there is no "before" width to transition FROM, and the
      // fold is instant however the stylesheet is written. Under eight parallel
      // workers a `load`-resolved `goto` is early enough to hit that, which is
      // what turned this red in a full run and green run alone.
      //
      // `.bz-readout[data-hydrated="true"]` is the footer island's own signal,
      // so it says React has hydrated this document rather than guessing how
      // long that takes; the two frames after it are what put a laid-out width
      // on the rail.
      await waitForHydratedReadout(page)
      await expect.poll(() => railTrack(page), { timeout: 3_000 }).toBeGreaterThan(0)
      await page.evaluate(() => new Promise(requestAnimationFrame))
      await page.evaluate(() => new Promise(requestAnimationFrame))

      // Listeners on before the click, so nothing can happen unobserved.
      await page.evaluate(() => {
        const seen: number[] = []
        ;(window as unknown as { __fold: number[] }).__fold = seen
        document
          .querySelector('.bz-shell')!
          .addEventListener('transitionend', (event) => {
            const transition = event as TransitionEvent
            // `grid-template-columns`, not `width`: M16 folds the TRACK while
            // the rail keeps its own box, so that content does not reflow
            // mid-animation. A listener on the rail's width never fires.
            if (transition.propertyName === 'grid-template-columns') {
              seen.push(transition.elapsedTime)
            }
          })
      })

      await page.locator('[data-bz-rail-toggle]').click()
      await expect.poll(() => railTrack(page), { timeout: 3_000 }).toBe(0)

      const ran = await page.evaluate(
        () => (window as unknown as { __fold: number[] }).__fold,
      )
      if (motion === 'reduce') {
        // The language REMOVES the transition under reduced motion rather than
        // shortening it, so the honest assertion is that nothing transitioned
        // at all — the fold is a state swap. Asserting a duration under 10ms
        // would have required an event that, correctly, never fires.
        expect(ran, motion).toEqual([])
      } else {
        expect(ran.length, `${motion}: the fold never transitioned at all`)
          .toBeGreaterThan(0)
        const seconds = Math.max(...ran)
        // DESIGN.md's `motion.fold`. Asserted as a band rather than as 0.2
        // exactly, because the engine reports what it ran and a frame boundary
        // can round it.
        expect(seconds, motion).toBeGreaterThan(0.15)
        expect(seconds, motion).toBeLessThan(0.35)
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
    expect(open, 'the fold control is not reachable by Tab').toContain('toggle')
    expect(open, 'the levels are not reachable by Tab').toContain('level')
    expect(open, 'the module links are not reachable by Tab').toContain('module')
    expect(open, 'the restore tab is reachable while the rail is open')
      .not.toContain('restore')

    await page.locator('[data-bz-rail-toggle]').click()
    await expect.poll(() => railTrack(page), { timeout: 2_000 }).toBe(0)

    // A fresh document so the walk starts at the top rather than wherever the
    // click left focus, and folded from the first frame by channel A.
    await page.goto(A0.path)
    const folded = await tabWalk(page, 26)
    expect(folded, 'the fold control is not reachable by Tab').toContain('toggle')
    expect(folded, 'a folded rail still puts its modules in the tab order')
      .not.toContain('module')
    expect(folded, 'a folded rail still puts its levels in the tab order')
      .not.toContain('level')
  })

  /**
   * M21 — **the hand-off is gone because the control no longer moves**, and
   * what replaces it is the stronger property.
   *
   * D17 recorded a real hole: folding hid the button that did the folding, and
   * `visibility: hidden` removes an element from the tab order, so focus was
   * dropped on the floor unless each control handed it to its counterpart.
   * With ONE control that is on screen in both states there is nothing to hand
   * off — and the hand-off was the very thing that scrolled the rail's box and
   * latched the offset this milestone also fixes.
   *
   * So the assertion is that focus NEVER MOVES: press the control, the rail
   * folds, and the same element still has focus — which is what D17 was trying
   * to buy in the first place.
   */
  test('keeps focus on the one control through a fold and a restore', async ({ page }) => {
    await page.goto(A0.path)
    const toggle = page.locator('[data-bz-rail-toggle]')

    await toggle.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('html')).toHaveAttribute('data-bz-rail', 'folded')
    await expect(toggle, 'focus was dropped when the rail folded').toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page.locator('html')).not.toHaveAttribute('data-bz-rail', 'folded')
    await expect(toggle, 'focus was dropped when the rail came back').toBeFocused()
  })

  /**
   * And its NAME changes with the state, on channel A rather than in React.
   *
   * A single control has to say which way it goes, and a reader whose rail was
   * folded last week meets it in frame one — so both faces are in the markup
   * and CSS reveals one. The hidden face is `display: none`, which takes it out
   * of the accessible name computation, so exactly one name is announced.
   */
  test('says which way it goes, and says only one thing at a time', async ({ page }) => {
    await page.goto(A0.path)
    const toggle = page.locator('[data-bz-rail-toggle]')

    const named = () => toggle.evaluate((node) => (node.textContent ?? '').trim())
    const announced = () => toggle.evaluate((node) =>
      [...node.querySelectorAll('*')]
        .filter((child) => child.children.length === 0
          && (child.textContent ?? '').trim() !== ''
          && getComputedStyle(child).display !== 'none'
          && getComputedStyle(child.parentElement as Element).display !== 'none')
        .map((child) => (child.textContent ?? '').trim()))

    // Both faces are in the DOM — that is what makes the label right before
    // any script runs — and exactly one of them is in the accessible tree.
    expect(await named()).toContain('Hide the curriculum')
    expect(await named()).toContain('Show the curriculum')
    expect(await announced()).toEqual(['Hide the curriculum'])

    await toggle.click()
    await expect(page.locator('html')).toHaveAttribute('data-bz-rail', 'folded')
    expect(await announced()).toEqual(['Show the curriculum'])
  })

  /**
   * M21 — **and it is reached BEFORE the rail, not after it.**
   *
   * One control replaced two, and the one that is left is `position: fixed` —
   * so where it sits in the document decides nothing about where it draws and
   * everything about when Tab arrives at it. Rendered inside the page's own
   * content, as the tab it replaced was, **Tab did not reach it in 30 presses**:
   * the control that hides the rail sat behind the rail's 33 links. It is
   * rendered immediately before the rail now.
   *
   * The bound is deliberately tight. `toBeLessThan(30)` would pass on a control
   * reached after the whole curriculum; what this is protecting is that the
   * fold is one of the first things a keyboard reader meets, so the number is
   * small enough to fail if it ever goes back behind the rail.
   */
  test('is reached early by Tab, and rings when it is', async ({ page }) => {
    await page.goto(A0.path)

    const ring = () =>
      page.locator('[data-bz-rail-toggle]').evaluate((node) => {
        const style = getComputedStyle(node)
        return { width: parseFloat(style.outlineWidth), style: style.outlineStyle }
      })

    /* BEFORE THE RAIL, stated as the relation rather than as a count. A
       number would be the bar's control count written down in a second place,
       and it would go stale the day the bar gains one — MEASURED at 8 today,
       which is the skip link, the brand, three nav items, the theme toggle and
       the repository link. What may never change is the ORDER: a reader must
       not have to tab through the thing in order to reach the control that
       hides it. */
    const walk = await tabWalk(page, 30)
    const control = walk.indexOf('toggle')
    const firstInRail = walk.findIndex((stop) => stop === 'level' || stop === 'module')

    expect(control, 'Tab never reached the fold control').toBeGreaterThanOrEqual(0)
    expect(firstInRail, 'the walk never entered the rail, so nothing was compared')
      .toBeGreaterThanOrEqual(0)
    expect(control, 'the fold control sits behind the rail it folds')
      .toBeLessThan(firstInRail)

    // Focus is wherever the walk left it; put it back on the control by the
    // keyboard, because the ring is a `:focus-visible` treatment and a
    // `.focus()` call does not paint one.
    while (walk.length > 0) {
      const on = await page.evaluate(
        () => document.activeElement?.hasAttribute('data-bz-rail-toggle') ?? false,
      )
      if (on) break
      await page.keyboard.press('Shift+Tab')
    }
    expect((await ring()).width, 'no focus ring on the fold control').toBeGreaterThan(0)

    // And again in the folded state, because it is the same element and the
    // ring is the only thing telling a keyboard reader where they are.
    await page.keyboard.press('Enter')
    await expect(page.locator('html')).toHaveAttribute('data-bz-rail', 'folded')
    await expect(page.locator('[data-bz-rail-toggle]')).toBeFocused()
    expect((await ring()).width, 'no focus ring once folded').toBeGreaterThan(0)
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
    // The hide control is a React island: a click before this document has
    // hydrated lands on nothing, and the poll below then times out on a rail
    // nobody asked to fold. Third of the three fold tests to need this — the
    // full suite at 8 workers produced a different one of them red on each of
    // four runs until all three waited.
    await waitForHydratedReadout(page)
    await page.locator('[data-bz-rail-toggle]').click()
    await expect.poll(() => railTrack(page), { timeout: 2_000 }).toBe(0)

    const box = await page.locator('[data-bz-rail-toggle]').boundingBox()
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
        return element?.closest('[data-bz-rail-toggle]') !== null
      },
      [box!.x + box!.width / 2, box!.y + box!.height / 2],
    )
    expect(hit, 'something else is painted over the restore tab').toBe(true)

    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await expect.poll(() => railTrack(page), { timeout: 2_000 }).toBeGreaterThan(0)
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
    await expect(page.locator('.bz-tick:visible')).toHaveCount(completed.length)

    for (const sheet of completed) {
      const mark = page.locator(`.bz-item[data-module="${sheet.module}"] .bz-tick`)
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
    await expect(page.locator('.bz-tick:visible')).toHaveCount(0)
  })
})
