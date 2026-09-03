'use client'

import { useMemo, useState } from 'react'

import { pathStanding } from '@/lib/path/derive'
import { PATHS, drawnCount } from '@/lib/path/paths'
import { ROLES, type RoleId } from '@/lib/path/roles'
import { setRole } from '@/lib/record/events'
import { nowIso, update, useHydrated, useRecord } from '@/lib/record/store'
import { plural } from '@/lib/text'

/**
 * §13.3, §13.4.3 item 1 — the nine roles, as a radio group.
 *
 * **The option list and the blurbs are self-contained on purpose.** `/path/`
 * and `/profile/` both render it, and neither owns it: they come from
 * `lib/path/`, which imports nothing (§12.2's import direction), so there is no
 * second vocabulary to drift.
 *
 * **Which sheets are drawn is the one thing that has to be drilled in.** It is
 * `status: ready` in the corpus, which only `lib/content/` can read, and this is
 * a client island: a single value imported across that line pulls `node:fs`
 * into the browser bundle and stops the build (§12.2). So `drawnSlugs` arrives
 * as a serialised prop from the server page. Every count here is still derived
 * by `drawnCount`, never typed (§11.25).
 *
 * **Native radios inside `role="radiogroup"`**, the arrangement `MarkPicker`
 * documents. A group of same-named `<input type="radio">` gives arrow-key
 * navigation, a single tab stop, the `radio` role and the platform's own
 * forced-colors rendering for nothing, and each of those is something a
 * hand-rolled listbox gets subtly wrong (SC 2.1.1). Each option's hit area is a
 * `<label>` at 44px minimum on both axes, which is SC 2.5.8's enhanced target
 * rather than the 24×24 floor (§13.11).
 *
 * The blurb sits OUTSIDE the `<label>` and is wired with `aria-describedby`,
 * the correction `MarkPicker` and `Submittal` both record: an implicit label
 * names its control from its whole text content, so a description inside it
 * would be read out as part of the option's name.
 *
 * **Changing role is not destructive and never warns** (§13.3). A path is a
 * view over the corpus, not a container: sign-offs are recorded against sheets,
 * so switching from `qa` to `devops` loses nothing and §12's SC 3.3.4
 * confirmation gate — which is for destructive actions — does not apply. There
 * is no dialog here, and its absence is the decision.
 *
 * **A role is never inferred** (§13.3). The only way this component writes one
 * is a reader pressing one of the nine radios; nothing here reads the name, the
 * sheets signed off, or anything else, and `lib/path/roles.ts` records why
 * there is no function anywhere in that directory that could.
 *
 * §12.2 channel B: `useRecord()` returns the frozen `EMPTY_RECORD` on the server
 * and in the first client render, so the prerendered group takes its checked
 * state from the `role` prop — which is the caller's build-time knowledge, and
 * on a static page can only ever be `null`, the record's own default and true of
 * every reader who has not chosen. Once the store has answered, the record is
 * the only truth and the group follows it; that is also what makes the status
 * line below correct rather than a guess.
 *
 * SC 4.1.3 — choosing a role announces the new standing through the
 * `role="status"` readout at the foot of the group. It is here rather than left
 * to `PathStanding` because this element stays on screen across the choice,
 * while the path bodies are swapped by channel A the instant the record is
 * written.
 *
 * **It is silent until the reader chooses, and the first version was not.**
 * Driving the page found two visible live regions both stating the same count on
 * load — this one and `PathStanding`'s — so a screen reader heard the standing
 * twice for a page nobody had touched. SC 4.1.3 is about a CHANGE in status, not
 * about initial content: content that is simply present is read by the document
 * order it sits in. So the announcement is gated on `chosen`, set only by the
 * change handler, and the region stays empty (but present, so it is already in
 * the accessibility tree when it fills) until the reader's own act fills it.
 */

/** `--` is the instrument convention for "no reading", and it is true. */
const NO_READING = '--'

export interface RolePickerProps {
  /**
   * The role the caller knows about at render time, and the checked state the
   * prerender carries. `null` is the whole of "has not said" and is the
   * record's default (§13.3). After the store answers, the record wins.
   */
  role?: RoleId | null
  /** Scopes the radio group's name and its ids when a page holds two. */
  idPrefix?: string
  /**
   * The slugs the corpus says are drawn. Required, not optional: a default of
   * `[]` would print `0 sheets drawn` beside all nine roles and look like a
   * finished page, which is the failure §11.25 is about.
   */
  drawnSlugs: readonly string[]
}

