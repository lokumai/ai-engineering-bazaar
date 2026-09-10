'use client'

import Link from 'next/link'
import { useRecord } from '@/lib/record/store'
import { nextUnsigned } from '@/lib/record/derive'
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
 * **Channel B, and it has to be.** `nextUnsigned` reads the record, so this
 * cannot be right in frame one; `getServerSnapshot` returns the frozen empty
 * record, which resolves to module 01 for everybody. That is not a lie — a
 * reader who has signed nothing off does continue at the first module — but it
 * is not a shortcut either, so the hero renders nothing until the store has
 * answered and nothing at all once every written module is signed off.
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
  if (slug === null) return null

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
        <small className="bz-cont-eyebrow">Continue where you left off</small>
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
