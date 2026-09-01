import type { Metadata } from 'next'
import { AccountSync } from '@/components/record/AccountSync'
import { SessionProvider } from '@/components/auth/SessionProvider'
import { Affordances } from '@/components/shell/Affordances'
import { SiteHeader } from '@/components/shell/SiteHeader'
import { curriculumFacts } from '@/lib/content/facts'
import { RecordStateSync } from '@/components/record/RecordStateSync'
import { recordBootScript } from '@/lib/record/boot'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site'
import { THEME_BOOT_SCRIPT } from '@/lib/theme'
import { plexCondensed, plexMono, sourceSerif } from './fonts'
import './globals.css'

export const metadata: Metadata = {
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
export default function RootLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <html
      lang="en"
      className={`${plexCondensed.variable} ${sourceSerif.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Blocking, before any paint: no flash of the wrong theme (§2.5). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {/*
          Blocking too, and for the same reason (§12.2). It stamps the sign-off
          marks, the six category faces and `data-hl-storage` on <html> so CSS
          draws every one of them in frame one — no React, nothing to hydrate,
          and no header repainting itself on every load. Second because the
          theme decides what colour the page is and this decides what is drawn
          on it; both are inside try/catch and do nothing on failure, which
          lands the page in the honest empty state rather than a half-drawn one.

          `suppressHydrationWarning` above covers exactly this: <html> is the
          one element two boot scripts legitimately mutate before React sees it.
        */}
        <script dangerouslySetInnerHTML={{ __html: recordBoot }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        {children}
        {/* §6.5 / §6.7 — the overflow fade and the COPY control, once per
            document. In the shell rather than in the prose column because the
            index sheet's manifest table scrolls too and has no prose. */}
        <Affordances />
        {/* §12.2 — the boot script above stamps `<html>` for frame one; this
            keeps it true for every frame after, because a client transition
            never reloads the document and the mascot would otherwise freeze at
            whatever was signed off when the page loaded. */}
        <RecordStateSync facts={stampFacts} />
        {/* §14.7 — THE SEAM, mounted once per document.
            The session and the record's sync are document-level concerns, not
            page-level ones: a sign-off happens on a sheet, so a sync that lived
            on `/profile/` would only reach the account when the reader visited
            the page that has nothing to do with the work. Every navigation here
            is a client transition, so once per document is once per session.

            `facts` is passed whole rather than trimmed. MEASURED: 6.3 KB of
            flight data against a 2.9 KB hand-trimmed subset, on pages that are
            already 200 KB. The 3.4 KB buys `buildProgress` the exact
            `CurriculumFacts` `derive.ts` takes, so §14.9's one-arithmetic rule
            holds with no projection to keep in step.

            Inert when `NEXT_PUBLIC_AUTH_ENABLED` is off (§14.1): the provider
            resolves to `disabled` and the island's effect returns before it
            builds a client, so nothing is fetched and nothing is rendered. */}
        <SessionProvider>
          <AccountSync facts={facts} />
        </SessionProvider>
      </body>
    </html>
  )
}
