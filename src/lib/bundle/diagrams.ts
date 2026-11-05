import { createHash } from 'node:crypto'
import type { DiagramVariant } from './schema'

/**
 * The name of a diagram file, decided before the file exists.
 *
 * **The remapped source and the variant, and nothing else** (spec 2.9.2). Both
 * are known when the module route runs, so the module document names the file
 * and the finaliser draws it later. The render inputs (the stylesheet, mermaid,
 * the flattener, the font, Chromium) are deliberately left out: when one of
 * them changes, the drawn bytes change, so their hash in `index.json`'s
 * `files` changes and so does `contentVersion`, and the app fetches the file
 * again as `<path>?v=<sha256>`. Putting them in the id as well was the earlier
 * draft's Decision W2, withdrawn.
 *
 * The NUL between the two cannot occur in a mermaid source, so no source and
 * variant pair can collide with another by moving characters across the seam.
 */

const ID = /^[0-9a-f]{32}$/

export function diagramId(source: string, variant: DiagramVariant): string {
  return createHash('sha256').update(source + '\u0000' + variant).digest('hex').slice(0, 32)
}

/** Site-relative: no base path and no leading slash (spec 2.5). */
export function diagramPath(id: string): string {
  if (!ID.test(id)) throw new Error(`diagrams: "${id}" is not a 32-hex diagram id`)
  return `api/v1/diagrams/${id}.svg`
}
