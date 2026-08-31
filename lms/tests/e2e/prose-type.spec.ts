import { expect, test } from '@playwright/test'
import { A2 } from './sheets'

/**
 * §6.5 in the prose column: which type a run of content ends up set in, which
 * is a layout fact and never a source fact. This caption strip was carrying
 * whatever length of sentence an author wrote under an image, and every unit
 * test of the code that produced it passed.
 */

test('a caption strip stays 28px however long the author wrote (§6.5)', async ({ page }) => {
  // Module 3 carries the corpus's image captions — arbitrary-length authored
  // prose, which used to be set as an 11px tracked uppercase mono label.
  await page.goto(A2.path)

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
