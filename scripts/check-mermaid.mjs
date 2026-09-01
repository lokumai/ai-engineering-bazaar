/**
 * Parses every ```mermaid block in the given files with mermaid's own parser,
 * inside real Chrome.
 *
 * Not in node: mermaid sanitises flowchart labels through DOMPurify, which needs
 * a DOM, and without one every flowchart fails with `DOMPurify.addHook is not a
 * function` — a validator failure that looks exactly like a syntax error.
 */
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const files = process.argv.slice(2)
const browser = await chromium.launch({ channel: 'chrome' })
const page = await (await browser.newContext()).newPage()
await page.goto('about:blank')
await page.addScriptTag({ path: 'node_modules/mermaid/dist/mermaid.min.js' })
await page.evaluate(() => window.mermaid.initialize({ startOnLoad: false }))

let fail = 0
let total = 0
for (const f of files) {
  const blocks = [...readFileSync(f, 'utf8').matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1])
  console.log(`\n${f} — ${blocks.length} diyagram`)
  for (const [i, src] of blocks.entries()) {
    total++
    const kind = src.trim().split(/\s|\n/)[0]
    // Parse AND render. `parse` accepts diagrams that then throw during layout
    // — an unknown shape, an edge to a node that was never declared — and on
    // GitHub that is an error box rather than a diagram.
    const result = await page.evaluate(async ({ text, id }) => {
      try {
        await window.mermaid.parse(text)
      } catch (e) {
        return { stage: 'parse', message: String(e?.message ?? e) }
      }
      try {
        const { svg } = await window.mermaid.render(id, text)
        if (!svg || !svg.includes('<svg')) return { stage: 'render', message: 'no svg produced' }
        return { ok: true, bytes: svg.length }
      } catch (e) {
        return { stage: 'render', message: String(e?.message ?? e) }
      }
    }, { text: src, id: `probe-${i}` })
    const err = result.ok ? null : `[${result.stage}] ${result.message}`
    if (err === null) console.log(`  ✓ ${i + 1}. ${kind}  (${(result.bytes / 1024).toFixed(1)} KB svg)`)
    else {
      fail++
      console.log(`  ✗ ${i + 1}. ${kind}\n      ${err.split('\n').slice(0, 5).join(' | ')}`)
    }
  }
}
await browser.close()
console.log(`\n${total - fail}/${total} diyagram gecerli\n`)
process.exit(fail === 0 ? 0 : 1)
