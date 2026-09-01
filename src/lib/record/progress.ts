/**
 * §14.9 — `record_state.progress`, assembled from `derive.ts` and nothing else.
 *
 * This module is a PROJECTION, not a calculation. Every number it returns is
 * lifted verbatim out of a selector in `derive.ts`, because §14.9 exists to
 * stop the second implementation of the same arithmetic from being born: the
 * moment somebody writes `count(*) / 32.0` in Metabase — or the moment this
 * file counts signed sheets on its own — the panel says `18/32` while the
 * reader's own page says `17/32`, and §1 is broken by the system talking about
 * a person differently behind their back than to their face.
 *
 * So the rule for anyone editing this file: if a field cannot be answered by
 * calling a selector, do NOT answer it here. Add the selector to `derive.ts`,
 * where §12.5.2 already fixed the meaning of every denominator, and call it.
 * The only arithmetic below is `ratio`'s single division of two numbers that
 * `signedCount` returned together (see the note on it) and the counting of the
 * strip `uptime` returned — neither invents a definition.
 *
 * **Facts arrive as an argument**, exactly as in `derive.ts` (§12.2's import
 * direction): `lib/content/*` reaches `node:fs`, and this module is called from
 * the sync path that a client island owns. The caller — a server component, or
 * a page that was handed build-time facts — measures the corpus and passes
 * `CurriculumFacts` down as plain data. Same for `now`: no clock is read here,
 * so the output is deterministic under test (§12.14.2, and `events.ts`'s rule 2).
 *
 * **`attention` arrives as a function**, not as an import of `attention.ts`.
 * §14.8.1 says the panel and the reader's own page call the same definition,
 * and that definition lives in `attention.ts` — but binding to it here would
 * make the org layer's assignment vocabulary a prerequisite for testing this
 * projection, and it would fix the call shape of a module written in parallel.
 * The port pattern `RecordStorage` (`storage.ts`) and `RemoteRecordStore`
 * (§14.7.1, `wire.ts`) both established applies unchanged: the seam is a
 * parameter, the production call site passes the real selector, and the test
 * passes a stub that cannot lie about having been called.
 */

import {
  categoryProgress,
  signedCount,
  uptime,
  type CurriculumFacts,
} from './derive'
import { dayOf } from './events'
import type { RecordData } from './schema'
import type { AssignedSheet, AttentionFlag, Progress } from './wire'

/**
 * §14.8.1's selector, as this module needs to see it: pure, over the record
 * plus the sheets an org has assigned, plus the instant that decides what
 * "overdue" and "idle for N days" mean.
 */
export type AttentionSelector = (
  data: RecordData,
  assigned: readonly AssignedSheet[],
  now: string,
) => readonly AttentionFlag[]

export interface ProgressInput {
  data: RecordData
  facts: CurriculumFacts
  /** ISO instant. The day basis is UTC, through `events.ts`'s own `dayOf`. */
  now: string
  /** §14.8.1. Empty for a reader with no org, which is the common case. */
  assigned?: readonly AssignedSheet[]
  attention: AttentionSelector
}

/**
 * The stored answer to "how far along is this person?", for one record.
 *
 * `signedOff` / `attainable` / `byCategory` are `signedCount` and
 * `categoryProgress` renamed into `wire.ts`'s vocabulary and not otherwise
 * touched. The rename is worth stating because the two words differ in tone:
 * `signedCount().of` is "the whole set, drawn or not", which §12.5.3 pins
 * because CLASS counts sheets out of 32, and a denominator that shrank to what
 * has been drawn would flatter the reader (§11.25). `attainable` in this column
 * therefore means the same 32 — it is NOT `xp().attainableToday`, which is a
 * different quantity (XP the corpus can currently pay) that this column does
 * not carry.
 *
 * `ratio` is the one division. `derive.ts` publishes no ratio selector — the
 * reader's page prints counts, never a percentage — so rather than adding a
 * fourth number to the record's vocabulary this reduces the two `signedCount`
 * already agreed on. That keeps the invariant §14.9 actually cares about:
 * `ratio * attainable === signedOff`, so a dashboard reading
 * `progress->>'ratio'` and a reader reading `18 of 32` can never disagree. A
 * curriculum of zero sheets yields 0, not `NaN`: a JSON column holding `null`
 * where a number belongs is how a panel comes to print "—" for a real person.
 */
export function buildProgress({
  data,
  facts,
  now,
  assigned = [],
  attention,
}: ProgressInput): Progress {
  const counts = signedCount(data, facts)
  const byCategory: Record<string, { signedOff: number; attainable: number }> = {}
  for (const [slug, entry] of Object.entries(categoryProgress(data, facts))) {
    byCategory[slug] = { signedOff: entry.approved, attainable: entry.total }
  }

  // §7.3 — the strip, counted the way `Uptime.tsx` announces it to the reader
  // ("n of the last 14 days recorded"). Taking `uptime`'s own array means the
  // window, the UTC day basis, and its refusal to count a future day (a skewed
  // device clock, §12.12.3) all hold here without being restated. An instant
  // `dayOf` cannot read yields an empty strip and a null `lastActive`, which
  // this reports as zero days and no activity rather than as a guess.
  const day = dayOf(now)
  const reading = uptime(data, day ?? '')

  return {
    signedOff: counts.signed,
    attainable: counts.of,
    ratio: counts.of === 0 ? 0 : counts.signed / counts.of,
    byCategory,
    attention: attention(data, assigned, now),
    lastActivity: reading.lastActive,
    days: reading.days.filter((entry) => entry.active).length,
  }
}
