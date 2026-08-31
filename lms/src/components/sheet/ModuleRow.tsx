import Link from 'next/link'
import type { SheetRow } from '@/lib/content/rows'

/**
 * §5.3 — the module row. **There is no module card.** A card grid is not used
 * anywhere on this site; if you find yourself building one, the answer is a
 * table row (§11.2).
 *
 * The whole row is one link target: the anchor lives in the title cell and a
 * stretched pseudo-element covers the row, so a pointer can hit any cell and
 * `Tab` reaches the row exactly once (§10.3). Its focus ring is drawn on that
 * pseudo-element rather than around the title text, which is the only way to
 * get §5.3's "offset -2px so it sits inside the row".
 *
 * A sheet that is not drawn is marked here and drawn as a hidden line in CSS:
 * an ISO 128 `3 2` dash down the `#` cell, the status tick dashed to match,
 * and the words `NOT DRAWN` beside it. Line type first, colour second, words
 * always (§10.4).
 */

/** Which column §4.8's `SUBSYSTEM` slot is carrying on this page (§4.9). */
export type RowColumn = 'subsystem' | 'topics'

/**
 * §4.8 `STATUS` — the word, and the tick beside it. The tick takes the node
 * vocabulary of §5.8: a hairline `--color-line-strong` rectangle, solid where
 * the geometry is drawn and dashed where it is not. It is the same mark the
 * dashboard will draw at 44 × 26, at the size a table row can carry.
 */
function StatusTick({ drawn }: { drawn: boolean }) {
  return (
    <svg
      className="hl-row-tick"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect
        x="0.5"
        y="0.5"
        width="11"
        height="11"
        fill="none"
        stroke="var(--color-line-strong)"
        strokeWidth="1"
        strokeDasharray={drawn ? undefined : '3 2'}
      />
    </svg>
  )
}

export function ModuleRow({ row, column }: { row: SheetRow; column: RowColumn }) {
  const draft = !row.drawn

  return (
    <tr className="hl-row" data-draft={draft ? '' : undefined}>
      <td
        className={`hl-mark hl-row-number${draft ? ' hl-hidden-y' : ''}`}
      >
        {row.number}
      </td>

      <th scope="row" className="hl-row-title">
        <Link href={row.path} className="hl-row-link">
          {row.title}
        </Link>
      </th>

      <td className="hl-row-context">
        {column === 'subsystem' ? (
          row.subsystem.title
        ) : (
          // §4.9 — at most three, joined on one line and truncated where the
          // column runs out. The sheet itself prints every section it has;
          // this is the column that says what it is about, not a summary.
          <span className="hl-row-topics" title={row.topics.join(' · ')}>
            {row.topics.join(' · ')}
          </span>
        )}
      </td>

      <td className="hl-mark hl-row-value">{row.extent}</td>
      <td className="hl-mark hl-row-value">{row.sources}</td>
      <td className="hl-mark hl-row-value">{row.lang}</td>

      <td className="hl-mark hl-row-status">
        <StatusTick drawn={row.drawn} />
        <span>{row.status}</span>
      </td>

      {/* §4.6's first relation, from the `prerequisites` frontmatter (B7). The
          index's own statement tells the reader to read in any order the
          dependency graph allows; this is that graph, one row at a time. */}
      <td className="hl-mark hl-row-value">{row.requires}</td>
    </tr>
  )
}
