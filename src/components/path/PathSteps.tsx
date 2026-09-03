import Link from 'next/link'
import { isDrawnStep, type LearningPath, type PathStep, type Tier } from '@/lib/path/paths'

/**
 * §13.4.3 items 3 and 4 — one path's ordered steps, as server markup.
 *
 * **A server component with no hooks, and that is the whole design.** Every
 * step's *state* is channel A (§12.2): `lokum.css` reveals `.hl-step-tick` from
 * the `hl-signed-<n>` class the boot script stamped on `<html>`, so a signed
 * step says `SIGNED OFF` in frame one with zero React and nothing to hydrate.
 * Nine paths and 124 steps therefore cost nine mounted islands fewer than the
 * obvious implementation, and no reader ever watches a step change its mind.
 *
 * The two things CSS cannot do are handled elsewhere and are named here so a
 * later reader does not look for them in this file. The *tally* is a computed
 * number and lives in `PathStanding` (channel B). The *next* step is "the first
 * unsigned drawn step", which is a computation over the whole list and has no
 * CSS selector at all — so this file marks no step as next, which is honest,
 * and `PathStanding` sets `data-next="true"` on exactly one of the `<li>`
 * elements below after mount. That is why every step carries
 * `data-hl-path-slug`: it is the contract between this markup and that island,
 * the same arrangement `SignOffMarks` uses for the sign-off squares.
 *
 * **A draft step never implies a lesson** (§13.4.2, §12.4.1). Modules 16–32
 * hold a topic list and nothing else, so a draft step is drawn in §11.25's
 * hidden-line treatment with `NOT DRAWN` beside it, carries no sign-off
 * marker — no `hl-signed-<n>` for n ≥ 16 can ever be stamped, because a draft
 * sheet has no sign-off control to produce one — and carries **no link**: a
 * link on a roadmap entry is a promise that there is something there to read.
 * The sheet is still reachable from `/courses/`, which is where a reader goes
 * to see what a draft sheet actually is (§13.4.4 — a path is a view, not a
 * gate, and equally not a wall).
 *
 * Titles arrive as `SheetRefs`, measured from the corpus by the page. They are
 * NOT looked up here: `lib/content/manifest.ts` reaches `node:fs` through the
 * loader, and a client island holds the record — so build-time facts cross that
 * line as serialised props and never as an import (§12.2, R3).
 */

/** What one step needs to know about the sheet it points at (§11.25). */
export interface SheetRef {
  /** The sheet's own title, as the drawing prints it. */
  title: string
  /** Its route. Only ever rendered for a drawn sheet. */
  path: string
  /** `04` — the number as the manifest's `#` column prints it. */
  number: string
  /** The unpadded number, for the `data-module` channel A selectors keys on. */
  module: number
  /** The subsystem title, so the step's hue is never the sole carrier (§13.1.4). */
  subsystem: string
  /** `status: ready`, measured from the corpus. The only answer there is. */
  drawn: boolean
}

/** Keyed by slug, because the slug is the identity (§12.1.3). */
export type SheetRefs = Readonly<Record<string, SheetRef>>

/** The uppercase readout register §12.14.1 fixes for a status word. */
const TIER_LABEL: Readonly<Record<Tier, string>> = {
  core: 'CORE',
  supporting: 'SUPPORTING',
  context: 'CONTEXT',
}

/**
 * The contract between this markup and `PathStanding`, exported so both sides
 * and a test read one string rather than three copies of it.
 *
 * `data-hl-path` scopes the query to one role's body: all nine are in the
 * prerendered document (§13.4.3), and an unscoped selector would mark a "next"
 * step in the eight paths the reader is not on.
 */
export const PATH_BODY_ATTR = 'data-hl-path'
export const PATH_STEP_ATTR = 'data-hl-path-slug'

/** §12.2 — the attribute `lokum.css` reveals `.hl-step-next` from. */
export const PATH_NEXT_ATTR = 'data-next'

/**
 * The category part of a slug, which is where a step's hue comes from. Read off
 * the slug rather than off the module number, for the reason §12.1.3 gives: the
 * set has been renumbered before, so the number is a label.
 */
