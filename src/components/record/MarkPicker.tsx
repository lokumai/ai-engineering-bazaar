'use client'

import { useState } from 'react'
import { MARKS, NAMED_MARK_IDS, type MarkId } from '@/lib/identity/mark'
import { setIdentity } from '@/lib/record/events'
import { nowIso, update, useRecord } from '@/lib/record/store'
import { DrafterStamp } from './DrafterStamp'

/**
 * §12.3.5, amended by §16.2 — the drafter's mark: the seeded pattern, or one of
 * `NAMED_MARK_IDS`' real drafting glyphs. One row of 54px cells, and one shared
 * description line beneath it.
 *
 * **Why this file is now the only mark picker on the site.** The measurement in
 * §16.0 counted the same control three times in one tree: this component
 * (eight cards, eight paragraphs), `RolePanel`'s `MarkOffer` (the same eight
 * again, immediately below it, with two confirm buttons of its own) and
 * `AliasSheet`'s copy. Three implementations of one control is §11.38's clearest
 * breach, and the cost was measured rather than assumed — `out/profile/index.html`
 * held 1260 words and 20 form controls before this change. The rejected
 * alternative was to keep the card grid and merely delete the second copy; it
 * was rejected because eight descriptions on screen at once is what forced the
 * page's two real controls ~700 words apart in the first place. The description
 * is not deleted, it is moved: `MARKS` still carries all eight and the line
 * below the row prints whichever one the reader is pointing at.
 *
 * **Both modes, and the reason there are two.** With no `value` the component
 * reads the record and writes on change, which is right on `/profile/` where
 * there is no submit and no draft. With `value` supplied it writes nothing and
 * reports through `onChoose`, because `AliasSheet` holds name and mark as one
 * uncommitted draft behind `KEEP THIS ALIAS`: a picker that had already written
 * the mark would make that button claim an act it did not perform (§1,
 * `AliasSheet.tsx:31-46`). The rejected alternative — two components, or a
 * `draft` boolean deciding whether to call `update` — is how three copies
 * happened; the mode is a prop, and the write is one branch in one function.
 *
 * **There is no "new mark" button, and its absence is the design.** The seed is
 * minted once at the first sign-off and never regenerated, for the same reason
 * GitHub seeds an identicon from an immutable user id rather than from the
 * display name: a mark derived from the name, or re-rollable on a whim, would
 * silently change on every sheet the reader had already signed and retroactively
 * alter a signed artefact. So this control chooses between marks that already
 * exist; it does not mint one. §12.0's rule is that an absence is named rather
 * than stubbed, so the row says so in one line instead of leaving a reader
 * hunting for a refresh icon.
 *
 * Selecting the seeded option stores `mark: null` (§12.1.3) — "use `markSeed`"
 * — rather than the string `'seeded'`. Both reach the same geometry, which is
 * why the validator still accepts a stored `'seeded'` from a hand-edited file,
 * but null is the canonical form and is what this writes.
 *
 * **Native radios inside `role="radiogroup"`.** §12.10.2's roving tabindex
 * exists because an SVG node graph has no native control to lend it one; here
 * there is one. A group of same-named `<input type="radio">` gives arrow-key
 * navigation, a single tab stop, the `radio` role and the platform's own
 * forced-colors rendering for nothing, and every one of those is a thing a
 * hand-rolled listbox gets subtly wrong. The explicit `radiogroup` role
 * overrides `<fieldset>`'s implicit `group`, which is what §12.3.5's control
 * actually is. The radio is transparent and out of the flow (`.hl-markrow-input`)
 * and never `display: none`, which would take it out of the tab order and lose
 * every one of those behaviours; `forced-colors` puts it back in the flow, where
 * the selection is read from the platform's own dot rather than from a wash.
 *
 * **The description line is not an `aria-live` region** (§16.7). A region that
 * speaks on every arrow key is noise. Every radio's `aria-describedby` points at
 * the one line, and the line prints the option under the pointer, else the
 * focused one, else the selection — so the description a screen reader reads at
 * focus is the description the sighted reader is looking at. The accepted cost:
 * a virtual cursor parked on a radio it did not focus reads a neighbour's
 * sentence. Eight always-rendered hidden descriptions would fix that and put
 * eight paragraphs back in the accessibility tree of a control whose whole
 * purpose here was to stop having eight.
 *
 * **The offer is a dashed outline on the cell plus words in the shared line —
 * never a label inside the cell.** The first implementation printed
 * `OFFERED FOR YOUR ROLE` inside the 54px cell as an `aria-hidden` span, and
 * that claim ("the cell can carry the words silently") was wrong twice.
 * Measured: three uppercase mono words in a 54px column wrap to four lines and
 * take every one of the eight cells from 53px to 110px tall, so the compact row
 * — the whole reason §16.2 exists — became taller than the eight-card grid it
 * replaced for exactly the readers who have a role on record. And the span was
 * dead weight in the accessibility tree's place too: `aria-hidden` content
 * inside a `<label>` still cannot be read, while §16.2.3 needs the accessible
 * name to stay the mark's own name. So the cell carries §12.4.1's dashed
 * leader-line rule ("proposed, not drawn", drawn in `profile.css` by
 * `[data-hl-offered]`) and nothing else, and the row's height is the same for
 * every reader.
 *
 * **How the words survive**, which is what SC 1.4.1 and §16.2.3 actually ask —
 * an outline alone is not a marking:
 *
 * 1. The shared description line appends `· OFFERED FOR YOUR ROLE` whenever the
 *    option it is describing is the offered one, and that line is real text in
 *    no `aria-hidden` subtree.
 * 2. Every radio's `aria-describedby` points at that line, so the words are in
 *    the offered radio's own description the moment it takes focus — which is
 *    how a keyboard or screen-reader user arrives at a radio in a group whose
 *    only tab stop is the selection.
 * 3. Pointing at the cell prints the same clause, so the sighted reader who
 *    hovers the dashes reads them in words.
 * 4. `RolePanel`, in the register's `Role and path` fold, names the offered mark
 *    and states that it is marked on this row — the one place that says it
 *    without any interaction at all.
 *
 * §12.2 channel B: `useRecord()` returns the frozen `EMPTY_RECORD` on the
 * server and in the first client render, whose `mark` is null — so the
 * prerender checks the seeded option, which is the record's own default and
 * therefore true of every reader who has not chosen otherwise. Before the seed
 * exists `DrafterStamp` draws nothing at all (§11.25), and the row says why
 * rather than showing a substitute glyph.
 */

