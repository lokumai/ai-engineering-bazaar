import { expect, test } from '@playwright/test'

/**
 * LAYOUT INVARIANTS — the check that was missing, and the reason it exists.
 *
 * `fidelity.spec.ts` compares a built surface to its mockup fact by fact, and
 * it is the strongest check in this project. It is also blind to the failure
 * that matters most to a reader: **a rule that is present, correct, and applied
 * to the wrong element.**
 *
 * On 2026-09-11 the author reported the interface as "still full of errors".
 * Four defects, all of them visible in one screenshot of the home page, none of
 * them visible to 2,154 unit tests and 1,083 browser tests:
 *
 *  1. **The navigation was vertical on every route.** `01:81` says
 *     `.mainnav { display: flex }`, and in the mockup the items are the nav's
 *     children. The app wraps them in a `<ul role="list">` — better markup —
 *     so the flex laid out one list child and the items stacked. MEASURED: the
 *     nav was 120 x 128 in a 58px bar, overflowing 35px above it across the
 *     decorative band. The harness read the nav's own computed `display`, saw
 *     `flex`, and agreed with the mockup exactly.
 *  2. **A `<td>` with `display: flex`** stopped being a table-cell, so it did
 *     not stretch to its row: 47px inside a 72px row, painting its bottom
 *     border 24px above the row's own and centring its content against a
 *     different box from the cell beside it.
 *  3. **A sticky table header offset for the viewport, inside a scroller.**
 *     `top: calc(var(--layout-sticky) + …)` is right for sticking under the
 *     bar, and `.bz-table-scroll` is an `overflow` box, so the offset resolved
 *     against IT and shoved the header 76px down over the first two rows.
 *  4. **The breadcrumb centred in a column the page did not share** — 814px at
 *     x=313 above a heading at x=49, on four routes.
 *
 * What they have in common: every one is a relationship BETWEEN elements, and
 * every fact about each element on its own was correct. So this file asserts
 * relationships, mechanically, over every route — and it is deliberately about
 * geometry rather than appearance, because a geometric rule can be stated once
 * and hold for a page nobody has looked at.
 *
 * **These are not design opinions.** Each is a rule that is wrong in any
 * design: a list that should be a row is not one, a table cell is not a cell,
 * a sticky offset resolves against the wrong box, a trail floats away from its
 * page. Anything that is a matter of taste belongs in `fidelity.spec.ts`
 * against a mockup, not here.
 */

/** Every route a reader reaches without an account, and one module. */
const ROUTES = [
  '/',
  '/sheets/',
  '/courses/',
  '/courses/fundamentals/',
  '/courses/expert/',
  '/courses/fundamentals/llms/',
  '/profile/',
  '/legend/',
] as const

