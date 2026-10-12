// Records the home page's Bazaar Street walk as footage, one frame at a time.
//
// The walk is a GSAP timeline that ScrollTrigger scrubs with a 0.9 s lag, so a
// frame depends on elapsed time as well as on the scroll position. Playwright's
// fake clock makes that time ours: every frame scrolls to its point on the path
// below and advances the page clock by exactly 1/30 s. CSS animations (dust
// motes, lantern sway) run on the browser's own timeline, which the fake clock
// does not reach, so each frame pins them to the frame's time instead.
//
// Usage, with the static export served on :3111 (node scripts/serve-static.mjs out 3111):
//   node assets/videos/bazaar-hyperframes/scripts/record-walk.mjs <frames-dir> <log.json>
//   ffmpeg -framerate 30 -i <frames-dir>/%04d.jpg -c:v libx264 -crf 17 -pix_fmt yuv420p \
//     assets/videos/bazaar-hyperframes/assets/footage/walk.mp4
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const [outDir, logPath] = process.argv.slice(2)
const FPS = 30
const SCALE = 1.5

// The scroll path: [seconds, scrollY]. Holds sit where a stall plays its prop
// animation (the scribe, the scale, the pictures); the ScrollTrigger lag
// rounds every corner of this path on its own.
const PATH = [
  [0.0, 0],
  [2.4, 0],
  [4.4, 1150],
  [5.7, 2050],
  [8.1, 2600],
  [9.2, 3380],
  [11.6, 4000],
  [12.7, 4780],
  [15.1, 5400],
  [15.8, 5400],
]
const END = PATH[PATH.length - 1][0]
const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2)
const scrollAt = (t) => {
  for (let i = 1; i < PATH.length; i++) {
    const [t0, y0] = PATH[i - 1]
    const [t1, y1] = PATH[i]
    if (t <= t1) return y0 + (y1 - y0) * ease((t - t0) / (t1 - t0))
  }
  return PATH[PATH.length - 1][1]
}

mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: SCALE })
await page.clock.install({ time: new Date('2026-10-12T12:00:00Z') })
await page.goto('http://localhost:3111/', { waitUntil: 'load' })
await page.clock.runFor(3000)
await page.evaluate(() => document.fonts.ready)

const log = []
const frames = Math.round(END * FPS)
for (let f = 0; f < frames; f++) {
  const t = f / FPS
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(scrollAt(t)))
  await page.waitForTimeout(20)
  await page.clock.runFor(1000 / (2 * FPS))
  await page.clock.runFor(1000 / (2 * FPS))
  const at = await page.evaluate((ms) => {
    for (const a of document.getAnimations()) {
      if (!(a instanceof CSSAnimation) && !(a instanceof CSSTransition)) continue
      a.pause()
      a.currentTime = ms
    }
    const signs = [...document.querySelectorAll('.sign')].map((s) => {
      const b = s.getBoundingClientRect()
      return [Math.round(b.x), Math.round(b.right)]
    })
    const copy = document.querySelector('.gate-copy')
    return { signs, copy: copy ? Number(getComputedStyle(copy).opacity).toFixed(2) : null }
  }, Math.round(t * 1000))
  log.push({ f, t: Number(t.toFixed(3)), y: Math.round(scrollAt(t)), ...at })
  await page.screenshot({ path: `${outDir}/${String(f).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 })
}
writeFileSync(logPath, JSON.stringify(log))
await browser.close()
console.log(`recorded ${frames} frames, ${END}s`)
