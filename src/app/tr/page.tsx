import { Fraunces } from 'next/font/google'
import { HomeStreet, homeMetadata } from '@/components/home/HomeStreet'

/**
 * The front door in Turkish, at `/tr/`: the same component as `/`, with the
 * Turkish row of `lib/home-copy.ts`. The language is an ADDRESS and not a
 * preference (the module pages' rule): nothing sends a reader here, and the bar,
 * the footer and every page the street opens stay English.
 */
export const metadata = homeMetadata('tr')

/**
 * Fraunces again, with `latin-ext` added. Turkish needs the dotless i, the
 * cedilla and the breve, which are Latin Extended-A. MEASURED on the build: the
 * stylesheet `next/font` writes carries every subset's `@font-face` whatever
 * `subsets` says, and the browser fetches the Latin Extended file on demand by
 * its `unicode-range`, so the glyphs arrive either way. What `subsets` decides
 * is the PRELOAD: without it the headline's first `ğ` or `ş` waits for the
 * stylesheet and the face swaps in a beat after the rest. A separate call from
 * `/`'s, so the English page preloads nothing it does not draw.
 */
const display = Fraunces({ subsets: ['latin', 'latin-ext'], axes: ['SOFT', 'opsz'], display: 'swap' })

export default function TurkishHomePage() {
  return <HomeStreet lang="tr" displayClass={display.className} />
}
