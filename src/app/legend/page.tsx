import type { Metadata } from 'next'
import { RECORD_SCOPE } from '@/lib/record/scope'
import { AFFILIATION, LICENCE_LABEL } from '@/lib/site'
import Link from 'next/link'
import { Lkm01 } from '@/components/mascot/Lkm01'
import { CharKeysToggle } from '@/components/record/ProfilePanels'
import { PageShell } from '@/components/shell/PageShell'
import { SHORTCUTS } from '@/lib/record/keys'

export const metadata: Metadata = {
  title: 'Legend',
  description: 'The keyboard shortcuts, where this browser keeps your progress, and who publishes this site.',
}

/**
 * The legend: the keyboard map, where the progress is kept, and the colophon.
 * Reached from the footer on every route, never opened by itself.
 *
 * ## What was removed, and why (2026-11-05, M40)
 *
 * The line-type key for the curriculum diagram, the specimen record of work,
 * and the list of what the site does not have, which described accounts and
 * organisations. The features they explained were removed on the author's
 * word, so the sections went with them.
 */
export default function LegendPage() {
  return (
    <PageShell sheet="MODULE 00">
      <h1 className="bz-display">Legend</h1>

      <hr className="bz-rule" aria-hidden="true" />

      <section className="bz-panel" aria-labelledby="hl-legend-keys">
        <div className="bz-panel-head">
          <h2 id="hl-legend-keys" className="bz-panel-title">
            Keys
          </h2>
        </div>

        {/* Rendered from `SHORTCUTS`, the same array the key handler dispatches
            on, so the map cannot drift from what the keys do. */}
        <table className="bz-keys">
          <tbody>
            {SHORTCUTS.map((row) => (
              <tr key={row.keys}>
                <td>
                  <kbd>{row.keys}</kbd>
                </td>
                <td>{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4">
          <CharKeysToggle />
        </div>
      </section>

      <section className="bz-panel" aria-labelledby="hl-legend-storage">
        <div className="bz-panel-head">
          <h2 id="hl-legend-storage" className="bz-panel-title">
            Where your progress is
          </h2>
        </div>

        <div className="bz-note">
          <p>{RECORD_SCOPE}</p>
          <p>
            Browser storage can be cleared without warning: by you, by the
            browser, or by a private window. Safari deletes it after seven days
            without a visit.
          </p>
          <p>Export your progress to a file to keep it.</p>
        </div>

        <div className="bz-actions mt-4">
          <Link className="bz-btn" href="/profile/#data">
            EXPORT YOUR PROGRESS
          </Link>
        </div>
      </section>

      <section className="bz-panel" aria-labelledby="hl-legend-mark">
        <div className="bz-panel-head">
          <h2 id="hl-legend-mark" className="bz-panel-title">
            Marked by
          </h2>
          <p className="text-mark m-0 text-on-surface-faint">LKM-01</p>
        </div>

        <div className="flex items-center gap-4">
          <Lkm01 size={96} idPrefix="legend" />
          <p className="m-0 max-w-[var(--layout-measure)] text-meta leading-normal text-on-surface-muted">
            LKM-01 (Lokum) is a 1-unit cube. It has drawn every figure in this
            curriculum.
          </p>
        </div>
      </section>

      {/* Who publishes this, in `AFFILIATION` order; the footer names the same
          three on every page and this is where the relationship is stated. */}
      <section className="bz-panel" aria-labelledby="hl-legend-colophon">
        <div className="bz-panel-head">
          <h2 id="hl-legend-colophon" className="bz-panel-title">
            Colophon
          </h2>
        </div>

        <dl className="m-0 max-w-[var(--layout-measure)]">
          {AFFILIATION.map((affiliate) => (
            <div
              key={affiliate.name}
              className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-b-0"
            >
              <dt className="text-mark flex-none text-on-surface-muted">{affiliate.role}</dt>
              <dd className="m-0 text-meta text-on-surface">
                <a className="bz-link" href={affiliate.url}>
                  {affiliate.name}
                </a>
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 mb-0 max-w-[var(--layout-measure)] text-meta leading-normal text-on-surface-muted">
          The chain reads outward. LokumAI publishes this site and is part of
          Intellica; Intellica is a PIA Group company. The curriculum itself is
          open source under the {LICENCE_LABEL}, and the modules carry no
          endorsement from any of the three.
        </p>
      </section>
    </PageShell>
  )
}
