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

import { carriesNothing, type RecordData } from './schema'
import { type Track, isTrack, trackOfPath } from '../tracks'

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
  /**
   * The custom properties, for the one reading CSS cannot derive for itself.
   * Optional so a caller with no need for it — and every existing test —
   * stays valid; `stampRecordState` skips the progress half when it is absent.
   */
  style?: {
    setProperty(name: string, value: string): void
    removeProperty(name: string): void
  }
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
 */
const OWNED = /^hl-(?:e-)?(?:signed-\d+|cat-[a-z0-9-]+-(?:started|complete))$/

/**
 * The class set a record implies. Sorted, so two callers comparing results —
 * and the cross-test — are comparing sets rather than insertion orders.
 */
/**
 * D91 — each track's classes carry their own prefix: `hl-signed-<n>` and
 * `hl-cat-…` for For Engineers, `hl-e-signed-<n>` and `hl-e-cat-…` for For
 * Everyone. Both are stamped every time, so a page that shows both tracks (the
 * progress page) is right in frame one; `data-track` regions pick one.
 */
const STAMP_PREFIX: Readonly<Record<Track, string>> = { engineers: 'hl-', everyone: 'hl-e-' }

function classesOf(
  sheets: RecordData['sheets'],
  facts: StampFacts,
  prefix: string,
): string[] {
  const counts = new Map<string, number>()
  const classes: string[] = []
  for (const [slug, sheet] of Object.entries(sheets)) {
    if (sheet.signedOff === null || sheet.signedOff === undefined) continue
    const cut = slug.indexOf('/')
    if (cut > 0) {
      const category = slug.slice(0, cut)
      counts.set(category, (counts.get(category) ?? 0) + 1)
    }
    const module = facts.slugToModule[slug]
    if (typeof module === 'number') classes.push(`${prefix}signed-${module}`)
  }
  for (const [category, approved] of counts) {
    const total = facts.categoryTotals[category] ?? 0
    classes.push(`${prefix}cat-${category}-${total > 0 && approved >= total ? 'complete' : 'started'}`)
  }
  return classes
}

export function stampClassesFor(data: RecordData, facts: StampFacts): string[] {
  return [
    ...classesOf(data.sheets, facts, STAMP_PREFIX.engineers),
    ...classesOf(data.everyoneSheets ?? {}, facts, STAMP_PREFIX.everyone),
  ].sort()
}

export function progressProperty(category: string, track: Track = 'engineers'): string {
  return `--bz-${track === 'everyone' ? 'e' : ''}done-${category}`
}

/**
 * The one reading channel A carries as a NUMBER rather than as a class.
 *
 * `CategoryMeter` states the constraint this works around: "a bar's length is a
 * computed number and a computed number cannot reach CSS on channel A". That is
 * true of CSS, which cannot count — and it is not true of the channel, because
 * the channel is a blocking script that runs before first paint and has the
 * counts in hand already. So the arithmetic happens where arithmetic can, and
 * what reaches CSS is a percentage it only has to substitute.
 *
 * It is what lets `05`-C's dial exist at all. A `conic-gradient` stop is a
 * length, so a ring showing how far a reader has come needs a number in the
 * cascade in frame one; the segmented meter needed none, which is why the meter
 * could be built before this and the dial could not. Doing it on channel B
 * instead would put a frame-one-visible mark on the channel §12.2 forbids for
 * exactly that.
 *
 * Percentages and not fractions, because that is what a gradient stop takes.
 * Rounded to a whole number: a ring is read at a glance and half a percent of
 * 360° is 1.8°, which no reader can see and every re-render would recompute.
 */
export function stampProgressFor(
  data: RecordData,
  facts: StampFacts,
): Record<string, string> {
  const properties: Record<string, string> = {}
  for (const track of ['engineers', 'everyone'] as const) {
    const counts = new Map<string, number>()
    const sheets = track === 'everyone' ? (data.everyoneSheets ?? {}) : data.sheets
    for (const [slug, sheet] of Object.entries(sheets)) {
      if (sheet.signedOff === null || sheet.signedOff === undefined) continue
      const cut = slug.indexOf('/')
      if (cut > 0) {
        const category = slug.slice(0, cut)
        counts.set(category, (counts.get(category) ?? 0) + 1)
      }
    }
    for (const [category, approved] of counts) {
      const total = facts.categoryTotals[category] ?? 0
      if (total <= 0) continue
      properties[progressProperty(category, track)] = `${Math.round((approved / total) * 100)}%`
    }
  }
  return properties
}

/**
 * D91 — the track the bar shows: the page's own, or on a page that belongs to
 * neither track the one the reader last opened, or For Engineers.
 */
export function currentTrack(pathname: string, data: RecordData): Track {
  return trackOfPath(pathname) ?? (isTrack(data.prefs.track) ? data.prefs.track : 'engineers')
}

/** The attribute the bar's switch and the progress page's tabs read in frame one. */
export const TRACK_ATTR = 'data-bz-track'

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

  /*
    The progress properties, with the same removal half and for the same
    reason: un-signing the only completed module in a level has to take its
    percentage off, or the ring keeps reporting progress the reader has
    withdrawn. Every category is cleared and only the true ones re-set, which
    is cheaper than reading the current value back and is the same shape as the
    class pass above.
  */
  if (root.style !== undefined) {
    const progress = stampProgressFor(data, facts)
    for (const category of Object.keys(facts.categoryTotals)) {
      for (const track of ['engineers', 'everyone'] as const) {
        const name = progressProperty(category, track)
        const value = progress[name]
        if (value === undefined) root.style.removeProperty(name)
        else root.style.setProperty(name, value)
      }
    }
  }

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
