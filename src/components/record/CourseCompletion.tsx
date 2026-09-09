'use client'

import Link from 'next/link'
import { CategoryMeter, type MeterSheet } from '@/components/course/CategoryMeter'
import { CategoryTally } from '@/components/course/CategoryTally'
import type { CategorySlug } from '@/lib/content/categories'
import { toggleCompletion } from '@/lib/record/complete'
import {
  readingMinutes,
  signedCount,
  uptime,
  type CurriculumFacts,
} from '@/lib/record/derive'
import { nowIso, useHydrated, useRecord } from '@/lib/record/store'
import { hoursMinutes, plural } from '@/lib/text'

/**
 * D14 — COMPLETION CONTROL C: the whole course, visible and adjustable.
 *
 * The author's split: *"A at the end of a module, because the reader wants one
 * button there, and C on the home and progress pages."* D14 records why the two
 * surfaces get different controls — at the end of a module the reader has one
 * thing to say; on the home and progress pages they are looking at
 * thirty-three modules at once and want to see and adjust state without
 * opening anything.
 *
 * ## What C is, and the one place it departs from the mock
 *
 * The playground's option C drew a conic-gradient RING per level. **This draws
 * the segmented meter instead, and that is a measurement rather than a
 * preference.** A ring's fill is a computed fraction, a computed fraction
 * cannot reach CSS on channel A, and §12.2's rule is that a mark a reader sees
 * in frame one may not travel on channel B — so a ring would be empty in the
 * first frame of every load for exactly the readers who have progress, which is
 * the flash of an empty record M13's acceptance criteria forbid by name. The
 * meter carries the same reading with no arithmetic at all (one segment per
 * module, filled by the class the boot script stamped) and says more than a
 * ring can: WHICH modules, not just how many. `logs/BRAINSTORM.md` D23 has the
 * decision. Everything else about C is here — the per-level picture, the three
 * numbers that mean something, and the jargon gone.
 *
 * ## The two channels, and which mark is on which
 *
 * **Channel A, correct in frame one, no React:** every tick, and every segment
 * of every meter. The tick is the same 17px teal disc the curriculum rail
 * draws, revealed by one generated selector per module
 * (`scripts/curriculum-css.mjs`, list E), and it carries the word `Complete`
 * inside it for a screen reader — revealed by the same rule, so the disc and
 * the sentence cannot disagree.
 *
 * **Channel B, after mount:** every count. `4 of 33`, `2 h 10 m`, `6 days` and
 * each meter's `n/total` are arithmetic over the record, CSS has no arithmetic,
 * and each prints `--` until the store has answered — which is the true
 * statement that no record has been read yet and never a zero somebody
 * invented (§11.25). `aria-pressed` on the toggle is on this channel too, and
 * it is an attribute rather than a picture: the reader sees the right tick in
 * frame one either way.
 *
 * ## The toggle
 *
 * One button per module, and it writes through `toggleCompletion` — the shared
 * path control A also takes, because the first completion on a record is three
 * writes and not one (`lib/record/complete.ts`). It is a button beside the
 * module's own link rather than a link that toggles: two actions, two controls,
 * and the row is not a single ambiguous target.
 *
 * **A planned module has no toggle at all** — absent, not disabled (§12.4.1).
 * It cannot be completed, so a control for it would offer a state no reader can
 * reach, and every denominator on the site counts it the same way: in.
 *
 * **It deliberately does NOT carry `SIGN_OFF_ATTR`.** §12.16's `s` shortcut
 * clicks that attribute, and thirty-three of them on one page would let one
 * keystroke complete whichever module happened to be first in the document.
 * The manifest's completion column makes the same call for the same reason.
 */

/** `--` is the instrument convention for "no reading", and it is true. */
const NO_READING = '--'

/** One module, as control C needs it. Measured by the page (§12.2). */
export interface CompletionModule {
  slug: string
  module: number
  title: string
  path: string
  /** `status: ready`. A planned module gets a row and no control (§12.4.1). */
  drawn: boolean
}

/** One level, in curriculum order, with every module in it. */
export interface CompletionLevel {
  slug: CategorySlug
  title: string
  order: number
  modules: readonly CompletionModule[]
}

function Tick() {
  return (
    <span className="hl-cmod-mark">
      <svg
        viewBox="0 0 17 17"
        width="11"
        height="11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="hl-cmod-check"
      >
        <path d="M3.5 9l3 3 7-7" />
      </svg>
    </span>
  )
}

