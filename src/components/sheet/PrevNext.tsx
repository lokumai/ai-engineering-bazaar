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
 * render: the symmetry is information, and a set that quietly omits one half of
 * its navigation looks broken rather than finished.
 *
 * **Both said `End of the course`, and on module 01 that is the wrong end.** It
 * read as `End of the course` where the PREVIOUS module would be, on the first
 * page of the course — found by screenshotting the pager in M18 rather than by
 * any test, because both cells rendering the same string is exactly what a
 * symmetry check would have wanted. It used to read `— END OF SET`, which was the drawing-set
 * vocabulary M9 retired everywhere a reader can see it
 * (`kia-context/specs/ARCHITECTURE.md` §9) and which survived here because the
 * word "set" carries no `-`, so the copy register's word boundaries could not
 * see it inside a phrase.
 *
 * ## M18 — one line, and a direction glyph
 *
 * The author: *"the previous / next boxes should be shorter and have a
 * previous / next icon in each."* Both halves, and both cost something worth
 * writing down.
 *
 * **Shorter is the LINE COUNT and not the padding.** The tile stacked a faint
 * label over a titled destination, so it was two lines tall whatever the
 * padding did. It is one line now — glyph, label, title — which halves it
 * without touching a single length in the language.
 *
 * **The glyph reverses a stated rule.** `DESIGN.md` names `Next module →` as a
 * tell outright, on the argument that the direction is already in the words and
 * in the two cells' positions. The author outranks the design document
 * (`DESIGN.md`'s own order of authority), so the glyph is in — but **the words
 * stayed**, and that part is not negotiable by anybody: §10.4 is that colour
 * and shape are never the only carrier, and an icon is a shape. A tile reading
 * only `◀ Advanced Architectures` would be a direction nobody could read.
 *
 * The glyph is an inline SVG on a 16-unit viewBox with `fill="none"
 * stroke="currentColor"` (**D53**) — the same chevron the bar's dropdown uses,
 * turned. No emoji, and nothing imported.
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

/**
 * The direction, as a shape beside the word rather than instead of it.
 *
 * `aria-hidden`, because the link already says `Previous module` and a glyph
 * repeating that to a screen reader is the same sentence twice.
 */
function Chevron({ back = false }: { back?: boolean }) {
  return (
    <svg
      className="bz-pager-arrow"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d={back ? 'M9.5 3.5L5 8l4.5 4.5' : 'M6.5 3.5L11 8l-4.5 4.5'} />
    </svg>
  )
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
      <div className="bz-pager-item" data-end={rel === 'next' ? '' : undefined}>
        {/* The TILE'S OWN TEXT, in the destination slot rather than the label
            slot. `01`'s tile is a faint `small` over a titled `b`, and faint is
            for something a reader may ignore — which the label is, since the
            title beside it says where you are going. Here there is no title:
            this sentence is the whole tile, and MEASURED at 3.30:1 in the
            faint ink it did not clear the floor a sentence takes. */}
        <b>{rel === 'prev' ? 'Start of the course' : 'End of the course'}</b>
      </div>
    )
  }

  const back = rel === 'prev'

  return (
    <Link
      href={target.path}
      rel={rel}
      className="bz-pager-item"
      data-end={back ? undefined : ''}
      data-draft={target.draft ? '' : undefined}
    >
      {back && <Chevron back />}
      {/* The label and the destination on ONE line. The module NUMBER the
          retired cell printed beside the label is in the trail, the footer and
          the rail, and a fourth copy of it in a two-tile pager is noise. */}
      <small>
        {label}
        {target.draft && ' · Planned'}
      </small>
      <b>{target.title}</b>
      {!back && <Chevron />}
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
    <div className="bz-pager">
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
