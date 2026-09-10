import type { Metadata } from 'next'
import Link from 'next/link'
import { DocumentDownload } from '@/components/record/ReportPanel'
import { PageShell } from '@/components/shell/PageShell'
import { SPECIMEN_STAMP, specimenDocument } from '@/lib/content/specimen'
import { REPORT_BUDGET_BYTES } from '@/lib/record/report'

export const metadata: Metadata = {
  title: 'Specimen record',
  description:
    'A record document generated at build time from labelled sample data and '
    + 'stamped as a specimen, so the artefact can be read before anything has '
    + 'been completed.',
}

/**
 * §7.1's grouping rule, locale-free. A byte count that groups its digits
 * differently depending on where it is read is not an instrument, and
 * `toLocaleString` follows the host. Arithmetic, not policy, so a second copy
 * of it cannot drift — the same trade the dashboard's own copy records.
 */
function group(value: number): string {
  return String(Math.trunc(value)).replace(/\B(?=(\d{3})+$)/g, ',')
}

/**
 * §12.13 — the specimen record document.
 *
 * **Built at build time, from sample data, with no reader state anywhere in
 * it.** That is what lets this page be honest: a reader who has signed nothing
 * off can still read the real artefact, and what they are reading is labelled a
 * specimen rather than presented as their own state. §1 is satisfied by the
 * label, not by the sample being plausible — and the label is inside the file as
 * well as on this page, because a saved file outlives the page that offered it.
 *
 * **The document's HTML is never rendered into this page's DOM.** It arrives
 * here as a build-time string and is handed straight to a client leaf that
 * blobs it on a click (§12.12.7: `Blob` + `<a download>` is the save path). No
 * `dangerouslySetInnerHTML`, no `<iframe>`, no `srcdoc`. The page describes the
 * file and offers it; reading it is what opening it from disk is for, and
 * opening it from disk is the exact thing worth demonstrating, since that is
 * where an employer will meet it.
 *
 * Everything printed below is measured off the document that is actually
 * offered — the byte count, the digest, the counts, the filename — so the page
 * cannot describe one file while handing over another.
 */
