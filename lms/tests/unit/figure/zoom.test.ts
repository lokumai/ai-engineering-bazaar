import { describe, expect, it } from 'vitest'
import {
  MAX_SCALE,
  MIN_SCALE,
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
})
