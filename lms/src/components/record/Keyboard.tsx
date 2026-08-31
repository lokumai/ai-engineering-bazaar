'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  DIALOG_SELECTOR,
  IDLE,
  PENDING_LABEL,
  PENDING_TIMEOUT_MS,
  SIGN_OFF_ATTR,
  expirePending,
  resolveKey,
  routeFor,
  type DescribedKey,
  type KeyAction,
  type KeyState,
} from '@/lib/record/keys'
import { useRecord } from '@/lib/record/store'
import { applyTheme, nextTheme, readTheme, type ThemeStorage } from '@/lib/theme'
import { href } from '@/lib/url'
import { ShortcutSheet } from './ShortcutSheet'

/**
 * §12.16 — the site-wide keyboard map, as DOM wiring and nothing else.
 *
 * Every decision — the modifier guard, the IME guard, the typing-surface guard,
 * the dialog guard, SC 2.1.4's off switch, and the `g` mode's whole state
 * machine — lives in `lib/record/keys.ts`, following the rule
 * `lib/figure/zoom.ts` states for itself. What is left here is reading five
 * fields off a `KeyboardEvent` and doing the thing.
 *
 * **Three of §12.16's keys belong to the sheet, not to the shell.** `[` / `]`
 * are the sheet either side of this one, `j` / `k` are this sheet's sections,
 * and `s` is this sheet's sign-off assertion — none of which the header knows.
 * Rather than drill page data through every route into the layout, the island
 * resolves them against the DOM the page already rendered: `PrevNext` emits
 * `rel="prev"` / `rel="next"` on its links (a standard, not a private
 * contract), the sections are the `id`-bearing headings inside `<main>`, and the
 * sign-off control carries `SIGN_OFF_ATTR`. Where the page has none of these
 * the key does nothing, which is the truth on a listing page and on a draft
 * sheet (§12.4.1).
 *
 * **Nothing here renders reader state.** `charKeys` decides whether the handler
 * acts, never what is drawn, and the pending badge exists only after a
 * keystroke — so the prerendered markup and the first client render agree, which
 * is the whole of §12.2's channel B obligation for an island that is not a
 * readout.
 */

/** §5.6's inset: the sticky header plus the clearance the rails keep from it. */
const HEADING_INSET = 80

/** A heading is "reached" once its top is within a pixel of the inset. */
const EPSILON = 1

/** Reading `window.localStorage` itself throws in some privacy modes. */
function safeStorage(): ThemeStorage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** The five fields the guards read, and not one more. */
function describe(event: KeyboardEvent): DescribedKey {
  const node = event.target
  const element = node instanceof Element ? node : null
  return {
    key: event.key,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    altKey: event.altKey,
    isComposing: event.isComposing,
    target: {
      tagName: element?.tagName ?? '',
      isContentEditable: element instanceof HTMLElement && element.isContentEditable,
      inDialog: element !== null && element.closest(DIALOG_SELECTOR) !== null,
    },
  }
}

/**
 * §9.2 — freeze transitions, flip, unfreeze on the next frame, so the colours
 * snap. The same three lines the header's control runs, through the same module:
 * one owner of the `dark` class, two callers.
 */
function toggleTheme(): void {
  const root = document.documentElement
  const release = applyTheme(nextTheme(readTheme(root)), root, safeStorage())
  requestAnimationFrame(release)
}

/**
 * `j` / `k` — the next or previous section of this sheet, scrolled to the same
 * inset the section spine measures against, so the key and the spine agree
 * about which section the reader is in. The spine updates itself from its own
 * observer and `scrollend` (§5.6); nothing is told anything.
 *
 * Instant, never smoothed: §9.1 prohibits the motion, and a reader holding `j`
 * to get down a long sheet is trying to outrun exactly that animation.
 */
