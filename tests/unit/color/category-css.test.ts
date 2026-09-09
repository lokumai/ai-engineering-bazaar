import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { curriculumFacts } from '@/lib/content/facts'
import { render } from '../../../scripts/curriculum-css.mjs'

/**
 * The generated per-module selector lists, checked for completeness.
 *
 * Channel A cannot loop. Every state rule is a LIST of selectors, one per
 * module, and a list is the one thing in this system that a renumber or a newly
 * written module silently invalidates. The failure is not a crash: it is a
 * module whose mark stays dark after the reader completed it. That shows up in
 * no typecheck and in no render.
 *
 * So the lists are checked against their source, the corpus, rather than
 * against a transcription. Nothing here is a literal count. And because the
 * file is **generated and committed** — `prebuild` writes it, vitest and
 * playwright never run `prebuild` — the last case runs the generator and
 * compares, which is the one check the others cannot make for themselves.
 *
 * ## What M16 moved out of this file
 *
 * It used to read `lokum.css` and `rail.css` too, and hold four more groups of
 * rules: the `[data-cat]` hue carrier, the two aggregate category states on the
 * tint and on the LKM-01 faces, the nine-role path reveal, and the closed list
 * of surfaces permitted to paint a category hue. Those three stylesheets were
 * deleted with the rest of the old interface, and the rules belong to the
 * surfaces that re-author them — so they live in
 * `tests/unit/color/category-surfaces.test.ts` now, each one binding from the
 * moment its surface exists. Splitting them keeps this file about the one thing
 * it can check today without waiting for a surface.
 *
 * The one asymmetry here is deliberate: **the segment rules cover every module
 * and the tick lists cover only the written ones.** A draft module has no
 * completion control (§12.4.1), so `hl-signed-<n>` can never be stamped for
 * one — but a segment for a draft is still drawn, dashed and unfillable, and
 * writing its rule keeps the list uniform against the day the module is
 * written. A tick for a draft would instead state that it could be completed,
 * which is the claim §13.4.2 exists to prevent.
 */

const MODULES_CSS = join(import.meta.dirname, '../../../src/app/lokum-modules.css')

/**
 * The generated sheet alone. It is the whole subject now: every selector these
 * rules are about is emitted by the generator, so reading anything else would
 * only add places for the pattern to match something it did not mean.
 */
const raw = readFileSync(MODULES_CSS, 'utf8')

/** Comments stripped, so prose naming a selector is never counted as one. */
const css = raw.replace(/\/\*[\s\S]*?\*\//g, ' ')

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
    const raw = [...mainRules.matchAll(/html\.hl-signed-(\d+)\s+\.bz-seg\[data-module=/g)]
      .map((match) => Number(match[1]))
    // `captures` de-dupes, so a module listed twice would pass the set
    // comparison silently. Compare the raw list, which cannot hide one.
    expect([...raw].sort((a, b) => a - b)).toEqual(ALL_MODULES)
  })

  it('repeats the same list under forced-colors, for the ready modules', () => {
    // The forced-colours block fills a signed segment with a system colour, so
    // "signed" survives as a difference in fill rather than in hue. It only
    // needs the signable modules; a draft segment has nothing to reveal.
    const forced = css.slice(css.search(/@media \(forced-colors: active\)/))
    const named = [...forced.matchAll(/html\.hl-signed-(\d+)\s+\.bz-seg\[data-module=/g)]
      .map((match) => Number(match[1]))
      .sort((a, b) => a - b)
    expect(named).toEqual(DRAWN_MODULES)
  })
})

describe('§13.4.2 — a step tick exists only for a module that can be signed', () => {
  it('covers the ready modules and stops there', () => {
    const named = captures(/html\.hl-signed-(\d+)\s+\.bz-step\[data-module="\d+"\]\s+\.bz-step-tick/g)
      .map(Number)
      .sort((a, b) => a - b)
    expect(named).toEqual(DRAWN_MODULES)
  })

  it('pairs each selector’s two module numbers', () => {
    // `html.hl-signed-13 .bz-step[data-module="13"]` — a mismatch here would
    // light up a different step than the one that was signed, which is the
    // worst kind of quiet defect: plausible, and wrong.
    const mismatched = [
      ...css.matchAll(/html\.hl-signed-(\d+)\s+\.bz-(?:seg|step|mod|cmod)\[data-module="(\d+)"\]/g),
    ]
      .filter((match) => match[1] !== match[2])
      .map((match) => `${match[1]} → ${match[2]}`)
    expect(mismatched).toEqual([])
  })
})

describe('M10 — the curriculum rail’s tick covers every module that can be completed', () => {
  it('covers the ready modules and stops there', () => {
    const named = captures(
      /html\.hl-signed-(\d+)\s+\.bz-mod\[data-module="\d+"\]\s+\.bz-mod-mark/g,
    )
      .map(Number)
      .sort((a, b) => a - b)
    expect(named).toEqual(DRAWN_MODULES)
  })

  /**
   * The same asymmetry the step tick has, and for the same reason: a draft
   * module has no completion control (§12.4.1), so `hl-signed-<n>` can never be
   * stamped for one. A rule that could light up would state that it could be
   * completed, which is the claim §13.4.2 exists to prevent.
   */
  it('names no module the corpus has not written', () => {
    const named = captures(
      /html\.hl-signed-(\d+)\s+\.bz-mod\[data-module="\d+"\]\s+\.bz-mod-mark/g,
    ).map(Number)
    for (const module of named) expect(DRAWN_MODULES).toContain(module)
  })
})

describe('M13 — control C’s tick covers every module that can be completed', () => {
  it('covers the ready modules and stops there', () => {
    const named = captures(
      /html\.hl-signed-(\d+)\s+\.bz-cmod\[data-module="\d+"\]\s+\.bz-cmod-mark/g,
    )
      .map(Number)
      .sort((a, b) => a - b)
    expect(named).toEqual(DRAWN_MODULES)
  })

  /**
   * The same asymmetry the rail's tick has: a draft module has no completion
   * control at all (§12.4.1), so `hl-signed-<n>` can never be stamped for one,
   * and a rule that could light up would state that it could be completed.
   * Control C renders no toggle for a draft for the same reason.
   */
  it('names no module the corpus has not written', () => {
    const named = captures(
      /html\.hl-signed-(\d+)\s+\.bz-cmod\[data-module="\d+"\]\s+\.bz-cmod-mark/g,
    ).map(Number)
    for (const module of named) expect(DRAWN_MODULES).toContain(module)
  })
})

describe('the generated module selectors are the committed ones', () => {
  /**
   * The check that keeps a committed generated file honest. `prebuild`
   * regenerates it, but vitest and playwright do not run `prebuild`, so the
   * file has to be in the repository — and a file in the repository can drift
   * from the thing that generates it. Nothing else in this file would notice:
   * the lists would still be complete, just complete for yesterday's
   * curriculum.
   */
  it('matches what the generator produces from curriculum.yaml today', () => {
    expect(readFileSync(MODULES_CSS, 'utf8')).toBe(render())
  })
})
