import type { TocEntry } from '@/lib/content/render'

/**
 * §5.6 — the table of contents, which **is** the section spine of §4.6. There
 * is no second TOC on this site and there is no top progress bar; a bar across
 * the viewport is the template tell this replaces.
 *
 * What it tracks is scroll position, not completion (§5.8). Nothing in here
 * ever takes `--color-primary`: the current row moves to `--color-on-surface`, its
 * spine segment to the cut-plane weight, and its tick 6px into the gutter.
 * There is no visited state either — a TOC is not a progress meter.
 *
 * This half is pure: it is handed the entries and the id in view and draws
 * them. `SectionSpine` owns the observer that decides which id that is.
 */
export function TableOfContents({
  entries,
  activeId,
}: {
  entries: readonly TocEntry[]
  activeId: string | null
}) {
  if (entries.length === 0) return null

  // MEASURED: 96 of the corpus's h2s carry a Roman numeral and the rest carry
  // none, so the 24px gutter the numeral hangs in is dead space on the modules
  // that have no numerals — 30px of a 204px rail, which is where the contents
  // moved in M11. The gutter is reserved per LIST rather than per row, because
  // sizing it per row would let two entries of one module disagree about where
  // their titles start.
  const marks = entries.some((entry) => entry.mark)

  return (
    <nav aria-label="Sections">
      <ol role="list" className="hl-toc" data-hl-marks={marks ? '' : undefined}>
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              className="hl-toc-entry"
              // `aria-current` is on the row in view, which is a statement
              // about where the reader is, not about what they have read.
              aria-current={entry.id === activeId ? 'true' : undefined}
            >
              {/* MEASURED: 96 of the corpus's h2s carry a Roman numeral, split
                  off at build time (B6.3). The rest get no numeral and no
                  gutter mark rather than an invented one. */}
              {marks && (
                <span className="hl-toc-mark" aria-hidden="true">
                  {entry.mark ?? ''}
                </span>
              )}
              <span className="hl-toc-text">{entry.text}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
