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
    [...document.querySelectorAll('.prose .hl-cap')].map((cap) => {
      const label = cap.querySelector('.hl-cap-label')!
      const note = cap.querySelector('.hl-cap-note')
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

  for (const strip of strips) {
    expect(strip.labelHeight, `"${strip.label}"`).toBe(28)
  }
  for (const strip of noted) {
    // The sentence is set in the meta voice, not shouted in mono (§3.4).
    expect(strip.note!.length, 'the author\'s sentence survives in full')
      .toBeGreaterThan(60)
    expect(strip.noteFont).toMatch(/Plex Sans Condensed|IBM Plex Sans/)
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
    const cells = [...document.querySelectorAll('.prose :is(td, th) code')]
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

  expect(measured.count, 'no sheet puts inline code in a table cell any more')
    .toBeGreaterThan(0)
  expect(measured.parents).toContain('td')
  // §3.2's `text-meta` step, and the px it resolves to at the root size.
  expect(Number.parseFloat(measured.meta) * 16).toBe(13)
  expect(measured.sizes).toEqual(['13px'])
})
