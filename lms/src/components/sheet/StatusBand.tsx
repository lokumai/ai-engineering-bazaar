/**
 * §4.5 item 1 — the band at the head of an A4 detail sheet.
 *
 * It says the two true things about the sheet: the geometry is not drawn, and
 * what follows is a schedule of parts rather than a lesson. Caution is the one
 * semantic colour permitted here (T6: diagrams, status ticks and the
 * draft/ready line), and the words carry the meaning on their own — the colour
 * is never the sole carrier (§10.4).
 */
export function StatusBand() {
  return (
    <p className="hl-status-band hl-mark">
      <span>Not yet drawn</span>
      <span>Schedule of parts only</span>
    </p>
  )
}
