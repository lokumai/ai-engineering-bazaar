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
const EXIF_HEADER = [0x45, 0x78, 0x69, 0x66, 0, 0]

/**
 * An APP1 Exif segment whose IFD0 holds one entry. With `orientation`
 * undefined the IFD carries a different tag, as a file with no orientation does.
 */
function exifSegment(orientation: number | undefined, order: 'MM' | 'II' = 'MM'): number[] {
  const be = order === 'MM'
  const two = (value: number) => (be ? u16(value) : u16(value).reverse())
  const four = (value: number) => (be ? u32(value) : u32(value).reverse())
  const tag = orientation === undefined ? 0x010f : 0x0112
  const tiff = [
    ...(be ? [0x4d, 0x4d] : [0x49, 0x49]), ...two(42), ...four(8),
    ...two(1), ...two(tag), ...two(3), ...four(1), ...two(orientation ?? 1), 0, 0,
    ...four(0),
  ]
  return segment(0xe1, [...EXIF_HEADER, ...tiff])
}

const exif = exifSegment(1)
const dht = segment(0xc4, new Array(29).fill(1))

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))
const le32 = (value: number) => [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >>> 24) & 0xff]
const le24 = (value: number) => [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff]

/** A RIFF WebP holding one chunk; the RIFF size is not read, so it is a placeholder. */
function webp(fourcc: string, payload: number[]): Uint8Array {
  return Uint8Array.from([...ascii('RIFF'), ...le32(4 + 8 + payload.length), ...ascii('WEBP'), ...ascii(fourcc), ...le32(payload.length), ...payload])
}

/** Lossy: a frame tag, the start code, then 14-bit width and height with two scale bits each. */
const vp8 = (width: number, height: number) =>
  webp('VP8 ', [0x9d, 0x00, 0x00, 0x9d, 0x01, 0x2a, width & 0xff, (width >> 8) & 0x3f, height & 0xff, (height >> 8) & 0x3f, 0, 0])

/** Lossless: the 0x2f signature, then width-1 and height-1 in 14 bits each, packed little-endian. */
function vp8l(width: number, height: number): Uint8Array {
  const bits = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14)
  return webp('VP8L', [0x2f, ...le32(bits), 0])
}

/** Extended: flags, three reserved bytes, then the canvas width-1 and height-1 in 24 bits each. */
const vp8x = (width: number, height: number, flags = 0) =>
  webp('VP8X', [flags, 0, 0, 0, ...le24(width - 1), ...le24(height - 1)])

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

  // Every renderer turns the image by its Exif orientation, so a reader that
  // reserved the stored size would lay a portrait photo out as a landscape.
  describe('reports a JPEG at the size it is drawn, after its Exif orientation', () => {
    for (const orientation of [5, 6, 7, 8]) {
      it(`swaps width and height for orientation ${orientation}`, () => {
        expect(imageSize(jpeg(exifSegment(orientation), sof(0xc0, 4032, 3024)), 'a.jpg')).toEqual({ width: 3024, height: 4032 })
      })
    }

    for (const orientation of [1, 2, 3, 4]) {
      it(`keeps width and height for orientation ${orientation}`, () => {
        expect(imageSize(jpeg(exifSegment(orientation), sof(0xc0, 4032, 3024)), 'a.jpg')).toEqual({ width: 4032, height: 3024 })
      })
    }

    it('reads a little-endian Exif block', () => {
      expect(imageSize(jpeg(exifSegment(6, 'II'), sof(0xc0, 40, 30)), 'a.jpg')).toEqual({ width: 30, height: 40 })
    })

    it('keeps the stored size when the Exif block has no orientation', () => {
      expect(imageSize(jpeg(exifSegment(undefined), sof(0xc0, 40, 30)), 'a.jpg')).toEqual({ width: 40, height: 30 })
    })

    it('refuses an orientation outside 1 to 8, naming the file', () => {
      expect(() => imageSize(jpeg(exifSegment(9), sof(0xc0, 40, 30)), 'images/odd.jpg')).toThrow(/images\/odd\.jpg/)
    })

    it('refuses an Exif block it cannot read, naming the file', () => {
      const garbage = segment(0xe1, [...EXIF_HEADER, ...new Array(40).fill(7)])
      expect(() => imageSize(jpeg(garbage, sof(0xc0, 40, 30)), 'images/bad.jpg')).toThrow(/images\/bad\.jpg/)
    })
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

  it('reads a lossy WebP', () => {
    expect(imageSize(vp8(1280, 720), 'a.webp')).toEqual({ width: 1280, height: 720 })
  })

  it('reads a lossless WebP', () => {
    expect(imageSize(vp8l(1000, 600), 'a.webp')).toEqual({ width: 1000, height: 600 })
  })

  it('reads an extended WebP at its canvas size, animated or not', () => {
    expect(imageSize(vp8x(1201, 704), 'a.webp')).toEqual({ width: 1201, height: 704 })
    expect(imageSize(vp8x(1201, 704, 0x12), 'a.webp')).toEqual({ width: 1201, height: 704 })
  })

  it('refuses a lossy WebP without its start code, naming the file', () => {
    const broken = vp8(10, 10)
    broken[23] = 0
    expect(() => imageSize(broken, 'bad.webp')).toThrow(/bad\.webp/)
  })

  it('refuses a WebP whose first chunk is not an image, naming the file', () => {
    expect(() => imageSize(webp('ICCP', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 'odd.webp')).toThrow(/odd\.webp/)
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
