/**
 * §12.16 — the keyboard map, as arithmetic.
 *
 * `lib/figure/zoom.ts` states the rule this file follows: the arithmetic lives
 * here so the island holds nothing but DOM wiring. Every guard §12.16 names is
 * a decision over a *described* event rather than over a `KeyboardEvent`, so a
 * modifier chord, an IME's intermediate keystroke, a focused textarea, an open
 * dialog, an expired `g` and the SC 2.1.4 off switch are all testable in node
 * with no DOM (§12.14.2). The island reads four booleans off the event and one
 * `closest()` off the target, and decides nothing.
 *
 * This module imports nothing — §12.2's import direction. `lib/content/`
 * reaches `node:fs` and a client island holds this file, so a single value
 * carried across that line would pull `node:fs` into the browser bundle and
 * stop the build.
 *
 * Two rules govern the map itself and both are conformance, not taste:
 *
 * 1. **Every single-character shortcut is behind `prefs.charKeys`.** That is
 *    SC 2.1.4's off switch, and `?` is itself a character shortcut, so it is
 *    inside the gate rather than exempt from it. Modifier chords keep working
 *    when the gate is shut, which is why the modifier guard returns before it.
 * 2. **`g` is a mode, not a race.** It sets a visible pending state cleared by
 *    `Escape`, by any non-matching key, or by a timeout of at least 2 s. SC
 *    2.1.1 requires operation without specific keystroke timings, so a tight
 *    sub-second window is a conformance risk as well as a usability one.
 */

/** §12.16 — the five `g` destinations. `category` depends on the route. */
export type NavTarget = 'dashboard' | 'index' | 'profile' | 'record' | 'category'

/**
 * What a resolved key asks the island to do. Three of these need page context
 * the shell does not hold — the sheet either side of this one, the sections of
 * this sheet, this sheet's sign-off control — so the island resolves them
 * against the DOM the page already rendered rather than against a prop drilled
 * through every route.
 */
export type KeyAction =
  | { kind: 'nav'; target: NavTarget }
  | { kind: 'sheet'; step: 'prev' | 'next' }
  | { kind: 'section'; step: 'prev' | 'next' }
  | { kind: 'theme' }
  | { kind: 'sign-off' }
  | { kind: 'shortcuts' }
  | { kind: 'close' }

/** The whole machine: whether `g` has been pressed and is waiting. */
export interface KeyState {
  pending: 'g' | null
}

export const IDLE: KeyState = Object.freeze({ pending: null })
export const PENDING_G: KeyState = Object.freeze({ pending: 'g' as const })

/**
 * §12.16 / SC 2.1.1 — "cleared by … a **2 s or longer** timeout". The floor is
 * two seconds; the extra second costs nothing and it is spent on the reader who
 * pressed `g` and is now looking at the keyboard for the second key.
 */
export const PENDING_TIMEOUT_MS = 3000

/**
 * What the pending state prints (§12.16: "a pending state shown in the
 * readout"). Lower case, because `g` is the key as the map writes it and a
 * shortcut hint that does not match the key you press is not a hint.
 */
export const PENDING_LABEL = 'g …'

/**
 * The one DOM contract this map needs from a page: `s` toggles sign-off, and
 * the sign-off control lives on the sheet, not in the shell. The island clicks
 * the element carrying this attribute, so the sheet keeps the whole of the
 * assertion — the criteria, the date, the revision — and the shortcut carries
 * none of it. Where no such control exists the key does nothing, which is the
 * truth on a draft sheet (§12.4.1) and on every listing page.
 */
export const SIGN_OFF_ATTR = 'data-hl-signoff'

/**
 * §12.16 — "when the target is `input, textarea, select, [contenteditable]`".
 * Uppercase, because that is what `Element.tagName` returns for HTML.
 */
export const TYPING_TAGS: readonly string[] = ['INPUT', 'TEXTAREA', 'SELECT']

/**
 * §12.16 — "or inside a dialog that owns its keys". Radix gives its content
 * `role="dialog"`, which covers the shortcut sheet, the erase dialog, the
 * contents drawer and the figure overlay in one selector.
 */
export const DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"], dialog'

/** `event.target`, reduced to the three facts the guards actually read. */
export interface DescribedTarget {
  tagName: string
  isContentEditable: boolean
  /** `target.closest(DIALOG_SELECTOR) !== null`. */
  inDialog: boolean
}

/** A `KeyboardEvent`, reduced the same way. */
export interface DescribedKey {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  /**
   * §12.16 — without this an IME user typing Japanese fires the `g` handler on
   * the intermediate keystrokes of a composition they have not committed.
   */
  isComposing: boolean
  target: DescribedTarget
}

export interface Resolution {
  /** The machine after the key. Never a mutation of the state passed in. */
  state: KeyState
  action: KeyAction | null
  /**
   * Whether the island consumed the key. `preventDefault()` follows this, so
   * it is false for every key the map does not own and for `Escape`, which
   * belongs to whichever dialog, drawer or overlay is open.
   */
  handled: boolean
}

/** §12.16 — the second key of the `g` mode, and the only five it accepts. */
const GO: ReadonlyMap<string, NavTarget> = new Map([
  ['d', 'dashboard'],
  ['i', 'index'],
  ['p', 'profile'],
  ['r', 'record'],
  ['c', 'category'],
])

