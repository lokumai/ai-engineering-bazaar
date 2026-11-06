/**
 * §4.5 item 1 — the band at the head of an A4 detail sheet.
 *
 * It says the two true things about the sheet: the geometry is not drawn, and
 * what follows is a schedule of parts rather than a lesson. Caution is the one
 * semantic colour permitted here (T6: diagrams, status ticks and the
 * draft/ready line), and the words carry the meaning on their own — the colour
 * is never the sole carrier (§10.4).
 */
export function StatusBand({ written = false }: { written?: boolean }) {
  // D102 — a planned module may already hold sections a written one gave it,
  // and then "schedule of parts only" is no longer true.
  return (
    <p className="bz-status-band text-mark">
      <span>Planned</span>
      <span aria-hidden="true"> · </span>
      <span>{written ? 'Partly written' : 'Schedule of parts only'}</span>
    </p>
  )
}
