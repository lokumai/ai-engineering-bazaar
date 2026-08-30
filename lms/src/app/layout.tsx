import type { Metadata } from 'next'
import { RegistrationMarks } from '@/components/shell/RegistrationMarks'
import { SiteFooter } from '@/components/shell/SiteFooter'
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
        <main id="main" className="flex-1 pt-10 pb-16">
          <RegistrationMarks edge="top" />
          <div className="mx-auto w-full max-w-[var(--width-shell)] px-6">{children}</div>
          <RegistrationMarks edge="bottom" className="mt-16" />
        </main>
        <SiteFooter />
      </body>
    </html>
  )
}
