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
 * Variant B, the horizontal strip, is what a module page renders — at every
 * width, since M11 cut the right rail back to the sections and the dependency
 * block and moved these rows into the column.
 *
 * **Variant A, the 240px panel, is rendered by no page.** M11 kept it against
 * M12 and M14 needing it and said to delete it there if they did not; neither
 * did, and **it is still kept, deliberately, for a reason M11 could not have
 * had.** `logs/BRAINSTORM.md` **O2**'s open half is a question about exactly
 * these rows — which of the twelve a module page should claim at all, and what
 * the survivors look like now that `.hl-panel-title` is no longer 11px
 * tracked-out mono and this block is the last surface on the site that is. A
 * panel is the shape that question may well answer to, and deleting the
 * component would cost five unit cases and a stylesheet block to remove the
 * thing the next decision might restore.
 *
 * `titleStripRows` and `titleBlockRows` return the identical set for a ready
 * module, which `title-block.test.ts` asserts, so the two variants cannot drift
 * apart while one of them is idle. **Whoever closes O2 decides this**: if the
 * answer is a strip, variant A goes with the same commit.
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
    <aside aria-label="Module info" className="hl-title-block">
      <div className="hl-title-block-head hl-mark">Module info</div>
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
  stamps,
  className,
}: {
  rows: readonly TitleBlockRow[]
  /** §12.3.1 — the strip carries the row too. */
  checkedBy?: ReactNode
  /** §12.9 — and this one, for the same reason: it is a row, not a stamp. */
  repositories?: ReactNode
  /**
   * §7.4 — the approval stamps. **§5.5 used to give the strip none, and that
   * left two holes.** The grid only ever rendered inside the A0 right rail, so
   * the seven A2 sheets — all of Fundamentals, the first seven anybody reads and
   * signs — showed no stamps at all, and an A0 sheet below 1280px lost them too
   * when the rail collapsed to this strip. Neither page lied: the SIGN-OFF
   * control states its own state in words. But the sheets a beginner spends
   * most time on summarised the least, and the fallback dropped a panel it was
   * supposed to be standing in for.
   */
  stamps?: ReactNode
  className?: string
}) {
  return (
    <aside aria-label="Module info" className={className}>
      {/* `data-stamps` moves the strip's own 32px bottom margin onto the stamp
          container below it, so the two sit together as one block instead of
          being pushed apart. Explicit, rather than a negative margin or a
          `:has()` selector. */}
      <dl className="hl-title-strip" data-stamps={stamps ? 'true' : undefined}>
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
      {stamps}
    </aside>
  )
}
