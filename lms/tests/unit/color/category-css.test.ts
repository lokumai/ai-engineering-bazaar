import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '@/lib/content/categories'
import { curriculumFacts } from '@/lib/content/facts'
import { ROLE_IDS } from '@/lib/path/roles'

/**
 * §13.5 — the generated selector groups in `lokum.css`, checked for completeness.
 *
 * Channel A cannot loop. Every state rule in `lokum.css` is a hand-written list
 * of selectors — six per category state, 32 per module, 15 per signable module,
 * nine per role — and a hand-written list is the one thing in this system that a
 * renumber, a new category or a tenth role silently invalidates. The failure is
 * not a crash: it is a category that never lights up, or a module whose segment
 * stays dormant after the reader signed it. Both are §1 failures, and neither
 * shows up in a typecheck or in a render.
 *
 * So the lists are checked against their sources — `CATEGORIES`, the corpus, and
 * `ROLE_IDS` — rather than against a transcription. Nothing here is a literal
 * count.
 *
 * The one asymmetry, and it is deliberate: **the segment rules cover all 32
 * modules and the step-tick rules cover only the 15 drawn ones.** A draft sheet
 * has no sign-off control (§12.4.1), so `hl-signed-16` can never be stamped —
 * but a segment for a draft sheet is still drawn (dashed, unfillable), and
 * writing its rule keeps the list uniform against the day the sheet is written.
 * A step tick for a draft would instead state that the sheet could be signed,
 * which is the claim §13.4.2 exists to prevent.
 */

const LOKUM_CSS = join(import.meta.dirname, '../../../src/app/lokum.css')

