import { Fraunces } from 'next/font/google'
import { HomeStreet, homeMetadata } from '@/components/home/HomeStreet'

/**
 * The front door, in English: Bazaar Street (D79). The whole page is
 * `components/home/HomeStreet.tsx`, which `/tr/` and `/fa/` render too with their
 * own words (`lib/home-copy.ts`); this route is the English reading, the address a
 * reader with no preference is on, and it chooses nothing for anybody.
 */
export const metadata = homeMetadata('en')

/**
 * The display face of the front door, and of nothing else (D79).
 *
 * M16 took downloaded fonts off the site: the mockup names a system stack, so
 * type follows the reader's OS. The author's chosen home page sets its headline
 * and its signs in Fraunces, and the concept is the reference for this page, so
 * the face comes back HERE ONLY: `next/font` fetches it at build time and serves
 * it from the site, so a reader's browser makes no request to Google. Every
 * other page keeps the system stack.
 *
 * It is called here, at the top of the route's own file, and not in the shared
 * component: `next/font` wants a literal call at module scope, and each language
 * route names its own face (Turkish needs a subset this one does not, Persian a
 * different family), which is also what keeps a route from carrying the faces of
 * the other two.
 */
const display = Fraunces({ subsets: ['latin'], axes: ['SOFT', 'opsz'], display: 'swap' })

export default function HomePage() {
  return <HomeStreet lang="en" displayClass={display.className} />
}
