import { Vazirmatn } from 'next/font/google'
import { HomeStreet, homeMetadata } from '@/components/home/HomeStreet'

/**
 * The front door in Persian, at `/fa/`: the same component as `/`, with the
 * Persian row of `lib/home-copy.ts`, read right to left at the content level
 * only (D80). `dir="rtl"` is on the elements that hold Persian text and nowhere
 * else, so the street, the gate and the walk are drawn the way they are on `/`.
 */
export const metadata = homeMetadata('fa')

/**
 * Vazirmatn, bound the way the Persian module pages bind it
 * (`fa/courses/…/page.tsx`): the variable is `--font-persian`, which
 * `[lang="fa"]` turns into the face of every Persian element. Fraunces has no
 * Arabic script, so the home page's display face is not loaded here at all and
 * `displayClass` is empty. `latin` rides along with `arabic` because AI, LLM and
 * the characters' names stay in Latin letters, and a line set in two faces reads
 * as two lines. The wrapper is `display: contents`, so it takes no part in layout.
 */
const persian = Vazirmatn({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--font-persian',
})

export default function PersianHomePage() {
  return (
    <div className={`contents ${persian.variable}`}>
      <HomeStreet lang="fa" displayClass="" />
    </div>
  )
}
