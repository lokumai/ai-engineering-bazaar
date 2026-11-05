import fs from 'node:fs'
import path from 'node:path'
import { categoryBySlug } from '@/lib/content/curriculum-file'
import { CONTENT_ROOT } from '@/lib/content/paths'

/**
 * The pixel size of a course image, read out of its header bytes, so the
 * content bundle can give a native reader an image's aspect ratio before the
 * image has arrived.
 *
 * **PNG and JPEG only, decided by the bytes.** Those are the two formats the
 * corpus holds (spec 2.3, measured with `find mini-courses -path '*\/images/*'`),
 * and anything else throws naming the file rather than guessing a size: a
 * reader laid out at a wrong ratio is a visible defect nobody would trace back
 * here. The extension is not consulted, because a misnamed file is still the
 * format its bytes say it is.
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

function jpegSize(bytes: Uint8Array, name: string): ImageSize {
  let at = 2
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
    if (marker >= 0xc0 && marker <= 0xcf && !NOT_A_FRAME.has(marker)) {
      // length(2) precision(1) height(2) width(2)
      return { width: u16(bytes, at + 5, name), height: u16(bytes, at + 3, name) }
    }
    at += length
  }
  return fail(name, 'the JPEG ends before a frame header')
}

/** The size of a PNG or JPEG, from its bytes; `name` is only for the error. */
export function imageSize(bytes: Uint8Array, name: string): ImageSize {
  if (startsWith(bytes, PNG_SIGNATURE)) return pngSize(bytes, name)
  if (startsWith(bytes, [0xff, 0xd8])) return jpegSize(bytes, name)
  return fail(name, 'not a PNG or a JPEG; the bundle carries only those two formats')
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
