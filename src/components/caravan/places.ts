/**
 * M91, D116 — the places the road passes, one a year, each a landmark drawn in `scene/art.ts`
 * (`landmarkArt`, in the same order). They are the scene's art, named the way the mockup names them
 * beside the year ("2023 · The oasis"), not facts about the trends.
 *
 * The road's first year gets the first place and each year after it the next. A road longer than
 * the five drawn starts over at the city gate, which keeps a sixth year drawn rather than blank.
 */
export const PLACES = ['The city gate', 'The oasis', 'The caravanserai town', 'The mountain pass', 'The sea port'] as const

export function placeIndex(year: number, firstYear: number): number {
  return (((year - firstYear) % PLACES.length) + PLACES.length) % PLACES.length
}

export function placeLabel(year: number, firstYear: number): string {
  return `${year} · ${PLACES[placeIndex(year, firstYear)]}`
}