/** §12.16 — every unprefixed key, and nothing else is bound site-wide. */
const KEYS: ReadonlyMap<string, KeyAction> = new Map<string, KeyAction>([
  ['[', { kind: 'sheet', step: 'prev' }],
  [']', { kind: 'sheet', step: 'next' }],
  ['j', { kind: 'section', step: 'next' }],
  ['k', { kind: 'section', step: 'prev' }],
  ['.', { kind: 'theme' }],
  ['s', { kind: 'sign-off' }],
  ['?', { kind: 'shortcuts' }],
])

export function isTypingTarget(target: DescribedTarget): boolean {
  return TYPING_TAGS.includes(target.tagName.toUpperCase()) || target.isContentEditable
}

/** The key passed through untouched: the map does not own it. */
function ignore(state: KeyState): Resolution {
  return { state, action: null, handled: false }
}

/**
 * §12.16, in the order the guards have to run.
 *
 * The modifier guard comes first because SC 2.1.4's off switch turns off
 * *character* shortcuts, and a modifier chord must keep working after it —
 * so `charKeys` cannot be the outermost test. `Escape` comes before the
 * target and `charKeys` guards because §12.16 lets it through everywhere:
 * a reader who has just typed into the erase dialog's confirmation field
 * still has to be able to leave.
 */
export function resolveKey(
  state: KeyState,
  event: DescribedKey,
  prefs: { charKeys: boolean },
): Resolution {
  if (event.ctrlKey || event.metaKey || event.altKey) return ignore(state)
  if (event.isComposing) return ignore(state)

  // Not consumed: the open dialog, drawer or overlay closes itself, and this
  // only clears a `g` the reader has abandoned.
  if (event.key === 'Escape') return { state: IDLE, action: { kind: 'close' }, handled: false }

  if (isTypingTarget(event.target) || event.target.inDialog) return ignore(state)

  // SC 2.1.4. `?` is a character shortcut too, so the sheet listing the map is
  // itself behind the switch that turns the map off.
  if (!prefs.charKeys) return ignore(state)

  if (state.pending === 'g') {
    const target = GO.get(event.key)
    if (target) return { state: IDLE, action: { kind: 'nav', target }, handled: true }
    // §12.16 — "cleared by … any non-matching key". The key is consumed with
    // it: a mistyped chord must not fall through to `.` and flip the theme on
    // a reader who was trying to navigate.
    return { state: IDLE, action: null, handled: true }
  }

  if (event.key === 'g') return { state: PENDING_G, action: null, handled: true }

  const action = KEYS.get(event.key)
  if (action) return { state: IDLE, action, handled: true }

  return ignore(state)
}

/** The timeout fired: the mode is over and nothing happened. */
export function expirePending(state: KeyState): KeyState {
  return state.pending === null ? state : IDLE
}

/**
 * §12.16's destinations. `trailingSlash` is on, so every one of these ends in
 * a slash: without it the router redirects and the shortcut costs a navigation
 * it did not need.
 */
export const ROUTES: Readonly<Record<Exclude<NavTarget, 'category'>, string>> = Object.freeze({
  index: '/',
  dashboard: '/dashboard/',
  profile: '/profile/',
  record: '/report/',
})

/**
 * `g c` — the subsystem the reader is inside, read off the route rather than
 * out of the content: a module sheet and its category page are both under
 * `/courses/<category>/`, and the category is the segment, not a lookup.
 *
 * Null where there is no current category — the index sheet, the drawing set,
 * the dashboard, the profile. `g c` then does nothing, which is the truth;
 * inventing a category to jump to would be §1's failure in one keystroke.
 */
export function categoryPathOf(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean)
  if (segments[0] !== 'courses' || segments.length < 2) return null
  return `/courses/${segments[1]}/`
}

export function routeFor(target: NavTarget, pathname: string): string | null {
  return target === 'category' ? categoryPathOf(pathname) : ROUTES[target]
}

/**
 * §12.16's table, in its order, as the `?` sheet prints it.
 *
 * `target` is what makes each `g` row a plain focusable link rather than a
 * printed keystroke: §12.16 requires every `g` destination to be reachable
 * without the keyboard map, and a row that both names the key and navigates is
 * the same fact stated once.
 *
 * The copy register is §12.14.1's: no exclamation marks, no praise, no
 * anthropomorphism, and an action that states an outcome.
 */
export interface Shortcut {
  keys: string
  action: string
  target: NavTarget | null
}

export const SHORTCUTS: readonly Shortcut[] = Object.freeze([
  { keys: 'g d', action: 'Dashboard', target: 'dashboard' as NavTarget },
  { keys: 'g i', action: 'Index sheet', target: 'index' as NavTarget },
  { keys: 'g p', action: 'Profile', target: 'profile' as NavTarget },
  { keys: 'g r', action: 'Record', target: 'record' as NavTarget },
  { keys: 'g c', action: 'Current category', target: 'category' as NavTarget },
  { keys: '[ / ]', action: 'Previous / next sheet', target: null },
  { keys: 'j / k', action: 'Next / previous section', target: null },
  { keys: '.', action: 'Toggle theme', target: null },
  { keys: 's', action: 'Sign off or un-sign the current sheet', target: null },
  { keys: '?', action: 'Shortcut sheet', target: null },
  { keys: 'Esc', action: 'Close dialog, drawer or overlay', target: null },
])
