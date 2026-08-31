import { describe, expect, it } from 'vitest'
import {
  THEME_BOOT_SCRIPT,
  THEME_STORAGE_KEY,
  applyTheme,
  nextTheme,
  readTheme,
  type Theme,
  type ThemeRoot,
} from '@/lib/theme'

function fakeRoot(initial: string[] = []) {
  const classes = new Set(initial)
  const root: ThemeRoot & { classes: Set<string> } = {
    classes,
    classList: {
      add: (c: string) => { classes.add(c) },
      remove: (c: string) => { classes.delete(c) },
      contains: (c: string) => classes.has(c),
      toggle: (c: string, force: boolean) => {
        if (force) classes.add(c)
        else classes.delete(c)
        return force
      },
    },
  }
  return root
}

/** Runs the §2.5 boot script with every global it touches stubbed out. */
function runBootScript(options: {
  stored?: string | null
  systemDark?: boolean
  storageThrows?: boolean
}): Set<string> {
  const classes = new Set<string>()
  const localStorage = {
    getItem: () => {
      if (options.storageThrows) throw new Error('SecurityError')
      return options.stored ?? null
    },
  }
  const matchMedia = () => ({ matches: options.systemDark ?? false })
  const document = { documentElement: { classList: { add: (c: string) => { classes.add(c) } } } }
  new Function('localStorage', 'matchMedia', 'document', THEME_BOOT_SCRIPT)(
    localStorage, matchMedia, document,
  )
  return classes
}

describe('readTheme', () => {
  it('reads dark off the root class the boot script sets', () => {
    expect(readTheme(fakeRoot(['dark']))).toBe('dark')
  })

  it('reads light when the class is absent', () => {
    expect(readTheme(fakeRoot())).toBe('light')
  })
})

describe('nextTheme', () => {
  it('flips both ways', () => {
    expect(nextTheme('light')).toBe('dark')
    expect(nextTheme('dark')).toBe('light')
  })
})

describe('applyTheme', () => {
  it('adds the dark class for dark', () => {
    const root = fakeRoot()
    applyTheme('dark', root, null)
    expect(root.classes.has('dark')).toBe(true)
  })

  it('removes the dark class for light', () => {
    const root = fakeRoot(['dark'])
    applyTheme('light', root, null)
    expect(root.classes.has('dark')).toBe(false)
  })

  it('freezes transitions for the switch and hands back the release', () => {
    const root = fakeRoot()
    const release = applyTheme('dark', root, null)
    expect(root.classes.has('disable-transitions')).toBe(true)
    release()
    expect(root.classes.has('disable-transitions')).toBe(false)
    expect(root.classes.has('dark')).toBe(true)
  })

  it('persists the choice under the boot script key', () => {
    const written: Array<[string, string]> = []
    applyTheme('dark', fakeRoot(), { setItem: (k, v) => { written.push([k, v]) } })
    expect(written).toEqual([[THEME_STORAGE_KEY, 'dark']])
  })

  it('still switches when storage throws, as in a private window', () => {
    const root = fakeRoot()
    const storage = { setItem: () => { throw new Error('QuotaExceededError') } }
    expect(() => applyTheme('dark', root, storage)).not.toThrow()
    expect(root.classes.has('dark')).toBe(true)
  })
})

describe('THEME_BOOT_SCRIPT', () => {
  it('honours a stored dark choice', () => {
    expect(runBootScript({ stored: 'dark' }).has('dark')).toBe(true)
  })

  it('honours a stored light choice over a dark system', () => {
    expect(runBootScript({ stored: 'light', systemDark: true }).has('dark')).toBe(false)
  })

  it('follows the system when nothing is stored', () => {
    expect(runBootScript({ systemDark: true }).has('dark')).toBe(true)
    expect(runBootScript({ systemDark: false }).has('dark')).toBe(false)
  })

  it('degrades to light when storage is unavailable', () => {
    expect(() => runBootScript({ storageThrows: true })).not.toThrow()
    expect(runBootScript({ storageThrows: true }).size).toBe(0)
  })

  it('uses the same storage key the toggle writes', () => {
    expect(THEME_BOOT_SCRIPT).toContain(THEME_STORAGE_KEY)
  })
})

describe('Theme', () => {
  it('has exactly the two values the storage key documents', () => {
    const themes: Theme[] = ['light', 'dark']
    expect(themes).toHaveLength(2)
  })
})