/** Comments stripped, so prose naming a selector is never counted as one. */
const css = readFileSync(LOKUM_CSS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ')

const facts = curriculumFacts()
const ALL_MODULES = facts.sheets.map((sheet) => sheet.module).sort((a, b) => a - b)
const DRAWN_MODULES = facts.sheets
  .filter((sheet) => sheet.drawn)
  .map((sheet) => sheet.module)
  .sort((a, b) => a - b)

/** Every distinct capture of `pattern` across the stylesheet, in order found. */
function captures(pattern: RegExp): string[] {
  return [...new Set([...css.matchAll(pattern)].map((match) => match[1]))]
}

describe('§13.1.3 — the hue carrier covers every category, and only real ones', () => {
  it('maps each category slug to its two tokens, once', () => {
    const carriers = captures(/\[data-cat="([a-z-]+)"\]\s*\{\s*--hl-cat:/g)
    expect(carriers.sort()).toEqual(CATEGORIES.map((category) => category.slug).sort())
  })

  it('declares a token pair for every category the carrier names', () => {
    for (const { slug } of CATEGORIES) {
      expect(css, slug).toContain(`--cat-${slug}:`)
      expect(css, slug).toContain(`--cat-${slug}-half:`)
    }
  })
})

describe('§13.1.2 — both aggregate states cover all six categories', () => {
  it.each(['started', 'complete'] as const)('hl-cat-…-%s names every category', (state) => {
    const named = captures(
      new RegExp(`html\\.hl-cat-([a-z-]+)-${state}\\s+\\.hl-cat-tint`, 'g'),
    )
    expect(named.sort()).toEqual(CATEGORIES.map((category) => category.slug).sort())
  })

  it.each(['started', 'complete'] as const)('the LKM-01 faces take %s for every category', (state) => {
    const named = captures(new RegExp(`html\\.hl-cat-([a-z-]+)-${state}\\s+\\.hl-face`, 'g'))
    expect(named.sort()).toEqual(CATEGORIES.map((category) => category.slug).sort())
  })
})

describe('§13.5 — the segment rules cover the whole corpus', () => {
    /**
   * The stylesheet lists the segment rule twice — once for colour and once
   * inside `@media (forced-colors: active)` — and the two lists are
   * deliberately different lengths, so they are counted separately. Splitting
   * on the media query is what makes "exactly once" a meaningful claim.
   */
  const FORCED_AT = css.search(/@media \(forced-colors: active\)/)
  const mainRules = css.slice(0, FORCED_AT)

  it('names every module in the corpus, exactly once', () => {
    const raw = [...mainRules.matchAll(/html\.hl-signed-(\d+)\s+\.hl-seg\[data-module=/g)]
      .map((match) => Number(match[1]))
    // `captures` de-dupes, so a module listed twice would pass the set
    // comparison silently. Compare the raw list, which cannot hide one.
    expect([...raw].sort((a, b) => a - b)).toEqual(ALL_MODULES)
  })

  it('repeats the same list under forced-colors, for the drawn sheets', () => {
    // The forced-colours block fills a signed segment with a system colour, so
    // "signed" survives as a difference in fill rather than in hue. It only
    // needs the signable modules; a draft segment has nothing to reveal.
    const forced = css.slice(css.search(/@media \(forced-colors: active\)/))
    const named = [...forced.matchAll(/html\.hl-signed-(\d+)\s+\.hl-seg\[data-module=/g)]
      .map((match) => Number(match[1]))
      .sort((a, b) => a - b)
    expect(named).toEqual(DRAWN_MODULES)
  })
})

describe('§13.4.2 — a step tick exists only for a sheet that can be signed', () => {
  it('covers the drawn modules and stops there', () => {
    const named = captures(/html\.hl-signed-(\d+)\s+\.hl-step\[data-module="\d+"\]\s+\.hl-step-tick/g)
      .map(Number)
      .sort((a, b) => a - b)
    expect(named).toEqual(DRAWN_MODULES)
  })

  it('pairs each selector’s two module numbers', () => {
    // `html.hl-signed-13 .hl-step[data-module="13"]` — a mismatch here would
    // light up a different step than the one that was signed, which is the
    // worst kind of quiet defect: plausible, and wrong.
    const mismatched = [
      ...css.matchAll(/html\.hl-signed-(\d+)\s+\.hl-(?:seg|step)\[data-module="(\d+)"\]/g),
    ]
      .filter((match) => match[1] !== match[2])
      .map((match) => `${match[1]} → ${match[2]}`)
    expect(mismatched).toEqual([])
  })
})

describe('§13.4.3 — the path shows exactly one body', () => {
  it('names all nine roles in the reveal rule', () => {
    const named = captures(/html\.hl-role-([a-z-]+)\s+\.hl-path-body/g)
    expect(named.sort()).toEqual([...ROLE_IDS].sort())
  })

  /**
   * The empty state is shown by negating every role at once. A role missing
   * from that chain would show the empty state AND that role's path together —
   * two contradictory answers on one screen (§1).
   */
  it('negates all nine roles in the empty-state rule', () => {
    const chain = /html((?::not\(\.hl-role-[a-z-]+\))+)\s+\.hl-path-empty/.exec(css)
    expect(chain).not.toBeNull()
    const negated = [...(chain?.[1] ?? '').matchAll(/\.hl-role-([a-z-]+)/g)].map((m) => m[1])
    expect(negated.sort()).toEqual([...ROLE_IDS].sort())
  })
})

describe('§13.1.3 — no hue escapes the closed list of surfaces', () => {
  /**
   * `--hl-tint` and `--hl-cat` are the only two ways a category hue can be
   * painted, so every rule that reads one is a surface on §13.1.3's list. The
   * list is closed; a new consumer means either a new entry in the spec or a
   * hue somewhere it does not belong.
   */
  const PERMITTED = new Set([
    'hl-seg',           // the segmented meter (2, 5)
    'hl-cat-rule',      // a category card's leading rule (2)
    'hl-row',           // a module row's leading rule (3)
    'hl-band-tint',     // a category page's header band (4)
    'hl-step',          // a path step's leading rule (6)
    'hl-face',          // an LKM-01 face (1)
    'hl-legend-swatch', // the face legend's swatch
    'hl-cat-tint',      // the carrier itself
  ])

  it('paints only from classes the spec lists', () => {
    const consumers = new Set<string>()
    // Each rule block: everything before `{`, then the declarations.
    for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const [, selector, body] = match
      if (!/var\(--hl-(?:tint|cat)/.test(body)) continue
      // Drop the channel-A state classes first. `html.hl-signed-13` and
      // `html.hl-cat-expert-complete` sit on the root element and select a
      // reader's state; they are not the surface being painted, and counting
      // them would list all 47 of them as rogue consumers.
      const target = selector.replace(/html(?:\.[a-z0-9-]+|:not\([^)]*\))*/g, ' ')
      for (const klass of target.matchAll(/\.(hl-[a-z0-9-]+)/g)) consumers.add(klass[1])
    }
    const unexpected = [...consumers].filter((klass) => !PERMITTED.has(klass))
    expect(unexpected).toEqual([])
  })
})
