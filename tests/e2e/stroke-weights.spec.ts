import { type Page, expect, test } from '@playwright/test'
import { A0 } from './sheets'

/**
 * §2.2 — the middle weight, measured in the engine that has to paint it.
 *
 * `tests/unit/stroke-weights.test.ts` reads the stylesheets and refuses a
 * struct weight in a border. This is the other half: it asks Chrome what it
 * actually painted, because the defect being guarded against was invisible in
 * the source — `--stroke-struct` read `1.5px` off `:root` the whole time, and
 * a sweep of a module sheet still found exactly one non-zero border width
 * across 256 painted borders: `1px`.
 */

/** The browser fact the whole painted-rule approach exists to work around. */
async function borderFlooring(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement('div')
    probe.style.cssText =
      'width:80px;height:20px;border-top:1.5px solid red;border-bottom:2px solid red;'
      + 'background-image:linear-gradient(red 0 0);background-size:100% 1.5px;'
    document.body.append(probe)
    const style = getComputedStyle(probe)
    const measured = {
      border1_5: style.borderTopWidth,
      border2: style.borderBottomWidth,
      background1_5: style.backgroundSize,
      dpr: window.devicePixelRatio,
    }
    probe.remove()
    return measured
  })
}

/**
 * Every weight this page paints as a *rule* — a gradient sized to a hairline,
 * or an element whose whole box is the rule. Border widths are excluded on
 * purpose: they are the mechanism that cannot carry 1.5px.
 */
async function paintedWeights(page: Page) {
  return page.evaluate(() => {
    const weights = new Set<number>()

    const fromSize = (size: string) => {
      // "100% 1.5px" / "1.5px 100%" — take the axis that is a length.
      for (const part of size.split(' ')) {
        if (part.endsWith('px')) {
          const value = Number.parseFloat(part)
          if (value > 0 && value <= 4) weights.add(value)
        }
      }
    }

    for (const el of document.querySelectorAll('*')) {
      for (const pseudo of [null, '::before', '::after']) {
        const style = getComputedStyle(el, pseudo ?? undefined)
        if (pseudo && style.content === 'none') continue
        if (style.backgroundImage.includes('gradient')) {
          for (const layer of style.backgroundSize.split(',')) fromSize(layer.trim())
        }
        // A rule that is its own element: `.hl-rule-struct`, the gauge's tick.
        if (pseudo === null) continue
        const height = Number.parseFloat(style.height)
        if (style.backgroundColor !== 'rgba(0, 0, 0, 0)' && height > 0 && height <= 4) {
          weights.add(height)
        }
      }
    }

    const rule = document.querySelector('.hl-rule-struct')
    return {
      weights: [...weights].sort((a, b) => a - b),
      ruleStructHeight: rule ? rule.getBoundingClientRect().height : null,
      token: getComputedStyle(document.documentElement)
        .getPropertyValue('--stroke-struct').trim(),
    }
  })
}

test('Chrome still floors a border width, which is why rules are painted', async ({ page }) => {
  await page.goto('/')
  const measured = await borderFlooring(page)

  // If this ever starts reading 1.5px, the painted rules are no longer
  // *required* — they are still correct, and nothing below changes.
  expect(measured.border1_5, 'a 1.5px border').toBe('1px')
  expect(measured.border2, 'a 2px border, for contrast').toBe('2px')
  expect(measured.background1_5, 'a 1.5px background is not floored')
    .toBe('100% 1.5px')
})

test('a listing page paints its structural rule at the struct weight', async ({ page }) => {
  // `/courses/`, not `/`. This test read the home page until M13, where §4.8
  // item 3's full-box rule under the statement was the subject — and home A
  // does not have one: the four measured facts are separated by hairlines and
  // the page carries no `.hl-rule-struct` at all. The rule itself did not move,
  // and the pages that draw it are the listings and the progress page, so the
  // measurement follows it there. What is being checked is unchanged: the
  // middle weight is PAINTED rather than bordered, because Chrome floors a
  // border to a whole pixel.
  await page.goto('/courses/')
  const { weights, ruleStructHeight, token } = await paintedWeights(page)

  expect(token).toBe('1.5px')
  // Its whole box is the rule, so this is the weight itself, measured.
  expect(ruleStructHeight).toBe(1.5)
  expect(weights, 'the struct weight is painted somewhere on the page')
    .toContain(1.5)
})

test('an A0 module paints the struct weight rather than bordering it', async ({ page }) => {
  await page.goto(A0.path)
  const { weights } = await paintedWeights(page)
  expect(weights, 'no rule on the module paints heavier than a hairline')
    .toContain(1.5)

  // The named consumers: §6.1's rule under the h1 and §6.5's rule under a
  // table header. Each keeps a transparent border for the layout space it
  // always occupied.
  //
  // `.hl-title-block-head` was the third and is gone from this list, not from
  // the rule: M11 cut the right rail back to the sections and the dependency
  // block, so variant A of the module info — the 240px panel that head belongs
  // to — is rendered by no page (`TitleBlock.tsx`). A selector that cannot
  // match asserts nothing, and leaving it here would have read as a regression
  // in the paint rather than as a layout that moved. `catalog`'s own case above
  // still covers a painted struct rule outside the prose.
  const consumers = await page.evaluate(() =>
    ['.prose h1', '.prose thead th'].map((selector) => {
      const el = document.querySelector(selector)
      if (!el) return { selector, found: false }
      const style = getComputedStyle(el)
      return {
        selector,
        found: true,
        painted: style.backgroundSize,
        borderColor: style.borderBottomColor,
      }
    }),
  )

  for (const consumer of consumers) {
    expect(consumer.found, `${consumer.selector} exists on an A0 module`).toBe(true)
    expect(consumer.painted, `${consumer.selector} paints the rule`).toBe('100% 1.5px')
    expect(consumer.borderColor, `${consumer.selector} does not border it`)
      .toBe('rgba(0, 0, 0, 0)')
  }
})
