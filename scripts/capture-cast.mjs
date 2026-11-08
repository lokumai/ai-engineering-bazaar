#!/usr/bin/env node
/**
 * Writes the seven people at the home page's gate into their art files.
 *
 * The cast is the author's picks of 2026-11-06 (M49: Bit, Mei, Deniz, Dariush N2, Piri W2)
 * and the Janissary he asked for, finished in `playground/2026-11-round-3/N-cast-final.html`
 * (M50), and Mihrî, who took the place of Leyla (2026-11-08: the author picked candidate D
 * of `playground/2026-11-round-4/P-turkish-woman.html`). Both pages draw every figure in
 * script from one generator (the second is the first with more hair, hats and props, and
 * draws the old figures unchanged). This script loads each in Chrome, asks it for its
 * figures and stores the markup, the same way `capture-stall-scenes.mjs` stores the
 * stalls, so the page, reduced motion and no script all show finished pictures with nothing
 * to compute:
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
/* Which page draws whom. A person is drawn by the page that holds the artwork the author
   picked; the others stay as M50 finished them, so running this changes nothing but the
   figure whose drawing changed. `delay` is each figure's idle delay, by its place in the
   cast's own order (`cast.ts`), which is the order the six were first captured in. */
const SOURCES = [
  {
    page: 'playground/2026-11-round-3/N-cast-final.html',
    ids: ['dariush', 'deniz', 'bit', 'murat', 'mei', 'piri'],
    delays: { dariush: 0.6, deniz: 1.2, bit: 1.8, murat: 2.4, mei: 3.0, piri: 3.6 },
  },
  {
    page: 'playground/2026-11-round-4/P-turkish-woman.html',
    ids: ['mihri'],
    delays: { mihri: 0 },
  },
]
const ART = path.join(ROOT, 'src/components/home/street/art')

const browser = await chromium.launch({ channel: 'chrome' })
const all = []
for (const source of SOURCES) {
const page = await browser.newPage()
await page.goto('file://' + path.join(ROOT, source.page), { waitUntil: 'load' })
const figures = await page.evaluate(({ ids, delays }) => {
  /* global draw */
  const out = {}
  const tidy = (svg) => {
    svg.removeAttribute('role')
    svg.removeAttribute('aria-label')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    svg.classList.remove('back', 'run')
    return svg
  }
  ids.forEach((id) => {
    const box = document.createElement('div')
    box.innerHTML = draw(id, { dl: delays[id].toFixed(1) + 's' })
    const full = tidy(box.firstElementChild)
    /* The chase moves the person and their shadow, never the goods at their feet
       (goods drawn at a person's feet, such as the sacks the retired Leyla stood among): those
       two go into one group the motion transforms. */
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
  return { order: ids, out }
}, { ids: source.ids, delays: source.delays })
all.push(figures)
await page.close()
}
await browser.close()

for (const figures of all)
for (const id of figures.order) {
  const { full, tile } = figures.out[id]
  if (/NaN|undefined/.test(full)) throw new Error(`${id}: the generator wrote NaN or undefined`)
  fs.writeFileSync(path.join(ART, `cast-${id}.html`), full + '\n')
  fs.writeFileSync(path.join(ART, `cast-${id}-tile.html`), tile + '\n')
  console.log(`${id}: ${full.length} + ${tile.length} characters`)
}
