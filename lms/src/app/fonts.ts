import { IBM_Plex_Sans_Condensed, Source_Serif_4, IBM_Plex_Mono } from 'next/font/google'

/**
 * Three voices, one rule (spec §3): machine-derived values are mono, frame and
 * chrome are condensed sans, human argument is serif. Google Fonts only, via
 * next/font/google — no other host, no self-hosting, no local files.
 */

export const plexCondensed = IBM_Plex_Sans_Condensed({
  subsets: ['latin', 'latin-ext'],   // latin-ext carries ğ ı ş ç ö ü İ for _tr.md
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-plex-condensed',
  fallback: ['IBM Plex Sans', 'Helvetica Neue', 'Arial', 'sans-serif'],
  adjustFontFallback: true,
})

export const sourceSerif = Source_Serif_4({
  subsets: ['latin', 'latin-ext'],
  weight: 'variable',                // wght axis
  axes: ['opsz'],                    // optical size 8–60 — the reason to pick this face
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-source-serif',
  fallback: ['Charter', 'Bitstream Charter', 'Georgia', 'serif'],
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
