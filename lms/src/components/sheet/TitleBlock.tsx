import type { ReactNode } from 'react'
import {
  CHECKED_BY_LABEL,
  REPOSITORIES_LABEL,
  type TitleBlockRow,
} from '@/lib/content/title-block'

/**
 * §5.5 — the module header block, in its two variants.
 *
 * Both are generated from the markdown AST, the frontmatter and git, never
 * from hand-maintained metadata, which drifts within two commits and destroys
 * the one thing this design promises (§11.25). A row whose value could not be
 * derived prints `—`; none of them prints a plausible guess.
 *
 * Variant A is the 240px panel that sits in an A0 sheet's right rail at 1280
 * and up. Variant B is the horizontal strip every other sheet gets, and the
 * one an A0 sheet falls back to when the right rail collapses (§4.7).
 *
 * **Both stay SERVER components** (§12.2). The two things on the block that
 * belong to the reader — §12.3.1's `CHECKED BY` value and §7.4's stamp grid —
 * arrive as already-rendered children, so the twelve derived rows keep being
 * measured on the server and only the reader's own state is mounted as an
 * island. That is the same arrangement as `SiteFooter` → `SheetLabel` and
 * `SheetRail` → `SectionSpine`.
 *
 * Both slots are **absent when they are empty**, not rendered hollow (§11.25,
 * §5.9): a draft sheet has no `CHECKED BY` row at all, and a sheet with no
 * stamp slots has no grid. An empty box that says `READ` is a claim about a
 * reader nobody has met.
 */

function Value({ row }: { row: TitleBlockRow }) {
  // `.hl-mark` uppercases every chrome value (§3.4). A git short hash is not
  // ours to recase, so that one row opts out.
  return <>{row.preserveCase ? <span className="normal-case">{row.value}</span> : row.value}</>
}

/** Variant A — the title block, A0 right rail, 240px, sticky at `top: 80px`. */
export function TitleBlock({
  rows,
  checkedBy,
  repositories,
  stamps,
}: {
  rows: readonly TitleBlockRow[]
  /** §12.3.1 — the reader's own row. Omitted or null, the row is absent. */
  checkedBy?: ReactNode
  /** §12.9 — the register's count. Omitted or null, the row is absent. */
  repositories?: ReactNode
  /** §7.4 — the 2×2 approval stamp grid, which renders itself or nothing. */
  stamps?: ReactNode
}) {
  return (
    <aside aria-label="Title block" className="hl-title-block">
      <div className="hl-title-block-head hl-mark">Title block</div>
      <dl className="hl-title-block-rows">
        {rows.map((row) => (
          <div key={row.label} className="hl-title-block-row hl-mark">
            <dt>{row.label}</dt>
            <dd>
              <Value row={row} />
            </dd>
          </div>
        ))}
        {checkedBy !== undefined && checkedBy !== null && (
          <div className="hl-title-block-row hl-mark">
            <dt>{CHECKED_BY_LABEL}</dt>
            <dd>{checkedBy}</dd>
          </div>
        )}
        {repositories !== undefined && repositories !== null && (
          <div className="hl-title-block-row hl-mark">
            <dt>{REPOSITORIES_LABEL}</dt>
            <dd>{repositories}</dd>
          </div>
        )}
      </dl>
      {stamps}
    </aside>
  )
}

/** Variant B — the same rows as a strip beneath the h1 and its rule. */
export function TitleStrip({
  rows,
  checkedBy,
  repositories,
  className,
}: {
  rows: readonly TitleBlockRow[]
  /** §12.3.1 — the strip carries the row too. §5.5 gives it no stamp grid. */
  checkedBy?: ReactNode
  /** §12.9 — and this one, for the same reason: it is a row, not a stamp. */
  repositories?: ReactNode
  className?: string
}) {
  return (
    <aside aria-label="Title block" className={className}>
      <dl className="hl-title-strip">
        {rows.map((row) => (
          <div key={row.label} className="hl-title-strip-pair hl-mark">
            <dt>{row.label}</dt>
            <dd>
              <Value row={row} />
            </dd>
          </div>
        ))}
        {checkedBy !== undefined && checkedBy !== null && (
          <div className="hl-title-strip-pair hl-mark">
            <dt>{CHECKED_BY_LABEL}</dt>
            <dd>{checkedBy}</dd>
          </div>
        )}
        {repositories !== undefined && repositories !== null && (
          <div className="hl-title-strip-pair hl-mark">
            <dt>{REPOSITORIES_LABEL}</dt>
            <dd>{repositories}</dd>
          </div>
        )}
      </dl>
    </aside>
  )
}
