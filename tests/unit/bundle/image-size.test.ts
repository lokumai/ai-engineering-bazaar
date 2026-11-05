import { describe, expect, it } from 'vitest'
import { imageSize } from '@/lib/bundle/image-size'

/**
 * Image dimensions read from the header bytes, for the two formats the corpus
 * holds. Every input is a synthetic header built here, so no fact about the
 * corpus is written down.
 */

const u16 = (value: number) => [(value >> 8) & 0xff, value & 0xff]
const u32 = (value: number) => [(value >>> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]

function png(width: number, height: number): Uint8Array {
  return Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...u32(13), 0x49, 0x48, 0x44, 0x52,
    ...u32(width), ...u32(height),
    8, 6, 0, 0, 0,
    0, 0, 0, 0,
  ])
}

/** A segment with its two length bytes, which count themselves. */
function segment(marker: number, payload: number[]): number[] {
  return [0xff, marker, ...u16(payload.length + 2), ...payload]
}

function sof(marker: number, width: number, height: number): number[] {
  return segment(marker, [8, ...u16(height), ...u16(width), 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1])
}

function jpeg(...segments: number[][]): Uint8Array {
  return Uint8Array.from([0xff, 0xd8, ...segments.flat(), 0xff, 0xd9])
}

const app0 = segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0])
const exif = segment(0xe1, [0x45, 0x78, 0x69, 0x66, 0, 0, ...new Array(40).fill(7)])
const dht = segment(0xc4, new Array(29).fill(1))

describe('imageSize', () => {
  it('reads a PNG header', () => {
    expect(imageSize(png(640, 480), 'a.png')).toEqual({ width: 640, height: 480 })
  })

  it('reads a large PNG without sign trouble', () => {
    expect(imageSize(png(70000, 2), 'a.png')).toEqual({ width: 70000, height: 2 })
  })

  it('reads a baseline JPEG', () => {
    expect(imageSize(jpeg(app0, dht, sof(0xc0, 1200, 800)), 'a.jpg')).toEqual({ width: 1200, height: 800 })
  })

  it('reads a JPEG whose EXIF segment comes before the frame', () => {
    expect(imageSize(jpeg(exif, sof(0xc0, 33, 44)), 'a.jpeg')).toEqual({ width: 33, height: 44 })
  })

  it('reads a progressive JPEG', () => {
    expect(imageSize(jpeg(app0, sof(0xc2, 512, 256)), 'a.jpg')).toEqual({ width: 512, height: 256 })
  })

  it('does not take a Huffman table for a frame', () => {
    expect(imageSize(jpeg(dht, sof(0xc1, 9, 10)), 'a.jpg')).toEqual({ width: 9, height: 10 })
  })

  it('decides the format by its bytes and not its name', () => {
    expect(imageSize(png(5, 6), 'misnamed.jpg')).toEqual({ width: 5, height: 6 })
  })

  it('refuses a GIF, naming the file', () => {
    const gif = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 10, 0, 10, 0])
    expect(() => imageSize(gif, 'images/anim.gif')).toThrow(/images\/anim\.gif/)
  })

  it('refuses a JPEG with no frame header, naming the file', () => {
    expect(() => imageSize(jpeg(app0), 'images/empty.jpg')).toThrow(/images\/empty\.jpg/)
  })

  it('refuses a truncated PNG, naming the file', () => {
    expect(() => imageSize(png(1, 1).slice(0, 20), 'images/cut.png')).toThrow(/images\/cut\.png/)
  })
})
