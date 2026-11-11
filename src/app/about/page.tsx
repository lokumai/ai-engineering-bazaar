import { Caveat, Fraunces } from 'next/font/google'
import { AboutRoute, aboutMetadata } from '@/components/about/AboutRoute'

/**
 * M90, D115 — About: why the Bazaar exists, in five stalls and a motto. Since M109 (D132) it is one of
 * three routes, `/about/`, `/tr/about/` and `/fa/about/`, sharing `components/about/AboutRoute.tsx`;
 * this one reads `mini-courses/STORY.md`.
 */
export const metadata = aboutMetadata('en')

/**
 * The display face, as on the home page (D79), and Caveat, the hand stall 4's doodles are written in.
 *
 * The About routes' calls carry a `fallback` the home page's do not, and that is load-bearing.
 * `next/font` turns each call into a module keyed on its arguments, and Turbopack shares a module two
 * routes request IDENTICALLY, carrying the other faces of the sharing route with it. MEASURED on the
 * build (M109): with this file's Fraunces call identical to `/`'s, the English home page preloaded
 * Caveat, and once `/fa/about/` called Fraunces the same way it preloaded both Vazirmatn files too.
 * Moving every call into one shared module per face was worse: every page preloaded all five files.
 * The fallback is also real: it is the face the scenes' SVG captions fall back to.
 */
const display = Fraunces({ subsets: ['latin'], axes: ['SOFT', 'opsz'], display: 'swap', fallback: ['Georgia', 'serif'] })
const hand = Caveat({ subsets: ['latin'], weight: '700', display: 'swap', fallback: ['cursive'] })

export default function AboutPage() {
  return (
    <AboutRoute
      lang="en"
      fonts={{ displayClass: display.className, display: display.style.fontFamily, hand: hand.style.fontFamily }}
    />
  )
}
