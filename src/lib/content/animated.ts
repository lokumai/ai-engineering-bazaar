import fs from 'node:fs'
import path from 'node:path'
import { categoryBySlug } from './curriculum-file'
import { CONTENT_ROOT } from './paths'

/**
 * M115 (D136) — is a course image animated, decided by its bytes.
 *
 * The replay control (`Affordances`) goes on every animated recording and on nothing else, and
 * which images those are is a fact about the files, so the build reads it from them: no filename
 * list anywhere, and a recording added tomorrow gets its button with no code change. Rejected: a
 * `-animated` suffix or a front-matter flag, which would be a second place the author has to keep
 * true; and the `.webp` extension, because most WebP files here are stills.
 *
 * **WebP.** A `RIFF....WEBP` file whose first chunk is `VP8X` carries its feature flags in the byte
 * after the chunk header, and bit 1 (0x02) is "animation". An animated file also holds an `ANIM`
 * chunk; the flag is what the spec makes authoritative, and an `ANIM` chunk among the chunks that
 * follow is accepted as well, for an encoder that wrote one and forgot the flag.
 *
 * **GIF.** More than one image descriptor. A GIF is walked block by block, not searched for a
 * byte pattern, because `0x2C` turns up inside pixel data.
 *
 * Anything else (PNG, JPEG, an unreadable or missing file) is not animated. A missing file is the
 * link and bundle gates' business, which both fail on it; this answers `false` rather than
 * throwing so a render of a fixture with a made-up image path still works.
 *
 * Build-time only (`node:fs`).
 */

const ascii = (bytes: Uint8Array, at: number, text: string): boolean =>
  text.length + at <= bytes.length && [...text].every((ch, i) => bytes[at + i] === ch.charCodeAt(0))

/** The frames of a GIF, or 1 for a file that is cut off before its first. */
function gifFrames(bytes: Uint8Array): number {
  if (bytes.length < 13) return 0
  let at = 13
  if (bytes[10] & 0x80) at += 3 * 2 ** ((bytes[10] & 7) + 1)
  const skipBlocks = () => {
    while (at < bytes.length && bytes[at] !== 0) at += bytes[at] + 1
    at += 1
  }
  let frames = 0
  while (at < bytes.length) {
    const kind = bytes[at]
    if (kind === 0x3b) break
    if (kind === 0x21) {
      at += 2
      skipBlocks()
    } else if (kind === 0x2c) {
      frames += 1
      if (frames > 1) return frames
      const flags = bytes[at + 9]
      at += 10
      if (flags & 0x80) at += 3 * 2 ** ((flags & 7) + 1)
      at += 1
      skipBlocks()
    } else {
      break
    }
  }
  return frames
}

/** Whether a whole file's bytes are an animated WebP or an animated GIF. */
export function isAnimatedImage(bytes: Uint8Array): boolean {
  if (ascii(bytes, 0, 'GIF8')) return gifFrames(bytes) > 1
  if (!ascii(bytes, 0, 'RIFF') || !ascii(bytes, 8, 'WEBP') || !ascii(bytes, 12, 'VP8X') || bytes.length < 21) return false
  if (bytes[20] & 0x02) return true
  // Chunks after VP8X: fourcc, 4-byte little-endian size, payload padded to even.
  let at = 12
  while (at + 8 <= bytes.length) {
    if (ascii(bytes, at, 'ANIM')) return true
    const size = bytes[at + 4] | (bytes[at + 5] << 8) | (bytes[at + 6] << 16) | (bytes[at + 7] * 2 ** 24)
    at += 8 + size + (size & 1)
  }
  return false
}

const COURSE_IMAGE = /^course-images\/([^/]+)\/([^/]+)$/
const memo = new Map<string, boolean>()

/** `isAnimatedImage` for a course image named by its site-relative path (`course-images/<level>/<file>`). */
export function isAnimatedCourseImage(imagePath: string): boolean {
  const known = memo.get(imagePath)
  if (known !== undefined) return known
  const parts = COURSE_IMAGE.exec(imagePath)
  const category = parts ? categoryBySlug(parts[1]) : undefined
  let animated = false
  if (parts && category) {
    try {
      animated = isAnimatedImage(fs.readFileSync(path.join(CONTENT_ROOT, category.dir, 'images', parts[2])))
    } catch {
      animated = false
    }
  }
  memo.set(imagePath, animated)
  return animated
}
