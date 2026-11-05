'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useMemo, useRef } from 'react'
import {
  type ReadingLang,
  type TranslatedLang,
  TRANSLATED_LANGS,
  TRANSLATIONS,
  dirOf,
} from '@/lib/content/languages'

/**
 * M19's language switch, moved into the bar on the author's word: *"the
 * English/Türkçe option should appear as a square button in navbar right to
 * the left of the toggle theme in a drop-down-like industry-standard component
 * and should have proper icon of changing language."* It sat in the top-right
 * corner of the reading column until 2026-10-11, as two text links.
 *
 * ## Still LINKS, now behind a disclosure
 *
 * The language is an ADDRESS (the `/tr/` route's own docblock), so the menu's
 * contents are navigation: one link per language the module has (two, and
 * three since M28 added Persian), the current one marked
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

/** `/courses/<level>/<module>/` and its translated twins, as one parse. */
const MODULE = new RegExp(`^/(?:(${TRANSLATED_LANGS.join('|')})/)?courses/([^/]+/[^/]+)/?$`)

/**
 * Every address of the module at `pathname` — English first, then each
 * language it has a page in — or null where there is only the one.
 *
 * M28 — the set is per language now, because Persian covers the written
 * modules only where a translation exists and Turkish covers the same nineteen
 * for a different reason; a module listed under one language says nothing
 * about the other.
 */
export function alternatesOf(
  pathname: string,
  translated: Readonly<Record<TranslatedLang, ReadonlySet<string>>>,
): { slug: string; current: ReadingLang; available: readonly ReadingLang[] } | null {
  const match = MODULE.exec(pathname)
  if (!match) return null
  const slug = match[2]
  const others = TRANSLATED_LANGS.filter((lang) => translated[lang].has(slug))
  if (others.length === 0) return null
  const current = (match[1] as TranslatedLang | undefined) ?? 'en'
  if (current !== 'en' && !others.includes(current)) return null
  return { slug, current, available: ['en', ...others] }
}

/** A globe: the mark every product uses for "the language of this page". */
/**
 * M39 E4 — the flag of a language, beside its code. English takes the UK flag
 * and Turkish Turkey's. Persian takes none: a flag stands for a country, Persian
 * is spoken in three, and Iran's flag is a statement either way (D91), so it
 * shows its own script, `فا`, in a small chip instead. Drawn inline, because an
 * emoji flag does not render on Windows.
 */
function Flag({ lang }: { lang: ReadingLang }) {
  const clip = useId()
  if (lang === 'fa') {
    return (
      <span className="bz-flag bz-flag-script" aria-hidden="true" lang="fa">
        فا
      </span>
    )
  }
  if (lang === 'tr') {
    return (
      <svg className="bz-flag" viewBox="0 0 1200 800" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <rect width="1200" height="800" fill="#E30A17" />
        <circle cx="425" cy="400" r="200" fill="#fff" />
        <circle cx="475" cy="400" r="160" fill="#E30A17" />
        <polygon fill="#fff" points="583.3,400 764.2,458.8 652.4,304.9 652.4,495.1 764.2,341.2" />
      </svg>
    )
  }
  return (
    <svg className="bz-flag" viewBox="0 0 60 30" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <clipPath id={clip}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${clip})`} stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  )
}

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

const LANGUAGES: readonly { id: ReadingLang; label: string; href: (slug: string) => string }[] = [
  { id: 'en', label: 'English', href: (slug) => `/courses/${slug}/` },
  ...TRANSLATIONS.map((one) => ({
    id: one.id,
    label: one.label,
    href: (slug: string) => `/${one.id}/courses/${slug}/`,
  })),
]

export function LanguageMenu({
  translated,
}: {
  translated: Readonly<Record<TranslatedLang, readonly string[]>>
}) {
  const pathname = usePathname() ?? '/'
  const panel = useRef<HTMLDetailsElement>(null)
  const sets = useMemo(
    () =>
      Object.fromEntries(
        TRANSLATED_LANGS.map((lang) => [lang, new Set(translated[lang])]),
      ) as unknown as Record<TranslatedLang, ReadonlySet<string>>,
    [translated],
  )
  const here = alternatesOf(pathname, sets)

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
  // past the links does not leave a panel hanging over the page. Read off
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
          className="bz-langmenu-trigger"
          aria-label={`Language: ${currentLabel}`}
          title="Language"
        >
          {here.current !== 'fa' && <Flag lang={here.current} />}
          <span className="bz-langmenu-code">{here.current.toUpperCase()}</span>
        </summary>
        <div className="bz-menu bz-langmenu-panel">
          {LANGUAGES.filter((one) => here.available.includes(one.id)).map((one) => (
            <Link
              key={one.id}
              className="bz-menu-item"
              href={one.href(here.slug)}
              hrefLang={one.id}
              lang={one.id}
              dir={dirOf(one.id)}
              aria-current={here.current === one.id ? 'page' : undefined}
            >
              <Flag lang={one.id} />
              {one.label}
              {here.current === one.id && <CheckGlyph />}
            </Link>
          ))}
        </div>
      </details>
    </nav>
  )
}
