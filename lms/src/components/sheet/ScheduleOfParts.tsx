/**
 * §4.5 item 6 — the schedule of parts.
 *
 * The `**Topics this module will cover**` list is the bill of materials for
 * geometry that is not yet drawn, and on seventeen of the thirty-two sheets it
 * is the real content. So it is set as a hairline table, not as bullets: a
 * schedule is a document a reader scans, and a bulleted list of eight product
 * names dressed as prose would be pretending to be a lesson.
 *
 * Each row's left edge carries an ISO 128 hidden line — 1px, dashed `3 2`,
 * 20px tall — because that item exists in the model and is not yet drawn.
 */
export function ScheduleOfParts({ parts }: { parts: readonly string[] }) {
  if (parts.length === 0) return null

  return (
    <table className="hl-schedule">
      <caption className="hl-mark">Schedule of parts</caption>
      <thead>
        <tr>
          <th scope="col">Item</th>
          <th scope="col">Description</th>
        </tr>
      </thead>
      <tbody>
        {parts.map((part, i) => (
          <tr key={part}>
            <td className="hl-schedule-item">{String(i + 1).padStart(2, '0')}</td>
            <td className="hl-schedule-description">{part}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
