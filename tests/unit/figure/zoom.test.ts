import { describe, expect, it } from 'vitest'
import {
  FIT_CEILING,
  MAX_SCALE,
  MIN_SCALE,
  PAN_STEP,
  fitScale,
  panIntent,
  RESET_VIEW,
  ZOOM_STEP,
  panBy,
  transformOf,
  wheelFactor,
  zoomBy,
  zoomIn,
  zoomIntent,
  zoomOut,
} from '@/lib/figure/zoom'

/**
 * §6.10 B5 — the EXPAND overlay: "pan by drag, zoom by `+`/`−`/scroll".
 * The arithmetic lives here so the island holds nothing but DOM wiring.
 */
describe('the expanded view', () => {
  it('opens at natural size, centred', () => {
    expect(RESET_VIEW).toEqual({ scale: 1, x: 0, y: 0 })
  })

  it('steps by a fixed ratio in and out', () => {
    expect(zoomIn(RESET_VIEW).scale).toBe(ZOOM_STEP)
    expect(zoomOut(RESET_VIEW).scale).toBe(1 / ZOOM_STEP)
  })

  it('returns to where it started after a step out and back', () => {
    expect(zoomIn(zoomOut(RESET_VIEW)).scale).toBe(1)
  })

  it('never zooms past the stops in either direction', () => {
    let view = RESET_VIEW
    for (let i = 0; i < 40; i += 1) view = zoomIn(view)
    expect(view.scale).toBe(MAX_SCALE)

    view = RESET_VIEW
    for (let i = 0; i < 40; i += 1) view = zoomOut(view)
    expect(view.scale).toBe(MIN_SCALE)
  })

  it('leaves the pan alone when it zooms', () => {
    const panned = { scale: 1, x: 40, y: -12 }
    expect(zoomBy(panned, 2)).toEqual({ scale: 2, x: 40, y: -12 })
  })

  it('accumulates a drag in unscaled pixels', () => {
    expect(panBy({ scale: 2, x: 10, y: 10 }, -4, 6)).toEqual({ scale: 2, x: 6, y: 16 })
  })

  it('writes a transform the browser can apply with no transition', () => {
    expect(transformOf({ scale: 1.25, x: 8, y: -3 })).toBe('translate(8px, -3px) scale(1.25)')
  })
})

describe('the controls §6.10 names', () => {
  it('reads + and − off the keyboard, and nothing else', () => {
    expect(zoomIntent('+')).toBe('in')
    expect(zoomIntent('=')).toBe('in')
    expect(zoomIntent('-')).toBe('out')
    expect(zoomIntent('_')).toBe('out')
    expect(zoomIntent('a')).toBe(null)
    expect(zoomIntent('Escape')).toBe(null)
  })

  it('zooms in on a scroll up and out on a scroll down', () => {
    expect(wheelFactor(-100)).toBe(ZOOM_STEP)
    expect(wheelFactor(100)).toBe(1 / ZOOM_STEP)
    expect(wheelFactor(0)).toBe(1)
  })
  /* The overlay OPENS fitted, the way an image viewer does, so the whole
     drawing is on screen before anybody zooms. Each case is a rule about the
     arithmetic rather than about any figure in the corpus. */
  it('fits a drawing to the room it has, on whichever axis binds', () => {
    // Wider than the room: the width decides.
    expect(fitScale({ width: 448, height: 2000 }, { width: 800, height: 100 }, 24)).toBe(0.5)
    // Taller than the room: the height decides.
    expect(fitScale({ width: 2000, height: 448 }, { width: 100, height: 800 }, 24)).toBe(0.5)
  })

  it('enlarges a small drawing only so far, and never past the stops', () => {
    expect(fitScale({ width: 4000, height: 4000 }, { width: 100, height: 100 })).toBe(FIT_CEILING)
    expect(FIT_CEILING).toBeLessThanOrEqual(MAX_SCALE)
    expect(fitScale({ width: 100, height: 100 }, { width: 100000, height: 10 })).toBe(MIN_SCALE)
  })

  it('opens at natural size when there is nothing to measure', () => {
    // A hidden element measures 0 by 0; fitting to that would be a division
    // by nothing, and natural size is the honest answer.
    expect(fitScale({ width: 0, height: 0 }, { width: 500, height: 300 })).toBe(1)
    expect(fitScale({ width: 800, height: 600 }, { width: 0, height: 0 })).toBe(1)
  })

  it('pans by a fixed step on the arrow keys, and on nothing else', () => {
    expect(panIntent('ArrowLeft')).toEqual({ dx: PAN_STEP, dy: 0 })
    expect(panIntent('ArrowRight')).toEqual({ dx: -PAN_STEP, dy: 0 })
    expect(panIntent('ArrowUp')).toEqual({ dx: 0, dy: PAN_STEP })
    expect(panIntent('ArrowDown')).toEqual({ dx: 0, dy: -PAN_STEP })
    expect(panIntent('a')).toBe(null)
    expect(panIntent('+')).toBe(null)
  })
})
