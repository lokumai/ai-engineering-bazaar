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
 * in one session and the footer readout correctly says `02/33` while `<html>`
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

import { carriesNothing, ROLE_IDS, type RecordData } from './schema'

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

/**
 * The prefixes this module owns. Anything else on `<html>` is left alone.
 *
 * `role-` joined the set with §13.3. It has to be owned, or a reader who
 * changes role would carry both classes and `/path/` would draw two paths at
 * once — the removal half of `stampRecordState` is the only thing that takes the
 * previous one off.
 */
const OWNED = /^hl-(?:signed-\d+|cat-[a-z0-9-]+-(?:started|complete)|role-[a-z-]+)$/

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

  // §13.3 — checked against the frozen nine rather than trusted from the type.
  // The record reaching this function has been through `coerceRecordData` and
  // cannot hold a stranger, but the boot script re-derives the same set from raw
  // storage and has to check; validating in both keeps the cross-test comparing
  // one rule instead of two, and a retired id then draws nothing on either side
  // rather than a class no stylesheet answers to.
  const role = data.identity.role
  if (role !== null && ROLE_IDS.includes(role)) classes.push(`hl-role-${role}`)

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

  // `data-hl-storage` is deliberately NOT touched here. It is an answer only the
  // boot script can give: whether the READ threw, at load, in this document.
  //
  // `data-hl-record` is set here and NEVER REMOVED, and the asymmetry is the
  // whole of it. See `RECORD_ATTR` below.
  if (!carriesNothing(data)) root.setAttribute(RECORD_ATTR, '1')
}

/**
 * Why the record attribute goes ON here and never comes OFF.
 *
 * **The removal half stays with the load, for §12.13.** `data-hl-record`
 * separates empty-state class 1 from class 2: a fresh browser has no attribute
 * at all and reads as NEVER STARTED, while a reader who erased their record
 * keeps the `1` the load stamped and correctly reads as CLEARED BY YOU.
 * Recomputing the attribute from the live record — setting AND clearing —
 * collapses the two, because an erased record and a never-started one look
 * identical from the inside and only the load can tell them apart. That is why
 * this function did not touch the attribute at all.
 *
 * **But the addition half was never covered by that reason, and §15 made its
 * absence reader-visible.** Before the home screen, this attribute drove only
 * §12.13's copy, where being one load out of date costs nothing. §15.2.1 hung
 * the entire choice between the home screen's two halves on it (`app/home.css`),
 * and every navigation on this site is a client transition — so a reader who
 * arrived with no record, saved an alias or signed off a sheet, and then pressed
 * Home was shown the first-visit document and told they were new here. MEASURED
 * in Chrome: `data-hl-record` absent, `.hl-home-new` visible, and correct only
 * after a full reload.
 *
 * Setting it one-way fixes that and cannot collapse §12.13's two classes: the
 * attribute only ever appears for a record that carries something, and an erase
 * leaves it exactly where the old reasoning wanted it — present, because this
 * browser did once hold a record.
 */
const RECORD_ATTR = 'data-hl-record'
