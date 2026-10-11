'use client'

import { useRef, useState } from 'react'
import type { QuizItem } from '@/lib/content/quiz'

/**
 * The quick quiz's questions, one at a time.
 *
 * The author, 2026-10-11: 3 to 5 four-choice questions per module, an
 * explanation of one or two sentences after every answer whether it was right
 * or wrong, Previous and Next between questions, and a way to start over.
 * **Reinforcement, not assessment** — so nothing here is stored, scored on a
 * record, or sent anywhere. A reload is a fresh quiz, which is what "start over"
 * means too.
 *
 * ## An answer is final, and that is the teaching
 *
 * The first choice locks the question: the right option is marked, the chosen
 * wrong one is marked, and the explanation appears. Letting a reader click
 * through the four options until one turns green would teach the colour of the
 * button rather than the module. Start over is how a reader tries again.
 *
 * ## Said as well as shown
 *
 * Right and wrong are a check and a cross as well as green and red, and the
 * verdict is a sentence in a live region, so the result reaches a reader who
 * cannot separate the two hues and a reader who cannot see either. The
 * question takes focus when it changes, so a screen reader reads the new one.
 *
 * The questions are in the page's language; the controls are in English, as
 * the rest of the interface still is (M23), and they say so with `lang`.
 */

const LETTERS = ['A', 'B', 'C', 'D'] as const

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.5l3.2 3.2L13 4.8" />
    </svg>
  )
}

function Cross() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
    </svg>
  )
}

function Arrow({ back = false }: { back?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={back ? 'M13 8H3.5M7.5 4L3.5 8l4 4' : 'M3 8h9.5M8.5 4l4 4-4 4'} />
    </svg>
  )
}

export function QuickQuiz({ items, lang }: { items: readonly QuizItem[]; lang: 'en' | 'tr' }) {
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<readonly (number | null)[]>(() => items.map(() => null))
  const [results, setResults] = useState(false)
  const question = useRef<HTMLParagraphElement>(null)

  const total = items.length
  const item = items[index]
  const choice = picked[index]
  const answered = choice !== null
  const right = choice === item.answer
  const score = picked.filter((one, at) => one === items[at].answer).length
  const content = lang === 'tr' ? 'tr' : undefined

  /** Move to a question and give it focus, so it is read out. */
  function go(next: number): void {
    setResults(false)
    setIndex(next)
    requestAnimationFrame(() => question.current?.focus())
  }

  function pick(option: number): void {
    if (answered) return
    setPicked((current) => current.map((one, at) => (at === index ? option : one)))
  }

  function restart(): void {
    setPicked(items.map(() => null))
    go(0)
  }

  if (results) {
    return (
      <div className="bz-quiz-body" lang="en">
        <div className="bz-quiz-result" role="status">
          <p className="bz-quiz-score">
            <b>{score} of {total}</b> answered correctly
          </p>
          <ol className="bz-quiz-recap">
            {items.map((one, at) => {
              const ok = picked[at] === one.answer
              return (
                <li key={at} data-correct={ok ? 'true' : 'false'}>
                  <button type="button" className="bz-quiz-recap-item" onClick={() => go(at)}>
                    <span className="bz-quiz-recap-mark">{ok ? <Check /> : <Cross />}</span>
                    <span lang={content}>{one.question}</span>
                    <span className="sr-only">{ok ? ', correct' : ', not correct'}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
        <div className="bz-quiz-nav">
          <button type="button" className="bz-btn bz-btn-quiet" onClick={() => go(total - 1)}>
            <Arrow back />
            Back to the questions
          </button>
          <button type="button" className="bz-btn" onClick={restart}>
            Start over
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bz-quiz-body" lang="en">
      <div className="bz-quiz-top">
        <span className="bz-quiz-progress">
          Question {index + 1} of {total}
        </span>
        {/* One step per question: filled when answered, in the verdict's
            colour and with its own shape, ringed where the reader is. */}
        <span className="bz-quiz-steps" aria-hidden="true">
          {items.map((one, at) => (
            <span
              key={at}
              className="bz-quiz-step"
              data-state={picked[at] === null ? 'open' : picked[at] === one.answer ? 'right' : 'wrong'}
              data-here={at === index ? '' : undefined}
            />
          ))}
        </span>
        <button type="button" className="bz-quiz-restart" onClick={restart}>
          Start over
        </button>
      </div>

      <p ref={question} className="bz-quiz-question" tabIndex={-1} lang={content} id={`quiz-q-${index}`}>
        {item.question}
      </p>

      <div className="bz-quiz-options" role="group" aria-labelledby={`quiz-q-${index}`}>
        {item.options.map((option, at) => {
          const state = !answered
            ? undefined
            : at === item.answer
              ? 'right'
              : at === choice
                ? 'wrong'
                : 'other'
          return (
            <button
              key={at}
              type="button"
              className="bz-quiz-option"
              data-state={state}
              aria-pressed={choice === at}
              aria-disabled={answered ? 'true' : undefined}
              onClick={() => pick(at)}
            >
              <span className="bz-quiz-letter" aria-hidden="true">
                {state === 'right' ? <Check /> : state === 'wrong' ? <Cross /> : LETTERS[at]}
              </span>
              <span className="bz-quiz-option-text" lang={content}>{option}</span>
            </button>
          )
        })}
      </div>

      {/* Rendered empty before an answer, so the announcement comes from a
          region the reader's software has already met. */}
      <div className="bz-quiz-feedback" aria-live="polite" data-correct={answered ? (right ? 'true' : 'false') : undefined}>
        {answered && (
          <>
            <p className="bz-quiz-verdict">
              {right ? <Check /> : <Cross />}
              {right ? 'Correct.' : `Not this one. The answer is ${LETTERS[item.answer]}.`}
            </p>
            <p className="bz-quiz-explain" lang={content}>{item.explain}</p>
          </>
        )}
      </div>

      <div className="bz-quiz-nav">
        <button
          type="button"
          className="bz-btn bz-btn-quiet"
          onClick={() => go(index - 1)}
          disabled={index === 0}
        >
          <Arrow back />
          Previous
        </button>
        {index < total - 1 ? (
          <button type="button" className="bz-btn" onClick={() => go(index + 1)} disabled={!answered}>
            Next
            <Arrow />
          </button>
        ) : (
          <button type="button" className="bz-btn" onClick={() => setResults(true)} disabled={!answered}>
            See results
            <Arrow />
          </button>
        )}
      </div>
    </div>
  )
}
