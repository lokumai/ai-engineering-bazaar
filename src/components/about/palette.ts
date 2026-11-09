/**
 * M90, D115 — the About page's own colours: the grounds of "Dusk to dawn" (B2) and the inks that sit
 * on them, transcribed from `playground/2026-11-round-5/R0-about-design.html`, plus the few colours
 * the CSS-drawn scene (3E) needs.
 *
 * **Why a module and not `about.css`.** A surface stylesheet may not hold a colour
 * (`tests/unit/design/surface-stylesheets.test.ts`), and the language may not hold one its mockup
 * does not contain (`transcription.test.ts`). These are neither: they are the page's art, the way the
 * home street's stone and brass live in its SVG. So they are stated here, once, and the page writes
 * them into one `<style>` as custom properties, the same mechanism `lib/reading/diagram-themes.ts`
 * uses for Mermaid's grounds. `about.css` declares each of them too, with a token of the language as
 * its default, so the page still has colour if this style were ever missing; this unlayered style
 * outranks those layered defaults. `tests/unit/about-palette.test.ts` holds the two lists together.
 *
 * The page is dark in both of the site's themes, as the bar is: the story is told at dusk whatever
 * the reader chose, and arrives at dawn for the motto.
 *
 * The drawn scenes (2A, 4E, 5A) carry their own colours in their own files, as art does.
 */

/** One ground per stall, in order, the hero's before them and the motto's after. A sixth stall reuses the first. */
export const STALL_GROUNDS = ['#2a1417', '#231629', '#111536', '#0d2422', '#271d0e'] as const
/** Each stall's glaze, lifted for the dark ground, in the same order. */
export const STALL_HUES = ['#df8c72', '#bb93c6', '#a3aae6', '#72c4bc', '#e0b86e'] as const
export const HERO_GROUND = '#15152f'
export const MOTTO_GROUND = '#ece1cb'

const PROPERTIES: Readonly<Record<string, string>> = {
  'ground-hero': HERO_GROUND,
  'ground-motto': MOTTO_GROUND,
  ...Object.fromEntries(STALL_GROUNDS.map((one, i) => [`ground-${i + 1}`, one])),
  'hue-hero': '#e0b86e',
  ...Object.fromEntries(STALL_HUES.map((one, i) => [`hue-${i + 1}`, one])),
  'hue-dawn': '#8a6328',

  /* inks on the dark ground */
  ink: '#e7e3d8',
  title: '#f4efe5',
  muted: '#a8acb8',
  'line-2': 'rgba(231, 227, 216, 0.30)',
  gold: '#c8a078',
  /* inks at dawn, on the motto's sand */
  'dawn-ink': '#20242e',
  'dawn-title': '#1b1b47',
  'dawn-muted': '#5d584c',
  'dawn-line-2': 'rgba(27, 27, 71, 0.30)',
  'dawn-gold': '#9a7238',
  /* the ground's own texture: the edge of the lamp's reach, and the shade under the sheet in 3E */
  vignette: 'rgba(4, 4, 12, 0.55)',
  shade: 'rgba(0, 0, 0, 0.55)',

  /* 3E, the seal: the desk's pool, the sheet, the reed and the wax */
  'desk-a': '#2b2347',
  'desk-b': '#1e1a3a',
  'paper-a': '#f4ecdd',
  'paper-b': '#efe6d6',
  'paper-c': '#e3d6bf',
  'paper-edge': 'rgba(0, 0, 0, 0.13)',
  'reed-a': '#6e4a24',
  'reed-b': '#b58a4c',
  'reed-c': '#8a6328',
  'reed-tip': '#2a2240',
  wax: '#b4503f',
  'wax-deep': '#7e3226',
  'wax-edge': 'rgba(0, 0, 0, 0.19)',
}

/** The selector the properties are declared on: the page's `<main>`, so its trail sits on the ground too. */
export const PALETTE_SCOPE = '.bz-main:has(> .bz-about)'

/** Every property name this module declares, with its `--about-` prefix. */
export const ABOUT_PROPERTIES: readonly string[] = Object.keys(PROPERTIES).map((name) => `--about-${name}`)

export function aboutPaletteCss(): string {
  const body = Object.entries(PROPERTIES).map(([name, value]) => `--about-${name}:${value};`).join('')
  return `${PALETTE_SCOPE}{${body}}`
}
