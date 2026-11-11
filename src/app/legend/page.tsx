import type { Metadata } from 'next'
import { canonicalOf } from '@/lib/content/seo'
import { RECORD_SCOPE } from '@/lib/record/scope'
import {
  AFFILIATION,
  GITHUB_PAGES_LABEL,
  GITHUB_PAGES_URL,
  GITHUB_PRIVACY_LABEL,
  GITHUB_PRIVACY_URL,
  LICENCE_LABEL,
  LICENCE_URL,
  SITE_OWNER,
} from '@/lib/site'
import Link from 'next/link'
import { Lkm01 } from '@/components/mascot/Lkm01'
import { CharKeysToggle } from '@/components/record/ProfilePanels'
import { PageShell } from '@/components/shell/PageShell'
import { SHORTCUTS } from '@/lib/record/keys'

export const metadata: Metadata = {
  title: 'Legend',
  description:
    'The keyboard shortcuts, where this browser keeps your progress, who publishes this site, and its privacy and legal notes.',
  alternates: canonicalOf('/legend/'),
}

/**
 * The legend: the keyboard map, where the progress is kept, the colophon, and since M94 (D118)
 * the privacy note and the legal notes. Reached from the footer on every route, never opened
 * by itself; the footer's Privacy and Legal links land on the two headings whose ids are
 * `privacy` and `legal`.
 *
 * The notes live here and not on routes of their own: they are short, they describe the same
 * thing as "Where your progress is" and the colophon, and a page nobody opens by itself is the
 * right home for text a reader looks up. D118 records the rejected `/privacy/` route.
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
    <PageShell>
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

      {/* M94, D118 — every claim below was checked against the code and is held by
          `tests/e2e/legal.spec.ts`: no cookie, no form, no request to another origin. The
          fonts and the star count are fetched when the site is built, never by the reader's
          browser. */}
      <section className="bz-panel" aria-labelledby="privacy">
        <div className="bz-panel-head">
          <h2 id="privacy" className="bz-panel-title">
            Privacy
          </h2>
        </div>

        <div className="bz-note space-y-2">
          <p>
            This site collects no personal data. It sets no cookies, and it has no analytics, no account and
            no form.
          </p>
          <p>
            Your progress and your settings, such as the theme, are saved in this browser only. They are never
            sent anywhere. You can export or erase them on the{' '}
            <Link className="bz-link" href="/profile/#data">
              progress page
            </Link>
            .
          </p>
          <p>
            The site is hosted on GitHub Pages. GitHub logs and stores the IP address of every visitor for
            security. This is GitHub's record, not ours: see{' '}
            <a className="bz-link" href={GITHUB_PAGES_URL}>
              {GITHUB_PAGES_LABEL}
            </a>{' '}
            and the{' '}
            <a className="bz-link" href={GITHUB_PRIVACY_URL}>
              {GITHUB_PRIVACY_LABEL}
            </a>
            .
          </p>
          <p>
            For any question about personal data, write to{' '}
            <a className="bz-link" href={`mailto:${SITE_OWNER.email}`}>
              {SITE_OWNER.email}
            </a>
            .
          </p>
        </div>
      </section>

      <section className="bz-panel" aria-labelledby="legal">
        <div className="bz-panel-head">
          <h2 id="legal" className="bz-panel-title">
            Legal
          </h2>
        </div>

        {/* The site owner's identity, as the registry has it, from `SITE_OWNER`: a row is drawn
            only for a fact that was found. */}
        <dl className="m-0 max-w-[var(--layout-measure)]">
          {ownerRows().map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-b-0"
            >
              <dt className="text-mark flex-none text-on-surface-muted">{label}</dt>
              <dd className="m-0 text-right text-meta text-on-surface">{value}</dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-6 mb-2 text-item font-semibold text-on-surface-title">Third-party marks and images</h3>
        <div className="bz-note space-y-2">
          <p>
            Company names and logos shown in the modules belong to their owners. They appear only to say which
            company is meant, and they do not mean that the company endorses this site.
          </p>
          <p>
            Some images come from articles and other public sources, and we are sincerely grateful to their
            authors. They remain the property of their owners, we claim no rights in them, and they are shown
            only to explain the point next to them. If you own an image or a mark shown here, write to{' '}
            <a className="bz-link" href={`mailto:${SITE_OWNER.email}`}>
              {SITE_OWNER.email}
            </a>{' '}
            and we will gladly add your credit, or remove it, whichever you prefer.
          </p>
          <p>
            The{' '}
            <a className="bz-link" href={LICENCE_URL}>
              {LICENCE_LABEL}
            </a>{' '}
            in the repository covers the code and the content of this project. It does not cover third-party
            marks or images.
          </p>
        </div>
      </section>
    </PageShell>
  )
}

/** The labelled rows of the owner's identity. A fact that was not found has no row. */
function ownerRows(): [string, React.ReactNode][] {
  const rows: [string, React.ReactNode][] = [
    ['Site owner', SITE_OWNER.tradeName],
    ['MERSİS no.', SITE_OWNER.mersis],
    ['Address', SITE_OWNER.address],
    [
      'Email',
      <a key="email" className="bz-link" href={`mailto:${SITE_OWNER.email}`}>
        {SITE_OWNER.email}
      </a>,
    ],
    [
      'Phone',
      <a key="phone" className="bz-link" href={`tel:${SITE_OWNER.phone.replaceAll(' ', '')}`}>
        {SITE_OWNER.phone}
      </a>,
    ],
  ]
  if (SITE_OWNER.kep) rows.push(['KEP address', SITE_OWNER.kep])
  if (SITE_OWNER.taxOffice) rows.push(['Tax office', SITE_OWNER.taxOffice])
  if (SITE_OWNER.taxNumber) rows.push(['Tax no.', SITE_OWNER.taxNumber])
  return rows
}
