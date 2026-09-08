import { Manrope, IBM_Plex_Mono } from 'next/font/google'

/**
 * Two voices, and that is a change (M9).
 *
 * The retired system had three: a condensed sans for frame and chrome, a serif
 * for human argument, a mono for machine-derived values. Bazaar has one family
 * at two weights for everything a person wrote, and the mono only for what a
 * machine measured. `kia-context/specs/DESIGN.md`, Typography, says why: a warm
 * ground plus a high-contrast serif plus a clay accent is the most common
 * machine-generated look there is, and it made the project's own artwork read
 * as a template.
 *
 * **Manrope, and not Inter.** Both are geometric sans faces with the latin-ext
 * coverage Turkish needs (ğ ı ş ç ö ü İ). Inter is the default a page reaches
 * for when nobody chose, which is the reason to avoid it here; Manrope's
 * flat-sided bowls and open apertures sit closer to the glazed-tile geometry
 * the palette came from, and its variable weight axis covers 400 through 700
 * from one file.
 *
 * Still `next/font/google`, which is worth stating because it corrects a claim
 * DESIGN.md made on the way in: next/font **self-hosts**. It downloads the
 * faces at build time and serves them from this origin with `display: swap`,
 * so there is no third-party request and nothing render-blocking. Dropping to
 * a system stack would have bought nothing and cost the identity.
 */

export const manrope = Manrope({
  subsets: ['latin', 'latin-ext'],   // latin-ext carries ğ ı ş ç ö ü İ for _tr.md
  weight: 'variable',                // wght 200–800; the scale uses 400/500/600/700
  display: 'swap',
  variable: '--font-manrope',
  fallback: ['Avenir Next', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
  adjustFontFallback: true,
})

export const plexMono = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-plex-mono',
  fallback: ['ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
  adjustFontFallback: true,
})
