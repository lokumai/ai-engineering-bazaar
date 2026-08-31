/**
 * §12.2 Channel A — keeping the stamps true after first paint.
 *
 * `boot.ts` stamps `<html>` before the first frame and that is the whole point
 * of it: the mascot's six faces and every tick gauge are drawn by CSS from those
 * classes, so they are correct with no React and nothing to hydrate.
 *
 * But it runs **once**. Every navigation on this site is a client transition —
 * `next/link` does not reload the document — so a reader who signs a sheet off
 * and keeps reading would carry the boot script's stale answer for the whole
 * session. MEASURED, in Chrome, before this module existed: sign off two sheets
 * in one session and the footer readout correctly says `02/32` while `<html>`
 * still says `hl-signed-13` alone. A mascot showing "intermediate started" to a
 * reader who has since started fundamentals is a page claiming a state that is
 * not true of them right now, which is the one thing §1 forbids outright.
 *
 * So this is the same derivation as a callable function, and the store applies
 * it after every write. Boot script for frame one; this for every frame after.
 *
 * **Two implementations of one rule is a drift risk, so they are cross-tested.**
 * `tests/unit/record/stamp.test.ts` runs the emitted boot-script string against
 * a fake root and asserts it produces exactly the class set this function does,
 * for the same record. Neither is the other's copy; both answer to the test.
 *
 * The port shape (`StampRoot`) is the `ThemeRoot` pattern from `lib/theme.ts` —
 * the minimal slice of `<html>` this touches, so it is testable in node with no
 * DOM at all.
 */

import { type RecordData } from './schema'

/** The slice of `<html>` the stamps touch. */
export interface StampRoot {
  classList: {
    add(token: string): void
    remove(token: string): void
    forEach?(callback: (token: string) => void): void
  }
  setAttribute(name: string, value: string): void
  /** Every class currently on the element, so the stale ones can be removed. */
  readonly className: string
}

/** The build-time maps the derivation cannot do without (§11.25). */
export interface StampFacts {
  /** Sheets per category slug, drawn or not — the `-complete` denominator. */
  categoryTotals: Readonly<Record<string, number>>
  /** The module number each slug prints as, for `hl-signed-<n>`. */
  slugToModule: Readonly<Record<string, number>>
}

/** The prefixes this module owns. Anything else on `<html>` is left alone. */
const OWNED = /^hl-(?:signed-\d+|cat-[a-z0-9-]+-(?:started|complete))$/

/**
 * The class set a record implies. Sorted, so two callers comparing results —
 * and the cross-test — are comparing sets rather than insertion orders.
 */
export function stampClassesFor(data: RecordData, facts: StampFacts): string[] {
  const counts = new Map<string, number>()
  const classes: string[] = []

  for (const [slug, sheet] of Object.entries(data.sheets)) {
    if (sheet.signedOff === null || sheet.signedOff === undefined) continue

    // The category is the slug's own first segment, which is why identity is
    // the slug: no second map is needed and no number can drift.
    const cut = slug.indexOf('/')
    if (cut > 0) {
      const category = slug.slice(0, cut)
      counts.set(category, (counts.get(category) ?? 0) + 1)
    }

    const module = facts.slugToModule[slug]
    if (typeof module === 'number') classes.push(`hl-signed-${module}`)
  }

  for (const [category, approved] of counts) {
    const total = facts.categoryTotals[category] ?? 0
    // `-complete` needs a real total. With none, the honest answer is that the
    // subsystem is under way, not that it is finished.
    classes.push(`hl-cat-${category}-${total > 0 && approved >= total ? 'complete' : 'started'}`)
  }

  return classes.sort()
}

/**
 * Apply the stamps, removing the ones that are no longer true.
 *
 * Removal is the half a boot script never needs and this function always does:
 * un-signing a sheet has to take its class off, or the mark keeps claiming a
 * sign-off the reader has withdrawn.
 */
export function stampRecordState(
  root: StampRoot,
  data: RecordData,
  facts: StampFacts,
): void {
  const wanted = new Set(stampClassesFor(data, facts))

  for (const token of root.className.split(/\s+/)) {
    if (token !== '' && OWNED.test(token) && !wanted.has(token)) root.classList.remove(token)
  }
  for (const token of wanted) root.classList.add(token)

  // `data-hl-record` and `data-hl-storage` are deliberately NOT touched here.
  //
  // Both are answers only the boot script can give, because both are about what
  // was in storage when the document loaded rather than what is in the record
  // now. `data-hl-storage` needs to know whether the READ threw. And
  // `data-hl-record` is what separates §12.13's empty-state class 1 from class
  // 2: a fresh browser has no attribute at all and reads as NEVER STARTED,
  // while a reader who erased their record keeps the `1` the load stamped and
  // correctly reads as CLEARED BY YOU. Recomputing it from the live record
  // would collapse the two — an erased record and a never-started one look
  // identical from the inside, and only the load can tell them apart.
}
