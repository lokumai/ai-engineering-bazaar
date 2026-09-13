import type { SheetRow } from '@/lib/content/rows'
import { ModuleRow, type RowColumn } from './ModuleRow'

/**
 * §4.8 item 4 — the index table, and §4.9 item 5, which is the same table with
 * the description in place of `SUBSYSTEM`. One component, because a category
 * page listing its sheets differently from the index would be two manifests of
 * one set.
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
 * them after mount (§12.2, §12.18). It carries no interactive control, and the
 * reason is §12.4.1 rather than the stretched row link this used to cite —
 * M20 measured for that element and it is not there. See `SignOffSquares`.
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
 * row's level may not be carried by its hue alone. The narrow shape is
 * `description`, and M17 left it with no production caller — a level page
 * renders the whole `Catalog`, filtered, and `Catalog` passes `both`. See
 * `RowColumn`.
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
 * below; that is the term the old arithmetic supplied by hand. **MEASURED after
 * M20 moved the flexible column:** `description` sums to 976 and `both` to
 * 1144 — 736 fixed plus a 240 floor, and 904 fixed plus the same floor. Both
 * are wider than a phone and both still scroll inside their own container,
 * which is what §6.5 and §11.10 ask.
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
 * **`SHEET` is the flexible one now** (M20), and which column flexes has moved
 * twice. §4.8 flexed `SHEET`; M17 gave it to `TOPICS`, because three section
 * titles cannot say anything in 168px and §4.9's own arithmetic — 9 × 52 + 52 =
 * 520px — pins the row at 52px, so that column could not buy the room back in
 * height either. M20 replaced `TOPICS` with a disclosure trigger, which needs
 * none of that room closed and a fixed measure open, so the slack goes back to
 * the module's title. `columnsFor` carries the reasoning per column.
 *
 * One of §4.8's widths does not hold §4.8's own value, measured in the browser
 * at the type §3.2 and §5.3 specify — `text-mark`, 11px IBM Plex Mono at
 * `+0.06em`, in a cell padded `10px 14px`:
 *
 *   EXTENT   `5,008 W · 30 MIN` is 116px of text; 104 − 28 leaves 76.
 *
 * It wrapped onto a second line inside the 52px row. Nothing about the type is
 * negotiable — the tracking is §3.4's rule for machine values and the padding
 * is §5.3's — so the column takes the room it needs (152) out of the flexible
 * one. §4.8's `STATUS` is gone (M17, see `ModuleRow`'s `RowState`), and `LANG`
 * — the second of these, measured at 80 — went with M20.
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
    /* M20 — THE MODULE IS THE FLEXIBLE COLUMN NOW, and that is forced rather
       than chosen. `Topics` was flexible with a 168px floor, and the floor was
       justified by the content: "three section titles cannot say anything in
       168px". `Description` is a trigger reading one word and a caret, which
       needs none of that — leave it flexible and the table becomes a short
       control beside a lake of empty space, which is what the M20 review
       caught before a line of this was built.

       So the slack moves to the thing that actually varies. Titles run to 29
       characters and sat in a fixed 240; that number is this column's floor
       now, so nothing gets narrower than it used to be and a long title has
       somewhere to go. */
    { key: 'sheet', label: 'Module', width: null, floor: 240 },
    ...(level ? [{ key: 'level', label: 'Level', width: 168 } as Column] : []),
    /* Wide enough for the open panel rather than for the closed trigger. The
       summaries run to about 120 characters and 280px − 28px of padding holds
       roughly 30 of them a line at `--text-meta`, so a sentence wraps to four
       lines inside the row instead of to eight. The trigger is the same width
       either way; it is the open state that has a measure to honour. */
    { key: 'description', label: 'Description', width: 280 },
    { key: 'extent', label: 'Length', width: 152 },
    { key: 'sources', label: 'Sources', width: 88 },
    /* `Lang` was 80px here and it is gone (M20). It printed `EN · TR`, which is
       a fact about the REPOSITORY — a `_tr.md` file exists — and the site
       renders none of those files. The listing stated a translation it cannot
       serve; M19 is what makes the claim true, and it is a URL when it does. */
    /* **MEASURED at 1440, by screenshotting the table and reading the header
       row: both of the last two columns were clipping their own headers**, and
       had been since before M20 — `Completion` wanted 80px of text in 72 and
       `Requirements` wanted 113 in 96. Neither is a word with a break
       opportunity in it, so `white-space: normal` could not save them and they
       were simply cut: `Completio`, `Requireme`.

       Nothing in the suite could see it. A clipped header still has the right
       `textContent`, so `record-index.spec.ts`'s "the ninth column is
       COMPLETION" passes on a column that is drawing two thirds of the word.

       So the columns take the width their headers need, plus a little. 72
       stood on the squares — four 14px squares with 4px gaps are 68px wide,
       and this cell gives up §5.3's inline padding to hold them — which is why
       it was the narrower of the two errors. */
    {
      key: 'signoff',
      label: 'Completion',
      width: 84,
      className: 'bz-table-signoff',
    },
    { key: 'requires', label: 'Requirements', width: 118 },
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
