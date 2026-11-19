/**
 * D144 — a QR code as one SVG path, for the progress page's "Move to the app" dialog.
 *
 * The encoding is `uqr` (MIT, no dependencies, a port of Project Nayuki's encoder), pinned to an
 * exact version: writing a QR encoder here was rejected, because Reed-Solomon, masking and the
 * version tables are exactly the code a reader cannot check by eye. This file only draws its
 * matrix: error correction L (the most a code holds, 2953 bytes at version 40; a screen is not a
 * scratched label, so the higher levels buy nothing here), and a quiet zone of four modules,
 * which the standard asks for and a phone camera needs to find the code against a busy page.
 *
 * Each row's runs of dark modules become one `h` segment of a single path, so a version-40 code
 * is a few thousand path commands rather than thirty thousand `<rect>` elements.
 */

import { encode } from 'uqr'

export const QR_QUIET_ZONE = 4

export interface QrSquare {
  /** Modules on a side, the quiet zone included. */
  size: number
  /** The dark modules, in module units. */
  path: string
}

/** The code for `text`, or null when it does not fit one code at error correction L. */
export function qrSquare(text: string): QrSquare | null {
  let modules: boolean[][]
  let size: number
  try {
    const result = encode(text, { ecc: 'L', border: QR_QUIET_ZONE, boostEcc: false })
    modules = result.data
    size = result.size
  } catch {
    return null
  }
  const parts: string[] = []
  modules.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      if (!row[x]) {
        x += 1
        continue
      }
      const start = x
      while (x < row.length && row[x]) x += 1
      parts.push(`M${start} ${y}h${x - start}v1h-${x - start}z`)
    }
  })
  return { size, path: parts.join('') }
}
