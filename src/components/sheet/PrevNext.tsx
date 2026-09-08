import Link from 'next/link'

/**
 * §5.7 — the module either side of this one, kept as M11 found it and in the
 * vocabulary of set C.
 *
 * The build **deletes** the `**Previous Module:** …` / `**Next Module:** …`
 * lines from every source file (B1) and this component replaces them, so the
 * chain is read from the curriculum rather than from thirty-three hand-typed
 * pairs of links that were wrong the last time the modules were renumbered.
 *
 * The first module has no previous and the last has no next. Those cells still
 * render, reading `End of the course`: the symmetry is information, and a set
 * that quietly omits one half of its navigation looks broken rather than
 * finished. It used to read `— END OF SET`, which was the drawing-set
 * vocabulary M9 retired everywhere a reader can see it
 * (`kia-context/specs/ARCHITECTURE.md` §9) and which survived here because the
 * word "set" carries no `-`, so the copy register's word boundaries could not
 * see it inside a phrase.
 *
 * **No arrow glued to the link text.** `Next module →` is one of the tells
 * `kia-context/specs/DESIGN.md` names outright. The direction is already in
 * the words and in the two cells' positions; the glyph was a third statement
 * of it.
 *
 * Not a `<nav>` landmark on purpose — §10.2 allows exactly two, the trail in
 * the header and the sections in the rail, and a third would dilute both for
 * anyone navigating by landmark.
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
  label: string
  rel: 'prev' | 'next'
}) {
  if (target === null) {
    return (
      <div className="hl-prevnext-cell hl-prevnext-end hl-mark">
        <span>End of the course</span>
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
        <span className="hl-prevnext-tag hl-mark">Planned</span>
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
        label="Previous module"
      />
      <Cell
        target={next}
        rel="next"
        label="Next module"
      />
    </div>
  )
}
