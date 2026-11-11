import { describe, expect, it } from 'vitest'
import { isAnimatedImage } from '@/lib/content/animated'

/**
 * D136 — which images are animated is read from their bytes. Every input is a synthetic header
 * built here, so the rule is held for any content and no fact about the corpus is written down.
 */

const ascii = (text: string) => [...text].map((ch) => ch.charCodeAt(0))
const le32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff]

/** A WebP with an extended header; `flags` is the VP8X feature byte, `chunks` follow it. */
function webp(flags: number, ...chunks: Array<[string, number[]]>): Uint8Array {
  const vp8x = [flags, 0, 0, 0, 9, 0, 0, 9, 0, 0]
  const body = [
    ...ascii('VP8X'), ...le32(vp8x.length), ...vp8x,
    ...chunks.flatMap(([name, payload]) => [
      ...ascii(name), ...le32(payload.length), ...payload, ...(payload.length % 2 ? [0] : []),
    ]),
  ]
  return Uint8Array.from([...ascii('RIFF'), ...le32(body.length + 4), ...ascii('WEBP'), ...body])
}

/** A GIF with `frames` one-pixel images, each behind a graphic-control extension. */
function gif(frames: number): Uint8Array {
  const control = [0x21, 0xf9, 4, 0, 10, 0, 0, 0]
  const image = [0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 0x44, 0x01, 0]
  return Uint8Array.from([
    ...ascii('GIF89a'), 1, 0, 1, 0, 0x80, 0, 0, 0, 0, 0, 255, 255, 255,
    ...Array.from({ length: frames }, () => [...control, ...image]).flat(),
    0x3b,
  ])
}

describe('isAnimatedImage', () => {
  it('is true for a WebP whose VP8X header sets the animation flag', () => {
    expect(isAnimatedImage(webp(0x12))).toBe(true)
    expect(isAnimatedImage(webp(0x12, ['ANIM', [0, 0, 0, 0, 0, 0]]))).toBe(true)
  })

  it('is false for a still WebP, with or without other metadata chunks', () => {
    expect(isAnimatedImage(webp(0x10))).toBe(false)
    expect(isAnimatedImage(webp(0x10, ['ICCP', [1, 2, 3]], ['VP8L', [0x2f, 0, 0, 0, 0]]))).toBe(false)
  })

  it('is true for an ANIM chunk even when the flag was left clear, found past an odd-sized chunk', () => {
    expect(isAnimatedImage(webp(0x00, ['ICCP', [1, 2, 3]], ['ANIM', [0, 0, 0, 0, 0, 0]]))).toBe(true)
  })

  it('is false for a simple (non-VP8X) WebP', () => {
    const body = [...ascii('VP8L'), ...le32(5), 0x2f, 0, 0, 0, 0, 0]
    expect(isAnimatedImage(Uint8Array.from([...ascii('RIFF'), ...le32(body.length + 4), ...ascii('WEBP'), ...body]))).toBe(false)
  })

  it('is true for a GIF of two frames and false for one frame', () => {
    expect(isAnimatedImage(gif(2))).toBe(true)
    expect(isAnimatedImage(gif(1))).toBe(false)
  })

  it('does not take a 0x2c byte inside a GIF frame for a second frame', () => {
    const one = gif(1)
    const noisy = Uint8Array.from([...one.slice(0, one.length - 4), 0x2c, 0x2c, 0x2c, ...one.slice(one.length - 1)])
    expect(isAnimatedImage(gif(1))).toBe(false)
    expect(isAnimatedImage(noisy)).toBe(false)
  })

  it('is false for a PNG, a JPEG, an empty file and a truncated one', () => {
    expect(isAnimatedImage(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]))).toBe(false)
    expect(isAnimatedImage(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 2]))).toBe(false)
    expect(isAnimatedImage(new Uint8Array())).toBe(false)
    expect(isAnimatedImage(Uint8Array.from(ascii('RIFF')))).toBe(false)
    expect(isAnimatedImage(Uint8Array.from(ascii('GIF89a')))).toBe(false)
  })
})
