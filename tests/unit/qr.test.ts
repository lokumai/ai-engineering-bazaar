import { describe, expect, it } from 'vitest'
import { encode } from 'uqr'
import { QR_QUIET_ZONE, qrSquare } from '@/lib/qr'
import { QR_MAX_CHARS } from '@/lib/record/transfer'

/**
 * D144 — the drawing of a QR code, against the encoder's own matrix. The encoder is a pinned
 * dependency and is not re-tested here; what is checked is that the path draws exactly its dark
 * modules, keeps the quiet zone light, and that the capacity the page states is the encoder's.
 */

/** The cells a path of `M x y h n v1 h-n z` runs paints. */
function painted(path: string): Set<string> {
  const cells = new Set<string>()
  for (const [, x, y, n] of path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    for (let i = 0; i < Number(n); i += 1) cells.add(`${Number(x) + i},${y}`)
  }
  return cells
}

const LINK = 'https://example.org/transfer/#t='

describe('qrSquare', () => {
  it('paints exactly the dark modules of the encoder at error correction L', () => {
    const text = `${LINK}abc_DEF-123`
    const square = qrSquare(text)!
    const matrix = encode(text, { ecc: 'L', border: QR_QUIET_ZONE }).data
    const expected = new Set<string>()
    matrix.forEach((row, y) => row.forEach((dark, x) => dark && expected.add(`${x},${y}`)))
    expect(painted(square.path)).toEqual(expected)
    expect(square.size).toBe(matrix.length)
  })

  it('leaves a light quiet zone of four modules on every side', () => {
    const square = qrSquare(`${LINK}${'x'.repeat(400)}`)!
    for (const cell of painted(square.path)) {
      const [x, y] = cell.split(',').map(Number)
      expect(Math.min(x, y)).toBeGreaterThanOrEqual(QR_QUIET_ZONE)
      expect(Math.max(x, y)).toBeLessThan(square.size - QR_QUIET_ZONE)
    }
  })

  it('fits a link up to the stated capacity, and refuses one character more', () => {
    const at = (length: number) => LINK + 'A'.repeat(length - LINK.length)
    expect(qrSquare(at(QR_MAX_CHARS))).not.toBeNull()
    expect(qrSquare(at(QR_MAX_CHARS + 1))).toBeNull()
  })
})
