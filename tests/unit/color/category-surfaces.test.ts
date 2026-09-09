import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '@/lib/content/curriculum-file'
import { ROLE_IDS } from '@/lib/path/roles'

/**
 * The channel-A state lists a SURFACE has to keep complete.
 *
 * These four rules were `tests/unit/color/category-css.test.ts` until M16, read
 * off `lokum.css` and `rail.css`. Both files were deleted with the rest of the
 * old interface, and each rule belongs to a surface a later M16 stage
 * re-authors: the level tints and the LKM-01 faces to the catalog and the
 * progress page, the nine-role path reveal to the progress page.
 *
 * **They are written as existence-guarded completeness rules rather than
 * deferred to a checklist**, and that is the point of the file. Each one says
 * "if a stylesheet declares this list at all, the list covers everything it has
 * to cover", so it binds from the moment its surface exists and nobody has to
 * remember to switch it on. A rule parked in a milestone document is a rule
 * that evaporates, which is the failure this whole milestone exists to correct.
 *
 * Why completeness and not appearance: channel A cannot loop. Every one of
 * these is a LIST — one selector per category, per state, per role — and the
 * defect a missing entry causes is silent. A category that never lights up, or
 * an empty state shown *alongside* a role's path, are both §1 failures, and
 * neither shows up in a typecheck or in a render.
 *
 * One rule from the original four is not here. **The closed list of surfaces
 * permitted to paint a category hue** named eleven classes of the old design,
 * so restoring it would have meant inventing the new eleven before the surfaces
 * that own them exist. What replaced it is the Don't that DESIGN.md actually
 * states, enforced in `tests/unit/design/surface-stylesheets.test.ts`: a
 * category hue binds to a group, and may not be spent on a link, a button or a
 * focus ring.
 */

const APP_DIR = join(import.meta.dirname, '../../../src/app')
const NOT_A_SURFACE = new Set(['globals.css', 'lokum-modules.css'])

/** Every surface stylesheet, concatenated, comments stripped. */
function surfaceCss(): string {
  const raw = readdirSync(APP_DIR)
    .filter((name) => name.endsWith('.css') && !NOT_A_SURFACE.has(name))
    .sort()
    .map((name) => readFileSync(join(APP_DIR, name), 'utf8'))
    .join('\n')
  return raw.replace(/\/\*[\s\S]*?\*\//g, ' ')
}

const css = surfaceCss()
const SLUGS = CATEGORIES.map((category) => category.slug).sort()

/** Every distinct capture of `pattern`, in order found. */
function captures(pattern: RegExp): string[] {
  return [...new Set([...css.matchAll(pattern)].map((match) => match[1]))]
}

/** Does any surface declare this list yet? */
function declared(pattern: RegExp): boolean {
  return pattern.test(css)
}

const CARRIER = /\[data-cat="[a-z-]+"\]\s*\{[^}]*--bz-cat:/
const AGGREGATE = /html\.hl-cat-[a-z-]+-(?:started|complete)\b/
const ROLE_REVEAL = /\.hl-role-[a-z-]+/

describe('the category hue carrier, once a surface declares one', () => {
  it.skipIf(!declared(CARRIER))('maps every category slug to a hue, and only real ones', () => {
    const carriers = captures(/\[data-cat="([a-z-]+)"\]\s*\{[^}]*--bz-cat:/g)
    expect(carriers.sort()).toEqual(SLUGS)
  })

  /**
   * The language closes the series at five and DESIGN.md forbids a sixth, so a
   * carrier resolving to anything outside `--color-category-1…5` is either an
   * invented hue or a hue borrowed from somewhere it does not belong.
   */
  it.skipIf(!declared(CARRIER))('resolves each hue from the closed series of five', () => {
    const bound = [...css.matchAll(/--bz-cat:\s*([^;]+);/g)].map((m) => m[1].trim())
    expect(bound.length).toBeGreaterThan(0)
    for (const value of bound) {
      expect(value, `${value} is not one of the five category hues`)
        .toMatch(/^var\(--color-category-[1-5]\)$/)
    }
  })
})

describe('the two aggregate category states, once a surface declares them', () => {
  it.each(['started', 'complete'] as const)(
    'covers every category in the %s state',
    (state) => {
      if (!declared(AGGREGATE)) return
      const named = captures(new RegExp(`html\\.hl-cat-([a-z-]+)-${state}\\s`, 'g'))
      expect(named.sort()).toEqual(SLUGS)
    },
  )
})

describe('the role path shows exactly one body, once a surface declares it', () => {
  it.skipIf(!declared(ROLE_REVEAL))('names all nine roles in the reveal rule', () => {
    const named = captures(/html\.hl-role-([a-z-]+)\s/g)
    expect(named.sort()).toEqual([...ROLE_IDS].sort())
  })

  /**
   * The empty state is shown by negating every role at once. A role missing
   * from that chain shows the empty state AND that role's path together — two
   * contradictory answers on one screen.
   */
  it.skipIf(!declared(ROLE_REVEAL))('negates all nine roles in the empty-state rule', () => {
    const chain = /html((?::not\(\.hl-role-[a-z-]+\))+)/.exec(css)
    expect(chain, 'no empty-state negation chain in any surface stylesheet').not.toBeNull()
    const negated = [...(chain?.[1] ?? '').matchAll(/\.hl-role-([a-z-]+)/g)].map((m) => m[1])
    expect(negated.sort()).toEqual([...ROLE_IDS].sort())
  })
})

describe('the guards themselves', () => {
  /**
   * Every rule above is skipped when its list is absent, so all of them would
   * report green against a stylesheet that declares nothing. This is the one
   * case that cannot: it states what the corpus and the role list actually
   * contain, so a category added or a role removed without the surfaces
   * following fails here rather than passing quietly everywhere.
   */
  it('knows what it is supposed to be covering', () => {
    expect(SLUGS.length).toBe(CATEGORIES.length)
    expect(new Set(SLUGS).size).toBe(SLUGS.length)
    expect(ROLE_IDS.length).toBeGreaterThan(0)
    expect(new Set(ROLE_IDS).size).toBe(ROLE_IDS.length)
  })
})
