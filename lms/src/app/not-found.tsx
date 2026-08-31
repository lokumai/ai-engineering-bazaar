import Link from 'next/link'
import { PageShell } from '@/components/shell/PageShell'
import { NOT_FOUND_SHEET_LABEL, NOT_FOUND_TITLE } from '@/lib/route-labels'

export const metadata = { title: NOT_FOUND_TITLE }

/**
 * The 404. It exists because `PageShell` owns `<main>` and the footer (§10.2,
 * §5.2) and Next's built-in not-found page renders neither — without this the
 * exported `404.html` would ship with no main region and no footer at all.
 *
 * It is the one page that has to be told its own name: this document is
 * prerendered once and served at every address that is not a sheet, so its URL
 * names nothing (see `NOT_FOUND_SEGMENT`).
 *
 * It states what happened and points at the manifest. No illustration, no
 * "oops", no search box that searches nothing (§11.30).
 */
export default function NotFound() {
  return (
    <PageShell sheet={NOT_FOUND_SHEET_LABEL}>
      <p className="hl-eyebrow hl-mark">Not in the set</p>

      <h1 className="hl-listing-title">{NOT_FOUND_TITLE}</h1>

      <p className="hl-lead">
        This address is not a sheet in the drawing set. The index lists every
        one that is.
      </p>

      <hr className="hl-rule-struct" aria-hidden="true" />

      <p className="hl-mark">
        <Link className="hl-link" href="/">
          Index
        </Link>
      </p>
    </PageShell>
  )
}
