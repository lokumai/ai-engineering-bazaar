/**
 * §6.10 B5's EXPAND overlay: "the SVG at natural size, pan by drag, zoom by
 * `+`/`−`/scroll, `Esc` closes".
 *
 * Direct manipulation, not animation: every function here returns the next
 * view and the overlay writes it straight onto a `transform`. Nothing
 * transitions — §9.1 forbids the lot, and a diagram that eases into place
 * under the cursor is exactly the lag a reader is trying to zoom past.
 */

export interface View {
  /** 1 is the diagram's natural size, which is where the overlay opens. */
  scale: number
  /** Pan, in unscaled CSS pixels, applied before the scale. */
  x: number
  y: number
}

/** Half natural size shows the widest figure in the corpus whole. */
export const MIN_SCALE = 0.5
/** Four times natural reads a 13px label at arm's length. */
export const MAX_SCALE = 4
/** One press, one notch: a quarter more or a fifth less. */
export const ZOOM_STEP = 1.25

export const RESET_VIEW: View = { scale: 1, x: 0, y: 0 }

/** Four decimals: enough that a step out and back lands exactly on 1 again. */
function round(value: number): number {
  return Math.round(value * 1e4) / 1e4
}

export function clampScale(scale: number): number {
  if (!Number.isFinite(scale)) return 1
  return round(Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale)))
}

/** Zoom about the centre of the viewport; the pan is untouched. */
export function zoomBy(view: View, factor: number): View {
  return { ...view, scale: clampScale(view.scale * factor) }
}

export function zoomIn(view: View): View {
  return zoomBy(view, ZOOM_STEP)
}

export function zoomOut(view: View): View {
  return zoomBy(view, 1 / ZOOM_STEP)
}

/**
 * A drag moves the drawing one-for-one with the pointer. The offset is stored
 * unscaled and applied before `scale()`, so the paper keeps up with the hand at
 * every zoom level.
 */
export function panBy(view: View, dx: number, dy: number): View {
  return { ...view, x: round(view.x + dx), y: round(view.y + dy) }
}

export function transformOf(view: View): string {
  return `translate(${view.x}px, ${view.y}px) scale(${view.scale})`
}

/**
 * The two keys §6.10 names. `=` and `_` are the unshifted faces of `+` and `−`
 * on a US keyboard, so a reader who does not reach for Shift still zooms.
 * Everything else — `Esc` included — belongs to the dialog.
 */
export function zoomIntent(key: string): 'in' | 'out' | null {
  if (key === '+' || key === '=') return 'in'
  if (key === '-' || key === '_') return 'out'
  return null
}

/** Scroll up (a negative delta, away from the reader) magnifies. */
export function wheelFactor(deltaY: number): number {
  if (deltaY === 0) return 1
  return deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP
}
