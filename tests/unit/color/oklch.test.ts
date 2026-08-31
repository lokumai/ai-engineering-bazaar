import { describe, expect, it } from 'vitest'
import { oklchToHex } from '@/lib/color/oklch'

/**
 * The reference vectors are the three sRGB primaries and the achromatic
 * endpoints, whose OKLCh coordinates are published values. A converter that
 * reproduces them is converting, not approximating.
 */
describe('oklchToHex', () => {
  it('round-trips the sRGB primaries', () => {
    expect(oklchToHex('oklch(0.62796 0.25768 29.234)')).toBe('#FF0000')
    expect(oklchToHex('oklch(0.86644 0.29483 142.4953)')).toBe('#00FF00')
    expect(oklchToHex('oklch(0.45201 0.31321 264.052)')).toBe('#0000FF')
  })

  it('round-trips the achromatic endpoints', () => {
    expect(oklchToHex('oklch(1 0 0)')).toBe('#FFFFFF')
    expect(oklchToHex('oklch(0 0 0)')).toBe('#000000')
    expect(oklchToHex('oklch(0.5 0 0)')).toBe('#636363')
  })

  it('accepts a percentage lightness', () => {
    expect(oklchToHex('oklch(50% 0 0)')).toBe('#636363')
  })

  it('gamut-maps a chroma sRGB cannot show, instead of clipping the hue', () => {
    // Far outside sRGB at this lightness; the result must still be a colour of
    // roughly the right hue rather than a channel-clipped magenta.
    const hex = oklchToHex('oklch(0.7 0.4 30)')
    expect(hex).toMatch(/^#[0-9A-F]{6}$/)
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
    expect(r).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(b)
  })

  it('rejects anything that is not an oklch() triple', () => {
    expect(() => oklchToHex('#ff0000')).toThrow(/oklch/i)
    expect(() => oklchToHex('oklch(0.5 0.1)')).toThrow(/oklch/i)
  })

  it('rejects an alpha channel, which a syntax theme cannot carry', () => {
    expect(() => oklchToHex('oklch(0.585 0.196 32 / 0.08)')).toThrow(/alpha/i)
  })
})
