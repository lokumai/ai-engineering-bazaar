'use client'

import { MARKS, NAMED_MARK_IDS, type MarkId } from '@/lib/identity/mark'
import { setIdentity } from '@/lib/record/events'
import { nowIso, update, useRecord } from '@/lib/record/store'
import { DrafterStamp } from './DrafterStamp'

/**
 * §12.3.5 — the drafter's mark: the seeded pattern, or one of six real
 * drafting glyphs.
 *
 * **There is no "new mark" button, and its absence is the design.** The seed is
 * minted once at the first sign-off and never regenerated, for the same reason
 * GitHub seeds an identicon from an immutable user id rather than from the
 * display name: a mark derived from the name, or re-rollable on a whim, would
 * silently change on every sheet the reader had already signed and retroactively
 * alter a signed artefact. So this control chooses between marks that already
 * exist; it does not mint one. §12.0's rule is that an absence is named rather
 * than stubbed, so the panel says so in one line instead of leaving a reader
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
 * actually is.
 *
 * The description sits OUTSIDE the `<label>` and is wired with
 * `aria-describedby`, the same correction `Submittal` documents: an implicit
 * label names its control from its whole text content, so a description inside
 * it would be read out as part of the option's name.
 *
 * §12.2 channel B: `useRecord()` returns the frozen `EMPTY_RECORD` on the
 * server and in the first client render, whose `mark` is null — so the
 * prerender checks the seeded option, which is the record's own default and
 * therefore true of every reader who has not chosen otherwise. Before the seed
 * exists `DrafterStamp` draws nothing at all (§11.25), and the option says why
 * rather than showing a substitute glyph.
 */
export function MarkPicker({ idPrefix = 'hl-mark' }: { idPrefix?: string }) {
  const record = useRecord()
  const seed = record.identity.markSeed
  const selected: MarkId = record.identity.mark ?? 'seeded'
  const legendId = `${idPrefix}-legend`

  function choose(id: MarkId): void {
    update((data) => setIdentity(data, { mark: id === 'seeded' ? null : id }, nowIso()), {
      kind: 'setIdentity',
      payload: { mark: id === 'seeded' ? null : id },
    })
  }

  return (
    <fieldset role="radiogroup" aria-labelledby={legendId} className="m-0 border-0 p-0">
      <legend id={legendId} className="hl-field-label">
        Approval mark
      </legend>

      <div className="grid gap-2 sm:grid-cols-2">
        {MARKS.map((option) => {
          const descriptionId = `${idPrefix}-${option.id}-desc`
          // The seeded option draws the minted pattern; a named one draws its
          // glyph, which needs no seed at all.
          const mark = option.id === 'seeded' ? null : option.id
          return (
            <div
              key={option.id}
              className="border border-line-strong bg-cleared p-3"
              data-hl-mark={option.id}
              data-hl-selected={selected === option.id ? 'true' : 'false'}
            >
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name={idPrefix}
                  value={option.id}
                  checked={selected === option.id}
                  onChange={() => choose(option.id)}
                  aria-describedby={descriptionId}
                  // record.css authors no radio rule and this file may not add
                  // one, so the control keeps its native appearance and takes
                  // the accent through `accent-color` — which the platform
                  // draws, and which forced-colors overrides correctly (§12.17).
                  // Painting a square one by hand would have carried the
                  // checked state in a `box-shadow`, and forced-colors deletes
                  // every shadow on the page.
                  style={{ accentColor: 'var(--color-accent)' }}
                  className="h-[14px] w-[14px] shrink-0"
                />
                <DrafterStamp mark={mark} seed={seed} />
                <span className="hl-mark text-ink">{option.label}</span>
              </label>
              <p
                id={descriptionId}
                className="mt-1 mb-0 font-display text-meta leading-normal text-ink-muted"
              >
                {option.description}
              </p>
              {option.id === 'seeded' && seed === null && (
                <p className="hl-mark m-0 mt-1 text-ink-faint">NO SEED MINTED YET</p>
              )}
            </div>
          )
        })}
      </div>

      {/* §12.0 / §12.3.5 — naming the absence, rather than leaving the reader
          to look for the control that is deliberately not here. */}
      <p className="mt-2 mb-0 font-display text-meta leading-normal text-ink-muted">
        The seeded pattern comes from an 8-character seed minted once with this
        record, and it is never regenerated. A mark that could be re-rolled, or
        that was derived from the name, would change on every sheet already
        signed off.
      </p>
    </fieldset>
  )
}

/**
 * The picker's own contract, asserted by test: seven options, the seeded one
 * first, then §12.3.5's six named glyphs in its order. Exported so the test
 * pins the list rather than re-typing it — a picker that quietly lost `HEX`
 * would otherwise still render, and still pass.
 */
export const MARK_PICKER_IDS: readonly MarkId[] = ['seeded', ...NAMED_MARK_IDS]
