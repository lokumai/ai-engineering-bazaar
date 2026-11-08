/**
 * The three palettes a reader can put the code in.
 *
 * The author, 2026-10-11, on the diagrams and the code: *"add an option which a
 * squared button/icon appears on top right corner and when clicked on, shows 3
 * coloring options"* and *"do the same and allow 3 options of highlighting"*.
 *
 * **Code only since 2026-11-08.** The diagrams shared this list until the author asked
 * for Mermaid's own themes instead (`diagram-themes.ts`); the two choices were already
 * separate fields and are now unrelated lists. Nothing about the code's three palettes
 * changed: the same names, the same grounds, the same `codePalette` field.
 *
 * **No new colour.** Every palette is assembled in `src/design/bazaar.css`
 * from values the language already declares, because
 * `tests/unit/design/transcription.test.ts` holds the language's colour set to
 * the shell mockups' in both directions. `Night` is the slab as it was;
 * `Paper` is the bar's own fixed powder with cobalt, clay and the slab's
 * arrow grey for ink; `Blueprint` is the bar's cobalt with the slab's own
 * token colours, which were tuned for a dark ground and clear it.
 *
 * **Channel A, like the catalog's view.** The choice is a `prefs` field written
 * through `store.ts`, `boot.ts` stamps it on `<html>` before first paint, and
 * the stylesheet does the rest — so a reader who chose Paper never sees a
 * Night code block first, and the options' own check mark is drawn by the same
 * rule rather than by React.
 */
export const PALETTE_IDS = ['night', 'paper', 'blueprint'] as const

export type PaletteId = (typeof PALETTE_IDS)[number]

export interface Palette {
  id: PaletteId
  /** The word in the menu. Sentence case, one word. */
  name: string
}

export const PALETTES: readonly Palette[] = [
  { id: 'night', name: 'Night' },
  { id: 'paper', name: 'Paper' },
  { id: 'blueprint', name: 'Blueprint' },
]

/** What a reader who has never chosen gets: the slab, as it was designed. */
export const DEFAULT_PALETTE: PaletteId = 'night'

/** What a palette applies to, and what it is called in the UI. */
export const PALETTE_SUBJECTS = {
  code: { attribute: 'data-hl-code', label: 'Code colours' },
} as const

export type PaletteSubject = keyof typeof PALETTE_SUBJECTS

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === 'string' && (PALETTE_IDS as readonly string[]).includes(value)
}
