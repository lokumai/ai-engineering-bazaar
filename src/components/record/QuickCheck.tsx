'use client'

import { useState } from 'react'
import { XP_QUIZ } from '@/lib/record/derive'
import { assessQuiz, setQuizAnswer } from '@/lib/record/events'
import { nowIso, update, useRecord } from '@/lib/record/store'

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
            onChange={(event) =>
              update((data) => setQuizAnswer(data, slug, event.target.value, nowIso()), {
      // §14.8.1 rule 2 counts ATTEMPTS, so every answer is a row — not only the
      // last one, which is all the envelope keeps.
      kind: 'setQuizAnswer',
      sheetSlug: slug,
      payload: { answer: event.target.value },
    })
            }
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
