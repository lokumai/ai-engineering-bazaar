import { describe, expect, it } from 'vitest'
import {
  DIALOG_SELECTOR,
  IDLE,
  PENDING_G,
  PENDING_LABEL,
  PENDING_TIMEOUT_MS,
  ROUTES,
  SHORTCUTS,
  SIGN_OFF_ATTR,
  TYPING_TAGS,
  categoryPathOf,
  expirePending,
  isTypingTarget,
  resolveKey,
  routeFor,
  type DescribedKey,
  type DescribedTarget,
} from '@/lib/record/keys'

/**
 * §12.16 — the map and the `g` mode, tested adversarially: the guards are the
 * conformance mechanism (SC 2.1.1, SC 2.1.4) and every one of them is a place
 * where a global keydown handler quietly ruins somebody's day.
 */

const BODY: DescribedTarget = { tagName: 'BODY', isContentEditable: false, inDialog: false }

function press(key: string, over: Partial<DescribedKey> = {}): DescribedKey {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    isComposing: false,
    target: BODY,
    ...over,
  }
}

const ON = { charKeys: true }
const OFF = { charKeys: false }

describe('resolveKey — the unprefixed keys (§12.16)', () => {
  it('binds every key the map names, and consumes it', () => {
    const cases: Array<[string, unknown]> = [
      ['[', { kind: 'sheet', step: 'prev' }],
      [']', { kind: 'sheet', step: 'next' }],
      ['j', { kind: 'section', step: 'next' }],
      ['k', { kind: 'section', step: 'prev' }],
      ['.', { kind: 'theme' }],
      ['s', { kind: 'sign-off' }],
      ['?', { kind: 'shortcuts' }],
    ]
    for (const [key, action] of cases) {
      const result = resolveKey(IDLE, press(key), ON)
      expect(result.action, key).toEqual(action)
      expect(result.handled, key).toBe(true)
      expect(result.state, key).toEqual(IDLE)
    }
  })

  it('leaves every key it does not own alone', () => {
    for (const key of ['a', 'Enter', 'Tab', 'ArrowDown', 'F5', ' ', 'G', 'S']) {
      const result = resolveKey(IDLE, press(key), ON)
      expect(result.action, key).toBeNull()
      expect(result.handled, key).toBe(false)
    }
  })

  it('does not fire on an uppercase key — the map is written in lower case', () => {
    // Caps Lock and Shift both produce `G`, and a reader who has just typed a
    // capital in a heading search has not asked to navigate.
    expect(resolveKey(IDLE, press('G'), ON).state).toEqual(IDLE)
  })
})

describe('resolveKey — the guards (§12.16)', () => {
  it('returns early on every modifier, so a browser chord keeps its key', () => {
    for (const modifier of ['ctrlKey', 'metaKey', 'altKey'] as const) {
      const result = resolveKey(IDLE, press('s', { [modifier]: true }), ON)
      expect(result.action, modifier).toBeNull()
      expect(result.handled, modifier).toBe(false)
    }
  })

  it('leaves a pending g alone when a modifier chord goes past', () => {
    // Ctrl+C mid-mode is not "a non-matching key": it never reached the map.
    // The timeout is what clears an abandoned mode.
    expect(resolveKey(PENDING_G, press('c', { ctrlKey: true }), ON).state).toEqual(PENDING_G)
  })

  it('ignores an IME composition — the g handler must not fire mid-word', () => {
    const result = resolveKey(IDLE, press('g', { isComposing: true }), ON)
    expect(result.state).toEqual(IDLE)
    expect(result.handled).toBe(false)
  })

  it('ignores every typing surface', () => {
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) {
      const target = { tagName, isContentEditable: false, inDialog: false }
      const result = resolveKey(IDLE, press('s', { target }), ON)
      expect(result.action, tagName).toBeNull()
      expect(result.handled, tagName).toBe(false)
    }
  })

  it('ignores a contenteditable host whatever it is tagged as', () => {
    const target = { tagName: 'DIV', isContentEditable: true, inDialog: false }
    expect(resolveKey(IDLE, press('.', { target }), ON).action).toBeNull()
  })

  it('ignores a target inside a dialog that owns its keys', () => {
    const target = { tagName: 'BUTTON', isContentEditable: false, inDialog: true }
    expect(resolveKey(IDLE, press('j', { target }), ON).action).toBeNull()
    expect(resolveKey(IDLE, press('?', { target }), ON).action).toBeNull()
  })

  it('lets Escape through everywhere — including out of a dialog and a textarea', () => {
    const targets: DescribedTarget[] = [
      BODY,
      { tagName: 'TEXTAREA', isContentEditable: false, inDialog: false },
      { tagName: 'INPUT', isContentEditable: false, inDialog: true },
    ]
    for (const target of targets) {
      const result = resolveKey(PENDING_G, press('Escape', { target }), ON)
      expect(result.action, target.tagName).toEqual({ kind: 'close' })
      expect(result.state, target.tagName).toEqual(IDLE)
      // Never consumed: the overlay, the drawer and the dialog close themselves.
      expect(result.handled, target.tagName).toBe(false)
    }
  })

  it('lets Escape through with the character keys switched off', () => {
    expect(resolveKey(PENDING_G, press('Escape'), OFF).action).toEqual({ kind: 'close' })
  })
})

