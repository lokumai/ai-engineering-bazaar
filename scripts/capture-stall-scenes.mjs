#!/usr/bin/env node
/**
 * Writes the four stall scenes of the home street into their art files.
 *
 * The scenes are the author's picks of 2026-11-05 (G1b, G2a, G3a, G4a) from
 * `playground/2026-11-round-2/G-home-stall-scenes.html`. That page builds each
 * one in script: a seeded-random `svg()` template and a `build()` timeline.
 * This script loads that page in Chrome, takes each scene's markup AT ITS
 * `still` FRAME and stores it in `src/components/home/street/art/stall-*.html`,
 * between the stall's own wall and floor and the closing tag. Reduced motion,
 * no script and the first paint then show the finished picture with nothing
 * left to compute, which is the same reason the rest of the art is a file.
 *
 * The timelines are ported to `stall-timelines.ts`; they find what they move
 * by class and `data-*` attribute, so the one thing added here to the page's
 * own markup is the line geometry the draft's timeline needs (`data-x0`,
 * `data-x1`, `data-y` on each handwriting stroke), which the page keeps in a
 * closure.
 *
 * Run it when the playground page changes: `node scripts/capture-stall-scenes.mjs`.
 * It needs Chrome (the same one the e2e suite uses) and nothing from the
 * network: GSAP is served from `node_modules`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'

const ROOT = process.cwd()
const PAGE = path.join(ROOT, 'playground/2026-11-round-2/G-home-stall-scenes.html')
const ART = path.join(ROOT, 'src/components/home/street/art')
const GSAP = fs.readFileSync(path.join(ROOT, 'node_modules/gsap/dist/gsap.min.js'), 'utf8')

/** The page's scene code, the art file it fills, and where the page puts the still frame. */
const SCENES = [
  { code: 'G1b', file: 'stall-draft.html' },
  { code: 'G2a', file: 'stall-sieve.html' },
  { code: 'G3a', file: 'stall-lantern.html' },
  { code: 'G4a', file: 'stall-signpost.html' },
]
const MARK = '<g class="scene"'

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? 'chrome' })
const page = await browser.newPage()
/* The page names GSAP on a CDN with an integrity hash; the copy in node_modules
   is injected instead and the request is refused. */
await page.addInitScript(GSAP)
await page.route('**/gsap.min.js', (route) => route.abort())
await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
await page.goto(`file://${PAGE}`)

const captured = await page.evaluate((codes) => {
  const out = {}
  for (const code of codes) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 900 700')
    document.body.appendChild(svg)
    svg.innerHTML = S[code].svg()
    const tl = gsap.timeline({ paused: true })
    S[code].build(svg, tl)
    tl.progress(S[code].still)
    out[code] = svg.innerHTML
    tl.kill()
    svg.remove()
  }
  /* The draft's stroke geometry: the page's own function and seeds, so the
     numbers are the ones its timeline would have used. */
  const ys = [228, 264, 300, 336, 372, 408, 444]
  const ends = [612, 596, 618, 604, 610, 590, 480]
  out.strokes = ys.map((y, i) => ({ y, x0: 282, x1: script(282, ends[i], y, 70 + i).x1 }))
  return out
}, SCENES.map((s) => s.code))
await browser.close()

for (const { code, file } of SCENES) {
  const target = path.join(ART, file)
  const text = fs.readFileSync(target, 'utf8')
  const at = text.indexOf(MARK)
  if (at < 0) throw new Error(`${file} has no scene group to fill`)
  const open = text.slice(at, text.indexOf('>', at) + 1)
  /* GSAP leaves its bookkeeping in the style attribute; the pose is in `transform`
     (and `data-svg-origin` marks which elements GSAP moved, which the timelines
     use to start from a clean slate). */
  let inner = captured[code]
    .replace(/(translate|rotate|scale): none; ?/g, '')
    .replace(/transform-origin: 0px 0px; ?/g, '')
    .replace(/ style="\s*"/g, '')
  if (code === 'G1b') {
    let i = 0
    inner = inner.replace(/<path class="hl"/g, () => {
      const s = captured.strokes[i++]
      return `<path class="hl" data-x0="${s.x0}" data-x1="${s.x1}" data-y="${s.y}"`
    })
    if (i !== captured.strokes.length) throw new Error(`expected ${captured.strokes.length} strokes, found ${i}`)
  }
  fs.writeFileSync(target, `${text.slice(0, at)}${open}${inner}</g></svg>`)
  console.log(`${code} -> ${file} (${inner.length} characters)`)
}