/** §13.4.2 — the count an option may state: drawn steps, never the whole list. */
function drawnOn(role: RoleId, drawnSlugs: ReadonlySet<string>): number {
  const path = PATHS.find((candidate) => candidate.role === role)
  return path === undefined ? 0 : drawnCount(path, drawnSlugs)
}

export function RolePicker({
  role = null,
  idPrefix = 'hl-role',
  drawnSlugs,
}: RolePickerProps) {
  const record = useRecord()
  const hydrated = useHydrated()
  const drawnSet = useMemo(() => new Set(drawnSlugs), [drawnSlugs])

  // The prop is the prerender's answer; the record is the reader's. They agree
  // in the first client render because `EMPTY_RECORD.identity.role` is null and
  // a static page cannot have known any better (§12.2).
  /**
   * Whether the reader has picked a role IN THIS VISIT. It gates the live
   * region alone — never what is checked, never what is stored — because a
   * status message announces a change and there has been none until this is
   * true.
   */
  const [chosen, setChosen] = useState(false)

  const selected = hydrated ? record.identity.role : role
  const legendId = `${idPrefix}-legend`
  const statusId = `${idPrefix}-standing`

  function choose(id: RoleId): void {
    update((data) => setRole(data, id, nowIso()), { kind: 'setRole', payload: { role: id } })
    setChosen(true)
  }

  const path = selected === null ? undefined : PATHS.find((one) => one.role === selected)
  const standing = path === undefined ? null : pathStanding(path, record, drawnSet)
  const label = ROLES.find((one) => one.id === selected)?.label ?? null

  return (
    <fieldset role="radiogroup" aria-labelledby={legendId} className="m-0 border-0 p-0">
      <legend id={legendId} className="hl-field-label">
        Role
      </legend>

      <div className="grid gap-2 sm:grid-cols-2">
        {ROLES.map((option) => {
          const blurbId = `${idPrefix}-${option.id}-blurb`
          const drawn = drawnOn(option.id, drawnSet)
          return (
            <div
              key={option.id}
              className="border border-line-strong bg-cleared p-3"
              data-hl-role={option.id}
              data-hl-selected={selected === option.id ? 'true' : 'false'}
            >
              {/* SC 2.5.8 — 44px on both axes, hit area included, which is what
                  `min-h-11` and the padding above buy together. */}
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="radio"
                  name={idPrefix}
                  value={option.id}
                  checked={selected === option.id}
                  onChange={() => choose(option.id)}
                  aria-describedby={blurbId}
                  // The same rule `MarkPicker` records: no stylesheet in this
                  // build authors a radio, and this file may not add one, so the
                  // control keeps its native appearance and takes the accent
                  // through `accent-color` — which the platform draws and
                  // forced-colors overrides correctly (§12.17).
                  style={{ accentColor: 'var(--color-accent)' }}
                  className="h-[14px] w-[14px] shrink-0"
                />
                <span className="hl-mark text-ink">{option.label}</span>
              </label>

              <p
                id={blurbId}
                className="mt-1 mb-0 font-display text-meta leading-normal text-ink-muted"
              >
                {option.blurb}
              </p>

              {/* §13.4.2 — the path's DRAWN step count, which is also its
                  denominator. A draft step is on the path and out of the count,
                  because a sheet nobody has written cannot be signed off. */}
              <p className="hl-mark m-0 mt-1 text-ink-faint">
                {plural(drawn, 'sheet')} drawn
              </p>
            </div>
          )
        })}
      </div>

      {/* SC 4.1.3. Empty until the reader picks a role in this visit: with no
          role there is no standing to state, and with a role already stored
          there has been no change to announce — `PathStanding` prints that
          reading, and two live regions saying it at once is what this gate
          exists to prevent. */}
      <p
        id={statusId}
        role="status"
        className="hl-mark mt-2 mb-0 min-h-[1.5em] text-ink-muted"
        data-hydrated={hydrated ? 'true' : 'false'}
      >
        {chosen && label !== null && standing !== null && (
          <>
            {label} ·{' '}
            <span className="text-ink">
              {hydrated ? standing.remaining : NO_READING} of {standing.drawn}
            </span>{' '}
            remaining on this path
          </>
        )}
      </p>

      {/* §13.3 — stated where the control is, because the alternative reading
          is that switching costs the reader their record. */}
      <p className="mt-2 mb-0 font-display text-meta leading-normal text-ink-muted">
        A path is a view over the sheets, not a container. Changing role changes
        the order this site recommends and nothing else: sign-offs are recorded
        against sheets, so none of them move.
      </p>
    </fieldset>
  )
}
