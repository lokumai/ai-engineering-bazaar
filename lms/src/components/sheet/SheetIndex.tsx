import type { SheetRow } from '@/lib/content/rows'
import { ModuleRow, type RowColumn } from './ModuleRow'

/**
 * §4.8 item 4 — the index table, and §4.9 item 5, which is the same table with
 * `TOPICS` in place of `SUBSYSTEM`. One component, because a category page
 * listing its sheets differently from the index would be two manifests of one
 * set.
 *
 * Column widths are held by a `<colgroup>` against a fixed layout so the mono
 * columns line up down the page; see `columnsFor` for where they come from and
 * for the three §4.8 could not hold. The table is never narrower than the sum
 * of them: below that it scrolls inside its own container, which is what §6.5
 * already does with every wide table on the site and what §10.3 asks for — the
 * page body never scrolls horizontally (§11.10).
 *
 * §4.8's ninth column, `SIGN-OFF`, is absent rather than empty. Its four
 * stamp squares are sign-off state, a stamp states a live count (§5.9), and
 * there is no reader state in this slice to count: thirty-two rows of four
 * squares that can never fill would be exactly the claim §1's second question
 * forbids. The title block makes the same refusal for the same reason (§5.5).
 */

interface Column {
  key: string
  label: string
  /** §4.8's width, in px. `null` is the one column that takes what is left. */
  width: number | null
}

/**
 * §4.8's widths, with one column flexible and three measured rather than
 * copied.
 *
 * Which column flexes depends on the page. On the index it is `SHEET`, exactly
 * as §4.8 has it. On a category page it is `TOPICS`: three section titles
 * cannot say anything in 168px, and §4.9's own arithmetic — 9 × 52 + 52 =
 * 520px — pins the row at 52px, so the column cannot buy the room back in
 * height either. Sheet titles run to 29 characters and sit comfortably in
 * 240px, so the two swap.
 *
 * Three of §4.8's widths do not hold §4.8's own values, measured in the
 * browser at the type §3.2 and §5.3 specify — `text-mark`, 11px IBM Plex Mono
 * at `+0.06em`, in a cell padded `10px 14px`:
 *
 *   EXTENT   `5,008 W · 30 MIN` is 116px of text; 104 − 28 leaves 76.
 *   STATUS   the tick, an 8px gap and `NOT DRAWN` are 85px; 104 − 28 leaves 76.
 *   LANG     `EN · TR` is 51px; 72 − 28 leaves 44.
 *
 * Every one of them wrapped onto a second line inside the 52px row. Nothing
 * about the type is negotiable — the tracking is §3.4's rule for machine
 * values and the padding is §5.3's — so the columns take the room they need
 * (152, 116, 80) out of the flexible one, which still has 404px for a 29
 * character title. Every other width here is §4.8's, unchanged.
 */
function columnsFor(column: RowColumn): Column[] {
  const topics = column === 'topics'

  return [
    { key: 'number', label: '#', width: 48 },
    { key: 'sheet', label: 'Sheet', width: topics ? 240 : null },
    {
      key: 'context',
      label: topics ? 'Topics' : 'Subsystem',
      width: topics ? null : 168,
    },
    { key: 'extent', label: 'Extent', width: 152 },
    { key: 'sources', label: 'Sources', width: 88 },
    { key: 'lang', label: 'Lang', width: 80 },
    { key: 'status', label: 'Status', width: 116 },
    { key: 'requires', label: 'Requires', width: 96 },
  ]
}

export function SheetIndex({
  rows,
  column,
  label,
}: {
  rows: readonly SheetRow[]
  column: RowColumn
  /** Names the scroll region and the table, for anyone navigating by either. */
  label: string
}) {
  if (rows.length === 0) return null

  const columns = columnsFor(column)

  return (
    <div
      className="hl-index-scroll"
      role="region"
      tabIndex={0}
      aria-label={label}
      // §6.5's overflow fade, measured by `Affordances` in the shell. At 390px
      // this table is 988px wide in a 350px box and four of its columns are
      // off-screen; without the cue nothing says so.
      data-hl-scroller=""
    >
      <table className="hl-index">
        <caption className="sr-only">{label}</caption>
        <colgroup>
          {columns.map((col) => (
            <col
              key={col.key}
              style={col.width === null ? undefined : { width: `${col.width}px` }}
            />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <ModuleRow key={row.module} row={row} column={column} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
