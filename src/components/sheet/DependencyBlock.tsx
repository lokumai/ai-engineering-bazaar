import Link from 'next/link'

/**
 * §4.6 part 3 — the left rail's dependency block. Three relations, all
 * derived (B7): `REQUIRES` from the `prerequisites` frontmatter, `FEEDS` from
 * its reverse index, `SEE ALSO` from non-adjacent in-prose cross-references.
 * Each prints an em dash when it is empty, because "no prerequisites" is a
 * fact about the sheet and hiding the row would hide it.
 *
 * The rail is deliberately **not** a mini node-graph: that was cut for
 * duplicating the dashboard in 208px and giving the site a fourth progress
 * surface (§5.8).
 */

export interface SheetLink {
  module: number
  title: string
  path: string
  /** A target that is not yet drawn, rendered as a hidden line (§4.6). */
  draft: boolean
}

export interface DependencyRelation {
  label: string
  targets: readonly SheetLink[]
}

function Relation({ label, targets }: DependencyRelation) {
  return (
    <div className="hl-dep-row">
      <span className="hl-mark hl-dep-label">{label}</span>
      <span className="hl-dep-values">
        {targets.length === 0 ? (
          <>
            {/* An em dash reads as punctuation, so the fact is spelled out
                once for anyone who cannot see it (§10.4). */}
            <span aria-hidden="true">—</span>
            <span className="sr-only">None</span>
          </>
        ) : (
          targets.map((target, i) => (
            <span key={target.module}>
              {i > 0 && <span aria-hidden="true">, </span>}
              <Link
                href={target.path}
                className={target.draft ? 'hl-hidden-x' : 'hl-link'}
                data-draft={target.draft ? '' : undefined}
                title={
                  target.draft
                    ? `${target.title} — not yet drawn`
                    : target.title
                }
              >
                {target.module}
              </Link>
            </span>
          ))
        )}
      </span>
    </div>
  )
}

export function DependencyBlock({
  relations,
}: {
  relations: readonly DependencyRelation[]
}) {
  return (
    <div>
      {relations.map((relation) => (
        <Relation key={relation.label} {...relation} />
      ))}
    </div>
  )
}
