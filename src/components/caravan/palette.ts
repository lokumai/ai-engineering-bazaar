/**
 * M91, D116 — the Caravan page's own colours: the shadow theatre of C4, transcribed from
 * `playground/2026-11-round-5/C1-caravan-designs.html` (`.st-shadow`).
 *
 * **Why a module and not `caravan.css`.** A surface stylesheet may hold no colour
 * (`tests/unit/design/surface-stylesheets.test.ts`) and the language may hold none its mockup lacks
 * (`transcription.test.ts`). These are neither: they are the scene's art, the lamplit cloth and the
 * leather, the way the home street's stone and brass live in its SVG. About (M90) set the pattern:
 * stated here once, written into the page as custom properties in one `<style>`, and declared in
 * `caravan.css` with a token of the language as each one's default, so the page keeps a colour if
 * this style were ever missing. `tests/unit/caravan-palette.test.ts` holds the two lists together.
 *
 * The scene is the same in both of the site's themes: a shadow play is watched in the dark. The card
 * and the strip are not here: they are the language's slab and bar (`caravan.css`). The puppets and
 * the props carry their own colours in `scene/art.ts`.
 */

const PROPERTIES: Readonly<Record<string, string>> = {
  /* the theatre: the wooden frame, the lit cloth and its weave, the lamp's falloff */
  frame: '#2a1a10',
  wood: '#4a2c18',
  gilt: '#b8873b',
  'cloth-a': '#fbecc4',
  'cloth-b': '#efd296',
  'cloth-c': '#c98f4e',
  weave: 'rgba(120, 70, 20, 0.05)',
  lamp: 'rgba(70, 30, 0, 0.38)',
  valance: '#8e1f26',
  'valance-deep': '#6d1219',
  /* the leather: every cut edge, the roads, the year on a post, and a stop's name */
  hide: '#3b2412',
  hill: 'rgba(122, 74, 134, 0.18)',
  'hill-edge': 'rgba(59, 36, 18, 0.3)',
  land: 'rgba(47, 140, 134, 0.55)',
  'lamp-lit': '#ffd88a',
  /* the focus ring on the leather, the card and the strip: the lamp, which keeps 3:1 on all three */
  focus: '#ffd88a',
}

/** The selector the properties are declared on: the page's own root. */
export const PALETTE_SCOPE = '.bz-caravan'

/** Every property name this module declares, with its `--caravan-` prefix. */
export const CARAVAN_PROPERTIES: readonly string[] = Object.keys(PROPERTIES).map((name) => `--caravan-${name}`)

export function caravanPaletteCss(): string {
  const body = Object.entries(PROPERTIES).map(([name, value]) => `--caravan-${name}:${value};`).join('')
  return `${PALETTE_SCOPE}{${body}}`
}
