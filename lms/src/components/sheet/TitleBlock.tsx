import type { TitleBlockRow } from '@/lib/content/title-block'

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
 * The 2×2 approval-stamp grid §5.5 puts under Variant A is deliberately absent
 * rather than empty: a stamp slot states a live count (§5.9, §7.4) and there
 * is no reader state in this slice to count. An empty box that says `READ` is
 * a claim about a reader nobody has met.
 */

function Value({ row }: { row: TitleBlockRow }) {
  // `.hl-mark` uppercases every chrome value (§3.4). A git short hash is not
  // ours to recase, so that one row opts out.
  return <>{row.preserveCase ? <span className="normal-case">{row.value}</span> : row.value}</>
}

/** Variant A — the title block, A0 right rail, 240px, sticky at `top: 80px`. */
export function TitleBlock({ rows }: { rows: readonly TitleBlockRow[] }) {
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
      </dl>
    </aside>
  )
}

/** Variant B — the same rows as a strip beneath the h1 and its rule. */
export function TitleStrip({
  rows,
  className,
}: {
  rows: readonly TitleBlockRow[]
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
      </dl>
    </aside>
  )
}
