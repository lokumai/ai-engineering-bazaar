import { Caveat, Fraunces } from 'next/font/google'
import { AboutRoute, aboutMetadata } from '@/components/about/AboutRoute'

/**
 * The About page in Turkish, at `/tr/about/`: the same component as `/about/`, reading
 * `mini-courses/STORY_tr.md` (M109, D132). The language is an address, and the bar, the footer and
 * the scenes' own captions stay as drawn.
 */
export const metadata = aboutMetadata('tr')

/** Fraunces with `latin-ext`, for the dotless i, the cedilla and the breve (see `/tr/`'s page). */
/** The scenes' English captions are part of the drawing, so Caveat stays. */

const display = Fraunces({ subsets: ['latin', 'latin-ext'], axes: ['SOFT', 'opsz'], display: 'swap', fallback: ['Georgia', 'serif'] })
const hand = Caveat({ subsets: ['latin'], weight: '700', display: 'swap', fallback: ['cursive'] })

export default function TurkishAboutPage() {
  return (
    <AboutRoute
      lang="tr"
      fonts={{ displayClass: display.className, display: display.style.fontFamily, hand: hand.style.fontFamily }}
    />
  )
}
