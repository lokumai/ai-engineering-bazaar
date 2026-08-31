import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { EDGES, OUTLINE, VIEW_BOX } from '@/components/mascot/geometry'
import { oklchToHex } from '@/lib/color/oklch'
import { readDesignToken } from '@/lib/content/code-theme'

/**
 * The favicon (§8.3), which is a hand-written file and therefore the one place
 * in the mark that can drift away from `geometry.ts` without anything noticing.
 *
 * It has to be hand-written: a favicon is painted by the browser chrome,
 * outside the document, so it cannot read a `var(--…)` token and it cannot see
 * the site's theme class. §8.3 answers that with "baked to a static hex per
 * theme", which means two literals — and a literal copy of a derived value is
 * exactly what §11.25 exists to stop. So this test is the derivation: the paths
 * come from `geometry.ts`, the colours from `globals.css` through the same
 * `oklchToHex` the syntax theme uses, and either drifting fails here.
 *
 * It is also the regression test for the gap itself. The site shipped no icon
 * at all, so Chrome asked for `/favicon.ico` unprompted on every navigation and
 * logged a console error on all forty-two exported pages.
 */

const APP = path.resolve(process.cwd(), 'src', 'app')
const SVG = fs.readFileSync(path.join(APP, 'icon.svg'), 'utf8')

/** §8.1's visible Y, which is the only interior line §8.3 keeps. */
const VISIBLE_Y = EDGES.filter((edge) => edge.kind === 'visible-y')
  .map((edge) => edge.path)
  .join(' ')

function paths(): string[] {
  return [...SVG.matchAll(/<path\s+d="([^"]+)"/g)].map((match) => match[1])
}

describe('src/app/icon.svg — the §8.3 favicon variant', () => {
  it('is a metadata file route, not a file under public/', () => {
    // `public/` is copied verbatim and is not base-path aware, and this site is
    // served from a sub-path. Next rewrites the <link> for a route; it does not
    // rewrite a hand-written one. See lib/url.ts.
    expect(fs.existsSync(path.join(APP, 'icon.svg'))).toBe(true)
    expect(fs.existsSync(path.resolve(process.cwd(), 'public', 'favicon.ico'))).toBe(false)
  })

  it('is drawn on the same viewBox as the rest of the mark', () => {
    expect(SVG).toContain(`viewBox="${VIEW_BOX}"`)
  })

  it('draws the hexagon outline and the visible Y, and nothing else', () => {
    expect(paths()).toEqual([OUTLINE, VISIBLE_Y])
  })

  it('carries no hidden lines, no sugar and no hatching', () => {
    const hiddenY = EDGES.filter((edge) => edge.kind === 'hidden-y').map((edge) => edge.path)
    for (const hidden of hiddenY) expect(SVG).not.toContain(hidden)
    expect(SVG).not.toContain('stroke-dasharray')
    expect(SVG).not.toContain('<circle')
    expect(SVG).not.toContain('<pattern')
  })

  it('strokes at the weight §8.3 fixes for this variant', () => {
    expect(SVG).toMatch(/stroke-width:\s*2\b/)
  })

  it('bakes the ink token of each theme, exactly as oklchToHex resolves it', () => {
    const ink = readDesignToken('--color-ink')
    const light = oklchToHex(ink.light)
    const dark = oklchToHex(ink.dark)

    expect(light).not.toBe(dark)
    expect(SVG).toContain(`stroke: ${light}`)
    expect(SVG).toContain(`stroke: ${dark}`)

    // The dark literal is the one behind the media query; the light one is the
    // unconditional default, the way `globals.css` declares them (§2.3).
    const query = /@media \(prefers-color-scheme: dark\)\s*\{[^}]*\}/.exec(SVG)?.[0] ?? ''
    expect(query).toContain(dark)
    expect(query).not.toContain(light)
  })

  it('names itself for assistive technology rather than reading as decoration', () => {
    expect(SVG).toContain('<title>LKM-01</title>')
  })
})

describe('src/app/icon.png — §8.3’s 32px fallback', () => {
  const PNG = fs.readFileSync(path.join(APP, 'icon.png'))

  it('is a real PNG', () => {
    expect([...PNG.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  })

  it('is 32 × 32, the size §8.3 asks the fallback for', () => {
    // IHDR is always the first chunk: width and height are big-endian at 16..24.
    expect(PNG.readUInt32BE(16)).toBe(32)
    expect(PNG.readUInt32BE(20)).toBe(32)
  })

  it('is small enough to be line work rather than a rasterised illustration', () => {
    expect(PNG.byteLength).toBeLessThan(4096)
  })
})