function moveSection(step: 'prev' | 'next'): void {
  const headings = [...document.querySelectorAll<HTMLElement>('main h2[id], main h3[id]')]
  if (headings.length === 0) return

  const tops = headings.map((heading) => heading.getBoundingClientRect().top)

  let index = -1
  if (step === 'next') {
    index = tops.findIndex((top) => top > HEADING_INSET + EPSILON)
  } else {
    for (let i = tops.length - 1; i >= 0; i -= 1) {
      if (tops[i] < HEADING_INSET - EPSILON) {
        index = i
        break
      }
    }
  }
  if (index === -1) return

  window.scrollTo({ top: window.scrollY + tops[index] - HEADING_INSET })
}

/** `[` / `]` — `PrevNext`'s own links, found by the relation they declare. */
function openRelated(step: 'prev' | 'next'): void {
  document.querySelector<HTMLAnchorElement>(`main a[rel="${step}"]`)?.click()
}

/**
 * A `g` chord's destination.
 *
 * `useRouter()` is deliberately not used, and the reason is not convenience.
 * It throws its "expected app router to be mounted" invariant during *render*,
 * which would make the whole header — the one surface that ships the
 * state-independent mascot — impossible to render outside a mounted router, and
 * §12.14.2 pins the server markup of every new component with
 * `renderToStaticMarkup` and no framework harness. `lib/url.ts` exists for
 * exactly this case in its own words: anything that resolves a URL the Next
 * router does not touch goes through `href()`, which is what applies
 * `basePath`. The cost is a document load instead of a client transition, on a
 * site that is a set of documents.
 */
function go(path: string): void {
  window.location.assign(href(path))
}

export function Keyboard() {
  const pathname = usePathname() ?? '/'
  const { charKeys } = useRecord().prefs
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<KeyState['pending']>(null)

  /**
   * The machine is a ref as well as state: the handler must read the current
   * mode without the listener being re-installed on every keystroke, and the
   * badge needs a render. One source, two readers.
   */
  const machine = useRef<KeyState>(IDLE)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function clearPendingTimer(): void {
      if (timer.current === null) return
      clearTimeout(timer.current)
      timer.current = null
    }

    function commit(next: KeyState): void {
      machine.current = next
      setPending(next.pending)
      clearPendingTimer()
      if (next.pending === null) return
      // SC 2.1.1 — nothing may depend on keystroke timing, so the mode is held
      // for §12.16's full window and shown while it is held.
      timer.current = setTimeout(() => {
        commit(expirePending(machine.current))
      }, PENDING_TIMEOUT_MS)
    }

    function perform(action: KeyAction): void {
      switch (action.kind) {
        case 'nav': {
          const to = routeFor(action.target, pathname)
          if (to !== null) go(to)
          return
        }
        case 'sheet':
          openRelated(action.step)
          return
        case 'section':
          moveSection(action.step)
          return
        case 'theme':
          toggleTheme()
          return
        case 'sign-off':
          document.querySelector<HTMLElement>(`[${SIGN_OFF_ATTR}]`)?.click()
          return
        case 'shortcuts':
          setOpen(true)
          return
        case 'close':
          // Radix closes on `Esc` itself; this keeps the two in step when the
          // key was pressed with focus outside the panel.
          setOpen(false)
          return
      }
    }

    function onKeyDown(event: KeyboardEvent): void {
      const result = resolveKey(machine.current, describe(event), { charKeys })
      if (result.handled) event.preventDefault()
      if (result.state !== machine.current) commit(result.state)
      if (result.action !== null) perform(result.action)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      clearPendingTimer()
    }
  }, [charKeys, pathname])

  return (
    <>
      <ShortcutSheet
        open={open}
        onOpenChange={setOpen}
        pathname={pathname}
        charKeys={charKeys}
      />
      {pending !== null && (
        // §12.16 — the mode is visible while it is held. `role="status"` because
        // SC 4.1.3 covers exactly this: a state change with no focus move.
        <div role="status" className="hl-pending font-mono text-mark tracking-[0.06em]">
          {PENDING_LABEL}
        </div>
      )}
    </>
  )
}