function categoryOf(slug: string): string {
  const cut = slug.indexOf('/')
  return cut === -1 ? slug : slug.slice(0, cut)
}

/**
 * §11.25 — a step whose slug the corpus does not answer to prints an em dash
 * for its title and no link at all, rather than a guess or a broken route.
 * `tests/unit/path/honesty.test.ts` asserts every slug is real, so this is the
 * behaviour under a renamed sheet rather than a state the site ships in.
 */
const NO_TITLE = '—'

/** §11.25 — the instrument convention, for the number column's own refusal. */
const NO_READING = '--'

function Step({
  step,
  sheet,
  drawn,
}: {
  step: PathStep
  sheet: SheetRef | undefined
  drawn: ReadonlySet<string>
}) {
  // One answer, and the corpus is the only one that has it. `isDrawnStep` used
  // to compare a number written into the step against a constant written into
  // `paths.ts`, so there were two answers and this line had to pick the more
  // cautious of them (§13.4.2).
  const draft = !isDrawnStep(step, drawn)
  const title = sheet?.title ?? NO_TITLE

  return (
    <li
      className="hl-step hl-cat-tint ps-3"
      data-module={sheet?.module}
      data-cat={categoryOf(step.slug)}
      data-tier={step.tier}
      data-draft={draft ? '' : undefined}
      // The literal name is written out rather than spread from the constant
      // above: JSX spreads defeat the type checker on intrinsic attributes, and
      // `PATH_STEP_ATTR` exists so the island and the test read one string.
      data-hl-path-slug={step.slug}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {/* §11.25's hidden line on a draft, exactly as `ModuleRow` draws it:
            a 1px rule dashed 3 on / 2 off down the number. */}
        <span
          className={
            draft
              ? 'hl-mark hl-hidden-y ps-2 text-ink-faint'
              : 'hl-mark text-ink-muted'
          }
        >
          {sheet?.number ?? NO_READING}
        </span>

        {draft || sheet === undefined ? (
          <span className="text-ink-muted">{title}</span>
        ) : (
          <Link className="hl-link" href={sheet.path}>
            {title}
          </Link>
        )}

        <span className="hl-mark text-ink-faint">{TIER_LABEL[step.tier]}</span>
        {sheet !== undefined && (
          <span className="hl-mark text-ink-faint">{sheet.subsystem}</span>
        )}

        {/* The state, in words. A draft says what it is; a drawn step says
            `SIGNED OFF` only when this reader's own record says so, which is
            channel A's to decide — the markup is identical for every reader. */}
        {draft ? (
          <span className="hl-mark text-ink-faint">NOT DRAWN</span>
        ) : (
          <span className="hl-step-tick hl-mark">SIGNED OFF</span>
        )}

        {/* Revealed by `data-next="true"`, which only a client island can set
            (§12.2). Absent on a draft step: a sheet nobody has written is not
            the one to read next. */}
        {!draft && (
          <span className="hl-step-next hl-mark">TAKE THIS NEXT</span>
        )}
      </div>

      {/* §13.4.1 — why THIS role reads THIS sheet, naming something the sheet
          contains. On a draft step it says what the sheet is planned to cover,
          and `honesty.test.ts` refuses the present-tense teaching verbs that
          would read as a promise. */}
      <p className="mt-1 mb-0 max-w-[68ch] font-display text-meta leading-normal text-ink-muted">
        {step.reason}
      </p>
    </li>
  )
}

export function PathSteps({ path, sheets }: { path: LearningPath; sheets: SheetRefs }) {
  // The drawn set, read off the same measurements the titles came from, so a
  // step and the sheet it points at cannot answer the question differently.
  const drawn = new Set(
    Object.entries(sheets).filter(([, sheet]) => sheet.drawn).map(([slug]) => slug),
  )

  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {path.steps.map((step) => (
        <Step key={step.slug} step={step} sheet={sheets[step.slug]} drawn={drawn} />
      ))}
    </ol>
  )
}
