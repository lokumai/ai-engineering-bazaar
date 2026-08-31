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

function DensityPatch({ filled }: { filled: 'right' | 'left' }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="2.75" y="2.75" width="10.5" height="10.5" />
      <path
        d={filled === 'right' ? 'M8 2.75h5.25v10.5H8z' : 'M8 2.75H2.75v10.5H8z'}
        fill="currentColor"
        stroke="none"
      />
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
      className="hl-icon-btn"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <span className="dark:hidden">
        <DensityPatch filled="right" />
      </span>
      <span className="hidden dark:block">
        <DensityPatch filled="left" />
      </span>
    </button>
  )
}
