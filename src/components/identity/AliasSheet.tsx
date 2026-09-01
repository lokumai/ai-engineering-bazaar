'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { DrafterStamp } from '@/components/record/DrafterStamp'
import {
  MARKS,
  STORABLE_MARK_IDS,
  type MarkId,
} from '@/lib/identity/mark'
import {
  MAX_NAME_GRAPHEMES,
  countGraphemes,
  sanitiseName,
} from '@/lib/identity/name'
import { setIdentity } from '@/lib/record/events'
import { NAME_SCOPE } from '@/lib/record/scope'
import { nowIso, update, useHydrated, useRecord } from '@/lib/record/store'

/**
 * §15.4 — `/sign-in/alias/`, the one island the alias route mounts.
 *
 * **A view, not a capability** (§15.4.1). `RecordData.identity` already holds
 * `name`, `mark`, `markSeed` and `role`, and `setIdentity` already writes the
 * first two; this screen writes nothing else and needs no schema change. The
 * setters are `IdentityPanel`'s, imported rather than reimplemented, because a
 * second writer of the same two fields is how the two screens start disagreeing
 * about what an empty name means.
 *
 * **Why this is not `MarkPicker` with a name field beside it.** `MarkPicker` is
 * an EDIT on a record that already exists: every click writes immediately, which
 * is right on the profile sheet where there is no submit and no draft. Here both
 * fields are one uncommitted draft behind one control, and a picker that had
 * already written the mark would make `KEEP THIS ALIAS` a button that claims an
 * act it did not perform (§1) — the reader would have kept half the alias by
 * looking at it. So the draft is local state and the write happens once, on
 * submit. What is NOT duplicated is the vocabulary: the options are
 * `STORABLE_MARK_IDS` itself, the labels and the prose come from `MARKS`, and
 * the geometry comes from `markPaths` through `DrafterStamp`.
 *
 * **The order is the stored contract.** `mark.ts` records it: a reader who chose
 * the sixth mark must still find that glyph in the sixth place. So the picker
 * maps over `STORABLE_MARK_IDS` in order and neither sorts, filters nor appends
 * — `tests/unit/identity/alias.test.tsx` pins the rendered order against that
 * array, so a reshuffle fails rather than ships.
 *
 * **The artefact is on screen while it is being made** (§15.4.3). The preview is
 * built from `.hl-title-block`, the same block a sheet prints, because the
 * reader is choosing how their name will appear on every sign-off and in the
 * exported document — not filling in a form field. That is also why the empty
 * name previews as `UNSIGNED`: it is what the title block genuinely prints for a
 * record with no name, so the preview and the sheet cannot disagree. And it is
 * why `UNVERIFIED` sits on the object rather than in a paragraph beside it. This
 * is the one screen where a name could be mistaken for a proof, so the
 * correction rides on the thing that could be mistaken.
 *
 * §12.2 channel B: `useRecord()` returns the frozen `EMPTY_RECORD` on the server
 * and in the first client render, so the prerendered island is an empty field, a
 * seeded option with no glyph behind it, and a preview that says `UNSIGNED` —
 * everything the build honestly knows about a reader it has never met. The
 * draft's initial values are constants the server computes identically, and the
 * stored ones are copied in by an effect.
 *
 * This file imports nothing under `src/lib/content/` and no supabase module
 * (§15.4.4), which is what lets the route render with no environment at all.
 */

/**
 * What the title block prints for a record with no name (§12.3.1). The same
 * word `IdentityPanel`'s `Checked by` row prints, deliberately: a second
 * spelling of one status is the drift the copy register exists to stop.
 */
const UNSIGNED = 'UNSIGNED'

/** §15.4.3 — printed on the stamp, in caution ink, in every draft state. */
const UNVERIFIED = 'UNVERIFIED'

/**
 * The seeded pattern before the seed is minted. Character for character the
 * string `MarkPicker` prints for the same state; the two screens describe one
 * absence, so they say it with one sentence.
 */
const NO_SEED = 'NO SEED MINTED YET'

/** The preview draws the mark at 48px, twice the 24px `.hl-mark-stamp` fixes. */
const PREVIEW_SIZE = 48

/**
 * §12.1.3 — the seeded option is not a glyph, it is the absence of a choice, so
 * it stores `null` ("use `markSeed`") and never the string `'seeded'`. Exported
 * because this is the whole of the mapping and a test can then hold it still.
 */
export function storedMark(id: MarkId): MarkId | null {
  return id === 'seeded' ? null : id
}

/**
 * §12.3.4, §12.3.3 — the draft as the record would hold it, or `null` when
 * there is nothing to hold. Sanitising is `name.ts`'s job; deciding that an
 * all-whitespace field is an absence rather than a name is this screen's, and
 * it is the same decision `IdentityPanel` makes on submit.
 */
export function aliasFrom(draft: string): string | null {
  const clean = sanitiseName(draft)
  return clean === '' ? null : clean
}

