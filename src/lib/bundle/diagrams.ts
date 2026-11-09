import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { MermaidConfig } from 'mermaid'
import { mermaidConfig } from '@/lib/figure/mermaid-config'
import { DEFAULT_DIAGRAM_THEME, type DiagramThemeId, diagramThemeOf } from '@/lib/reading/diagram-themes'
import { DIAGRAM_FONT } from '../../../scripts/lib/diagram-font.mjs'
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

/**
 * D107 — the Mermaid theme each variant is drawn in. The web lets a reader pick
 * any of Mermaid's ten themes and starts everyone on `default`; the mobile
 * reader has no menu and follows the device's light or dark mode, so it takes
 * the web's default for light and Mermaid's own `dark` for dark, each on the
 * ground Mermaid gives it (`diagram-themes.ts`), so a diagram looks the way
 * Mermaid itself shows that theme, as the author asked of the web.
 */
export const VARIANT_THEMES: Readonly<Record<DiagramVariant, DiagramThemeId>> = {
  light: DEFAULT_DIAGRAM_THEME,
  dark: 'dark',
}

/** Each variant's theme and its ground, as the index's `diagramThemes` carries them. */
export function diagramThemes(): Record<DiagramVariant, { theme: string; background: string }> {
  const of = (variant: DiagramVariant) => {
    const theme = diagramThemeOf(VARIANT_THEMES[variant])
    if (theme.id !== VARIANT_THEMES[variant]) throw new Error(`diagrams: "${VARIANT_THEMES[variant]}" is not a diagram-themes.ts theme`)
    return { theme: theme.id, background: theme.background }
  }
  return { light: of('light'), dark: of('dark') }
}

/**
 * The exact config the finaliser hands to mermaid for one variant, serialised
 * into the draft index as `render` so the finaliser never builds one of its
 * own (spec 2.5, 2.9.3). It is the page's `mermaidConfig(theme)` with two keys
 * changed and nothing else, so a bundle diagram and a page diagram in the same
 * theme are laid out by one config:
 *
 * - a top-level `htmlLabels: false`, because a bundle SVG may hold no
 *   `foreignObject` (spec 2.9.4) and mermaid 11 reads the root-level key over
 *   the deprecated `flowchart.htmlLabels`;
 * - `themeVariables.fontFamily`, the pinned diagram face, because the page's
 *   `var(--font-sans)` resolves to nothing outside the site's stylesheet, and
 *   a label measured in a fallback face is drawn at the wrong width.
 */
export function diagramRenderConfig(variant: DiagramVariant): MermaidConfig & { htmlLabels: false } {
  const base = mermaidConfig(VARIANT_THEMES[variant])
  if (base.themeVariables === undefined) throw new Error('diagrams: mermaidConfig() has no themeVariables to set the diagram font in')
  return {
    ...base,
    htmlLabels: false,
    themeVariables: { ...base.themeVariables, fontFamily: DIAGRAM_FONT.family },
  }
}

/**
 * The diagram face and the sha256 of its bytes, as the index's `diagramFont`
 * carries them: a changed font file changes every drawn label, so the reader
 * is told which face drew them.
 */
export function diagramFont(): { family: 'Vazirmatn'; sha256: string } {
  const file = path.resolve(process.cwd(), DIAGRAM_FONT.file)
  let bytes: Buffer
  try {
    bytes = readFileSync(file)
  } catch (error) {
    throw new Error(`diagrams: the diagram font ${DIAGRAM_FONT.file} cannot be read; run npm install`, { cause: error })
  }
  return { family: DIAGRAM_FONT.family, sha256: createHash('sha256').update(bytes).digest('hex') }
}
