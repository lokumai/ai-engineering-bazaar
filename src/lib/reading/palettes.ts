/**
 * The three palettes a reader can put the diagrams and the code in.
 *
 * The author, 2026-10-11, on the diagrams: *"I do not like the colors. add an
 * option which a squared button/icon appears on top right corner and when
 * clicked on, shows 3 coloring options"* — and on the code, *"do the same and
 * allow 3 options of highlighting"*.
 *
 * **One list for both, chosen separately.** A diagram and a code block are the
 * two things on a module page drawn on their own ground, so the same three
 * grounds answer both, under the same three names — a reader who learns what
 * `Paper` means on one learns it on the other. They are still two choices,
 * because a reader may well want light diagrams beside dark code.
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
 * Night diagram first, and the options' own check mark is drawn by the same
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

/** The two things a palette applies to, and what each is called in the UI. */
export const PALETTE_SUBJECTS = {
  figures: { attribute: 'data-hl-figures', label: 'Diagram colours' },
  code: { attribute: 'data-hl-code', label: 'Code colours' },
} as const

export type PaletteSubject = keyof typeof PALETTE_SUBJECTS

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === 'string' && (PALETTE_IDS as readonly string[]).includes(value)
}
