'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useWriteState } from '@/lib/record/store'

/**
 * §12.13 — empty states, in four classes.
 *
 * They answer different questions and must not share copy, which is the whole
 * reason this is a discriminated union rather than one component with an
 * optional message. "Nothing has ever been recorded", "you erased this
 * yourself", "your filter excluded everything" and "this browser will not let
 * this site store anything" are four different facts, and a single reassuring
 * paragraph over all four is three lies.
 *
 * Every class carries the NN/g triad and nothing else: **a status readout, a
 * learning cue naming what will occupy the space, and exactly one path out.**
 * No illustration. **No mascot** — §8.5 forbids it waving from an empty state,
 * and the dashboard's own empty state is one unenergized cube.
 *
 * **Class 4 is the one that gets forgotten, and it is not hypothetical.**
 * `localStorage` throws `SecurityError` when the reader has configured the
 * browser not to persist data, and blocking cookies is commonly interpreted as
 * exactly that instruction. Without this class a reader can sign off sheets and
 * silently lose all of it while the page says nothing — the §1 failure in its
 * purest form. `data-hl-storage`, stamped on `<html>` by the pre-paint boot
 * script (§12.2 channel A), is what tells class 4 from class 1: both show an
 * empty record, and only one of them can be fixed by carrying on.
 *
 * Reading that attribute is a browser read, so it happens in an effect and the
 * state it fills starts `false` — a constant the server computes identically
 * (§12.2). The effect also re-runs on `useWriteState`, because a write refused
 * with `QuotaExceededError` or a blocked storage access re-stamps the attribute
 * after the fact: the store learns the truth at the first write, not always at
 * boot.
 *
 * §12.13's live-region split is followed exactly: the filter count and the
 * no-match state go in `role="status"`, errors in `role="alert"`. SC 4.1.3 is
 * Level AA and its own examples are literally "5 results returned" / "No
 * results returned", so the count itself is announced rather than a description
 * of it.
 */

export type EmptyStateSpec =
  /** Class 1 — nothing has ever been recorded. The index at zero data. */
  | { kind: 'never-started'; of: number; firstSheet: { label: string; path: string } }
  /** Class 2 — the reader erased their own record (§12.15). */
  | { kind: 'cleared'; of: number; on: string | null }
  /**
   * Class 3 — a filter excluded every row. Its single path is an action rather
   * than a route, so the callback is part of the state: the filter lives in the
   * caller's own component, and §12.13's "exactly one path" is not satisfiable
   * without it. Only ever constructed inside a client component, which is what
   * lets a function sit in this union at all (§12.2).
   */
  | { kind: 'no-match'; matched: number; of: number; clear: () => void }
  /** Class 4 — the storage access threw. */
  | { kind: 'storage-unavailable' }

interface Copy {
  status: string | null
  cue: string | null
  path: { label: string; path: string } | null
  /** §12.13 — counts and no-match in `status`, errors in `alert`. */
  live: 'status' | 'alert' | null
}

/**
 * The four string tables, in one place so §12.14.1's copy-register test has one
 * thing to scan. Zero exclamation marks, no praise, no anthropomorphism, and no
 * "just" / "simply" / "easy" / "please" / "sorry" anywhere in them.
 */
export function emptyStateCopy(state: EmptyStateSpec): Copy {
  switch (state.kind) {
    case 'never-started':
      return {
        status: `SIGNED OFF 00 / ${String(state.of).padStart(2, '0')}`,
        cue:
          'Sheets you sign off are drawn with a solid outline. Nothing is '
          + 'signed off yet.',
        path: state.firstSheet,
        live: null,
      }
    case 'cleared':
      return {
        status: `SIGNED OFF 00 / ${String(state.of).padStart(2, '0')}`,
        // The date is the reader's own act, and it is absent rather than
        // guessed when the erase left no instant behind (§11.25).
        cue:
          state.on === null
            ? "You erased this browser's record."
            : `You erased this browser's record on ${state.on.slice(0, 10)}.`,
        path: { label: 'Import a record from a file', path: '/profile/' },
        live: null,
      }
    case 'no-match':
      // §12.13's table gives class 3 a status and a path and no cue: the space
      // is not waiting to be occupied by anything, the rows exist and the
      // filter is hiding them. Inventing a third line here would be copy the
      // spec did not write.
      return {
        status: `NO SHEETS MATCH FILTER — ${state.matched} of ${state.of}`,
        cue: null,
        path: null,
        live: 'status',
      }
    case 'storage-unavailable':
      return {
        // §12.1.6 — the queried answer, in its own vocabulary. Never a value
        // that has not been queried, and the boot script queried this one.
        status: 'STORAGE: UNAVAILABLE',
        cue:
          'This browser is not letting this site store data, so nothing can be '
          + 'recorded. Private windows and blocked cookies both do this.',
        // §12.13 — export stays available, and §12.13's last rule is that it is
        // never disabled at zero data: the exported document states the truth.
        path: { label: 'Export what is in memory', path: '/profile/' },
        live: 'alert',
      }
  }
}

export function EmptyState({ state }: { state: EmptyStateSpec }) {
  const writeState = useWriteState()
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    try {
      setBlocked(document.documentElement.dataset.hlStorage === 'blocked')
    } catch {
      // An attribute this page could not read is not worth an exception, and
      // "unknown" is not "blocked": the state stays as the server drew it.
    }
  }, [writeState])

  // Class 4 outranks classes 1 and 2, because both of them are also true and
  // only class 4 explains why. It does NOT outrank class 3: a filter that
  // matched nothing is a fact about the filter, and storage has no part in it.
  const effective: EmptyStateSpec =
    blocked && state.kind !== 'no-match' ? { kind: 'storage-unavailable' } : state
  const copy = emptyStateCopy(effective)

  /**
   * The live role sits on real content, never on a wrapper whose role appears
   * later. Class 4 is reached by escalation, so its `role="alert"` element is
   * newly inserted WITH its text already in it, which is the only form
   * assistive technology reliably announces; adding a role to an element that
   * was already on screen is not.
   */
  const lines = (
    <>
      {copy.status !== null && (
        <p
          className="hl-mark hl-empty-status m-0"
          role={copy.live === 'status' ? 'status' : undefined}
        >
          {copy.status}
        </p>
      )}
      {copy.cue !== null && <p className="hl-empty-cue">{copy.cue}</p>}
    </>
  )

  return (
    <div className="hl-empty" data-hl-empty={effective.kind}>
      {copy.live === 'alert' ? (
        <div role="alert" className="grid gap-2">
          {lines}
        </div>
      ) : (
        lines
      )}
      {effective.kind === 'no-match' ? (
        <button
          type="button"
          className="hl-btn hl-empty-path"
          onClick={effective.clear}
        >
          Clear the filter
        </button>
      ) : (
        copy.path !== null && (
          <Link className="hl-btn hl-empty-path" href={copy.path.path}>
            {copy.path.label}
          </Link>
        )
      )}
    </div>
  )
}
