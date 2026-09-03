import type { ReactNode } from 'react'

/**
 * §16.4 — the register: one stack of closed rows under the drafter block, and
 * the rule that makes closing them honest.
 *
 * **What it replaces, measured.** `out/profile/index.html`'s `<main>` carried
 * 1260 words, eleven `<h2>` panels and twenty form controls before a single
 * React island mounted, and the complaint that opened §16 was that a reader
 * could not find the two things they came to do. The register folds nine of
 * those panels to one line each; the measured opening is 163 words.
 *
 * **§16.4.1, and it is the only difficult rule here.** A closed row prints the
 * reading the panel exists to report — `2 OF 9 EARNED`, `3 KEYS · 1.4 KB`,
 * `NONE JOINED`. Folding removes **prose**, never a **fact**. That is the same
 * contract §10.4 put on the silent indicator: the line under the gauge writes
 * its reading. So `reading` is not an optional prop, and a blank one is refused
 * at render time rather than shipped as an empty column — see
 * `BLANK_READING_MESSAGE`.
 *
 * **Why native `<details>`.** Keyboard operation, the `aria-expanded`
 * equivalent, find-in-page's open-to-match and the platform's own disclosure
 * affordance under `forced-colors` all arrive for nothing. The rejected
 * alternative was a `<button aria-expanded>` pair: `grep -rn "aria-expanded"
 * src/ tests/` returns zero on this tree — there is no such widget on the site
 * and the three existing disclosures are all `<details>` — so hand-rolling one
 * would have introduced the site's first ARIA disclosure to save nothing.
 *
 * **Why the row is a `<section>` around the `<details>` rather than a bare
 * `<details>`.** Two reasons, and the second is the deciding one. First, the
 * fold is a control and the row is a region: `aria-labelledby` on a `<section>`
 * gives the row an accessible name a reader can navigate to whether or not it
 * is open. Second, roughly twenty assertions across the four suites address
 * these panels as `section[aria-labelledby="storage"|"raw"|"data"|"submittals"]`
 * and two in-tree links point at `#hl-account-head`; the ids survive the
 * redesign verbatim, and so does the shape that borrows them as a name. A bare
 * `<details role="group">` would have renamed nothing and rewritten twenty
 * tests.
 *
 * **Why the `h2` sits inside the `<summary>`.** The panel's id has to stay on a
 * heading at the level it already occupied, so the document outline is
 * unchanged by a purely visual fold; moving the id to the `<section>` and
 * dropping the heading would flatten the page's outline to a single h1 and
 * eleven anonymous regions. `<summary>`'s content model admits one heading
 * element, which is exactly what this uses — the reading and the chevron beside
 * it are phrasing content.
 *
 * Server-safe and hook-free: everything here is a pure function of its props,
 * so both channels of §12.2 may render it and the rows' readings can be
 * whatever their owner passes — a build-time count, or a client island that
 * prints `--` until its store answers.
 */

/**
 * The failure a blank reading raises. Exported so the test pins the guard
 * rather than a substring of prose, and worded to name the escape hatch: a row
 * with nothing measured yet passes `--`, which is the house spelling for "no
 * reading taken" (§16.4.2) and is a reading, not a gap.
 */
export const BLANK_READING_MESSAGE =
  'A register row may not print a blank reading (§16.4.1). '
  + 'Pass the reading the row exists to report, or `--` when nothing has been '
  + 'measured yet.'

/**
 * Blank means "this row states nothing while closed". `null`, `undefined` and
 * `false` are the three values a `&&` short-circuit produces, which is how a
 * reading disappears in practice: `reading={seed && …}` renders nothing and
 * type-checks. A number is never blank, `0` included — a zero that was measured
 * is a reading (§11.25 forbids the opposite, a zero that was not).
 *
 * An element is taken on trust: this cannot walk into a client island to see
 * what it will print, and refusing every node it cannot read would ban the
 * channel-B readings the register is mostly made of.
 */
function readingIsBlank(reading: ReactNode): boolean {
  if (reading === null || reading === undefined || typeof reading === 'boolean') return true
  if (typeof reading === 'string') return reading.trim() === ''
  return false
}

export function Register({
  children,
  labelledBy,
}: {
  children: ReactNode
  /** The register's own heading id, for `aria-labelledby`. */
  labelledBy: string
}) {
  return (
    <section className="hl-register" aria-labelledby={labelledBy}>
      {children}
    </section>
  )
}

/**
 * Exported so the page that assembles the register can hold its eleven rows as a
 * typed table rather than as eleven hand-written blocks, and so a test can
 * assert the table. The order of that table is part of the specification
 * (§16.4) and two suites pin it as a sequence; a table is checkable, eleven
 * blocks of JSX are not — `record-profile.test.tsx` is `renderToStaticMarkup`
 * with no DOM, so the only thing it can read is markup and constants (hazard
 * H-P).
 */
export interface RegisterRowProps {
  /** The row's own h2 id. Preserved verbatim from the panel it replaces. */
  id: string
  /** The row's name, printed in the summary. Sentence case. */
  name: string
  /**
   * §16.4.1 — the reading this row exists to report, printed on the summary so
   * that a closed row states it. Not optional, and not blank.
   */
  reading: ReactNode
  children: ReactNode
}

export function RegisterRow({ id, name, reading, children }: RegisterRowProps) {
  if (readingIsBlank(reading)) throw new Error(BLANK_READING_MESSAGE)

  return (
    <section className="hl-register-row" aria-labelledby={id}>
      <details className="hl-register-fold">
        <summary className="hl-register-summary">
          <h2 id={id} className="hl-register-name">
            {name}
          </h2>
          <span className="hl-register-reading">{reading}</span>
          {/* The native triangle is not in ISO 128's line language, so it is
              replaced by a mono `›` — in CSS with `list-style: none` only,
              never `display: none`, which costs Safari the click target
              (§16.4.4). Decoration: `<details>` already carries the state. */}
          <span className="hl-register-chev" aria-hidden="true">
            ›
          </span>
        </summary>
        <div className="hl-register-body">{children}</div>
      </details>
    </section>
  )
}
