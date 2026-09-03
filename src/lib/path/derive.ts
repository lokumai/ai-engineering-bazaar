/**
 * §13.4 — every number and state the path surfaces, as pure selectors over one
 * path plus the reader's record.
 *
 * **The denominator is the honesty rule this file exists to enforce** (§13.4.2).
 * A path may point at a draft sheet, because a roadmap that stops at the edge of
 * today's content is a worse roadmap — but a draft sheet holds a topic list and
 * nothing else, and it carries no sign-off control at all (§12.4.1), so it can
 * never be signed and must never be counted as something left to do. Every
 * count below therefore runs over `isDrawnStep` only. That is decided here
 * rather than in the renderer, because a record imported from a file can carry
 * a sign-off for a draft sheet that no control on the site could have produced.
 *
 * **The tally is a count, and it leads with what is left** (§13.8, §11.35).
 * There is no percentage anywhere in this module and no function returning a
 * ratio, because a percentage cannot be printed on this site at all.
 *
 * **This module imports nothing but its siblings and the record's types**
 * (§12.2's import direction). A client island reads it, so one value reaching
 * in from `lib/content/` would pull `node:fs` into the browser bundle and stop
 * the build. It also never reads the clock: nothing here depends on `now`.
 *
 * What it deliberately does not do: it does not infer a role (`roles.ts` says
 * why there is no such function anywhere in this directory), it does not gate
 * anything (§13.4.4 — a path is a view), and it does not resolve a sheet's
 * title or revision, which are build-time facts a layout passes down as props.
 *
 * Every function is total. Records come out of Web Storage and are untrusted
 * (§12.1.3), so a slug the record has never seen reads as NOT SIGNED, never as
 * an error, and nothing here throws.
 */

import type { RecordData } from '../record/schema'
import { isDrawnStep, type LearningPath, type PathStep, type Tier } from './paths'

/**
 * True only when the reader has asserted a sign-off against this exact slug.
 * A missing sheet record, a slug the corpus renamed away, and an explicit
 * `null` are the same answer: not signed.
 */
function isStepSigned(step: PathStep, record: RecordData): boolean {
  return (record.sheets[step.slug]?.signedOff ?? null) !== null
}

export interface PathStanding {
  /** Drawn steps the reader has signed off. */
  signed: number
  /** §13.4.2 — the denominator. Drawn steps only, never the whole list. */
  drawn: number
  /** §13.8 — the number the interface leads with: `drawn - signed`, to go. */
  remaining: number
  /** The one step to take next, or `null` when the path is finished. */
  nextSlug: string | null
}

/**
 * §13.4.2, §13.8 — the path's arithmetic.
 *
 * `drawn` is the denominator, and it counts drawn steps only: a path with 12
 * drawn and 2 draft steps reports `n of 12`. Reporting `n of 14` would ask the
 * reader to finish sheets nobody has written.
 *
 * `remaining` is what the interface says first, framed to-go, because §11.35
 * bans percentages outright and to-go framing is what sustains effort mid-task.
 *
 * `nextSlug` is the first drawn step in path order that is not signed off.
 * Exactly one step can be next, and none is when nothing is left — which is
 * why it is derived here instead of being marked per step: two "take this next"
 * marks on one page would be two claims that cannot both be true (§1).
 */
export function pathStanding(
  path: LearningPath,
  record: RecordData,
  drawnSlugs: ReadonlySet<string>,
): PathStanding {
  let drawn = 0
  let signed = 0
  let nextSlug: string | null = null

  for (const step of path.steps) {
    if (!isDrawnStep(step, drawnSlugs)) continue
    drawn += 1
    if (isStepSigned(step, record)) {
      signed += 1
      continue
    }
    // Path order, not module order: the first unsigned drawn step wins.
    if (nextSlug === null) nextSlug = step.slug
  }

  return { signed, drawn, remaining: drawn - signed, nextSlug }
}

export type StepState = 'signed' | 'ready' | 'draft'

/**
 * §13.4.2, §12.4.1 — what a single step may claim about itself.
 *
 * `'draft'` wins over everything. A draft sheet has no sign-off control, so it
 * can be neither signed nor ready, and a stored sign-off against one is a state
 * the site could not have produced — an imported file, or a slug that named a
 * drawn sheet before the sheet was renamed. Reading such a record as `'signed'`
 * would print `SIGNED OFF` beside a sheet holding a topic list and nothing
 * else, which is the exact claim §1 forbids.
 */
export function stepState(
  step: PathStep,
  record: RecordData,
  drawnSlugs: ReadonlySet<string>,
): StepState {
  if (!isDrawnStep(step, drawnSlugs)) return 'draft'
  return isStepSigned(step, record) ? 'signed' : 'ready'
}

/**
 * The category part of a slug. The slug is `<category>/<name>` and the slug is
 * the identity (§12.1.3), so the category is read off it rather than off the
 * module number, which is a label and has been renumbered before. A slug with
 * no separator answers as itself: total, and never a silent empty string that
 * would resolve `data-cat=""` to no hue at all.
 */
function categoryOf(step: PathStep): string {
  const cut = step.slug.indexOf('/')
  return cut === -1 ? step.slug : step.slug.slice(0, cut)
}

/**
 * §13.4.1, §13.5 — the distinct categories a path crosses, in the order the
 * path first reaches each one.
 *
 * Path order, not the corpus's category order: this answers "which subsystems
 * does this route touch, and in what sequence", which is a fact about the path.
 * Draft steps are included, because a step the reader can see on the page is a
 * category the path visibly crosses — this is a spread, not a tally, so §13.4.2
 * does not apply to it.
 */
export function categorySpread(path: LearningPath): readonly string[] {
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const step of path.steps) {
    const category = categoryOf(step)
    if (seen.has(category)) continue
    seen.add(category)
    ordered.push(category)
  }
  return ordered
}

export type TierCounts = { [tier in Tier]: number }

/**
 * §13.4.1 — how the path's steps divide across the three tiers.
 *
 * Every step counts, drafts included, because a draft step's tier is always
 * `context` by construction (`paths.ts` encodes that rule and the honesty test
 * re-checks it): a sheet with no content cannot be core to anything. So this
 * shape describes the path as authored, and a caller printing it alongside a
 * `pathStanding` must not mistake `core + supporting + context` for a
 * denominator — that number is `standing.drawn` and nothing else (§13.4.2).
 *
 * A true zero prints `0`: somebody counted (§11.25).
 */
export function tierCounts(path: LearningPath): TierCounts {
  const counts: TierCounts = { core: 0, supporting: 0, context: 0 }
  for (const step of path.steps) counts[step.tier] += 1
  return counts
}
