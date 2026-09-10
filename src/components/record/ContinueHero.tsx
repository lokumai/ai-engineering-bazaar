'use client'

import Link from 'next/link'
import { useRecord } from '@/lib/record/store'
import { nextUnsigned, signedCount } from '@/lib/record/derive'
import type { CurriculumFacts } from '@/lib/content/facts'

/**
 * §16 / `07`-A's first block — "The only thing most visits need."
 *
 * The mockup puts it at the top of the progress page and its own prose says
 * why: *"one page, and the first thing on it is the one action a returning
 * reader wants"*. It is the same derivation `ContinueLine` prints on the home
 * page — `nextUnsigned`, the first written module the reader has not signed
 * off — in the shape `07:120-127` draws.
 *
 * **The BOX is channel A and the CONTENT is channel B**, which is the split the
 * home page's shortcut already uses and the only one available: a module's
 * title is text, and channel A stamps classes and attributes. So
 * `progress.css` reveals this only for `html[data-hl-record]` — a record that
 * carries something — and React fills in which module once the store answers.
 *
 * **IT HAD NO GATE AT ALL, and that was a defect a review caught.** The
 * docblock here claimed "the hero renders nothing until the store has
 * answered"; it does not, because `nextUnsigned(EMPTY_RECORD, facts)` returns
 * the FIRST drawn module rather than `null`. So the prerendered `/profile/`
 * shipped a fully-populated "Continue where you left off → LLM Fundamentals"
 * to every reader, including one who had never opened anything, and with the
 * bundle blocked it never corrected. A comment asserting the opposite of the
 * code is worse than no comment.
 *
 * **The eyebrow branches, because the mockup draws one state and there are
 * two.** `07:123` reads "Continue where you left off", which is true of a
 * reader who has completed something and false of one who has only chosen an
 * alias or a role — and §15.11 counts both as carrying a record. A mockup that
 * draws one state cannot dictate the copy for a state it does not draw, so the
 * other state says what is true of it instead.
 *
 * WHAT `07` ASKS FOR AND THIS DOES NOT PRINT. Its metadata line reads
 * "Fundamentals · 25 min · you finished the module before this one on Friday".
 * The first two are corpus facts and are here. The third needs the date of the
 * previous sign-off, and the record exposes days as a set for the streak
 * rather than an ordered list — so it is left out rather than approximated,
 * because "on Friday" that is wrong about a reader's own week is worse than a
 * shorter line.
 */

export function ContinueHero({
  facts,
  levels,
}: {
  facts: CurriculumFacts
  /** Slug to title, so the line can name the level without restating it. */
  levels: Readonly<Record<string, string>>
}) {
  const record = useRecord()
  const slug = nextUnsigned(record, facts)
  // `null` only once every written module is signed off, which is the one case
  // where there is nothing left to continue to.
  if (slug === null) return null

  // Whether the reader has actually left off anywhere, which is what the
  // eyebrow may claim. Not a gate: a reader with a record and no completions
  // still gets the shortcut, it just does not lie about why.
  const started = signedCount(record, facts).signed > 0

  const sheet = facts.sheets.find((candidate) => candidate.slug === slug)
  if (sheet === undefined) return null

  const level = levels[sheet.category] ?? null
  // `duration` is minutes and a draft declares none, so a zero is an absence
  // rather than a reading — the validator refuses a `ready` module with one.
  const parts = [level, sheet.duration > 0 ? `${sheet.duration} min` : null].filter(
    (part): part is string => part !== null,
  )

  return (
    <div className="bz-cont" data-cat={sheet.category}>
      {/* The ordinal, as `07:38` draws it — and as an EDGE rather than the
          mockup's tinted fill, which is the call stage 4 already made for the
          level badge: the language has no tint scale, and D33 answers "a pale
          tinted fill" with a hairline. */}
      <span className="bz-cont-num" aria-hidden="true">
        {String(sheet.module).padStart(2, '0')}
      </span>

      <div className="bz-cont-body">
        <small className="bz-cont-eyebrow">
          {started ? 'Continue where you left off' : 'Start with'}
        </small>
        <b className="bz-cont-title">{sheet.title}</b>
        {parts.length > 0 ? <p className="bz-cont-meta">{parts.join(' · ')}</p> : null}
      </div>

      {/* A link and not a button: it navigates, and the mockup's `<button>` is
          a mockup's shorthand for one. */}
      <Link className="bz-btn" href={`/courses/${slug}/`}>
        Continue
      </Link>
    </div>
  )
}
