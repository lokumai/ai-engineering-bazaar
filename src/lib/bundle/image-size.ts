import fs from 'node:fs'
import path from 'node:path'
import { categoryBySlug } from '@/lib/content/curriculum-file'
import { CONTENT_ROOT } from '@/lib/content/paths'

/**
 * The pixel size of a course image, read out of its header bytes, so the
 * content bundle can give a native reader an image's aspect ratio before the
 * image has arrived.
 *
 * **PNG, JPEG and WebP, decided by the bytes.** Those are the formats the
 * corpus holds (measured with `find mini-courses -path '*\/images/*'`; WebP
 * arrived with the For Everyone figures, one of them animated), and every one
 * of them a Flutter `Image` draws, animation included. Anything else throws
 * naming the file rather than guessing a size: a
 * reader laid out at a wrong ratio is a visible defect nobody would trace back
 * here. The extension is not consulted, because a misnamed file is still the
 * format its bytes say it is.
 *
 * **A JPEG is reported at the size it is drawn**, after its Exif orientation:
 * orientations 5 to 8 turn the image a quarter, every renderer the reader might
 * use honours them, and the frame header alone would reserve a landscape box
 * for a portrait photo. An Exif block that cannot be read, or an orientation
 * outside 1 to 8, throws naming the file for the same reason as above.
 *
 * No image library: a header is a few dozen bytes at known offsets, and a
 * dependency that decodes whole images to answer that is weight with no use.
 *
 * Build-time only (`node:fs`).
 */

export interface ImageSize {
  width: number
  height: number
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/**
 * The start-of-frame markers `C0` to `CF` carry the frame size, except the
 * three in that range that are something else: `C4` defines Huffman tables,
 * `C8` is reserved, and `CC` defines arithmetic-coding conditioning.
 */
const NOT_A_FRAME = new Set([0xc4, 0xc8, 0xcc])

/** Markers that stand alone, with no length after them. */
function isStandalone(marker: number): boolean {
  return marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)
}

function fail(name: string, why: string): never {
  throw new Error(`image-size: ${name}: ${why}`)
}

function startsWith(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return prefix.every((byte, at) => bytes[at] === byte)
}

function u16(bytes: Uint8Array, at: number, name: string): number {
  if (at + 2 > bytes.length) fail(name, 'the header ends early')
  return (bytes[at] << 8) | bytes[at + 1]
}

function u32(bytes: Uint8Array, at: number, name: string): number {
  if (at + 4 > bytes.length) fail(name, 'the header ends early')
  return ((bytes[at] << 24) >>> 0) + (bytes[at + 1] << 16) + (bytes[at + 2] << 8) + bytes[at + 3]
}

function pngSize(bytes: Uint8Array, name: string): ImageSize {
  const chunk = String.fromCharCode(...bytes.subarray(12, 16))
  if (chunk !== 'IHDR') fail(name, `the first PNG chunk is "${chunk}", not IHDR`)
  return { width: u32(bytes, 16, name), height: u32(bytes, 20, name) }
}

const EXIF_HEADER = [0x45, 0x78, 0x69, 0x66, 0, 0]
const ORIENTATION_TAG = 0x0112
const TIFF_SHORT = 3

/**
 * The Exif orientation in an APP1 payload, 1 when its IFD0 has none, or
 * `undefined` when the APP1 is not Exif at all (XMP shares the marker).
 */
function exifOrientation(bytes: Uint8Array, start: number, end: number, name: string): number | undefined {
  if (end > bytes.length) fail(name, 'the Exif block ends early')
  if (!startsWith(bytes.subarray(start, end), EXIF_HEADER)) return undefined
  const tiff = start + EXIF_HEADER.length
  const order = String.fromCharCode(bytes[tiff] ?? 0, bytes[tiff + 1] ?? 0)
  if (order !== 'II' && order !== 'MM') fail(name, `the Exif block has byte order "${order}", not II or MM`)
  const little = order === 'II'
  const read = (offset: number, size: 2 | 4): number => {
    const at = tiff + offset
    if (offset < 0 || at + size > end) fail(name, 'the Exif block ends early')
    let value = 0
    for (let index = 0; index < size; index += 1) {
      value = value * 256 + bytes[little ? at + size - 1 - index : at + index]
    }
    return value
  }
  if (read(2, 2) !== 42) fail(name, 'the Exif block is not a TIFF structure')
  const ifd = read(4, 4)
  const count = read(ifd, 2)
  for (let index = 0; index < count; index += 1) {
    const entry = ifd + 2 + index * 12
    if (read(entry, 2) !== ORIENTATION_TAG) continue
    if (read(entry + 2, 2) !== TIFF_SHORT || read(entry + 4, 4) !== 1) fail(name, 'the Exif orientation is not one short')
    const orientation = read(entry + 8, 2)
    if (orientation < 1 || orientation > 8) fail(name, `the Exif orientation is ${orientation}, not 1 to 8`)
    return orientation
  }
  return 1
}

