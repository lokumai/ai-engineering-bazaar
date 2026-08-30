/**
 * Theme state lives in one place: the `dark` class on <html>. The boot script
 * puts it there before first paint; the toggle flips it; the CSS in
 * globals.css re-points every token off it (spec §2.3).
 */

export type Theme = 'light' | 'dark'

/** Spec §2.5. Values "light" | "dark"; absent means follow the system. */
export const THEME_STORAGE_KEY = 'hl-theme'

/**
 * Inline, blocking, in <head>, before any paint — a React effect runs after
 * the first frame, which is exactly the flash this avoids. Verbatim from
 * spec §2.5; if you change the key here, change THEME_STORAGE_KEY with it.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("hl-theme");
if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))
document.documentElement.classList.add("dark");}catch(e){}})();`

/** The freeze that keeps the theme switch at 0ms (spec §9.2). */
const FREEZE_CLASS = 'disable-transitions'

const DARK_CLASS = 'dark'

/** The slice of <html> these functions touch, so they are testable in node. */
export interface ThemeRoot {
  classList: {
    add(token: string): void
    remove(token: string): void
    contains(token: string): boolean
    toggle(token: string, force: boolean): boolean
  }
}

/** The slice of localStorage these functions touch. */
export interface ThemeStorage {
  setItem(key: string, value: string): void
}

export function readTheme(root: ThemeRoot): Theme {
  return root.classList.contains(DARK_CLASS) ? 'dark' : 'light'
}

export function nextTheme(current: Theme): Theme {
  return current === 'dark' ? 'light' : 'dark'
}

/**
 * Applies the theme and persists it. Returns the function that lifts the
 * one-frame transition freeze — the caller schedules it on the next animation
 * frame, so the colours snap rather than cross-fading (spec §9.2).
 */
export function applyTheme(
  theme: Theme,
  root: ThemeRoot,
  storage: ThemeStorage | null,
): () => void {
  root.classList.add(FREEZE_CLASS)
  root.classList.toggle(DARK_CLASS, theme === 'dark')
  try {
    storage?.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Private windows and full storage both throw. The theme still applies to
    // this page view; it just will not be remembered.
  }
  return () => { root.classList.remove(FREEZE_CLASS) }
}