export function CourseCompletion({
  facts,
  levels,
  headingId,
}: {
  /** `curriculumFacts()`, for the three counts. Measured by the page (§12.2). */
  facts: CurriculumFacts
  levels: readonly CompletionLevel[]
  /** The id of the heading this control is labelled by. */
  headingId: string
}) {
  const record = useRecord()
  const hydrated = useHydrated()

  const counts = signedCount(record, facts)
  const minutes = readingMinutes(record, facts)
  /**
   * The clock is read only once the store has answered, which is after the
   * hydration commit and never in the first client render — which has to match
   * the server's. UTC, the basis `store.ts` writes days in, so the reading
   * cannot change on a flight.
   */
  const streak = hydrated ? uptime(record, nowIso().slice(0, 10)).streak : null

  return (
    <section className="hl-cc" aria-labelledby={headingId}>
      {/* O2's answer, in three readings. `XP`, `Rank` and `I at 8` are gone
          because nobody could name the question they answered; what is left is
          three quantities a reader already thinks in. Each is derived, each
          prints `--` until the store has answered, and each has exactly one
          implementation in `lib/record/derive.ts`. */}
      <dl className="hl-cc-numbers">
        <div>
          <dt>Modules completed</dt>
          <dd>
            <span className="hl-cc-value">
              {hydrated ? counts.signed : NO_READING}
            </span>{' '}
            of {counts.of}
          </dd>
        </div>
        <div>
          <dt>Reading time</dt>
          <dd>
            <span className="hl-cc-value">
              {hydrated ? hoursMinutes(minutes.done) : NO_READING}
            </span>{' '}
            of {hoursMinutes(minutes.of)}
          </dd>
        </div>
        <div>
          <dt>Days in a row</dt>
          <dd>
            <span className="hl-cc-value">{streak === null ? NO_READING : streak}</span>{' '}
            {streak === 1 ? 'day' : 'days'}
          </dd>
        </div>
      </dl>

      {/* The reading time is the modules' own estimate and says so once, here,
          rather than beside the number where it would read as a hedge. */}
      <p className="hl-cc-note">
        Reading time is what the completed modules themselves declare, added up.
        Nothing here measures how long you spent on a page.
      </p>

      <ul className="hl-cc-levels">
        {levels.map((level) => {
          const ready = level.modules.filter((one) => one.drawn)
          const meterSheets: readonly MeterSheet[] = level.modules.map((one) => ({
            module: one.module,
            drawn: one.drawn,
          }))

          return (
            <li key={level.slug} className="hl-cc-level" data-cat={level.slug}>
              <div className="hl-cc-head">
                <h3 className="hl-cc-title">
                  <span className="hl-cc-order">
                    {String(level.order).padStart(2, '0')}
                  </span>
                  {level.title}
                </h3>
                {/* The level is told apart by its name, its number, its count
                    and its hue — four signals, of which colour is one
                    (SC 1.4.1, §13.1.4). */}
                <p className="hl-cc-count">
                  {ready.length === level.modules.length
                    ? plural(level.modules.length, 'module')
                    : `${plural(level.modules.length, 'module')} · ${ready.length} ready`}
                </p>
              </div>

              {/* Channel A for the segments, channel B for the `n/total`
                  underneath — `CategoryMeter` writes the contract and
                  `CategoryTally` fills every cell on the page after mount. One
                  implementation of the meter, here and on the catalog's
                  listings both. */}
              <CategoryMeter category={level.slug} sheets={meterSheets} className="hl-cc-meter" />

              <ul className="hl-cc-mods">
                {level.modules.map((one) => (
                  <li
                    key={one.slug}
                    className="hl-cmod"
                    data-module={one.module}
                    data-drawn={one.drawn ? 'true' : 'false'}
                  >
                    {one.drawn ? (
                      <button
                        type="button"
                        className="hl-cmod-toggle"
                        // The name says which module and what pressing does,
                        // and it never changes with the state.
                        //
                        // NO `aria-pressed`, for the reason `Catalog.tsx`
                        // gives about its view toggle: whether a module is
                        // complete is decided by a class on `<html>` that no
                        // React render sets (channel A, §12.2), so an
                        // attribute rendered on channel B would be a second
                        // author of one state. With scripts refused it read
                        // `false` for every frame and for ever, about a module
                        // whose disc was painted — a screen reader was told
                        // "not pressed" about a module that is complete. The
                        // state is said instead by the word below, revealed by
                        // the same generated rule that reveals the disc, so
                        // the picture and the sentence cannot come apart.
                        aria-label={`Complete ${one.title}`}
                        onClick={() => toggleCompletion(record, one.slug)}
                      >
                        <Tick />
                      </button>
                    ) : (
                      // §12.4.1 — absent, not disabled. The word is what says
                      // why, in the one spelling this status has (§12.14.1).
                      <span className="hl-cmod-planned">Planned</span>
                    )}

                    <Link href={one.path} className="hl-cmod-link">
                      <span className="hl-cmod-num">
                        {String(one.module).padStart(2, '0')}
                      </span>
                      {one.title}
                    </Link>

                    {/* Channel A, and the only statement of the state an
                        assistive technology gets. Revealed by the generated
                        rule E2 for the same modules as the disc, so the
                        picture and the sentence cannot come apart. It sits
                        OUTSIDE the button because `aria-label` on a button
                        replaces its contents for naming, so a word inside it
                        is never announced; and it carries its own class rather
                        than the disc's, because sharing `hl-cmod-mark` made
                        that selector match two elements per row. */}
                    <span className="hl-cmod-said">Complete</span>
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>

      {/* §12.2 channel B — one island per document fills every `--/8` the
          meters drew. It renders nothing of its own, and with scripting off
          every cell keeps the dash, which is the true statement that no record
          was read. */}
      <CategoryTally facts={facts} />
    </section>
  )
}
