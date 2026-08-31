import type { Metadata } from 'next'
import Link from 'next/link'
import { ReportPanel } from '@/components/record/ReportPanel'
import { PageShell } from '@/components/shell/PageShell'
import { curriculumFacts } from '@/lib/content/facts'
import { reportFacts } from '@/lib/content/report-facts'
import { SITE_ORIGIN } from '@/lib/site-origin'

export const metadata: Metadata = {
  title: 'Record of work',
  description:
    'Build one self-contained HTML file from what this browser has recorded: '
    + 'the sheet ledger, the repositories registered against it, and the limits '
    + 'of what it can claim.',
}

/**
 * §12.12 — the page that produces the `RECORD OF WORK`.
 *
 * **A server page, and the boundary is drawn here rather than lower.** It
 * measures the corpus twice, in two shapes, because two different consumers
 * need it: `reportFacts()` carries the text the document reprints — every
 * sheet's objectives, its Quick Check question, its checklist item text — and
 * `curriculumFacts()` carries the counts every selector in `lib/record/derive`
 * works over. Both reach `node:fs`, so both are computed up here and handed
 * down as plain data; §12.2's import rule is that a single value imported
 * across that line pulls `node:fs` into the browser bundle and the build stops.
 *
 * `reportFacts` needs an absolute origin because the criteria URL it builds is
 * printed inside a file that will be opened from `file://` on somebody else's
 * machine, where a site-relative path resolves against their filesystem. There
 * is no request-time server to ask, so the origin is derived from the
 * repository (`lib/site-origin.ts`) rather than read from `window.location`.
 *
 * Everything that depends on the reader is in `ReportPanel`, which is the one
 * client leaf on this route: the counts, the digest, the byte measurement and
 * the save path. The page itself is the same for every reader, which is the
 * only thing a prerender can honestly be.
 */
export default function ReportPage() {
  const facts = reportFacts(SITE_ORIGIN)
  const counts = curriculumFacts()

  return (
    <PageShell sheet="RECORD OF WORK">
      <p className="hl-eyebrow hl-mark">
        SELF-ATTESTED · NO ISSUING AUTHORITY
      </p>

      <h1 className="hl-listing-title">Record of work</h1>

      <p className="hl-lead">
        One self-contained HTML file, built in this browser out of what this
        browser has recorded, and saved to your own disk. It holds the ledger of
        all {counts.sheets.length} sheets, the repositories registered against
        them, the answers written into the Quick Checks, and the sources opened
        from each sheet. It is a record. Nobody assessed it and no authority
        issued it, and the file says so in its second block, above everything
        else it states.
      </p>

      <hr className="hl-rule-struct" aria-hidden="true" />

      <ReportPanel facts={facts} counts={counts} />

      {/* §12.12.4 — the document instructs its own reader how to distrust it,
          which is the most respectable answer available to a file that cannot
          be verified. Naming that here is what makes the control above worth
          pressing: a reviewer is being handed an audit path, not a trophy. */}
      <section className="hl-panel" aria-labelledby="hl-report-audit">
        <div className="hl-panel-head">
          <h2 id="hl-report-audit" className="hl-panel-title">
            What a reviewer is asked to do
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Last block of the file</p>
        </div>

        <p className="mt-0 mb-4 max-w-[var(--width-prose)] font-display text-meta leading-normal text-ink-muted">
          The file ends with five instructions addressed to whoever reads it:
          read the criteria for each sheet, open every registered repository,
          resolve each commit hash and compare its authored date with the date in
          the ledger, ignore the sheet tally entirely if the repositories are
          empty, and ask the holder to walk through one repository. Then it says
          plainly that nothing in the document should change a hiring decision,
          and that the repositories might.
        </p>

        <div className="hl-signoff-actions">
          <Link className="hl-btn" href="/legend/specimen/">
            READ A SPECIMEN FIRST
          </Link>
          <Link className="hl-btn" href="/legend/">
            SHEET 00 — LEGEND
          </Link>
        </div>
      </section>
    </PageShell>
  )
}
