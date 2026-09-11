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
 * §4.8's ninth column, `SIGN-OFF`, is here now that there is a record for it to
 * read: `ModuleRow` draws the squares in the unsigned state and one island fills
 * them after mount (§12.2, §12.18). It carries no interactive control, which is
 * a consequence of the stretched row link rather than a shortcut — see
 * `SignOffSquares`.
 *
 * It sits where §4.8 puts it, after `STATUS`. `REQUIRES` is the column this
 * implementation added to §4.8's eight, so it is the one that stays at the end.
 *
 * §13.5 adds one thing to the table and it costs this component nothing: a
 * drawn row's leading rule takes its subsystem's flavour, painted into the
 * transparent border `.bz-row > :first-child` has always reserved. So no column
 * changes width, and the table still scrolls inside its own container rather
 * than crushing the flexible column (§6.5, §11.10). `ModuleRow` carries the
 * whole change, including why a draft row is left alone (§13.14's amended T6).
 *
 * ## M17: one table, two shapes, and the `STATUS` column gone
 *
 * `/courses/` and `/courses/[category]/` were retired into the catalog, so this
 * component has two call sites rather than three and they differ by one column.
 * The whole catalog passes `both`, because its rows come from every level and a
 * row's level may not be carried by its hue alone; a level page passes `topics`,
 * because its own heading says the level once instead of eight times.
 *
 * ## M16 stage 4: the min-width is COMPUTED now, and that is the point of it
 *
 * There used to be a hand-computed `min-width: 1060px` in a stylesheet with the
 * arithmetic written out in a comment here — nine widths summed by a person,
 * in two files, with the ninth column's width justified by subtracting the
 * other eight from the total. Every one of those is a way for the two numbers
 * to stop agreeing, and the stylesheet holding one half of it was deleted in
 * stage 0, which left the constant alive only in prose.
 *
 * So the columns declare their own widths and the sum is taken from them, once,
 * and handed to the stylesheet as `--bz-table-min`. The flexible column
 * declares a `floor` instead of a width, which is the number it may not shrink
 * below; that is the term the old arithmetic supplied by hand. **MEASURED: both
 * layouts still come to 1060px** — 820 fixed plus a 240 floor on the index, 892
 * fixed plus a 168 floor on a category page — so nothing about the table moved,
 * and now nobody has to check that again.
 */

interface Column {
  key: string
  label: string
  /** §4.8's width, in px. `null` is the one column that takes what is left. */
  width: number | null
  /**
   * What the flexible column may not shrink below, set only on it. It is the
   * term the table's `min-width` needs and its `<col>` deliberately does not
   * have: a floor on the `<col>` would make the column fixed.
   */
  floor?: number
  /** Set only where a column needs a cell rule of its own (see `signoff`). */
  className?: string
}

/**
 * §4.8's widths, with one column flexible and three measured rather than
 * copied.
 *
 * **`TOPICS` is the flexible one on every page now** (M17). It used to swap
 * with `SHEET` depending on the route, because the flat manifest printed the
 * level where a category page printed the topics and only one of the two could
 * flex. There is one listing left and it prints both, so the choice is settled
 * rather than made per call: three section titles cannot say anything in 168px,
 * and §4.9's own arithmetic — 9 × 52 + 52 = 520px — pins the row at 52px, so
 * the column cannot buy the room back in height either. Sheet titles run to 29
 * characters and sit comfortably in a fixed 240px.
 *
 * Three of §4.8's widths do not hold §4.8's own values, measured in the
 * browser at the type §3.2 and §5.3 specify — `text-mark`, 11px IBM Plex Mono
 * at `+0.06em`, in a cell padded `10px 14px`:
 *
 *   EXTENT   `5,008 W · 30 MIN` is 116px of text; 104 − 28 leaves 76.
 *   LANG     `EN · TR` is 51px; 72 − 28 leaves 44.
 *
 * Both wrapped onto a second line inside the 52px row. Nothing about the type
 * is negotiable — the tracking is §3.4's rule for machine values and the
 * padding is §5.3's — so the columns take the room they need (152, 80) out of
 * the flexible one. §4.8's `STATUS`, which was the third of these and measured
 * 116, is gone: M17 took the column off the table and left the state to the
 * cells that were already carrying it (`ModuleRow`'s `RowState`).
 *
 * **MEASURED after that change:** `topics` sums to 944 and `both` to 1112. Both
 * are still wider than a phone and still scroll inside their own container,
 * which is what §6.5 and §11.10 ask. Nobody re-derives either number — the sum
 * is taken from this array, once, below.
 *
 * `SIGN-OFF` is 72px, not §4.8's 96, and **the reasoning that used to be here
 * is gone rather than corrected.** It read: the table's `min-width` is 1060px,
 * that constant is the hand-computed sum of these widths, and 1060 − 988 is
 * therefore what the ninth column may cost. That is a width derived from a
 * total which was itself derived from the widths — so the two had to be kept in
 * step by hand, in two files, and one of those files no longer exists.
 *
 * 72px stands on its own: four 14px squares with 4px gaps are 68px wide, and
 * the cells give up §5.3's inline padding to hold them (`.bz-table-signoff`).
 * The total is now taken from whatever these columns say (see `SheetIndex`), so
 * a column that changes width moves the total with it and no comment goes
 * stale.
 */
function columnsFor(column: RowColumn): Column[] {
  const level = column === 'both'

  return [
    { key: 'number', label: '#', width: 48 },
    {
      key: 'sheet',
      label: 'Module',
      width: 240,
    },
    ...(level ? [{ key: 'level', label: 'Level', width: 168 } as Column] : []),
    { key: 'topics', label: 'Topics', width: null, floor: 168 },
    { key: 'extent', label: 'Length', width: 152 },
    { key: 'sources', label: 'Sources', width: 88 },
    { key: 'lang', label: 'Lang', width: 80 },
    {
      key: 'signoff',
      label: 'Completion',
      width: 72,
      className: 'bz-table-signoff',
    },
    { key: 'requires', label: 'Requirements', width: 96 },
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

  /* One column is flexible and declares a floor; every other declares a width.
     The table may not be narrower than those added up, or `table-layout: fixed`
     crushes the flexible one instead of scrolling the table — which is §6.5's
     contract and §11.10's promise that the page body never scrolls sideways. */
  const minWidth = columns.reduce((total, col) => total + (col.width ?? col.floor ?? 0), 0)

  return (
    <div
      className="bz-table-scroll"
      role="region"
      tabIndex={0}
      aria-label={label}
      // §6.5's overflow fade, measured by `Affordances` in the shell. At 390px
      // this table is 1060px wide in a 350px box and five of its columns are
      // off-screen; without the cue nothing says so.
      data-hl-scroller=""
    >
      <table
        className="bz-table"
        style={{ '--bz-table-min': `${minWidth}px` } as React.CSSProperties}
      >
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
              <th key={col.key} scope="col" className={col.className}>
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
