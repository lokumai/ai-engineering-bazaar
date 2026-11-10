import type { Metadata } from 'next'
import { Affordances } from '@/components/shell/Affordances'
import { ReadingOptions } from '@/components/shell/ReadingOptions'
import { SiteHeader } from '@/components/shell/SiteHeader'
import { translatedSlugs } from '@/components/sheet/ModuleSheet'
import { curriculumFacts } from '@/lib/content/facts'
import { RecordStateSync } from '@/components/record/RecordStateSync'
import { recordBootScript } from '@/lib/record/boot'
import { diagramGroundCss } from '@/lib/reading/diagram-themes'
import type { ReadingLang } from '@/lib/content/languages'
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN } from '@/lib/site'
import { THEME_BOOT_SCRIPT } from '@/lib/theme'
import '@/app/globals.css'

/**
 * The metadata every root layout shares, and the one place `metadataBase` is set.
 *
 * `metadataBase` is what makes a relative `canonical` or `hreflang` leave the page
 * as an absolute URL: a crawler reads a relative `hreflang` as an error, and the
 * `href()` the pages build their addresses with returns an app-relative path (it
 * carries the base path, which Next does not apply to `alternates`). The origin is
 * `SITE_ORIGIN`, the one place the site's address is written.
 */
export const shellMetadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
}

/**
 * The application shell (spec §4.1, §4.2, §10.2). One banner, one primary
 * navigation, one main, one contentinfo per page; the skip link is the first
 * focusable element on every one of them.
 *
 * The header is here because it is the same on every page. `<main>` and the
 * footer are not: §5.2's footer prints this sheet's number and revision, which
 * no layout can know, so `PageShell` renders both from inside the page tree
 * and every page uses it.
 */
export function RootShell({ lang, children }: { lang: ReadingLang; children: React.ReactNode }) {
  /**
   * §12.2 channel A — the record's pre-paint script needs two build-time maps
   * it cannot derive in the browser: how many sheets each subsystem holds (the
   * denominator `hl-cat-<slug>-complete` is decided against) and the module
   * number each slug prints as. This is a server component, so it may measure
   * the corpus; `curriculumFacts()` reaches `node:fs`, which is precisely why
   * the script is generated here and not imported by anything client-side.
   */
  const facts = curriculumFacts()
  /**
   * The two maps are measured once and used twice: the boot script embeds them
   * to stamp `<html>` before first paint, and `RecordStateSync` takes them as
   * props to keep those stamps true afterwards. One measurement, so the pre-paint
   * answer and every answer after it cannot disagree.
   */
  const stampFacts = {
    categoryTotals: Object.fromEntries(
      facts.categories.map((category) => [category.slug, category.total]),
    ),
    slugToModule: Object.fromEntries(facts.sheets.map((sheet) => [sheet.slug, sheet.module])),
  }
  const recordBoot = recordBootScript(stampFacts.categoryTotals, stampFacts.slugToModule)

  /**
   * No `className` on <html> any more, and that is M16.
   *
   * M9 wired two `next/font/google` families here — Manrope for everything a
   * person wrote, IBM Plex Mono for what a machine measured — and defended the
   * choice in a written decision. Neither was in the mockup, which names one
   * stack and names a SYSTEM stack: `"Avenir Next", ui-sans-serif, system-ui,
   * …`. So type varies with the reader's OS, exactly as the mockup's own does.
   * `--font-sans` and `--font-mono` in `src/design/bazaar.css` are the only
   * place a family is named now, and nothing is downloaded.
   *
   * **`<html lang>` is the page's own language, and the interface stays English.**
   * Each language tree is its own root layout (`(en)`, `tr`, `fa`) and renders this
   * shell with its code, so the document says what it is for a crawler and for
   * `:lang()`. The menus, the bar, the rails and the footer are English on every page
   * (D113), so on a translated page `<body>` says `lang="en"` and the content that
   * is translated says its own language where it is written (`ModuleSheet`,
   * `HomeStreet`), exactly as before the root said anything but English. No `dir` on
   * `<html>`: the layout never mirrors (D80).
   */
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        {/* Blocking, before any paint: no flash of the wrong theme (§2.5). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {/*
          Blocking too, and for the same reason (§12.2). It stamps the sign-off
          marks, the six category faces and `data-hl-storage` on <html> so CSS
          draws every one of them in frame one — no React, nothing to hydrate,
          and no header repainting itself on every load. Second because the
          theme decides what colour the page is and this decides what is ready
          on it; both are inside try/catch and do nothing on failure, which
          lands the page in the honest empty state rather than a half-ready one.

          `suppressHydrationWarning` above covers exactly this: <html> is the
          one element two boot scripts legitimately mutate before React sees it.
        */}
        <script dangerouslySetInnerHTML={{ __html: recordBoot }} />
        {/*
          Each diagram theme's own Mermaid background, as one custom property per
          `data-hl-diagram` stamp (`diagram-themes.ts`). Generated from the theme table
          because the value is Mermaid's and the language's stylesheet may not hold a
          colour the mockups do not; `bazaar.css` reads the property and names no value.
        */}
        <style dangerouslySetInnerHTML={{ __html: diagramGroundCss() }} />
      </head>
      <body className="flex min-h-screen flex-col" lang={lang === 'en' ? undefined : 'en'}>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {/* The bar's language menu needs to know which modules HAVE a second
            address, in which languages, and only the build can say: it is the
            list each language's route emits, measured here for the same reason
            the facts above are. */}
        <SiteHeader translated={translatedSlugs()} />
        {children}
        {/* §6.5 / §6.7 — the overflow fade and the COPY control, once per
            document. In the shell rather than in the prose column because the
            index sheet's manifest table scrolls too and has no prose. */}
        <Affordances />
        {/* The palette menus in every figure and code block, once per
            document, for the same reason `Affordances` is. */}
        <ReadingOptions />
        {/* §12.2 — the boot script above stamps `<html>` for frame one; this
            keeps it true for every frame after, because a client transition
            never reloads the document and the mascot would otherwise freeze at
            whatever was signed off when the page loaded. */}
        <RecordStateSync facts={stampFacts} />
      </body>
    </html>
  )
}