/** The option row for an id. `MARKS` covers every member of the array. */
function optionFor(id: MarkId): { id: MarkId; label: string; description: string } {
  return MARKS.find((option) => option.id === id) ?? { id, label: id, description: '' }
}

export function AliasSheet() {
  const record = useRecord()
  const hydrated = useHydrated()

  const stored = record.identity.name
  const seed = record.identity.markSeed

  const [draft, setDraft] = useState('')
  const [edited, setEdited] = useState(false)
  const [chosen, setChosen] = useState<MarkId>('seeded')
  const [touchedMark, setTouchedMark] = useState(false)
  const [error, setError] = useState(false)
  const [saved, setSaved] = useState(false)

  /**
   * Both fields are filled from the record once it has been read, and again if
   * another tab changes it (§12.1.5) — never over the reader's own input, which
   * is what the two `touched` flags guard. Seeding `useState` from the store
   * during render would put a channel-B value in the first render, which is the
   * hydration mismatch §12.2 exists to prevent.
   */
  useEffect(() => {
    if (edited) return
    setDraft(stored ?? '')
  }, [stored, edited])

  useEffect(() => {
    if (touchedMark) return
    setChosen(record.identity.mark ?? 'seeded')
  }, [record.identity.mark, touchedMark])

  const selected = optionFor(chosen)
  const previewName = aliasFrom(draft)

  function onChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const next = event.target.value
    // §12.3.4 — 80 GRAPHEMES, counted with `Intl.Segmenter`. `maxLength` counts
    // UTF-16 units, which charges a joined emoji or a Devanagari cluster for
    // width it does not occupy. The keystroke past the cap is refused; the
    // stored value is never truncated.
    if (countGraphemes(next) > MAX_NAME_GRAPHEMES) return
    setDraft(next)
    setEdited(true)
    setSaved(false)
    // §12.3.3 — the error clears the moment the field becomes usable. The check
    // itself runs on submit only; only the clearing is live.
    if (error && sanitiseName(next) !== '') setError(false)
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const name = aliasFrom(draft)
    if (name === null) {
      setError(true)
      return
    }
    // One write for one gesture: the record holds the name and the mark in one
    // identity block, and `setIdentity` patches both in a single event, so the
    // reader's act and the record's entry are the same shape.
    const mark = storedMark(chosen)
    update((data) => setIdentity(data, { name, mark }, nowIso()), {
      kind: 'setIdentity',
      payload: { named: true, mark },
    })
    setEdited(false)
    setTouchedMark(false)
    setError(false)
    setSaved(true)
  }

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,260px)] md:items-start">
      <div className="grid gap-6">
        <form onSubmit={onSubmit} noValidate className="grid gap-6">
          <label className="hl-field" data-invalid={error ? 'true' : 'false'}>
            {/* Visible and persistent, never a placeholder standing in for a
                label, and optional IN WORDS (§12.3.3). */}
            <span className="hl-field-label">
              Alias, as you would sign a drawing
              <span className="hl-field-optional">Optional</span>
            </span>
            <input
              type="text"
              value={draft}
              onChange={onChange}
              // The WHATWG token for "a typically short name used instead of
              // the full name", which also satisfies SC 1.3.5.
              autoComplete="nickname"
              autoCapitalize="off"
              spellCheck={false}
              dir="auto"
              aria-describedby={error ? 'hl-alias-hint hl-alias-error' : 'hl-alias-hint'}
            />
          </label>

          {/* §12.1.7, §15.9.1 — where the name goes, from the one module that
              is allowed to say so. Not restated here in this screen's own
              words: four copies of this claim is how all four came to be
              wrong. */}
          <p className="hl-field-hint" id="hl-alias-hint">
            {NAME_SCOPE}
          </p>

          {/* GOV.UK register: imperative, and it describes the fix. No verdict
              on the input, and it names the other way out rather than implying
              the field has to be filled (§12.3.3, §15.4.5). */}
          {error && (
            <p className="hl-field-error" id="hl-alias-error" role="alert">
              Enter an alias, or read without one
            </p>
          )}

          {/* Native radios inside `role="radiogroup"`, for `MarkPicker`'s
              reasons: arrow-key navigation, one tab stop, the platform's own
              forced-colors rendering, and a checked state the browser draws
              rather than a `box-shadow` that forced-colors deletes. The
              explicit role overrides `<fieldset>`'s implicit `group`. */}
          <fieldset
            role="radiogroup"
            aria-labelledby="hl-alias-mark-legend"
            className="m-0 border-0 p-0"
          >
            <legend id="hl-alias-mark-legend" className="hl-field-label">
              Approval mark
            </legend>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STORABLE_MARK_IDS.map((id) => {
                const option = optionFor(id)
                return (
                  <label
                    key={id}
                    /* §10.4 — the 44px target, MEASURED as missing by 2px: at
                       390px this row came to 42 (`p-2` twice, a 24px stamp, a
                       hairline on each edge), and nothing was failing on it.
                       `min-h-11` is `RolePicker`'s spelling of the same floor
                       and `max-md:` is where `.hl-icon-btn` applies it, so the
                       floor lands below 768px only: `items-center` absorbs the
                       two spare pixels, so the stamp and the label do not move
                       and the drawn grid above 768px is untouched. */
                    className="flex max-md:min-h-11 items-center gap-2 border border-line-strong bg-cleared p-2"
                    data-hl-mark={id}
                    data-hl-selected={chosen === id ? 'true' : 'false'}
                  >
                    <input
                      type="radio"
                      name="hl-alias-mark"
                      value={id}
                      checked={chosen === id}
                      onChange={() => {
                        setChosen(id)
                        setTouchedMark(true)
                        setSaved(false)
                      }}
                      // record.css authors no radio rule and this file may not
                      // add one, so the control keeps its native appearance and
                      // takes the accent through `accent-color`.
                      style={{ accentColor: 'var(--color-accent)' }}
                      className="h-[14px] w-[14px] shrink-0"
                    />
                    <DrafterStamp mark={storedMark(id)} seed={seed} />
                    <span className="hl-mark text-ink">{option.label}</span>
                  </label>
                )
              })}
            </div>

            {/* The chosen option describes itself, from `MARKS`. Enumerating
                the eight here would give one vocabulary two authors, and the
                count in a sentence like "seven are drafting symbols" is a count
                nobody measured. */}
            <p className="mt-2 mb-0 font-display text-meta leading-normal text-ink-muted">
              {selected.description}
            </p>

            {chosen === 'seeded' && seed === null && (
              <p className="hl-mark m-0 mt-1 text-ink-faint">{NO_SEED}</p>
            )}
          </fieldset>

          {/* §15.4.5 — two controls of one weight. Both are `.hl-btn`, the same
              height and the same border, and the exit is beside the keep rather
              than in grey text beneath it: reading with no alias is a choice
              the screen has no standing to discourage. Neither takes
              `aria-pressed` or `.hl-btn-danger`; the accent means signed off
              (T1) and nothing here is a sign-off. */}
          <div className="hl-signoff-actions">
            <button type="submit" className="hl-btn">
              KEEP THIS ALIAS
            </button>
            <Link className="hl-btn" href="/">
              READ WITHOUT ONE
            </Link>
            {/* A readout, not praise: the record logged it, and that is the
                whole of what is worth saying (§12.5.7). Gated on `hydrated` so
                it can only follow a write this session made. */}
            {saved && hydrated && (
              <span className="hl-mark text-ink-muted" role="status">
                NAME ON RECORD
              </span>
            )}
          </div>
        </form>

        <div className="hl-note">
          <p>
            An alias can be carried into an account later. Signing in from this
            browser takes the name and the mark with the record, and the name
            becomes the row your organisation&rsquo;s roster prints instead of the
            first eight characters of a user id.
          </p>
          <p>
            <Link href="/sign-in/">
              The two account doors, and what each one adds
            </Link>
            .
          </p>
        </div>
      </div>

      {/* The artefact, not a form preview (§15.4.3). `.hl-title-block` is the
          block a sheet prints, so what is on screen here is the thing being
          chosen. The label is written out rather than imported from
          `lib/content/title-block.ts`: that module reaches `node:fs` through
          `derive.ts` and this island may not (§12.2, §15.4.4). */}
      <aside aria-label="Your stamp, as a sheet will print it" className="hl-title-block">
        <div className="hl-title-block-head hl-mark">Checked by</div>

        <div className="grid justify-items-center gap-2 px-3 py-4">
          <DrafterStamp mark={storedMark(chosen)} seed={seed} size={PREVIEW_SIZE} />
          {previewName === null ? (
            <p className="hl-mark m-0 text-ink-muted">{UNSIGNED}</p>
          ) : (
            // As typed, not uppercased: CSS `text-transform` cases off the
            // element's `lang`, and `ilker` under `lang="en"` uppercases to a
            // dotless I where a Turkish reader expects İ (§12.3.4).
            <bdi dir="auto" className="hl-identity-name text-center">
              {previewName}
            </bdi>
          )}
        </div>

        <dl className="hl-title-block-rows">
          <div className="hl-title-block-row hl-mark">
            <dt>Mark</dt>
            <dd>{selected.label}</dd>
          </div>
          {/* The seed row is a fact about the minted pattern, so it is absent
              for a named glyph and absent before the seed exists — never a
              hollow row and never a plausible-looking placeholder (§11.25). */}
          {chosen === 'seeded' && seed !== null && (
            <div className="hl-title-block-row hl-mark">
              <dt>Seed</dt>
              <dd className="normal-case">{seed}</dd>
            </div>
          )}
          <div className="hl-title-block-row hl-mark">
            <dt>Held in</dt>
            <dd>THIS BROWSER</dd>
          </div>
          <div className="hl-title-block-row hl-mark">
            {/* Colour is never the only signal: the word is the signal, and the
                caution ink only agrees with it (T6). */}
            <dt>Status</dt>
            <dd className="text-caution-ink">{UNVERIFIED}</dd>
          </div>
        </dl>
      </aside>
    </div>
  )
}
