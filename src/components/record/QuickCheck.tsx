'use client'

import { useRef, useState } from 'react'
import { XP_QUIZ } from '@/lib/record/derive'
import { assessQuiz, filesAttempt, setQuizAnswer } from '@/lib/record/events'
import { logEvent, nowIso, update, useRecord } from '@/lib/record/store'

/**
 * §12.6 — the Quick Check, and the documented deviation from §5.10.
 *
 * **There is no authored model answer anywhere in this corpus.** Greps for
 * `**Answer`, `Model answer`, `Cevap` and `<details>` return nothing across the
 * 32 English sheets, so §5.10's `REVEAL MODEL ANSWER` is not implementable and
 * is withdrawn. A reveal button over an absent or generated answer would be the
 * §1 failure this codebase exists to prevent. What ships instead reveals the
 * sheet's own authored `## Summary`, labelled exactly that — it is the closest
 * authored thing that exists, and naming it accurately costs nothing.
 *
 * **Nothing is revealed until an answer has been written.** A
 * reveal-before-attempt UI destroys the retrieval effect, which is the one
 * mechanism here the evidence strongly supports (practice testing *g* = 0.50;
 * the documented failure mode is looking the answer up when uncertain).
 *
 * **The award is flat and pays for the attempt** (§12.5.1, amending §5.10's
 * 60/40/20 tier). Tiering rewards "matched" and penalises retries, which
 * inverts that evidence; either outcome records the self-assessment and pays
 * the same 60.
 *
 * No modal, no confetti, no sound, no score, no stars, no "Nice try", no
 * mascot. And no third state derived from the two axes (§12.4.2): this
 * component holds self-report data and says so, and nothing here computes a
 * pass, a grade or a mastery claim out of it.
 *
 * The answer is **not** local state. It lives in the record, so the server
 * renders an empty textarea — the only honest thing build-time HTML can put
 * there — and the reader's own answer arrives after the hydration commit
 * (§12.2, channel B). The in-memory store is authoritative and the flush is
 * throttled, so typing is never waiting on storage (§12.1.4).
 */
