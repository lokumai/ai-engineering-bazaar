import Link from 'next/link'
import { Lkm01Exploded } from '@/components/mascot/Lkm01Exploded'
import { PageShell } from '@/components/shell/PageShell'
import {
  INDEX_ROUTE,
  INDEX_TITLE,
  NOT_FOUND_SHEET_LABEL,
  NOT_FOUND_TITLE,
} from '@/lib/route-labels'

export const metadata = { title: NOT_FOUND_TITLE }

/** §8.4 fixes the wording of the exploded drawing's caption on this page. */
const CAPTION = 'PAGE NOT FOUND · NO SUCH MODULE IN THIS CURRICULUM'

/**
 * The 404 (spec §8.4, §8.5).
 *
 * It exists as a page of its own because `PageShell` owns `<main>` and the
 * footer (§10.2, §5.2) and Next's built-in not-found page renders neither —
 * without this the exported `404.html` would ship with no main region and no
 * footer at all. It is also the one page that has to be told its own name: the
 * document is served at every address that is not a sheet, so its URL names
 * nothing (see `NOT_FOUND_SEGMENT`).
 *
 * §8.4 gives the cube taken apart exactly two moments and this is one of them
 * (§8.5): an assembly drawing of a sheet that was not found is the one place
 * in the system where the disassembled mark says something true. The caption
 * says the rest. No "oops", no search box that searches nothing (§11.30).
 */
export default function NotFound() {
  return (
    <PageShell sheet={NOT_FOUND_SHEET_LABEL} trailLabel={NOT_FOUND_TITLE}>
      <h1 className="bz-display">{NOT_FOUND_TITLE}</h1>

      <p className="bz-lead">
        This address is not a module in the curriculum. The catalog lists every
        one that is.
      </p>

      <Lkm01Exploded caption={CAPTION} className="mb-10" />

      <hr className="bz-rule" aria-hidden="true" />

      {/* §15.1 — the register moved, and this link did not follow it: labelled
          `Index`, pointed at `/`, one line under a sentence promising the index,
          it opened the home screen. Both halves come from `route-labels` now, so
          the label cannot name one page while the href opens another. */}
      <p className="text-mark">
        <Link className="bz-link" href={INDEX_ROUTE}>
          {INDEX_TITLE}
        </Link>
      </p>
    </PageShell>
  )
}