export default function SpecimenPage() {
  const specimen = specimenDocument()

  return (
    <PageShell sheet="MODULE 00 · SPECIMEN">
      <p className="hl-eyebrow hl-mark">MODULE 00 — LEGEND &amp; SPECIMEN</p>

      <h1 className="bz-display">Specimen record</h1>

      {/* The stamp, before the prose and before the control. It is a mono line
          in a hairline box rather than an alarm: the fact is unmissable without
          spending the caution colour, which §12.15 needs for the one
          destructive action on the site. */}
      <p className="hl-mark m-0 mb-4 inline-block border border-line-strong bg-surface-raised px-3 py-2 text-meta text-on-surface">
        {SPECIMEN_STAMP}
      </p>

      <p className="bz-lead">
        This is a real record document, generated from sample data at build
        time. Every name, date, repository and answer in it is invented for the
        specimen. It holds nothing about you, it reads nothing out of this
        browser, and it changes nothing. Your own record is built on the
        record-of-work module.
      </p>

      <hr className="bz-rule" aria-hidden="true" />

      <section className="hl-panel" aria-labelledby="hl-specimen-facts">
        <div className="hl-panel-head">
          <h2 id="hl-specimen-facts" className="hl-panel-title">
            What is in this specimen
          </h2>
          <p className="hl-mark m-0 text-on-surface-faint">Sample data</p>
        </div>

        <dl className="hl-defs">
          {/* The name is the field the document's header prints first, which is
              where the stamp rides so that it cannot be separated from the file
              (§12.12.2). Printed here as typed, in a `<bdi>` for the same
              reason the document does it: a name must not reorder what is
              around it. */}
          <dt>Account</dt>
          <dd>
            <bdi dir="auto">{specimen.data.identity.name}</bdi>
          </dd>
          <dt>Modules completed</dt>
          <dd>
            {String(specimen.signedOff).padStart(String(specimen.of).length, '0')} /{' '}
            {specimen.of}
          </dd>
          <dt>Repositories</dt>
          <dd>{specimen.repositories}</dd>
          <dt>Sources opened</dt>
          <dd>{specimen.sources}</dd>
          <dt>Generated</dt>
          <dd>{specimen.generatedAt}</dd>
          {/* Not uppercased: a filename printed in a case it is not written
              in is a small lie about the file being handed over. */}
          <dt>Filename</dt>
          <dd className="normal-case">{specimen.filename}</dd>
          <dt>Bytes</dt>
          <dd>
            {group(specimen.bytes)} / {group(REPORT_BUDGET_BYTES)}
          </dd>
        </dl>

        <p className="hl-mark mt-4 mb-1 text-on-surface-muted">Content digest</p>
        {/* `.hl-mark` without its uppercasing: a hex digest a reader compares
            against the one inside the file has to be printed in the case it is
            written in. */}
        <p className="hl-mark m-0 break-all normal-case text-on-surface">{specimen.digest}</p>
        <p className="mt-2 mb-0 max-w-[var(--layout-measure)] text-meta leading-normal text-on-surface-muted">
          SHA-256 over the canonicalised sample record, computed at build time.
          It shows that the file has not changed since it was generated. It shows
          nothing at all about whether the facts inside it are true, which is why
          the document labels it in those words too.
        </p>
      </section>

      <section className="hl-panel" aria-labelledby="hl-specimen-blocks">
        <div className="hl-panel-head">
          <h2 id="hl-specimen-blocks" className="hl-panel-title">
            The five blocks of the file
          </h2>
          <p className="hl-mark m-0 text-on-surface-faint">In this order</p>
        </div>

        {/* §12.12.2 — the order is the argument. A certificate puts its limits
            in a footer in small type; this puts them second, above the ledger
            they qualify, and ends on the audit path rather than on a flourish. */}
        <ol className="m-0 max-w-[var(--layout-measure)] list-none p-0 text-meta leading-normal text-on-surface-muted">
          <li className="mb-2">
            <span className="hl-mark text-on-surface">01 Header</span> — the title, the
            account&rsquo;s name as typed, their mark, the generation timestamp
            and the content digest
          </li>
          <li className="mb-2">
            <span className="hl-mark text-on-surface">02 Status and limits</span> —
            seven statements about what the document is not, above the fold
          </li>
          <li className="mb-2">
            <span className="hl-mark text-on-surface">03 Module ledger</span> — all{' '}
            {specimen.of} modules: number, module, level, state, date completed,
            the revision it was completed against, and the Quick Check state
          </li>
          <li className="mb-2">
            <span className="hl-mark text-on-surface">04 Evidence</span> — one
            entry per repository, with the reader&rsquo;s note, the commit hash
            as supplied, and the module it answers
          </li>
          <li className="mb-2">
            <span className="hl-mark text-on-surface">05 How to check this</span> — five
            instructions addressed to a reviewer, and the line that the
            repositories are the part worth reading
          </li>
        </ol>

        <p className="mt-4 mb-0 max-w-[var(--layout-measure)] text-meta leading-normal text-on-surface-muted">
          It also lists the modules that are not completed, the sources opened
          from each module, the checklist items with the reader&rsquo;s own ticks
          labelled unscored, the criteria a completion asserted against, and a
          legend for the line types. It carries its own record inside it, so the
          file is also a backup that can be imported into another browser.
        </p>
      </section>

      <section className="hl-panel" aria-labelledby="hl-specimen-open">
        <div className="hl-panel-head">
          <h2 id="hl-specimen-open" className="hl-panel-title">
            Open it from disk
          </h2>
          <p className="hl-mark m-0 text-on-surface-faint">One file, no network</p>
        </div>

        <p className="mt-0 mb-4 max-w-[var(--layout-measure)] text-meta leading-normal text-on-surface-muted">
          The document is one HTML file with its stylesheet, its drawings and its
          data inside it. It fetches nothing, stores nothing, and works from a
          local file, an attachment or a memory stick years from now — which is
          the only environment a record of this kind is ever read in. Saving the
          specimen is how you can check that for yourself before you rely on it.
        </p>

        <div className="bz-actions">
          <DocumentDownload
            html={specimen.html}
            filename={specimen.filename}
            label="DOWNLOAD THE SPECIMEN"
          />
          {/* M14 — the builder is the progress page's `report` row now, and
              the fragment opens it on arrival (`FoldFragment`). */}
          <Link className="bz-btn" href="/profile/#report">
            BUILD YOUR OWN RECORD
          </Link>
          <Link className="bz-btn" href="/legend/">
            BACK TO MODULE 00
          </Link>
        </div>
      </section>
    </PageShell>
  )
}
