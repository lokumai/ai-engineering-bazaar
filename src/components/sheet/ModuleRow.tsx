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
 *
 * The ninth column (§4.8, §12.18) is the one cell that is about the reader, and
 * it is drawn in the unsigned state on every prerender, because that is the
 * only thing build-time HTML can truthfully claim about a reader it has never
 * met (§12.2). One document-level island fills it after mount; this component
 * stays hook-free, because `SheetFilters` imports it and `/courses/` and
 * `/courses/[category]/` do not — a hook here works on `/` and fails the
 * static export of the other two (§12.2, "where hooks may not go").
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

/**
 * §4.8 column 9 / §5.9 — the sign-off squares: `14 × 14`, no text, the slot
 * name on `title`, and **no interactive control of any kind**. `.hl-row-link`'s
 * stretched pseudo-element covers the row with `inset: 0` so that a pointer can
 * hit any cell and `Tab` reaches the row exactly once (§10.3); a control here
 * would sit under it, unclickable, and lifting it out would give the row a
 * second tab stop. Signing off happens on the sheet, which is the only place
 * the criteria are stated (§12.4.1).
 *
 * Which squares a sheet draws is `row.slots` — absent, not empty (§5.9, §12.7):
 * a sheet with no self-check draws no `QUIZ` square rather than one that can
 * never fill. A sheet nobody has drawn awards nothing (§11.28), so it draws one
 * square as a hidden line and carries no slug for the island to look up: there
 * is nothing about it that could ever be filled.
 *
 * The slug goes on `data-hl-signoff-cell`, not on `data-hl-signoff`, which
 * `lib/record/keys.ts` owns for the sheet's sign-off control (§12.16's `s`).
 * There is no control in this cell and the two must not answer one selector.
 *
 * The squares are `aria-hidden`. They carry no text by specification, a
 * `title` on a non-interactive span is a pointer affordance and nothing more,
 * and the same state is available as text twice over — on the sheet itself, and
 * on this page through the `SIGNED OFF` / `UNSIGNED` chips and their announced
 * count. §10.4's floor is that colour is never the sole carrier, and here the
 * carrier is stroke weight and fill before it is colour at all.
 */
function SignOffSquares({ row }: { row: SheetRow }) {
  if (!row.drawn) {
    return (
      <span className="hl-signoff-cell">
        <span
          className="hl-signoff-square"
          data-drawn="false"
          title="NOT DRAWN"
          aria-hidden="true"
        />
      </span>
    )
  }

  return (
    <span className="hl-signoff-cell" data-hl-signoff-cell={row.slug}>
      {row.slots.map((slot) => (
        <span
          key={slot}
          className="hl-signoff-square"
          data-hl-slot={slot}
          data-signed="false"
          title={slot}
          aria-hidden="true"
        />
      ))}
    </span>
  )
}

/**
 * §13.5 surface 2 — which subsystem's flavour this row's leading rule takes.
 *
 * Read off the slug's own first segment, exactly as `lib/record/boot.ts` reads
 * it: the slug IS the identity (§12.1.3), the set has been renumbered before,
 * and a second map from row to category is a second thing that can drift. No
 * import is added for it, which matters here — `SheetFilters` is `'use client'`
 * and pulls this component into the browser bundle (§12.2).
 */
function categoryOf(slug: string): string {
  return slug.split('/')[0] ?? ''
}

export function ModuleRow({ row, column }: { row: SheetRow; column: RowColumn }) {
  const draft = !row.drawn

  /**
   * §13.5 surface 2 — the leading rule takes the subsystem's hue, resolved
   * on channel A from `hl-cat-<slug>-started` / `-complete` (§12.2). The row
   * already prints its own status in words in the `STATUS` cell and its
   * number in the `#` cell, so the hue reports what the page's eyebrow count
   * reports and carries nothing alone (SC 1.4.1, §13.1.4).
   *
   * **Drawn rows only, and that is T6 rather than taste.** A draft row's `#`
   * cell already carries `--color-caution` as its hidden-line ink, and
   * §13.14's amended T6 is that a category hue and a semantic token never
   * appear on the same element — `.hl-row.hl-cat-tint > :first-child` would
   * put both on that one cell. A sheet nobody has drawn can never be signed
   * off either (§12.4.1), so it has nothing of its own to report here.
   */
  return (
    <tr
      className={draft ? 'hl-row' : 'hl-row hl-cat-tint'}
      data-cat={draft ? undefined : categoryOf(row.slug)}
      data-draft={draft ? '' : undefined}
    >
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

      <td className="hl-row-signoff">
        <SignOffSquares row={row} />
      </td>

      {/* §4.6's first relation, from the `prerequisites` frontmatter (B7). The
          index's own statement tells the reader to read in any order the
          dependency graph allows; this is that graph, one row at a time. */}
      <td className="hl-mark hl-row-value">{row.requires}</td>
    </tr>
  )
}
