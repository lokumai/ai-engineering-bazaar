import { Caveat, Fraunces, Vazirmatn } from 'next/font/google'
import { AboutRoute, aboutMetadata } from '@/components/about/AboutRoute'

/**
 * The About page in Persian, at `/fa/about/`: the same component as `/about/`, reading
 * `mini-courses/STORY_fa.md`, right to left at the content level only (D80, D132): `dir="rtl"` is on
 * the elements that hold the story's words, and the layout and the scenes are drawn as on `/about/`.
 */
export const metadata = aboutMetadata('fa')

/**
 * Vazirmatn, bound as `--font-persian` the way `/fa/`'s page binds it; `[lang="fa"]` turns it into
 * the face of every Persian element. The headings take no display class: Fraunces has no Arabic
 * script. The scenes still need Fraunces (latin) and Caveat for their English captions, which are
 * part of the drawing, so both are loaded, and only their families are passed on.
 */

const persian = Vazirmatn({ subsets: ['arabic', 'latin'], display: 'swap', variable: '--font-persian', fallback: ['Tahoma', 'sans-serif'] })
const display = Fraunces({ subsets: ['latin'], axes: ['SOFT', 'opsz'], display: 'swap', fallback: ['Georgia', 'Tahoma', 'serif'] })
const hand = Caveat({ subsets: ['latin'], weight: '700', display: 'swap', fallback: ['cursive'] })

export default function PersianAboutPage() {
  return (
    <div className={`contents ${persian.variable}`}>
      <AboutRoute
        lang="fa"
        fonts={{ displayClass: '', display: display.style.fontFamily, hand: hand.style.fontFamily }}
      />
    </div>
  )
}
