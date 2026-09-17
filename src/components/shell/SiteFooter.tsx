import Link from 'next/link'
import { Fragment } from 'react'
import { categoryLabels } from '@/lib/content/chrome'
import { AFFILIATION, LICENCE_LABEL, LICENCE_URL, REPO_URL } from '@/lib/site'
import { SheetLabel } from './SheetLabel'

/** The file's last-touching commit — never repo HEAD (spec §5.2, §11.26). */
export interface Revision {
  hash: string
  date: string
}

export interface SiteFooterProps {
  /** Overrides the route-derived sheet label, e.g. `SHEET 13 OF 32`. */
  sheet?: string | null
  revision?: Revision | null
  /**
   * §5.2, §7.1 — the compact readout, rendered by whoever measured the corpus.
   *
   * It is a node rather than a list of label/value pairs, and that is §12.2's
   * doing: the values are reader state, so they arrive on channel B and the
   * element that prints them has to be a client island holding
   * `useSyncExternalStore`. A server-rendered array of strings could only ever
   * carry the build-time reading, which is to say a lie with a number in it.
   */
  readout?: React.ReactNode
}

/**
 * Site footer (spec §5.2). Two rows, 72px total, one hairline top rule.
 *
 * Costume budget (§4.3): the sheet / revision / readout line and nothing else.
 * No stamps, no registration marks, no gauges.
 *
 * Every cell is omitted when its value is unknown. A revision hash is a fact
 * about a file, and a page with no revision to print prints none of it rather
 * than a placeholder (§1, §11.25). The readout is the one cell that stays: its
 * denominators are build-time facts and its numerators dash to `--` until the
 * record has been read, which is a reading rather than an absence (§12.2).
 */
export function SiteFooter({ sheet, revision, readout }: SiteFooterProps) {
  return (
    <footer role="contentinfo" className="border-t border-line-strong bg-surface">
      <div className="w-full px-[22px]">
        {/* §5.2 row 1 — the three-part flex, which is what puts the sheet
            label left, the revision centre and the readout right. On a page
            with no revision the two survivors take the two ends, which is the
            same flex doing the same thing.

            §5.2 gives the row 40px and §4.7 gives the page one absolute rule:
            the body never scrolls horizontally at any width. Three cells whose
            own values must not wrap (§3.4) do not fit across 342px, so the ROW
            wraps instead — `min-h-10` holds it at exactly 40px wherever the
            three fit on one line, and below that the readout takes a second
            line rather than pushing the document sideways. `gap-x-4` and not
            `gap-4`, so a wrapped line costs its own height and nothing more. */}
        <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-4">
          <SheetLabel sheet={sheet} categories={categoryLabels()} />

          {/* §3.4 — a machine-derived value never wraps. At 390px the row is
              342px wide and `MODULE 13 OF 32` broken after the number reads as
              two facts instead of one. */}
          {revision && (
            <span className="text-mark whitespace-nowrap text-on-surface-muted">
              Rev <span className="normal-case">{revision.hash}</span>
              <span aria-hidden="true"> · </span>
              {revision.date}
            </span>
          )}

          {readout}
        </div>

        {/* §5.2 row 2 — provenance. The repository, the licence, the hand that
            drew it, and the organisations behind it: six cells that are all the
            same KIND of fact, which is why they share one rule rather than
            earning a third row.

            `min-h-8` and `flex-wrap`, where row 2 used to be a fixed `h-8`.
            Six cells do not fit across 342px, and §4.7 allows exactly one
            answer to that: the row takes a second line. A fixed height would
            have clipped the wrapped line instead, and a `nowrap` row would have
            pushed the document sideways — the one thing no page may do. On any
            width where the six fit, `min-h-8` is 32px and §5.2's 72px total is
            unchanged. */}
        <div className="flex min-h-8 flex-wrap items-center gap-x-3 text-meta text-on-surface-muted">
          <a className="bz-link" href={REPO_URL}>
            Repository
          </a>
          <Dot />
          <a className="bz-link" href={LICENCE_URL}>
            {LICENCE_LABEL}
          </a>
          <Dot />
          <span>Marked by LKM-01</span>
          <Dot />
          {/* M18 — `/legend/` was reachable from `/team/` and from nowhere else,
              and `/team/` is itself only reachable from `/team/assignments/`.
              That was survivable while the page only explained the marks; it
              stopped being survivable the moment M18 moved the KEYBOARD MAP
              there, because the bar's `?` button went in the same commit and
              the only discovery path left was pressing a key you would have to
              already know about.

              The page's own docblock calls itself *"the fixed help slot WCAG
              2.2 SC 3.2.6 asks for: the same page, reached the same way, from
              every route"* — which the footer is what makes true, since the
              footer is on every route. It was a claim about a link nobody had
              drawn. */}
          <Link className="bz-link" href="/legend/">
            Legend and keys
          </Link>
          {/* The chain, in `AFFILIATION` order. Names only: the relationship
              between them is stated once, with its labels, in `/legend/`'s
              colophon. A footer is the wrong place to explain a corporate
              structure and the right place to name one. */}
          {AFFILIATION.map((affiliate) => (
            <Fragment key={affiliate.name}>
              <Dot />
              <a className="bz-link" href={affiliate.url}>
                {affiliate.name}
              </a>
            </Fragment>
          ))}
        </div>
      </div>
    </footer>
  )
}

/**
 * The separator between two footer cells.
 *
 * `aria-hidden`, because a screen reader announcing "middle dot" between every
 * pair reads the punctuation of a layout as content. It was already written
 * three times in this row before the affiliation cells arrived and would have
 * been written six; one component is the same mark in every gap.
 */
function Dot() {
  return (
    <span aria-hidden="true" className="text-on-surface-faint">
      ·
    </span>
  )
}
