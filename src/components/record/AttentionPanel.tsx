'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { attentionReason } from '@/lib/org/types'
import { STALL_DAYS, selectAttention } from '@/lib/record/attention'
import { nowIso, useRecord } from '@/lib/record/store'
import type { AttentionFlag } from '@/lib/record/wire'

/**
 * §15.7 / §14.8.1 channel B — the sheets waiting on the reader, each with the
 * reason it is listed.
 *
 * **It decides nothing.** `selectAttention` is the whole definition of what
 * "waiting" means, and §14.8.1's rule is that the manager's panel and the
 * reader's own page call that one function. This component supplies the two
 * things the function cannot hold — the record and the instant — and prints
 * what comes back. No threshold, no comparison and no second list are written
 * here; `STALL_DAYS` is imported rather than typed so the note under the list
 * states the number the definition actually used.
 *
 * **Channel B, and it has to be** (§12.2). "Opened and left" is not derivable
 * from anything `boot.ts` stamps: the boot script knows which sheets are signed
 * off and nothing else, so no class on `<html>` can separate a sheet the reader
 * abandoned from one they never opened. A prerendered list would therefore be
 * either empty for everybody or a claim about a reader the build has never met.
 *
 * `now` follows `Uptime`'s idiom exactly, for the same reason: the build has no
 * idea what day the page is opened on, so reading the clock during render is
 * the hydration mismatch §12.2 exists to prevent. It starts `null`, the effect
 * fills it, and until then the panel prints the no-reading form rather than
 * "nothing is waiting" — which would be an assertion about the reader taken
 * before the record was read.
 *
 * **No count.** §11.38 fixes three progress surfaces and this is not a fourth:
 * it is a list of sheets and their reasons, with no numerator, no denominator
 * and no ratio. The counts on this page stay where they were.
 *
 * Assignments are deliberately empty. `AssignedSheet` comes from an org the
 * browser has not fetched here, so the `overdue` rule cannot fire on this
 * surface; the branch is still rendered by `reasonWords` because an imported
 * record can carry a flag this page did not raise, and printing the reason a
 * flag actually names is cheaper than filtering it out.
 *
 * **The note under the list is written against the evidence THIS call has, and
 * it used to be written against `selectAttention`'s definition instead.** Two
 * of the three rules cannot fire from here. `overdue` needs the assignments
 * above. And rule 2 needs an attempt count: `logs` is `{}`, so `attention.ts`
 * falls back to `sheet.quiz ? 1 : 0` — `QuizRecord` holds the latest answer and
 * no counter (`schema.ts`) — and `1 >= QUIZ_ATTEMPTS` is unsatisfiable, so a
 * reader who has missed the same Quick Check five times read
 * `NOTHING OPENED AND LEFT` under a sentence promising that sheet would be
 * listed. The manager's `/team/` panel passes `member.logs` and does list it;
 * that is a difference in evidence, not in definition, and only the panel with
 * the evidence may describe the rule.
 *
 * The stall clause moved for the same reason. It said "nothing has been written
 * against it", but `wasOpened` counts checklist ticks and followed sources
 * while the 14-day anchor is only `quiz.at` or a submittal `at`
 * (`lastTouchedFromRecord`) — a tick is a write the old sentence promised to
 * notice and could not date. So the note names the two dated writes, and says
 * outright that the undated ones do not move the count.
 */
export interface AttentionSheet {
  slug: string
  module: number
  title: string
  /** The subsystem's own title, measured from the corpus by the caller. */
  subsystem: string
  /** §12.4.1 — an undrawn sheet has no sign-off control, so it gets no link. */
  drawn: boolean
}

/**
 * The reason, in the words the register already ships.
 *
 * `attentionReason` is the ONE wording of these three statuses — the roster
 * table and the person sheet both print it — and §12.14.1 bans a second
 * spelling of a status outright. So it is called rather than paraphrased, and
 * only the slug segment is dropped: the row beside it already names the sheet,
 * by number and title, and printing `fundamentals/memory` a second time would
 * make the reason harder to read, not more precise. The filter is an exact
 * string comparison against the flag's own slug, so it can only ever remove
 * that one segment.
 */
function reasonWords(flag: AttentionFlag): string {
  return attentionReason(flag)
    .split(' · ')
    .filter((part) => part !== flag.sheetSlug)
    .join(' · ')
}

export function AttentionPanel({ sheets }: { sheets: readonly AttentionSheet[] }) {
  const record = useRecord()
  const [now, setNow] = useState<string | null>(null)

  useEffect(() => {
    setNow(nowIso())
  }, [])

  const flags = now === null ? null : selectAttention(record, [], now)

  const bySlug = new Map(sheets.map((sheet) => [sheet.slug, sheet]))

  return (
    <>
      {flags === null ? (
        <p className="hl-mark m-0 text-ink-muted">NO READING — THE RECORD IN THIS BROWSER HAS NOT BEEN READ YET</p>
      ) : flags.length === 0 ? (
        <p className="hl-mark m-0 text-ink-muted">NOTHING OPENED AND LEFT</p>
      ) : (
        <ul className="m-0 grid list-none gap-2 p-0">
          {flags.map((flag) => {
            const sheet = bySlug.get(flag.sheetSlug)
            return (
              <li
                key={`${flag.why}:${flag.sheetSlug}`}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-2"
              >
                <span className="font-display text-ui leading-normal text-ink">
                  {sheet === undefined ? (
                    // A slug the corpus no longer answers to — a renamed sheet,
                    // an imported record. It is named as it stands in the
                    // record rather than dropped (§12.1.3).
                    <span className="hl-mark">{flag.sheetSlug}</span>
                  ) : (
                    <>
                      {sheet.drawn ? (
                        <Link href={`/courses/${sheet.slug}/`} className="hl-link">
                          Sheet {String(sheet.module).padStart(2, '0')} · {sheet.title}
                        </Link>
                      ) : (
                        <>
                          Sheet {String(sheet.module).padStart(2, '0')} · {sheet.title}{' '}
                          <span className="hl-mark text-ink-muted">NOT DRAWN</span>
                        </>
                      )}
                      <span className="hl-mark ms-2 text-ink-muted">{sheet.subsystem}</span>
                    </>
                  )}
                </span>
                <span className="hl-mark text-ink-muted">{reasonWords(flag)}</span>
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-3 mb-0 max-w-[68ch] font-display text-meta leading-normal text-ink-muted">
        A sheet is listed here when the last dated write against it — a Quick
        Check answer or a filed submittal — is {STALL_DAYS} or more days old. A
        checklist tick and a followed source carry no date in this record, so
        they neither start nor reset that count. A Quick Check recorded as
        missed is not listed on its own: the count of attempts is held in the
        event log, which this page does not read. A sheet leaves the list when
        it is signed off, never because more time passed.
      </p>
    </>
  )
}
