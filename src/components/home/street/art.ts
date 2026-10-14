import fs from 'node:fs'
import path from 'node:path'

/**
 * The bazaar's art, read at build time and handed to the page as markup.
 *
 * The pictures are the concept's own SVG, kept as files in `./art/` exactly as
 * they were drawn, rather than re-typed as JSX: about 390 KB of paths, clips and
 * gradients that nothing on the server needs to understand, and that the
 * motion finds by class and `data-*` attribute. Re-typing them as JSX would
 * turn every `stroke-width` into `strokeWidth` by hand and make the next change
 * to the drawing a hunt through a component.
 *
 * Build-time only (`node:fs`), so a server component reads it and a client
 * component never imports it. The illustration keeps its own colours, the way a
 * mindmap keeps its own palette: its stone, wood and brass are not tokens of
 * the language and are not meant to be (D79). Everything a reader READS on the
 * page is outside these files, in JSX, on the language's tokens.
 */

const ART = path.resolve(process.cwd(), 'src/components/home/street/art')

const cache = new Map<string, string>()

export type ArtName =
  | 'defs'
  | 'gate'
  | 'walk'
  | 'stall-scribe'
  | 'stall-scale'
  | 'stall-pictures'
  | 'stall-papers'
  | `icon-${1 | 2 | 3 | 4}`
  | `door-${1 | 2 | 3 | 4 | 5}`
  | `tray-${1 | 2 | 3 | 4 | 5}`

export function art(name: ArtName): string {
  const hit = cache.get(name)
  if (hit !== undefined) return hit
  const markup = fs.readFileSync(path.join(ART, `${name}.html`), 'utf8')
  cache.set(name, markup)
  return markup
}