function jpegSize(bytes: Uint8Array, name: string): ImageSize {
  let at = 2
  let orientation = 1
  while (at < bytes.length) {
    if (bytes[at] !== 0xff) fail(name, `no JPEG marker at byte ${at}`)
    // Any number of 0xFF fill bytes may precede a marker.
    while (bytes[at] === 0xff) at += 1
    if (at >= bytes.length) break
    const marker = bytes[at]
    at += 1

    if (isStandalone(marker)) continue
    if (marker === 0xd9 || marker === 0xda) fail(name, 'the JPEG has no frame header before its image data')

    const length = u16(bytes, at, name)
    if (marker === 0xe1) orientation = exifOrientation(bytes, at + 2, at + length, name) ?? orientation
    if (marker >= 0xc0 && marker <= 0xcf && !NOT_A_FRAME.has(marker)) {
      // length(2) precision(1) height(2) width(2)
      const width = u16(bytes, at + 5, name)
      const height = u16(bytes, at + 3, name)
      // 5 to 8 transpose the image; 1 to 4 only mirror or half-turn it.
      return orientation >= 5 ? { width: height, height: width } : { width, height }
    }
    at += length
  }
  return fail(name, 'the JPEG ends before a frame header')
}

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))

function le16(bytes: Uint8Array, at: number, name: string): number {
  if (at + 2 > bytes.length) fail(name, 'the WebP ends inside its header')
  return bytes[at] | (bytes[at + 1] << 8)
}

function le24(bytes: Uint8Array, at: number, name: string): number {
  if (at + 3 > bytes.length) fail(name, 'the WebP ends inside its header')
  return bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16)
}

/**
 * The first chunk of a RIFF WebP says how to read the size: `VP8 ` (lossy) in
 * its key frame header, `VP8L` (lossless) packed into 14-bit fields, `VP8X`
 * (extended, which an animated or alpha image needs) as the canvas size. The
 * offsets are the WebP container specification's.
 */
function webpSize(bytes: Uint8Array, name: string): ImageSize {
  const chunk = String.fromCharCode(...bytes.slice(12, 16))
  const data = 20
  if (chunk === 'VP8 ') {
    if (!startsWith(bytes.slice(data + 3), [0x9d, 0x01, 0x2a])) fail(name, 'the lossy WebP has no key frame start code')
    return { width: le16(bytes, data + 6, name) & 0x3fff, height: le16(bytes, data + 8, name) & 0x3fff }
  }
  if (chunk === 'VP8L') {
    if (bytes[data] !== 0x2f) fail(name, 'the lossless WebP has no signature byte')
    const bits = (le16(bytes, data + 1, name) | (le16(bytes, data + 3, name) << 16)) >>> 0
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }
  }
  if (chunk === 'VP8X') {
    return { width: le24(bytes, data + 4, name) + 1, height: le24(bytes, data + 7, name) + 1 }
  }
  return fail(name, `the WebP opens with a "${chunk}" chunk, not VP8, VP8L or VP8X`)
}

/** The size of a PNG, JPEG or WebP, from its bytes; `name` is only for the error. */
export function imageSize(bytes: Uint8Array, name: string): ImageSize {
  if (startsWith(bytes, PNG_SIGNATURE)) return pngSize(bytes, name)
  if (startsWith(bytes, [0xff, 0xd8])) return jpegSize(bytes, name)
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes.slice(8), ascii('WEBP'))) return webpSize(bytes, name)
  return fail(name, 'not a PNG, a JPEG or a WebP; the bundle carries only those formats')
}

/** `course-images/<level>/<file>`, the site-relative path `imagePathFor` writes. */
const COURSE_IMAGE = /^course-images\/([^/]+)\/([^/]+)$/

/**
 * The size of a course image named by its site-relative path, read from the
 * file the prebuild copies it from: `mini-courses/<dir>/images/<file>`. Reading
 * the source rather than `public/course-images/` keeps this independent of
 * whether the prebuild has run.
 */
export function courseImageSize(imagePath: string): ImageSize {
  const parts = COURSE_IMAGE.exec(imagePath)
  if (!parts) throw new Error(`image-size: "${imagePath}" is not a course-images/<level>/<file> path`)
  const category = categoryBySlug(parts[1])
  if (!category) throw new Error(`image-size: "${imagePath}" names no level "${parts[1]}"`)
  const file = path.join(CONTENT_ROOT, category.dir, 'images', parts[2])
  if (!fs.existsSync(file)) throw new Error(`image-size: "${imagePath}" has no file at ${file}`)
  return imageSize(fs.readFileSync(file), imagePath)
}