/**
 * §16.6 — the seed's absence has one spelling and, from here on, one author.
 * It was measured in three places (`record-profile.test.tsx:536`,
 * `alias.test.tsx:88`, this file), and §16.1's drawing needs a fourth; a second
 * spelling such as `SEED · NOT MINTED YET` would break all of them and fail the
 * copy register's one-spelling-per-status rule. Exported rather than repeated.
 */
export const NO_SEED_MINTED = 'NO SEED MINTED YET'

/**
 * §16.2.1 — the offer's one spelling, printed in the shared description line.
 * The cell itself carries the dashed rule; see the header for why the words are
 * not repeated inside it.
 */
const OFFERED = 'OFFERED FOR YOUR ROLE'

export function MarkPicker({
  idPrefix = 'hl-mark',
  offered = null,
  value,
  onChoose,
}: {
  /** Prefixes the radio `name`, the legend id and the description id. */
  idPrefix?: string
  /** The mark this reader's role suggests, marked as an offer and never written. */
  offered?: MarkId | null
  /** Supplying this switches the component into controlled mode: see above. */
  value?: MarkId
  onChoose?: (id: MarkId) => void
}) {
  const record = useRecord()
  const seed = record.identity.markSeed
  const legendId = `${idPrefix}-legend`
  const noteId = `${idPrefix}-note`

  /**
   * The two are separate because one gesture must not cancel the other: a
   * reader whose pointer leaves the row while a radio still holds focus should
   * read the focused option, not fall back to the selection.
   */
  const [pointed, setPointed] = useState<MarkId | null>(null)
  const [focused, setFocused] = useState<MarkId | null>(null)

  const controlled = value !== undefined
  const selected: MarkId = controlled ? value : (record.identity.mark ?? 'seeded')
  const described = MARKS.find((option) => option.id === (pointed ?? focused ?? selected))

  function choose(id: MarkId): void {
    onChoose?.(id)
    // The one branch the two modes differ in. In controlled mode the parent's
    // submit is the only writer, so this reports and stops.
    if (controlled) return
    const mark = id === 'seeded' ? null : id
    update((data) => setIdentity(data, { mark }, nowIso()), {
      kind: 'setIdentity',
      payload: { mark },
    })
  }

  return (
    <fieldset role="radiogroup" aria-labelledby={legendId} className="m-0 border-0 p-0">
      <legend id={legendId} className="hl-field-label">
        Approval mark
      </legend>

      <div className="hl-markrow" onMouseLeave={() => setPointed(null)}>
        {MARKS.map((option) => {
          // The seeded option draws the minted pattern; a named one draws its
          // glyph, which needs no seed at all.
          const mark = option.id === 'seeded' ? null : option.id
          return (
            <label
              key={option.id}
              className="hl-markrow-cell"
              /* §16.9, hazard C — the attribute lands on the label and on
                 nothing else: `responsive.spec.ts` counts `label[data-hl-mark]`
                 and a copy on an inner wrapper makes that count sixteen. The
                 two attributes stay adjacent and in this order because the
                 rendered pair is asserted as one string. */
              data-hl-mark={option.id}
              data-hl-selected={selected === option.id ? 'true' : 'false'}
              /* Present only on the offered cell, so `[data-hl-offered]`
                 locates it without a value test — an offer is a mark on one
                 cell, not a state every cell carries. It is also the whole of
                 the offer inside the cell: the stylesheet draws the dashed
                 rule from it, and the words are in the line below the row. */
              data-hl-offered={offered === option.id ? 'true' : undefined}
              onMouseEnter={() => setPointed(option.id)}
            >
              <input
                type="radio"
                name={idPrefix}
                value={option.id}
                checked={selected === option.id}
                onChange={() => choose(option.id)}
                onFocus={() => setFocused(option.id)}
                onBlur={() => setFocused(null)}
                aria-describedby={noteId}
                // record.css authors no radio rule and this file may not add
                // one, so the control keeps its native appearance and takes
                // the accent through `accent-color` — which the platform
                // draws, and which forced-colors overrides correctly (§12.17).
                // Painting a square one by hand would have carried the
                // checked state in a `box-shadow`, and forced-colors deletes
                // every shadow on the page.
                style={{ accentColor: 'var(--color-accent)' }}
                className="hl-markrow-input"
              />
              <DrafterStamp mark={mark} seed={seed} />
              <span className="hl-markrow-name">{option.label}</span>
            </label>
          )
        })}
      </div>

      {/* One line for eight options, and the only place the offer is stated in
          words (§16.2.1). `min-height` in the stylesheet holds its space, so
          arrowing across the row moves nothing below it — including when the
          offered option's extra clause appears. */}
      <p className="hl-markrow-note" id={noteId}>
        {described !== undefined && (
          <>
            <b>{described.label}</b> — {described.description}
            {offered === described.id && <> · {OFFERED}</>}
          </>
        )}
      </p>

      {/* §11.25 — the seeded cell draws nothing until the seed exists, and the
          absence is named rather than filled with a substitute glyph. Printed
          on the seed's own account, not on the selection's: the empty cell is
          there to be seen whether or not it is the one chosen. */}
      {seed === null && <p className="hl-mark m-0 text-ink-faint">{NO_SEED_MINTED}</p>}

      {/* §12.0 / §12.3.5 — naming the absence of the control that is
          deliberately not here, in one line rather than the three the card grid
          could afford. The rest of the argument is `MARKS`' own description of
          the seeded option, which the line above prints when it is pointed at. */}
      <p className="mt-2 mb-0 font-display text-meta leading-normal text-ink-muted">
        The seeded pattern comes from an 8-character seed minted once with this
        record, and it is never regenerated.
      </p>
    </fieldset>
  )
}

/**
 * The picker's own contract, asserted by test: `MARKS`' eight options, the
 * seeded one first, then §12.3.5's six named glyphs and §13.6's `lokum` in that
 * array's order. Exported so the test pins the list rather than re-typing it —
 * a picker that quietly lost `HEX` would otherwise still render, and still
 * pass. The count is not restated in prose anywhere the array can be measured
 * instead (§11.25).
 */
export const MARK_PICKER_IDS: readonly MarkId[] = ['seeded', ...NAMED_MARK_IDS]
