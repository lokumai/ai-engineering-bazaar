import { expect, test } from '@playwright/test'
import { A0, SHORT, sheetByModule } from './sheets'

/**
 * §3.4 and §6.5 in the prose column: which type a run of content ends up set
 * in, which is a cascade fact and a layout fact and never a source fact.
 *
 * One selector here could never match the shape the markdown pipeline emits;
 * one caption strip was carrying whatever length of sentence an author wrote
 * under an image. Both were invisible to every unit test of the code that
 * produced them.
 */

test('a caption strip stays 28px however long the author wrote (§6.5)', async ({ page }) => {
  // Module 3 carries the corpus's image captions — arbitrary-length authored
  // prose, which used to be set as an 11px tracked uppercase mono label.
  await page.goto(SHORT.path)

  const strips = await page.evaluate(() =>
    [...document.querySelectorAll('.bz-prose .bz-caption')].map((cap) => {
      const label = cap.querySelector('.bz-caption-label')!
      const note = cap.querySelector('.bz-caption-note')
      return {
        label: label.textContent ?? '',
        labelHeight: Math.round(label.getBoundingClientRect().height),
        note: note?.textContent ?? null,
        noteFont: note ? getComputedStyle(note).fontFamily : null,
        noteTransform: note ? getComputedStyle(note).textTransform : null,
      }
    }),
  )

  expect(strips.length).toBeGreaterThan(0)
  const noted = strips.filter((strip) => strip.note !== null)
  expect(noted.length, 'module 3 still captions its image').toBeGreaterThan(0)

  /*
    THE INVARIANT, not the number. This pinned `28`, which was the retired
    design's fixed-height label; the label is an inline span now and its height
    is one line of whatever step the language sets it in. What the test is
    actually about — and what its own title claims — is that the label does not
    grow with the sentence beside it, so it compares the strips to each other
    instead of to a constant nobody would know how to update.
  */
  const heights = [...new Set(strips.map((strip) => strip.labelHeight))]
  expect(heights, `label heights differ across captions: ${heights.join(', ')}`).toHaveLength(1)
  expect(heights[0], 'a caption label with no height').toBeGreaterThan(0)

  const family = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim(),
  )
  // The FIRST family the language declares, read from the language rather than
  // named here. This asserted `/Manrope/`, a face M9 wired up and M16 stage 0
  // removed — the language has one sans family and declares it in `--font-sans`.
  const declared = family.split(',')[0].replaceAll('"', '').trim()
  expect(declared, 'the language declares no sans family').not.toBe('')

  for (const strip of noted) {
    // The sentence is set in the meta voice, not shouted in mono (§3.4).
    expect(strip.note!.length, 'the author\'s sentence survives in full')
      .toBeGreaterThan(60)
    expect(strip.noteFont).toContain(declared)
    expect(strip.noteTransform).toBe('none')
  }
})

test('inline code in a table cell is text-meta, not 0.9em of the cell (§3.4)', async ({ page }) => {
  // Module 6 rather than the A0 exemplar. This used to load Security and
  // require more than ten such cells, which counted a machine-written draft
  // that has since been rewritten to none. Module 6 is the one sheet in the
  // corpus that puts inline code inside a table cell, and one cell is enough
  // to measure the size the rule is about.
  await page.goto(sheetByModule(6).path)

  const measured = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.bz-prose :is(td, th) code')]
    return {
      count: cells.length,
      sizes: [...new Set(cells.map((c) => getComputedStyle(c).fontSize))],
      meta: getComputedStyle(document.documentElement)
        .getPropertyValue('--text-meta').trim(),
      // The shape the pipeline actually emits: the cell IS the code's parent,
      // so a `:not(pre) > code` descendant selector can never match it.
      parents: [...new Set(cells.map((c) => c.parentElement?.tagName.toLowerCase() ?? ''))],
    }
  })

  expect(measured.count, 'no module puts inline code in a table cell any more')
    .toBeGreaterThan(0)
  expect(measured.parents).toContain('td')
  /*
    §3.2's `text-meta` step, COMPARED AGAINST THE TOKEN rather than against a
    number. This read `parseFloat(--text-meta) * 16 === 13`, which was correct
    while the token layer was authored in `rem`; M16 stage 0 replaced it with a
    px scale, so the multiplication computed 216 against an expectation of 13
    and the test could not pass whatever the page did. Reading the token and
    comparing the rendered size to it holds whichever unit the language picks.
  */
  expect(measured.meta, 'the language declares no --text-meta step').not.toBe('')
  expect(measured.sizes).toEqual([measured.meta])
})