export function QuickCheck({
  slug,
  question,
  summaryHtml,
}: {
  slug: string
  /** The question as authored, inline markdown flattened by the extractor. */
  question: string
  /** §12.6 item 3 — the sheet's own `## Summary`, rendered at build time. */
  summaryHtml: string | null
}) {
  const record = useRecord()
  const [pressed, setPressed] = useState(false)
  /**
   * The answer as it stood when the reader took the field, or null while the
   * field is not being edited.
   *
   * Compared on blur rather than against the last row filed, because that is
   * the question being asked: did THIS editing session change anything. A
   * reader who focuses a saved answer, reads it and tabs away has attempted
   * nothing, and a ref seeded from the record could not tell — the first render
   * of a static export always has an empty answer (§12.2, channel B), so it
   * would read the hydration itself as an edit and file a row nobody made.
   */
  const openedWith = useRef<string | null>(null)

  const quiz = record.sheets[slug]?.quiz ?? null
  const answer = quiz?.answer ?? ''
  const assessed = quiz?.assessed ?? null
  const attempted = answer.trim() !== ''
  const comparable = summaryHtml !== null

  // Three gates, and the first frame fails all of them, which is correct: at
  // the instant the build ran, nobody had written anything.
  const offerCompare = attempted && comparable && !pressed && assessed === null
  const showSummary = comparable && (pressed || assessed !== null)
  // A sheet with no authored summary has nothing to compare against, so the
  // self-assessment stands on the attempt alone rather than waiting for a
  // reveal that cannot happen (§11.25 — absent, not a button over nothing).
  const offerAssess = attempted && (!comparable || pressed || assessed !== null)

  /**
   * One row per attempt (§14.8.1 rule 2), filed when an editing session that
   * changed the answer ends.
   *
   * No `answer` in the payload. The manager panel reads three columns and no
   * payload at all (`lib/org/queries.ts`), the envelope already carries the
   * latest answer where the reader can overwrite or erase it, and the log is
   * the one place they cannot — so the text belongs in the envelope and the
   * ACT belongs here.
   *
   * Which sessions count is `filesAttempt`, in `events.ts`, because that is a
   * rule and this is a binding (§5). The ref is cleared either way: a blur
   * closes the session whether or not it filed anything.
   */
  const fileAttempt = (value: string) => {
    const opened = openedWith.current
    openedWith.current = null
    if (!filesAttempt(opened, value)) return
    logEvent({ kind: 'setQuizAnswer', sheetSlug: slug })
  }

  const key = slug.replace(/[^A-Za-z0-9]+/g, '-')
  const headId = `hl-quiz-${key}`

  return (
    <section className="hl-quiz" aria-labelledby={headId}>
      <div className="hl-quiz-head hl-mark">
        <span id={headId}>QUICK CHECK</span>
        <span className="hl-quiz-award">{`+${XP_QUIZ} XP`}</span>
      </div>

      <div className="hl-quiz-body">
        <p className="hl-quiz-question">{question}</p>

        <label className="block">
          <span className="hl-field-label">YOUR ANSWER</span>
          <textarea
            rows={4}
            value={answer}
            /* The local write, every keystroke. It costs nothing over the
               network: the record is in memory and §12.1.4's flush is
               throttled, so typing never waits on storage — and the envelope
               keeps only the latest answer however many times it is edited. */
            onChange={(event) =>
              update((data) => setQuizAnswer(data, slug, event.target.value, nowIso()))
            }
            /* The LOG row, once per attempt, and `onBlur` is what an attempt
               turns out to be: the reader stopped writing and left the field.

               It used to be filed from `onChange`. That is the same handler,
               so it read as the same event, and it was not: an attempt is a
               unit of INTENT and a keystroke is a unit of CHANGE. Filing one
               row per keystroke made `docs/manager-queries.md`'s own table
               ("one row per attempt") false, and it filed every intermediate
               draft — including text the reader wrote and then deleted.

               That last part is why this is a defect and not an inefficiency.
               `learner_event` has NO delete policy while the person belongs to
               an organisation (§14.4.3, SECURITY.md) — by design, because a
               withdrawn submittal has to survive. So a draft filed there can
               never be retracted, while the answer in `record_state` can be
               overwritten and erased. Keystroke rows put the one kind of text a
               reader might want back into the one place it cannot be taken
               from, and a manager timeline query prints them verbatim.

               It also lost real events. `sync.ts` caps the queue at
               MAX_QUEUED_EVENTS and drops from the FRONT, so a long answer
               typed offline could evict a queued `signOff`. */
            onFocus={() => { openedWith.current = answer }}
            onBlur={() => fileAttempt(answer)}
          />
        </label>

        <div className="hl-quiz-actions">
          {offerCompare && (
            <button type="button" className="hl-btn" onClick={() => setPressed(true)}>
              COMPARE WITH THE SHEET&rsquo;S SUMMARY
            </button>
          )}
          {offerAssess && (
            <>
              <button
                type="button"
                className="hl-btn"
                aria-pressed={assessed === 'matched'}
                onClick={() => update((data) => assessQuiz(data, slug, 'matched', nowIso()), {
              kind: 'assessQuiz',
              sheetSlug: slug,
              payload: { assessed: 'matched' },
            })
          }
              >
                MATCHED
              </button>
              <button
                type="button"
                className="hl-btn"
                aria-pressed={assessed === 'missed'}
                onClick={() => update((data) => assessQuiz(data, slug, 'missed', nowIso()), {
              kind: 'assessQuiz',
              sheetSlug: slug,
              payload: { assessed: 'missed' },
            })
          }
              >
                DID NOT MATCH
              </button>
            </>
          )}
        </div>

        {!attempted && (
          <p className="hl-quiz-note font-display text-meta">
            The sheet&rsquo;s summary can be compared once an answer is written.
          </p>
        )}

        {showSummary && (
          <div className="hl-quiz-reveal">
            {/* Labelled the sheet's own summary, never "the answer" (§12.6). */}
            <p className="hl-quiz-reveal-label hl-mark">THE SHEET&rsquo;S SUMMARY</p>
            {/* Authored markdown, rendered by the same pipeline as the prose,
                so it is typeset as prose rather than as a bare HTML dump. */}
            <div className="prose" dangerouslySetInnerHTML={{ __html: summaryHtml ?? '' }} />
          </div>
        )}

        {/* The GNU readout convention of §12.14.1: uppercase key, value, no
            terminal period. `unknown` is a first-class value (§12.4.2), so
            before an assessment there is simply no line here to print. */}
        {assessed !== null && (
          <p className="hl-quiz-note hl-mark">
            {`SELF-ASSESSED: ${assessed === 'matched' ? 'MATCHED' : 'DID NOT MATCH'}`}
          </p>
        )}

        <p className="hl-quiz-note font-display text-meta">
          Self-assessment. Not graded by anyone.
        </p>
      </div>
    </section>
  )
}
