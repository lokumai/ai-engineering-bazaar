#!/usr/bin/env node
/**
 * Writes the seven people at the home page's gate into their art files.
 *
 * The cast is the author's picks of 2026-11-06 (M49: Bit, Mei, Deniz, Leyla, Dariush N2,
 * Piri W2) and the Janissary he asked for, finished in
 * `playground/2026-11-round-3/N-cast-final.html` (M50). That page draws every figure in
 * script from one generator. This script loads it in Chrome, asks it for each figure and
 * stores the markup, the same way `capture-stall-scenes.mjs` stores the stalls, so the
 * page, reduced motion and no script all show finished pictures with nothing to compute:
 *
 * - `cast-<id>.html`: the figure the gate places, with its front and back layers (`.v-f`,
 *   `.v-b`), both sets of arms and the carried layer the chase swaps between;
 * - `cast-<id>-tile.html`: the front only, for the phone row, where nobody turns.
 *
 * The person and their shadow are wrapped in one `.mover` group, which is what the chase
 * moves: the goods at their feet stay on the pavement.
 *
 * The figures are decoration inside a button that names them, so each `<svg>` loses its
 * `role` and `aria-label` and is marked `aria-hidden`.
 *
 * Run it when the playground page changes: `node scripts/capture-cast.mjs`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'

const ROOT = process.cwd()
const PAGE = path.join(ROOT, 'playground/2026-11-round-3/N-cast-final.html')
const ART = path.join(ROOT, 'src/components/home/street/art')

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
await page.goto('file://' + PAGE, { waitUntil: 'load' })
const figures = await page.evaluate(() => {
  /* global ORDER, draw */
  const out = {}
  const tidy = (svg) => {
    svg.removeAttribute('role')
    svg.removeAttribute('aria-label')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    svg.classList.remove('back', 'run')
    return svg
  }
  ORDER.forEach((id, k) => {
    const box = document.createElement('div')
    box.innerHTML = draw(id, { dl: (k * 0.6).toFixed(1) + 's' })
    const full = tidy(box.firstElementChild)
    /* The chase moves the person and their shadow, never the goods at their feet
       (Leyla's sacks): those two go into one group the motion transforms. */
    const mover = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    mover.setAttribute('class', 'mover')
    const shad = full.querySelector(':scope > .shad')
    const fg = full.querySelector(':scope > .fg')
    if (shad === null || fg === null) throw new Error(`${id}: the drawing has no .shad or .fg`)
    mover.append(shad, fg)
    full.append(mover) // after the goods, so the person is drawn in front of them
    const tile = full.cloneNode(true)
    tile.querySelectorAll('.v-b').forEach((n) => n.remove())
    out[id] = { full: full.outerHTML, tile: tile.outerHTML }
  })
  return { order: ORDER, out }
})
await browser.close()

for (const id of figures.order) {
  const { full, tile } = figures.out[id]
  if (/NaN|undefined/.test(full)) throw new Error(`${id}: the generator wrote NaN or undefined`)
  fs.writeFileSync(path.join(ART, `cast-${id}.html`), full + '\n')
  fs.writeFileSync(path.join(ART, `cast-${id}-tile.html`), tile + '\n')
  console.log(`${id}: ${full.length} + ${tile.length} characters`)
}
