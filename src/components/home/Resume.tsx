import Link from 'next/link'
import { CategoryMeter, type MeterSheet } from '@/components/course/CategoryMeter'
import { CategoryTally } from '@/components/course/CategoryTally'
import { PathStanding } from '@/components/path/PathStanding'
import { ContinueLine } from '@/components/record/Diagram'
import { Readout } from '@/components/record/Readout'
import { Uptime } from '@/components/record/Uptime'
import type { CategorySlug } from '@/lib/content/categories'
import { NOT_MEASURED, plural } from '@/lib/text'
import { ROLES } from '@/lib/path/roles'
import type { CurriculumFacts } from '@/lib/record/derive'

/**
 * §15.2, §15.3 — the returning reader's half of the home screen.
 *
 * **A server component, and both halves of `/` are always in the DOM.** The
 * home screen is one prerendered document with two states, and the choice
 * between them is `home.css`'s single rule keyed off `data-hl-record`, which
 * `lib/record/boot.ts` has stamped on `<html>` before first paint since Phase 2
 * (§15.2.1). The rejected alternative was the obvious one — read the store in
 * an effect and render one block — and §12.2 rules it out by name: a
 * JS-selected block is wrong for one frame on every load, which is the single
 * defect the two-channel arrangement exists to make impossible. So there is no
 * hook here, no `useEffect`, and no condition on the reader.
 *
 * **Nothing here computes a count** (§14.9, §15.3). Every reader-facing figure
 * in this block is one that already has exactly one implementation somewhere
 * else, and this file's whole job is composition:
 *
 *   - the next unsigned drawn sheet      `ContinueLine`  (`nextUnsigned`)
 *   - signed off / to go                `Readout`       (`signedCount`)
 *   - the fourteen-day strip            `Uptime`        (`uptime`)
 *   - the standing of the reader's path `PathStanding`  (`pathStanding`)
 *   - one meter per subsystem           `CategoryMeter` + `CategoryTally`
 *
 * Each of those is channel B or channel A already, and each prints `--` until
 * it has a reading. A second arithmetic for any of them — a `04 of 32` composed
 * here from a prop, say — is exactly the drift §14.9 forbids: two derivations
 * of one number, free to disagree on one page.
 *
 * **§7.3's "dashboard only" is amended by §15.3**, which names the fourteen-day
 * strip as one of this block's five fields. The strip is reused rather than
 * redrawn, so there is still one implementation of UPTIME and one set of rules
 * for what it may say; what changed is where it is allowed to appear.
 *
 * §11.38 is unbroken: the home screen, the dashboard and the profile sheet read
 * the same three counts through the same selectors (§15.0 decision 9), and this
 * block adds no fourth surface of its own.
 */

/**
 * The one value a tally prints when there is nothing true to print.
 *
 * `lib/content/manifest.ts` and `lib/content/title-block.ts` each hold a
 * private `DASH` of their own; neither is exported, and both reach `node:fs`,
 * so neither can be imported here. This is the third copy of one glyph, and the
 * fix is one exported constant — see the note handed to the orchestrator.
 */
const DASH = NOT_MEASURED

/**
 * One subsystem's meter, as a fact about the drawing set rather than about the
 * reader. `sheets` is every sheet in the subsystem, drawn or not, because the
 * denominator is the subsystem and not the part of it somebody has written
 * (§11.25).
 */
export interface ResumeSubsystem {
  slug: CategorySlug
  title: string
  sheets: readonly MeterSheet[]
  /**
   * Sheets in this subsystem a reader could sign off. Passed in, never counted
   * here: zero is what makes the meter dashed end to end (§15.3.1).
   */
  drawn: number
}

/**
 * `curriculumFacts()` satisfies this. The narrowed `sheets` member is what
 * `ContinueLine` needs to print the sheet's own title, and narrowing the member
 * rather than intersecting two interfaces keeps `sheets` one element type.
 */
export interface ResumeFacts extends CurriculumFacts {
  sheets: ReadonlyArray<CurriculumFacts['sheets'][number] & { title: string }>
}

export interface ResumeProps {
  /** Measured from the corpus by the page: `curriculumFacts()` (§12.2). */
  facts: ResumeFacts
  /** The six subsystems in curriculum order, from `CATEGORIES`. */
  subsystems: readonly ResumeSubsystem[]
}

