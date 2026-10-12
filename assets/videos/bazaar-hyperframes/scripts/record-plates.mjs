// Captures the still plates Frames 6 and 7 show: one module page in English,
// Turkish and Persian, and a module figure, at 1.5x so the composition can
// crop into them and stay sharp.
//
// Usage, with the static export served on :3111:
//   node assets/videos/bazaar-hyperframes/scripts/record-plates.mjs assets/videos/bazaar-hyperframes/capture/assets
// then run the workflow's stage-assets step (or copy the PNGs into assets/).
import { chromium } from '@playwright/test'

const out = process.argv[2]
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.5, reducedMotion: 'reduce' })

const shoot = async (url, name, y = 0) => {
  await page.goto('http://localhost:3111' + url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate((y) => window.scrollTo(0, y), y)
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${out}/${name}.png` })
}

await shoot('/courses/fundamentals/llms/', 'module-llms-en')
await shoot('/tr/courses/fundamentals/llms/', 'module-llms-tr')
await shoot('/fa/courses/fundamentals/llms/', 'module-llms-fa')

// The AI Agents module's first figure, scrolled to sit near the top.
await page.goto('http://localhost:3111/courses/fundamentals/agents/', { waitUntil: 'networkidle' })
const y = await page.evaluate(() => {
  const img = document.querySelector('.bz-prose img, article img')
  return img.getBoundingClientRect().top + window.scrollY - 160
})
await shoot('/courses/fundamentals/agents/', 'module-agents-figure', y)


// Frame 7's title bands: breadcrumb, title and meta line only (the objectives
// card below them is English on every language, so it stays out of frame),
// at 2.5x so the band can fill the frame's width and stay sharp.
const band = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2.5, reducedMotion: 'reduce' })
for (const [lang, prefix] of [['en', ''], ['tr', '/tr'], ['fa', '/fa']]) {
  await band.goto(`http://localhost:3111${prefix}/courses/fundamentals/llms/`, { waitUntil: 'networkidle' })
  await band.evaluate(() => document.fonts.ready)
  await band.waitForTimeout(500)
  await band.screenshot({ path: `${out}/module-llms-${lang}-title.png`, clip: { x: 562, y: 81, width: 853, height: 166 } })
}
await browser.close()
