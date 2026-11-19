import type { QrSquare } from '@/lib/qr'

/**
 * D144 — a QR code drawn inline. Dark modules on a light ground in both themes, because a camera
 * needs the contrast and an inverted code is one many scanners refuse: the two inks are the bar
 * chip's pair, the one light and dark pair the language keeps the same in both themes.
 */
export function QrCode({ square, label }: { square: QrSquare; label: string }) {
  return (
    <svg
      className="bz-transfer-qr"
      viewBox={`0 0 ${square.size} ${square.size}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect className="bz-transfer-qr-ground" width={square.size} height={square.size} />
      <path className="bz-transfer-qr-ink" d={square.path} />
    </svg>
  )
}
