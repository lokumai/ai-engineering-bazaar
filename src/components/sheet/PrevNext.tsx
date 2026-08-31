import Link from 'next/link'

/**
 * §5.7 — the sheet either side of this one in the set.
 *
 * The build **deletes** the `**Previous Module:** …` / `**Next Module:** …`
 * lines from every source file (B1) and this component replaces them, so the
 * chain is read from the manifest rather than from thirty-two hand-typed pairs
 * of links that were wrong the last time the modules were renumbered.
 *
 * Sheet 1 has no previous and sheet 32 has no next. Those cells still render,
 * reading `— END OF SET`: the symmetry is information, and a set that quietly
 * omits one half of its navigation looks broken rather than finished.
 *
 * Not a `<nav>` landmark on purpose — §10.2 allows exactly two, the drawing
 * set in the header and the sections in the rail, and a third would dilute
 * both for anyone navigating by landmark.
 */

export interface PrevNextTarget {
  module: number
  title: string
  path: string
  draft: boolean
}

function Cell({
  target,
  label,
  rel,
}: {
  target: PrevNextTarget | null
  label: React.ReactNode
  rel: 'prev' | 'next'
}) {
  if (target === null) {
    return (
      <div className="hl-prevnext-cell hl-prevnext-end hl-mark">
        <span>— End of set</span>
      </div>
    )
  }

  return (
    <Link
      href={target.path}
      rel={rel}
      className="hl-prevnext-cell"
      data-draft={target.draft ? '' : undefined}
    >
      <span className="hl-prevnext-head hl-mark">
        <span>{label}</span>
        <span className="hl-prevnext-sheet">{target.module}</span>
      </span>
      <span className="hl-prevnext-title">{target.title}</span>
      {target.draft && (
        <span className="hl-prevnext-tag hl-mark">Not drawn</span>
      )}
    </Link>
  )
}

export function PrevNext({
  previous,
  next,
}: {
  previous: PrevNextTarget | null
  next: PrevNextTarget | null
}) {
  return (
    <div className="hl-prevnext">
      <Cell
        target={previous}
        rel="prev"
        label={
          <>
            <span aria-hidden="true">←</span> Previous sheet
          </>
        }
      />
      <Cell
        target={next}
        rel="next"
        label={
          <>
            Next sheet <span aria-hidden="true">→</span>
          </>
        }
      />
    </div>
  )
}