export function Resume({ facts, subsystems }: ResumeProps) {
  // §12.2 — `status: ready` lives in the markdown and only `lib/content/` can
  // read it, so the drawn set is measured here, where the corpus facts already
  // are, and handed down to the island rather than looked up inside it.
  const drawnSlugs = facts.sheets.filter((sheet) => sheet.drawn).map((sheet) => sheet.slug)

  return (
    <section className="hl-home-resume" aria-labelledby="hl-resume">
      <p className="hl-eyebrow hl-mark">Read from the record in this browser</p>
      <h2 id="hl-resume" className="hl-home-resume-title">
        Where you left off
      </h2>

      <div className="hl-resume">
        <div className="hl-resume-open">
          <p className="hl-mark m-0 text-ink-muted">Next sheet, not signed off</p>
          {/* §12.10.6 — the one line, and it is absent when every drawn sheet
              is signed off, which is the honest form of that state and cheaper
              than a panel explaining itself.

              **The label used to read "Open, not signed off", and it lied.**
              `ContinueLine` prints `nextUnsigned` (`derive.ts`) — the first
              DRAWN sheet in curriculum order that is not signed off, which the
              reader may never have opened: sign off 01 and 03, never open 02,
              and the old label announced 02 as open. Worse, "opened and left"
              already means something exact on this site — `attention.ts`, under
              the dashboard's `OPENED, NOT SIGNED OFF` — so the old wording
              claimed that state on a surface that cannot compute it.

              §15.3 asked for the last-opened unsigned sheet, and the rejected
              fix was to supply it: `selectAttention(record, [], now)` here has
              no event log and flags a sheet only after `STALL_DAYS`, so a
              reader who read a sheet this morning would get an EMPTY block. An
              empty block is a worse falsehood than a narrow label, so the label
              was made to match the value instead, in wording the dashboard does
              not use. */}
          <ContinueLine facts={facts} />
          {/* §12.4.1 puts the sign-off control on the sheet and nowhere else,
              so this block names the sheet and sends the reader to it rather
              than offering a second control that could only navigate. */}
          <p className="hl-home-note-line">
            A sheet is signed off on the sheet itself, beside the criteria the
            sign-off asserts.
          </p>
        </div>

        {/* §7.1 — the strip, unduplicated: `SIGNED OFF 04/32 · TO GO 28 · …`.
            `TRACES` is omitted because this page does not build the graph and
            never counted them (§11.25). */}
        <div className="hl-resume-readout">
          <Readout variant="full" facts={facts} />
        </div>

        <div className="hl-resume-grid">
          <div>
            <p className="hl-mark m-0 mb-2 text-ink-muted">Last 14 days</p>
            <Uptime />
          </div>

          {/* §13.4.3 / §15.3 — the path, on channel A. All nine bodies are in
              the markup and `hl-role-<id>` picks one before first paint; a
              reader who has stated no role gets `.hl-path-empty`, which is the
              honest empty state and not a prompt. The ordered steps stay on
              `/path/`: two renderings of one ordered list are two things to
              keep true. */}
          <div>
            <p className="hl-mark m-0 mb-2 text-ink-muted">On your path</p>

            <div className="hl-path-empty">
              <p className="hl-mark m-0 text-ink">NO ROLE ON RECORD</p>
              <p className="hl-home-note-line">
                State one on the{' '}
                <Link href="/profile/" className="hl-link">
                  profile sheet
                </Link>{' '}
                and a path is drawn for it. Leave it unstated and the whole set
                stays exactly as it is.
              </p>
            </div>

            {ROLES.map((role) => (
              <div key={role.id} className="hl-path-body" data-role={role.id}>
                <p className="hl-mark m-0 text-ink-muted">
                  Role <span className="text-ink">{role.label}</span>
                </p>
                <PathStanding role={role.id} drawnSlugs={drawnSlugs} />
                <p className="hl-home-note-line">
                  <Link href="/path/" className="hl-link">
                    The steps on this path, in order
                  </Link>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* §13.1.3 (5), §13.5 — one segmented meter per subsystem, in curriculum
          order, each with its own printed count. One segment is one sheet, in
          module order, so the meter reports how much of the subsystem exists as
          well as how much of it is signed off — which a bar could not. */}
      <section className="hl-panel" aria-labelledby="hl-resume-meters">
        <div className="hl-panel-head">
          <h3 id="hl-resume-meters" className="hl-panel-title">
            Subsystems
          </h3>
          <p className="hl-mark m-0 text-ink-faint">One segment per sheet</p>
        </div>

        <ul className="hl-home-meters">
          {subsystems.map((subsystem) => (
            <li key={subsystem.slug}>
              <p className="hl-mark m-0 mb-1 text-ink">{subsystem.title}</p>
              {subsystem.drawn === 0 ? (
                <UnsignableMeter {...subsystem} />
              ) : (
                <CategoryMeter category={subsystem.slug} sheets={subsystem.sheets} />
              )}
            </li>
          ))}
        </ul>

        {/* §12.2 channel B — one island per document fills every `--/7` the
            meters drew. It renders nothing of its own, and with scripting off
            every cell keeps its dash, which is the true statement that no
            record has been read. */}
        <CategoryTally facts={facts} />
      </section>

      <div className="hl-home-actions">
        {/* `Sheet index` and not `The whole set`: §12.14.1 admits one spelling
            per thing, and this destination already has a name — the trail and
            the footer label print it from `ROUTE_TITLES`, and the first-visit
            block's card uses it too. Two names for one page on one document is
            the same defect as two spellings of one status. */}
        <Link className="hl-btn" href="/sheets/">
          Sheet index
        </Link>
        <Link className="hl-btn" href="/dashboard/">
          Dashboard
        </Link>
        <Link className="hl-btn" href="/profile/">
          Profile
        </Link>
      </div>

      {/* §12.2 — the note names the two channels apart, because the old one
          ("drawn from the record before the page paints, so it is right in the
          first frame") claimed channel A's correctness for the whole block.
          Only three things are stamped on `<html>` by `boot.ts` before paint:
          this block instead of the first-visit one, the filled meter segments,
          and which of the nine path bodies is shown. Every figure — the strip's
          counts, the meter tallies, the fourteen-day ticks, the path standing,
          and the sheet on the Continue line — is a channel B island and is
          demonstrably a dash or absent in that frame, so a reader who watched
          them arrive was being told they had been there all along. */}
      <div className="hl-note">
        <p>
          Which block you are reading, the filled meter segments and which path
          is shown come from the record in this browser before the page paints.
          The counts, the fourteen-day strip, the standing on your path and the
          sheet on the Continue line are read from the record after that, and
          stay dashed or absent until it has been read.
        </p>
        <p>
          Dashed segments are sheets that are NOT DRAWN. They carry no sign-off
          control, so they are counted into no total here.
        </p>
      </div>
    </section>
  )
}

/**
 * §15.3.1 — a subsystem with nothing drawn in it.
 *
 * There is nothing signable in the subsystem, so the meter is dashed end to end
 * and the tally is an em dash. `0/9` would be worse than useless: it reads as
 * nine sign-offs the reader has not taken, when in fact nobody has drawn the
 * sheets and no control to sign them exists (§12.4.1). The approved mockup
 * printed `0/9` and that is the one thing corrected out of it.
 *
 * **Why this is not `CategoryMeter`.** That component always writes the
 * `data-hl-cat-tally` contract, and `CategoryTally` fills every cell carrying
 * it with `approved/total` — which is the `0/9` this section forbids. Nothing
 * is redrawn: the segments are `lokum.css`'s own `.hl-meter` / `.hl-seg`
 * vocabulary, at the same weights, and the alternative that removes even this
 * much duplication is a flag on `CategoryMeter` itself, which this task does
 * not own.
 *
 * The segments deliberately carry no `data-module`. `html.hl-signed-<n>` fills
 * a segment by module number, and a record hand-edited to claim a sign-off on a
 * sheet nobody has written could otherwise fill one here (§12.1.3 — a record
 * read back out of storage is untrusted input). With no number to match, these
 * segments cannot fill, which is the truth about them.
 *
 * **The line prints the count, and that is §10.4 and not symmetry.** The gauge
 * above it is `aria-hidden`, so the sentence under it is the only statement of
 * its reading — the condition under which a gauge may be silent at all. Without
 * the count this subsystem was the one cell in the list with no size: every
 * drawn subsystem gets `approved/total` from `CategoryTally`, so a reader met
 * five numbered meters and one that named a subsystem and measured nothing.
 * `plural` rather than a written-in `sheets`, because protocols & specs is a
 * subsystem of one and `1 sheets` is a typed word contradicting the measured
 * number beside it (§11.25). The dashboard's copy of this component reached the
 * same line from the same argument; the two now read alike because the reason
 * is shared, not to make them match.
 */
function UnsignableMeter({ slug, sheets }: ResumeSubsystem) {
  if (sheets.length === 0) return null

  return (
    <div>
      <div className="hl-meter w-44" aria-hidden="true">
        {sheets.map((sheet) => (
          <span key={sheet.module} className="hl-seg" data-cat={slug} data-drawn="false" />
        ))}
      </div>
      <p className="hl-mark m-0 mt-1 text-ink-muted">
        {DASH} signed off · {plural(sheets.length, 'sheet')}, NOT DRAWN
      </p>
    </div>
  )
}