test.describe('layout invariants, on every route', () => {
  /**
   * A flex or grid container whose only child is a block-level list is the
   * shape that made the navigation vertical: the row is declared one level
   * above the things it is meant to lay out.
   *
   * Both halves of the pair matter. A single `<ul>` child is not itself wrong —
   * it is wrong when the list is a BLOCK, because then the container's `flex`
   * applies to one item and the list's own children stack inside it.
   */
  for (const route of ROUTES) {
    test(`no row is declared above the things it lays out — ${route}`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')

      const stacked = await page.evaluate(() => {
        const bad: string[] = []
        let examined = 0
        for (const element of document.querySelectorAll<HTMLElement>('*')) {
          const style = getComputedStyle(element)
          if (!['flex', 'inline-flex', 'grid', 'inline-grid'].includes(style.display)) continue
          examined += 1
          const children = [...element.children]
          if (children.length !== 1) continue
          const only = children[0]
          if (!(only instanceof HTMLElement)) continue
          if (only.tagName !== 'UL' && only.tagName !== 'OL') continue
          if (only.children.length < 2) continue
          const inner = getComputedStyle(only).display
          if (inner === 'block' || inner === 'list-item') {
            const name = typeof element.className === 'string' && element.className !== ''
              ? element.className
              : element.tagName
            bad.push(`${name} lays out a ${inner} <${only.tagName.toLowerCase()}> of ${only.children.length}`)
          }
        }
        return { bad: [...new Set(bad)], examined }
      })

      // A scan that finds no flex container has stopped reading the page, and
      // would then pass every assertion under it.
      expect(stacked.examined, `${route} renders no flex or grid container`).toBeGreaterThan(3)
      expect(stacked.bad, `${route} — the row is on the wrong element`).toEqual([])
    })
  }

  /**
   * A `<td>` or `<th>` whose display is not a table box has left the table's
   * row layout: it stops stretching to the row, so its borders and its
   * vertical centring stop agreeing with every other cell in that row.
   *
   * `display: none` is exempt and is not a loophole — a hidden cell has no
   * geometry to disagree about, and the catalog hides whole columns by design.
   */
  for (const route of ['/sheets/', '/courses/expert/', '/profile/'] as const) {
    test(`every table cell is still a table cell — ${route}`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')

      const cells = await page.evaluate(() => {
        const bad: string[] = []
        let examined = 0
        for (const cell of document.querySelectorAll<HTMLElement>('td, th')) {
          const style = getComputedStyle(cell)
          if (style.display === 'none') continue
          examined += 1
          if (style.display !== 'table-cell') {
            const name = typeof cell.className === 'string' && cell.className !== ''
              ? cell.className
              : cell.tagName
            bad.push(`${name} is display: ${style.display}`)
          }
        }
        return { bad: [...new Set(bad)], examined }
      })

      expect(cells.examined, `${route} renders no table cells`).toBeGreaterThan(5)
      expect(cells.bad, `${route} — a cell that is not a cell does not share its row`).toEqual([])
    })
  }

  /**
   * Every cell in one row shares that row's height, which is the visible
   * consequence of the rule above and the thing a reader actually sees: a
   * border that stops halfway, and a mark sitting lower than the word beside
   * it. Asserted separately because a cell can leave the row layout by means
   * other than `display` — a float, an absolute position — and the outcome is
   * what matters.
   */
  test('no cell paints its border above its own row', async ({ page }) => {
    await page.goto('/courses/expert/')
    await page.waitForLoadState('networkidle')

    const rows = await page.evaluate(() => {
      const bad: string[] = []
      let examined = 0
      for (const row of document.querySelectorAll<HTMLElement>('tbody tr')) {
        const box = row.getBoundingClientRect()
        if (box.height < 4) continue
        examined += 1
        for (const cell of [...row.children]) {
          const style = getComputedStyle(cell)
          if (style.display === 'none') continue
          const cellBox = cell.getBoundingClientRect()
          // One pixel of tolerance for a fractional row height.
          if (Math.abs(cellBox.bottom - box.bottom) > 1.5) {
            const name = typeof cell.className === 'string' ? cell.className : cell.tagName
            bad.push(`${name} ends ${Math.round(box.bottom - cellBox.bottom)}px above its row`)
          }
        }
      }
      return { bad: [...new Set(bad)], examined }
    })

    expect(rows.examined, 'no table rows to measure').toBeGreaterThan(5)
    expect(rows.bad, 'a cell that ends short of its row paints a line across nothing').toEqual([])
  })

  /**
   * A sticky offset resolves against the nearest SCROLL CONTAINER, not against
   * the viewport. So `position: sticky` with a non-zero offset inside an
   * `overflow: auto` ancestor does not stick under the bar: it shifts the
   * element by that offset inside the box, permanently, at every scroll
   * position — which is how a table header came to be painted over its own
   * first two rows.
   *
   * Note `overflow-x: auto` alone is enough: the spec computes the other axis
   * to `auto` as well, so a horizontal scroller is a vertical one too, and a
   * table that must scroll sideways can never also have a viewport-sticky
   * header. That is a structural fact and not a bug to be argued with.
   */
  for (const route of ['/sheets/', '/courses/expert/'] as const) {
    test(`no sticky offset resolves against a scroller — ${route}`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')

      const misplaced = await page.evaluate(() => {
        const bad: string[] = []
        let examined = 0
        for (const element of document.querySelectorAll<HTMLElement>('*')) {
          const style = getComputedStyle(element)
          if (style.position !== 'sticky') continue
          examined += 1
          const top = Number.parseFloat(style.top)
          if (!Number.isFinite(top) || top === 0) continue
          for (let parent = element.parentElement; parent !== null; parent = parent.parentElement) {
            const parentStyle = getComputedStyle(parent)
            const scrolls = ['auto', 'scroll', 'hidden'].includes(parentStyle.overflowY)
              || ['auto', 'scroll'].includes(parentStyle.overflowX)
            if (!scrolls) continue
            const name = typeof element.className === 'string' ? element.className : element.tagName
            const holder = typeof parent.className === 'string' ? parent.className : parent.tagName
            bad.push(`${name} is sticky at top: ${style.top} inside ${holder}`)
            break
          }
        }
        return { bad: [...new Set(bad)], examined }
      })

      expect(misplaced.examined, `${route} has no sticky element at all`).toBeGreaterThan(0)
      expect(misplaced.bad, `${route} — a sticky offset measured from the wrong box`).toEqual([])
    })
  }

  /**
   * Nothing the bar contains paints outside the bar. The bar is a solid cobalt
   * slab with its own sub-palette, so an element that leaves it is not merely
   * misplaced: it is ink chosen for cobalt, on the page's cream ground, over
   * the decorative band. That is exactly what the stacked navigation did.
   */
  for (const route of ROUTES) {
    test(`nothing in the bar paints outside it — ${route}`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')

      const spill = await page.evaluate(() => {
        const bar = document.querySelector('.bz-bar')
        if (bar === null) return { bad: ['no .bz-bar on this route'], examined: 0 }
        const box = bar.getBoundingClientRect()
        const bad: string[] = []
        let examined = 0
        for (const element of bar.querySelectorAll<HTMLElement>('*')) {
          const style = getComputedStyle(element)
          // A menu a reader opens is meant to hang below the bar, and the
          // dropdown is the one thing here that legitimately does.
          if (style.position === 'absolute' || style.position === 'fixed') continue
          if (style.display === 'none' || style.visibility === 'hidden') continue
          const own = element.getBoundingClientRect()
          if (own.height < 2 || own.width < 2) continue
          if (element.closest('.bz-menu') !== null) continue
          examined += 1
          if (own.top < box.top - 1 || own.bottom > box.bottom + 1) {
            const name = typeof element.className === 'string' && element.className !== ''
              ? element.className
              : element.tagName
            bad.push(`${name} spans ${Math.round(own.top)}-${Math.round(own.bottom)} in a bar of ${Math.round(box.top)}-${Math.round(box.bottom)}`)
          }
        }
        return { bad: [...new Set(bad)], examined }
      })

      expect(spill.examined, `${route} — the bar holds nothing measurable`).toBeGreaterThan(3)
      expect(spill.bad, `${route} — the bar's contents are not inside the bar`).toEqual([])
    })
  }

  /**
   * The trail names where THIS page is, so it begins where this page begins.
   *
   * `bz-col` does two things — it caps the measure and it CENTRES what it caps.
   * Applied to the breadcrumb on a route that is deliberately wider than the
   * measure, the second half put the trail in an 814px box centred at x=313
   * above a heading at x=49: the same 264px misalignment on four routes, and
   * the first thing under the bar that a reader's eye lands on.
   */
  for (const route of ['/', '/sheets/', '/courses/', '/courses/expert/', '/courses/fundamentals/llms/'] as const) {
    test(`the trail starts where the page starts — ${route}`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')

      const edges = await page.evaluate(() => {
        const crumb = document.querySelector('.bz-crumb')
        const heading = document.querySelector('h1')
        if (crumb === null || heading === null) return null
        return {
          crumb: Math.round(crumb.getBoundingClientRect().left),
          heading: Math.round(heading.getBoundingClientRect().left),
        }
      })

      expect(edges, `${route} has no trail or no heading to align it to`).not.toBeNull()
      expect(
        Math.abs((edges?.crumb ?? 0) - (edges?.heading ?? 0)),
        `${route} — the trail starts at ${edges?.crumb}px and the page at ${edges?.heading}px`,
      ).toBeLessThanOrEqual(1)
    })
  }

  /**
   * Two pieces of text that the markup separates must be separated on screen.
   *
   * The ordinal and the title of a module are two elements, and `08:65` gives
   * the row an 8px flex gap — on the LIST ITEM, whose children they are in the
   * mockup. Here they sit one level deeper, inside the link, so the gap had
   * nothing to separate and every level card read `01LLM Fundamentals`. The
   * mockup's own `textContent` reads the same; the difference was entirely the
   * gap, which is why this can only be caught by measuring what is painted.
   *
   * Measured with a Range over each text run rather than from the boxes, so an
   * inline element's painted ink is what is compared.
   *
   * **Deliberately narrow: an ordinal against a name.** A general "two runs of
   * text are touching" rule cannot tell a missing gap from correct typography,
   * and its first run proved it — a `<b>` followed by a comma, the trail's own
   * `/` separator, and a nav item whose ink includes the dropdown it owns were
   * all reported, and all three are right. What is not right in any design is a
   * NUMBER painted against a WORD, which is the family this shipped: an
   * ordinal and a title, separated in the markup and not on screen. So the
   * rule is that pair, and it stays a rule rather than becoming a taste.
   */
  for (const route of ['/', '/sheets/', '/profile/'] as const) {
    test(`no two words are painted against each other — ${route}`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')

      const jams = await page.evaluate(() => {
        const bad: string[] = []
        let examined = 0
        /**
         * Said and not shown is not a jam. A screen-reader-only element is
         * clipped on purpose — a whole word in a 1px box — so its ink
         * coordinates land on whatever is beside it, and its text runs into
         * the next one with no whitespace between them. This detector
         * reported sixteen of those on its first run, which is the second time
         * that primitive has tripped a geometric scan.
         *
         * Excluded by MECHANISM and not by class name: an element whose
         * `clip-path` removes its painted area paints nothing.
         */
        const clipped = (node: Node): boolean => {
          const element = node instanceof Element ? node : node.parentElement
          for (let at = element; at !== null; at = at.parentElement) {
            const clip = getComputedStyle(at).clipPath
            if (clip !== 'none' && clip !== '') return true
          }
          return false
        }
        const ink = (node: Node): DOMRect | null => {
          if (clipped(node)) return null
          const range = document.createRange()
          try {
            range.selectNodeContents(node)
          } catch {
            return null
          }
          const box = range.getBoundingClientRect()
          return box.width > 0 ? box : null
        }
        for (const element of document.querySelectorAll<HTMLElement>('*')) {
          const nodes = [...element.childNodes].filter((node) => (node.textContent ?? '').trim() !== '')
          if (nodes.length < 2) continue
          for (let index = 0; index < nodes.length - 1; index += 1) {
            const first = nodes[index]
            const second = nodes[index + 1]
            // The separator is the text BETWEEN them in the markup. If the
            // author wrote a space, no rule has to supply one.
            const between = element.textContent ?? ''
            const firstText = (first.textContent ?? '').trim()
            const secondText = (second.textContent ?? '').trim()
            const joined = firstText + secondText
            if (!between.includes(joined)) continue
            // An ordinal against a name: the first run ends in a digit and the
            // second opens with a letter. Punctuation, a separator and a
            // number inside a sentence are all excluded by construction.
            if (!/\d$/.test(firstText) || !/^[A-Za-z]/.test(secondText)) continue
            // An element that owns an absolutely positioned descendant has ink
            // wider than its own line — a dropdown, an overlay — so its right
            // edge says nothing about where its text ends.
            const positioned = (node: Node): boolean => {
              const element = node instanceof Element ? node : node.parentElement
              if (element === null) return false
              return [...element.querySelectorAll('*')].some((child) => {
                const position = getComputedStyle(child).position
                return position === 'absolute' || position === 'fixed'
              })
            }
            if (positioned(first) || positioned(second)) continue
            const a = ink(first)
            const b = ink(second)
            if (a === null || b === null) continue
            if (Math.abs(a.top - b.top) > 6) continue
            examined += 1
            if (b.left - a.right < 1) {
              bad.push(`"${firstText.slice(0, 12)}" touches "${secondText.slice(0, 16)}"`)
            }
          }
        }
        return { bad: [...new Set(bad)].slice(0, 8), examined }
      })

      expect(jams.bad, `${route} — two separate things read as one word`).toEqual([])
    })
  }
})
