import { LICENCE_LABEL, LICENCE_URL, REPO_URL } from '@/lib/site'
import { SheetLabel } from './SheetLabel'

/** The file's last-touching commit — never repo HEAD (spec §5.2, §11.26). */
export interface Revision {
  hash: string
  date: string
}

/** One `LABEL value` pair of the compact readout (§7.1). */
export interface ReadoutValue {
  label: string
  value: string
}

export interface SiteFooterProps {
  /** Overrides the route-derived sheet label, e.g. `SHEET 13 OF 32`. */
  sheet?: string | null
  revision?: Revision | null
  readout?: readonly ReadoutValue[] | null
}

/**
 * Site footer (spec §5.2). Two rows, 72px total, one hairline top rule.
 *
 * Costume budget (§4.3): the sheet / revision / readout line and nothing else.
 * No stamps, no registration marks, no gauges.
 *
 * Every cell is omitted when its value is unknown. A revision hash and a
 * reader's XP are both facts about something; printing a placeholder for
 * either would be the design telling its first lie (§1, §11.25).
 */
export function SiteFooter({ sheet, revision, readout }: SiteFooterProps) {
  return (
    <footer role="contentinfo" className="border-t border-line-strong bg-paper">
      <div className="mx-auto w-full max-w-[var(--width-shell)] px-6">
        <div className="flex h-10 items-center justify-between gap-4">
          <SheetLabel sheet={sheet} />

          {revision && (
            <span className="hl-mark text-ink-muted">
              Rev <span className="normal-case">{revision.hash}</span>
              <span aria-hidden="true"> · </span>
              {revision.date}
            </span>
          )}

          {readout && (
            <span className="hl-mark text-ink-muted">
              {readout.map((entry, i) => (
                <span key={entry.label}>
                  {i > 0 && (
                    <span aria-hidden="true" className="text-ink-faint">
                      {' · '}
                    </span>
                  )}
                  {entry.label} <span className="text-ink">{entry.value}</span>
                </span>
              ))}
            </span>
          )}
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
