import type { Metadata } from 'next'
import { Caveat, Fraunces } from 'next/font/google'
import { AboutStory } from '@/components/about/AboutStory'
import { PageShell } from '@/components/shell/PageShell'
import { loadStory } from '@/lib/content/story'
import { ABOUT_ROUTE, ABOUT_TITLE } from '@/lib/route-labels'
import { href } from '@/lib/url'

/**
 * M90, D115 — About: why the Bazaar exists, in five stalls and a motto.
 *
 * The words are `mini-courses/STORY.md`, read here at build time (`lib/content/story.ts` reaches
 * `node:fs`, so this server route reads it and the island only ever receives strings). The page is
 * `components/about/AboutStory.tsx`; it is linked from the footer and last in the bar.
 *
 * The description is the story's own first heading, so the page states nothing the file does not.
 */
const story = loadStory()

export const metadata: Metadata = {
  title: ABOUT_TITLE,
  description: story.stalls[0]?.heading,
  alternates: { canonical: href(ABOUT_ROUTE) },
}

/**
 * The display face, as on the home page (D79): `next/font` fetches Fraunces at build time and serves
 * it from the site, so a reader's browser makes no request to Google. F1 sets every heading in it.
 * Caveat is the hand stall 4's doodles are written in (4E); it is loaded at the one weight drawn.
 */
const display = Fraunces({ subsets: ['latin'], axes: ['SOFT', 'opsz'], display: 'swap' })
const hand = Caveat({ subsets: ['latin'], weight: '700', display: 'swap' })

export default function AboutPage() {
  return (
    <PageShell column={false}>
      <AboutStory
        story={story}
        fonts={{ displayClass: display.className, display: display.style.fontFamily, hand: hand.style.fontFamily }}
      />
    </PageShell>
  )
}
