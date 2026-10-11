'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

/**
 * M19's language switch, moved into the bar on the author's word: *"the
 * English/Türkçe option should appear as a square button in navbar right to
 * the left of the toggle theme in a drop-down-like industry-standard component
 * and should have proper icon of changing language."* It sat in the top-right
 * corner of the reading column until 2026-10-11, as two text links.
 *
 * ## Still two LINKS, now behind a disclosure
 *
 * The language is an ADDRESS (the `/tr/` route's own docblock), so the menu's
 * contents are navigation: two links, the current one marked
 * `aria-current="page"`. The trigger is a native `<details>`/`<summary>`, the
 * mechanism the bar's own Catalog menu uses, so the whole switch **still works
 * with the bundle blocked** — the summary opens by itself, the links are plain
 * anchors, and `translation.spec.ts` drives exactly that. A `<select>` or a
 * `role="menu"` would need a script to do anything at all.
 *
 * What the script adds is what a reader expects of a dropdown and a
 * `<details>` does not do on its own: Escape closes it (Chrome never closes a
 * `<details>` on Escape), a press outside closes it, and so does arriving at
 * the other language.
 *
 * ## Where it appears
 *
 * Only on a module page that HAS a second address — the same rule the picker
 * kept in the column. Everywhere else it renders nothing rather than a
 * disabled control, which would offer a 404 (§11.30): a Turkish page exists
 * only where `generateStaticParams` emitted one, and the bar learns which those
 * are from the layout, at build time, rather than guessing from the URL.
 *
 * The pathname is read with `usePathname`, which a static export resolves
 * during prerender, so the button is in the HTML of every page that should
 * carry it — right in frame one, and present for a reader with no script.
 */
export const LANGUAGE_PICKER_LABEL = 'Language of this module'

/** `/courses/<level>/<module>/` and its Turkish twin, as one parse. */
const MODULE = /^\/(tr\/)?courses\/([^/]+\/[^/]+)\/?$/

/** The two addresses of the module at `pathname`, or null where there is one. */
export function alternatesOf(
  pathname: string,
  translated: ReadonlySet<string>,
): { slug: string; current: 'en' | 'tr' } | null {
  const match = MODULE.exec(pathname)
  if (!match || !translated.has(match[2])) return null
  return { slug: match[2], current: match[1] ? 'tr' : 'en' }
}

/** A globe: the mark every product uses for "the language of this page". */
function GlobeGlyph() {
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
      <circle cx="8" cy="8" r="6.25" />
      <path d="M1.75 8h12.5" />
      <path d="M8 1.75c1.8 1.7 2.7 3.8 2.7 6.25S9.8 12.55 8 14.25C6.2 12.55 5.3 10.45 5.3 8S6.2 3.45 8 1.75Z" />
    </svg>
  )
}

/** The mark beside the language being read; `aria-current` says it in words. */
function CheckGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className="bz-langmenu-check"
    >
      <path d="M3 8.5l3.2 3.2L13 4.8" />
    </svg>
  )
}

const LANGUAGES = [
  { id: 'en', label: 'English', href: (slug: string) => `/courses/${slug}/` },
  { id: 'tr', label: 'Türkçe', href: (slug: string) => `/tr/courses/${slug}/` },
] as const

export function LanguageMenu({ translated }: { translated: readonly string[] }) {
  const pathname = usePathname() ?? '/'
  const panel = useRef<HTMLDetailsElement>(null)
  const here = alternatesOf(pathname, new Set(translated))

  // Arriving at the other language is a client transition and the bar is not
  // re-rendered from scratch, so the panel would stay open over the new page.
  useEffect(() => {
    if (panel.current) panel.current.open = false
  }, [pathname])

  // A press anywhere else closes it. `pointerdown` and not `click`, so the
  // panel is gone before whatever was pressed reacts to the press.
  useEffect(() => {
    function outside(event: PointerEvent): void {
      const details = panel.current
      if (!details?.open) return
      if (event.target instanceof Node && details.contains(event.target)) return
      details.open = false
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [])

  if (here === null) return null

  function keyDown(event: React.KeyboardEvent<HTMLDetailsElement>): void {
    if (event.key !== 'Escape') return
    const details = panel.current
    if (!details?.open) return
    details.open = false
    details.querySelector('summary')?.focus()
  }

  // Focus leaving the whole control closes it, so a keyboard reader who tabs
  // past the two links does not leave a panel hanging over the page. Read off
  // `relatedTarget`, never off `activeElement`: after a press on the summary
  // the active element is inside the details, always.
  function blur(event: React.FocusEvent<HTMLDetailsElement>): void {
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
    if (next === null) return
    event.currentTarget.open = false
  }

  const currentLabel = LANGUAGES.find((one) => one.id === here.current)!.label

  return (
    <nav className="bz-langmenu" aria-label={LANGUAGE_PICKER_LABEL}>
      <details ref={panel} onKeyDown={keyDown} onBlur={blur}>
        <summary
          className="bz-bar-icon bz-langmenu-trigger"
          aria-label={`Language: ${currentLabel}`}
          title="Language"
        >
          <GlobeGlyph />
        </summary>
        <div className="bz-menu bz-langmenu-panel">
          {LANGUAGES.map((one) => (
            <Link
              key={one.id}
              className="bz-menu-item"
              href={one.href(here.slug)}
              hrefLang={one.id}
              lang={one.id}
              aria-current={here.current === one.id ? 'page' : undefined}
            >
              {one.label}
              {here.current === one.id && <CheckGlyph />}
            </Link>
          ))}
        </div>
      </details>
    </nav>
  )
}
