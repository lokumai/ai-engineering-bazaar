'use client'

import { useEffect, useMemo } from 'react'
import {
  PATH_BODY_ATTR,
  PATH_NEXT_ATTR,
  PATH_STEP_ATTR,
} from '@/components/path/PathSteps'
import { pathStanding } from '@/lib/path/derive'
import { PATHS } from '@/lib/path/paths'
import type { RoleId } from '@/lib/path/roles'
import { useHydrated, useRecord } from '@/lib/record/store'

/**
 * §13.4.3 item 2 and §13.8 — one path's standing, and the marker on the step to
 * take next.
 *
 * **Channel B, and it could not be anything else** (§12.2). A tally is a
 * computed number, so it cannot travel on the pre-paint class stamp: the server
 * renders the honest no-reading form and the figures arrive post-mount.
 * `useRecord()` returns the frozen `EMPTY_RECORD` on the server and in the
 * first client render, and `useHydrated()` is what tells "nothing signed off"
 * from "not yet known" — the first prints `0`, the second prints `--`, and only
 * one of those is a fact about this reader. `suppressHydrationWarning` is
 * forbidden here (§12.2): it works one level deep and React will not patch
 * mismatched text, so a suppressed readout keeps showing the build-time value —
 * it would lie rather than flicker.
 *
 * **The denominator is printed in frame one, and the numerator is not.** The
 * count of drawn steps on this path is a fact about the corpus that the build
 * knows, so `n of 12` prints its 12 immediately; only the reader's half dashes.
 * A dash for the whole fraction would be §11.25 in reverse — refusing a number
 * somebody did count.
 *
 * **TO GO leads** (§13.8, §11.35). `4 of 12 remaining on this path`, never a
 * percentage: §11.35 forbids one outright, and to-go framing is what sustains
 * effort mid-task where reporting the position reached does not. The path's
 * denominator counts DRAWN steps only (§13.4.2), which `pathStanding` decides —
 * a draft step cannot be signed off, so counting it would ask the reader to
 * finish sheets nobody has written.
 *
 * **The next-step marker is the second thing this island exists for.** "Next"
 * means "first unsigned drawn step", which is a computation over the whole list
 * and has no CSS selector, so the prerender marks no step at all — honest,
 * because the build genuinely cannot know — and this sets `data-next="true"` on
 * exactly one `<li>` after mount, scoped to its own role's body. The DOM write
 * is `SignOffMarks`' pattern: the server states a contract in the markup and one
 * island paints it, rather than nine islands hydrating 124 steps.
 *
 * It imports nothing from `lib/content/` (§12.2, R3): those modules reach
 * `node:fs` and this one runs in the browser. `lib/path/` and `lib/record/` are
 * leaves for exactly that reason, which is why the path data can be read here
 * directly instead of being drilled through as props.
 *
 * It has no voice (§13.8, §12.14.1): it states two counts and never comments on
 * them.
 */

/** `--` is the instrument convention for "no reading", and it is true. */
const NO_READING = '--'

export interface PathStandingProps {
  /** Whose path this is. The body it sits in carries the same id (§13.4.3). */
  role: RoleId
  /**
   * The slugs the corpus says are drawn, serialised down from the page. It is
   * `status: ready` in the markdown, so only `lib/content/` can measure it, and
   * this island runs in the browser (§12.2).
   */
  drawnSlugs: readonly string[]
}

export function PathStanding({ role, drawnSlugs }: PathStandingProps) {
  const record = useRecord()
  const hydrated = useHydrated()
  const drawnSet = useMemo(() => new Set(drawnSlugs), [drawnSlugs])

  const path = PATHS.find((candidate) => candidate.role === role)
  const standing = path ? pathStanding(path, record, drawnSet) : null

  /**
   * Scoped to this role's body: all nine are in the prerendered document, and
   * an unscoped selector would mark a step in the eight paths this reader is
   * not on. Cleared as well as set — a sign-off moves the marker, and a stale
   * `data-next` would be a second "take this next" on the same page (§1).
   */
  useEffect(() => {
    const body = document.querySelector<HTMLElement>(
      `[${PATH_BODY_ATTR}="${role}"]`,
    )
    if (body === null) return

    const next = standing?.nextSlug ?? null
    for (const step of body.querySelectorAll<HTMLElement>(`[${PATH_STEP_ATTR}]`)) {
      if (step.getAttribute(PATH_STEP_ATTR) === next) {
        step.setAttribute(PATH_NEXT_ATTR, 'true')
      } else {
        step.removeAttribute(PATH_NEXT_ATTR)
      }
    }
  }, [role, standing?.nextSlug])

  // A role with no authored path states that rather than printing zeros
  // (§11.25). `tests/unit/path/paths.test.ts` asserts all nine exist, so this
  // is the behaviour under a renamed role id, not a state the site ships in.
  if (standing === null) {
    return (
      <p className="hl-readout" data-hydrated="false">
        <span>No path is authored for this role</span>
      </p>
    )
  }

  const remaining = hydrated ? String(standing.remaining) : NO_READING
  const signed = hydrated ? String(standing.signed) : NO_READING

  return (
    <p
      className="hl-readout m-0"
      // SC 4.1.3 — the figures change when a sheet on this path is signed off,
      // and the change is worth announcing where it is worth printing.
      role="status"
      data-hydrated={hydrated ? 'true' : 'false'}
      data-hl-path-standing={role}
    >
      <span>
        <span className="hl-readout-value hl-readout-togo">
          {remaining} of {standing.drawn}
        </span>{' '}
        remaining on this path
      </span>
      <span aria-hidden="true" className="hl-readout-sep">
        ·
      </span>
      <span>
        Signed off{' '}
        <span className="hl-readout-value">
          {signed} of {standing.drawn}
        </span>
      </span>
    </p>
  )
}
