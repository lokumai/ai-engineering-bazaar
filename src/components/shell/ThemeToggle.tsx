'use client'

import { applyTheme, nextTheme, readTheme, type ThemeStorage } from '@/lib/theme'

/**
 * Theme toggle (spec §5.1): 28 × 28, 16px icon at stroke-width 1.5.
 *
 * The glyph is a density patch — the filled half states which theme is in
 * force — and it is switched by the `dark` class in CSS rather than by React
 * state. That matters: the boot script sets that class before first paint, so
 * the correct glyph is in the first frame and there is nothing to hydrate.
 */

/** Reading window.localStorage itself throws in some privacy modes. */
function safeStorage(): ThemeStorage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * The author, 2026-11-05: a sun and a moon. The light theme shows the moon and
 * the dark theme the sun, each the theme a click switches to, which is the
 * convention most sites follow. Both are always in the document and the
 * theme's own class picks one, so the right glyph is there in frame one.
 */
function Moon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
      <path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8Z" />
    </svg>
  )
}

function Sun() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="8" cy="8" r="2.9" />
      <path d="M8 1.6v1.6M8 12.8v1.6M1.6 8h1.6M12.8 8h1.6M3.5 3.5l1.1 1.1M11.4 11.4l1.1 1.1M3.5 12.5l1.1-1.1M11.4 4.6l1.1-1.1" />
    </svg>
  )
}

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement
    // §9.2: freeze transitions, flip, unfreeze on the next frame. The colours
    // snap. Cross-fading a whole page delays the answer the user asked for.
    const release = applyTheme(nextTheme(readTheme(root)), root, safeStorage())
    requestAnimationFrame(release)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="bz-bar-icon"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <span className="dark:hidden">
        <Moon />
      </span>
      <span className="hidden dark:block">
        <Sun />
      </span>
    </button>
  )
}