describe('resolveKey — prefs.charKeys, the SC 2.1.4 off switch', () => {
  it('turns off every single-character shortcut, ? included', () => {
    for (const key of ['g', '[', ']', 'j', 'k', '.', 's', '?']) {
      const result = resolveKey(IDLE, press(key), OFF)
      expect(result.action, key).toBeNull()
      expect(result.handled, key).toBe(false)
      expect(result.state, key).toEqual(IDLE)
    }
  })

  it('cannot leave the g mode armed, because g never arms it', () => {
    expect(resolveKey(IDLE, press('g'), OFF).state).toEqual(IDLE)
  })
})

describe('the g mode — a mode, not a race (§12.16)', () => {
  it('arms on g without acting, and consumes the key', () => {
    const result = resolveKey(IDLE, press('g'), ON)
    expect(result.state).toEqual(PENDING_G)
    expect(result.action).toBeNull()
    expect(result.handled).toBe(true)
  })

  it('resolves all five destinations §12.16 names', () => {
    const cases: Array<[string, string]> = [
      ['d', 'dashboard'],
      ['i', 'index'],
      ['p', 'profile'],
      ['r', 'record'],
      ['c', 'category'],
    ]
    for (const [key, target] of cases) {
      const result = resolveKey(PENDING_G, press(key), ON)
      expect(result.action, key).toEqual({ kind: 'nav', target })
      expect(result.handled, key).toBe(true)
      expect(result.state, key).toEqual(IDLE)
    }
  })

  it('clears on any non-matching key, and swallows it', () => {
    // `g` then `.` must not flip the theme: a mistyped chord does nothing at
    // all, which is the whole difference between a mode and a race.
    const result = resolveKey(PENDING_G, press('.'), ON)
    expect(result.state).toEqual(IDLE)
    expect(result.action).toBeNull()
    expect(result.handled).toBe(true)
  })

  it('treats a second g as non-matching rather than re-arming', () => {
    expect(resolveKey(PENDING_G, press('g'), ON).state).toEqual(IDLE)
  })

  it('clears on Escape', () => {
    expect(resolveKey(PENDING_G, press('Escape'), ON).state).toEqual(IDLE)
  })

  it('clears on the timeout, and expiring an idle machine changes nothing', () => {
    expect(expirePending(PENDING_G)).toEqual(IDLE)
    expect(expirePending(IDLE)).toBe(IDLE)
  })

  it('waits at least the two seconds SC 2.1.1 requires', () => {
    expect(PENDING_TIMEOUT_MS).toBeGreaterThanOrEqual(2000)
  })

  it('prints the pending state in the key the reader actually pressed', () => {
    expect(PENDING_LABEL).toContain('g')
    expect(PENDING_LABEL).not.toContain('G')
  })

  it('never mutates the state it is handed', () => {
    const state = { pending: 'g' as const }
    resolveKey(state, press('d'), ON)
    expect(state).toEqual({ pending: 'g' })
    expect(Object.isFrozen(IDLE)).toBe(true)
    expect(Object.isFrozen(PENDING_G)).toBe(true)
  })
})

