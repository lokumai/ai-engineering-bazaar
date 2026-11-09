import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ABOUT_PROPERTIES, aboutPaletteCss } from '@/components/about/palette'

/**
 * M90, D115 — the About page's colours are declared by `components/about/palette.ts` and read by
 * `src/app/about.css`, which also gives each one a default from the language. Nothing else ties the
 * three together: a property the stylesheet reads and the palette does not declare falls back to its
 * default with no error anywhere, and the page quietly loses that colour (a dead token fails
 * silently). So every direction is checked, by name.
 */

const css = readFileSync(join(import.meta.dirname, '../../src/app/about.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const read = new Set([...css.matchAll(/var\((--about-[a-z0-9-]+)/g)].map((m) => m[1]))
/** The defaults the stylesheet declares for them, which is what lets its references resolve in-file. */
const defaulted = new Set([...css.matchAll(/(--about-[a-z0-9-]+)\s*:/g)].map((m) => m[1]))

describe('the About palette and the stylesheet that reads it', () => {
  it('reads palette properties at all', () => {
    expect(read.size, 'about.css reads no --about-* property; has it moved?').toBeGreaterThan(5)
  })

  it('reads no property the palette does not declare', () => {
    expect([...read].filter((name) => !ABOUT_PROPERTIES.includes(name))).toEqual([])
  })

  it('declares no property the stylesheet never reads', () => {
    expect(ABOUT_PROPERTIES.filter((name) => !read.has(name))).toEqual([])
  })

  it('gives every property a default in the stylesheet, and no default the palette does not override', () => {
    expect([...read].filter((name) => !defaulted.has(name))).toEqual([])
    expect([...defaulted].filter((name) => !ABOUT_PROPERTIES.includes(name))).toEqual([])
  })

  it('writes every property it declares into the page', () => {
    const emitted = aboutPaletteCss()
    for (const name of ABOUT_PROPERTIES) expect(emitted).toContain(`${name}:`)
  })
})
