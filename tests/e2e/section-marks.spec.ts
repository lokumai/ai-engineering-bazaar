import { type Page, expect, test } from '@playwright/test'
import { A0 } from './sheets'

/**
 * The Roman numerals — §6.1's section mark in the prose gutter and §5.6's in
 * the contents spine — measured in ink rather than asserted in CSS.
 *
 * Both defects read perfectly in the source. One was a numeral hung 44px into
 * a gutter that §4.1's zone arithmetic only ever left 24px of; the other was a
 * `text-align` that has no say once the content over-constrains its line box.
 * Neither is visible in a stylesheet and both are obvious in a screenshot.
 */

/** The painted extent of an element's text, not its box. */
function inkOf(page: Page, selector: string) {
  return page.evaluate((sel) => {
    return [...document.querySelectorAll(sel)].map((el) => {
      const range = document.createRange()
      range.selectNodeContents(el)
      const ink = range.getBoundingClientRect()
      return {
        text: (el.textContent ?? '').trim(),
        left: ink.left,
        right: ink.right,
        width: ink.width,
      }
    })
  }, selector)
}

/**
 * SKIPPED, and the reason is the corpus rather than the code.
 *
 * Both cases below need a sheet whose `h2`s carry `data-mark`, which is what
 * puts a numeral beside a section. `data-mark` appears nowhere in the export:
 * grep it and you get zero. The old machine-written Intermediate drafts
 * numbered their sections, and the rewrite dropped that style everywhere, so
 * there is no page left to measure the rule on.
 *
 * The rule is still worth having. To bring these back, either a sheet has to
 * use numbered sections again, or they need a served fixture page to run
 * against, which the browser suite does not currently have. That is a decision
 * about the corpus, not something to settle by loosening the assertions.
 */
const NO_NUMBERED_SECTIONS = true

test('the section numeral stays out of the left rail (§6.1, §4.1)', async ({ page }) => {
  test.skip(NO_NUMBERED_SECTIONS, 'no sheet carries a section numeral: see the note above')
  await page.goto(A0.path)

  const measured = await page.evaluate(() => {
    const rail = document.querySelector('.hl-rail-left')!.getBoundingClientRect()
    const headings = [...document.querySelectorAll('.prose h2[data-mark]')]
    return {
      railRight: rail.right,
      marks: headings.map((h) => {
        const before = getComputedStyle(h, '::before')
        // The numeral is the first inline box on the heading's line, so its
        // left edge is the heading's own content edge plus its margin.
        return {
          mark: h.getAttribute('data-mark') ?? '',
          left: h.getBoundingClientRect().left + Number.parseFloat(before.marginLeft),
          font: before.fontFamily,
        }
      }),
    }
  })

  // §4.1's zone arithmetic leaves a 24px gutter and §6.1 wants 44px of it.
  // The gutter wins, so the numeral is inline — but it is still a mono mark.
  expect(measured.marks.length, 'the security sheet still numbers its sections')
    .toBeGreaterThan(5)
  for (const mark of measured.marks) {
    expect(mark.font, `${mark.mark} is still set in mono`).toMatch(/Plex Mono/)
    expect(
      mark.left,
      `numeral ${mark.mark} starts at ${mark.left}, inside the rail's track `
      + `(which ends at ${measured.railRight})`,
    ).toBeGreaterThanOrEqual(measured.railRight)
  }
})

test('a TOC numeral never runs into its section title (§5.6)', async ({ page }) => {
  test.skip(NO_NUMBERED_SECTIONS, 'no sheet carries a section numeral: see the note above')
  await page.goto(A0.path)

  const marks = await inkOf(page, '.hl-rail-left .hl-toc-mark')
  const titles = await inkOf(page, '.hl-rail-left .hl-toc-text')

  expect(marks.length).toBeGreaterThan(5)
  // MEASURED: `VIII` is 29px of ink in a 24px track. Right-alignment cannot
  // help — an over-constrained line box overflows towards inline-end — so the
  // numeral is set RTL and the overflow goes left, into the padding the spine
  // already stands clear of.
  expect(marks.some((m) => m.text === 'VIII'), 'sheet 13 still has a section VIII')
    .toBe(true)

  for (const [i, mark] of marks.entries()) {
    if (mark.text === '') continue
    expect(
      titles[i].left - mark.right,
      `"${mark.text}" ends at ${mark.right}, title "${titles[i].text}" starts `
      + `at ${titles[i].left}`,
    ).toBeGreaterThanOrEqual(0)
  }
})
