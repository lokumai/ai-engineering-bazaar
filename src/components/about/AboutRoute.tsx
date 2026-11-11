import type { Metadata } from 'next'
import { PageShell } from '@/components/shell/PageShell'
import { ABOUT_TITLES } from '@/lib/about-copy'
import type { ReadingLang } from '@/lib/content/languages'
import { aboutLanguageRoutes, alternatesOf } from '@/lib/content/seo'
import { loadStory } from '@/lib/content/story'
import { AboutStory, type AboutFonts } from './AboutStory'

/**
 * M109, D132 — the About page's three routes, `/about/`, `/tr/about/` and `/fa/about/`, are one
 * component read from three files. Each route module only binds the fonts it needs (`next/font`
 * must be called at a module's top level) and hands them here, the way the home page's three
 * routes share `HomeStreet`.
 *
 * Metadata: the title is the page's name in its language (`lib/about-copy.ts`), the description is
 * the story's own first heading, so the page states nothing its file does not, and `alternates`
 * names every language the story is written in (`aboutLanguageRoutes`, D119).
 */
export function aboutMetadata(lang: ReadingLang): Metadata {
  return {
    title: ABOUT_TITLES[lang],
    description: loadStory(lang).stalls[0]?.heading,
    alternates: alternatesOf(aboutLanguageRoutes(), lang),
  }
}

export function AboutRoute({ lang, fonts }: { lang: ReadingLang; fonts: AboutFonts }) {
  return (
    <PageShell column={false}>
      <AboutStory story={loadStory(lang)} fonts={fonts} lang={lang} />
    </PageShell>
  )
}
