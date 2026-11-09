import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CARAVAN_PROPERTIES, caravanPaletteCss } from '@/components/caravan/palette'

/**
 * M91, D116 — the Caravan page's colours are declared by `components/caravan/palette.ts` and read by
 * `src/app/caravan.css`, which also gives each a default from the language (About's pattern, M90).
 * Nothing else ties the three together: a property the stylesheet reads and the palette does not
 * declare falls back to its default with no error anywhere. So every direction is checked, by name.
 */

const css = readFileSync(join(import.meta.dirname, '../../src/app/caravan.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const read = new Set([...css.matchAll(/var\((--caravan-[a-z0-9-]+)/g)].map((m) => m[1]))
const defaulted = new Set([...css.matchAll(/(--caravan-[a-z0-9-]+)\s*:/g)].map((m) => m[1]))

describe('the Caravan palette and the stylesheet that reads it', () => {
  it('reads palette properties at all', () => {
    expect(read.size, 'caravan.css reads no --caravan-* property; has it moved?').toBeGreaterThan(10)
  })

  it('reads no property the palette does not declare', () => {
    expect([...read].filter((name) => !CARAVAN_PROPERTIES.includes(name))).toEqual([])
  })

  it('declares no property the stylesheet never reads', () => {
    expect(CARAVAN_PROPERTIES.filter((name) => !read.has(name))).toEqual([])
  })

  it('gives every property a default in the stylesheet, and no default the palette does not override', () => {
    expect([...read].filter((name) => !defaulted.has(name))).toEqual([])
    expect([...defaulted].filter((name) => !CARAVAN_PROPERTIES.includes(name))).toEqual([])
  })

  it('writes every property it declares into the page', () => {
    const emitted = caravanPaletteCss()
    for (const name of CARAVAN_PROPERTIES) expect(emitted).toContain(`${name}:`)
  })
})
