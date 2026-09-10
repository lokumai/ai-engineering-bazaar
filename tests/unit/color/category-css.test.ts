import { readFileSync, readdirSync } from 'node:fs'
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
const SOURCE = join(import.meta.dirname, '../../../src')

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
      ...css.matchAll(/html\.hl-signed-(\d+)\s+\.bz-(?:seg|step|item|cmod)\[data-module="(\d+)"\]/g),
    ]
      .filter((match) => match[1] !== match[2])
      .map((match) => `${match[1]} → ${match[2]}`)
    expect(mismatched).toEqual([])
  })
})

describe('M10 — the curriculum rail’s tick covers every module that can be completed', () => {
  it('covers the ready modules and stops there', () => {
    const named = captures(
      /html\.hl-signed-(\d+)\s+\.bz-item\[data-module="\d+"\]\s+\.bz-tick/g,
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
      /html\.hl-signed-(\d+)\s+\.bz-item\[data-module="\d+"\]\s+\.bz-tick/g,
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

/**
 * Every class the generated sheet names, checked against the markup.
 *
 * THE MIRROR IMAGE OF A DEAD TOKEN. `styling-references.test.ts` exists because
 * a Tailwind utility named after a deleted token emits nothing at all, with no
 * error and no warning. This is the same failure pointing the other way: a
 * selector naming a class no component carries matches nothing, fails no build,
 * and simply does not draw. Nothing above would notice — the lists would still
 * be complete, still keyed on the right module numbers, and still inert.
 *
 * The file's own comment predicted it. Group D says: "Stage 0 changed this
 * file's prefix and left its names, so for one commit the generator revealed a
 * selector no markup carried." That commit's state is still in force for four
 * of the five groups, which is why the reader who completes a module on the
 * home page sees every tick light up rather than theirs.
 *
 * The exemption list is the project's usual shape — `DELIBERATELY_ABSENT`,
 * `WITHOUT_REFERENCE`, `NARROW_DEVIATIONS` — an entry per known gap, each
 * stating a reason, plus a staleness case that fails when an entry has stopped
 * being true. A silent exemption hides the next one.
 */
describe('the generated selectors name classes that markup actually carries', () => {
  /**
   * Classes the generator names that no component emits yet, and why.
   *
   * EMPTY, as of M16 stage 8, and that is the point of the two cases below
   * rather than a reason to delete the registry: all five groups are live now,
   * and the next curriculum change that adds a group gets a reason written
   * down instead of a selector that quietly draws nothing.
   */
  const NOT_YET_CARRIED: Readonly<Record<string, string>> = {}

  const generated = readFileSync(MODULES_CSS, 'utf8')
  const named = [...new Set([...generated.matchAll(/\.(bz-[a-z0-9-]+)/g)].map((m) => m[1]))].sort()

  /** Every class name any component puts in a `className`, anywhere in `src/`. */
  const carried = (() => {
    const found = new Set<string>()
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (/\.tsx?$/.test(entry.name)) {
          const source = readFileSync(full, 'utf8')
          for (const attribute of source.matchAll(
            /className\s*=\s*(?:"([^"]*)"|\{([^}]*)\})/g,
          )) {
            const value = attribute[1] ?? attribute[2] ?? ''
            for (const token of value.matchAll(/\b(bz-[a-z0-9-]+)/g)) found.add(token[1])
          }
        }
      }
    }
    walk(SOURCE)
    return found
  })()

  it('finds classes in the generated sheet at all', () => {
    // A comparison of two empty sets passes. If the extraction above breaks,
    // every case below reports green against nothing.
    expect(named.length).toBeGreaterThan(4)
    expect(carried.size).toBeGreaterThan(20)
  })

  it('names nothing that no component carries', () => {
    const missing = named.filter(
      (name) => !carried.has(name) && !(name in NOT_YET_CARRIED),
    )
    expect(missing, 'generated selectors that can never match').toEqual([])
  })

  it('carries no stale exemption', () => {
    // The half that makes the list above safe. An entry that has started being
    // carried is an entry nobody removed, and the next real gap hides behind it.
    const stale = Object.keys(NOT_YET_CARRIED).filter((name) => carried.has(name))
    expect(stale, 'exempted, but the markup carries it now — delete the entry').toEqual([])
  })

  it('exempts nothing the generator does not name', () => {
    const unknown = Object.keys(NOT_YET_CARRIED).filter((name) => !named.includes(name))
    expect(unknown, 'exempted, but the generator never names it').toEqual([])
  })

  it('gives every exemption a reason', () => {
    for (const [name, why] of Object.entries(NOT_YET_CARRIED)) {
      expect(why.length, `${name} is exempted with no reason`).toBeGreaterThan(40)
    }
  })
})

/**
 * EVERY TOKEN THE GENERATED SHEET SPENDS MUST RESOLVE, and until 2026-09-10 no
 * test in the project read one.
 *
 * This file is excluded by name from all three of the guards that read `var()`s
 * — `surface-stylesheets.test.ts` and `styling-references.test.ts` skip it as
 * not-a-surface, and everything above here reads SELECTORS. The exclusions are
 * right: the sheet is generated, and it is allowed to state colours and states
 * a surface may not. But "not held to the surface discipline" was taken to mean
 * "not read at all", and the gap had a defect sitting in it.
 *
 * MEASURED: group B revealed a signed-off step and set
 * `color: var(--color-accent-ink)` — a token of the RETIRED palette, declared
 * by no theme and by no surface. An undeclared custom property is invalid at
 * computed-value time, so `color` became `unset`, which for an inherited
 * property means `inherit`: the word took the step's body ink instead of the
 * teal `progress.css` gives it. No error, no warning, nothing red. It is the
 * same failure as a Tailwind utility named after a deleted token, in the one
 * file nobody was reading.
 *
 * The fix was to delete the declaration rather than repoint it — the generated
 * sheet's job is WHICH module is revealed, and what the revealed thing looks
 * like belongs to the surface, which is how group D was already divided. This
 * check is the half that keeps it fixed.
 */
describe('every token the generated sheet spends', () => {
  /** Declared anywhere the site loads: the language, or any surface. */
  const DECLARED: ReadonlySet<string> = new Set([
    ...readFileSync(join(import.meta.dirname, '../../../src/design/bazaar.css'), 'utf8')
      .matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm),
    ...readdirSync(join(import.meta.dirname, '../../../src/app'))
      .filter((name) => name.endsWith('.css'))
      .flatMap((name) => [
        ...readFileSync(join(import.meta.dirname, '../../../src/app', name), 'utf8')
          .matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm),
      ]),
  ].map((match) => match[1]))

  /**
   * `--bz-cat` is the exception and it is not a hole: it is a RUNTIME binding,
   * resolved from the segment's own `data-cat` by the surface that draws it, so
   * the category never appears in this file. The generator says so where it
   * emits group A. It is declared by `category.css`, which is why it resolves.
   */
  const referenced = [...css.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((match) => match[1])

  it('is a real reading, not an empty one', () => {
    expect(DECLARED.size, 'no tokens found in the language or the surfaces').toBeGreaterThan(40)
    expect(referenced.length, 'no var() found in the generated sheet').toBeGreaterThan(0)
  })

  it('resolves against the language or a surface', () => {
    const silent = [...new Set(referenced)].filter((name) => !DECLARED.has(name)).sort()
    expect(silent, 'referenced by the generated sheet and declared nowhere').toEqual([])
  })
})