describe('routeFor — where each destination goes', () => {
  it('ends every route in a slash, because trailingSlash is on', () => {
    for (const path of Object.values(ROUTES)) expect(path.endsWith('/')).toBe(true)
  })

  it('resolves the five fixed destinations', () => {
    // §15.1 — `index` follows the register it names: the flat manifest is at
    // `/sheets/` now, and `/` is the home screen `home` goes to.
    expect(routeFor('index', '/courses/intermediate/security/')).toBe('/sheets/')
    expect(routeFor('home', '/courses/intermediate/security/')).toBe('/')
    expect(routeFor('dashboard', '/')).toBe('/dashboard/')
    expect(routeFor('profile', '/')).toBe('/profile/')
    expect(routeFor('record', '/')).toBe('/report/')
  })

  it('reads the current category off the route, from a sheet or its category page', () => {
    expect(categoryPathOf('/courses/intermediate/security/')).toBe('/courses/intermediate/')
    expect(categoryPathOf('/courses/intermediate/')).toBe('/courses/intermediate/')
  })

  it('has no current category to offer outside the set, and says so with null', () => {
    for (const path of ['/', '/courses/', '/dashboard/', '/profile/', '']) {
      expect(categoryPathOf(path), path).toBeNull()
      expect(routeFor('category', path), path).toBeNull()
    }
  })
})

describe('the table the ? sheet prints (§12.16)', () => {
  it('lists every row of §12.16, in its order', () => {
    // §13.14 amends §12.16: `g l` (Learning path) joins the `g` mode, after
    // `g r` and before `g c` — `g c` stays last because it is the only one
    // whose destination depends on where the reader already is.
    // §15.1 amends it again: `g h` (Home) joins ahead of `g i`, because the
    // front door is now a page of its own and `g i` kept the register it has
    // always named. `g c` stays last for the reason above.
    expect(SHORTCUTS.map((row) => row.keys)).toEqual([
      'g d', 'g h', 'g i', 'g p', 'g r', 'g l', 'g c',
      '[ / ]', 'j / k', '.', 's', '?', 'Esc',
    ])
  })

  it('gives every g row a destination, so each is also a plain link', () => {
    const go = SHORTCUTS.filter((row) => row.keys.startsWith('g '))
    expect(go).toHaveLength(7)
    for (const row of go) expect(row.target, row.keys).not.toBeNull()
  })

  it('gives the unprefixed rows no destination — none of them navigates', () => {
    for (const row of SHORTCUTS.filter((r) => !r.keys.startsWith('g '))) {
      expect(row.target, row.keys).toBeNull()
    }
  })

  it('keeps §12.14.1s copy register', () => {
    const copy = SHORTCUTS.map((row) => row.action).join(' ')
    expect(copy).not.toContain('!')
    for (const banned of ['just', 'simply', 'easy', 'quick', 'please', 'sorry']) {
      expect(copy.toLowerCase(), banned).not.toContain(banned)
    }
  })
})

describe('the two DOM contracts the island needs', () => {
  it('names the typing surfaces §12.16 lists, in the case tagName reports', () => {
    expect(TYPING_TAGS).toEqual(['INPUT', 'TEXTAREA', 'SELECT'])
    for (const tag of TYPING_TAGS) expect(tag).toBe(tag.toUpperCase())
    expect(isTypingTarget({ tagName: 'input', isContentEditable: false, inDialog: false })).toBe(true)
  })

  it('recognises a dialog by role, which is what Radix renders', () => {
    expect(DIALOG_SELECTOR).toContain('[role="dialog"]')
  })

  it('reaches the sign-off control through one data attribute', () => {
    expect(SIGN_OFF_ATTR).toBe('data-hl-signoff')
  })
})
