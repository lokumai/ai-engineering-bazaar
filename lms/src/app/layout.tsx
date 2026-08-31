import type { Metadata } from 'next'
import { Affordances } from '@/components/shell/Affordances'
import { SiteHeader } from '@/components/shell/SiteHeader'
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
  return (
    <html
      lang="en"
      className={`${plexCondensed.variable} ${sourceSerif.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Blocking, before any paint: no flash of the wrong theme (§2.5). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
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
      </body>
    </html>
  )
}
