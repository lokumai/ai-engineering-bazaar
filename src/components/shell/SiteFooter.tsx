import { categoryLabels } from '@/lib/content/chrome'
import { LICENCE_LABEL, LICENCE_URL, REPO_URL } from '@/lib/site'
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
    <footer role="contentinfo" className="border-t border-line-strong bg-paper">
      <div className="mx-auto w-full max-w-[var(--width-shell)] px-6">
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
              342px wide and `SHEET 13 OF 32` broken after the number reads as
              two facts instead of one. */}
          {revision && (
            <span className="hl-mark whitespace-nowrap text-ink-muted">
              Rev <span className="normal-case">{revision.hash}</span>
              <span aria-hidden="true"> · </span>
              {revision.date}
            </span>
          )}

          {readout}
        </div>

        <div className="flex h-8 items-center gap-3 font-display text-meta text-ink-muted">
          <a className="hl-link" href={REPO_URL}>
            Repository
          </a>
          <span aria-hidden="true" className="text-ink-faint">
            ·
          </span>
          <a className="hl-link" href={LICENCE_URL}>
            {LICENCE_LABEL}
          </a>
          <span aria-hidden="true" className="text-ink-faint">
            ·
          </span>
          <span className="font-mono uppercase tracking-[0.06em]">Drawn by LKM-01</span>
        </div>
      </div>
    </footer>
  )
}
